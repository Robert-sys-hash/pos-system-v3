"""
API endpoint dla zarządzania magazynami
Obsługa wielomagazynowej struktury sklepów
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response

# Import centralnego systemu marż
try:
    from api.margin_service import MarginService
    margin_service = MarginService()
    print("✅ WAREHOUSES: Zaimportowano margin_service")
except ImportError as e:
    print(f"⚠️ WAREHOUSES: Nie można zaimportować margin_service: {e}")
    margin_service = None

warehouses_bp = Blueprint('warehouses', __name__)

def init_warehouse_tables():
    """
    Inicjalizuje tabele dla systemu wielomagazynowego - TYMCZASOWO WYŁĄCZONE
    """
    print("✅ Inicjalizacja tabel magazynowych pominięta - używamy istniejącej tabeli warehouses")
    return
    tables = [
        # Tabela magazynów/sklepów - używamy tabeli warehouses
        """
        -- Tabela warehouses już istnieje, sprawdzamy tylko czy ma wszystkie kolumny
        """,
        
        # Tabela przypisań pracowników do magazynów
        """
        CREATE TABLE IF NOT EXISTS pos_pracownicy_magazyny (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            magazyn_id INTEGER NOT NULL,
            rola VARCHAR(50) DEFAULT 'pracownik',
            aktywny BOOLEAN DEFAULT 1,
            data_przypisania DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_odpisania DATETIME NULL,
            uprawnienia TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (magazyn_id) REFERENCES warehouses(id),
            UNIQUE(user_id, magazyn_id)
        )
        """,
        
        # Tabela stanów magazynowych w systemie warehouse - stan będzie trzymany w products lub warehouse_stock
        """
        CREATE TABLE IF NOT EXISTS warehouse_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            current_stock DECIMAL(10,3) DEFAULT 0,
            min_stock DECIMAL(10,3) DEFAULT 0,
            max_stock DECIMAL(10,3) DEFAULT 0,
            reserved_stock DECIMAL(10,3) DEFAULT 0,
            location VARCHAR(100),
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES produkty(id),
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
            UNIQUE(product_id, warehouse_id)
        )
        """,
        
        # Indeksy dla wydajności
        "CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id)",
        "CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON warehouse_stock(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_pracownicy_user ON pos_pracownicy_magazyny(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_pracownicy_magazyn ON pos_pracownicy_magazyny(magazyn_id)"
    ]
    
    for table_sql in tables:
        try:
            execute_insert(table_sql, ())
            print(f"✅ Utworzono/zaktualizowano tabelę wielomagazynową")
        except Exception as e:
            print(f"❌ Błąd tworzenia tabeli: {e}")

@warehouses_bp.route('/warehouses', methods=['GET'])
def get_warehouses():
    """
    Pobierz listę wszystkich magazynów z przypisanymi pracownikami
    GET /api/warehouses
    """
    try:
        print("🔍 Pobieranie listy magazynów...")
        
        # Pobierz magazyny
        sql_warehouses = """
        SELECT 
            id,
            nazwa,
            kod_magazynu,
            location_id,
            aktywny,
            miasto,
            wojewodztwo
        FROM warehouses
        WHERE aktywny = 1
        ORDER BY nazwa
        """
        
        print(f"🔍 Executing SQL: {sql_warehouses}")
        warehouses = execute_query(sql_warehouses, ())
        print(f"🔍 Query result: {warehouses}")
        
        if warehouses is None:
            print("❌ Warehouses query returned None")
            return jsonify({'error': 'Błąd pobierania magazynów'}), 500
        
        # Pobierz przypisania pracowników do magazynów
        sql_assignments = """
        SELECT 
            uw.warehouse_id,
            uw.user_login,
            uw.rola,
            uw.data_od,
            uw.data_do,
            uw.aktywny
        FROM user_warehouses uw
        WHERE uw.aktywny = 1
        ORDER BY uw.warehouse_id, uw.user_login
        """
        
        assignments = execute_query(sql_assignments, ())
        print(f"🔍 Found {len(assignments) if assignments else 0} user assignments")
        
        # Grupuj przypisania według warehouse_id
        warehouse_users = {}
        if assignments:
            for assignment in assignments:
                warehouse_id = assignment['warehouse_id']
                if warehouse_id not in warehouse_users:
                    warehouse_users[warehouse_id] = []
                
                warehouse_users[warehouse_id].append({
                    'user_login': assignment['user_login'],
                    'rola': assignment['rola'],
                    'data_od': assignment['data_od'],
                    'data_do': assignment['data_do'],
                    'aktywny': assignment['aktywny']
                })
        
        # Dodaj przypisanych użytkowników do każdego magazynu
        for warehouse in warehouses:
            warehouse_id = warehouse['id']
            warehouse['assigned_users'] = warehouse_users.get(warehouse_id, [])
            print(f"📦 Magazyn {warehouse['nazwa']}: {len(warehouse['assigned_users'])} przypisanych użytkowników")
        
        print(f"✅ Found {len(warehouses)} warehouses")
        return success_response(warehouses, f"Znaleziono {len(warehouses)} magazynów")
        
    except Exception as e:
        print(f"❌ Błąd pobierania magazynów: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Wystąpił błąd podczas pobierania magazynów'}), 500

@warehouses_bp.route('/warehouses', methods=['POST'])
def create_warehouse():
    """
    Utwórz nowy magazyn
    POST /api/warehouses
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        # Walidacja wymaganych pól
        required_fields = ['nazwa', 'kod', 'location_id']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return error_response(f"Pole '{field}' jest wymagane", 400)
        
        # Sprawdź unikalność kodu
        check_sql = "SELECT id FROM warehouses WHERE kod_magazynu = ?"
        existing = execute_query(check_sql, (data['kod'],))
        if existing:
            return error_response("Magazyn o podanym kodzie już istnieje", 400)
        
        # Wstaw nowy magazyn
        insert_sql = """
        INSERT INTO warehouses (
            nazwa, kod_magazynu, location_id, adres, telefon, email, nip, miasto, 
            kod_pocztowy, wojewodztwo, typ_magazynu, opis, kierownik_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            data['nazwa'],
            data['kod'],
            data['location_id'],
            data.get('adres', ''),
            data.get('telefon', ''),
            data.get('email', ''),
            data.get('nip', ''),
            data.get('miasto', ''),
            data.get('kod_pocztowy', ''),
            data.get('wojewodztwo', ''),
            data.get('typ_magazynu', 'sklep'),
            data.get('opis', ''),
            data.get('kierownik_id')
        )
        
        warehouse_id = execute_insert(insert_sql, params)
        
        if warehouse_id:
            # Pobierz utworzony magazyn
            created_warehouse = execute_query(
                "SELECT * FROM warehouses WHERE id = ?", 
                (warehouse_id,)
            )
            
            return success_response({
                'warehouse': created_warehouse[0] if created_warehouse else None,
                'id': warehouse_id
            }, "Magazyn utworzony pomyślnie")
        else:
            return error_response("Błąd tworzenia magazynu", 500)
        
    except Exception as e:
        print(f"Błąd tworzenia magazynu: {e}")
        return error_response("Wystąpił błąd podczas tworzenia magazynu", 500)

@warehouses_bp.route('/warehouses/<int:warehouse_id>', methods=['PUT'])
def update_warehouse(warehouse_id):
    """
    Aktualizuj magazyn
    PUT /api/warehouses/123
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        # Sprawdź czy magazyn istnieje
        existing = execute_query("SELECT id FROM warehouses WHERE id = ?", (warehouse_id,))
        if not existing:
            return not_found_response(f"Magazyn o ID {warehouse_id} nie został znaleziony")
        
        # Przygotuj pola do aktualizacji
        update_fields = []
        params = []
        
        allowed_fields = [
            'nazwa', 'kod_magazynu', 'adres', 'telefon', 'email', 'nip', 
            'miasto', 'kod_pocztowy', 'wojewodztwo', 'typ_magazynu', 
            'opis', 'kierownik_id', 'aktywny', 'location_id'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                params.append(data[field])
        
        if not update_fields:
            return error_response("Brak danych do aktualizacji", 400)
        
        # Sprawdź unikalność kodu (jeśli aktualizowany)
        if 'kod_magazynu' in data:
            check_sql = "SELECT id FROM warehouses WHERE kod_magazynu = ? AND id != ?"
            existing_code = execute_query(check_sql, (data['kod_magazynu'], warehouse_id))
            if existing_code:
                return error_response("Magazyn o podanym kodzie już istnieje", 400)
        
        # Aktualizuj magazyn
        update_fields.append("data_modyfikacji = CURRENT_TIMESTAMP")
        params.append(warehouse_id)
        
        update_sql = f"UPDATE warehouses SET {', '.join(update_fields)} WHERE id = ?"
        success = execute_insert(update_sql, params)
        
        if success:
            # Pobierz zaktualizowany magazyn
            updated_warehouse = execute_query(
                "SELECT * FROM warehouses WHERE id = ?", 
                (warehouse_id,)
            )
            
            return success_response({
                'warehouse': updated_warehouse[0] if updated_warehouse else None
            }, "Magazyn zaktualizowany pomyślnie")
        else:
            return error_response("Błąd aktualizacji magazynu", 500)
        
    except Exception as e:
        print(f"Błąd aktualizacji magazynu: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji magazynu", 500)

@warehouses_bp.route('/warehouses/<int:warehouse_id>', methods=['DELETE'])
def delete_warehouse(warehouse_id):
    """
    Usuń magazyn (soft delete - ustaw aktywny = 0)
    DELETE /api/warehouses/<id>
    """
    try:
        # Sprawdź czy magazyn istnieje
        check_sql = "SELECT id, nazwa FROM warehouses WHERE id = ?"
        existing = execute_query(check_sql, (warehouse_id,))
        
        if not existing:
            return not_found_response("Magazyn nie został znaleziony")
        
        # Soft delete - ustaw aktywny = 0 zamiast usuwania
        update_sql = "UPDATE warehouses SET aktywny = 0 WHERE id = ?"
        result = execute_insert(update_sql, (warehouse_id,))
        
        if result:
            return success_response({
                'id': warehouse_id,
                'message': f"Magazyn '{existing[0]['nazwa']}' został dezaktywowany"
            }, "Magazyn usunięty pomyślnie")
        else:
            return error_response("Błąd usuwania magazynu", 500)
        
    except Exception as e:
        print(f"Błąd usuwania magazynu {warehouse_id}: {e}")
        return error_response("Wystąpił błąd podczas usuwania magazynu", 500)

@warehouses_bp.route('/warehouses/<int:warehouse_id>/employees', methods=['GET'])
def get_warehouse_employees(warehouse_id):
    """
    Pobierz pracowników przypisanych do magazynu
    GET /api/warehouses/123/employees
    """
    try:
        sql = """
        SELECT 
            uw.*,
            u.login,
            u.typ as user_typ
        FROM user_warehouses uw
        JOIN users u ON uw.user_login = u.login
        WHERE uw.warehouse_id = ? AND uw.aktywny = 1
        ORDER BY uw.rola, u.login
        """
        
        employees = execute_query(sql, (warehouse_id,))
        
        if employees is None:
            return error_response("Błąd pobierania pracowników", 500)
        
        return success_response(employees, f"Znaleziono {len(employees)} pracowników")
        
    except Exception as e:
        print(f"Błąd pobierania pracowników: {e}")
        return error_response("Wystąpił błąd podczas pobierania pracowników", 500)

@warehouses_bp.route('/warehouses/<int:warehouse_id>/employees', methods=['POST'])
def assign_employee_to_warehouse(warehouse_id):
    """
    Przypisz pracownika do magazynu
    POST /api/warehouses/123/employees
    Body: {"user_login": "admin", "rola": "pracownik"}
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        user_login = data.get('user_login')
        if not user_login:
            return error_response("Pole 'user_login' jest wymagane", 400)
        
        # Sprawdź czy magazyn istnieje
        warehouse_check = execute_query("SELECT id FROM warehouses WHERE id = ?", (warehouse_id,))
        if not warehouse_check:
            return not_found_response(f"Magazyn o ID {warehouse_id} nie został znaleziony")
        
        # Sprawdź czy użytkownik istnieje
        user_check = execute_query("SELECT id, login FROM users WHERE login = ?", (user_login,))
        if not user_check:
            return not_found_response(f"Użytkownik o login {user_login} nie został znaleziony")
        
        # Sprawdź czy nie jest już przypisany
        existing = execute_query(
            "SELECT id FROM user_warehouses WHERE user_login = ? AND warehouse_id = ? AND aktywny = 1",
            (user_login, warehouse_id)
        )
        if existing:
            return error_response("Pracownik jest już przypisany do tego magazynu", 400)
        
        # Przypisz pracownika
        insert_sql = """
        INSERT INTO user_warehouses (user_login, warehouse_id, rola, data_od)
        VALUES (?, ?, ?, datetime('now'))
        """
        
        params = (
            user_login,
            warehouse_id,
            data.get('rola', 'pracownik')
        )
        
        assignment_id = execute_insert(insert_sql, params)
        
        if assignment_id:
            return success_response({
                'assignment_id': assignment_id,
                'user_login': user_login
            }, "Pracownik przypisany do magazynu")
        else:
            return error_response("Błąd przypisywania pracownika", 500)
        
    except Exception as e:
        print(f"Błąd przypisywania pracownika: {e}")
        return error_response("Wystąpił błąd podczas przypisywania pracownika", 500)

@warehouses_bp.route('/warehouses/<int:warehouse_id>/employees/<user_login>', methods=['DELETE'])
def remove_employee_from_warehouse(warehouse_id, user_login):
    """
    Usuń pracownika z magazynu
    DELETE /api/warehouses/123/employees/admin
    """
    try:
        # Sprawdź czy przypisanie istnieje
        existing = execute_query(
            "SELECT id FROM user_warehouses WHERE user_login = ? AND warehouse_id = ? AND aktywny = 1",
            (user_login, warehouse_id)
        )
        
        if not existing:
            return not_found_response("Nie znaleziono przypisania pracownika do magazynu")
        
        # Dezaktywuj przypisanie (nie usuwaj - zachowaj historię)
        update_sql = """
        UPDATE user_warehouses 
        SET aktywny = 0, data_do = datetime('now')
        WHERE user_login = ? AND warehouse_id = ? AND aktywny = 1
        """
        
        success = execute_insert(update_sql, (user_login, warehouse_id))
        
        if success:
            return success_response({}, "Pracownik usunięty z magazynu")
        else:
            return error_response("Błąd usuwania pracownika", 500)
        
    except Exception as e:
        print(f"Błąd usuwania pracownika: {e}")
        return error_response("Wystąpił błąd podczas usuwania pracownika", 500)

@warehouses_bp.route('/warehouses/<int:warehouse_id>/prices', methods=['GET'])
def get_warehouse_prices(warehouse_id):
    """
    Pobierz ceny produktów dla danego magazynu
    GET /api/warehouses/123/prices
    """
    try:
        # Sprawdź czy magazyn istnieje
        warehouse = execute_query(
            "SELECT id, nazwa FROM warehouses WHERE id = ?",
            (warehouse_id,)
        )
        
        if not warehouse:
            return not_found_response("Magazyn nie został znaleziony")
        
        # Pobierz ceny produktów dla tego magazynu
        # Jeśli nie ma dedykowanych cen magazynowych, zwracaj ceny standardowe z produkty
        prices_sql = """
        SELECT 
            p.id as product_id,
            p.nazwa as product_name,
            p.ean as barcode,
            p.cena_sprzedazy_brutto as price,
            COALESCE(p.cena_zakupu_netto, 0) as purchase_price,
            COALESCE(p.cena_sprzedazy_netto, 0) as price_net,
            p.stawka_vat as vat_rate,
            COALESCE(wp.cena_sprzedazy_brutto, p.cena_sprzedazy_brutto) as warehouse_price,
            -- Oblicz warehouse_price_net poprawnie z ceny specjalnej lub standardowej
            CASE 
                WHEN wp.cena_sprzedazy_brutto IS NOT NULL THEN 
                    wp.cena_sprzedazy_brutto / (1 + COALESCE(p.stawka_vat, 23)/100.0)
                ELSE 
                    COALESCE(p.cena_sprzedazy_netto, p.cena_sprzedazy_brutto / (1 + COALESCE(p.stawka_vat, 23)/100.0), 0)
            END as warehouse_price_net,
            wp.cena_sprzedazy_brutto as dedicated_warehouse_price,
            wp.updated_at as price_updated,
            -- Stan magazynowy z inventory_locations
            COALESCE(il.ilosc_dostepna, 0) as stock_quantity,
            COALESCE(il.ilosc_zarezerwowana, 0) as stock_reserved
        FROM produkty p
        LEFT JOIN warehouse_product_prices wp ON p.id = wp.product_id AND wp.warehouse_id = ? AND wp.aktywny = 1
        LEFT JOIN inventory_locations il ON p.id = il.product_id AND il.warehouse_id = ?
        WHERE p.aktywny = 1
        ORDER BY p.nazwa
        """
        
        prices = execute_query(prices_sql, (warehouse_id, warehouse_id))
        
        if prices is None:
            return error_response("Błąd połączenia z bazą danych", 500)
        
        # Debug dla konkretnego produktu
        debug_product = next((p for p in prices if p.get('barcode') == '5902837746883'), None)
        if debug_product:
            print(f"🔍 DEBUG WAREHOUSE PRICES dla {debug_product['barcode']}:")
            print(f"   cena_sprzedazy_netto: {debug_product.get('price_net')}")
            print(f"   cena_sprzedazy_brutto: {debug_product.get('price')}")
            print(f"   stawka_vat: {debug_product.get('vat_rate')}")
            print(f"   warehouse_price_net: {debug_product.get('warehouse_price_net')}")
            print(f"   cena_zakupu_netto: {debug_product.get('purchase_price')}")
        
        # Przekształć wyniki do formatu oczekiwanego przez frontend
        prices_data = []
        for row in prices:
            standard_price = float(row['price']) if row['price'] else 0.0
            purchase_price_netto = float(row['purchase_price']) if row['purchase_price'] else 0.0
            warehouse_price = float(row['warehouse_price']) if row['warehouse_price'] else standard_price
            warehouse_price_netto = float(row['warehouse_price_net']) if row['warehouse_price_net'] else 0.0
            
            # Oblicz marżę używając centralnego API marży
            margin = 0.0
            margin_method = "brak_ceny"
            
            # Pobierz cenę zakupu i marżę z centralnego API marży
            margin_service_purchase_price = purchase_price_netto  # domyślnie z tabeli produkty
            
            # Spróbuj użyć centralnego API marży
            if warehouse_price_netto > 0:
                try:
                    margin_calc = margin_service.calculate_product_margin(
                        product_id=row['product_id'],
                        sell_price_net=warehouse_price_netto,
                        warehouse_id=warehouse_id
                    )
                    margin = margin_calc.margin_percent
                    margin_method = margin_calc.calculation_method
                    # Użyj ceny zakupu z margin_service dla spójności
                    margin_service_purchase_price = margin_calc.buy_price_net
                except Exception as e:
                    print(f"⚠️ API marży niedostępne dla produktu {row['product_id']}: {e}")
                    # Fallback - lokalne obliczenia
                    if purchase_price_netto > 0 and warehouse_price_netto > 0:
                        margin_amount = warehouse_price_netto - purchase_price_netto
                        margin = round((margin_amount / warehouse_price_netto) * 100, 2)
                        margin_method = "lokalne_obliczenia"
            
            # POPRAWKA: Sprawdź czy istnieje dedykowana cena magazynowa 
            has_dedicated_price = row['dedicated_warehouse_price'] is not None
            
            prices_data.append({
                'product_id': row['product_id'],
                'product_name': row['product_name'],
                'barcode': row['barcode'],
                'standard_price': standard_price,
                'purchase_price': margin_service_purchase_price,  # Użyj ceny z margin_service
                'price_net': float(row['price_net']) if row['price_net'] else 0.0,
                'vat_rate': float(row['vat_rate']) if row['vat_rate'] else 23.0,
                'warehouse_price': warehouse_price,
                'warehouse_price_net': warehouse_price_netto,
                'special_price': warehouse_price if has_dedicated_price else None,
                'has_special_price': has_dedicated_price,
                'margin': round(margin, 2),
                'margin_method': margin_method,
                'price_updated': row['price_updated'],
                # Stan magazynowy
                'stock': float(row['stock_quantity']) if row.get('stock_quantity') else 0.0,
                'stock_quantity': float(row['stock_quantity']) if row.get('stock_quantity') else 0.0,
                'stock_reserved': float(row['stock_reserved']) if row.get('stock_reserved') else 0.0
            })
        
        return success_response({
            'warehouse': {
                'id': warehouse[0]['id'],
                'name': warehouse[0]['nazwa']
            },
            'prices': prices_data,
            'total_products': len(prices_data)
        }, "Pobrano ceny produktów dla magazynu")
        
    except Exception as e:
        print(f"Błąd pobierania cen magazynu: {e}")
        return error_response("Wystąpił błąd podczas pobierania cen magazynu", 500)

# Funkcja inicjalizacyjna - należy wywołać przy starcie aplikacji
def initialize_warehouse_system():
    """
    Inicjalizuje system wielomagazynowy
    """
    try:
        print("🏪 Inicjalizacja systemu wielomagazynowego...")
        init_warehouse_tables()
        
        # Sprawdź czy istnieje magazyn domyślny
        default_warehouse = execute_query("SELECT id FROM warehouses WHERE kod_magazynu = 'MAIN'", ())
        
        if not default_warehouse:
            # Utwórz magazyn główny
            insert_sql = """
            INSERT INTO warehouses (nazwa, kod_magazynu, typ_magazynu, opis)
            VALUES ('Magazyn Główny', 'MAIN', 'magazyn', 'Domyślny magazyn główny')
            """
            main_warehouse_id = execute_insert(insert_sql, ())
            
            if main_warehouse_id:
                print(f"✅ Utworzono magazyn główny o ID: {main_warehouse_id}")
                
                # Migruj istniejące stany magazynowe do nowego systemu
                migrate_existing_inventory_to_main_warehouse(main_warehouse_id)
            else:
                print("❌ Błąd tworzenia magazynu głównego")
        else:
            print("✅ Magazyn główny już istnieje")
            
    except Exception as e:
        print(f"❌ Błąd inicjalizacji systemu wielomagazynowego: {e}")

def migrate_existing_inventory_to_main_warehouse(main_warehouse_id):
    """
    Migracja została usunięta - używamy tylko warehouses
    """
    try:
        print("✅ System warehouse jest już skonfigurowany")
        
    except Exception as e:
        print(f"❌ Błąd migracji stanów magazynowych: {e}")
