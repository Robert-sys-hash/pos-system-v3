"""
API endpoint dla pełnego modułu faktur zakupowych
Kompatybilne z React frontend - menu, import XML/PDF, cennik, lista, statystyki
Na podstawie oryginalnego modułu z V1
"""

from flask import Blueprint, request, jsonify, current_app
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from werkzeug.utils import secure_filename
from datetime import datetime, date
import json
import os
import xml.etree.ElementTree as ET
import tempfile
import uuid

purchase_invoices_bp = Blueprint('purchase_invoices', __name__)

# ===========================================
# MENU I STATYSTYKI
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices/menu', methods=['GET'])
def get_menu_stats():
    """
    Statystyki dla menu głównego faktur zakupowych
    """
    try:
        # Podstawowe statystyki
        stats_sql = """
        SELECT 
            COUNT(*) as total_invoices,
            COALESCE(SUM(suma_brutto), 0) as total_value,
            COUNT(CASE WHEN status = 'oczekujaca' THEN 1 END) as pending_invoices,
            COUNT(DISTINCT dostawca_id) as active_suppliers,
            COUNT(CASE WHEN DATE(data_faktury) = DATE('now') THEN 1 END) as today_invoices,
            COUNT(CASE WHEN DATE(data_faktury) >= DATE('now', '-30 days') THEN 1 END) as month_invoices,
            COALESCE(SUM(CASE WHEN status = 'zatwierdzona' THEN suma_brutto ELSE 0 END), 0) as approved_value
        FROM faktury_zakupowe
        """
        
        result = execute_query(stats_sql)
        
        if not result:
            return error_response("Błąd pobierania statystyk", 500)
        
        stats = result[0]
        
        # Historia importów cennika
        cennik_stats_sql = """
        SELECT 
            COUNT(*) as total_imports,
            COALESCE(SUM(produkty_utworzone), 0) as products_created,
            COALESCE(SUM(produkty_zaktualizowane), 0) as products_updated
        FROM cenniki_historia
        WHERE DATE(data_importu) >= DATE('now', '-30 days')
        """
        
        cennik_result = execute_query(cennik_stats_sql)
        cennik_stats = cennik_result[0] if cennik_result else {}
        
        return success_response({
            'invoices': {
                'total': stats['total_invoices'],
                'pending': stats['pending_invoices'],
                'today': stats['today_invoices'],
                'month': stats['month_invoices'],
                'approved_value': float(stats['approved_value'])
            },
            'suppliers': {
                'active': stats['active_suppliers']
            },
            'cennik': {
                'recent_imports': cennik_stats.get('total_imports', 0),
                'products_created': cennik_stats.get('products_created', 0),
                'products_updated': cennik_stats.get('products_updated', 0)
            },
            'totals': {
                'value': float(stats['total_value'])
            }
        }, "Statystyki menu faktur zakupowych")
        
    except Exception as e:
        print(f"Błąd pobierania statystyk menu: {e}")
        return error_response("Wystąpił błąd podczas pobierania statystyk", 500)

# ===========================================
# LISTA FAKTUR ZAKUPOWYCH
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices', methods=['GET'])
def get_purchase_invoices():
    """
    Lista faktur zakupowych z filtrowaniem i paginacją
    """
    try:
        # Parametry filtrowania
        search = request.args.get('search', '').strip()
        date_from = request.args.get('date_from', '').strip()
        date_to = request.args.get('date_to', '').strip()
        status = request.args.get('status', '').strip()
        supplier = request.args.get('supplier', '').strip()
        location_id = request.args.get('location_id')  # Dodaj location_id
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 30))
        
        # Podstawowe zapytanie
        base_sql = """
        SELECT 
            f.id,
            f.numer_faktury,
            f.data_faktury,
            f.data_dostawy,
            f.data_platnosci,
            f.dostawca_nazwa,
            f.dostawca_nip,
            f.suma_netto,
            f.suma_vat,
            f.suma_brutto,
            f.status,
            f.typ_faktury,
            f.zaimportowana_xml,
            f.zaimportowana_pdf,
            f.data_utworzenia,
            COUNT(p.id) as pozycje_count,
            COUNT(CASE WHEN p.status_mapowania = 'zmapowany' THEN 1 END) as pozycje_mapped,
            COUNT(CASE WHEN p.status_mapowania = 'niezmapowany' THEN 1 END) as pozycje_unmapped
        FROM faktury_zakupowe f
        LEFT JOIN faktury_zakupowe_pozycje p ON f.id = p.faktura_id
        WHERE 1=1
        """
        
        conditions = []
        params = []
        
        # Wyszukiwanie
        if search:
            conditions.append("(f.numer_faktury LIKE ? OR f.dostawca_nazwa LIKE ? OR f.dostawca_nip LIKE ?)")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        # Filtrowanie po dacie
        if date_from:
            conditions.append("f.data_faktury >= ?")
            params.append(date_from)
        
        if date_to:
            conditions.append("f.data_faktury <= ?")
            params.append(date_to)
        
        # Filtrowanie po statusie
        if status:
            conditions.append("f.status = ?")
            params.append(status)
        
        # Filtrowanie po dostawcy
        if supplier:
            conditions.append("f.dostawca_nazwa LIKE ?")
            params.append(f"%{supplier}%")
        
        # Filtrowanie po lokalizacji
        if location_id:
            conditions.append("f.location_id = ?")
            params.append(location_id)
        
        if conditions:
            base_sql += " AND " + " AND ".join(conditions)
        
        # Grupowanie i sortowanie
        base_sql += """
        GROUP BY f.id
        ORDER BY f.data_faktury DESC, f.id DESC
        """
        
        # Liczenie wszystkich rekordów
        count_sql = f"""
        SELECT COUNT(DISTINCT f.id) as total
        FROM faktury_zakupowe f
        LEFT JOIN faktury_zakupowe_pozycje p ON f.id = p.faktura_id
        WHERE 1=1
        """
        
        if conditions:
            count_sql += " AND " + " AND ".join(conditions)
        
        count_result = execute_query(count_sql, params)
        total_count = count_result[0]['total'] if count_result else 0
        
        # Paginacja
        offset = (page - 1) * per_page
        paginated_sql = base_sql + f" LIMIT {per_page} OFFSET {offset}"
        
        invoices = execute_query(paginated_sql, params)
        
        if invoices is None:
            return error_response("Błąd połączenia z bazą danych", 500)
        
        # Przelicz dane paginacji
        total_pages = (total_count + per_page - 1) // per_page
        has_prev = page > 1
        has_next = page < total_pages
        
        return success_response({
            'invoices': invoices,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': total_pages,
                'has_prev': has_prev,
                'has_next': has_next,
                'prev_num': page - 1 if has_prev else None,
                'next_num': page + 1 if has_next else None
            },
            'filters': {
                'search': search,
                'date_from': date_from,
                'date_to': date_to,
                'status': status,
                'supplier': supplier
            }
        }, f"Znaleziono {total_count} faktur")
        
    except ValueError as e:
        return error_response(f"Błędne parametry: {e}", 400)
    except Exception as e:
        print(f"Błąd pobierania faktur zakupowych: {e}")
        return error_response("Wystąpił błąd podczas pobierania faktur", 500)

