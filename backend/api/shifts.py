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
        cashier = request.args.get('cashier', 'admin')  # Domyślna wartość 'admin'
        
        # Opcjonalne sprawdzenie - można usunąć jeśli nie potrzeba
        # if not cashier:
        #     return error_response("Parametr 'cashier' jest wymagany", 400)
        
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
            COALESCE(k.nazwa_firmy, k.imie || ' ' || k.nazwisko) as customer_name,
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


@shifts_bp.route('/shifts/cash-status', methods=['GET'])
def get_cash_status():
    """
    Pobierz stan gotówki dla lokalizacji
    GET /api/shifts/cash-status?location_id=5&date=2025-12-31
    
    Zwraca:
    - system_cash: gotówka w systemie (całkowita dla lokalizacji)
    - today_cash_sales: sprzedaż gotówkowa z danego dnia
    - today_cash_returns: zwroty gotówkowe z danego dnia
    - safebag_total: suma wpłat do safebaga w bieżącym miesiącu
    - expected_drawer_cash: oczekiwana gotówka w kasie (system_cash - safebag_total)
    """
    try:
        location_id = request.args.get('location_id', type=int)
        target_date = request.args.get('date', date.today().isoformat())
        
        if not location_id:
            return error_response("Parametr 'location_id' jest wymagany", 400)
        
        # Parsuj datę
        try:
            target_date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
        except:
            target_date_obj = date.today()
        
        # 1. Całkowita gotówka w systemie dla lokalizacji
        # (suma sprzedaży gotówkowej - suma zwrotów gotówkowych - suma wydatków kasowych + suma wpłat kasowych)
        
        # Sprzedaż gotówkowa (całkowita)
        cash_sales_sql = """
        SELECT COALESCE(SUM(suma_brutto), 0) as total
        FROM pos_transakcje 
        WHERE location_id = ? 
        AND forma_platnosci = 'gotowka'
        AND status = 'zakonczony'
        """
        cash_sales = execute_query(cash_sales_sql, (location_id,))
        total_cash_sales = cash_sales[0]['total'] if cash_sales else 0
        
        # Zwroty gotówkowe (całkowite)
        cash_returns_sql = """
        SELECT COALESCE(SUM(suma_zwrotu_brutto), 0) as total
        FROM pos_zwroty 
        WHERE location_id = ? 
        AND forma_platnosci = 'gotowka'
        AND status = 'zatwierdzony'
        """
        cash_returns = execute_query(cash_returns_sql, (location_id,))
        total_cash_returns = cash_returns[0]['total'] if cash_returns else 0
        
        # Operacje kasowe KP (przyjęcie gotówki) - WYKLUCZAMY kategorię 'sprzedaz'
        # bo sprzedaż jest już liczona w pos_transakcje
        # Tutaj liczymy tylko: wpłaty własne, sprzedaż kuponów za gotówkę, inne wpłaty
        kp_sql = """
        SELECT COALESCE(SUM(kwota), 0) as total
        FROM kasa_operacje 
        WHERE location_id = ? 
        AND typ_operacji = 'KP'
        AND typ_platnosci = 'gotowka'
        AND kategoria != 'sprzedaz'
        """
        kp_result = execute_query(kp_sql, (location_id,))
        total_kp = kp_result[0]['total'] if kp_result else 0
        
        # Operacje kasowe KW (wydanie gotówki) - WYKLUCZAMY kategorię 'zwroty'
        # bo zwroty są już liczone w pos_zwroty
        kw_sql = """
        SELECT COALESCE(SUM(kwota), 0) as total
        FROM kasa_operacje 
        WHERE location_id = ? 
        AND typ_operacji = 'KW'
        AND typ_platnosci = 'gotowka'
        AND kategoria != 'zwroty'
        """
        kw_result = execute_query(kw_sql, (location_id,))
        total_kw = kw_result[0]['total'] if kw_result else 0
        
        # Stan początkowy kasy (pierwsza otwarta zmiana)
        starting_cash_sql = """
        SELECT COALESCE(stan_poczatkowy, 0) as starting
        FROM pos_zmiany 
        WHERE location_id = ?
        ORDER BY id ASC
        LIMIT 1
        """
        starting = execute_query(starting_cash_sql, (location_id,))
        starting_cash = starting[0]['starting'] if starting else 0
        
        # Całkowita gotówka w systemie
        system_cash = starting_cash + total_cash_sales - total_cash_returns + total_kp - total_kw
        
        # 2. Sprzedaż gotówkowa z danego dnia
        today_sales_sql = """
        SELECT COALESCE(SUM(suma_brutto), 0) as total
        FROM pos_transakcje 
        WHERE location_id = ? 
        AND forma_platnosci = 'gotowka'
        AND status = 'zakonczony'
        AND date(data_transakcji) = ?
        """
        today_sales = execute_query(today_sales_sql, (location_id, target_date))
        today_cash_sales = today_sales[0]['total'] if today_sales else 0
        
        # 3. Zwroty gotówkowe z danego dnia
        today_returns_sql = """
        SELECT COALESCE(SUM(suma_zwrotu_brutto), 0) as total
        FROM pos_zwroty 
        WHERE location_id = ? 
        AND forma_platnosci = 'gotowka'
        AND status = 'zatwierdzony'
        AND date(data_zwrotu) = ?
        """
        today_returns = execute_query(today_returns_sql, (location_id, target_date))
        today_cash_returns = today_returns[0]['total'] if today_returns else 0
        
        # 4. Suma safebag w bieżącym miesiącu
        month_start = target_date_obj.replace(day=1).isoformat()
        safebag_sql = """
        SELECT COALESCE(SUM(kwota), 0) as total
        FROM safebag_deposits 
        WHERE location_id = ? 
        AND data_wplaty >= ?
        AND data_wplaty <= ?
        """
        safebag = execute_query(safebag_sql, (location_id, month_start, target_date))
        safebag_total = safebag[0]['total'] if safebag else 0
        
        # 5. Oczekiwana gotówka w kasie (system_cash - safebag)
        expected_drawer_cash = system_cash - safebag_total
        
        # 6. Płatności kartą z danego dnia (terminal) - używamy kwota_karta i metoda_karta
        # Obsługuje zarówno pojedyncze płatności kartą jak i płatności dzielone
        today_card_sql = """
        SELECT COALESCE(SUM(
            CASE 
                WHEN forma_platnosci = 'karta' THEN suma_brutto
                WHEN kwota_karta > 0 AND (metoda_karta = 'karta' OR metoda_karta IS NULL) THEN kwota_karta
                ELSE 0
            END
        ), 0) as total
        FROM pos_transakcje 
        WHERE location_id = ? 
        AND status = 'zakonczony'
        AND date(data_transakcji) = ?
        """
        today_card = execute_query(today_card_sql, (location_id, target_date))
        today_card_sales = today_card[0]['total'] if today_card else 0
        
        # 7. Płatności BLIK z danego dnia (terminal)
        today_blik_sql = """
        SELECT COALESCE(SUM(
            CASE 
                WHEN forma_platnosci = 'blik' THEN suma_brutto
                WHEN kwota_karta > 0 AND metoda_karta = 'blik' THEN kwota_karta
                ELSE 0
            END
        ), 0) as total
        FROM pos_transakcje 
        WHERE location_id = ? 
        AND status = 'zakonczony'
        AND date(data_transakcji) = ?
        """
        today_blik = execute_query(today_blik_sql, (location_id, target_date))
        today_blik_sales = today_blik[0]['total'] if today_blik else 0
        
        # Suma terminala (karta + BLIK)
        terminal_total = today_card_sales + today_blik_sales
        
        # 8. Suma wszystkich płatności z dnia (raport fiskalny) - gotówka + karta + BLIK
        # UWAGA: Raport fiskalny NIE uwzględnia zwrotów - to jest suma sprzedaży
        today_all_sales_sql = """
        SELECT COALESCE(SUM(suma_brutto), 0) as total
        FROM pos_transakcje 
        WHERE location_id = ? 
        AND status = 'zakonczony'
        AND date(data_transakcji) = ?
        """
        today_all = execute_query(today_all_sales_sql, (location_id, target_date))
        today_all_sales = today_all[0]['total'] if today_all else 0
        
        # 9. Suma wszystkich zwrotów z dnia (osobno do informacji)
        today_all_returns_sql = """
        SELECT COALESCE(SUM(suma_zwrotu_brutto), 0) as total
        FROM pos_zwroty 
        WHERE location_id = ? 
        AND status = 'zatwierdzony'
        AND date(data_zwrotu) = ?
        """
        today_all_ret = execute_query(today_all_returns_sql, (location_id, target_date))
        today_all_returns = today_all_ret[0]['total'] if today_all_ret else 0
        
        # Oczekiwana wartość raportu fiskalnego = tylko sprzedaż (bez zwrotów)
        fiscal_expected = today_all_sales
        
        return success_response({
            'location_id': location_id,
            'date': target_date,
            'system_cash': round(system_cash, 2),
            'today_cash_sales': round(today_cash_sales, 2),
            'today_cash_returns': round(today_cash_returns, 2),
            'today_net_cash': round(today_cash_sales - today_cash_returns, 2),
            'safebag_total_month': round(safebag_total, 2),
            'expected_drawer_cash': round(expected_drawer_cash, 2),
            'terminal': {
                'card_sales': round(today_card_sales, 2),
                'blik_sales': round(today_blik_sales, 2),
                'total': round(terminal_total, 2)
            },
            'fiscal': {
                'today_sales': round(today_all_sales, 2),
                'today_returns': round(today_all_returns, 2),
                'expected_total': round(fiscal_expected, 2)
            },
            'breakdown': {
                'starting_cash': round(starting_cash, 2),
                'total_cash_sales': round(total_cash_sales, 2),
                'total_cash_returns': round(total_cash_returns, 2),
                'total_kp': round(total_kp, 2),
                'total_kw': round(total_kw, 2)
            }
        }, "Stan gotówki")
        
    except Exception as e:
        return error_response(f"Błąd pobierania stanu gotówki: {str(e)}", 500)


