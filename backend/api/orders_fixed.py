"""
API dla zarządzania zamówieniami od klientów - POPRAWIONA WERSJA
"""
from flask import Blueprint, request, jsonify, session
import sqlite3
from datetime import datetime
import uuid
from utils.database import execute_query, execute_insert
from utils.response_helpers import success_response, error_response, not_found_response

orders_bp = Blueprint('orders', __name__)

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
        
        # 4. Utwórz unikalny numer transakcji POS
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
        
        # 7. Dodaj pozycje do transakcji POS Z MAGAZYNEM
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
            
            # Sprawdź czy tabela pos_pozycje ma kolumnę warehouse_id
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
