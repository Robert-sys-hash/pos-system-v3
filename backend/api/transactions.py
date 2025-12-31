"""
API endpoints for POS transactions
Obsługa transakcji sprzedażowych w systemie POS
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response

# Konfiguracja logowania  
logger = logging.getLogger(__name__)

transactions_bp = Blueprint('transactions', __name__)

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime
import uuid

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/transactions', methods=['POST'])
def create_transaction():
    """
    Tworzenie nowej transakcji (koszyka)
    POST /api/transactions
    Body: {
        "customer_id": 123,
        "cashier": "admin",
        "type": "draft|sale",
        "items": [
            {"product_id": 1, "quantity": 2, "price": 10.50},
            {"product_id": 2, "quantity": 1, "price": 25.00}
        ]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        # DEBUG: Wypisz otrzymane dane
        print(f"📥 TRANSAKCJA - Otrzymane dane:")
        print(f"   payment_method: {data.get('payment_method')}")
        print(f"   split_payments: {data.get('split_payments')}")
        print(f"   coupon_code: {data.get('coupon_code')}")
        
        customer_id = data.get('customer_id')
        cashier = data.get('cashier', 'system')
        transaction_type = data.get('type', 'draft')
        items = data.get('items', [])
        payment_method = data.get('payment_method', 'gotowka')
        split_payments = data.get('split_payments', [])  # Lista płatności dzielonych
        discount_amount = data.get('discount_amount', 0)
        total_gross = data.get('total_gross', 0)  # Kwota brutto przed rabatem
        final_amount = data.get('total_amount', 0)  # Kwota końcowa po rabacie
        location_id = data.get('location_id', 5)  # Domyślnie Kalisz
        
        # Przetwarzanie kuponów w płatnościach dzielonych
        coupon_data = data.get('coupon_code')  # Dla pojedynczej płatności kuponem
        
        # Mapowanie typów transakcji dla kompatybilności
        type_mapping = {
            'sale': 'sprzedaz',
            'draft': 'draft',
            'correction': 'korekta'
        }
        db_transaction_type = type_mapping.get(transaction_type, transaction_type)
        
        if not items:
            return error_response("Transakcja musi zawierać co najmniej jeden produkt", 400)
        
        # WALIDACJA ZMIANY KASOWEJ - sprawdź czy kasjer ma otwartą zmianę
        if transaction_type in ['sale', 'sprzedaz']:  # Dla sprzedaży
            shift_sql = """
            SELECT id FROM pos_zmiany 
            WHERE kasjer_login = ? AND status = 'otwarta'
            ORDER BY id DESC LIMIT 1
            """
            shift_result = execute_query(shift_sql, (cashier,))
            
            if not shift_result:
                return error_response("Brak otwartej zmiany kasowej! Najpierw otwórz zmianę.", 403)
        
        # Wygeneruj numer paragonu używając nowego systemu prefixów
        try:
            from api.document_prefixes import DocumentPrefixManager
            prefix_manager = DocumentPrefixManager()
            receipt_number, error = prefix_manager.generate_document_number(location_id, 'paragon')
            if error:
                print(f"⚠️ Błąd generowania numeru paragonu: {error}")
                receipt_number = f"PAR{datetime.now().strftime('%Y%m%d%H%M%S')}"
        except Exception as e:
            print(f"⚠️ Nie można użyć prefix_manager: {e}")
            receipt_number = f"PAR{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Oblicz sumy - użyj danych z frontendu jeśli dostępne
        if final_amount > 0 and total_gross > 0:
            # Frontend przesłał przeliczone kwoty
            total_amount = final_amount  # Kwota końcowa po rabacie
            gross_amount = total_gross   # Kwota brutto przed rabatem
            total_tax = 0
            
            # Oblicz podatek z pozycji
            for item in items:
                vat_sql = "SELECT stawka_vat FROM produkty WHERE id = ?"
                vat_result = execute_query(vat_sql, (item['product_id'],))
                if vat_result:
                    vat_rate = vat_result[0]['stawka_vat'] or 23
                    # Oblicz VAT z kwoty pozycji
                    item_amount = item['quantity'] * item['price']
                    item_tax = round(item_amount * (vat_rate / (100 + vat_rate)), 2)
                    total_tax += item_tax
        else:
            # Oblicz kwoty standardowo
            total_amount = 0
            total_tax = 0
            
            for item in items:
                item_total = item['quantity'] * item['price']
                total_amount += item_total
                
                # Pobierz stawkę VAT produktu
                vat_sql = "SELECT stawka_vat FROM produkty WHERE id = ?"
                vat_result = execute_query(vat_sql, (item['product_id'],))
                if vat_result:
                    vat_rate = vat_result[0]['stawka_vat'] or 23
                    # VAT z kwoty brutto
                    item_tax = round(item_total * (vat_rate / (100 + vat_rate)), 2)
                    total_tax += item_tax
        
        # Utwórz transakcję
        transaction_sql = """
        INSERT INTO pos_transakcje (
            numer_transakcji, data_transakcji, czas_transakcji, kasjer_login, 
            klient_id, typ_transakcji, status, suma_brutto, suma_netto, suma_vat, 
            numer_paragonu, forma_platnosci, rabat_kwota, rabat_procent, location_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        # Zaokrąglij wartości do 2 miejsc po przecinku
        total_tax = round(total_tax, 2)
        net_amount = round(total_amount - total_tax, 2)
        current_time = datetime.now().isoformat()
        current_date = datetime.now().strftime('%Y-%m-%d')
        current_time_only = datetime.now().strftime('%H:%M:%S')
        transaction_number = f"T{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Ustaw status na podstawie typu transakcji
        status = 'draft' if transaction_type == 'draft' else 'zakonczony'
        
        # Oblicz procent rabatu jeśli mamy kwoty
        rabat_procent = 0
        if total_gross > 0 and discount_amount > 0:
            rabat_procent = (discount_amount / total_gross) * 100
        
        transaction_id = execute_insert(transaction_sql, (
            transaction_number, current_date, current_time_only, cashier, 
            customer_id, db_transaction_type, status, total_amount, net_amount, total_tax,
            receipt_number, payment_method, discount_amount, rabat_procent, location_id, current_time
        ))
        
        if not transaction_id:
            return error_response("Błąd tworzenia transakcji", 500)

        # Automatyczna fiskalizacja dla transakcji sprzedażowych
        if db_transaction_type == 'sprzedaz' and status == 'zakonczony':
            try:
                logger.info(f"🧾 AUTOMATYCZNA FISKALIZACJA: Rozpoczynam dla transakcji {transaction_id}")
                logger.info(f"🧾 Typ transakcji: {db_transaction_type}, Status: {status}")
                
                from fiscal.service import get_fiscal_service
                fiscal_service = get_fiscal_service()
                
                logger.info(f"🧾 Serwis fiskalny: enabled={fiscal_service.is_enabled}, test_mode={fiscal_service.test_mode}")
                
                # Fiskalizacja w tle (nie blokuje procesu)
                fiscal_result = fiscal_service.fiscalize_transaction(transaction_id)
                
                logger.info(f"🧾 Wynik fiskalizacji: {fiscal_result}")
                
                if fiscal_result.get('success'):
                    logger.info(f"✅ Transakcja {transaction_id} została sfiskalizowana: {fiscal_result.get('fiscal_number')}")
                else:
                    logger.warning(f"❌ Błąd fiskalizacji transakcji {transaction_id}: {fiscal_result.get('error')}")
                    
            except Exception as e:
                logger.error(f"💥 Błąd automatycznej fiskalizacji: {e}")
                import traceback
                logger.error(f"💥 Traceback: {traceback.format_exc()}")
                # Nie przerywamy procesu - fiskalizacja może być wykonana później
        
        # Dodaj produkty do transakcji
        for index, item in enumerate(items, 1):
            # Pobierz informacje o produkcie
            product_sql = "SELECT nazwa, jednostka FROM produkty WHERE id = ?"
            product_result = execute_query(product_sql, (item['product_id'],))
            
            if not product_result:
                return error_response(f"Produkt o ID {item['product_id']} nie istnieje", 400)
            
            product = product_result[0]
            
            # Pobierz stawkę VAT
            vat_sql = "SELECT stawka_vat FROM produkty WHERE id = ?"
            vat_result = execute_query(vat_sql, (item['product_id'],))
            vat_rate = vat_result[0]['stawka_vat'] if vat_result else 23
            
            item_total = item['quantity'] * item['price']
            vat_amount = round(item_total * (vat_rate / (100 + vat_rate)), 2)  # VAT z kwoty brutto
            net_amount = round(item_total - vat_amount, 2)
            
            position_sql = """
            INSERT INTO pos_pozycje (
                transakcja_id, produkt_id, nazwa_produktu, kod_produktu,
                cena_jednostkowa, ilosc, jednostka, rabat_procent, rabat_kwota,
                cena_po_rabacie, wartosc_netto, stawka_vat, kwota_vat, wartosc_brutto,
                lp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            execute_insert(position_sql, (
                transaction_id, item['product_id'], product['nazwa'], '',
                item['price'], item['quantity'], product['jednostka'], 0, 0,
                item['price'], net_amount, vat_rate, vat_amount, item_total,
                index  # numer pozycji
            ))
        
        # Jeśli typ to 'sale'/'sprzedaz', automatycznie zaktualizuj stany magazynowe
        if transaction_type in ['sale', 'sprzedaz'] and status == 'zakonczony':
            for item in items:
                # Sprawdź czy produkt ma stan w magazynie dla danej lokalizacji
                check_stock_sql = """
                SELECT id, stan_aktualny FROM pos_magazyn 
                WHERE produkt_id = ? AND lokalizacja = ?
                """
                stock_result = execute_query(check_stock_sql, (item['product_id'], str(location_id)))
                
                if stock_result:
                    # Aktualizuj istniejący stan dla tej lokalizacji
                    current_stock = stock_result[0]['stan_aktualny'] or 0
                    new_stock = current_stock - item['quantity']  # Pozwól na ujemny stan
                    
                    update_stock_sql = """
                    UPDATE pos_magazyn 
                    SET stan_aktualny = ?, ostatnia_aktualizacja = datetime('now')
                    WHERE id = ?
                    """
                    execute_insert(update_stock_sql, (new_stock, stock_result[0]['id']))
                else:
                    # Utwórz nowy wpis stanu dla tej lokalizacji
                    initial_stock = -item['quantity']  # Pokazuje że został sprzedany towar, którego nie było
                    
                    insert_stock_sql = """
                    INSERT INTO pos_magazyn 
                    (produkt_id, stan_aktualny, stan_minimalny, stan_maksymalny, lokalizacja)
                    VALUES (?, ?, 0, 0, ?)
                    """
                    execute_insert(insert_stock_sql, (item['product_id'], initial_stock, str(location_id)))
                
                # Zapisz ruch magazynowy
                try:
                    # Pobierz aktualny stan przed operacją dla ruchu magazynowego
                    current_stock_sql = """
                    SELECT stan_aktualny FROM pos_magazyn 
                    WHERE produkt_id = ? AND lokalizacja = ?
                    """
                    current_stock_result = execute_query(current_stock_sql, (item['product_id'], str(location_id)))
                    stan_przed = current_stock_result[0]['stan_aktualny'] if current_stock_result else 0
                    stan_po = stan_przed - item['quantity']
                    
                    movement_sql = """
                    INSERT INTO pos_ruchy_magazynowe 
                    (product_id, typ_ruchu, ilosc, stan_przed, stan_po, 
                     numer_dokumentu, data_ruchu, czas_ruchu, user_login, uwagi)
                    VALUES (?, 'wydanie', ?, ?, ?, ?, date('now'), time('now'), ?, ?)
                    """
                    execute_insert(movement_sql, (
                        item['product_id'], 
                        item['quantity'],
                        stan_przed,
                        stan_po,
                        f"TRANS-{transaction_id}",
                        cashier,
                        f"Sprzedaż - transakcja #{transaction_id}"
                    ))
                except Exception as e:
                    print(f"Błąd zapisu ruchu magazynowego: {str(e)}")
                    # Kontynuuj nawet jeśli nie można zapisać ruchu
            
            # Dodaj operację do kasa_operacje dla transakcji typu 'sale'/'sprzedaz'
            try:
                # Mapowanie metod płatności
                payment_type_mapping = {
                    'cash': 'gotowka',
                    'card': 'karta', 
                    'transfer': 'przelew',
                    'blik': 'blik',
                    'gotowka': 'gotowka',
                    'karta': 'karta',
                    'przelew': 'przelew',
                    'kupon': 'kupon'
                }
                
                kasa_operacja_sql = """
                INSERT INTO kasa_operacje 
                (typ_operacji, typ_platnosci, kwota, opis, kategoria, 
                 numer_dokumentu, data_operacji, utworzyl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """
                
                # Obsługa płatności dzielonych
                if split_payments and len(split_payments) > 0:
                    print(f"DEBUG: Przetwarzanie płatności dzielonych: {split_payments}")
                    
                    for payment in split_payments:
                        if payment.get('amount', 0) > 0:
                            typ_platnosci = payment_type_mapping.get(payment['method'], 'gotowka')
                            opis = f"Sprzedaż (płatność dzielona {payment['method']}) - transakcja #{transaction_id}"
                            
                            # Obsługa kuponów w płatnościach dzielonych
                            if payment['method'] == 'kupon' and payment.get('coupon_code'):
                                try:
                                    from api.coupons import use_coupon_internal
                                    coupon_result = use_coupon_internal(payment['coupon_code'], payment['amount'], transaction_id)
                                    if not coupon_result.get('success'):
                                        print(f"⚠️ Błąd użycia kuponu {payment['coupon_code']}: {coupon_result.get('error')}")
                                        # Kontynuuj z zapisem operacji mimo błędu kuponu
                                    else:
                                        print(f"✅ Kupon {payment['coupon_code']} użyty na kwotę {payment['amount']}")
                                        opis += f" (kupon: {payment['coupon_code']})"
                                except Exception as e:
                                    print(f"❌ Błąd podczas użycia kuponu: {e}")
                            
                            print(f"DEBUG kasa_operacje (dzielona): method={payment['method']}, typ_platnosci={typ_platnosci}, amount={payment['amount']}")
                            
                            execute_insert(kasa_operacja_sql, (
                                'KP',  # Kasa Przyjmie
                                typ_platnosci,
                                payment['amount'],
                                opis,
                                'sprzedaz',
                                f"TRANS-{transaction_id}-{payment['method'].upper()}",
                                current_date,
                                'system'
                            ))
                else:
                    # Pojedyncza płatność - standardowa obsługa
                    typ_platnosci = payment_type_mapping.get(payment_method, 'gotowka')
                    opis = f"Sprzedaż - transakcja #{transaction_id}"
                    
                    # Obsługa kuponu dla pojedynczej płatności
                    if payment_method == 'kupon' and coupon_data:
                        try:
                            from api.coupons import use_coupon_internal
                            coupon_result = use_coupon_internal(coupon_data, total_amount, transaction_id)
                            if coupon_result.get('success'):
                                print(f"✅ Kupon {coupon_data} użyty na kwotę {total_amount}")
                                opis += f" (kupon: {coupon_data})"
                            else:
                                print(f"⚠️ Błąd użycia kuponu {coupon_data}: {coupon_result.get('error')}")
                        except Exception as e:
                            print(f"❌ Błąd podczas użycia kuponu: {e}")
                    
                    print(f"DEBUG kasa_operacje (pojedyncza): payment_method={payment_method}, typ_platnosci={typ_platnosci}, final_amount={total_amount}")
                    
                    execute_insert(kasa_operacja_sql, (
                        'KP',  # Kasa Przyjmie
                        typ_platnosci,
                        total_amount,  # Użyj kwoty końcowej (po rabacie)
                        opis,
                        'sprzedaz',
                        f"TRANS-{transaction_id}",
                        current_date,
                        'system'
                    ))
            except Exception as e:
                # Loguj błąd ale nie przerywaj procesu
                print(f"Błąd dodawania operacji kasa/bank: {str(e)}")
                import traceback
                print(f"Traceback: {traceback.format_exc()}")
                pass
        
        return success_response({
            'transaction_id': transaction_id,
            'receipt_number': receipt_number,
            'total_amount': round(total_amount, 2),
            'total_tax': round(total_tax, 2),
            'net_amount': round(net_amount, 2),
            'status': status,
            'items_count': len(items)
        }, "Transakcja utworzona pomyślnie")
        
    except Exception as e:
        print(f"DEBUG EXCEPTION in create_transaction: {str(e)}")
        return error_response(f"Błąd tworzenia transakcji: {str(e)}", 500)

@transactions_bp.route('/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """
    Pobierz szczegóły transakcji
    GET /api/transactions/123
    """
    try:
        # Pobierz dane transakcji
        transaction_sql = """
        SELECT 
            t.*
        FROM pos_transakcje t
        WHERE t.id = ?
        """
        
        transaction_result = execute_query(transaction_sql, (transaction_id,))
        if not transaction_result:
            return not_found_response(f"Transakcja o ID {transaction_id} nie została znaleziona")
        
        transaction = transaction_result[0]
        
        # Pobierz produkty w transakcji
        products_sql = """
        SELECT 
            tp.*,
            p.nazwa as product_name,
            p.kod_produktu as barcode,
            p.jednostka as unit
        FROM pos_pozycje tp
        LEFT JOIN produkty p ON tp.product_id = p.id
        WHERE tp.transakcja_id = ?
        ORDER BY tp.id
        """
        
        products = execute_query(products_sql, (transaction_id,)) or []
        
        # Dodaj produkty do transakcji
        transaction['items'] = products
        transaction['items_count'] = len(products)
        
        return success_response(transaction, "Szczegóły transakcji")
        
    except Exception as e:
        return error_response(f"Błąd pobierania transakcji: {str(e)}", 500)

@transactions_bp.route('/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """
    Aktualizacja transakcji (np. dodanie/usunięcie produktów)
    PUT /api/transactions/123
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        # Sprawdź czy transakcja istnieje i ma status draft
        check_sql = "SELECT status FROM pos_transakcje WHERE id = ?"
        check_result = execute_query(check_sql, (transaction_id,))
        
        if not check_result:
            return not_found_response("Transakcja nie została znaleziona")
        
        if check_result[0]['status'] != 'draft':
            return error_response("Można edytować tylko transakcje w statusie 'draft'", 400)
        
        # Aktualizuj elementy jeśli podane
        if 'items' in data:
            # Usuń stare produkty
            delete_sql = "DELETE FROM pos_transakcje_pozycje WHERE transakcja_id = ?"
            execute_insert(delete_sql, (transaction_id,))
            
            # Dodaj nowe produkty (podobnie jak w create_transaction)
            items = data['items']
            total_amount = 0
            total_tax = 0
            
            for item in items:
                product_sql = """
                INSERT INTO pos_transakcje_pozycje (
                    transakcja_id, product_id, ilosc, cena_jednostkowa,
                    cena_calkowita, stawka_vat, utworzono
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """
                
                item_total = item['quantity'] * item['price']
                total_amount += item_total
                
                # Pobierz stawkę VAT
                vat_sql = "SELECT stawka_vat FROM produkty WHERE id = ?"
                vat_result = execute_query(vat_sql, (item['product_id'],))
                vat_rate = vat_result[0]['stawka_vat'] if vat_result else 23
                
                item_tax = round(item_total * (vat_rate / 100), 2)
                total_tax += item_tax
                
                execute_insert(product_sql, (
                    transaction_id, item['product_id'], item['quantity'],
                    item['price'], item_total, vat_rate, datetime.now().isoformat()
                ))
            
            # Aktualizuj sumy w transakcji - zaokrąglij wartości
            total_tax = round(total_tax, 2)
            net_amount = round(total_amount - total_tax, 2)
            update_sql = """
            UPDATE pos_transakcje 
            SET kwota_brutto = ?, kwota_netto = ?, kwota_vat = ?, zmodyfikowano = ?
            WHERE id = ?
            """
            execute_insert(update_sql, (
                total_amount, net_amount, total_tax, 
                datetime.now().isoformat(), transaction_id
            ))
        
        return success_response({
            'transaction_id': transaction_id,
            'updated': True
        }, "Transakcja zaktualizowana")
        
    except Exception as e:
        return error_response(f"Błąd aktualizacji transakcji: {str(e)}", 500)

@transactions_bp.route('/transactions/<int:transaction_id>/complete', methods=['POST'])
def complete_transaction(transaction_id):
    """
    Finalizacja transakcji (zmiana z draft na completed)
    POST /api/transactions/123/complete
    Body: {
        "payment_method": "cash|card|transfer",
        "amount_paid": 100.00,
        "amount_change": 5.50
    }
    """
    try:
        data = request.get_json() or {}
        
        payment_method = data.get('payment_method', 'cash')
        amount_paid = data.get('amount_paid', 0)
        amount_change = data.get('amount_change', 0)
        
        # Sprawdź czy transakcja istnieje
        check_sql = "SELECT suma_brutto, status, rabat_kwota FROM pos_transakcje WHERE id = ?"
        check_result = execute_query(check_sql, (transaction_id,))
        
        if not check_result:
            return not_found_response("Transakcja nie została znaleziona")
        
        transaction = check_result[0]
        
        if transaction['status'] == 'zakonczony':
            return error_response("Transakcja już została zakończona", 400)
        
        # Aktualizuj status i dane płatności
        complete_sql = """
        UPDATE pos_transakcje 
        SET status = 'zakonczony',
            forma_platnosci = ?,
            kwota_otrzymana = ?,
            kwota_reszty = ?
        WHERE id = ?
        """
        
        success = execute_insert(complete_sql, (
            payment_method, amount_paid, amount_change, transaction_id
        ))
        
        if success:
            # Zmniejsz stany magazynowe
            update_stock_sql = """
            UPDATE produkty 
            SET stan_magazynowy = stan_magazynowy - (
                SELECT ilosc FROM pos_transakcje_pozycje 
                WHERE transakcja_id = ? AND product_id = produkty.id
            )
            WHERE id IN (
                SELECT product_id FROM pos_transakcje_pozycje WHERE transakcja_id = ?
            )
            """
            execute_insert(update_stock_sql, (transaction_id, transaction_id))
            
            # Dodaj operację do kasa_operacje
            transaction_base_total = transaction['suma_brutto']
            discount_amount = transaction.get('rabat_kwota', 0) or 0
            transaction_total = transaction_base_total - discount_amount
            payment_type_mapping = {
                'cash': 'gotowka',
                'card': 'karta',
                'transfer': 'przelew',
                'blik': 'blik'
            }
            typ_platnosci = payment_type_mapping.get(payment_method, 'gotowka')
            
            # Dodaj wpływy do kasy/banku (KP - Kasa Przyjmie)
            kasa_operacja_sql = """
            INSERT INTO kasa_operacje 
            (typ_operacji, typ_platnosci, kwota, opis, kategoria, 
             numer_dokumentu, data_operacji, utworzyl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            opis = f"Sprzedaż - transakcja #{transaction_id}"
            execute_insert(kasa_operacja_sql, (
                'KP',  # Kasa Przyjmie
                typ_platnosci,
                transaction_total,
                opis,
                'sprzedaz',
                f"TRANS-{transaction_id}",
                datetime.now().date().isoformat(),
                'system'
            ))
            
            # Automatyczna fiskalizacja dla zakończonych transakcji sprzedażowych
            try:
                logger.info(f"🧾 AUTOMATYCZNA FISKALIZACJA: Rozpoczynam dla zakończonej transakcji {transaction_id}")
                
                from fiscal.service import get_fiscal_service
                fiscal_service = get_fiscal_service()
                
                logger.info(f"🧾 Serwis fiskalny: enabled={fiscal_service.is_enabled}, test_mode={fiscal_service.test_mode}")
                
                # Fiskalizacja w tle (nie blokuje procesu)
                fiscal_result = fiscal_service.fiscalize_transaction(transaction_id)
                
                logger.info(f"🧾 Wynik fiskalizacji: {fiscal_result}")
                
                if fiscal_result.get('success'):
                    logger.info(f"✅ Transakcja {transaction_id} została sfiskalizowana: {fiscal_result.get('fiscal_number')}")
                else:
                    logger.warning(f"❌ Błąd fiskalizacji transakcji {transaction_id}: {fiscal_result.get('error')}")
                    
            except Exception as e:
                logger.error(f"💥 Błąd automatycznej fiskalizacji: {e}")
                import traceback
                logger.error(f"💥 Traceback: {traceback.format_exc()}")
                # Nie przerywamy procesu - fiskalizacja może być wykonana później
            
            return success_response({
                'transaction_id': transaction_id,
                'status': 'completed',
                'payment_method': payment_method,
                'amount_paid': amount_paid,
                'amount_change': amount_change
            }, "Transakcja zakończona pomyślnie")
        else:
            return error_response("Błąd finalizacji transakcji", 500)
        
    except Exception as e:
        return error_response(f"Błąd finalizacji transakcji: {str(e)}", 500)

@transactions_bp.route('/transactions/drafts', methods=['GET'])
def get_drafts():
    """
    Pobierz niezakończone transakcje (koszyki)
    GET /api/transactions/drafts?cashier=admin
    """
    try:
        cashier = request.args.get('cashier')
        limit = int(request.args.get('limit', 20))
        
        sql = """
        SELECT 
            t.id, t.numer_paragonu, t.kasjer_login as kasjer, t.suma_brutto as kwota_brutto,
            t.data_transakcji, t.created_at as utworzono,
            COUNT(tp.id) as items_count
        FROM pos_transakcje t
        LEFT JOIN pos_pozycje tp ON t.id = tp.transakcja_id
        WHERE t.status = 'draft'
        """
        
        params = []
        if cashier:
            sql += " AND t.kasjer_login = ?"
            params.append(cashier)
        
        sql += " GROUP BY t.id ORDER BY t.created_at DESC LIMIT ?"
        params.append(limit)
        
        drafts = execute_query(sql, params) or []
        
        return success_response(drafts, f"Znaleziono {len(drafts)} roboczych transakcji")
        
    except Exception as e:
        return error_response(f"Błąd pobierania roboczych transakcji: {str(e)}", 500)

@transactions_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """
    Pobierz listę transakcji/paragonów z filtrowaniem
    GET /api/transactions?limit=20&status=completed&date_from=2024-01-01&cashier=admin
    """
    try:
        # Parametry filtrowania
        limit = int(request.args.get('limit', 20))
        status = request.args.get('status', 'completed')  # completed, draft, all
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        cashier = request.args.get('cashier')
        location_id = request.args.get('location_id')  # Dodaj location_id
        
        # Mapowanie statusów z API na bazę danych
        status_mapping = {
            'completed': 'zakonczony',
            'corrections': 'korekta',  # Dodano obsługę korekt
            'draft': 'draft',
            'all': None
        }
        
        # Jeśli to korekty, filtrujemy po typ_transakcji zamiast statusu
        if status == 'corrections':
            db_status = None  # Nie filtrujemy po statusie
            filter_by_type = 'korekta'  # Filtrujemy po typie
        else:
            db_status = status_mapping.get(status, 'zakonczony')
            filter_by_type = None
        
        # Buduj zapytanie SQL
        sql = """
        SELECT 
            t.id,
            t.numer_paragonu as receipt_number,
            t.numer_transakcji,
            t.data_transakcji as transaction_date,
            t.czas_transakcji as transaction_time,
            t.kasjer_login as cashier,
            t.suma_brutto as total_amount,
            t.suma_netto as net_amount,
            t.suma_vat as tax_amount,
            t.forma_platnosci as payment_method,
            t.status,
            t.typ_transakcji as transaction_type,
            t.rabat_kwota,
            t.rabat_procent,
            t.created_at,
            t.fiskalizacja,
            COUNT(tp.id) as items_count
        FROM pos_transakcje t
        LEFT JOIN pos_pozycje tp ON t.id = tp.transakcja_id
        WHERE 1=1
        """
        
        params = []
        
        # Filtruj według statusu lub typu transakcji
        if filter_by_type:
            sql += " AND t.typ_transakcji = ?"
            params.append(filter_by_type)
        elif status != 'all' and db_status:
            sql += " AND t.status = ?"
            params.append(db_status)
        
        # Filtruj według daty
        if date_from:
            sql += " AND DATE(t.data_transakcji) >= ?"
            params.append(date_from)
        
        if date_to:
            sql += " AND DATE(t.data_transakcji) <= ?"
            params.append(date_to)
        
        # Filtruj według kasjera
        if cashier:
            sql += " AND t.kasjer_login = ?"
            params.append(cashier)
        
        # Filtruj według lokalizacji
        if location_id:
            sql += " AND t.location_id = ?"
            params.append(location_id)
        
        sql += """
        GROUP BY t.id 
        ORDER BY t.data_transakcji DESC, t.czas_transakcji DESC
        LIMIT ?
        """
        params.append(limit)
        
        transactions = execute_query(sql, params) or []
        
        # Dodaj status fiskalizacji jako literę
        for transaction in transactions:
            fiskalizacja = transaction.get('fiskalizacja', 0)
            if fiskalizacja == 1:
                transaction['fiscal_status'] = 'F'  # Fiskalizacja OK
            elif fiskalizacja == -1:
                transaction['fiscal_status'] = 'F!'  # Błąd fiskalizacji
            else:
                transaction['fiscal_status'] = ''  # Nie fiskalizowane
        
        return success_response({
            'transactions': transactions,
            'count': len(transactions),
            'filters': {
                'status': status,
                'date_from': date_from,
                'date_to': date_to,
                'cashier': cashier,
                'location_id': location_id,
                'limit': limit
            }
        }, "Lista transakcji pobrana pomyślnie")
        
    except Exception as e:
        return error_response(f"Błąd pobierania transakcji: {str(e)}", 500)


@transactions_bp.route('/transactions/<int:transaction_id>/correction', methods=['POST'])
def create_transaction_correction(transaction_id):
    """
    Tworzenie korekty transakcji (zwrot towaru)
    POST /api/transactions/{id}/correction
    Body: {
        "cashier": "admin",
        "correction_type": "quantity|amount",
        "items": [
            {
                "position_id": 123,
                "product_id": 456,
                "correction_quantity": 2,  # dla quantity - ilość do zwrotu
                "correction_amount": 25.50  # dla amount - kwota do zwrotu
            }
        ],
        "reason": "Uszkodzony towar"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        cashier = data.get('cashier', 'system')
        correction_type = data.get('correction_type', 'quantity')  # quantity lub amount
        items = data.get('items', [])
        reason = data.get('reason', 'Korekta transakcji')
        
        if not items:
            return error_response("Korekta musi zawierać co najmniej jedną pozycję", 400)
        
        if correction_type not in ['quantity', 'amount']:
            return error_response("Typ korekty musi być 'quantity' lub 'amount'", 400)
        
        # WALIDACJA ZMIANY KASOWEJ - sprawdź czy kasjer ma otwartą zmianę
        shift_sql = """
        SELECT id FROM pos_zmiany 
        WHERE kasjer_login = ? AND status = 'otwarta'
        ORDER BY id DESC LIMIT 1
        """
        shift_result = execute_query(shift_sql, (cashier,))
        if not shift_result:
            return error_response("Kasjer nie ma otwartej zmiany. Otwórz zmianę przed wykonaniem korekty.", 400)
        
        shift_id = shift_result[0]['id']
        
        # Sprawdź czy oryginalna transakcja istnieje
        original_transaction_sql = """
        SELECT * FROM pos_transakcje 
        WHERE id = ? AND status = 'zakonczony'
        """
        original_transaction = execute_query(original_transaction_sql, (transaction_id,))
        if not original_transaction:
            return error_response("Nie znaleziono oryginalnej transakcji lub transakcja nie jest zakończona", 404)
        
        original_transaction = original_transaction[0]
        
        # Pobierz pozycje oryginalnej transakcji
        original_items_sql = """
        SELECT pp.*, p.nazwa as product_name
        FROM pos_pozycje pp
        JOIN produkty p ON pp.product_id = p.id
        WHERE pp.transakcja_id = ?
        """
        original_items = execute_query(original_items_sql, (transaction_id,))
        original_items_dict = {item['id']: item for item in original_items}
        
        # Walidacja pozycji do korekty
        correction_items = []
        total_correction_amount = 0
        
        for item in items:
            position_id = item.get('position_id')
            product_id = item.get('product_id')
            
            if not position_id or position_id not in original_items_dict:
                return error_response(f"Nie znaleziono pozycji o ID {position_id} w oryginalnej transakcji", 400)
            
            original_item = original_items_dict[position_id]
            
            if original_item['product_id'] != product_id:
                return error_response(f"Product ID nie pasuje do pozycji {position_id}", 400)
            
            if correction_type == 'quantity':
                correction_quantity = float(item.get('correction_quantity', 0))
                if correction_quantity <= 0:
                    return error_response(f"Ilość korekty musi być większa od 0", 400)
                if correction_quantity > original_item['ilosc']:
                    return error_response(f"Ilość korekty ({correction_quantity}) nie może być większa od oryginalnej ilości ({original_item['ilosc']})", 400)
                
                # Oblicz kwotę korekty na podstawie ilości
                unit_price = original_item['cena_jednostkowa']
                correction_amount = correction_quantity * unit_price
                
            else:  # amount
                correction_amount = float(item.get('correction_amount', 0))
                if correction_amount <= 0:
                    return error_response(f"Kwota korekty musi być większa od 0", 400)
                if correction_amount > original_item['wartosc_brutto']:
                    return error_response(f"Kwota korekty ({correction_amount}) nie może być większa od oryginalnej wartości ({original_item['wartosc_brutto']})", 400)
                
                # Oblicz ilość korekty na podstawie kwoty
                unit_price = original_item['cena_jednostkowa']
                correction_quantity = correction_amount / unit_price if unit_price > 0 else 0
            
            correction_items.append({
                'position_id': position_id,
                'product_id': product_id,
                'original_item': original_item,
                'correction_quantity': correction_quantity,
                'correction_amount': correction_amount,
                'unit_price': unit_price
            })
            
            total_correction_amount += correction_amount
        
        # Generuj numer korekty
        correction_number = f"KOREKTA-{datetime.now().strftime('%Y%m%d%H%M%S')}-{transaction_id}"
        
        # Utwórz transakcję korekty
        correction_transaction_sql = """
        INSERT INTO pos_transakcje (
            numer_transakcji, data_transakcji, czas_transakcji,
            kasjer_login, klient_id, typ_transakcji, status,
            suma_brutto, suma_netto, suma_vat,
            forma_platnosci, kwota_otrzymana, kwota_reszty,
            numer_paragonu, uwagi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        now = datetime.now()
        date_str = now.strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M:%S')
        
        # Dla korekty kwoty są ujemne
        correction_transaction_result = execute_insert(correction_transaction_sql, (
            correction_number,
            date_str,
            time_str,
            cashier,
            original_transaction['klient_id'],
            'korekta',
            'zakonczony',
            -total_correction_amount,  # ujemna suma brutto
            -total_correction_amount,  # ujemna suma netto (uproszczenie)
            0,  # VAT (uproszczenie)
            'korekta',
            0,
            0,
            correction_number,
            f"Korekta transakcji #{transaction_id}. Powód: {reason}"
        ))
        
        if not correction_transaction_result:
            return error_response("Błąd tworzenia transakcji korekty", 500)
        
        correction_transaction_id = correction_transaction_result
        
        # Dodaj pozycje korekty i przywróć stany magazynowe
        for item in correction_items:
            # Dodaj pozycję korekty (ujemne wartości)
            correction_item_sql = """
            INSERT INTO pos_pozycje (
                transakcja_id, product_id, ilosc,
                cena_jednostkowa, stawka_vat,
                wartosc_netto, kwota_vat, wartosc_brutto,
                nazwa_produktu, kod_produktu, jednostka, lp,
                rabat_procent, rabat_kwota, cena_po_rabacie,
                cena_zakupu_fifo, marza_procent_fifo, metoda_obliczania_marzy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            execute_insert(correction_item_sql, (
                correction_transaction_id,
                item['product_id'],
                -item['correction_quantity'],  # ujemna ilość
                item['original_item']['cena_jednostkowa'],
                item['original_item']['stawka_vat'],
                -item['correction_amount'],  # ujemna wartość netto
                0,  # VAT (uproszczenie)
                -item['correction_amount'],  # ujemna wartość brutto
                item['original_item']['nazwa_produktu'],
                item['original_item']['kod_produktu'],
                item['original_item']['jednostka'],
                1,  # lp
                0,  # rabat_procent
                0,  # rabat_kwota
                item['original_item']['cena_jednostkowa'],  # cena_po_rabacie
                item['original_item'].get('cena_zakupu_fifo', 0),
                item['original_item'].get('marza_procent_fifo', 0),
                item['original_item'].get('metoda_obliczania_marzy', 'fifo')
            ))
            
            # PRZYWRÓĆ STAN MAGAZYNOWY - dodaj ilość z powrotem do magazynu
            # Sprawdź aktualny stan magazynowy
            stock_sql = """
            SELECT stan_aktualny 
            FROM pos_magazyn 
            WHERE produkt_id = ?
            """
            stock_result = execute_query(stock_sql, (item['product_id'],))
            
            if stock_result:
                # Aktualizuj istniejący stan
                current_stock = stock_result[0]['stan_aktualny'] or 0
                
                update_stock_sql = """
                UPDATE pos_magazyn 
                SET stan_aktualny = ?,
                    ostatnia_aktualizacja = datetime('now')
                WHERE produkt_id = ?
                """
                execute_insert(update_stock_sql, (
                    current_stock + item['correction_quantity'],
                    item['product_id']
                ))
            else:
                # Utwórz nowy stan magazynowy
                insert_stock_sql = """
                INSERT INTO pos_magazyn (
                    produkt_id, stan_aktualny, stan_minimalny, stan_maksymalny,
                    ostatnia_aktualizacja
                ) VALUES (?, ?, 0, 0, datetime('now'))
                """
                execute_insert(insert_stock_sql, (
                    item['product_id'],
                    item['correction_quantity']
                ))
            
            # Dodaj ruch magazynowy
            movement_sql = """
            INSERT INTO pos_ruchy_magazynowe (
                product_id, warehouse_id, typ_ruchu, ilosc, 
                cena_jednostkowa, wartosc_calkowita,
                opis, data_ruchu, user_id
            ) VALUES (?, 1, 'korekta_pos', ?, ?, ?, ?, datetime('now'), ?)
            """
            execute_insert(movement_sql, (
                item['product_id'],
                item['correction_quantity'],
                item['unit_price'],
                item['correction_amount'],
                f"Korekta transakcji #{transaction_id} - zwrot towaru",
                cashier
            ))
        
        return success_response({
            'correction_transaction_id': correction_transaction_id,
            'correction_number': correction_number,
            'original_transaction_id': transaction_id,
            'total_correction_amount': total_correction_amount,
            'items_corrected': len(correction_items),
            'correction_type': correction_type
        }, "Korekta transakcji została wykonana pomyślnie")
        
    except Exception as e:
        return error_response(f"Błąd wykonywania korekty: {str(e)}", 500)


@transactions_bp.route('/transactions/<int:transaction_id>/details', methods=['GET'])
def get_transaction_details(transaction_id):
    """
    Pobieranie szczegółów transakcji dla korekty
    GET /api/transactions/{id}/details
    """
    try:
        
        # Pobierz transakcję
        transaction_sql = """
        SELECT t.*, k.imie, k.nazwisko, k.telefon 
        FROM pos_transakcje t
        LEFT JOIN pos_klienci k ON t.klient_id = k.id
        WHERE t.id = ?
        """
        transaction_result = execute_query(transaction_sql, (transaction_id,))
        
        if not transaction_result:
            return not_found_response("Nie znaleziono transakcji")
        
        transaction = transaction_result[0]
        
        # Pobierz pozycje transakcji
        items_sql = """
        SELECT pp.*, p.nazwa as product_name, p.ean as kod_kreskowy, p.cena_sprzedazy_brutto as cena_sprzedazy
        FROM pos_pozycje pp
        LEFT JOIN produkty p ON pp.product_id = p.id
        WHERE pp.transakcja_id = ?
        ORDER BY pp.id
        """
        items_result = execute_query(items_sql, (transaction_id,))
        
        # Sprawdź czy już były korekty dla tej transakcji
        corrections_sql = """
        SELECT id, numer_transakcji, suma_brutto, uwagi, data_transakcji, czas_transakcji
        FROM pos_transakcje 
        WHERE typ_transakcji = 'korekta' AND uwagi LIKE ?
        ORDER BY data_transakcji DESC, czas_transakcji DESC
        """
        corrections_result = execute_query(corrections_sql, (f'%Korekta transakcji #{transaction_id}%',))
        
        return success_response({
            'transaction': transaction,
            'items': items_result,
            'corrections': corrections_result,
            'can_correct': transaction['status'] == 'zakonczony' and transaction['typ_transakcji'] in ['sprzedaz', 'sale']
        }, "Szczegóły transakcji pobrane pomyślnie")
        
    except Exception as e:
        return error_response(f"Błąd pobierania szczegółów transakcji: {str(e)}", 500)

# ===========================================
# USUWANIE I EDYCJA TRANSAKCJI (TYLKO SZKICE/W TOKU)
# ===========================================

@transactions_bp.route('/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """
    Usuń transakcję (tylko szkice i w toku)
    DELETE /api/transactions/{id}
    """
    try:
        # Sprawdź czy transakcja istnieje i czy można ją usunąć
        check_sql = """
        SELECT id, status, typ_transakcji, numer_paragonu
        FROM pos_transakcje 
        WHERE id = ?
        """
        transaction = execute_query(check_sql, (transaction_id,))
        
        if not transaction:
            return not_found_response("Transakcja nie istnieje")
        
        transaction = transaction[0]
        
        # Sprawdź czy można usunąć (tylko szkice i w toku)
        if transaction['status'] not in ['draft', 'w_trakcie']:
            return error_response("Można usuwać tylko szkice i transakcje w toku", 400)
        
        # Usuń pozycje transakcji
        execute_insert("DELETE FROM pos_pozycje WHERE transakcja_id = ?", (transaction_id,))
        
        # Usuń rabaty transakcji jeśli istnieją
        execute_insert("DELETE FROM rabaty_uzycie WHERE transakcja_id = ?", (transaction_id,))
        
        # Usuń transakcję
        execute_insert("DELETE FROM pos_transakcje WHERE id = ?", (transaction_id,))
        
        return success_response({
            'deleted_id': transaction_id,
            'receipt_number': transaction['numer_paragonu']
        }, f"Transakcja {transaction['numer_paragonu']} została usunięta")
        
    except Exception as e:
        return error_response(f"Błąd usuwania transakcji: {str(e)}", 500)

@transactions_bp.route('/transactions/<int:transaction_id>/status', methods=['PUT'])
def update_transaction_status(transaction_id):
    """
    Zmień status transakcji (np. z 'w_trakcie' na 'draft' dla wstrzymania)
    PUT /api/transactions/{id}/status
    Body: {"status": "draft|w_trakcie"}
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        new_status = data.get('status')
        if new_status not in ['draft', 'w_trakcie']:
            return error_response("Nieprawidłowy status. Dozwolone: draft, w_trakcie", 400)
        
        # Sprawdź czy transakcja istnieje
        check_sql = """
        SELECT id, status, typ_transakcji 
        FROM pos_transakcje 
        WHERE id = ?
        """
        transaction = execute_query(check_sql, (transaction_id,))
        
        if not transaction:
            return not_found_response("Transakcja nie istnieje")
        
        transaction = transaction[0]
        
        # Sprawdź czy można edytować
        if transaction['status'] == 'zakonczony':
            return error_response("Nie można edytować sfinalizowanych transakcji", 400)
        
        # Zaktualizuj status
        update_sql = """
        UPDATE pos_transakcje 
        SET status = ?, data_modyfikacji = ?
        WHERE id = ?
        """
        execute_query(update_sql, (new_status, datetime.now().isoformat(), transaction_id))
        
        return success_response({
            'transaction_id': transaction_id,
            'new_status': new_status
        }, f"Status transakcji zmieniony na: {new_status}")
        
    except Exception as e:
        return error_response(f"Błąd zmiany statusu transakcji: {str(e)}", 500)