@shifts_bp.route('/shifts/safebag', methods=['POST'])
def add_safebag_deposit():
    """
    Dodaj wpłatę do safebaga
    POST /api/shifts/safebag
    Body: {
        "location_id": 5,
        "kwota": 500.00,
        "numer_safebaga": "SB-2025-001",
        "kasjer_login": "admin",
        "uwagi": "Wpłata końca dnia"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        location_id = data.get('location_id')
        kwota = data.get('kwota', 0)
        numer_safebaga = data.get('numer_safebaga', '')
        kasjer_login = data.get('kasjer_login', 'admin')
        uwagi = data.get('uwagi', '')
        shift_id = data.get('shift_id')
        
        if not location_id:
            return error_response("Parametr 'location_id' jest wymagany", 400)
        
        if kwota <= 0:
            return error_response("Kwota musi być większa od 0", 400)
        
        sql = """
        INSERT INTO safebag_deposits (location_id, kwota, numer_safebaga, kasjer_login, uwagi, shift_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """
        
        deposit_id = execute_insert(sql, (location_id, kwota, numer_safebaga, kasjer_login, uwagi, shift_id))
        
        return success_response({
            'id': deposit_id,
            'location_id': location_id,
            'kwota': kwota,
            'numer_safebaga': numer_safebaga
        }, "Wpłata do safebaga zapisana")
        
    except Exception as e:
        return error_response(f"Błąd zapisywania wpłaty do safebaga: {str(e)}", 500)


@shifts_bp.route('/shifts/safebag/history', methods=['GET'])
def get_safebag_history():
    """
    Historia wpłat do safebaga
    GET /api/shifts/safebag/history?location_id=5&month=2025-12
    """
    try:
        location_id = request.args.get('location_id', type=int)
        month = request.args.get('month', date.today().strftime('%Y-%m'))
        
        if not location_id:
            return error_response("Parametr 'location_id' jest wymagany", 400)
        
        sql = """
        SELECT * FROM safebag_deposits 
        WHERE location_id = ?
        AND strftime('%Y-%m', data_wplaty) = ?
        ORDER BY data_wplaty DESC, czas_wplaty DESC
        """
        
        deposits = execute_query(sql, (location_id, month))
        
        total = sum(d['kwota'] for d in deposits) if deposits else 0
        
        return success_response({
            'deposits': deposits or [],
            'total': round(total, 2),
            'count': len(deposits) if deposits else 0
        }, "Historia safebag")
        
    except Exception as e:
        return error_response(f"Błąd pobierania historii safebag: {str(e)}", 500)
