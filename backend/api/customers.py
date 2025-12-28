"""
API endpoint dla zarządzania klientami
Kompatybilne z React frontend - wyszukiwarka klientów, szczegóły, statystyki
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, success_response, error_response, not_found_response

customers_bp = Blueprint('customers', __name__)

@customers_bp.route('/customers/search', methods=['GET'])
def search_customers():
    """
    Wyszukiwarka klientów - kompatybilna z React frontend
    Parametry: query (string), limit (int, default=10)
    """
    try:
        query = request.args.get('query', '').strip()
        limit = int(request.args.get('limit', 10))
        
        if not query:
            return error_response("Parametr 'query' jest wymagany", 400)
        
        if len(query) < 2:
            return error_response("Zapytanie musi mieć co najmniej 2 znaki", 400)
        
        # Wyszukiwanie w tabelach pos_klienci (rzeczywista tabela)
        sql_query = """
        SELECT 
            id,
            (imie || ' ' || nazwisko) as name,
            telefon as phone,
            email,
            (ulica || ' ' || miasto) as address,
            data_rejestracji as created_at,
            data_ostatniej_edycji as updated_at
        FROM pos_klienci 
        WHERE 
            (imie LIKE ? OR nazwisko LIKE ?) OR 
            telefon LIKE ? OR 
            email LIKE ? OR
            miasto LIKE ?
        ORDER BY nazwisko ASC
        LIMIT ?
        """
        
        search_pattern = f"%{query}%"
        params = [search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, limit]
        
        results = execute_query(sql_query, params)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'customers': results,
            'total': len(results),
            'query': query,
            'limit': limit
        }, f"Znaleziono {len(results)} klientów")
        
    except ValueError:
        return error_response("Parametr 'limit' musi być liczbą", 400)
    except Exception as e:
        print(f"Błąd wyszukiwania klientów: {e}")
        return error_response("Wystąpił błąd podczas wyszukiwania", 500)

@customers_bp.route('/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    """
    Pobierz szczegóły klienta po ID
    """
    try:
        sql_query = """
        SELECT 
            id,
            name,
            phone,
            email,
            address,
            created_at,
            updated_at
        FROM customers 
        WHERE id = ?
        """
        
        results = execute_query(sql_query, [customer_id])
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        if not results:
            return not_found_response(f"Klient o ID {customer_id} nie został znaleziony")
            
        customer = results[0]
        
        # Pobierz statystyki klienta (liczba zamówień, ostatnie zakupy, itp.)
        stats_query = """
        SELECT 
            COUNT(*) as total_orders,
            SUM(total_amount) as total_spent,
            MAX(created_at) as last_order_date
        FROM orders 
        WHERE customer_id = ?
        """
        
        stats = execute_query(stats_query, [customer_id])
        customer['stats'] = stats[0] if stats else {
            'total_orders': 0,
            'total_spent': 0,
            'last_order_date': None
        }
        
        return success_response(customer, "Szczegóły klienta pobrane pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania klienta: {e}")
        return error_response("Wystąpił błąd podczas pobierania danych klienta", 500)

@customers_bp.route('/customers/stats', methods=['GET'])
def get_customers_stats():
    """
    Pobierz ogólne statystyki klientów
    """
    try:
        # Sprawdź różne tabele klientów
        tables_to_check = ['pos_klienci', 'customers']
        stats = None
        
        for table in tables_to_check:
            try:
                if table == 'pos_klienci':
                    stats_query = f"""
                    SELECT 
                        COUNT(*) as total_customers,
                        COUNT(CASE WHEN data_rejestracji > datetime('now', '-30 days') THEN 1 END) as new_customers_30d,
                        COUNT(CASE WHEN telefon IS NOT NULL AND telefon != '' THEN 1 END) as customers_with_phone,
                        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as customers_with_email
                    FROM {table}
                    """
                else:
                    stats_query = f"""
                    SELECT 
                        COUNT(*) as total_customers,
                        COUNT(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 END) as new_customers_30d,
                        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as customers_with_phone,
                        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as customers_with_email
                    FROM {table}
                    """
                
                results = execute_query(stats_query, ())
                if results:
                    stats = results[0]
                    stats['table_used'] = table
                    break
            except:
                # Spróbuj następną tabelę
                continue
        
        if not stats:
            return error_response("Nie można pobrać statystyk klientów", 500)
            
        return success_response(stats, "Statystyki klientów pobrane pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania statystyk: {e}")
        return error_response("Wystąpił błąd podczas pobierania statystyk", 500)

@customers_bp.route('/customers', methods=['GET'])
def get_all_customers():
    """
    Pobierz wszystkich klientów
    GET /api/customers
    """
    try:
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        query = """
        SELECT 
            id,
            (imie || ' ' || nazwisko) as name,
            imie,
            nazwisko,
            telefon as phone,
            email,
            (ulica || ' ' || miasto) as address,
            ulica,
            miasto,
            kod_pocztowy,
            data_rejestracji as created_at,
            data_ostatniej_edycji as updated_at
        FROM pos_klienci 
        ORDER BY nazwisko ASC, imie ASC
        LIMIT ? OFFSET ?
        """
        
        customers = execute_query(query, (limit, offset))
        if customers is None:
            return error_response("Błąd pobierania klientów z bazy danych", 500)
        
        return success_response(customers, f"Pobrano {len(customers)} klientów")
    except Exception as e:
        return error_response(f"Błąd pobierania klientów: {str(e)}", 500)

@customers_bp.route('/customers', methods=['POST'])
def add_customer():
    """
    Dodaj nowego klienta
    POST /api/customers
    """
    from utils.database import execute_insert
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        # Walidacja wymaganych pól
        imie = data.get('imie', '').strip()
        nazwisko = data.get('nazwisko', '').strip()
        telefon = data.get('telefon', '').strip()
        email = data.get('email', '').strip()
        
        if not imie and not nazwisko and not data.get('nazwa_firmy', '').strip():
            return error_response("Wymagane: imię i nazwisko lub nazwa firmy", 400)
        
        # Generuj numer klienta
        import random
        import string
        numer_klienta = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Przygotuj zapytanie INSERT
        insert_query = """
        INSERT INTO pos_klienci (
            numer_klienta, imie, nazwisko, telefon, email,
            ulica, miasto, kod_pocztowy, nip, nazwa_firmy,
            typ_klienta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            numer_klienta,
            imie,
            nazwisko,
            telefon,
            email,
            data.get('adres', '').strip(),
            data.get('miasto', '').strip(),
            data.get('kod_pocztowy', '').strip(),
            data.get('nip', '').strip(),
            data.get('nazwa_firmy', '').strip(),
            'firma' if data.get('nazwa_firmy') else 'osoba_fizyczna'
        )
        
        success = execute_insert(insert_query, params)
        
        if success:
            return success_response({
                'numer_klienta': numer_klienta,
                'imie': imie,
                'nazwisko': nazwisko,
                'email': email,
                'telefon': telefon
            }, "Klient został dodany pomyślnie")
        else:
            return error_response("Błąd dodawania klienta", 500)
        
    except Exception as e:
        return error_response(f"Błąd dodawania klienta: {str(e)}", 500)

