"""
API endpoint dla zarządzania fakturami zakupowymi
Kompatybilne z React frontend - faktury, dostawcy, pozycje faktur
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime, date
import json

invoices_bp = Blueprint('invoices', __name__)

@invoices_bp.route('/invoices/search', methods=['GET'])
def search_invoices():
    """
    Wyszukiwarka faktur zakupowych
    Parametry: query (string), date_from, date_to, supplier, limit (int)
    """
    try:
        query = request.args.get('query', '').strip()
        date_from = request.args.get('date_from', '').strip()
        date_to = request.args.get('date_to', '').strip()
        supplier = request.args.get('supplier', '').strip()
        limit = int(request.args.get('limit', 20))
        
        # Podstawowe zapytanie
        sql_query = """
        SELECT 
            id,
            numer_faktury as invoice_number,
            data_faktury as invoice_date,
            data_dostawy as delivery_date,
            data_platnosci as payment_date,
            dostawca_nazwa as supplier_name,
            dostawca_nip as supplier_nip,
            suma_netto as net_amount,
            suma_brutto as gross_amount,
            suma_vat as vat_amount,
            status,
            data_utworzenia as created_at,
            data_utworzenia as updated_at
        FROM faktury_zakupowe
        WHERE 1=1
        """
        
        conditions = []
        params = []
        
        # Wyszukiwanie po numerze faktury lub dostawcy
        if query:
            conditions.append("(numer_faktury LIKE ? OR dostawca_nazwa LIKE ? OR dostawca_nip LIKE ?)")
            search_pattern = f"%{query}%"
            params.extend([search_pattern, search_pattern, search_pattern])
            
        # Filtrowanie po dacie
        if date_from:
            conditions.append("data_faktury >= ?")
            params.append(date_from)
            
        if date_to:
            conditions.append("data_faktury <= ?")
            params.append(date_to)
            
        # Filtrowanie po dostawcy
        if supplier:
            conditions.append("dostawca_nazwa LIKE ?")
            params.append(f"%{supplier}%")
            
        if conditions:
            sql_query += " AND " + " AND ".join(conditions)
            
        sql_query += " ORDER BY data_faktury DESC LIMIT ?"
        params.append(limit)
        
        results = execute_query(sql_query, params)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'invoices': results,
            'total': len(results),
            'query': query,
            'filters': {
                'date_from': date_from,
                'date_to': date_to,
                'supplier': supplier
            },
            'limit': limit
        }, f"Znaleziono {len(results)} faktur")
        
    except ValueError:
        return error_response("Parametr 'limit' musi być liczbą", 400)
    except Exception as e:
        print(f"Błąd wyszukiwania faktur: {e}")
        return error_response("Wystąpił błąd podczas wyszukiwania", 500)

@invoices_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice_details(invoice_id):
    """
    Szczegóły faktury + pozycje
    """
    try:
        # Podstawowe dane faktury
        invoice_sql = """
        SELECT 
            id,
            numer_faktury as invoice_number,
            data_faktury as invoice_date,
            data_dostawy as delivery_date,
            data_platnosci as payment_date,
            dostawca_id as supplier_id,
            dostawca_nazwa as supplier_name,
            dostawca_nip as supplier_nip,
            dostawca_adres as supplier_address,
            suma_netto as net_amount,
            suma_brutto as gross_amount,
            suma_vat as vat_amount,
            status,
            uwagi as notes,
            created_at,
            updated_at
        FROM faktury_zakupowe
        WHERE id = ?
        """
        
        invoice_result = execute_query(invoice_sql, (invoice_id,))
        
        if not invoice_result:
            return not_found_response("Faktura nie została znaleziona")
            
        invoice = invoice_result[0]
        
        # Pozycje faktury
        items_sql = """
        SELECT 
            id,
            produkt_id as product_id,
            nazwa_produktu as product_name,
            kod_produktu as product_code,
            ean,
            jednostka as unit,
            ilosc as quantity,
            cena_netto as net_price,
            cena_brutto as gross_price,
            stawka_vat as vat_rate,
            wartosc_netto as net_value,
            wartosc_brutto as gross_value,
            created_at
        FROM faktury_zakupowe_pozycje
        WHERE faktura_id = ?
        ORDER BY id ASC
        """
        
        items_result = execute_query(items_sql, (invoice_id,))
        invoice['items'] = items_result or []
        
        return success_response(invoice, "Szczegóły faktury")
        
    except Exception as e:
        print(f"Błąd pobierania szczegółów faktury: {e}")
        return error_response("Wystąpił błąd podczas pobierania faktury", 500)

@invoices_bp.route('/invoices/stats', methods=['GET'])
def get_invoices_stats():
    """
    Statystyki faktur zakupowych
    """
    try:
        stats_sql = """
        SELECT 
            COUNT(*) as total_invoices,
            COALESCE(SUM(suma_brutto), 0) as total_amount,
            COALESCE(AVG(suma_brutto), 0) as average_amount,
            COUNT(CASE WHEN DATE(data_faktury) = DATE('now') THEN 1 END) as today_invoices,
            COALESCE(SUM(CASE WHEN DATE(data_faktury) = DATE('now') THEN suma_brutto ELSE 0 END), 0) as today_amount,
            COUNT(CASE WHEN DATE(data_faktury) >= DATE('now', '-30 days') THEN 1 END) as month_invoices,
            COALESCE(SUM(CASE WHEN DATE(data_faktury) >= DATE('now', '-30 days') THEN suma_brutto ELSE 0 END), 0) as month_amount,
            COUNT(DISTINCT dostawca_id) as suppliers_count
        FROM faktury_zakupowe
        """
        
        result = execute_query(stats_sql)
        
        if not result:
            return error_response("Błąd pobierania statystyk", 500)
            
        stats = result[0]
        
        # Top dostawcy
        suppliers_sql = """
        SELECT 
            dostawca_nazwa as supplier_name,
            COUNT(*) as invoices_count,
            COALESCE(SUM(suma_brutto), 0) as total_amount
        FROM faktury_zakupowe
        GROUP BY dostawca_id, dostawca_nazwa
        ORDER BY total_amount DESC
        LIMIT 5
        """
        
        suppliers_result = execute_query(suppliers_sql)
        stats['top_suppliers'] = suppliers_result or []
        
        return success_response(stats, "Statystyki faktur")
        
    except Exception as e:
        print(f"Błąd pobierania statystyk faktur: {e}")
        return error_response("Wystąpił błąd podczas pobierania statystyk", 500)

@invoices_bp.route('/invoices/suppliers', methods=['GET'])
def get_suppliers():
    """
    Lista dostawców z faktur
    """
    try:
        suppliers_sql = """
        SELECT DISTINCT
            dostawca_id as supplier_id,
            dostawca_nazwa as supplier_name,
            dostawca_nip as supplier_nip,
            COUNT(*) as invoices_count,
            COALESCE(SUM(suma_brutto), 0) as total_amount,
            MAX(data_faktury) as last_invoice_date
        FROM faktury_zakupowe
        WHERE dostawca_id IS NOT NULL
        GROUP BY dostawca_id, dostawca_nazwa, dostawca_nip
        ORDER BY total_amount DESC
        """
        
        results = execute_query(suppliers_sql)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'suppliers': results,
            'total': len(results)
        }, f"Znaleziono {len(results)} dostawców")
        
    except Exception as e:
        print(f"Błąd pobierania dostawców: {e}")
        return error_response("Wystąpił błąd podczas pobierania dostawców", 500)

@invoices_bp.route('/invoices/recent', methods=['GET'])
def get_recent_invoices():
    """
    Ostatnie faktury (dla dashboard)
    """
    try:
        limit = int(request.args.get('limit', 10))
        
        sql_query = """
        SELECT 
            id,
            numer_faktury as invoice_number,
            data_faktury as invoice_date,
            dostawca_nazwa as supplier_name,
            suma_brutto as gross_amount,
            status,
            created_at
        FROM faktury_zakupowe
        ORDER BY data_faktury DESC, created_at DESC
        LIMIT ?
        """
        
        results = execute_query(sql_query, (limit,))
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'invoices': results,
            'total': len(results)
        }, f"Pobrano {len(results)} ostatnich faktur")
        
    except ValueError:
        return error_response("Parametr 'limit' musi być liczbą", 400)
    except Exception as e:
        print(f"Błąd pobierania ostatnich faktur: {e}")
        return error_response("Wystąpił błąd podczas pobierania faktur", 500)

@invoices_bp.route('/invoices', methods=['GET'])
def get_invoices():
    """
    Pobierz listę wszystkich faktur zakupowych
    Parametry: limit (int), offset (int)
    """
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        sql_query = """
        SELECT 
            id,
            numer_faktury as invoice_number,
            data_faktury as invoice_date,
            data_dostawy as delivery_date,
            data_platnosci as payment_date,
            dostawca_nazwa as supplier_name,
            dostawca_nip as supplier_nip,
            suma_netto as net_amount,
            suma_brutto as gross_amount,
            suma_vat as vat_amount,
            status,
            data_utworzenia as created_at
        FROM faktury_zakupowe
        ORDER BY data_faktury DESC
        LIMIT ? OFFSET ?
        """
        
        results = execute_query(sql_query, [limit, offset])
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        # Pobierz też statystyki
        stats_query = """
        SELECT 
            COUNT(*) as total_count,
            SUM(suma_brutto) as total_amount,
            AVG(suma_brutto) as average_amount
        FROM faktury_zakupowe
        """
        
        stats = execute_query(stats_query)
        stats_data = stats[0] if stats else {'total_count': 0, 'total_amount': 0, 'average_amount': 0}
            
        return success_response({
            'invoices': results,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': stats_data['total_count']
            },
            'stats': {
                'total_count': stats_data['total_count'],
                'total_amount': float(stats_data['total_amount'] or 0),
                'average_amount': float(stats_data['average_amount'] or 0)
            }
        }, f"Znaleziono {len(results)} faktur")
        
    except ValueError:
        return error_response("Parametry 'limit' i 'offset' muszą być liczbami", 400)
    except Exception as e:
        print(f"Błąd pobierania faktur: {e}")
        return error_response("Wystąpił błąd podczas pobierania faktur", 500)

@invoices_bp.route('/invoices', methods=['POST'])
def create_invoice():
    """
    Utwórz nową fakturę zakupową
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych faktury", 400)
            
        required_fields = ['numer_faktury', 'data_faktury', 'dostawca_nazwa', 'suma_brutto']
        for field in required_fields:
            if field not in data:
                return error_response(f"Brakuje wymaganego pola: {field}", 400)
        
        # Sprawdź czy faktura o tym numerze już istnieje
        check_query = "SELECT id FROM faktury_zakupowe WHERE numer_faktury = ?"
        existing = execute_query(check_query, [data['numer_faktury']])
        
        if existing:
            return error_response("Faktura o tym numerze już istnieje", 409)
        
        # Utwórz nową fakturę
        insert_query = """
        INSERT INTO faktury_zakupowe (
            numer_faktury, data_faktury, data_dostawy, data_platnosci,
            dostawca_nazwa, dostawca_nip, dostawca_adres,
            suma_netto, suma_vat, suma_brutto, waluta, status,
            typ_faktury, nr_zamowienia, sposob_platnosci, termin_platnosci,
            uwagi, data_utworzenia, user_login
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        current_time = datetime.now().isoformat()
        
        params = [
            data['numer_faktury'],
            data['data_faktury'],
            data.get('data_dostawy'),
            data.get('data_platnosci'),
            data['dostawca_nazwa'],
            data.get('dostawca_nip'),
            data.get('dostawca_adres'),
            data.get('suma_netto', 0),
            data.get('suma_vat', 0),
            data['suma_brutto'],
            data.get('waluta', 'PLN'),
            data.get('status', 'nowa'),
            data.get('typ_faktury', 'zakupowa'),
            data.get('nr_zamowienia'),
            data.get('sposob_platnosci'),
            data.get('termin_platnosci'),
            data.get('uwagi'),
            current_time,
            data.get('user_login', 'api')
        ]
        
        invoice_id = execute_insert(insert_query, params)
        
        if invoice_id is None:
            return error_response("Błąd podczas tworzenia faktury", 500)
            
        return success_response({
            'invoice_id': invoice_id,
            'numer_faktury': data['numer_faktury'],
            'created_at': current_time
        }, "Faktura została utworzona pomyślnie", 201)
        
    except Exception as e:
        print(f"Błąd tworzenia faktury: {e}")
        return error_response("Wystąpił błąd podczas tworzenia faktury", 500)

@invoices_bp.route('/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    """
    Usuń fakturę zakupową
    """
    try:
        # Sprawdź czy faktura istnieje
        check_query = "SELECT numer_faktury FROM faktury_zakupowe WHERE id = ?"
        existing = execute_query(check_query, [invoice_id])
        
        if not existing:
            return not_found_response("Faktura nie została znaleziona")
        
        # Usuń pozycje faktury
        delete_items_query = "DELETE FROM faktury_zakupowe_pozycje WHERE faktura_id = ?"
        execute_query(delete_items_query, [invoice_id])
        
        # Usuń fakturę
        delete_query = "DELETE FROM faktury_zakupowe WHERE id = ?"
        result = execute_query(delete_query, [invoice_id])
        
        if result is None:
            return error_response("Błąd podczas usuwania faktury", 500)
            
        return success_response({
            'invoice_id': invoice_id,
            'deleted': True
        }, "Faktura została usunięta pomyślnie")
        
    except Exception as e:
        print(f"Błąd usuwania faktury: {e}")
        return error_response("Wystąpił błąd podczas usuwania faktury", 500)
