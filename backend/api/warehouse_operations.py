from flask import Blueprint, request, jsonify
from utils.database import get_db_connection, execute_query, execute_insert
from utils.response_helpers import success_response, error_response
import traceback
import logging
from datetime import datetime

warehouse_operations_bp = Blueprint('warehouse_operations', __name__)

def execute_select(query, params=None):
    """Wrapper function for compatibility with old format"""
    result = execute_query(query, params)
    if result is not None:
        return {'success': True, 'data': result}
    else:
        return {'success': False, 'error': 'Database query failed'}

def resolve_stock_shortages_for_product(cursor, product_id, location_id, invoice_id=None):
    """
    Automatycznie rozwiązuje braki magazynowe dla produktu po uzupełnieniu stanu.
    Sprawdza aktualny stan i jeśli jest >= 0, oznacza braki jako rozwiązane.
    """
    try:
        # Sprawdź aktualny stan magazynowy produktu
        cursor.execute("""
            SELECT stan_aktualny FROM pos_magazyn 
            WHERE produkt_id = ? AND lokalizacja = ?
        """, (product_id, str(location_id)))
        stock = cursor.fetchone()
        
        current_stock = stock['stan_aktualny'] if stock else 0
        
        # Jeśli stan jest >= 0, oznacz wszystkie oczekujące braki jako rozwiązane
        if current_stock >= 0:
            cursor.execute("""
                UPDATE pos_stock_shortages 
                SET status = 'resolved',
                    resolved_at = datetime('now'),
                    resolved_by = 'system_auto',
                    faktura_zakupu_id = ?
                WHERE produkt_id = ? 
                  AND status = 'pending'
            """, (invoice_id, product_id))
            
            resolved_count = cursor.rowcount
            
            if resolved_count > 0:
                print(f"✅ Automatycznie rozwiązano {resolved_count} braków dla produktu {product_id}")
                
                # Sprawdź, czy powiązane transakcje mają jeszcze jakieś nierozwiązane braki
                # Jeśli nie, usuń flagę has_stock_shortage
                cursor.execute("""
                    UPDATE pos_transakcje 
                    SET has_stock_shortage = 0
                    WHERE id IN (
                        SELECT DISTINCT transakcja_id 
                        FROM pos_stock_shortages 
                        WHERE produkt_id = ? AND status = 'resolved'
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM pos_stock_shortages 
                        WHERE transakcja_id = pos_transakcje.id AND status = 'pending'
                    )
                """, (product_id,))
                
                updated_transactions = cursor.rowcount
                if updated_transactions > 0:
                    print(f"✅ Usunięto flagę braku z {updated_transactions} transakcji")
                    
            return resolved_count
        return 0
    except Exception as e:
        print(f"⚠️ Błąd rozwiązywania braków dla produktu {product_id}: {e}")
        return 0