@customers_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """
    Usuń klienta
    DELETE /api/customers/<id>
    """
    from utils.database import execute_insert
    try:
        # Sprawdź czy klient istnieje
        check_query = "SELECT id, imie, nazwisko FROM pos_klienci WHERE id = ?"
        customer = execute_query(check_query, (customer_id,))
        
        if not customer:
            return not_found_response("Klient nie został znaleziony")
        
        # Usuń klienta
        delete_query = "DELETE FROM pos_klienci WHERE id = ?"
        success = execute_insert(delete_query, (customer_id,))
        
        if success:
            return success_response({
                'id': customer_id,
                'deleted': True
            }, "Klient został usunięty pomyślnie")
        else:
            return error_response("Błąd usuwania klienta", 500)
        
    except Exception as e:
        return error_response(f"Błąd usuwania klienta: {str(e)}", 500)

@customers_bp.route('/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """
    Aktualizuj klienta
    PUT /api/customers/<id>
    """
    from utils.database import execute_insert
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        # Sprawdź czy klient istnieje
        check_query = "SELECT id FROM pos_klienci WHERE id = ?"
        customer = execute_query(check_query, (customer_id,))
        
        if not customer:
            return not_found_response("Klient nie został znaleziony")
        
        # Przygotuj zapytanie UPDATE
        update_query = """
        UPDATE pos_klienci SET
            imie = ?,
            nazwisko = ?,
            telefon = ?,
            email = ?,
            ulica = ?,
            miasto = ?,
            kod_pocztowy = ?,
            nip = ?,
            nazwa_firmy = ?,
            typ_klienta = ?,
            data_ostatniej_edycji = datetime('now')
        WHERE id = ?
        """
        
        params = (
            data.get('imie', '').strip(),
            data.get('nazwisko', '').strip(),
            data.get('telefon', '').strip(),
            data.get('email', '').strip(),
            data.get('adres', '').strip(),
            data.get('miasto', '').strip(),
            data.get('kod_pocztowy', '').strip(),
            data.get('nip', '').strip(),
            data.get('nazwa_firmy', '').strip(),
            data.get('typ_klienta', 'osoba_fizyczna'),
            customer_id
        )
        
        success = execute_insert(update_query, params)
        
        if success:
            return success_response({
                'id': customer_id,
                'updated': True
            }, "Klient został zaktualizowany pomyślnie")
        else:
            return error_response("Błąd aktualizacji klienta", 500)
        
    except Exception as e:
        return error_response(f"Błąd aktualizacji klienta: {str(e)}", 500)
