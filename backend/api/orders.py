"""
API dla zarządzania zamówieniami od klientów
"""
from flask import Blueprint, request, jsonify, session
import sqlite3
from datetime import datetime
import uuid
from utils.database import execute_query, execute_insert
from utils.response_helpers import success_response, error_response, not_found_response

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/orders', methods=['GET'])
def get_orders():
    """
    Pobierz listę zamówień z filtrowaniem
    GET /api/orders?status=pending&customer_id=123&location_id=1&page=1&limit=20
    """
    try:
        # Parametry filtrowania
        status = request.args.get('status')  # pending, processing, completed, cancelled
        customer_id = request.args.get('customer_id')
        location_id = request.args.get('location_id')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        search = request.args.get('search', '').strip()
        
        # Bazowe zapytanie SQL
        base_sql = """
            SELECT 
                z.id,
                z.numer_zamowienia,
                z.data_zamowienia,
                z.status,
                z.typ_realizacji,
                z.uwagi,
                z.wartosc_brutto,
                z.wartosc_netto,
                z.data_realizacji,
                z.location_id,
                z.utworzony_przez,
                z.data_utworzenia,
                z.data_modyfikacji,
                -- Dane klienta
                k.id as klient_id,
                k.typ_klienta,
                k.imie,
                k.nazwisko,
                k.nazwa_firmy,
                k.email,
                k.telefon,
                -- Liczba pozycji w zamówieniu
                COUNT(zp.id) as liczba_pozycji
            FROM zamowienia_klientow z
            LEFT JOIN pos_klienci k ON z.klient_id = k.id
            LEFT JOIN zamowienia_pozycje zp ON z.id = zp.zamowienie_id
            WHERE 1=1
        """
        
        params = []
        conditions = []
        
        # Filtrowanie
        if status:
            conditions.append("z.status = ?")
            params.append(status)
            
        if customer_id:
            conditions.append("z.klient_id = ?")
            params.append(customer_id)
            
        if location_id:
            conditions.append("z.location_id = ?")
            params.append(location_id)
            
        if search:
            conditions.append("""
                (z.numer_zamowienia LIKE ? OR 
                 k.imie LIKE ? OR 
                 k.nazwisko LIKE ? OR 
                 k.nazwa_firmy LIKE ? OR
                 k.email LIKE ?)
            """)
            search_param = f"%{search}%"
            params.extend([search_param] * 5)
        
        # Składanie zapytania
        if conditions:
            base_sql += " AND " + " AND ".join(conditions)
            
        base_sql += """
            GROUP BY z.id, k.id
            ORDER BY z.data_zamowienia DESC, z.id DESC
        """
        
        # Paginacja
        offset = (page - 1) * limit
        sql_query = base_sql + f" LIMIT {limit} OFFSET {offset}"
        
        results = execute_query(sql_query, params)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
        
        # Zapytanie o łączną liczbę rekordów
        count_sql = f"""
            SELECT COUNT(DISTINCT z.id) as total
            FROM zamowienia_klientow z
            LEFT JOIN pos_klienci k ON z.klient_id = k.id
            WHERE 1=1
        """
        
        if conditions:
            count_sql += " AND " + " AND ".join(conditions)
            
        count_result = execute_query(count_sql, params)
        total = count_result[0]['total'] if count_result else 0
        
        return success_response({
            'orders': results,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        }, f"Znaleziono {len(results)} zamówień")
        
    except ValueError:
        return error_response("Nieprawidłowe parametry page lub limit", 400)
    except Exception as e:
        print(f"Błąd pobierania zamówień: {e}")
        return error_response("Wystąpił błąd podczas pobierania zamówień", 500)

