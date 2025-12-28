"""
API Shifts - zarządzanie zmianami kasowymi
Otwieranie/zamykanie zmian, raporty zmian
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime

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
        
        # Debug: sprawdź jakie tabele zmian istnieją
        debug_info = {}
        
        # Sprawdź pos_zmiany ze status
        try:
            sql1 = """
            SELECT * FROM pos_zmiany 
            WHERE kasjer_login = ? AND status = 'otwarta'
            ORDER BY id DESC LIMIT 1
            """
            result1 = execute_query(sql1, (cashier,))
            debug_info['pos_zmiany_with_status'] = result1
        except Exception as e:
            debug_info['pos_zmiany_with_status_error'] = str(e)
        
        # Sprawdź pos_zmiany bez status (data_zamkniecia IS NULL)
        try:
            sql2 = """
            SELECT * FROM pos_zmiany 
            WHERE kasjer_login = ? AND data_zamkniecia IS NULL
            ORDER BY id DESC LIMIT 1
            """
            result2 = execute_query(sql2, (cashier,))
            debug_info['pos_zmiany_no_close'] = result2
        except Exception as e:
            debug_info['pos_zmiany_no_close_error'] = str(e)
        
        # Sprawdź zmiany_kasowe (nowa tabela)
        try:
            sql3 = """
            SELECT * FROM zmiany_kasowe 
            WHERE kasjer = ? AND status = 'otwarta'
            ORDER BY id DESC LIMIT 1
            """
            result3 = execute_query(sql3, (cashier,))
            debug_info['zmiany_kasowe'] = result3
        except Exception as e:
            debug_info['zmiany_kasowe_error'] = str(e)
        
        # Sprawdź strukturę tabel
        try:
            sql_info = "PRAGMA table_info(pos_zmiany)"
            table_info = execute_query(sql_info, ())
            debug_info['pos_zmiany_structure'] = table_info
        except Exception as e:
            debug_info['pos_zmiany_structure_error'] = str(e)
        
        # Zwróć dane z pierwszej dostępnej tabeli
        shift = None
        
        if debug_info.get('pos_zmiany_no_close'):
            shift = debug_info['pos_zmiany_no_close'][0]
            debug_info['source'] = 'pos_zmiany_no_close'
        elif debug_info.get('pos_zmiany_with_status'):
            shift = debug_info['pos_zmiany_with_status'][0]
            debug_info['source'] = 'pos_zmiany_with_status'
        elif debug_info.get('zmiany_kasowe'):
            shift = debug_info['zmiany_kasowe'][0]
            debug_info['source'] = 'zmiany_kasowe'
        
        if shift:
            # Dodaj debug info do odpowiedzi
            shift['debug_info'] = debug_info
            return success_response(shift, "Aktualna zmiana")
        else:
            return success_response({'debug_info': debug_info}, "Brak otwartej zmiany")
        
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
        
        # Sprawdź czy nie ma już otwartej zmiany - sprawdź w pos_zmiany
        check_sql1 = """
        SELECT id FROM pos_zmiany 
        WHERE kasjer_login = ? AND data_zamkniecia IS NULL
        """
        existing1 = execute_query(check_sql1, (cashier,))
        
        if existing1:
            return error_response("Kasjer ma już otwartą zmianę w pos_zmiany", 400)
        
        # Sprawdź w zmiany_kasowe też
        check_sql2 = """
        SELECT id FROM zmiany_kasowe 
        WHERE kasjer = ? AND status = 'otwarta'
        """
        existing2 = execute_query(check_sql2, (cashier,))
        
        if existing2:
            return error_response("Kasjer ma już otwartą zmianę w zmiany_kasowe", 400)
        
        # Otwórz nową zmianę w tabeli pos_zmiany (główna tabela)
        open_sql = """
        INSERT INTO pos_zmiany (
            kasjer_login, data_otwarcia, czas_otwarcia, 
            saldo_poczatkowe, uwagi
        ) VALUES (?, ?, ?, ?, ?)
        """
        
        current_time = datetime.now()
        today = current_time.date().isoformat()
        time_now = current_time.time().isoformat()
        
        shift_id = execute_insert(open_sql, (
            cashier, today, time_now, starting_cash, notes
        ))
        
        if shift_id:
            return success_response({
                'shift_id': shift_id,
                'cashier': cashier,
                'starting_cash': starting_cash,
                'opened_at': current_time.isoformat(),
                'table_used': 'pos_zmiany'
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
        SELECT * FROM zmiany_kasowe 
        WHERE kasjer = ? AND status = 'otwarta'
        ORDER BY data_otwarcia DESC 
        LIMIT 1
        """
        
        shift_result = execute_query(shift_sql, (cashier,))
        if not shift_result:
            return error_response("Brak otwartej zmiany do zamknięcia", 400)
        
        shift = shift_result[0]
        
        # Oblicz statystyki zmiany
        stats_sql = """
        SELECT 
            COUNT(*) as transactions_count,
            COALESCE(SUM(kwota_brutto), 0) as total_sales,
            COALESCE(SUM(CASE WHEN metoda_platnosci = 'gotowka' THEN kwota_brutto ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN metoda_platnosci = 'karta' THEN kwota_brutto ELSE 0 END), 0) as card_sales,
            COALESCE(SUM(CASE WHEN metoda_platnosci = 'przelew' THEN kwota_brutto ELSE 0 END), 0) as transfer_sales
        FROM transakcje 
        WHERE kasjer = ? 
        AND status = 'zakonczony'
        AND datetime(data_transakcji) >= datetime(?)
        """
        
        stats = execute_query(stats_sql, (cashier, shift['data_otwarcia']))
        shift_stats = stats[0] if stats else {}
        
        # Oblicz różnicę w kasie
        expected_cash = shift['saldo_poczatkowe'] + shift_stats.get('cash_sales', 0)
        cash_difference = ending_cash - expected_cash
        
        # Zamknij zmianę
        close_sql = """
        UPDATE zmiany_kasowe 
        SET 
            data_zamkniecia = ?,
            saldo_koncowe = ?,
            sprzedaz_gotowka = ?,
            sprzedaz_karta = ?,
            sprzedaz_przelew = ?,
            sprzedaz_suma = ?,
            liczba_transakcji = ?,
            roznica_kasa = ?,
            status = 'zamknieta',
            uwagi_zamkniecia = ?,
            zmodyfikowano = ?
        WHERE id = ?
        """
        
        current_time = datetime.now().isoformat()
        
        success = execute_insert(close_sql, (
            current_time,
            ending_cash,
            shift_stats.get('cash_sales', 0),
            shift_stats.get('card_sales', 0),
            shift_stats.get('transfer_sales', 0),
            shift_stats.get('total_sales', 0),
            shift_stats.get('transactions_count', 0),
            cash_difference,
            notes,
            current_time,
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
                'transfer_sales': shift_stats.get('transfer_sales', 0),
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
        # Pobierz dane zmiany
        shift_sql = "SELECT * FROM zmiany_kasowe WHERE id = ?"
        shift_result = execute_query(shift_sql, (shift_id,))
        
        if not shift_result:
            return not_found_response("Zmiana nie została znaleziona")
        
        shift = shift_result[0]
        
        # Pobierz transakcje z tej zmiany
        transactions_sql = """
        SELECT 
            t.id, t.numer_paragonu, t.data_transakcji,
            t.kwota_brutto, t.metoda_platnosci,
            k.display_name as customer_name,
            COUNT(tp.id) as items_count
        FROM transakcje t
        LEFT JOIN klienci k ON t.klient_id = k.id
        LEFT JOIN transakcje_produkty tp ON t.id = tp.transakcja_id
        WHERE t.kasjer = ? 
        AND t.status = 'zakonczony'
        AND datetime(t.data_transakcji) >= datetime(?)
        """
        
        params = [shift['kasjer'], shift['data_otwarcia']]
        
        if shift['data_zamkniecia']:
            transactions_sql += " AND datetime(t.data_transakcji) <= datetime(?)"
            params.append(shift['data_zamkniecia'])
        
        transactions_sql += " GROUP BY t.id ORDER BY t.data_transakcji"
        
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
    GET /api/shifts/history?cashier=admin&limit=10&status=closed
    """
    try:
        cashier = request.args.get('cashier')
        limit = int(request.args.get('limit', 20))
        status = request.args.get('status')  # otwarta, zamknieta
        
        sql = """
        SELECT 
            id, kasjer, data_otwarcia, data_zamkniecia,
            saldo_poczatkowe, saldo_koncowe, sprzedaz_suma,
            liczba_transakcji, roznica_kasa, status
        FROM zmiany_kasowe 
        WHERE 1=1
        """
        
        params = []
        
        if cashier:
            sql += " AND kasjer = ?"
            params.append(cashier)
        
        if status:
            sql += " AND status = ?"
            params.append(status)
        
        sql += " ORDER BY data_otwarcia DESC LIMIT ?"
        params.append(limit)
        
        shifts = execute_query(sql, params) or []
        
        return success_response(shifts, f"Historia zmian ({len(shifts)} rekordów)")
        
    except Exception as e:
        return error_response(f"Błąd pobierania historii zmian: {str(e)}", 500)

@shifts_bp.route('/shifts/debug', methods=['GET'])
def debug_shifts_tables():
    """
    Debug endpoint - sprawdza strukturę tabel związanych ze zmianami
    GET /api/shifts/debug
    """
    try:
        debug_info = {}
        
        # Sprawdź jakie tabele związane ze zmianami istnieją
        tables_sql = """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%zmian%'
        """
        tables = execute_query(tables_sql, ())
        debug_info['available_tables'] = [table['name'] for table in tables] if tables else []
        
        # Sprawdź strukturę pos_zmiany
        try:
            pos_zmiany_structure = execute_query("PRAGMA table_info(pos_zmiany)", ())
            debug_info['pos_zmiany_structure'] = pos_zmiany_structure
            
            # Sprawdź przykładowe dane
            pos_zmiany_sample = execute_query("SELECT * FROM pos_zmiany LIMIT 3", ())
            debug_info['pos_zmiany_sample'] = pos_zmiany_sample
        except Exception as e:
            debug_info['pos_zmiany_error'] = str(e)
        
        # Sprawdź czy istnieje tabela zmiany_kasowe
        try:
            zmiany_kasowe_structure = execute_query("PRAGMA table_info(zmiany_kasowe)", ())
            debug_info['zmiany_kasowe_structure'] = zmiany_kasowe_structure
            
            zmiany_kasowe_sample = execute_query("SELECT * FROM zmiany_kasowe LIMIT 3", ())
            debug_info['zmiany_kasowe_sample'] = zmiany_kasowe_sample
        except Exception as e:
            debug_info['zmiany_kasowe_error'] = str(e)
        
        # Sprawdź transakcje
        try:
            transakcje_structure = execute_query("PRAGMA table_info(pos_transakcje)", ())
            debug_info['pos_transakcje_structure'] = transakcje_structure[:10]  # Tylko pierwsze 10 kolumn
        except Exception as e:
            debug_info['pos_transakcje_error'] = str(e)
        
        return success_response(debug_info, "Informacje debugowania tabel")
        
    except Exception as e:
        return error_response(f"Błąd debugowania: {str(e)}", 500)