# ===========================================
# SZCZEGÓŁY FAKTURY ZAKUPOWEJ
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices/<int:invoice_id>', methods=['GET'])
def get_purchase_invoice_details(invoice_id):
    """
    Szczegóły faktury zakupowej + pozycje + mapowania
    """
    try:
        # Podstawowe dane faktury
        invoice_sql = """
        SELECT f.*
        FROM faktury_zakupowe f
        WHERE f.id = ?
        """
        
        invoice_result = execute_query(invoice_sql, (invoice_id,))
        
        if not invoice_result:
            return not_found_response("Faktura nie została znaleziona")
        
        invoice = invoice_result[0]
        
        # Pozycje faktury z mapowaniami do produktów z cennika
        items_sql = """
        SELECT 
            p.*,
            pr.id as mapped_product_id,
            pr.nazwa as mapped_product_name,
            pr.cena_sprzedazy_brutto as mapped_product_price,
            pr.aktywny as mapped_product_active,
            CASE 
                WHEN pr.id IS NOT NULL THEN 'zmapowany'
                ELSE 'niezmapowany'
            END as status_mapowania_calculated
        FROM faktury_zakupowe_pozycje p
        LEFT JOIN produkty pr ON (
            p.ean = pr.ean 
            OR p.kod_produktu = pr.kod_produktu 
            OR p.nazwa_produktu = pr.nazwa
        )
        WHERE p.faktura_id = ?
        ORDER BY p.lp ASC, p.id ASC
        """
        
        items_result = execute_query(items_sql, (invoice_id,))
        invoice['items'] = items_result or []
        
        # Statystyki mapowania
        mapping_stats_sql = """
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN pr.id IS NOT NULL THEN 1 END) as mapped_items,
            COUNT(CASE WHEN pr.id IS NULL THEN 1 END) as unmapped_items
        FROM faktury_zakupowe_pozycje p
        LEFT JOIN produkty pr ON (
            p.ean = pr.ean 
            OR p.kod_produktu = pr.kod_produktu 
            OR p.nazwa_produktu = pr.nazwa
        )
        WHERE p.faktura_id = ?
        """
        
        mapping_result = execute_query(mapping_stats_sql, (invoice_id,))
        invoice['mapping_stats'] = mapping_result[0] if mapping_result else {}
        
        return success_response(invoice, "Szczegóły faktury zakupowej")
        
    except Exception as e:
        print(f"Błąd pobierania szczegółów faktury: {e}")
        return error_response("Wystąpił błąd podczas pobierania faktury", 500)