@orders_bp.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """
    Pobierz szczegóły konkretnego zamówienia z pozycjami
    GET /api/orders/123
    """
    try:
        # Dane podstawowe zamówienia
        order_sql = """
            SELECT 
                z.*,
                k.typ_klienta,
                k.imie,
                k.nazwisko,
                k.nazwa_firmy,
                k.email,
                k.telefon,
                k.ulica,
                k.numer_domu,
                k.miasto,
                k.kod_pocztowy,
                k.nip
            FROM zamowienia_klientow z
            LEFT JOIN pos_klienci k ON z.klient_id = k.id
            WHERE z.id = ?
        """
        
        order_result = execute_query(order_sql, (order_id,))
        
        if not order_result:
            return not_found_response(f"Zamówienie o ID {order_id} nie zostało znalezione")
        
        order = order_result[0]
        
        # Pozycje zamówienia
        items_sql = """
            SELECT 
                zp.*,
                p.nazwa as produkt_nazwa,
                p.ean,
                p.kod_produktu,
                p.opis,
                p.jednostka,
                p.cena_sprzedazy_brutto as cena_katalogowa,
                p.cena_sprzedazy_netto as cena_katalogowa_netto,
                p.stawka_vat
            FROM zamowienia_pozycje zp
            LEFT JOIN produkty p ON zp.produkt_id = p.id
            WHERE zp.zamowienie_id = ?
            ORDER BY zp.pozycja
        """
        
        items_result = execute_query(items_sql, (order_id,))
        order['pozycje'] = items_result or []
        
        return success_response(order, "Szczegóły zamówienia")
        
    except Exception as e:
        print(f"Błąd pobierania zamówienia {order_id}: {e}")
        return error_response("Wystąpił błąd podczas pobierania zamówienia", 500)

