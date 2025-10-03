"""
API endpoint dla funkcji POS
Transakcje, koszyk, płatności, statystyki sprzedaży, rabaty
"""

from flask import Blueprint, request, jsonify, session
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime
import uuid

# Importuj system prefixów dokumentów
try:
    from api.document_prefixes import prefix_manager
except ImportError:
    prefix_manager = None

pos_bp = Blueprint('pos', __name__)

@pos_bp.route('/pos/stats', methods=['GET'])
def get_pos_stats():
    """
    Pobierz statystyki POS - sprzedaż dzisiaj, w tym tygodniu, miesiącu
    """
    try:
        print("🔍 DEBUG: Starting POS stats")
        
        stats_query = """
        SELECT 
            COUNT(*) as total_transactions,
            COALESCE(SUM(suma_brutto), 0) as total_revenue,
            COALESCE(AVG(suma_brutto), 0) as average_transaction,
            COUNT(CASE WHEN DATE(data_transakcji) = DATE('now') THEN 1 END) as today_transactions,
            COALESCE(SUM(CASE WHEN DATE(data_transakcji) = DATE('now') THEN suma_brutto ELSE 0 END), 0) as today_revenue,
            COALESCE(AVG(CASE WHEN DATE(data_transakcji) = DATE('now') THEN suma_brutto ELSE NULL END), 0) as today_average_transaction,
            COUNT(CASE WHEN DATE(data_transakcji) >= DATE('now', '-7 days') THEN 1 END) as week_transactions,
            COALESCE(SUM(CASE WHEN DATE(data_transakcji) >= DATE('now', '-7 days') THEN suma_brutto ELSE 0 END), 0) as week_revenue,
            COALESCE(AVG(CASE WHEN DATE(data_transakcji) >= DATE('now', '-7 days') THEN suma_brutto ELSE NULL END), 0) as week_average_transaction,
            COUNT(CASE WHEN DATE(data_transakcji) >= DATE('now', '-30 days') THEN 1 END) as month_transactions,
            COALESCE(SUM(CASE WHEN DATE(data_transakcji) >= DATE('now', '-30 days') THEN suma_brutto ELSE 0 END), 0) as month_revenue,
            COALESCE(AVG(CASE WHEN DATE(data_transakcji) >= DATE('now', '-30 days') THEN suma_brutto ELSE NULL END), 0) as month_average_transaction
        FROM pos_transakcje
        WHERE status = 'zakonczony'
        """
        
        print("🔍 DEBUG: Executing query...")
        results = execute_query(stats_query)
        print(f"🔍 DEBUG: Query results: {results}")
        
        if results is None:
            print("❌ DEBUG: results is None")
            return error_response("Błąd połączenia z bazą danych", 500)
            
        stats = results[0] if results else {
            'total_transactions': 0,
            'total_revenue': 0,
            'average_transaction': 0,
            'today_transactions': 0,
            'today_revenue': 0,
            'today_average_transaction': 0,
            'week_transactions': 0,
            'week_revenue': 0,
            'week_average_transaction': 0,
            'month_transactions': 0,
            'month_revenue': 0,
            'month_average_transaction': 0
        }
        
        print(f"✅ DEBUG: Final stats: {stats}")
        return success_response(stats, "Statystyki POS pobrane pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania statystyk POS: {e}")
        return error_response("Wystąpił błąd podczas pobierania statystyk", 500)

@pos_bp.route('/pos/monthly-stats', methods=['GET'])
def get_monthly_stats():
    """
    Pobierz miesięczne statystyki POS z podziałem na miesiące
    """
    try:
        monthly_stats_query = """
        SELECT 
            strftime('%Y-%m', data_transakcji) as month,
            strftime('%Y', data_transakcji) as year,
            strftime('%m', data_transakcji) as month_num,
            COUNT(*) as transactions_count,
            COALESCE(SUM(suma_brutto), 0) as total_revenue,
            COALESCE(AVG(suma_brutto), 0) as average_transaction,
            COALESCE(SUM(CASE WHEN pozycje.ilosc IS NOT NULL THEN pozycje.ilosc ELSE 0 END), 0) as items_sold
        FROM pos_transakcje t
        LEFT JOIN (
            SELECT transakcja_id, SUM(ilosc) as ilosc 
            FROM pos_pozycje 
            GROUP BY transakcja_id
        ) pozycje ON t.id = pozycje.transakcja_id
        WHERE t.status = 'zakonczony' 
        AND DATE(t.data_transakcji) >= DATE('now', '-12 months')
        GROUP BY strftime('%Y-%m', t.data_transakcji)
        ORDER BY month DESC
        LIMIT 12
        """
        
        results = execute_query(monthly_stats_query)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        monthly_data = []
        for row in results:
            monthly_data.append({
                'month': row['month'],
                'year': int(row['year']),
                'month_num': int(row['month_num']),
                'transactions_count': row['transactions_count'],
                'total_revenue': round(float(row['total_revenue']), 2),
                'average_transaction': round(float(row['average_transaction']), 2),
                'items_sold': row['items_sold']
            })
        
        return success_response(monthly_data, "Miesięczne statystyki pobrane pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania miesięcznych statystyk: {e}")
        return error_response("Wystąpił błąd podczas pobierania miesięcznych statystyk", 500)

@pos_bp.route('/pos/transactions', methods=['GET'])
def get_recent_transactions():
    """
    Pobierz ostatnie transakcje używając nowych tabel POS
    Parametry: limit (default=20), status, date_from, date_to, cashier
    """
    try:
        limit = int(request.args.get('limit', 20))
        status = request.args.get('status', 'zakonczony')  # default completed transactions
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        cashier = request.args.get('kasjer_id')
        location_id = request.args.get('location_id')
        
        # Mapowanie statusów angielski -> polski
        status_mapping = {
            'completed': 'zakonczony',
            'pending': 'w_trakcie',
            'draft': 'draft'
        }
        
        # Użyj mapowania jeśli status jest w angielskim
        if status in status_mapping:
            status = status_mapping[status]
        
        sql_query = """
        SELECT 
            t.id,
            t.numer_paragonu,
            t.klient_id,
            COALESCE(k.imie || ' ' || k.nazwisko, k.nazwa_firmy, 'Klient anonimowy') as customer_name,
            t.suma_brutto as total_amount,
            t.forma_platnosci as payment_method,
            t.status,
            t.data_transakcji as created_at,
            t.data_transakcji,
            t.czas_transakcji,
            t.kasjer_login as kasjer_id,
            t.location_id,
            t.fiskalizacja,
            COUNT(p.id) as items_count
        FROM pos_transakcje t
        LEFT JOIN pos_klienci k ON t.klient_id = k.id
        LEFT JOIN pos_pozycje p ON t.id = p.transakcja_id
        WHERE 1=1
        """
        
        params = []
        
        if status:
            sql_query += " AND t.status = ?"
            params.append(status)
            
        if date_from:
            sql_query += " AND DATE(t.data_transakcji) >= ?"
            params.append(date_from)
            
        if date_to:
            sql_query += " AND DATE(t.data_transakcji) <= ?"
            params.append(date_to)
            
        if cashier:
            sql_query += " AND t.kasjer_login = ?"
            params.append(cashier)
            
        if location_id:
            sql_query += " AND t.location_id = ?"
            params.append(location_id)
            
        sql_query += " GROUP BY t.id ORDER BY t.data_transakcji DESC, t.czas_transakcji DESC LIMIT ?"
        params.append(limit)
        
        results = execute_query(sql_query, params)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'transactions': results,
            'total': len(results),
            'limit': limit
        }, f"Pobrano {len(results)} transakcji")
        
    except ValueError:
        return error_response("Parametr 'limit' musi być liczbą", 400)
    except Exception as e:
        print(f"Błąd pobierania transakcji: {e}")
        return error_response("Wystąpił błąd podczas pobierania transakcji", 500)

