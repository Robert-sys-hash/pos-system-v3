"""
API Shifts - zarządzanie zmianami kasowymi (POPRAWIONA WERSJA)
Otwieranie/zamykanie zmian, raporty zmian
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime, date

shifts_bp = Blueprint('shifts', __name__)

@shifts_bp.route('/shifts/current', methods=['GET'])
def get_current_shift():
    """
    Pobierz aktualną otwartą zmianę
    GET /api/shifts/current?cashier=admin
    """
    try:
        cashier = request.args.get('cashier')
        
        if not cashier:
            return error_response("Parametr 'cashier' jest wymagany", 400)
        
        # Zapytanie dopasowane do rzeczywistej struktury tabeli pos_zmiany
        sql = """
        SELECT * FROM pos_zmiany 
        WHERE kasjer_login = ? AND status = 'otwarta'
        ORDER BY id DESC 
        LIMIT 1
        """
        
        result = execute_query(sql, (cashier,))
        
        if result:
            shift = result[0]
            
            # Dodaj statystyki bieżącej zmiany z pos_transakcje
            stats_sql = """
            SELECT 
                COUNT(*) as transactions_count,
                COALESCE(SUM(suma_brutto), 0) as total_sales,
                COALESCE(SUM(CASE WHEN forma_platnosci = 'gotowka' THEN suma_brutto ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN forma_platnosci = 'karta' THEN suma_brutto ELSE 0 END), 0) as card_sales
            FROM pos_transakcje 
            WHERE kasjer_login = ? 
            AND status = 'zakonczony'
            AND data_transakcji >= ?
            """
            
            stats = execute_query(stats_sql, (cashier, shift['data_zmiany']))
            if stats:
                shift.update(stats[0])
            
            return success_response(shift, "Aktualna zmiana")
        else:
            return success_response(None, "Brak otwartej zmiany")
        
    except Exception as e:
        return error_response(f"Błąd pobierania aktualnej zmiany: {str(e)}", 500)

@shifts_bp.route('/shifts/open', methods=['POST'])
def open_shift():
    """
    Otwarcie nowej zmiany kasowej
    POST /api/shifts/open
    Body: {
        "cashier": "admin",
        "starting_cash": 500.00,
        "notes": "Początek zmiany"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        cashier = data.get('cashier')
        starting_cash = data.get('starting_cash', 0)
        notes = data.get('notes', '')
        
        if not cashier:
            return error_response("Pole 'cashier' jest wymagane", 400)
        
        # Sprawdź czy nie ma już otwartej zmiany
        check_sql = """
        SELECT id FROM pos_zmiany 
        WHERE kasjer_login = ? AND status = 'otwarta'
        """
        existing = execute_query(check_sql, (cashier,))
        if existing:
            return error_response("Kasjer ma już otwartą zmianę", 400)
        
        # Otwórz nową zmianę - dopasowane do struktury pos_zmiany
        open_sql = """
        INSERT INTO pos_zmiany (
            kasjer_login, data_zmiany, czas_rozpoczecia, 
            status, saldo_poczatkowe, uwagi
        ) VALUES (?, ?, ?, 'otwarta', ?, ?)
        """
        
        current_date = date.today().isoformat()
        current_time = datetime.now().time().isoformat()
        
        shift_id = execute_insert(open_sql, (
            cashier, current_date, current_time, starting_cash, notes
        ))
        
        if shift_id:
            return success_response({
                'shift_id': shift_id,
                'cashier': cashier,
                'starting_cash': starting_cash,
                'opened_at': current_date + ' ' + current_time,
                'status': 'otwarta'
            }, "Zmiana kasowa została otwarta")
        else:
            return error_response("Błąd otwierania zmiany", 500)
        
    except Exception as e:
        return error_response(f"Błąd otwierania zmiany: {str(e)}", 500)

@shifts_bp.route('/shifts/close', methods=['POST'])
def close_shift():
    """
    Zamknięcie zmiany kasowej
    POST /api/shifts/close
    Body: {
        "cashier": "admin", 
        "ending_cash": 750.00,
        "notes": "Koniec zmiany, wszystko OK"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        cashier = data.get('cashier')
        ending_cash = data.get('ending_cash', 0)
        notes = data.get('notes', '')
        
        if not cashier:
            return error_response("Pole 'cashier' jest wymagane", 400)
        
        # Znajdź otwartą zmianę
        shift_sql = """
        SELECT * FROM pos_zmiany 
        WHERE kasjer_login = ? AND status = 'otwarta'
        ORDER BY id DESC 
        LIMIT 1
        """
        
        shift_result = execute_query(shift_sql, (cashier,))
        if not shift_result:
            return error_response("Brak otwartej zmiany do zamknięcia", 400)
        
        shift = shift_result[0]
        
        # Oblicz statystyki zmiany z pos_transakcje
        stats_sql = """
        SELECT 
            COUNT(*) as transactions_count,
            COALESCE(SUM(suma_brutto), 0) as total_sales,
            COALESCE(SUM(CASE WHEN forma_platnosci = 'gotowka' THEN suma_brutto ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN forma_platnosci = 'karta' THEN suma_brutto ELSE 0 END), 0) as card_sales,
            COALESCE(SUM(CASE WHEN forma_platnosci NOT IN ('gotowka', 'karta') THEN suma_brutto ELSE 0 END), 0) as other_sales
        FROM pos_transakcje 
        WHERE kasjer_login = ? 
        AND status = 'zakonczony'
        AND data_transakcji >= ?
        """
        
        stats = execute_query(stats_sql, (cashier, shift['data_zmiany']))
        shift_stats = stats[0] if stats else {
            'transactions_count': 0, 'total_sales': 0, 'cash_sales': 0, 'card_sales': 0, 'other_sales': 0
        }
        
        # Oblicz różnicę w kasie
        expected_cash = shift['saldo_poczatkowe'] + shift_stats.get('cash_sales', 0)
        cash_difference = ending_cash - expected_cash
        
        # Zamknij zmianę - dopasowane do struktury pos_zmiany
        close_sql = """
        UPDATE pos_zmiany 
        SET 
            czas_zakonczenia = ?,
            saldo_koncowe = ?,
            sprzedaz_gotowka = ?,
            sprzedaz_karta = ?,
            sprzedaz_inne = ?,
            liczba_transakcji = ?,
            roznica = ?,
            status = 'zamknieta',
            uwagi = ?
        WHERE id = ?
        """
        
        current_time = datetime.now().time().isoformat()
        
        success = execute_insert(close_sql, (
            current_time,
            ending_cash,
            shift_stats.get('cash_sales', 0),
            shift_stats.get('card_sales', 0),
            shift_stats.get('other_sales', 0),
            shift_stats.get('transactions_count', 0),
            cash_difference,
            notes,
            shift['id']
        ))
        
        if success:
            return success_response({
                'shift_id': shift['id'],
                'cashier': cashier,
                'closed_at': current_time,
                'starting_cash': shift['saldo_poczatkowe'],
                'ending_cash': ending_cash,
                'total_sales': shift_stats.get('total_sales', 0),
                'cash_sales': shift_stats.get('cash_sales', 0),
                'card_sales': shift_stats.get('card_sales', 0),
                'other_sales': shift_stats.get('other_sales', 0),
                'transactions_count': shift_stats.get('transactions_count', 0),
                'cash_difference': cash_difference,
                'expected_cash': expected_cash
            }, "Zmiana kasowa została zamknięta")
        else:
            return error_response("Błąd zamykania zmiany", 500)
        
    except Exception as e:
        return error_response(f"Błąd zamykania zmiany: {str(e)}", 500)

@shifts_bp.route('/shifts/<int:shift_id>/report', methods=['GET'])
def get_shift_report(shift_id):
    """
    Raport szczegółowy zmiany kasowej
    GET /api/shifts/123/report
    """
    try:
        # Pobierz dane zmiany z pos_zmiany
        shift_sql = "SELECT * FROM pos_zmiany WHERE id = ?"
        shift_result = execute_query(shift_sql, (shift_id,))
        
        if not shift_result:
            return not_found_response("Zmiana nie została znaleziona")
        
        shift = shift_result[0]
        
        # Pobierz transakcje z tej zmiany z pos_transakcje
        transactions_sql = """
        SELECT 
            t.id, t.numer_paragonu, t.data_transakcji,
            t.suma_brutto, t.forma_platnosci,
            k.nazwa as customer_name,
            COUNT(tp.id) as items_count
        FROM pos_transakcje t
        LEFT JOIN pos_klienci k ON t.klient_id = k.id
        LEFT JOIN pos_pozycje tp ON t.id = tp.transakcja_id
        WHERE t.kasjer_login = ? 
        AND t.status = 'zakonczony'
        AND t.data_transakcji >= ?
        """
        
        params = [shift['kasjer_login'], shift['data_zmiany']]
        
        # Jeśli zmiana jest zamknięta, ograniczamy do czasu zamknięcia
        if shift['czas_zakonczenia']:
            transactions_sql += " AND t.czas_transakcji <= ?"
            params.append(shift['czas_zakonczenia'])
        
        transactions_sql += " GROUP BY t.id ORDER BY t.data_transakcji, t.czas_transakcji"
        
        transactions = execute_query(transactions_sql, params) or []
        
        # Dodaj transakcje do raportu
        shift['transactions'] = transactions
        shift['transactions_count'] = len(transactions)
        
        return success_response(shift, "Raport zmiany kasowej")
        
    except Exception as e:
        return error_response(f"Błąd generowania raportu zmiany: {str(e)}", 500)

@shifts_bp.route('/shifts/history', methods=['GET'])
def get_shifts_history():
    """
    Historia zmian kasowych
    GET /api/shifts/history?cashier=admin&limit=10&status=zamknieta
    """
    try:
        cashier = request.args.get('cashier')
        limit = int(request.args.get('limit', 20))
        status = request.args.get('status')  # otwarta, zamknieta
        
        sql = """
        SELECT 
            id, kasjer_login, data_zmiany, czas_rozpoczecia, czas_zakonczenia,
            saldo_poczatkowe, saldo_koncowe, sprzedaz_gotowka, sprzedaz_karta,
            liczba_transakcji, roznica, status, uwagi
        FROM pos_zmiany 
        WHERE 1=1
        """
        
        params = []
        
        if cashier:
            sql += " AND kasjer_login = ?"
            params.append(cashier)
        
        if status:
            sql += " AND status = ?"
            params.append(status)
        
        sql += " ORDER BY data_zmiany DESC, id DESC LIMIT ?"
        params.append(limit)
        
        shifts = execute_query(sql, params) or []
        
        return success_response(shifts, f"Historia zmian ({len(shifts)} rekordów)")
        
    except Exception as e:
        return error_response(f"Błąd pobierania historii zmian: {str(e)}", 500)

@shifts_bp.route('/shifts/debug', methods=['GET'])
def debug_shifts_tables():
    """
    Debug endpoint - sprawdza strukturę tabel
    GET /api/shifts/debug
    """
    try:
        debug_info = {}
        
        # Sprawdź strukturę pos_zmiany
        try:
            pos_zmiany_structure = execute_query("PRAGMA table_info(pos_zmiany)", ())
            debug_info['pos_zmiany_structure'] = pos_zmiany_structure
            
            pos_zmiany_sample = execute_query("SELECT * FROM pos_zmiany LIMIT 3", ())
            debug_info['pos_zmiany_sample'] = pos_zmiany_sample
            
            count = execute_query("SELECT COUNT(*) as count FROM pos_zmiany", ())
            debug_info['pos_zmiany_count'] = count[0]['count'] if count else 0
        except Exception as e:
            debug_info['pos_zmiany_error'] = str(e)
        
        # Sprawdź pos_transakcje
        try:
            transakcje_structure = execute_query("PRAGMA table_info(pos_transakcje)", ())
            debug_info['pos_transakcje_structure'] = [col for col in transakcje_structure[:15]]  # Pierwsze 15 kolumn
        except Exception as e:
            debug_info['pos_transakcje_error'] = str(e)
        
        return success_response(debug_info, "Informacje debugowania tabel")
        
    except Exception as e:
        return error_response(f"Błąd debugowania: {str(e)}", 500)