@orders_bp.route('/orders', methods=['POST'])
def create_order():
    """
    Utwórz nowe zamówienie
    POST /api/orders
    Body: {
        "klient_id": 123,
        "location_id": 1,
        "typ_realizacji": "do_odbioru",
        "uwagi": "Proszę o szybką realizację",
        "pozycje": [
            {
                "produkt_id": 456,
                "ilosc": 2,
                "cena_jednostkowa": 29.99,
                "uwagi_pozycja": "Opcjonalne uwagi"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)

        # Walidacja wymaganych pól
        klient_id = data.get('klient_id')
        if not klient_id:
            return error_response("Pole 'klient_id' jest wymagane", 400)

        location_id = data.get('location_id')
        
        # Jeśli nie podano location_id, spróbuj pobrać z magazynu w sesji
        if not location_id:
            current_warehouse_id = session.get('current_warehouse_id')
            if current_warehouse_id:
                # Pobierz location_id z aktualnego magazynu
                warehouse_location = execute_query(
                    "SELECT location_id FROM warehouses WHERE id = ?", 
                    (current_warehouse_id,)
                )
                if warehouse_location:
                    location_id = warehouse_location[0]['location_id']
                else:
                    location_id = 1  # Fallback do Nysy
            else:
                location_id = 1  # Fallback do Nysy
        typ_realizacji = data.get('typ_realizacji', 'do_odbioru')  # do_odbioru, dostawa, na_miejscu
        uwagi = data.get('uwagi', '')
        pozycje = data.get('pozycje', [])

        if not pozycje:
            return error_response("Zamówienie musi zawierać co najmniej jedną pozycję", 400)

        # Sprawdź czy klient istnieje
        customer_check = execute_query("SELECT id FROM pos_klienci WHERE id = ?", (klient_id,))
        if not customer_check:
            return error_response(f"Klient o ID {klient_id} nie istnieje", 400)

        # Generuj numer zamówienia i timestampy
        now = datetime.now()
        current_ts = now.strftime("%Y-%m-%d %H:%M:%S")
        date_prefix = now.strftime("%Y%m%d")

        # Znajdź kolejny numer dla dzisiejszego dnia
        count_sql = (
            "SELECT COUNT(*) as count FROM zamowienia_klientow WHERE numer_zamowienia LIKE ?"
        )
        count_result = execute_query(count_sql, (f"ZAM-{date_prefix}-%",))
        next_number = (count_result[0]['count'] if count_result else 0) + 1
        numer_zamowienia = f"ZAM-{date_prefix}-{next_number:04d}"

        # Oblicz wartość zamówienia
        wartosc_netto = 0.0
        wartosc_brutto = 0.0
        for pozycja in pozycje:
            ilosc = float(pozycja.get('ilosc', 0))
            cena = float(pozycja.get('cena_jednostkowa', 0))
            if ilosc <= 0 or cena < 0:
                return error_response("Ilość musi być większa od 0, cena nie może być ujemna", 400)
            # Pobierz stawkę VAT produktu
            product_result = execute_query("SELECT stawka_vat FROM produkty WHERE id = ?", (pozycja.get('produkt_id'),))
            vat_rate = product_result[0]['stawka_vat'] if product_result else 23
            cena_brutto = ilosc * cena
            cena_netto = cena_brutto / (1 + (vat_rate / 100))
            wartosc_brutto += cena_brutto
            wartosc_netto += cena_netto

        # Wstaw zamówienie
        order_sql = (
            """
            INSERT INTO zamowienia_klientow (
                numer_zamowienia, klient_id, location_id, data_zamowienia,
                status, typ_realizacji, uwagi, wartosc_netto, wartosc_brutto,
                utworzony_przez, data_utworzenia, data_modyfikacji
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
        )
        order_params = (
            numer_zamowienia, klient_id, location_id, current_ts,
            'pending', typ_realizacji, uwagi, round(wartosc_netto, 2), round(wartosc_brutto, 2),
            'system', current_ts, current_ts
        )
        order_id = execute_insert(order_sql, order_params)
        if not order_id:
            return error_response("Nie udało się utworzyć zamówienia", 500)

        # Wstaw pozycje zamówienia
        for i, pozycja in enumerate(pozycje, 1):
            produkt_id = pozycja.get('produkt_id')
            ilosc = float(pozycja.get('ilosc'))
            cena_jednostkowa = float(pozycja.get('cena_jednostkowa'))
            uwagi_pozycja = pozycja.get('uwagi_pozycja', '')

            product_result = execute_query("SELECT stawka_vat FROM produkty WHERE id = ?", (produkt_id,))
            if not product_result:
                return error_response(f"Produkt o ID {produkt_id} nie istnieje", 400)
            vat_rate = product_result[0]['stawka_vat']

            wartosc_brutto_poz = ilosc * cena_jednostkowa
            wartosc_netto_poz = wartosc_brutto_poz / (1 + (vat_rate / 100))

            item_sql = (
                """
                INSERT INTO zamowienia_pozycje (
                    zamowienie_id, pozycja, produkt_id, ilosc,
                    cena_jednostkowa, wartosc_netto, wartosc_brutto,
                    stawka_vat, uwagi, data_utworzenia
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
            )
            item_params = (
                order_id, i, produkt_id, ilosc,
                cena_jednostkowa, round(wartosc_netto_poz, 2), round(wartosc_brutto_poz, 2),
                vat_rate, uwagi_pozycja, current_ts
            )
            success = execute_insert(item_sql, item_params)
            if not success:
                return error_response(f"Nie udało się dodać pozycji {i}", 500)

        return success_response({
            'id': order_id,
            'numer_zamowienia': numer_zamowienia,
            'wartosc_brutto': round(wartosc_brutto, 2),
            'wartosc_netto': round(wartosc_netto, 2)
        }, "Zamówienie zostało utworzone pomyślnie")
    except Exception as e:
        print(f"Błąd tworzenia zamówienia: {e}")
        return error_response("Wystąpił błąd podczas tworzenia zamówienia", 500)

@orders_bp.route('/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    """
    Aktualizuj zamówienie
    PUT /api/orders/123
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)

        # Sprawdź czy zamówienie istnieje
        order_check = execute_query("SELECT id, status FROM zamowienia_klientow WHERE id = ?", (order_id,))
        if not order_check:
            return not_found_response(f"Zamówienie o ID {order_id} nie zostało znalezione")

        current_status = order_check[0]['status']

        # Nie pozwól na edycję zrealizowanych zamówień
        if current_status in ['completed', 'cancelled']:
            return error_response(f"Nie można edytować zamówienia o statusie '{current_status}'", 400)

        # Pola do aktualizacji
        update_fields = []
        update_params = []

        if 'status' in data:
            update_fields.append("status = ?")
            update_params.append(data['status'])

        if 'typ_realizacji' in data:
            update_fields.append("typ_realizacji = ?")
            update_params.append(data['typ_realizacji'])

        if 'uwagi' in data:
            update_fields.append("uwagi = ?")
            update_params.append(data['uwagi'])

        if 'data_realizacji' in data:
            update_fields.append("data_realizacji = ?")
            update_params.append(data['data_realizacji'])

        # Zawsze aktualizuj datę modyfikacji (jako tekst)
        update_fields.append("data_modyfikacji = ?")
        now_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        update_params.append(now_ts)

        if not update_fields:
            return error_response("Brak danych do aktualizacji", 400)

        # Aktualizuj zamówienie
        update_sql = f"UPDATE zamowienia_klientow SET {', '.join(update_fields)} WHERE id = ?"
        update_params.append(order_id)

        success = execute_insert(update_sql, update_params)
        if success:
            return success_response({'id': order_id}, "Zamówienie zostało zaktualizowane")
        else:
            return error_response("Nie udało się zaktualizować zamówienia", 500)
    except Exception as e:
        print(f"Błąd aktualizacji zamówienia {order_id}: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji zamówienia", 500)