@warehouse_operations_bp.route('/warehouse/purchase-invoices', methods=['GET', 'OPTIONS'])
def get_purchase_invoices_for_pz():
    """Pobiera faktury zakupu dostępne do generowania PZ"""
    try:
        query = """
        SELECT 
            fz.id,
            fz.numer_faktury as invoice_number,
            fz.dostawca_nazwa as supplier_name,
            fz.data_faktury as invoice_date,
            fz.suma_brutto as total_amount,
            fz.status,
            CASE 
                WHEN wr.id IS NOT NULL THEN 1 
                ELSE 0 
            END as pz_generated
        FROM faktury_zakupowe fz
        LEFT JOIN warehouse_receipts wr ON fz.id = wr.source_invoice_id AND wr.type = 'external'
        ORDER BY fz.data_faktury DESC
        """
        
        result = execute_select(query)
        
        if result['success']:
            return success_response(result['data'], "Faktury załadowane pomyślnie")
        else:
            return error_response(result['error'])
            
    except Exception as e:
        logging.error(f"Błąd pobierania faktur: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/external-receipt/<int:invoice_id>', methods=['POST', 'OPTIONS'])
def generate_external_receipt(invoice_id):
    """Generuje PZ (przyjęcie zewnętrzne) na podstawie faktury zakupu"""
    if request.method == 'OPTIONS':
        return '', 200
        
    conn = None
    try:
        # Pobierz warehouse_id i location_id z request lub użyj domyślnego
        data = request.get_json() or {}
        warehouse_id = data.get('warehouse_id', 5)  # Domyślnie magazyn KALISZ
        location_id = data.get('location_id')  # Location ID do filtrowania
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Sprawdź czy PZ już zostało wygenerowane
        cursor.execute("""
            SELECT id FROM warehouse_receipts 
            WHERE source_invoice_id = ? AND type = 'external'
        """, (invoice_id,))
        existing = cursor.fetchone()
        
        if existing:
            return error_response("PZ dla tej faktury już zostało wygenerowane")
        
        # Pobierz dane faktury - dostosowane do polskiego schematu
        cursor.execute("""
            SELECT * FROM faktury_zakupowe WHERE id = ?
        """, (invoice_id,))
        invoice = cursor.fetchone()
        
        if not invoice:
            return error_response("Nie znaleziono faktury zakupowej")
        
        # Utwórz wpis PZ
        cursor.execute("""
            INSERT INTO warehouse_receipts 
            (type, source_invoice_id, document_number, supplier_name, receipt_date, total_amount, status, created_at, location_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('external', invoice_id, f"PZ-{invoice_id}-{datetime.now().strftime('%Y%m%d')}", 
              invoice['dostawca_nazwa'], datetime.now().isoformat(), 
              invoice['suma_brutto'], 'completed', datetime.now().isoformat(), location_id))
        
        receipt_id = cursor.lastrowid
        if not receipt_id:
            return error_response("Błąd tworzenia dokumentu PZ")
        
        # Pobierz pozycje faktury - dostosowane do polskiego schematu
        cursor.execute("""
            SELECT * FROM faktury_zakupowe_pozycje 
            WHERE faktura_id = ? AND status_mapowania = 'zmapowany'
        """, (invoice_id,))
        items = cursor.fetchall()
        
        print(f"🔍 Znaleziono {len(items)} pozycji do przetworzenia")
        processed_count = 0
        
        for item in items:
            print(f"📦 Przetwarzanie pozycji: ID={item['id']}, produkt_id={item['produkt_id']}, ilosc={item['ilosc']}")
            
            # Sprawdź czy pozycja ma zmapowany produkt
            if not item['produkt_id']:
                print(f"⚠️ Pozycja {item['id']} nie ma zmapowanego produktu - pomijanie")
                continue
                
            # Dodaj pozycję do PZ
            cursor.execute("""
                INSERT INTO warehouse_receipt_items 
                (receipt_id, product_id, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?)
            """, (receipt_id, item['produkt_id'], item['ilosc'], 
                  item['cena_netto'], item['wartosc_brutto']))
            
            receipt_item_id = cursor.lastrowid
            print(f"✅ Dodano pozycję PZ: {receipt_item_id}")
            
            # Aktualizuj lub utwórz stan magazynowy
            cursor.execute("""
                INSERT OR IGNORE INTO pos_magazyn 
                (produkt_id, stan_aktualny, stan_minimalny, stan_maksymalny, lokalizacja)
                VALUES (?, 0, 0, 0, ?)
            """, (item['produkt_id'], str(warehouse_id)))
            
            cursor.execute("""
                UPDATE pos_magazyn 
                SET stan_aktualny = stan_aktualny + ?, 
                    ostatnia_aktualizacja = CURRENT_TIMESTAMP
                WHERE produkt_id = ? AND lokalizacja = ?
            """, (item['ilosc'], item['produkt_id'], str(warehouse_id)))
            
            print(f"📊 Zaktualizowano stan magazynowy dla produktu {item['produkt_id']}")
            
            # Automatycznie rozwiąż braki magazynowe jeśli stan jest teraz >= 0
            resolve_stock_shortages_for_product(cursor, item['produkt_id'], warehouse_id, invoice_id)
            
            # Dodaj wpis do historii magazynu
            cursor.execute("""
                INSERT INTO warehouse_history 
                (product_id, operation_type, quantity_change, reason, document_number, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (item['produkt_id'], 'receipt_external', item['ilosc'], 
                  f"PZ na podstawie faktury {invoice['numer_faktury']}", 
                  f"PZ-{invoice_id}-{datetime.now().strftime('%Y%m%d')}", 
                  datetime.now().isoformat()))
                  
            history_id = cursor.lastrowid
            print(f"📝 Dodano wpis do historii: {history_id}")
            processed_count += 1
            
        print(f"✅ Przetworzono {processed_count} pozycji")
        
        # Zatwierdź transakcję
        conn.commit()
        
        return success_response({"receipt_id": receipt_id, "processed_items": processed_count}, "PZ zostało wygenerowane pomyślnie")
        
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Błąd generowania PZ: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")
    finally:
        if conn:
            conn.close()

@warehouse_operations_bp.route('/warehouse/internal-receipt', methods=['POST', 'OPTIONS'])
def create_internal_receipt():
    """Tworzy przyjęcie wewnętrzne (PW)"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
    
    try:
        data = request.get_json()
        products = data.get('products', [])
        location_id = data.get('location_id')  # Location ID do filtrowania
        
        if not products:
            return error_response("Brak produktów do przyjęcia")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Utwórz dokument PW
        document_number = f"PW-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        receipt_id = execute_insert("""
            INSERT INTO warehouse_receipts 
            (type, document_number, receipt_date, status, created_at, location_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ('internal', document_number, datetime.now().isoformat(), 
              'completed', datetime.now().isoformat(), location_id))
        
        if not receipt_id:
            return error_response("Błąd tworzenia dokumentu PW")
        
        # Przetwórz produkty
        for product in products:
            product_id = product.get('product_id')
            quantity = product.get('quantity', 0)
            reason = product.get('reason', 'Przyjęcie wewnętrzne')
            
            # Dodaj pozycję do PW
            execute_insert("""
                INSERT INTO warehouse_receipt_items 
                (receipt_id, product_id, quantity, reason)
                VALUES (?, ?, ?, ?)
            """, (receipt_id, product_id, quantity, reason))
            
            # Aktualizuj stan magazynowy w inventory_locations (per lokalizacja)
            if location_id:
                # Sprawdź czy istnieje wpis dla tego produktu i lokalizacji
                cursor.execute("""
                    SELECT id FROM inventory_locations 
                    WHERE product_id = ? AND warehouse_id = ?
                """, (product_id, location_id))
                existing = cursor.fetchone()
                
                if existing:
                    # Aktualizuj istniejący wpis
                    cursor.execute("""
                        UPDATE inventory_locations 
                        SET ilosc_dostepna = ilosc_dostepna + ?, 
                            ostatnia_aktualizacja = CURRENT_TIMESTAMP
                        WHERE product_id = ? AND warehouse_id = ?
                    """, (quantity, product_id, location_id))
                else:
                    # Utwórz nowy wpis
                    cursor.execute("""
                        INSERT INTO inventory_locations 
                        (product_id, warehouse_id, ilosc_dostepna, ilosc_zarezerwowana, ilosc_minimalna, ilosc_maksymalna, ostatnia_aktualizacja)
                        VALUES (?, ?, ?, 0, 0, 0, CURRENT_TIMESTAMP)
                    """, (product_id, location_id, quantity))
                
                logging.info(f"Zaktualizowano inventory_locations: produkt {product_id}, lokalizacja {location_id}, +{quantity}")
            
            # Aktualizuj również stan w pos_magazyn (legacy) z lokalizacją
            # Sprawdź czy istnieje wpis dla tej lokalizacji
            cursor.execute("""
                SELECT id FROM pos_magazyn WHERE produkt_id = ? AND (lokalizacja = ? OR lokalizacja IS NULL OR lokalizacja = '')
            """, (product_id, str(location_id) if location_id else ''))
            pos_existing = cursor.fetchone()
            
            if pos_existing:
                cursor.execute("""
                    UPDATE pos_magazyn 
                    SET stan_aktualny = stan_aktualny + ?, 
                        lokalizacja = ?,
                        ostatnia_aktualizacja = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (quantity, str(location_id) if location_id else '', pos_existing[0]))
            else:
                cursor.execute("""
                    INSERT INTO pos_magazyn (produkt_id, stan_aktualny, stan_minimalny, stan_maksymalny, lokalizacja, ostatnia_aktualizacja)
                    VALUES (?, ?, 0, 0, ?, CURRENT_TIMESTAMP)
                """, (product_id, quantity, str(location_id) if location_id else ''))
            
            # Automatycznie rozwiąż braki magazynowe jeśli stan jest teraz >= 0
            if location_id:
                resolve_stock_shortages_for_product(cursor, product_id, location_id, None)
            
            # Dodaj wpis do historii magazynu
            execute_insert("""
                INSERT INTO warehouse_history 
                (product_id, operation_type, quantity_change, reason, document_number, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (product_id, 'receipt_internal', quantity, reason, 
                  document_number, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return success_response({"receipt_id": receipt_id}, "Przyjęcie wewnętrzne zostało zarejestrowane pomyślnie")
        
    except Exception as e:
        logging.error(f"Błąd tworzenia PW: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/internal-receipt/list', methods=['GET', 'OPTIONS'])
def get_internal_receipts():
    """Pobiera listę przyjęć wewnętrznych (PW)"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        date_filter = request.args.get('date', '')
        status_filter = request.args.get('status', 'all')
        location_id = request.args.get('location_id', '')
        
        query = """
        SELECT 
            wr.id,
            wr.document_number,
            wr.receipt_date,
            wr.status,
            wr.created_by,
            wr.created_at,
            wr.location_id,
            COUNT(wri.id) as items_count
        FROM warehouse_receipts wr
        LEFT JOIN warehouse_receipt_items wri ON wr.id = wri.receipt_id
        WHERE wr.type = 'internal'
        """
        
        params = []
        
        if location_id:
            query += " AND wr.location_id = ?"
            params.append(location_id)
        
        if date_filter:
            query += " AND DATE(wr.receipt_date) = ?"
            params.append(date_filter)
            
        if status_filter != 'all':
            query += " AND wr.status = ?"
            params.append(status_filter)
        
        query += " GROUP BY wr.id ORDER BY wr.created_at DESC"
        
        result = execute_select(query, params if params else None)
        
        if result['success']:
            return success_response(result['data'], "Historia PW załadowana pomyślnie")
        else:
            return error_response(result['error'])
            
    except Exception as e:
        logging.error(f"Błąd pobierania historii PW: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/internal-receipt/<int:receipt_id>', methods=['GET', 'OPTIONS'])
def get_internal_receipt_details(receipt_id):
    """Pobiera szczegóły przyjęcia wewnętrznego (PW)"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        # Pobierz dane dokumentu
        receipt_query = """
        SELECT 
            wr.id,
            wr.document_number,
            wr.receipt_date,
            wr.status,
            wr.notes,
            wr.created_by,
            wr.created_at
        FROM warehouse_receipts wr
        WHERE wr.id = ? AND wr.type = 'internal'
        """
        
        receipt_result = execute_select(receipt_query, [receipt_id])
        
        if not receipt_result['success'] or not receipt_result['data']:
            return error_response("Nie znaleziono dokumentu PW", 404)
        
        receipt = receipt_result['data'][0]
        
        # Pobierz pozycje dokumentu z nazwą produktu
        items_query = """
        SELECT 
            wri.id,
            wri.product_id,
            p.nazwa as product_name,
            wri.quantity,
            p.jednostka as unit,
            wri.unit_price,
            wri.reason
        FROM warehouse_receipt_items wri
        LEFT JOIN produkty p ON wri.product_id = p.id
        WHERE wri.receipt_id = ?
        ORDER BY wri.id
        """
        
        items_result = execute_select(items_query, [receipt_id])
        
        return success_response({
            'receipt': receipt,
            'items': items_result['data'] if items_result['success'] else []
        }, "Szczegóły PW załadowane pomyślnie")
            
    except Exception as e:
        logging.error(f"Błąd pobierania szczegółów PW: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/external-receipt/list', methods=['GET', 'OPTIONS'])
def get_external_receipts():
    """Pobiera listę przyjęć zewnętrznych (PZ)"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        date_filter = request.args.get('date', '')
        status_filter = request.args.get('status', 'all')
        location_id = request.args.get('location_id', '')
        
        query = """
        SELECT 
            wr.id,
            wr.document_number,
            wr.receipt_date,
            wr.status,
            wr.supplier_name,
            wr.total_amount,
            wr.created_by,
            wr.created_at,
            wr.location_id,
            pi.invoice_number as source_invoice_number,
            COUNT(wri.id) as items_count
        FROM warehouse_receipts wr
        LEFT JOIN warehouse_receipt_items wri ON wr.id = wri.receipt_id
        LEFT JOIN purchase_invoices pi ON wr.source_invoice_id = pi.id
        WHERE wr.type = 'external'
        """
        
        params = []
        
        if location_id:
            query += " AND wr.location_id = ?"
            params.append(location_id)
        
        if date_filter:
            query += " AND DATE(wr.receipt_date) = ?"
            params.append(date_filter)
            
        if status_filter != 'all':
            query += " AND wr.status = ?"
            params.append(status_filter)
        
        query += " GROUP BY wr.id ORDER BY wr.created_at DESC"
        
        result = execute_select(query, params if params else None)
        
        if result['success']:
            return success_response(result['data'], "Historia PZ załadowana pomyślnie")
        else:
            return error_response(result['error'])
            
    except Exception as e:
        logging.error(f"Błąd pobierania historii PZ: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/external-receipt/<int:receipt_id>', methods=['GET', 'OPTIONS'])
def get_external_receipt_details(receipt_id):
    """Pobiera szczegóły dokumentu PZ wraz z pozycjami"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        # Pobierz nagłówek dokumentu PZ
        header_query = """
        SELECT 
            wr.id,
            wr.document_number,
            wr.receipt_date,
            wr.status,
            wr.supplier_name,
            wr.total_amount,
            wr.created_by,
            wr.created_at,
            fz.numer_faktury as source_invoice_number,
            fz.data_faktury as invoice_date
        FROM warehouse_receipts wr
        LEFT JOIN faktury_zakupowe fz ON wr.source_invoice_id = fz.id
        WHERE wr.id = ? AND wr.type = 'external'
        """
        
        header_result = execute_select(header_query, (receipt_id,))
        
        if not header_result['success'] or not header_result['data']:
            return error_response("Nie znaleziono dokumentu PZ")
        
        receipt = dict(header_result['data'][0])
        
        # Pobierz pozycje dokumentu PZ
        items_query = """
        SELECT 
            wri.id,
            wri.product_id,
            wri.quantity,
            wri.unit_price,
            wri.total_price,
            p.nazwa as product_name,
            p.kod_kreskowy as barcode,
            p.jednostka_miary as unit
        FROM warehouse_receipt_items wri
        LEFT JOIN pos_produkty p ON wri.product_id = p.id
        WHERE wri.receipt_id = ?
        ORDER BY wri.id
        """
        
        items_result = execute_select(items_query, (receipt_id,))
        
        receipt['items'] = items_result['data'] if items_result['success'] else []
        
        return success_response(receipt, "Szczegóły PZ pobrane pomyślnie")
        
    except Exception as e:
        logging.error(f"Błąd pobierania szczegółów PZ: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/external-receipt/<int:receipt_id>/pdf', methods=['GET', 'OPTIONS'])
def get_external_receipt_pdf(receipt_id):
    """Generuje PDF dokumentu PZ"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        from flask import make_response
        from io import BytesIO
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        # Rejestracja czcionki z polskimi znakami
        import os
        font_path = os.path.join(os.path.dirname(__file__), '..', 'fonts', 'DejaVuSans.ttf')
        font_path_bold = os.path.join(os.path.dirname(__file__), '..', 'fonts', 'DejaVuSans-Bold.ttf')
        
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont('DejaVuSans', font_path))
                if os.path.exists(font_path_bold):
                    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', font_path_bold))
                font_name = 'DejaVuSans'
            except:
                font_name = 'Helvetica'
        else:
            font_name = 'Helvetica'
        
        # Pobierz dane PZ
        header_query = """
        SELECT 
            wr.id,
            wr.document_number,
            wr.receipt_date,
            wr.status,
            wr.supplier_name,
            wr.total_amount,
            wr.created_by,
            wr.created_at,
            fz.numer_faktury as source_invoice_number,
            fz.data_faktury as invoice_date
        FROM warehouse_receipts wr
        LEFT JOIN faktury_zakupowe fz ON wr.source_invoice_id = fz.id
        WHERE wr.id = ? AND wr.type = 'external'
        """
        
        header_result = execute_select(header_query, (receipt_id,))
        
        if not header_result['success'] or not header_result['data']:
            return error_response("Nie znaleziono dokumentu PZ")
        
        receipt = header_result['data'][0]
        
        # Pobierz pozycje
        items_query = """
        SELECT 
            wri.id,
            wri.product_id,
            wri.quantity,
            wri.unit_price,
            wri.total_price,
            p.nazwa as product_name,
            p.kod_kreskowy as barcode,
            p.jednostka_miary as unit
        FROM warehouse_receipt_items wri
        LEFT JOIN pos_produkty p ON wri.product_id = p.id
        WHERE wri.receipt_id = ?
        ORDER BY wri.id
        """
        
        items_result = execute_select(items_query, (receipt_id,))
        items = items_result['data'] if items_result['success'] else []
        
        # Generuj PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, 
                               leftMargin=1.5*cm, rightMargin=1.5*cm,
                               topMargin=1.5*cm, bottomMargin=1.5*cm)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Style
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontName=font_name,
            fontSize=18,
            alignment=TA_CENTER,
            spaceAfter=20
        )
        
        normal_style = ParagraphStyle(
            'Normal',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=10
        )
        
        header_style = ParagraphStyle(
            'Header',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=12,
            spaceAfter=5
        )
        
        # Tytuł
        elements.append(Paragraph(f"PRZYJĘCIE ZEWNĘTRZNE (PZ)", title_style))
        elements.append(Paragraph(f"<b>Numer dokumentu:</b> {receipt['document_number']}", header_style))
        elements.append(Spacer(1, 10))
        
        # Informacje nagłówkowe
        info_data = [
            ['Data przyjęcia:', receipt['receipt_date'][:10] if receipt['receipt_date'] else '-'],
            ['Dostawca:', receipt['supplier_name'] or '-'],
            ['Faktura źródłowa:', receipt['source_invoice_number'] or '-'],
            ['Status:', 'Zakończone' if receipt['status'] == 'completed' else 'Oczekujące'],
        ]
        
        info_table = Table(info_data, colWidths=[4*cm, 10*cm])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), font_name),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        # Tabela pozycji
        elements.append(Paragraph("<b>Pozycje dokumentu:</b>", header_style))
        elements.append(Spacer(1, 10))
        
        table_data = [['Lp.', 'Nazwa produktu', 'Kod', 'Ilość', 'J.m.', 'Cena netto', 'Wartość']]
        
        total_value = 0
        for idx, item in enumerate(items, 1):
            unit_price = item['unit_price'] or 0
            total_price = item['total_price'] or (item['quantity'] * unit_price)
            total_value += total_price
            
            table_data.append([
                str(idx),
                item['product_name'] or '-',
                item['barcode'] or '-',
                f"{item['quantity']:.2f}",
                item['unit'] or 'szt',
                f"{unit_price:.2f} zł",
                f"{total_price:.2f} zł"
            ])
        
        # Wiersz podsumowania
        table_data.append(['', '', '', '', '', 'RAZEM:', f"{total_value:.2f} zł"])
        
        col_widths = [1*cm, 6*cm, 2.5*cm, 1.5*cm, 1.5*cm, 2.5*cm, 2.5*cm]
        items_table = Table(table_data, colWidths=col_widths)
        items_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Lp.
            ('ALIGN', (3, 1), (3, -1), 'RIGHT'),   # Ilość
            ('ALIGN', (5, 1), (-1, -1), 'RIGHT'),  # Ceny
            ('GRID', (0, 0), (-1, -2), 0.5, colors.black),
            ('LINEABOVE', (5, -1), (-1, -1), 1, colors.black),
            ('FONTNAME', (5, -1), (-1, -1), font_name),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(items_table)
        
        # Stopka
        elements.append(Spacer(1, 30))
        footer_data = [
            ['Wystawił:', '_' * 30, 'Przyjął:', '_' * 30],
        ]
        footer_table = Table(footer_data, colWidths=[2*cm, 5*cm, 2*cm, 5*cm])
        footer_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 20),
        ]))
        elements.append(footer_table)
        
        # Buduj PDF
        doc.build(elements)
        
        # Zwróć PDF
        pdf_data = buffer.getvalue()
        buffer.close()
        
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=PZ_{receipt["document_number"]}.pdf'
        return response
        
    except Exception as e:
        logging.error(f"Błąd generowania PDF PZ: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/internal-issue/list', methods=['GET', 'OPTIONS'])
def get_internal_issues():
    """Pobiera listę rozchodów wewnętrznych (RW)"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        date_filter = request.args.get('date', '')
        status_filter = request.args.get('status', 'all')
        location_id = request.args.get('location_id', '')
        
        query = """
        SELECT 
            wi.id,
            wi.document_number,
            wi.issue_date,
            wi.status,
            wi.created_by,
            wi.created_at,
            wi.location_id,
            COUNT(wii.id) as items_count
        FROM warehouse_issues wi
        LEFT JOIN warehouse_issue_items wii ON wi.id = wii.issue_id
        WHERE 1=1
        """
        
        params = []
        
        if location_id:
            query += " AND wi.location_id = ?"
            params.append(location_id)
        
        if date_filter:
            query += " AND DATE(wi.issue_date) = ?"
            params.append(date_filter)
            
        if status_filter != 'all':
            query += " AND wi.status = ?"
            params.append(status_filter)
        
        query += " GROUP BY wi.id ORDER BY wi.created_at DESC"
        
        result = execute_select(query, params if params else None)
        
        if result['success']:
            return success_response(result['data'], "Historia RW załadowana pomyślnie")
        else:
            return error_response(result['error'])
            
    except Exception as e:
        logging.error(f"Błąd pobierania historii RW: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/internal-issue', methods=['POST', 'OPTIONS'])
def create_internal_issue():
    """Tworzy rozchód wewnętrzny (RW)"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        products = data.get('products', [])
        location_id = data.get('location_id')  # Location ID do filtrowania
        
        if not products:
            return error_response("Brak produktów do wydania")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Sprawdź dostępność produktów
        for product in products:
            product_id = product.get('product_id')
            quantity = product.get('quantity', 0)
            
            check_query = "SELECT stan_aktualny FROM pos_magazyn WHERE produkt_id = ?"
            result = execute_select(check_query, (product_id,))
            
            if not result['success'] or len(result['data']) == 0:
                return error_response(f"Nie znaleziono produktu o ID {product_id}")
            
            available_quantity = result['data'][0]['stan_aktualny'] or 0
            if available_quantity < quantity:
                return error_response(f"Niewystarczający stan magazynowy dla produktu ID {product_id}. Dostępne: {available_quantity}, żądane: {quantity}")
        
        # Utwórz dokument RW
        document_number = f"RW-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        issue_id = execute_insert("""
            INSERT INTO warehouse_issues 
            (type, document_number, issue_date, status, created_at, location_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ('internal', document_number, datetime.now().isoformat(), 
              'completed', datetime.now().isoformat(), location_id))
        
        if not issue_id:
            return error_response("Błąd tworzenia dokumentu RW")
        
        # Przetwórz produkty
        for product in products:
            product_id = product.get('product_id')
            quantity = product.get('quantity', 0)
            reason = product.get('reason', 'Rozchód wewnętrzny')
            
            # Dodaj pozycję do RW
            execute_insert("""
                INSERT INTO warehouse_issue_items 
                (issue_id, product_id, quantity, reason)
                VALUES (?, ?, ?, ?)
            """, (issue_id, product_id, quantity, reason))
            
            # Aktualizuj stan magazynowy
            cursor.execute("""
                UPDATE pos_magazyn 
                SET stan_aktualny = stan_aktualny - ?, 
                    ostatnia_aktualizacja = CURRENT_TIMESTAMP
                WHERE produkt_id = ?
            """, (quantity, product_id))
            
            # Dodaj wpis do historii magazynu
            execute_insert("""
                INSERT INTO warehouse_history 
                (product_id, operation_type, quantity_change, reason, document_number, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (product_id, 'issue_internal', -quantity, reason, 
                  document_number, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return success_response({"issue_id": issue_id}, "Rozchód wewnętrzny został zarejestrowany pomyślnie")
        
    except Exception as e:
        logging.error(f"Błąd tworzenia RW: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/inventory/start', methods=['POST', 'OPTIONS'])
def start_inventory():
    """Rozpoczyna inwentaryzację"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        category_id = data.get('category')
        
        # Sprawdź czy nie ma aktywnej inwentaryzacji
        active_check = execute_select("SELECT id FROM inventory_sessions WHERE status = 'active'")
        if active_check['success'] and len(active_check['data']) > 0:
            return error_response("Istnieje już aktywna inwentaryzacja")
        
        # Utwórz sesję inwentaryzacji
        session_id = execute_insert("""
            INSERT INTO inventory_sessions 
            (start_date, category_id, status, created_at)
            VALUES (?, ?, ?, ?)
        """, (datetime.now().isoformat(), category_id, 'active', datetime.now().isoformat()))
        
        if not session_id:
            return error_response("Błąd tworzenia sesji inwentaryzacji")
        
        # Pobierz produkty do inwentaryzacji
        if category_id:
            products_query = """
                SELECT p.id as product_id, p.nazwa as product_name, p.kod_produktu as product_code, 
                       p.opis as description, COALESCE(sm.stan_aktualny, 0) as system_count, p.jednostka as unit
                FROM produkty p
                LEFT JOIN pos_magazyn sm ON p.id = sm.produkt_id
                WHERE p.category_id = ?
                ORDER BY p.nazwa
            """
            products_result = execute_select(products_query, (category_id,))
        else:
            products_query = """
                SELECT p.id as product_id, p.nazwa as product_name, p.kod_produktu as product_code, 
                       p.opis as description, COALESCE(sm.stan_aktualny, 0) as system_count, p.jednostka as unit
                FROM produkty p
                LEFT JOIN pos_magazyn sm ON p.id = sm.produkt_id
                ORDER BY p.nazwa
            """
            products_result = execute_select(products_query)
        
        if not products_result['success']:
            return error_response("Błąd pobierania produktów")
        
        # Dodaj produkty do sesji inwentaryzacji
        for product in products_result['data']:
            execute_insert("""
                INSERT INTO inventory_items 
                (session_id, product_id, system_count)
                VALUES (?, ?, ?)
            """, (session_id, product['product_id'], product['system_count']))
        
        return success_response({
            "session_id": session_id,
            "products": products_result['data']
        }, "Inwentaryzacja została rozpoczęta pomyślnie")
        
    except Exception as e:
        logging.error(f"Błąd rozpoczynania inwentaryzacji: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/inventory/active', methods=['GET', 'OPTIONS'])
def get_active_inventory():
    """Pobiera aktywną inwentaryzację"""
    try:
        query = """
        SELECT 
            s.id as session_id, s.start_date, s.category_id,
            i.product_id, i.system_count, i.actual_count,
            p.name as product_name, p.product_code, p.description, p.unit
        FROM inventory_sessions s
        LEFT JOIN inventory_items i ON s.id = i.session_id
        LEFT JOIN products p ON i.product_id = p.id
        WHERE s.status = 'active'
        ORDER BY p.name
        """
        
        result = execute_select(query)
        
        if result['success']:
            if len(result['data']) == 0:
                return success_response(None, "Brak aktywnej inwentaryzacji")
            
            # Grupuj dane
            session = {
                "session_id": result['data'][0]['session_id'],
                "start_date": result['data'][0]['start_date'],
                "category_id": result['data'][0]['category_id'],
                "products": []
            }
            
            for row in result['data']:
                if row['product_id']:  # Pomijaj puste wiersze
                    session['products'].append({
                        "product_id": row['product_id'],
                        "product_name": row['product_name'],
                        "product_code": row['product_code'],
                        "description": row['description'],
                        "unit": row['unit'],
                        "system_count": row['system_count'],
                        "actual_count": row['actual_count']
                    })
            
            return success_response(session, "Aktywna inwentaryzacja załadowana")
        else:
            return error_response(result['error'])
            
    except Exception as e:
        logging.error(f"Błąd pobierania aktywnej inwentaryzacji: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/warehouse/inventory/finish', methods=['POST', 'OPTIONS'])
def finish_inventory():
    """Kończy inwentaryzację"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        products = data.get('products', [])
        
        if not products:
            return error_response("Brak danych do zakończenia inwentaryzacji")
        
        # Pobierz aktywną sesję
        session_result = execute_select("SELECT id FROM inventory_sessions WHERE status = 'active'")
        if not session_result['success'] or len(session_result['data']) == 0:
            return error_response("Brak aktywnej inwentaryzacji")
        
        session_id = session_result['data'][0]['id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Przetwórz wszystkie produkty
        for product in products:
            product_id = product.get('product_id')
            system_count = product.get('system_count', 0)
            actual_count = product.get('actual_count', 0)
            difference = product.get('difference', 0)
            
            # Aktualizuj pozycję inwentaryzacji
            cursor.execute("""
                UPDATE inventory_items 
                SET actual_count = ?, difference = ?
                WHERE session_id = ? AND product_id = ?
            """, (actual_count, difference, session_id, product_id))
            
            # Jeśli jest różnica, aktualizuj stan magazynowy
            if difference != 0:
                cursor.execute("""
                    UPDATE pos_magazyn 
                    SET stan_aktualny = ?, 
                        ostatnia_aktualizacja = CURRENT_TIMESTAMP
                    WHERE produkt_id = ?
                """, (actual_count, product_id))
                
                # Dodaj wpis do historii magazynu
                operation_type = 'inventory_increase' if difference > 0 else 'inventory_decrease'
                execute_insert("""
                    INSERT INTO warehouse_history 
                    (product_id, operation_type, quantity_change, reason, document_number, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (product_id, operation_type, difference, 
                      f"Korekta inwentaryzacyjna - różnica: {difference}", 
                      f"INV-{session_id}", datetime.now().isoformat()))
        
        # Zamknij sesję inwentaryzacji
        cursor.execute("""
            UPDATE inventory_sessions 
            SET status = 'completed', end_date = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), session_id))
        
        conn.commit()
        conn.close()
        
        return success_response({"session_id": session_id}, "Inwentaryzacja została zakończona pomyślnie")
        
    except Exception as e:
        logging.error(f"Błąd kończenia inwentaryzacji: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")

@warehouse_operations_bp.route('/inventory/sessions', methods=['GET'])
def get_inventory_sessions():
    """Pobiera listę sesji inwentaryzacji z filtrowaniem"""
    try:
        date_filter = request.args.get('date', '')
        status_filter = request.args.get('status', '')
        
        # Budowanie zapytania z filtrowaniem
        query = """
            SELECT 
                id,
                started_at,
                finished_at,
                status,
                created_by,
                (SELECT COUNT(*) FROM inventory_items WHERE session_id = inventory_sessions.id) as total_products
            FROM inventory_sessions
            WHERE 1=1
        """
        params = []
        
        if date_filter:
            query += " AND DATE(started_at) = ?"
            params.append(date_filter)
        
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
            
        query += " ORDER BY started_at DESC"
        
        sessions = execute_select(query, params)
        
        return success_response(sessions, "Lista sesji inwentaryzacji pobrana pomyślnie")
        
    except Exception as e:
        logging.error(f"Błąd pobierania sesji inwentaryzacji: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}")