# ===========================================
# EDYCJA FAKTURY ZAKUPOWEJ
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices/<int:invoice_id>', methods=['PUT'])
def update_purchase_invoice(invoice_id):
    """
    Aktualizacja danych faktury zakupowej
    Automatycznie generuje PZ gdy status zmienia się na 'zatwierdzona'
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych do aktualizacji", 400)
        
        # Sprawdź czy faktura istnieje i pobierz aktualny status
        check_sql = "SELECT id, status FROM faktury_zakupowe WHERE id = ?"
        existing = execute_query(check_sql, (invoice_id,))
        
        if not existing:
            return error_response("Faktura nie została znaleziona", 404)
        
        old_status = existing[0]['status'] if existing[0].get('status') else 'nowa'
        new_status = data.get('status', old_status)
        
        # Przygotuj dane do aktualizacji
        allowed_fields = [
            'numer_faktury', 'data_faktury', 'data_dostawy', 'data_platnosci',
            'nazwa_dostawcy', 'nip_dostawcy', 'adres_dostawcy', 'telefon_dostawcy', 
            'email_dostawcy', 'nr_zamowienia', 'sposob_platnosci', 'waluta', 
            'status', 'uwagi'
        ]
        
        update_fields = []
        update_values = []
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(data[field])
        
        if not update_fields:
            return error_response("Brak pól do aktualizacji", 400)
        
        # Dodaj data modyfikacji
        update_fields.append("data_modyfikacji = ?")
        update_values.append(datetime.now().isoformat())
        
        # Dodaj ID faktury na końcu dla WHERE
        update_values.append(invoice_id)
        
        # Wykonaj aktualizację
        update_sql = f"""
            UPDATE faktury_zakupowe 
            SET {', '.join(update_fields)}
            WHERE id = ?
        """
        
        execute_query(update_sql, update_values)
        
        # Automatyczne generowanie PZ gdy status zmienia się na 'zatwierdzona'
        pz_generated = False
        pz_id = None
        if old_status != 'zatwierdzona' and new_status == 'zatwierdzona':
            pz_result = auto_generate_pz_for_invoice(invoice_id)
            if pz_result.get('success'):
                pz_generated = True
                pz_id = pz_result.get('receipt_id')
        
        response_data = {
            "id": invoice_id, 
            "updated_fields": list(data.keys())
        }
        
        if pz_generated:
            response_data["pz_generated"] = True
            response_data["pz_id"] = pz_id
            return success_response(
                response_data, 
                f"Faktura została zaktualizowana. Automatycznie wygenerowano PZ (ID: {pz_id})"
            )
        
        return success_response(
            response_data, 
            "Faktura została zaktualizowana"
        )
        
    except Exception as e:
        print(f"Błąd aktualizacji faktury: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji faktury", 500)


def auto_generate_pz_for_invoice(invoice_id, warehouse_id=5):
    """
    Automatycznie generuje dokument PZ (Przyjęcie Zewnętrzne) dla faktury zakupowej.
    Wywołane automatycznie gdy faktura zostanie zatwierdzona.
    
    Args:
        invoice_id: ID faktury zakupowej
        warehouse_id: ID magazynu (domyślnie 5 - KALISZ)
    
    Returns:
        dict: {'success': True/False, 'receipt_id': id lub None, 'message': string}
    """
    import sqlite3
    import os
    
    try:
        # Połączenie z bazą danych
        db_path = os.path.join(os.path.dirname(__file__), '..', 'kupony.db')
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Sprawdź czy PZ już zostało wygenerowane dla tej faktury
        cursor.execute("""
            SELECT id FROM warehouse_receipts 
            WHERE source_invoice_id = ? AND type = 'external'
        """, (invoice_id,))
        existing = cursor.fetchone()
        
        if existing:
            print(f"⚠️ PZ dla faktury {invoice_id} już istnieje (ID: {existing['id']})")
            return {'success': False, 'receipt_id': None, 'message': 'PZ dla tej faktury już istnieje'}
        
        # Pobierz dane faktury
        cursor.execute("""
            SELECT * FROM faktury_zakupowe WHERE id = ?
        """, (invoice_id,))
        invoice = cursor.fetchone()
        
        if not invoice:
            return {'success': False, 'receipt_id': None, 'message': 'Nie znaleziono faktury'}
        
        # Utwórz dokument PZ
        pz_number = f"PZ-{invoice_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        cursor.execute("""
            INSERT INTO warehouse_receipts 
            (type, source_invoice_id, document_number, supplier_name, receipt_date, total_amount, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ('external', invoice_id, pz_number, 
              invoice['dostawca_nazwa'], datetime.now().isoformat(), 
              invoice['suma_brutto'], 'completed', datetime.now().isoformat()))
        
        receipt_id = cursor.lastrowid
        if not receipt_id:
            return {'success': False, 'receipt_id': None, 'message': 'Błąd tworzenia dokumentu PZ'}
        
        print(f"✅ Utworzono dokument PZ: {pz_number} (ID: {receipt_id})")
        
        # Pobierz pozycje faktury (tylko zmapowane)
        cursor.execute("""
            SELECT * FROM faktury_zakupowe_pozycje 
            WHERE faktura_id = ? AND status_mapowania = 'zmapowany' AND produkt_id IS NOT NULL
        """, (invoice_id,))
        items = cursor.fetchall()
        
        print(f"🔍 Znaleziono {len(items)} zmapowanych pozycji do przetworzenia")
        processed_count = 0
        
        for item in items:
            product_id = item['produkt_id']
            quantity = item['ilosc'] or 0
            
            if not product_id or quantity <= 0:
                print(f"⚠️ Pomijam pozycję {item['id']} - brak produktu lub ilości")
                continue
            
            # Dodaj pozycję do PZ
            cursor.execute("""
                INSERT INTO warehouse_receipt_items 
                (receipt_id, product_id, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?)
            """, (receipt_id, product_id, quantity, 
                  item['cena_netto'] or 0, item['wartosc_brutto'] or 0))
            
            print(f"📦 Dodano pozycję: produkt {product_id}, ilość {quantity}")
            
            # Aktualizuj lub utwórz stan magazynowy
            cursor.execute("""
                INSERT OR IGNORE INTO pos_magazyn 
                (produkt_id, stan_aktualny, stan_minimalny, stan_maksymalny, lokalizacja)
                VALUES (?, 0, 0, 0, ?)
            """, (product_id, str(warehouse_id)))
            
            cursor.execute("""
                UPDATE pos_magazyn 
                SET stan_aktualny = stan_aktualny + ?, 
                    ostatnia_aktualizacja = CURRENT_TIMESTAMP
                WHERE produkt_id = ? AND lokalizacja = ?
            """, (quantity, product_id, str(warehouse_id)))
            
            print(f"📊 Zaktualizowano stan magazynowy dla produktu {product_id} (+{quantity})")
            
            # Dodaj wpis do historii magazynu
            cursor.execute("""
                INSERT INTO warehouse_history 
                (product_id, operation_type, quantity_change, reason, document_number, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (product_id, 'receipt_external', quantity, 
                  f"PZ automatyczne - faktura {invoice['numer_faktury']}", 
                  pz_number, datetime.now().isoformat()))
            
            processed_count += 1
        
        # Zatwierdź transakcję
        conn.commit()
        
        print(f"✅ Automatyczne PZ wygenerowane pomyślnie: {pz_number}, przetworzono {processed_count} pozycji")
        
        return {
            'success': True, 
            'receipt_id': receipt_id, 
            'message': f'PZ wygenerowane pomyślnie ({processed_count} pozycji)'
        }
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Błąd automatycznego generowania PZ: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'receipt_id': None, 'message': str(e)}
    finally:
        if conn:
            conn.close()

# ===========================================
# EDYCJA I MAPOWANIE POZYCJI FAKTURY
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices/<int:invoice_id>/items/<int:item_id>', methods=['PUT'])
def update_invoice_item(invoice_id, item_id):
    """
    Aktualizacja pozycji faktury zakupowej
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych do aktualizacji", 400)
        
        # Sprawdź czy pozycja istnieje
        check_sql = """
        SELECT id FROM faktury_zakupowe_pozycje 
        WHERE id = ? AND faktura_id = ?
        """
        existing = execute_query(check_sql, (item_id, invoice_id))
        
        if not existing:
            return error_response("Pozycja faktury nie została znaleziona", 404)
        
        # Przygotuj dane do aktualizacji
        allowed_fields = [
            'ilosc', 'cena_netto', 'cena_brutto', 'wartosc_netto', 
            'wartosc_brutto', 'stawka_vat'
        ]
        
        update_fields = []
        update_values = []
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(data[field])
        
        if not update_fields:
            return error_response("Brak pól do aktualizacji", 400)
        
        # Dodaj ID pozycji na końcu dla WHERE
        update_values.append(item_id)
        
        # Wykonaj aktualizację
        update_sql = f"""
            UPDATE faktury_zakupowe_pozycje 
            SET {', '.join(update_fields)}
            WHERE id = ?
        """
        
        execute_query(update_sql, update_values)
        
        # Przelicz sumy faktury
        update_invoice_totals(invoice_id)
        
        return success_response(
            {"id": item_id, "invoice_id": invoice_id}, 
            "Pozycja faktury została zaktualizowana"
        )
        
    except Exception as e:
        print(f"Błąd aktualizacji pozycji faktury: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji pozycji", 500)

@purchase_invoices_bp.route('/purchase-invoices/<int:invoice_id>/items/<int:item_id>/map', methods=['POST'])
def map_invoice_item(invoice_id, item_id):
    """
    Mapowanie pozycji faktury do produktu w systemie
    """
    try:
        data = request.get_json()
        
        if not data or 'product_id' not in data:
            return error_response("Brak product_id w żądaniu", 400)
        
        product_id = data['product_id']
        
        # Sprawdź czy pozycja istnieje
        check_item_sql = """
        SELECT id, nazwa_produktu FROM faktury_zakupowe_pozycje 
        WHERE id = ? AND faktura_id = ?
        """
        item = execute_query(check_item_sql, (item_id, invoice_id))
        
        if not item:
            return error_response("Pozycja faktury nie została znaleziona", 404)
        
        # Sprawdź czy produkt istnieje
        check_product_sql = "SELECT id, nazwa FROM produkty WHERE id = ?"
        product = execute_query(check_product_sql, (product_id,))
        
        if not product:
            return error_response("Produkt nie został znaleziony", 404)
        
        # Zaktualizuj mapowanie
        update_sql = """
        UPDATE faktury_zakupowe_pozycje 
        SET produkt_id = ?, status_mapowania = 'zmapowany'
        WHERE id = ?
        """
        
        execute_query(update_sql, (product_id, item_id))
        
        return success_response(
            {
                "item_id": item_id,
                "product_id": product_id,
                "product_name": product[0]['nazwa'],
                "invoice_id": invoice_id
            }, 
            f"Pozycja '{item[0]['nazwa_produktu']}' zmapowana do produktu '{product[0]['nazwa']}'"
        )
        
    except Exception as e:
        print(f"Błąd mapowania pozycji: {e}")
        return error_response("Wystąpił błąd podczas mapowania pozycji", 500)

def update_invoice_totals(invoice_id):
    """
    Pomocnicza funkcja do przeliczenia sum faktury
    """
    try:
        totals_sql = """
        SELECT 
            COALESCE(SUM(wartosc_netto), 0) as suma_netto,
            COALESCE(SUM(wartosc_brutto), 0) as suma_brutto
        FROM faktury_zakupowe_pozycje
        WHERE faktura_id = ?
        """
        
        totals = execute_query(totals_sql, (invoice_id,))
        
        if totals:
            update_sql = """
            UPDATE faktury_zakupowe 
            SET suma_netto = ?, suma_brutto = ?
            WHERE id = ?
            """
            execute_query(update_sql, (totals[0]['suma_netto'], totals[0]['suma_brutto'], invoice_id))
    except Exception as e:
        print(f"Błąd przeliczania sum faktury: {e}")

# ===========================================
# IMPORT FAKTURY XML
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices/import-xml', methods=['POST'])
def import_invoice_xml():
    """
    Import faktury z pliku XML (UBL, eFaktura, Optima XML)
    """
    try:
        if 'xml_file' not in request.files:
            return error_response("Nie wybrano pliku XML", 400)
        
        file = request.files['xml_file']
        
        if file.filename == '':
            return error_response("Nie wybrano pliku", 400)
        
        if not file.filename.lower().endswith('.xml'):
            return error_response("Plik musi mieć rozszerzenie .xml", 400)
        
        # Zapisz plik tymczasowo
        filename = secure_filename(file.filename)
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{filename}")
        
        try:
            file.save(temp_path)
            
            # Parsuj XML
            result = parse_invoice_xml(temp_path)
            
            if not result['success']:
                return error_response(result['error'], 400)
            
            # Zapisz do bazy danych
            invoice_data = result['invoice']
            items_data = result['items']
            
            # Wstaw fakturę
            invoice_id = insert_invoice_to_database(invoice_data, items_data, temp_path)
            
            if not invoice_id:
                return error_response("Błąd zapisywania faktury do bazy danych", 500)
            
            return success_response({
                'invoice_id': invoice_id,
                'invoice_number': invoice_data.get('numer_faktury'),
                'supplier': invoice_data.get('dostawca_nazwa'),
                'total_amount': invoice_data.get('suma_brutto'),
                'items_count': len(items_data),
                'filename': filename
            }, "Faktura XML została zaimportowana pomyślnie")
            
        finally:
            # Usuń plik tymczasowy
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except Exception as e:
        print(f"Błąd importu XML: {e}")
        error_msg = str(e)
        if "UNIQUE constraint failed: faktury_zakupowe.numer_faktury" in error_msg:
            return error_response("Faktura o podanym numerze już istnieje w systemie", 409)
        return error_response(f"Wystąpił błąd podczas importu: {error_msg}", 500)

def parse_invoice_xml(file_path):
    """
    Parsuje plik XML faktury (UBL, eFaktura, Optima)
    """
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Określ typ XML na podstawie namespace lub struktury
        namespace = root.tag.split('}')[0] + '}' if '}' in root.tag else ''
        
        # Sprawdź czy to format CDN/Optima z namespace
        if root.tag.endswith('ROOT') or 'cdn.com.pl' in str(ET.tostring(root)):
            return parse_optima_invoice(root)
        elif 'cac:' in str(ET.tostring(root)) or 'Invoice' in root.tag:
            # UBL Invoice
            return parse_ubl_invoice(root, namespace)
        elif 'DOKUMENT' in root.tag or root.find('.//DOKUMENT') is not None:
            # Optima XML (CDN)
            return parse_optima_invoice(root)
        elif 'Faktura' in root.tag or 'FAKTURA' in root.tag:
            # Inne formaty XML faktur
            return parse_generic_invoice(root)
        else:
            # Próbuj uniwersalny parser
            return parse_generic_invoice(root)
            
    except Exception as e:
        return {
            'success': False,
            'error': f'Błąd parsowania XML: {str(e)}'
        }

def parse_ubl_invoice(root, namespace):
    """Parser dla UBL Invoice"""
    try:
        invoice_data = {}
        items_data = []
        
        # Numer faktury
        id_elem = root.find(f'.//{namespace}ID')
        invoice_data['numer_faktury'] = id_elem.text if id_elem is not None else ''
        
        # Data faktury
        issue_date = root.find(f'.//{namespace}IssueDate')
        invoice_data['data_faktury'] = issue_date.text if issue_date is not None else ''
        
        # Data dostawy
        due_date = root.find(f'.//{namespace}DueDate')
        invoice_data['data_platnosci'] = due_date.text if due_date is not None else ''
        
        # Dostawca
        supplier = root.find(f'.//{namespace}AccountingSupplierParty')
        if supplier is not None:
            party = supplier.find(f'.//{namespace}Party')
            if party is not None:
                name_elem = party.find(f'.//{namespace}PartyName/{namespace}Name')
                invoice_data['dostawca_nazwa'] = name_elem.text if name_elem is not None else ''
                
                # NIP
                tax_scheme = party.find(f'.//{namespace}PartyTaxScheme/{namespace}CompanyID')
                invoice_data['dostawca_nip'] = tax_scheme.text if tax_scheme is not None else ''
        
        # Sumy
        monetary_total = root.find(f'.//{namespace}LegalMonetaryTotal')
        if monetary_total is not None:
            line_ext = monetary_total.find(f'.//{namespace}LineExtensionAmount')
            tax_ext = monetary_total.find(f'.//{namespace}TaxExclusiveAmount')
            tax_inc = monetary_total.find(f'.//{namespace}TaxInclusiveAmount')
            
            invoice_data['suma_netto'] = float(line_ext.text) if line_ext is not None else 0.0
            invoice_data['suma_brutto'] = float(tax_inc.text) if tax_inc is not None else 0.0
            invoice_data['suma_vat'] = invoice_data['suma_brutto'] - invoice_data['suma_netto']
        
        # Pozycje
        invoice_lines = root.findall(f'.//{namespace}InvoiceLine')
        for i, line in enumerate(invoice_lines, 1):
            item_data = {'lp': i}
            
            # Ilość
            quantity = line.find(f'.//{namespace}InvoicedQuantity')
            item_data['ilosc'] = float(quantity.text) if quantity is not None else 1.0
            
            # Jednostka
            if quantity is not None:
                item_data['jednostka'] = quantity.get('unitCode', 'szt.')
            
            # Nazwa produktu
            item_elem = line.find(f'.//{namespace}Item')
            if item_elem is not None:
                name_elem = item_elem.find(f'.//{namespace}Name')
                item_data['nazwa_produktu'] = name_elem.text if name_elem is not None else ''
                
                # EAN
                std_id = item_elem.find(f'.//{namespace}StandardItemIdentification/{namespace}ID')
                item_data['ean'] = std_id.text if std_id is not None else ''
            
            # Cena i wartości
            price = line.find(f'.//{namespace}Price/{namespace}PriceAmount')
            line_ext = line.find(f'.//{namespace}LineExtensionAmount')
            
            item_data['cena_netto'] = float(price.text) if price is not None else 0.0
            item_data['wartosc_brutto'] = float(line_ext.text) if line_ext is not None else 0.0
            
            # VAT
            tax_cat = line.find(f'.//{namespace}TaxTotal/{namespace}TaxSubtotal/{namespace}TaxCategory/{namespace}Percent')
            item_data['stawka_vat'] = float(tax_cat.text) if tax_cat is not None else 23.0
            
            items_data.append(item_data)
        
        # Domyślne wartości
        invoice_data.setdefault('status', 'nowa')
        invoice_data.setdefault('typ_faktury', 'zakupowa')
        invoice_data.setdefault('waluta', 'PLN')
        
        return {
            'success': True,
            'invoice': invoice_data,
            'items': items_data
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Błąd parsowania UBL: {str(e)}'
        }

def parse_optima_invoice(root):
    """Parser dla Optima XML (CDN)"""
    try:
        invoice_data = {}
        items_data = []
        
        print(f"DEBUG: Root tag: {root.tag}")
        print(f"DEBUG: Root text: {root.text}")
        
        # Sprawdź namespace
        namespace = ''
        if '}' in root.tag:
            namespace = root.tag.split('}')[0] + '}'
            print(f"DEBUG: Detected namespace: {namespace}")
        
        # Znajdź dokument
        if namespace:
            document = root.find(f'.//{namespace}DOKUMENT')
        else:
            document = root.find('.//DOKUMENT')
        
        if document is None:
            document = root
        
        print(f"DEBUG: Document found: {document is not None}")
        if document is not None:
            print(f"DEBUG: Document tag: {document.tag}")
        
        # Nagłówek
        if namespace:
            naglowek = document.find(f'.//{namespace}NAGLOWEK')
        else:
            naglowek = document.find('.//NAGLOWEK')
            
        print(f"DEBUG: Naglowek found: {naglowek is not None}")
        
        if naglowek is not None:
            # Numer faktury
            if namespace:
                numer_elem = naglowek.find(f'.//{namespace}NUMER_PELNY')
            else:
                numer_elem = naglowek.find('.//NUMER_PELNY')
                
            print(f"DEBUG: Numer element: {numer_elem}")
            print(f"DEBUG: Numer text: {numer_elem.text if numer_elem is not None else 'None'}")
            numer_pelny = numer_elem.text if numer_elem is not None else ''
            print(f"DEBUG: Numer pelny extracted: '{numer_pelny}'")
            invoice_data['numer_faktury'] = numer_pelny
            
            # Data faktury
            if namespace:
                data_elem = naglowek.find(f'.//{namespace}DATA_DOKUMENTU')
            else:
                data_elem = naglowek.find('.//DATA_DOKUMENTU')
                
            print(f"DEBUG: Data element: {data_elem}")
            print(f"DEBUG: Data text: {data_elem.text if data_elem is not None else 'None'}")
            data_faktury = data_elem.text if data_elem is not None else ''
            print(f"DEBUG: Data faktury extracted: '{data_faktury}'")
            invoice_data['data_faktury'] = data_faktury
            
            # Data wystawienia
            if namespace:
                data_wyst = naglowek.find(f'.//{namespace}DATA_WYSTAWIENIA')
            else:
                data_wyst = naglowek.find('.//DATA_WYSTAWIENIA')
            if data_wyst is not None:
                invoice_data['data_wystawienia'] = data_wyst.text
            
            # Data operacji jako data dostawy
            if namespace:
                data_oper = naglowek.find(f'.//{namespace}DATA_OPERACJI')
            else:
                data_oper = naglowek.find('.//DATA_OPERACJI')
            invoice_data['data_dostawy'] = data_oper.text if data_oper is not None else invoice_data.get('data_faktury', '')
            
            # Płatnik jako dostawca
            if namespace:
                platnik = naglowek.find(f'.//{namespace}PLATNIK/{namespace}KOD')
            else:
                platnik = naglowek.find('.//PLATNIK/KOD')
            invoice_data['dostawca_kod'] = platnik.text if platnik is not None else ''
            
            # Odbiorca
            if namespace:
                odbiorca = naglowek.find(f'.//{namespace}ODBIORCA/{namespace}KOD')
            else:
                odbiorca = naglowek.find('.//ODBIORCA/KOD')
            invoice_data['odbiorca_kod'] = odbiorca.text if odbiorca is not None else ''
        
        # Pozycje
        if namespace:
            pozycje = document.find(f'.//{namespace}POZYCJE')
        else:
            pozycje = document.find('.//POZYCJE')
        print(f"DEBUG: Pozycje found: {pozycje is not None}")
        suma_netto = 0.0
        suma_vat = 0.0

        if pozycje is not None:
            if namespace:
                pozycje_list = pozycje.findall(f'.//{namespace}POZYCJA')
            else:
                pozycje_list = pozycje.findall('.//POZYCJA')
            print(f"DEBUG: Found {len(pozycje_list)} pozycji")
            
            for pozycja in pozycje_list:
                item_data = {}
                
                # LP
                if namespace:
                    lp_elem = pozycja.find(f'.//{namespace}LP')
                else:
                    lp_elem = pozycja.find('.//LP')
                item_data['lp'] = int(lp_elem.text) if lp_elem is not None else 1
                
                # Kod towaru (EAN)
                if namespace:
                    towar = pozycja.find(f'.//{namespace}TOWAR/{namespace}KOD')
                else:
                    towar = pozycja.find('.//TOWAR/KOD')
                item_data['kod_produktu'] = towar.text if towar is not None else ''
                item_data['ean'] = towar.text if towar is not None else ''
                
                # Nazwa produktu (użyj kodu jako nazwy tymczasowo)
                item_data['nazwa_produktu'] = item_data['kod_produktu']
                
                # Ilość
                if namespace:
                    ilosc_elem = pozycja.find(f'.//{namespace}ILOSC')
                else:
                    ilosc_elem = pozycja.find('.//ILOSC')
                item_data['ilosc'] = float(ilosc_elem.text) if ilosc_elem is not None else 1.0
                item_data['jednostka'] = 'szt.'
                
                # Wartość netto
                if namespace:
                    wartosc_netto = pozycja.find(f'.//{namespace}WARTOSC_NETTO_WAL')
                else:
                    wartosc_netto = pozycja.find('.//WARTOSC_NETTO_WAL')
                netto_val = float(wartosc_netto.text) if wartosc_netto is not None else 0.0
                item_data['wartosc_netto'] = netto_val
                
                # Cena netto za sztukę
                item_data['cena_netto'] = netto_val / item_data['ilosc'] if item_data['ilosc'] > 0 else 0.0
                
                # Stawka VAT
                if namespace:
                    stawka_vat = pozycja.find(f'.//{namespace}STAWKA_VAT/{namespace}STAWKA')
                else:
                    stawka_vat = pozycja.find('.//STAWKA_VAT/STAWKA')
                vat_percent = float(stawka_vat.text) if stawka_vat is not None else 23.0
                item_data['stawka_vat'] = vat_percent
                
                # Oblicz VAT i wartość brutto
                vat_amount = netto_val * (vat_percent / 100)
                item_data['kwota_vat'] = vat_amount
                item_data['wartosc_brutto'] = netto_val + vat_amount
                item_data['cena_brutto'] = item_data['wartosc_brutto'] / item_data['ilosc'] if item_data['ilosc'] > 0 else 0.0
                
                # Suma dla faktury
                suma_netto += netto_val
                suma_vat += vat_amount
                
                items_data.append(item_data)
        
        # Sumy faktury
        invoice_data['suma_netto'] = suma_netto
        invoice_data['suma_vat'] = suma_vat
        invoice_data['suma_brutto'] = suma_netto + suma_vat
        
        # Debug print
        print(f"DEBUG: Parsed invoice_data przed dodaniem domyślnych: {invoice_data}")
        
        # Domyślne wartości
        if 'numer_faktury' not in invoice_data or not invoice_data['numer_faktury']:
            invoice_data['numer_faktury'] = 'IMPORT_' + str(int(datetime.now().timestamp()))
            
        invoice_data['dostawca_nazwa'] = invoice_data.get('dostawca_kod', 'Nieznany dostawca')
        invoice_data['dostawca_nip'] = ''
        invoice_data['dostawca_adres'] = ''
        invoice_data['data_platnosci'] = invoice_data.get('data_faktury', '')
        invoice_data['status'] = 'nowa'
        invoice_data['typ_faktury'] = 'zakupowa'
        invoice_data['waluta'] = 'PLN'
        invoice_data['uwagi'] = f"Import z pliku XML Optima. Kod dostawcy: {invoice_data.get('dostawca_kod', 'brak')}"
        
        print(f"DEBUG: Final invoice_data: {invoice_data}")
        print(f"DEBUG: Items count: {len(items_data)}")
        
        return {
            'success': True,
            'invoice': invoice_data,
            'items': items_data
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Błąd parsowania Optima XML: {str(e)}'
        }

def parse_generic_invoice(root):
    """Uniwersalny parser XML"""
    # Implementacja uniwersalnego parsera
    return {
        'success': False,
        'error': 'Nierozpoznany format XML'
    }

def insert_invoice_to_database(invoice_data, items_data, xml_file_path):
    """
    Zapisuje fakturę i pozycje do bazy danych
    """
    try:
        # Wstaw fakturę
        invoice_sql = """
        INSERT INTO faktury_zakupowe (
            numer_faktury, data_faktury, data_dostawy, data_platnosci,
            dostawca_nazwa, dostawca_nip, dostawca_adres,
            suma_netto, suma_vat, suma_brutto, waluta,
            status, typ_faktury, plik_xml_sciezka,
            data_utworzenia, user_login, zaimportowana_xml
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        invoice_params = (
            invoice_data.get('numer_faktury', ''),
            invoice_data.get('data_faktury', ''),
            invoice_data.get('data_dostawy', ''),
            invoice_data.get('data_platnosci', ''),
            invoice_data.get('dostawca_nazwa', ''),
            invoice_data.get('dostawca_nip', ''),
            invoice_data.get('dostawca_adres', ''),
            invoice_data.get('suma_netto', 0.0),
            invoice_data.get('suma_vat', 0.0),
            invoice_data.get('suma_brutto', 0.0),
            invoice_data.get('waluta', 'PLN'),
            invoice_data.get('status', 'nowa'),
            invoice_data.get('typ_faktury', 'zakupowa'),
            xml_file_path,
            datetime.now().isoformat(),
            'system',  # TODO: pobrać z sesji
            1  # zaimportowana_xml
        )
        
        # Wykonaj INSERT z obsługą błędów SQLite
        try:
            from utils.database import get_db_connection
            conn = get_db_connection()
            if not conn:
                return None
                
            cursor = conn.cursor()
            cursor.execute(invoice_sql, invoice_params)
            conn.commit()
            invoice_id = cursor.lastrowid
            
        except Exception as e:
            if conn:
                conn.close()
            print(f"Błąd wykonania zapytania INSERT faktury: {e}")
            # Przekaż błąd dalej
            raise e
        
        if not invoice_id:
            if conn:
                conn.close()
            return None
        
        # Wstaw pozycje
        for item in items_data:
            item_sql = """
            INSERT INTO faktury_zakupowe_pozycje (
                faktura_id, nazwa_produktu, kod_produktu, ean, jednostka,
                ilosc, cena_netto, stawka_vat, kwota_vat, wartosc_brutto,
                lp, status_mapowania
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            kwota_vat = (item.get('cena_netto', 0) * item.get('ilosc', 1) * item.get('stawka_vat', 23)) / 100
            wartosc_brutto = (item.get('cena_netto', 0) * item.get('ilosc', 1)) + kwota_vat
            
            item_params = (
                invoice_id,
                item.get('nazwa_produktu', ''),
                item.get('kod_produktu', ''),
                item.get('ean', ''),
                item.get('jednostka', 'szt.'),
                item.get('ilosc', 1.0),
                item.get('cena_netto', 0.0),
                item.get('stawka_vat', 23.0),
                kwota_vat,
                wartosc_brutto,
                item.get('lp', 1),
                'niezmapowany'
            )
            
            execute_insert(item_sql, item_params)
        
        if conn:
            conn.close()
        
        # Automatyczne mapowanie pozycji po dodaniu faktury
        print(f"DEBUG: Rozpoczynam automatyczne mapowanie dla faktury {invoice_id}")
        mapping_result = auto_map_invoice_items(invoice_id)
        if mapping_result['success']:
            print(f"DEBUG: Mapowanie zakończone - kod: {mapping_result['mapped_by_code']}, ean: {mapping_result['mapped_by_ean']}")
        else:
            print(f"DEBUG: Błąd mapowania: {mapping_result['error']}")
        
        return invoice_id
        
    except Exception as e:
        print(f"Błąd zapisywania faktury do bazy: {e}")
        print(f"Invoice data: {invoice_data}")
        print(f"Items count: {len(items_data) if items_data else 0}")
        import traceback
        traceback.print_exc()
        # Przekaż błąd dalej, żeby można było obsłużyć UNIQUE constraint
        raise e

# ===========================================
# IMPORT CENNIKA XML
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices/import-cennik', methods=['POST'])
def import_cennik_xml():
    """
    Import cennika produktów z pliku XML
    """
    try:
        if 'cennik_file' not in request.files:
            return error_response("Nie wybrano pliku cennika", 400)
        
        file = request.files['cennik_file']
        
        if file.filename == '':
            return error_response("Nie wybrano pliku", 400)
        
        if not file.filename.lower().endswith('.xml'):
            return error_response("Plik musi mieć rozszerzenie .xml", 400)
        
        # Zapisz plik tymczasowo
        filename = secure_filename(file.filename)
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{filename}")
        
        try:
            file.save(temp_path)
            
            # Parsuj cennik XML
            result = parse_cennik_xml(temp_path)
            
            if not result['success']:
                return error_response(result['error'], 400)
            
            return success_response({
                'products': result['products'],
                'count': len(result['products']),
                'filename': filename,
                'preview': True
            }, "Cennik został sparsowany pomyślnie")
            
        finally:
            # Usuń plik tymczasowy
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except Exception as e:
        print(f"Błąd importu cennika: {e}")
        return error_response(f"Wystąpił błąd podczas importu: {str(e)}", 500)

@purchase_invoices_bp.route('/purchase-invoices/save-cennik', methods=['POST'])
def save_cennik_products():
    """
    Zapisuje produkty z cennika do bazy danych
    """
    try:
        data = request.get_json()
        products = data.get('products', [])
        filename = data.get('filename', 'unknown')
        
        if not products:
            return error_response("Brak produktów do zapisania", 400)
        
        stats = {
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': []
        }
        
        for product in products:
            try:
                print(f"🔍 Przetwarzam produkt: {product.get('kod', 'BRAK_KODU')}")
                
                # Sprawdź czy produkt już istnieje
                check_sql = "SELECT id FROM produkty WHERE kod_produktu = ? OR ean = ?"
                kod = product.get('kod', '')
                ean = product.get('ean', '')
                
                print(f"   Szukam po kod_produktu='{kod}' lub ean='{ean}'")
                existing = execute_query(check_sql, (kod, ean))
                
                if existing:
                    print(f"   ✅ Znaleziono istniejący produkt ID: {existing[0]['id']}")
                    
                    # UWAGA: Cena z cennika to cena DETALICZNA (sprzedaży), nie zakupu!
                    # Aktualizujemy tylko ceny sprzedaży, NIE ZMIENIAMY cen zakupu
                    cena_sprzedazy_brutto = product.get('cena_brutto', 0)
                    stawka_vat = product.get('stawka_vat', 23)
                    
                    # Oblicz cenę sprzedaży netto
                    cena_sprzedazy_netto = round(cena_sprzedazy_brutto / (1 + stawka_vat / 100), 2)
                    
                    update_sql = """
                    UPDATE produkty 
                    SET stawka_vat = ?, nazwa = ?, jednostka = ?, cena = ?,
                        cena_sprzedazy_netto = ?, cena_sprzedazy_brutto = ?
                    WHERE id = ?
                    """
                    
                    success = execute_insert(update_sql, (
                        stawka_vat,
                        product.get('nazwa', ''),
                        product.get('jednostka', 'szt.'),
                        cena_sprzedazy_brutto,  # cena sprzedaży brutto
                        cena_sprzedazy_netto,   # cena sprzedaży netto
                        cena_sprzedazy_brutto,  # cena sprzedaży brutto (w osobnej kolumnie)
                        existing[0]['id']
                    ))
                    
                    if success:
                        stats['updated'] += 1
                        print(f"   ✅ Zaktualizowano produkt - cena sprzedaży: {cena_sprzedazy_netto}zł netto / {cena_sprzedazy_brutto}zł brutto (cena zakupu pozostała bez zmian)")
                    else:
                        stats['errors'].append(f"Błąd aktualizacji produktu {product.get('kod', '')}")
                        print(f"   ❌ Błąd aktualizacji produktu")
                        
                else:
                    print(f"   ➕ Tworzę nowy produkt")
                    # UWAGA: Cena z cennika to cena DETALICZNA (sprzedaży), nie zakupu!
                    # Dla nowych produktów ustaw tylko cenę sprzedaży, cena zakupu = 0 (do uzupełnienia)
                    cena_sprzedazy_brutto = product.get('cena_brutto', 0)
                    stawka_vat = product.get('stawka_vat', 23)
                    
                    # Oblicz cenę sprzedaży netto
                    cena_sprzedazy_netto = round(cena_sprzedazy_brutto / (1 + stawka_vat / 100), 2)
                    
                    insert_sql = """
                    INSERT INTO produkty (
                        kod_produktu, ean, nazwa, stawka_vat, jednostka,
                        cena_zakupu_netto, cena_zakupu_brutto, cena_zakupu, cena,
                        cena_sprzedazy_netto, cena_sprzedazy_brutto,
                        aktywny, data_utworzenia, user_login, zrodlo_importu
                    ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, 1, ?, 'system', 'cennik')
                    """
                    
                    result = execute_insert(insert_sql, (
                        kod,
                        ean,
                        product.get('nazwa', ''),
                        stawka_vat,
                        product.get('jednostka', 'szt.'),
                        cena_sprzedazy_brutto,  # cena sprzedaży brutto (główna kolumna)
                        cena_sprzedazy_netto,   # cena sprzedaży netto
                        cena_sprzedazy_brutto,  # cena sprzedaży brutto (osobna kolumna)
                        datetime.now().isoformat()
                    ))
                    if result:
                        stats['created'] += 1
                        print(f"   ✅ Utworzono nowy produkt ID: {result} - cena sprzedaży: {cena_sprzedazy_netto}zł netto / {cena_sprzedazy_brutto}zł brutto")
                    else:
                        stats['errors'].append(f"Błąd dodawania produktu {product.get('kod', '')}")
                        print(f"   ❌ Błąd dodawania produktu")
                    
            except Exception as e:
                stats['errors'].append(f"Błąd produktu {product.get('kod', '')}: {str(e)}")
                continue
        
        # Zapisz historię importu
        import json
        szczegoly_json = {
            'errors': stats['errors'],
            'import_time': datetime.now().isoformat(),
            'total_products_processed': stats['created'] + stats['updated'] + stats['skipped'] + len(stats['errors'])
        }
        
        history_sql = """
        INSERT INTO cenniki_historia (
            nazwa_pliku, data_importu, user_login,
            produkty_utworzone, produkty_zaktualizowane, produkty_pominięte,
            błędy_count, szczegóły_json, status
        ) VALUES (?, ?, 'system', ?, ?, ?, ?, ?, 'zakonczone')
        """
        execute_insert(history_sql, (
            filename,
            datetime.now().isoformat(),
            stats['created'],
            stats['updated'],
            stats['skipped'],
            len(stats['errors']),
            json.dumps(szczegoly_json, ensure_ascii=False)
        ))
        
        return success_response(stats, f"Import zakończony. Utworzono: {stats['created']}, zaktualizowano: {stats['updated']}")
        
    except Exception as e:
        print(f"Błąd zapisywania cennika: {e}")
        return error_response(f"Wystąpił błąd podczas zapisywania: {str(e)}", 500)

def parse_cennik_xml(file_path):
    """
    Parsuje plik XML cennika
    """
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        products = []
        
        print(f"🔍 Parser - root tag: {root.tag}")
        print(f"🔍 Parser - szukam elementów TOWAR...")
        
        # Parsuj produkty z XML - obsługa różnych struktur
        # Struktura 1: ROOT/TOWARY/TOWAR (z namespace)
        towary_elements = root.findall('.//TOWAR')
        
        # Jeśli nie znaleziono, spróbuj z namespace
        if not towary_elements:
            # Określ namespace jeśli istnieje
            if root.tag.startswith('{'):
                namespace = root.tag[root.tag.find('{')+1:root.tag.find('}')]
                ns = {'ns': namespace}
                towary_elements = root.findall('.//ns:TOWAR', ns)
        
        # Struktura 2: Proste CENNIK/TOWAR
        if not towary_elements:
            towary_elements = root.findall('TOWAR')
        
        print(f"🔍 Parser - znaleziono {len(towary_elements)} elementów TOWAR")
        
        for towar in towary_elements:
            try:
                product = {}
                print(f"🔍 Parser - przetwarzam element TOWAR")
                
                # Określ namespace dla wyszukiwania w elementach
                ns = {}
                if root.tag.startswith('{'):
                    namespace = root.tag[root.tag.find('{')+1:root.tag.find('}')]
                    ns = {'ns': namespace}
                
                # Podstawowe dane - z i bez namespace
                def find_element_text(parent, tag_name):
                    # Spróbuj bez namespace
                    elem = parent.find(tag_name)
                    if elem is not None:
                        return elem.text
                    
                    # Spróbuj z namespace
                    if ns:
                        elem = parent.find(f"ns:{tag_name}", ns)
                        if elem is not None:
                            return elem.text
                    
                    return ''
                
                kod_text = find_element_text(towar, 'KOD')
                product['kod'] = kod_text if kod_text else ''
                print(f"   KOD: {product['kod']}")
                
                ean_text = find_element_text(towar, 'EAN')
                product['ean'] = ean_text if ean_text else ''
                print(f"   EAN: {product['ean']}")
                
                nazwa_text = find_element_text(towar, 'NAZWA')
                product['nazwa'] = nazwa_text if nazwa_text else ''
                print(f"   NAZWA: {product['nazwa']}")
                
                jm_text = find_element_text(towar, 'JM')
                product['jednostka'] = jm_text if jm_text else 'szt.'
                print(f"   JM: {product['jednostka']}")
                
                # VAT - spróbuj różne struktury
                stawka_vat_elem = towar.find('.//STAWKA')
                if stawka_vat_elem is None and ns:
                    stawka_vat_elem = towar.find('.//ns:STAWKA', ns)
                if stawka_vat_elem is None:
                    stawka_vat_elem = towar.find('STAWKA_VAT/STAWKA')
                    if stawka_vat_elem is None and ns:
                        stawka_vat_elem = towar.find('ns:STAWKA_VAT/ns:STAWKA', ns)
                
                if stawka_vat_elem is not None:
                    try:
                        product['stawka_vat'] = float(stawka_vat_elem.text)
                    except (ValueError, TypeError):
                        product['stawka_vat'] = 23.0
                else:
                    product['stawka_vat'] = 23.0
                print(f"   VAT: {product['stawka_vat']}")
                
                # Cena - spróbuj różne struktury
                cena_elem = towar.find('.//WARTOSC')
                if cena_elem is None and ns:
                    cena_elem = towar.find('.//ns:WARTOSC', ns)
                if cena_elem is None:
                    cena_elem = towar.find('CENY/CENA/WARTOSC')
                    if cena_elem is None and ns:
                        cena_elem = towar.find('ns:CENY/ns:CENA/ns:WARTOSC', ns)
                
                if cena_elem is not None:
                    try:
                        cena_brutto = float(cena_elem.text)
                        product['cena_brutto'] = cena_brutto
                        product['cena_netto'] = round(cena_brutto / (1 + product['stawka_vat'] / 100), 2)
                    except (ValueError, TypeError):
                        product['cena_brutto'] = 0.0
                        product['cena_netto'] = 0.0
                else:
                    product['cena_brutto'] = 0.0
                    product['cena_netto'] = 0.0
                
                print(f"   CENA: {product['cena_brutto']}")
                
                if product['kod'] or product['ean']:  # Dodaj tylko jeśli ma kod lub EAN
                    products.append(product)
                
            except Exception as e:
                print(f"Błąd parsowania produktu: {e}")
                continue
        
        return {
            'success': True,
            'products': products
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Błąd parsowania cennika XML: {str(e)}'
        }

# ===========================================
# AUTOMATYCZNE MAPOWANIE POZYCJI FAKTURY
# ===========================================

def auto_map_invoice_items(invoice_id):
    """
    Automatyczne mapowanie pozycji faktury do produktów z bazy danych
    Mapowanie po ean (priorytet) lub kod_produktu i aktualizacja nazw z cennika
    """
    try:
        from utils.database import get_db_connection
        conn = get_db_connection()
        if not conn:
            return {'success': False, 'error': 'Błąd połączenia z bazą danych'}
        
        cursor = conn.cursor()
        
        # Pobierz wszystkie pozycje faktury (nie tylko niezmapowane)
        items_sql = """
        SELECT id, kod_produktu, ean, nazwa_produktu
        FROM faktury_zakupowe_pozycje 
        WHERE faktura_id = ?
        """
        
        cursor.execute(items_sql, (invoice_id,))
        items = cursor.fetchall()
        
        mapped_by_ean = 0
        mapped_by_code = 0
        updated_names = 0
        
        for item in items:
            item_id = item[0]
            kod_produktu = item[1]
            ean = item[2]
            nazwa_produktu = item[3]
            
            produkt_id = None
            produkt_nazwa = None
            status = 'niezmapowany'
            
            # Priorytet 1: Mapowanie po EAN
            if ean:
                cursor.execute("SELECT id, nazwa FROM produkty WHERE ean = ? AND aktywny = 1", (ean,))
                result = cursor.fetchone()
                if result:
                    produkt_id = result[0]
                    produkt_nazwa = result[1]
                    status = 'zmapowany'
                    mapped_by_ean += 1
            
            # Priorytet 2: Fallback - mapowanie po kodzie produktu
            if not produkt_id and kod_produktu:
                cursor.execute("SELECT id, nazwa FROM produkty WHERE kod_produktu = ? AND aktywny = 1", (kod_produktu,))
                result = cursor.fetchone()
                if result:
                    produkt_id = result[0]
                    produkt_nazwa = result[1]
                    status = 'zmapowany'
                    mapped_by_code += 1
            
            # Aktualizuj pozycję faktury
            if produkt_id and produkt_nazwa:
                # Aktualizuj mapowanie i nazwę z cennika
                update_sql = """
                UPDATE faktury_zakupowe_pozycje 
                SET produkt_id = ?, status_mapowania = ?, nazwa_produktu = ?
                WHERE id = ?
                """
                cursor.execute(update_sql, (produkt_id, status, produkt_nazwa, item_id))
                updated_names += 1
                
                # NOWA FUNKCJONALNOŚĆ: Aktualizuj cenę zakupu produktu z faktury
                # Pobierz cenę z tej pozycji faktury
                cursor.execute("""
                    SELECT cena_netto, wartosc_brutto, stawka_vat 
                    FROM faktury_zakupowe_pozycje 
                    WHERE id = ?
                """, (item_id,))
                price_data = cursor.fetchone()
                
                if price_data:
                    cena_netto_za_szt = price_data[0] or 0
                    wartosc_brutto_pozycji = price_data[1] or 0
                    stawka_vat = price_data[2] or 0
                    
                    # POPRAWKA: Oblicz cenę zakupu brutto za sztukę z ceny netto + VAT
                    cena_zakupu_netto = cena_netto_za_szt
                    cena_zakupu_brutto = cena_netto_za_szt * (1 + stawka_vat / 100) if cena_netto_za_szt > 0 else 0
                    
                    # Aktualizuj cenę zakupu w produkcie (NIE ZMIENIAJ ceny sprzedaży!)
                    update_price_sql = """
                    UPDATE produkty 
                    SET cena_zakupu_netto = ?, cena_zakupu_brutto = ?, cena_zakupu = ?
                    WHERE id = ?
                    """
                    cursor.execute(update_price_sql, (
                        cena_zakupu_netto,
                        cena_zakupu_brutto, 
                        cena_zakupu_brutto,  # stara kolumna kompatybilność
                        produkt_id
                    ))
                    print(f"   📦 Zaktualizowano cenę zakupu produktu ID {produkt_id}: netto={cena_zakupu_netto:.2f} zł, brutto={cena_zakupu_brutto:.2f} zł za szt")
                
            elif produkt_nazwa and nazwa_produktu != produkt_nazwa:
                # Aktualizuj tylko nazwę jeśli produkt już był zmapowany
                update_sql = """
                UPDATE faktury_zakupowe_pozycje 
                SET nazwa_produktu = ?
                WHERE id = ?
                """
                cursor.execute(update_sql, (produkt_nazwa, item_id))
                updated_names += 1
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'mapped_by_ean': mapped_by_ean,
            'mapped_by_code': mapped_by_code,
            'updated_names': updated_names,
            'total_processed': len(items)
        }
        
    except Exception as e:
        if conn:
            conn.close()
        print(f"Błąd automatycznego mapowania: {e}")
        return {'success': False, 'error': str(e)}

@purchase_invoices_bp.route('/purchase-invoices/<int:invoice_id>/auto-map', methods=['POST'])
def auto_map_invoice(invoice_id):
    """
    Automatyczne mapowanie pozycji faktury do produktów z bazy danych
    """
    try:
        result = auto_map_invoice_items(invoice_id)
        
        if result['success']:
            return success_response(result, "Automatyczne mapowanie zakończone")
        else:
            return error_response(result.get('error', 'Błąd mapowania'), 500)
            
    except Exception as e:
        print(f"Błąd automatycznego mapowania: {e}")
        return error_response(f"Wystąpił błąd podczas mapowania: {str(e)}", 500)

# ===========================================
# HISTORIA IMPORTÓW CENNIKA
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices/cennik-history', methods=['GET'])
def get_cennik_history():
    """
    Pobiera historię importów cennika
    """
    try:
        history_sql = """
        SELECT 
            id,
            nazwa_pliku,
            data_importu,
            user_login,
            produkty_utworzone,
            produkty_zaktualizowane,
            produkty_pominięte,
            błędy_count,
            status
        FROM cenniki_historia 
        ORDER BY data_importu DESC
        LIMIT 50
        """
        
        history = execute_query(history_sql)
        
        if not history:
            return success_response([], "Brak historii importów")
        
        # Formatuj daty
        for record in history:
            if record.get('data_importu'):
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(record['data_importu'].replace('Z', '+00:00'))
                    record['data_importu_formatted'] = dt.strftime('%d.%m.%Y %H:%M')
                except:
                    record['data_importu_formatted'] = record['data_importu']
        
        return success_response(history, "Historia importów pobrana pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania historii cennika: {e}")
        return error_response(f"Wystąpił błąd podczas pobierania historii: {str(e)}", 500)

@purchase_invoices_bp.route('/purchase-invoices/cennik-history/<int:history_id>/errors', methods=['GET'])
def get_cennik_history_errors(history_id):
    """
    Pobiera szczegóły błędów dla konkretnego importu cennika
    """
    try:
        errors_sql = """
        SELECT 
            id,
            nazwa_pliku,
            data_importu,
            błędy_count,
            szczegóły_json,
            status
        FROM cenniki_historia 
        WHERE id = ?
        """
        
        result = execute_query(errors_sql, (history_id,))
        
        if not result:
            return error_response("Nie znaleziono historii importu", 404)
        
        history_record = result[0]
        
        # Parsuj szczegóły JSON
        errors_details = []
        if history_record.get('szczegóły_json'):
            try:
                import json
                details = json.loads(history_record['szczegóły_json'])
                errors_details = details.get('errors', [])
            except Exception as e:
                print(f"Błąd parsowania szczegółów JSON: {e}")
        
        # Formatuj datę
        formatted_date = history_record.get('data_importu', '')
        if formatted_date:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(formatted_date.replace('Z', '+00:00'))
                formatted_date = dt.strftime('%d.%m.%Y %H:%M')
            except:
                pass
        
        response_data = {
            'id': history_record['id'],
            'nazwa_pliku': history_record['nazwa_pliku'],
            'data_importu': formatted_date,
            'błędy_count': history_record['błędy_count'],
            'status': history_record['status'],
            'errors': errors_details
        }
        
        return success_response(response_data, f"Szczegóły błędów dla importu {history_id}")
        
    except Exception as e:
        print(f"Błąd pobierania szczegółów błędów: {e}")
        return error_response(f"Wystąpił błąd podczas pobierania szczegółów: {str(e)}", 500)

# ===========================================
# AKTUALIZACJA CEN ZAKUPU Z FAKTURY
# ===========================================

@purchase_invoices_bp.route('/purchase-invoices/<int:invoice_id>/update-purchase-prices', methods=['POST'])
def update_purchase_prices_from_invoice(invoice_id):
    """
    Aktualizuje ceny zakupu produktów na podstawie zmapowanych pozycji faktury
    """
    try:
        from utils.database import get_db_connection
        conn = get_db_connection()
        if not conn:
            return error_response('Błąd połączenia z bazą danych', 500)
        
        cursor = conn.cursor()
        
        # Pobierz wszystkie zmapowane pozycje faktury
        items_sql = """
        SELECT 
            p.id as item_id,
            p.produkt_id,
            p.cena_netto,
            p.wartosc_brutto,
            p.ilosc,
            p.stawka_vat,
            p.nazwa_produktu,
            pr.nazwa as produkt_nazwa
        FROM faktury_zakupowe_pozycje p
        JOIN produkty pr ON p.produkt_id = pr.id
        WHERE p.faktura_id = ? AND p.status_mapowania = 'zmapowany'
        """
        
        cursor.execute(items_sql, (invoice_id,))
        items = cursor.fetchall()
        
        if not items:
            return error_response("Brak zmapowanych pozycji w fakturze", 400)
        
        updated_count = 0
        
        for item in items:
            produkt_id = item[1]
            cena_netto_za_szt = item[2] or 0
            wartosc_brutto_razem = item[3] or 0
            ilosc = item[4] or 1
            stawka_vat = item[5] or 0
            
            # POPRAWKA: Oblicz cenę zakupu brutto za sztukę z ceny netto + VAT
            cena_zakupu_netto = cena_netto_za_szt
            cena_zakupu_brutto = cena_netto_za_szt * (1 + stawka_vat / 100) if cena_netto_za_szt > 0 else 0
            
            # Aktualizuj cenę zakupu produktu
            update_sql = """
            UPDATE produkty 
            SET cena_zakupu_netto = ?, cena_zakupu_brutto = ?, cena_zakupu = ?
            WHERE id = ?
            """
            
            cursor.execute(update_sql, (
                cena_zakupu_netto,
                cena_zakupu_brutto,
                cena_zakupu_brutto,  # kompatybilność ze starą kolumną
                produkt_id
            ))
            
            updated_count += 1
            print(f"   💰 Zaktualizowano cenę zakupu produktu ID {produkt_id}: netto={cena_zakupu_netto:.2f} zł za szt, brutto={cena_zakupu_brutto:.2f} zł za szt (z ilosci={ilosc})")
        
        conn.commit()
        conn.close()
        
        return success_response({
            'updated_products': updated_count,
            'invoice_id': invoice_id
        }, f"Zaktualizowano ceny zakupu dla {updated_count} produktów")
        
    except Exception as e:
        print(f"Błąd aktualizacji cen zakupu: {e}")
        return error_response(f"Wystąpił błąd podczas aktualizacji cen: {str(e)}", 500)