@orders_bp.route('/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    """
    Usuń zamówienie
    DELETE /api/orders/123
    """
    try:
        # Sprawdź czy zamówienie istnieje
        order_check = execute_query("SELECT id, status FROM zamowienia_klientow WHERE id = ?", (order_id,))
        if not order_check:
            return not_found_response(f"Zamówienie o ID {order_id} nie zostało znalezione")
        
        status = order_check[0]['status']
        
        # Nie pozwól na usunięcie zrealizowanych zamówień
        if status == 'completed':
            return error_response("Nie można usunąć zrealizowanego zamówienia", 400)
        
        # Usuń pozycje zamówienia
        delete_items_sql = "DELETE FROM zamowienia_pozycje WHERE zamowienie_id = ?"
        execute_insert(delete_items_sql, (order_id,))
        
        # Usuń zamówienie
        delete_order_sql = "DELETE FROM zamowienia_klientow WHERE id = ?"
        success = execute_insert(delete_order_sql, (order_id,))
        
        if success:
            return success_response({'id': order_id}, "Zamówienie zostało usunięte")
        else:
            return error_response("Nie udało się usunąć zamówienia", 500)
        
    except Exception as e:
        print(f"Błąd usuwania zamówienia {order_id}: {e}")
        return error_response("Wystąpił błąd podczas usuwania zamówienia", 500)

@orders_bp.route('/orders/<int:order_id>/receipt', methods=['GET'])
def generate_order_receipt(order_id):
    """
    Generuj paragon dla zamówienia
    GET /api/orders/123/receipt
    """
    try:
        # Pobierz dane zamówienia
        order_result = execute_query("""
            SELECT z.*, k.imie, k.nazwisko, k.nazwa_firmy, k.email
            FROM zamowienia_klientow z
            LEFT JOIN pos_klienci k ON z.klient_id = k.id
            WHERE z.id = ?
        """, (order_id,))
        
        if not order_result:
            return not_found_response(f"Zamówienie o ID {order_id} nie zostało znalezione")
        
        order = order_result[0]
        
        # Pobierz pozycje
        items_result = execute_query("""
            SELECT zp.*, p.nazwa as produkt_nazwa, p.jednostka
            FROM zamowienia_pozycje zp
            LEFT JOIN produkty p ON zp.produkt_id = p.id
            WHERE zp.zamowienie_id = ?
            ORDER BY zp.pozycja
        """, (order_id,))
        
        # Sprawdź dostępność produktów na magazynie
        stock_warnings = []
        items_with_stock = []
        
        for item in items_result or []:
            # Sprawdź stan magazynowy
            stock_check = execute_query("""
                SELECT pm.stan_aktualny, pm.stan_minimalny
                FROM pos_magazyn pm
                WHERE pm.produkt_id = ?
            """, (item['produkt_id'],))
            
            if stock_check:
                stock = stock_check[0]
                item['stan_aktualny'] = stock['stan_aktualny']
                item['stan_minimalny'] = stock['stan_minimalny']
                
                # Sprawdź czy wystarczy na magazynie
                if stock['stan_aktualny'] < item['ilosc']:
                    stock_warnings.append({
                        'produkt': item['produkt_nazwa'],
                        'wymagane': item['ilosc'],
                        'dostepne': stock['stan_aktualny']
                    })
            else:
                # Brak danych o stanie - dodaj domyślny wpis
                execute_query("""
                    INSERT OR IGNORE INTO pos_magazyn (produkt_id, stan_aktualny, stan_minimalny)
                    VALUES (?, 0, 1)
                """, (item['produkt_id'],))
                
                item['stan_aktualny'] = 0
                item['stan_minimalny'] = 1
                
                stock_warnings.append({
                    'produkt': item['produkt_nazwa'],
                    'wymagane': item['ilosc'],
                    'dostepne': 0
                })
            
            items_with_stock.append(item)
        
        receipt_data = {
            'order': order,
            'items': items_with_stock,
            'stock_warnings': stock_warnings,
            'generated_at': datetime.now().isoformat(),
            'receipt_number': f"PAR-{order['numer_zamowienia']}"
        }
        
        # Jeśli są ostrzeżenia o stanie, zwróć je w odpowiedzi
        if stock_warnings:
            return success_response(receipt_data, f"Paragon wygenerowany z ostrzeżeniami o stanie magazynowym ({len(stock_warnings)} produktów)")
        
        return success_response(receipt_data, "Paragon wygenerowany")
        
    except Exception as e:
        print(f"Błąd generowania paragonu dla zamówienia {order_id}: {e}")
        return error_response("Wystąpił błąd podczas generowania paragonu", 500)

@orders_bp.route('/orders/stats', methods=['GET'])
def get_orders_stats():
    """
    Pobierz statystyki zamówień
    GET /api/orders/stats?location_id=1
    """
    try:
        location_id = request.args.get('location_id')
        
        base_condition = ""
        params = []
        
        if location_id:
            base_condition = "WHERE location_id = ?"
            params.append(location_id)
        
        stats_sql = f"""
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
                COALESCE(SUM(wartosc_brutto), 0) as total_value,
                COALESCE(AVG(wartosc_brutto), 0) as avg_order_value
            FROM zamowienia_klientow
            {base_condition}
        """
        
        stats_result = execute_query(stats_sql, params)
        stats = stats_result[0] if stats_result else {}
        
        return success_response(stats, "Statystyki zamówień")
        
    except Exception as e:
        print(f"Błąd pobierania statystyk zamówień: {e}")
        return error_response("Wystąpił błąd podczas pobierania statystyk", 500)


@orders_bp.route('/orders/<int:order_id>/convert-to-pos', methods=['POST'])
def convert_order_to_pos(order_id):
    """
    Konwertuj zamówienie klienta na transakcję POS - POPRAWIONA WERSJA
    POST /api/orders/123/convert-to-pos
    Body: { "warehouse_id": 5, "kasjer_login": "kasjer1" }
    """
    print(f"🔄 DEBUG: Wywołano convert_order_to_pos dla order_id={order_id}")
    
    try:
        # Parsuj JSON request
        try:
            data = request.get_json() or {}
            print(f"🔄 DEBUG: Request Content-Type: {request.content_type}")
            print(f"🔄 DEBUG: Request data: {request.data}")
            print(f"🔄 DEBUG: Request method: {request.method}")
            print(f"🔄 DEBUG: Otrzymane dane JSON: {data}")
        except Exception as e:
            print(f"🔄 DEBUG: Błąd parsowania JSON: {e}")
            data = {}
        
        # 1. Pobierz zamówienie z danymi klienta
        print(f"🔄 DEBUG: Pobieranie zamówienia {order_id}")
        
        order_query = """
            SELECT 
                z.*,
                k.imie, k.nazwisko, k.nazwa_firmy, k.email, k.telefon
            FROM zamowienia_klientow z
            LEFT JOIN pos_klienci k ON z.klient_id = k.id
            WHERE z.id = ?
        """
        print(f"🔄 DEBUG: Wykonuję zapytanie order_query")
        order_result = execute_query(order_query, (order_id,))
        print(f"🔄 DEBUG: Wynik order_result: {order_result}")
        
        if not order_result:
            return not_found_response("Zamówienie nie zostało znalezione")
        
        order = order_result[0]
        
        # SPRAWDŹ CZY ZAMÓWIENIE JUŻ ZOSTAŁO SKONWERTOWANE
        if order['status'] == 'processing' and 'transakcję POS' in str(order.get('uwagi', '')):
            return error_response("Zamówienie zostało już skonwertowane na transakcję POS", 400)
        
        # Sprawdź czy zamówienie ma odpowiedni status
        if order['status'] not in ['pending', 'confirmed']:
            return error_response(f"Zamówienie ma status '{order['status']}' i nie może być konwertowane", 400)
        
        # 2. Znajdź odpowiedni magazyn dla lokalizacji
        warehouse_id = data.get('warehouse_id')
        if not warehouse_id:
            # Automatycznie wybierz pierwszy aktywny magazyn dla lokalizacji
            warehouse_query = """
                SELECT id, nazwa, kod_magazynu 
                FROM warehouses 
                WHERE location_id = ? AND aktywny = 1 
                ORDER BY id LIMIT 1
            """
            warehouse_result = execute_query(warehouse_query, (order['location_id'],))
            if not warehouse_result:
                return error_response(f"Brak aktywnego magazynu dla lokalizacji {order['location_id']}", 400)
            warehouse_id = warehouse_result[0]['id']
            print(f"🔄 DEBUG: Auto-wybrano magazyn {warehouse_id} dla lokalizacji {order['location_id']}")
        
        # 3. Pobierz pozycje zamówienia z danymi produktów
        items_query = """
            SELECT 
                zp.*,
                p.nazwa, p.cena_sprzedazy_brutto, p.stawka_vat
            FROM zamowienia_pozycje zp
            LEFT JOIN produkty p ON zp.produkt_id = p.id
            WHERE zp.zamowienie_id = ?
            ORDER BY zp.id
        """
        items_result = execute_query(items_query, (order_id,))
        
        if not items_result:
            return error_response("Zamówienie nie zawiera pozycji do konwersji", 400)
        
        # 4. Utwórz unikalny numer transakcji POS (NIE BAZUJ NA ORDER_ID!)
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d")
        counter = execute_query("SELECT COUNT(*) as count FROM pos_transakcje WHERE numer_transakcji LIKE ?", (f"POS-{timestamp}-%",))
        next_counter = (counter[0]['count'] if counter else 0) + 1
        numer_transakcji = f"POS-{timestamp}-{next_counter:04d}"
        
        # 5. Oblicz sumy
        suma_brutto = 0
        suma_netto = 0
        
        for item in items_result:
            cena = item['cena_jednostkowa'] or item['cena_sprzedazy_brutto'] or 0
            ilosc = item['ilosc'] or 1
            stawka_vat = item['stawka_vat'] or 23
            
            brutto = cena * ilosc
            netto = brutto / (1 + stawka_vat / 100)
            
            suma_brutto += brutto
            suma_netto += netto
        
        suma_vat = suma_brutto - suma_netto
        
        kasjer_login = data.get('kasjer_login') or session.get('current_user', 'system')
        uwagi = f"Konwersja z zamówienia #{order['numer_zamowienia']} (Magazyn: {warehouse_id})"
        
        # 6. UTWÓRZ TRANSAKCJĘ POS JAKO ZAKOŃCZONĄ
        pos_transaction_sql = """
            INSERT INTO pos_transakcje 
            (numer_transakcji, data_transakcji, czas_transakcji, kasjer_login, 
             klient_id, suma_netto, suma_brutto, suma_vat, location_id, uwagi,
             status, forma_platnosci, kwota_otrzymana, kwota_reszty)
            VALUES (?, date('now'), time('now'), ?, ?, ?, ?, ?, ?, ?, 'zakonczony', 'gotowka', ?, 0)
        """
        
        transaction_id = execute_insert(pos_transaction_sql, (
            numer_transakcji,
            kasjer_login,
            order['klient_id'],
            suma_netto,
            suma_brutto,
            suma_vat,
            order['location_id'],
            uwagi,
            suma_brutto  # kwota_otrzymana = suma_brutto (brak reszty)
        ))
        
        if not transaction_id:
            return error_response("Błąd tworzenia transakcji POS", 500)
        
        # 7. Dodaj pozycje do transakcji POS
        pos_items_inserted = 0
        for i, item in enumerate(items_result, 1):
            # Sprawdź cenę - użyj z pozycji zamówienia lub z produktu
            cena_jednostkowa = item['cena_jednostkowa'] or item['cena_sprzedazy_brutto'] or 0
            ilosc = item['ilosc'] or 1
            stawka_vat = item['stawka_vat'] or 23
            
            # Oblicz wartości
            wartosc_brutto = cena_jednostkowa * ilosc
            wartosc_netto = wartosc_brutto / (1 + stawka_vat / 100)
            kwota_vat = wartosc_brutto - wartosc_netto
            
            pos_item_sql = """
                INSERT INTO pos_pozycje
                (transakcja_id, produkt_id, nazwa_produktu, cena_jednostkowa, 
                 ilosc, cena_po_rabacie, wartosc_netto, stawka_vat, kwota_vat, 
                 wartosc_brutto, lp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            item_result = execute_insert(pos_item_sql, (
                transaction_id,
                item['produkt_id'],
                item['nazwa'] or f"Produkt {item['produkt_id']}",
                cena_jednostkowa,
                ilosc,
                cena_jednostkowa,  # cena_po_rabacie = cena_jednostkowa jeśli brak rabatu
                wartosc_netto,
                stawka_vat,
                kwota_vat,
                wartosc_brutto,
                i  # lp (linia pozycji)
            ))
            
            if item_result:
                pos_items_inserted += 1
        
        if pos_items_inserted == 0:
            return error_response("Błąd dodawania pozycji do transakcji POS", 500)
        
        # 8. Zaktualizuj status zamówienia na COMPLETED
        update_order_sql = """
            UPDATE zamowienia_klientow 
            SET status = 'completed', 
                uwagi = COALESCE(uwagi, '') || '\nKonwertowane na transakcję POS #' || ? || ' (ID: ' || ? || ')',
                data_modyfikacji = datetime('now'),
                data_realizacji = datetime('now')
            WHERE id = ?
        """
        execute_insert(update_order_sql, (numer_transakcji, transaction_id, order_id))
        
        return success_response({
            "transaction_id": transaction_id,
            "numer_transakcji": numer_transakcji,
            "order_id": order_id,
            "warehouse_id": warehouse_id,
            "location_id": order['location_id'],
            "items_converted": pos_items_inserted,
            "suma_brutto": suma_brutto,
            "suma_netto": suma_netto,
            "status": "zakonczony",
            "message": f"Zamówienie #{order['numer_zamowienia']} zostało konwertowane na transakcję POS #{numer_transakcji}"
        }, "Zamówienie zostało przekształcone w transakcję POS")
        
    except Exception as e:
        print(f"Błąd konwersji zamówienia na POS: {e}")
        return error_response("Wystąpił błąd podczas konwersji zamówienia", 500)