@pos_bp.route('/pos/transaction', methods=['POST'])
def create_transaction():
    """
    Utwórz nową transakcję
    Body: {
        customer_id: int (optional),
        items: [{product_id: int, quantity: int, price: float}],
        payment_method: string,
        notes: string (optional)
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych JSON", 400)
            
        items = data.get('items', [])
        customer_id = data.get('customer_id')
        payment_method = data.get('payment_method', 'cash')
        notes = data.get('notes', '')
        
        if not items:
            return error_response("Lista produktów nie może być pusta", 400)
            
        # Oblicz sumy
        total_amount = 0
        tax_amount = 0
        
        for item in items:
            if not all(k in item for k in ['product_id', 'quantity', 'price']):
                return error_response("Każdy produkt musi mieć product_id, quantity i price", 400)
                
            item_total = item['quantity'] * item['price']
            total_amount += item_total
            
            # Pobierz stawkę VAT produktu
            product_query = "SELECT stawka_vat as tax_rate FROM produkty WHERE id = ?"
            product_result = execute_query(product_query, [item['product_id']])
            
            if product_result:
                tax_rate = product_result[0]['tax_rate'] or 0
                tax_amount += item_total * (tax_rate / 100)
        
        # Utwórz transakcję
        transaction_query = """
        INSERT INTO transactions (customer_id, total_amount, tax_amount, payment_method, status, notes, created_at)
        VALUES (?, ?, ?, ?, 'completed', ?, datetime('now'))
        """
        
        transaction_id = execute_insert(transaction_query, [
            customer_id, total_amount, tax_amount, payment_method, notes
        ])
        
        if not transaction_id:
            return error_response("Błąd tworzenia transakcji", 500)
            
        # Dodaj pozycje transakcji
        for item in items:
            item_query = """
            INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?)
            """
            
            item_total = item['quantity'] * item['price']
            execute_insert(item_query, [
                transaction_id, item['product_id'], item['quantity'], item['price'], item_total
            ])
        
        return success_response({
            'transaction_id': transaction_id,
            'total_amount': round(total_amount, 2),
            'tax_amount': round(tax_amount, 2),
            'payment_method': payment_method,
            'status': 'completed'
        }, "Transakcja utworzona pomyślnie", 201)
        
    except Exception as e:
        print(f"Błąd tworzenia transakcji: {e}")
        return error_response("Wystąpił błąd podczas tworzenia transakcji", 500)

@pos_bp.route('/pos/transaction/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """
    Pobierz szczegóły transakcji wraz z pozycjami
    """
    try:
        # Pobierz transakcję
        transaction_query = """
        SELECT 
            t.id,
            t.customer_id,
            c.name as customer_name,
            t.total_amount,
            t.tax_amount,
            t.payment_method,
            t.status,
            t.notes,
            t.created_at,
            t.updated_at
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.id = ?
        """
        
        transaction_result = execute_query(transaction_query, [transaction_id])
        
        if not transaction_result:
            return not_found_response(f"Transakcja o ID {transaction_id} nie została znaleziona")
            
        transaction = transaction_result[0]
        
        # Pobierz pozycje transakcji
        items_query = """
        SELECT 
            ti.id,
            ti.product_id,
            p.name as product_name,
            ti.quantity,
            ti.unit_price,
            ti.total_price
        FROM transaction_items ti
        LEFT JOIN produkty p ON ti.product_id = p.id
        WHERE ti.transaction_id = ?
        ORDER BY ti.id
        """
        
        items_result = execute_query(items_query, [transaction_id])
        transaction['items'] = items_result or []
        
        return success_response(transaction, "Szczegóły transakcji pobrane pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania transakcji: {e}")
        return error_response("Wystąpił błąd podczas pobierania transakcji", 500)

@pos_bp.route('/pos/transaction/<int:transaction_id>/complete', methods=['POST'])
def complete_transaction(transaction_id):
    """
    Finalizuje transakcję i automatycznie odejmuje stany magazynowe
    """
    try:
        data = request.get_json() or {}
        
        # Pobierz transakcję i jej pozycje
        transaction_query = """
        SELECT 
            t.id,
            t.status,
            t.suma_brutto as total_amount,
            t.rabat_kwota
        FROM pos_transakcje t
        WHERE t.id = ?
        """
        
        transaction_result = execute_query(transaction_query, [transaction_id])
        
        if not transaction_result:
            return not_found_response(f"Transakcja o ID {transaction_id} nie została znaleziona")
            
        transaction = transaction_result[0]
        
        if transaction['status'] == 'zakonczony':
            return error_response("Transakcja już została sfinalizowana", 400)
        
        # Pobierz pozycje transakcji
        items_query = """
        SELECT 
            ti.id,
            ti.product_id as product_id,
            ti.ilosc as quantity,
            ti.cena_jednostkowa as unit_price,
            p.nazwa as product_name
        FROM pos_pozycje ti
        LEFT JOIN produkty p ON ti.product_id = p.id
        WHERE ti.transakcja_id = ?
        """
        
        items = execute_query(items_query, [transaction_id]) or []
        
        if not items:
            return error_response("Nie znaleziono pozycji dla tej transakcji", 400)
        
        # Sprawdź stany magazynowe przed sprzedażą
        stock_check_errors = []
        for item in items:
            product_id = item['product_id']
            required_quantity = item['quantity']
            
            # Sprawdź aktualny stan z pos_magazyn
            stock_query = "SELECT stan_aktualny as stock FROM pos_magazyn WHERE produkt_id = ?"
            
            current_stock = 0
            try:
                stock_result = execute_query(stock_query, [product_id])
                if stock_result and stock_result[0]['stock'] is not None:
                    current_stock = stock_result[0]['stock']
            except:
                # Jeśli nie ma wpisu w stanach, przyjmij że jest 0
                current_stock = 0
            
            if current_stock < required_quantity:
                stock_check_errors.append({
                    'product_id': product_id,
                    'product_name': item['product_name'],
                    'required': required_quantity,
                    'available': current_stock,
                    'shortfall': required_quantity - current_stock
                })
        
        # Jeśli są błędy stanów, zwróć błąd
        if stock_check_errors:
            return error_response({
                'message': 'Niewystarczające stany magazynowe',
                'stock_errors': stock_check_errors
            }, 400)
        
        # Aktualizuj stany magazynowe
        stock_updates = []
        for item in items:
            product_id = item['product_id']
            sold_quantity = item['quantity']
            
            # Zaktualizuj stan w tabeli pos_magazyn
            update_query = """
            UPDATE pos_magazyn 
            SET stan_aktualny = COALESCE(stan_aktualny, 0) - ?,
                ostatnia_aktualizacja = datetime('now')
            WHERE produkt_id = ?
            """
            
            try:
                result = execute_insert(update_query, [sold_quantity, product_id])
                if result:
                    stock_updates.append({
                        'product_id': product_id,
                        'product_name': item['product_name'],
                        'quantity_sold': sold_quantity
                    })
            except Exception as e:
                print(f"Błąd aktualizacji stanu dla produktu {product_id}: {e}")
                
            # Zapisz ruch magazynowy (jeśli tabela istnieje)
            try:
                # Pobierz stan przed zmianą
                current_stock_before = execute_query("SELECT stan_aktualny FROM pos_magazyn WHERE produkt_id = ?", [product_id])
                stan_przed = current_stock_before[0]['stan_aktualny'] if current_stock_before else 0
                stan_po = stan_przed - sold_quantity
                
                movement_sql = """
                INSERT INTO pos_ruchy_magazynowe 
                (product_id, typ_ruchu, ilosc, stan_przed, stan_po, data_ruchu, czas_ruchu, user_login, uwagi)
                VALUES (?, 'wydanie', ?, ?, ?, date('now'), time('now'), ?, ?)
                """
                execute_insert(movement_sql, [
                    product_id, 
                    sold_quantity,
                    stan_przed,
                    stan_po,
                    data.get('user', 'system'),
                    f"Sprzedaż - transakcja #{transaction_id}"
                ])
            except Exception as e:
                print(f"Błąd zapisu ruchu magazynowego: {e}")
                pass
        
        # Aktualizuj status transakcji na 'zakonczony'
        payment_method = data.get('payment_method', 'gotowka')
        amount_paid = data.get('amount_paid', transaction['total_amount'])
        amount_change = data.get('amount_change', 0)
        
        status_update_sql = """
        UPDATE pos_transakcje 
        SET status = 'zakonczony',
            forma_platnosci = ?,
            kwota_otrzymana = ?,
            kwota_reszty = ?
        WHERE id = ?
        """
        
        transaction_updated = execute_insert(status_update_sql, [
            payment_method, amount_paid, amount_change, transaction_id
        ])
        
        if not transaction_updated:
            return error_response("Błąd aktualizacji statusu transakcji", 500)
        
        # Dodaj operację do kasa_operacje
        try:
            payment_type_mapping = {
                'cash': 'gotowka',
                'card': 'karta', 
                'transfer': 'przelew',
                'blik': 'blik',
                'gotowka': 'gotowka',
                'karta': 'karta',
                'przelew': 'przelew'
            }
            typ_platnosci = payment_type_mapping.get(payment_method, 'gotowka')
            
            kasa_operacja_sql = """
            INSERT INTO kasa_operacje 
            (typ_operacji, typ_platnosci, kwota, opis, kategoria, 
             numer_dokumentu, data_operacji, utworzyl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            opis = f"Sprzedaż - transakcja #{transaction_id}"
            # Użyj kwoty otrzymanej jako kwotę końcową (po rabacie)
            final_amount = amount_paid
            
            print(f"DEBUG kasa_operacje: payment_method={payment_method}, typ_platnosci={typ_platnosci}, final_amount={final_amount}")
            
            execute_insert(kasa_operacja_sql, (
                'KP',  # Kasa Przyjmie
                typ_platnosci,
                final_amount,
                opis,
                'sprzedaz',
                f"TRANS-{transaction_id}",
                datetime.now().date().isoformat(),
                data.get('user', 'system')
            ))
        except Exception as e:
            # Loguj błąd ale nie przerywaj procesu
            print(f"Błąd dodawania operacji kasa/bank: {str(e)}")
            pass
        
        return success_response({
            'transaction_id': transaction_id,
            'status': 'completed',
            'stock_updates': stock_updates,
            'total_amount': transaction['total_amount'],
            'items_count': len(items),
            'completed_at': datetime.now().isoformat()
        }, "Transakcja sfinalizowana pomyślnie")
        
    except Exception as e:
        print(f"Błąd finalizacji transakcji: {e}")
        import traceback
        traceback.print_exc()
        return error_response(f"Wystąpił błąd podczas finalizacji transakcji: {str(e)}", 500)

@pos_bp.route('/pos/inventory/update-after-sale', methods=['POST'])
def update_inventory_after_sale():
    """
    Endpoint specjalnie do odejmowania stanów po sprzedaży
    Body: {"items": [{"product_id": 1, "quantity": 2}]}
    """
    try:
        data = request.get_json()
        if not data or 'items' not in data:
            return error_response("Brak danych o sprzedanych produktach", 400)
        
        items = data['items']
        if not isinstance(items, list):
            return error_response("Items musi być listą", 400)
        
        updates = []
        errors = []
        
        for item in items:
            try:
                product_id = item.get('product_id')
                quantity = item.get('quantity', 0)
                
                if not product_id or quantity <= 0:
                    errors.append({
                        'error': 'Nieprawidłowe dane produktu',
                        'item': item
                    })
                    continue
                
                # Sprawdź aktualny stan
                stock_queries = [
                    "SELECT stan_magazynowy as stock, nazwa as name FROM produkty WHERE id = ?",
                    "SELECT stan_magazynowy as stock, nazwa as name FROM produkty WHERE id = ?"
                ]
                
                product_info = None
                for query in stock_queries:
                    try:
                        result = execute_query(query, [product_id])
                        if result:
                            product_info = result[0]
                            break
                    except:
                        continue
                
                if not product_info:
                    errors.append({
                        'error': f'Produkt {product_id} nie został znaleziony',
                        'item': item
                    })
                    continue
                
                current_stock = product_info['stock'] or 0
                
                if current_stock < quantity:
                    errors.append({
                        'error': f'Niewystarczający stan dla produktu {product_info["name"]}',
                        'item': item,
                        'available': current_stock,
                        'required': quantity
                    })
                    continue
                
                # Odejmij stan
                update_queries = [
                    """
                    UPDATE produkty 
                    SET stan_magazynowy = stan_magazynowy - ?,
                        data_modyfikacji = datetime('now')
                    WHERE id = ?
                    """,
                    """
                    UPDATE produkty 
                    SET stan_magazynowy = stan_magazynowy - ?,
                        data_modyfikacji = datetime('now')
                    WHERE id = ?
                    """
                ]
                
                updated = False
                for update_query in update_queries:
                    try:
                        result = execute_insert(update_query, [quantity, product_id])
                        if result:
                            updated = True
                            break
                    except:
                        continue
                
                if updated:
                    updates.append({
                        'product_id': product_id,
                        'product_name': product_info['name'],
                        'old_stock': current_stock,
                        'new_stock': current_stock - quantity,
                        'quantity_sold': quantity
                    })
                else:
                    errors.append({
                        'error': f'Błąd aktualizacji stanu dla produktu {product_id}',
                        'item': item
                    })
                    
            except Exception as e:
                errors.append({
                    'error': str(e),
                    'item': item
                })
        
        response_data = {
            'successful_updates': len(updates),
            'failed_updates': len(errors),
            'updates': updates,
            'errors': errors
        }
        
        if errors and not updates:
            return error_response(response_data, 400)
        elif errors:
            return jsonify({
                'success': True,
                'data': response_data,
                'message': f"Zaktualizowano {len(updates)} produktów, {len(errors)} błędów"
            }), 207  # Multi-Status
        else:
            return success_response(response_data, f"Pomyślnie zaktualizowano stany {len(updates)} produktów")
            
    except Exception as e:
        return error_response(f"Błąd aktualizacji stanów po sprzedaży: {str(e)}", 500)

# ==================== NOWE ENDPOINTY POS Z KOSZYKIEM I RABATAMI ====================

@pos_bp.route('/pos/cart/new', methods=['POST'])
def create_cart():
    """
    Utwórz nowy koszyk (transakcję w_trakcie)
    """
    try:
        data = request.get_json() or {}
        
        kasjer_login = data.get('kasjer_id', 'admin')  # Zmiana z kasjer_id na kasjer_login
        location_id = data.get('location_id', 5)  # Domyślnie Kalisz zamiast Nysa
        shift_id = data.get('shift_id')
        
        # Generuj unikalny numer transakcji
        now = datetime.now()
        numer_transakcji = f"T{now.strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:4]}"
        
        query = """
        INSERT INTO pos_transakcje (
            numer_transakcji, data_transakcji, czas_transakcji, 
            kasjer_login, location_id, status, suma_brutto, suma_netto, suma_vat
        ) VALUES (?, ?, ?, ?, ?, 'w_trakcie', 0, 0, 0)
        """
        
        transakcja_id = execute_insert(query, (
            numer_transakcji, 
            now.strftime('%Y-%m-%d'), 
            now.strftime('%H:%M:%S'),
            kasjer_login,
            location_id
        ))
        
        if transakcja_id:
            return success_response("Koszyk utworzony", {
                "transakcja_id": transakcja_id,
                "numer_transakcji": numer_transakcji
            })
        else:
            return error_response("Nie udało się utworzyć koszyka", 500)
            
    except Exception as e:
        print(f"Błąd create_cart: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@pos_bp.route('/pos/cart/<int:transakcja_id>/items', methods=['POST'])
def add_item_to_cart(transakcja_id):
    """
    Dodaj produkt do koszyka
    """
    try:
        data = request.get_json()
        
        if not data or 'product_id' not in data:
            return error_response("Pole product_id jest wymagane", 400)
            
        product_id = data['product_id']
        ilosc = float(data.get('ilosc', 1))
        
        # Sprawdź czy transakcja istnieje i jest w trakcie
        transakcja = execute_query("SELECT status FROM pos_transakcje WHERE id = ?", (transakcja_id,))
        if not transakcja:
            return error_response("Transakcja nie została znaleziona", 404)
            
        if transakcja[0]['status'] != 'w_trakcie':
            return error_response("Można dodawać produkty tylko do transakcji w trakcie", 400)
        
        # Pobierz informacje o produkcie
        product = execute_query("""
            SELECT *, cena_sprzedazy_brutto as aktualna_cena
            FROM produkty
            WHERE id = ?
        """, (product_id,))
        
        if not product:
            return error_response("Produkt nie został znaleziony", 404)
            
        product = product[0]
        
        # Sprawdź czy pozycja już istnieje w koszyku
        existing_item = execute_query("""
            SELECT id, ilosc FROM pos_pozycje 
            WHERE transakcja_id = ? AND produkt_id = ?
        """, (transakcja_id, product_id))
        
        cena_jednostkowa_brutto = float(product['aktualna_cena'])
        stawka_vat = float(product.get('stawka_vat', 23))
        cena_jednostkowa_netto = cena_jednostkowa_brutto / (1 + stawka_vat / 100)
        
        if existing_item:
            # Aktualizuj istniejącą pozycję
            nowa_ilosc = existing_item[0]['ilosc'] + ilosc
            wartosc_brutto = nowa_ilosc * cena_jednostkowa_brutto
            wartosc_netto = nowa_ilosc * cena_jednostkowa_netto
            wartosc_vat = wartosc_brutto - wartosc_netto
            
            query = """
            UPDATE pos_pozycje 
            SET ilosc = ?, wartosc_netto = ?, kwota_vat = ?, wartosc_brutto = ?
            WHERE id = ?
            """
            
            result = execute_query(query, (nowa_ilosc, wartosc_netto, wartosc_vat, wartosc_brutto, existing_item[0]['id']))
            pozycja_id = existing_item[0]['id']
        else:
            # Dodaj nową pozycję - tylko do pos_pozycje
            wartosc_brutto = ilosc * cena_jednostkowa_brutto
            wartosc_netto = ilosc * cena_jednostkowa_netto
            wartosc_vat = wartosc_brutto - wartosc_netto
            
            # Pobierz numer pozycji (lp)
            lp_query = execute_query("""
                SELECT COALESCE(MAX(lp), 0) + 1 as lp 
                FROM pos_pozycje WHERE transakcja_id = ?
            """, (transakcja_id,))
            lp = lp_query[0]['lp'] if lp_query else 1
            
            query = """
            INSERT INTO pos_pozycje (
                transakcja_id, produkt_id, nazwa_produktu, kod_produktu,
                cena_jednostkowa, ilosc, jednostka, rabat_procent, rabat_kwota,
                cena_po_rabacie, wartosc_netto, stawka_vat, kwota_vat, 
                wartosc_brutto, lp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            pozycja_id = execute_insert(query, (
                transakcja_id, product_id, product['nazwa'], product.get('kod_produktu', ''),
                cena_jednostkowa_brutto, ilosc, product.get('jednostka', 'szt'), 0, 0,
                cena_jednostkowa_brutto, wartosc_netto, stawka_vat, wartosc_vat,
                wartosc_brutto, lp
            ))
        
        # **NAPRAWKA**: Aktualizuj sumy w transakcji po dodaniu/aktualizacji pozycji
        update_sums_query = execute_query("""
            SELECT 
                COALESCE(SUM(wartosc_brutto), 0) as suma_brutto_pozycje,
                COALESCE(SUM(wartosc_netto), 0) as suma_netto_pozycje,
                COALESCE(SUM(kwota_vat), 0) as suma_vat_pozycje
            FROM pos_pozycje 
            WHERE transakcja_id = ?
        """, (transakcja_id,))
        
        if update_sums_query:
            sums = update_sums_query[0]
            update_transaction_query = """
            UPDATE pos_transakcje 
            SET suma_brutto = ?,
                suma_netto = ?,
                suma_vat = ?
            WHERE id = ?
            """
            execute_insert(update_transaction_query, (
                sums['suma_brutto_pozycje'],
                sums['suma_netto_pozycje'], 
                sums['suma_vat_pozycje'],
                transakcja_id
            ))
            
        if pozycja_id:
            return success_response("Produkt dodany do koszyka", {"pozycja_id": pozycja_id})
        else:
            return error_response("Nie udało się dodać produktu do koszyka", 500)
            
    except Exception as e:
        print(f"Błąd add_item_to_cart: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@pos_bp.route('/pos/cart/<int:transakcja_id>', methods=['GET'])
def get_cart(transakcja_id):
    """
    Pobierz zawartość koszyka z informacjami o rabatach
    """
    try:
        # Pobierz transakcję
        transakcja = execute_query("""
            SELECT t.*, 
                   COALESCE(SUM(ru.kwota_rabatu), 0) as suma_rabatow_obliczona,
                   COUNT(ru.id) as ilosc_rabatow_obliczona
            FROM pos_transakcje t
            LEFT JOIN rabaty_uzycie ru ON t.id = ru.transakcja_id
            WHERE t.id = ?
            GROUP BY t.id
        """, (transakcja_id,))
        
        if not transakcja:
            return error_response("Transakcja nie została znaleziona", 404)
            
        transakcja = transakcja[0]
        
        # Pobierz pozycje koszyka
        pozycje = execute_query("""
            SELECT 
                p.*,
                pr.nazwa as producent_nazwa
            FROM pos_pozycje p
            LEFT JOIN produkty prod ON p.produkt_id = prod.id
            LEFT JOIN producenci pr ON prod.producent_id = pr.id
            WHERE p.transakcja_id = ?
            ORDER BY p.lp
        """, (transakcja_id,))
        
        # Pobierz zastosowane rabaty
        rabaty = execute_query("""
            SELECT ru.*, r.nazwa as rabat_nazwa, r.typ_rabatu, r.wartosc as rabat_wartosc
            FROM rabaty_uzycie ru
            JOIN rabaty r ON ru.rabat_id = r.id
            WHERE ru.transakcja_id = ?
            ORDER BY ru.data_zastosowania
        """, (transakcja_id,))
        
        return success_response("Koszyk pobrany", {
            "transakcja": transakcja,
            "pozycje": pozycje,
            "rabaty": rabaty
        })
        
    except Exception as e:
        print(f"Błąd get_cart: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@pos_bp.route('/pos/cart/<int:transakcja_id>/items/<int:pozycja_id>', methods=['PUT'])
def update_cart_item(transakcja_id, pozycja_id):
    """
    Aktualizuj pozycję w koszyku (ilość)
    """
    try:
        data = request.get_json()
        
        if 'ilosc' not in data:
            return error_response("Pole ilosc jest wymagane", 400)
            
        nowa_ilosc = float(data['ilosc'])
        
        if nowa_ilosc <= 0:
            return error_response("Ilość musi być większa od 0", 400)
            
        # Sprawdź czy pozycja istnieje
        pozycja = execute_query("""
            SELECT p.*, prod.stawka_vat FROM pos_pozycje p
            JOIN produkty prod ON p.produkt_id = prod.id
            WHERE p.id = ? AND p.transakcja_id = ?
        """, (pozycja_id, transakcja_id))
        
        if not pozycja:
            return error_response("Pozycja nie została znaleziona", 404)
            
        pozycja = pozycja[0]
        
        # Przelicz wartości
        cena_jednostkowa_brutto = pozycja['cena_jednostkowa']
        wartosc_brutto = nowa_ilosc * cena_jednostkowa_brutto
        wartosc_netto = nowa_ilosc * (pozycja['wartosc_netto'] / pozycja['ilosc'])  # cena netto za jednostkę
        wartosc_vat = wartosc_brutto - wartosc_netto
        
        query = """
        UPDATE pos_pozycje 
        SET ilosc = ?, wartosc_netto = ?, kwota_vat = ?, wartosc_brutto = ?
        WHERE id = ?
        """
        
        result = execute_query(query, (nowa_ilosc, wartosc_netto, wartosc_vat, wartosc_brutto, pozycja_id))
        
        # **NAPRAWKA**: Aktualizuj sumy w transakcji po aktualizacji pozycji
        if result is not None:
            update_sums_query = execute_query("""
                SELECT 
                    COALESCE(SUM(wartosc_brutto), 0) as suma_brutto_pozycje,
                    COALESCE(SUM(wartosc_netto), 0) as suma_netto_pozycje,
                    COALESCE(SUM(kwota_vat), 0) as suma_vat_pozycje
                FROM pos_pozycje 
                WHERE transakcja_id = ?
            """, (transakcja_id,))
            
            if update_sums_query:
                sums = update_sums_query[0]
                update_transaction_query = """
                UPDATE pos_transakcje 
                SET suma_brutto = ?,
                    suma_netto = ?,
                    suma_vat = ?
                WHERE id = ?
                """
                execute_insert(update_transaction_query, (
                    sums['suma_brutto_pozycje'],
                    sums['suma_netto_pozycje'], 
                    sums['suma_vat_pozycje'],
                    transakcja_id
                ))
        
        if result is not None:
            return success_response("Pozycja zaktualizowana")
        else:
            return error_response("Nie udało się zaktualizować pozycji", 500)
            
    except Exception as e:
        print(f"Błąd update_cart_item: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@pos_bp.route('/pos/cart/<int:transakcja_id>/items/<int:pozycja_id>', methods=['DELETE'])
def remove_cart_item(transakcja_id, pozycja_id):
    """
    Usuń pozycję z koszyka
    """
    try:
        # Sprawdź czy pozycja istnieje
        pozycja = execute_query("""
            SELECT id FROM pos_pozycje 
            WHERE id = ? AND transakcja_id = ?
        """, (pozycja_id, transakcja_id))
        
        if not pozycja:
            return error_response("Pozycja nie została znaleziona", 404)
            
        result = execute_query("DELETE FROM pos_pozycje WHERE id = ?", (pozycja_id,))
        
        # **NAPRAWKA**: Aktualizuj sumy w transakcji po usunięciu pozycji
        if result is not None:
            update_sums_query = execute_query("""
                SELECT 
                    COALESCE(SUM(wartosc_brutto), 0) as suma_brutto_pozycje,
                    COALESCE(SUM(wartosc_netto), 0) as suma_netto_pozycje,
                    COALESCE(SUM(kwota_vat), 0) as suma_vat_pozycje
                FROM pos_pozycje 
                WHERE transakcja_id = ?
            """, (transakcja_id,))
            
            if update_sums_query:
                sums = update_sums_query[0]
                update_transaction_query = """
                UPDATE pos_transakcje 
                SET suma_brutto = ?,
                    suma_netto = ?,
                    suma_vat = ?
                WHERE id = ?
                """
                execute_insert(update_transaction_query, (
                    sums['suma_brutto_pozycje'],
                    sums['suma_netto_pozycje'], 
                    sums['suma_vat_pozycje'],
                    transakcja_id
                ))
        
        if result is not None:
            return success_response("Pozycja usunięta z koszyka")
        else:
            return error_response("Nie udało się usunąć pozycji", 500)
            
    except Exception as e:
        print(f"Błąd remove_cart_item: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@pos_bp.route('/pos/cart/<int:transakcja_id>/discount', methods=['POST'])
def apply_discount_to_cart(transakcja_id):
    """
    Zastosuj rabat do koszyka
    """
    try:
        data = request.get_json()
        
        if 'rabat_id' not in data:
            return error_response("Pole rabat_id jest wymagane", 400)
            
        rabat_id = data['rabat_id']
        user_id = data.get('user_id', 'unknown')
        
        # Pobierz aktualną sumę koszyka
        suma_query = execute_query("""
            SELECT suma_brutto FROM pos_transakcje WHERE id = ? AND status = 'w_trakcie'
        """, (transakcja_id,))
        
        if not suma_query:
            return error_response("Transakcja nie została znaleziona lub nie jest w trakcie", 404)
            
        kwota_koszyka = float(suma_query[0]['suma_brutto'])
        
        if kwota_koszyka <= 0:
            return error_response("Koszyk jest pusty", 400)
            
        # Oblicz rabat
        calc_response = execute_query("""
            SELECT 
                r.*,
                CASE 
                    WHEN r.typ_rabatu = 'procentowy' THEN (? * r.wartosc) / 100
                    ELSE MIN(r.wartosc, ?)
                END as kwota_rabatu
            FROM rabaty r
            WHERE r.id = ? AND r.aktywny = 1
        """, (kwota_koszyka, kwota_koszyka, rabat_id))
        
        if not calc_response:
            return error_response("Rabat nie został znaleziony lub jest nieaktywny", 404)
            
        rabat_info = calc_response[0]
        
        # Sprawdź warunki rabatu
        if kwota_koszyka < rabat_info['minimum_koszyka']:
            return error_response(f"Minimalna wartość koszyka: {rabat_info['minimum_koszyka']} zł", 400)
            
        if rabat_info['maksimum_koszyka'] and kwota_koszyka > rabat_info['maksimum_koszyka']:
            return error_response(f"Maksymalna wartość koszyka: {rabat_info['maksimum_koszyka']} zł", 400)
        
        kwota_rabatu = float(rabat_info['kwota_rabatu'])
        kwota_po_rabacie = kwota_koszyka - kwota_rabatu
        
        # Zapisz użycie rabatu
        query = """
        INSERT INTO rabaty_uzycie (
            rabat_id, transakcja_id, user_id, kwota_przed_rabatem, 
            kwota_rabatu, kwota_po_rabacie, notatka, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        uzycie_id = execute_insert(query, (
            rabat_id, transakcja_id, user_id, kwota_koszyka,
            kwota_rabatu, kwota_po_rabacie, 
            data.get('notatka', ''), request.remote_addr
        ))
        
        # Aktualizuj kolumny rabatowe w transakcji
        if rabat_info['typ_rabatu'] == 'procentowy':
            rabat_procent = rabat_info['wartosc']
        else:
            rabat_procent = 0
            
        update_transaction_query = """
        UPDATE pos_transakcje 
        SET rabat_kwota = ?, rabat_procent = ?
        WHERE id = ?
        """
        execute_insert(update_transaction_query, (kwota_rabatu, rabat_procent, transakcja_id))
        
        if uzycie_id:
            return success_response("Rabat zastosowany do koszyka", {
                "uzycie_id": uzycie_id,
                "kwota_rabatu": kwota_rabatu,
                "kwota_po_rabacie": kwota_po_rabacie,
                "rabat_nazwa": rabat_info['nazwa']
            })
        else:
            return error_response("Nie udało się zastosować rabatu", 500)
            
    except Exception as e:
        print(f"Błąd apply_discount_to_cart: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@pos_bp.route('/pos/cart/<int:transakcja_id>/discount/<int:uzycie_id>', methods=['DELETE'])
def remove_discount_from_cart(transakcja_id, uzycie_id):
    """
    Usuń rabat z koszyka
    """
    try:
        # Sprawdź czy rabat istnieje w tym koszyku
        rabat_uzycie = execute_query("""
            SELECT ru.*, r.typ_rabatu, r.wartosc
            FROM rabaty_uzycie ru
            JOIN rabaty r ON ru.rabat_id = r.id
            WHERE ru.id = ? AND ru.transakcja_id = ?
        """, (uzycie_id, transakcja_id))
        
        if not rabat_uzycie:
            return error_response("Rabat nie został znaleziony w tym koszyku", 404)
            
        rabat_data = rabat_uzycie[0]
        
        # Usuń użycie rabatu z bazy
        print(f"🔍 DEBUG: Próba usunięcia rabatu o ID: {uzycie_id}")
        result = execute_insert("DELETE FROM rabaty_uzycie WHERE id = ?", (uzycie_id,))
        print(f"🔍 DEBUG: Wynik execute_insert: {result}")
        
        if result:
            # Zresetuj kolumny rabatowe w transakcji
            update_transaction_query = """
            UPDATE pos_transakcje 
            SET rabat_kwota = 0, rabat_procent = 0
            WHERE id = ?
            """
            execute_insert(update_transaction_query, (transakcja_id,))
            
            return success_response("Rabat usunięty z koszyka", {
                "uzycie_id": uzycie_id,
                "usuniety_rabat": {
                    "kwota_rabatu": rabat_data['kwota_rabatu'],
                    "typ_rabatu": rabat_data['typ_rabatu'],
                    "wartosc": rabat_data['wartosc']
                }
            })
        else:
            return error_response("Nie udało się usunąć rabatu", 500)
            
    except Exception as e:
        print(f"Błąd remove_discount_from_cart: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@pos_bp.route('/pos/cart/<int:transakcja_id>/complete', methods=['POST'])
def complete_cart_transaction(transakcja_id):
    """
    Zakończ transakcję (finalizuj sprzedaż)
    """
    try:
        data = request.get_json() or {}
        print(f"� DEBUG complete_cart_transaction: transakcja_id={transakcja_id}, data={data}")
        print(f"🔍 DEBUG customer_id from data: {data.get('customer_id')}")
        
        # Sprawdź czy transakcja istnieje i jest w trakcie
        transakcja = execute_query("""
            SELECT * FROM pos_transakcje WHERE id = ? AND status = 'w_trakcie'
        """, (transakcja_id,))
        
        if not transakcja:
            return error_response("Transakcja nie została znaleziona lub nie jest w trakcie", 404)
            
        transakcja = transakcja[0]
        
        # Sprawdź czy są pozycje w koszyku
        pozycje_count = execute_query("""
            SELECT COUNT(*) as count FROM pos_pozycje WHERE transakcja_id = ?
        """, (transakcja_id,))
        
        if not pozycje_count or pozycje_count[0]['count'] == 0:
            return error_response("Nie można finalizować pustego koszyka", 400)
            
        # Przelicz sumy z pozycji przed finalizacją
        pozycje_sum = execute_query("""
            SELECT 
                COALESCE(SUM(wartosc_brutto), 0) as suma_brutto_pozycje,
                COALESCE(SUM(wartosc_netto), 0) as suma_netto_pozycje,
                COALESCE(SUM(kwota_vat), 0) as suma_vat_pozycje
            FROM pos_pozycje 
            WHERE transakcja_id = ?
        """, (transakcja_id,))
        
        if pozycje_sum:
            sums = pozycje_sum[0]
            # Zaktualizuj sumy w transakcji
            update_sums_query = """
            UPDATE pos_transakcje 
            SET suma_brutto = ?,
                suma_netto = ?,
                suma_vat = ?
            WHERE id = ?
            """
            execute_insert(update_sums_query, (
                sums['suma_brutto_pozycje'],
                sums['suma_netto_pozycje'], 
                sums['suma_vat_pozycje'],
                transakcja_id
            ))
            
            # Odśwież dane transakcji po przeliczeniu
            transakcja = execute_query("""
                SELECT * FROM pos_transakcje WHERE id = ?
            """, (transakcja_id,))[0]
            
        # Aktualizuj dane płatności
        metoda_platnosci = data.get('payment_method') or data.get('metoda_platnosci', 'gotowka')
        customer_id = data.get('customer_id')
        kwota_otrzymana = data.get('kwota_otrzymana')
        notatka = data.get('notatka', '')
        
        # Oblicz resztę i kwoty dla form płatności
        kwota_reszty = 0
        kwota_gotowka = 0
        kwota_karta = 0
        
        # Oblicz finalną kwotę po rabacie
        rabat_kwota = transakcja.get('rabat_kwota', 0) or 0
        final_amount = transakcja['suma_brutto'] - rabat_kwota
        
        if kwota_otrzymana:
            kwota_otrzymana_float = float(kwota_otrzymana)
            if metoda_platnosci == 'gotowka':
                kwota_gotowka = final_amount  # Rzeczywista kwota transakcji
                kwota_reszty = max(0, kwota_otrzymana_float - final_amount)
            elif metoda_platnosci in ['karta', 'card']:
                kwota_karta = final_amount  # Rzeczywista kwota transakcji
                kwota_reszty = 0  # Przy płatności kartą nie ma reszty
        else:
            # Jeśli nie podano kwoty otrzymanej, ustaw kwotę transakcji
            if metoda_platnosci == 'gotowka':
                kwota_gotowka = final_amount
            elif metoda_platnosci in ['karta', 'card']:
                kwota_karta = final_amount
        
        # Wygeneruj numer paragonu jeśli nie istnieje
        numer_paragonu = transakcja.get('numer_paragonu')
        if not numer_paragonu:
            # Użyj nowego systemu prefixów z location_id z transakcji
            transaction_location_id = transakcja.get('location_id', 5)  # Domyślnie Kalisz
            
            if prefix_manager:
                numer_paragonu, error = prefix_manager.generate_document_number(transaction_location_id, 'paragon')
                if error:
                    print(f"⚠️ Błąd generowania numeru paragonu: {error}")
                    numer_paragonu = None
            
            if not numer_paragonu:
                print("⚠️ Nie udało się wygenerować numeru paragonu, używam domyślnego")
                numer_paragonu = f"PA-{transakcja_id}-{datetime.now().strftime('%m-%Y')}-KAL"
        
        # Zaktualizuj transakcję
        update_query = """
        UPDATE pos_transakcje 
        SET status = 'zakonczony',
            forma_platnosci = ?,
            klient_id = ?,
            kwota_otrzymana = ?,
            kwota_reszty = ?,
            kwota_gotowka = ?,
            kwota_karta = ?,
            uwagi = ?,
            numer_paragonu = ?
        WHERE id = ?
        """
        
        result = execute_insert(update_query, (
            metoda_platnosci, customer_id, kwota_otrzymana, kwota_reszty, 
            kwota_gotowka, kwota_karta, notatka, numer_paragonu, transakcja_id
        ))
        
        if result is not None:
            # === SKUTEK MAGAZYNOWY - ODEJMOWANIE STANÓW ===
            # Pobierz aktualny magazyn z sesji użytkownika
            current_warehouse_id = session.get('current_warehouse_id')
            if not current_warehouse_id:
                # Fallback - pobierz pierwszy aktywny magazyn
                warehouse_fallback = execute_query("""
                    SELECT id FROM warehouses WHERE aktywny = 1 ORDER BY id LIMIT 1
                """, ())
                current_warehouse_id = warehouse_fallback[0]['id'] if warehouse_fallback else 1
            
            print(f"🏪 SKUTEK MAGAZYNOWY: Odejmowanie stanów z magazynu ID: {current_warehouse_id}")
            
            # Pobierz pozycje transakcji do odejmowania stanów
            pozycje_sql = """
            SELECT produkt_id, ilosc, nazwa_produktu 
            FROM pos_pozycje 
            WHERE transakcja_id = ?
            """
            pozycje = execute_query(pozycje_sql, (transakcja_id,))
            
            stock_updates = []
            for pozycja in pozycje:
                product_id = pozycja['produkt_id']
                sold_quantity = pozycja['ilosc']
                product_name = pozycja['nazwa_produktu']
                
                try:
                    # 1. Aktualizuj stan w tabeli pos_magazyn (główna tabela stanów POS)
                    pos_update_sql = """
                    INSERT OR IGNORE INTO pos_magazyn 
                    (produkt_id, stan_aktualny, stan_minimalny, stan_maksymalny, lokalizacja)
                    VALUES (?, 0, 0, 0, ?)
                    """
                    execute_insert(pos_update_sql, (product_id, str(current_warehouse_id)))
                    
                    pos_update_sql = """
                    UPDATE pos_magazyn 
                    SET stan_aktualny = COALESCE(stan_aktualny, 0) - ?,
                        ostatnia_aktualizacja = datetime('now')
                    WHERE produkt_id = ? AND lokalizacja = ?
                    """
                    pos_result = execute_insert(pos_update_sql, (sold_quantity, product_id, str(current_warehouse_id)))
                    
                    # 2. Zapisz ruch magazynowy w pos_ruchy_magazynowe
                    # Pobierz stan przed zmianą
                    current_stock_before = execute_query("""
                        SELECT stan_aktualny FROM pos_magazyn 
                        WHERE produkt_id = ? AND lokalizacja = ?
                    """, (product_id, str(current_warehouse_id)))
                    
                    stan_przed = current_stock_before[0]['stan_aktualny'] if current_stock_before else 0
                    stan_po = stan_przed  # Stan już został zaktualizowany
                    
                    movement_sql = """
                    INSERT INTO pos_ruchy_magazynowe 
                    (produkt_id, typ_ruchu, ilosc, stan_przed, stan_po, 
                     numer_dokumentu, data_ruchu, czas_ruchu, user_login, uwagi)
                    VALUES (?, 'wydanie', ?, ?, ?, ?, date('now'), time('now'), ?, ?)
                    """
                    
                    execute_insert(movement_sql, (
                        product_id,
                        sold_quantity,
                        stan_przed + sold_quantity,  # Stan przed odjęciem
                        stan_po,                     # Stan po odjęciu
                        f"TRANS-{transakcja_id}",
                        'system',
                        f"Sprzedaż POS - transakcja #{transakcja_id} - magazyn #{current_warehouse_id}"
                    ))
                    
                    stock_updates.append({
                        'product_id': product_id,
                        'product_name': product_name,
                        'quantity_sold': sold_quantity,
                        'warehouse_id': current_warehouse_id,
                        'old_stock': stan_przed + sold_quantity,
                        'new_stock': stan_po
                    })
                    
                    print(f"✅ Odjęto {sold_quantity} szt. produktu {product_name} (ID: {product_id}) z magazynu #{current_warehouse_id}")
                    
                except Exception as e:
                    print(f"❌ Błąd odejmowania stanu dla produktu {product_id}: {e}")
                    # Nie przerywamy procesu - transakcja i tak została zrealizowana
            
            print(f"📦 PODSUMOWANIE: Zaktualizowano stany dla {len(stock_updates)} produktów w magazynie #{current_warehouse_id}")
            # === KONIEC SKUTKU MAGAZYNOWEGO ===
            # Dodaj operację do kasa_operacje
            try:
                payment_type_mapping = {
                    'cash': 'gotowka',
                    'card': 'karta', 
                    'transfer': 'przelew',
                    'blik': 'blik',
                    'gotowka': 'gotowka',
                    'karta': 'karta',
                    'przelew': 'przelew'
                }
                typ_platnosci = payment_type_mapping.get(metoda_platnosci, 'gotowka')
                
                kasa_operacja_sql = """
                INSERT INTO kasa_operacje 
                (typ_operacji, typ_platnosci, kwota, opis, kategoria, 
                 numer_dokumentu, data_operacji, utworzyl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """
                
                opis = f"Sprzedaż - transakcja #{transakcja_id}"
                
                # Użyj kwoty otrzymanej jako kwotę końcową (po rabacie)
                final_amount = kwota_otrzymana
                
                print(f"DEBUG kasa_operacje (cart): metoda_platnosci={metoda_platnosci}, typ_platnosci={typ_platnosci}, final_amount={final_amount}")
                
                execute_insert(kasa_operacja_sql, (
                    'KP',  # Kasa Przyjmie
                    typ_platnosci,
                    final_amount,  # Używaj kwoty otrzymanej (po rabacie)
                    opis,
                    'sprzedaz',
                    f"TRANS-{transakcja_id}",
                    datetime.now().date().isoformat(),
                    'system'
                ))
            except Exception as e:
                # Loguj błąd ale nie przerywaj procesu
                print(f"Błąd dodawania operacji kasa/bank: {str(e)}")
                pass
            
            # Automatyczna fiskalizacja dla zakończonych transakcji sprzedażowych
            try:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"🧾 AUTOMATYCZNA FISKALIZACJA POS: Rozpoczynam dla zakończonej transakcji {transakcja_id}")
                
                from fiscal.service import get_fiscal_service
                fiscal_service = get_fiscal_service()
                
                logger.info(f"🧾 Serwis fiskalny: enabled={fiscal_service.is_enabled}, test_mode={fiscal_service.test_mode}")
                
                # Fiskalizacja w tle (nie blokuje procesu)
                fiscal_result = fiscal_service.fiscalize_transaction(transakcja_id)
                
                logger.info(f"🧾 Wynik fiskalizacji: {fiscal_result}")
                
                if fiscal_result.get('success'):
                    logger.info(f"✅ Transakcja POS {transakcja_id} została sfiskalizowana: {fiscal_result.get('fiscal_number')}")
                else:
                    logger.warning(f"❌ Błąd fiskalizacji transakcji POS {transakcja_id}: {fiscal_result.get('error')}")
                    
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"💥 Błąd automatycznej fiskalizacji POS: {e}")
                import traceback
                logger.error(f"💥 Traceback: {traceback.format_exc()}")
                # Nie przerywamy procesu - fiskalizacja może być wykonana później
            
            return success_response("Transakcja zakończona pomyślnie", {
                "transakcja_id": transakcja_id,
                "numer_transakcji": transakcja['numer_transakcji'],
                "numer_paragonu": numer_paragonu,
                "suma_brutto": transakcja['suma_brutto'],
                "rabat_kwota": transakcja['rabat_kwota'],
                "kwota_otrzymana": kwota_otrzymana,
                "kwota_reszty": kwota_reszty
            })
        else:
            return error_response("Nie udało się zakończyć transakcji", 500)
            
    except Exception as e:
        print(f"Błąd complete_transaction: {e}")
        return error_response(f"Błąd serwera: {e}", 500)


@pos_bp.route('/pos/cart/<int:transakcja_id>/status', methods=['PUT'])
def update_cart_status(transakcja_id):
    """
    Zmień status koszyka/transakcji
    Dozwolone statusy: 'draft', 'w_trakcie'
    """
    try:
        data = request.get_json()
        
        if not data or 'status' not in data:
            return error_response("Brak statusu w żądaniu", 400)
            
        status = data['status']
        
        if status not in ['draft', 'w_trakcie']:
            return error_response("Niedozwolony status. Dozwolone: draft, w_trakcie", 400)
        
        # Sprawdź czy transakcja istnieje i nie jest zakończona
        check_query = "SELECT status FROM pos_transakcje WHERE id = ?"
        existing = execute_query(check_query, (transakcja_id,))
        
        if not existing:
            return not_found_response("Nie znaleziono transakcji")
            
        current_status = existing[0]['status']
        
        if current_status == 'zakonczony':
            return error_response("Nie można zmienić statusu zakończonej transakcji", 400)
        
        # Zaktualizuj status
        update_query = """
        UPDATE pos_transakcje 
        SET status = ?, 
            data_modyfikacji = CURRENT_TIMESTAMP 
        WHERE id = ?
        """
        
        success = execute_insert(update_query, (status, transakcja_id))
        
        if success:
            return success_response({
                "transakcja_id": transakcja_id,
                "status": status
            }, f"Status transakcji zmieniony na: {status}")
        else:
            return error_response("Nie udało się zmienić statusu", 500)
            
    except Exception as e:
        print(f"Błąd update_cart_status: {e}")
        return error_response(f"Błąd serwera: {e}", 500)


@pos_bp.route('/pos/carts', methods=['GET'])
def get_carts():
    """
    Pobierz listę niezakończonych koszyków/transakcji (draft, w_trakcie)
    Parametry: limit (default=20), kasjer_id
    """
    try:
        limit = int(request.args.get('limit', 20))
        kasjer_id = request.args.get('kasjer_id')
        
        sql_query = """
        SELECT 
            t.id,
            t.numer_paragonu,
            t.klient_id,
            COALESCE(k.imie || ' ' || k.nazwisko, k.nazwa_firmy, 'Klient anonimowy') as customer_name,
            t.suma_brutto as total_amount,
            t.status,
            t.data_transakcji as created_at,
            t.data_transakcji,
            t.czas_transakcji,
            t.kasjer_login as kasjer_id,
            t.fiskalizacja,
            COUNT(p.id) as items_count
        FROM pos_transakcje t
        LEFT JOIN pos_klienci k ON t.klient_id = k.id
        LEFT JOIN pos_pozycje p ON t.id = p.transakcja_id
        WHERE t.status IN ('draft', 'w_trakcie')
        """
        
        params = []
        
        if kasjer_id:
            sql_query += " AND t.kasjer_login = ?"
            params.append(kasjer_id)
            
        sql_query += " GROUP BY t.id ORDER BY t.data_transakcji DESC, t.czas_transakcji DESC LIMIT ?"
        params.append(limit)
        
        results = execute_query(sql_query, params)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'carts': results,
            'total': len(results),
            'limit': limit
        }, f"Pobrano {len(results)} koszyków")
        
    except ValueError:
        return error_response("Parametr 'limit' musi być liczbą", 400)
    except Exception as e:
        print(f"Błąd pobierania koszyków: {e}")
        return error_response("Wystąpił błąd podczas pobierania koszyków", 500)


@pos_bp.route('/pos/cart/<int:transakcja_id>', methods=['DELETE'])
def delete_cart(transakcja_id):
    """
    Usuń koszyk/transakcję (tylko niezakończone: draft, w_trakcie)
    """
    try:
        # Sprawdź czy transakcja istnieje i czy można ją usunąć
        check_query = "SELECT status FROM pos_transakcje WHERE id = ?"
        existing = execute_query(check_query, (transakcja_id,))
        
        if not existing:
            return not_found_response("Nie znaleziono transakcji")
            
        status = existing[0]['status']
        
        if status == 'zakonczony':
            return error_response("Nie można usunąć zakończonej transakcji", 400)
        
        # Usuń pozycje transakcji
        delete_positions_query = "DELETE FROM pos_pozycje WHERE transakcja_id = ?"
        execute_insert(delete_positions_query, (transakcja_id,))
        
        # Usuń transakcję
        delete_transaction_query = "DELETE FROM pos_transakcje WHERE id = ?"
        success = execute_insert(delete_transaction_query, (transakcja_id,))
        
        if success:
            return success_response({
                "transakcja_id": transakcja_id
            }, "Koszyk został usunięty")
        else:
            return error_response("Nie udało się usunąć koszyka", 500)
            
    except Exception as e:
        print(f"Błąd delete_cart: {e}")
        return error_response(f"Błąd serwera: {e}", 500)


# Alias dla finalize endpoint - frontend używa '/finalize' zamiast '/complete'
@pos_bp.route('/pos/cart/<int:transakcja_id>/finalize', methods=['POST'])
def finalize_cart_transaction(transakcja_id):
    """
    Alias dla complete_cart_transaction - finalizuj koszyk/transakcję
    """
    return complete_cart_transaction(transakcja_id)
