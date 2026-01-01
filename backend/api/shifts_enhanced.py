"""
API Shifts Enhanced - rozszerzone zarządzanie zmianami kasowymi
Otwieranie/zamykanie zmian z zaawansowanymi raportami i weryfikacjami
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime, date

shifts_enhanced_bp = Blueprint('shifts_enhanced', __name__)

@shifts_enhanced_bp.route('/shifts/open-enhanced', methods=['POST'])
def open_shift_enhanced():
    """
    Otwórz zmianę z weryfikacją gotówki w kasie
    POST /api/shifts/open-enhanced
    Body: {
        "cashier": "admin",
        "starting_cash": 500.00,
        "cash_count_verified": true,
        "cash_discrepancy": 0,
        "cash_discrepancy_amount": 0,
        "notes": "Początek zmiany"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        cashier = data.get('cashier')
        starting_cash = data.get('starting_cash', 0)
        cash_count_verified = data.get('cash_count_verified', False)
        cash_discrepancy = data.get('cash_discrepancy', False)
        cash_discrepancy_amount = data.get('cash_discrepancy_amount', 0)
        notes = data.get('notes', '')
        
        if not cashier:
            return error_response("Pole 'cashier' jest wymagane", 400)
        
        # Sprawdź czy nie ma już otwartej zmiany z dzisiejszego dnia
        current_date = date.today().isoformat()
        check_sql = """
        SELECT id FROM pos_zmiany 
        WHERE kasjer_login = ? AND status = 'otwarta' AND data_zmiany = ?
        """
        existing = execute_query(check_sql, (cashier, current_date))
        
        if existing:
            return error_response("Kasjer ma już otwartą zmianę z dzisiejszego dnia", 400)
        
        # Automatycznie zamknij stare otwarte zmiany z poprzednich dni
        close_old_sql = """
        UPDATE pos_zmiany 
        SET status = 'zamknieta', czas_zakonczenia = '23:59:59'
        WHERE kasjer_login = ? AND status = 'otwarta' AND data_zmiany < ?
        """
        execute_insert(close_old_sql, (cashier, current_date))
        
        # Otwórz nową zmianę z dodatkowymi polami
        current_time = datetime.now().time().isoformat()
        
        open_sql = """
        INSERT INTO pos_zmiany (
            kasjer_login, data_zmiany, czas_rozpoczecia, 
            saldo_poczatkowe, status, uwagi,
            kasa_zweryfikowana, rozbieznosc_kasy, kwota_rozbieznosci
        ) VALUES (?, ?, ?, ?, 'otwarta', ?, ?, ?, ?)
        """
        
        shift_id = execute_insert(open_sql, (
            cashier, current_date, current_time, 
            starting_cash, notes,
            cash_count_verified, cash_discrepancy, cash_discrepancy_amount
        ))
        
        if shift_id:
            # Pobierz utworzoną zmianę
            get_shift_sql = "SELECT * FROM pos_zmiany WHERE id = ?"
            shift = execute_query(get_shift_sql, (shift_id,))
            
            return success_response({
                'shift': shift[0] if shift else None,
                'shift_id': shift_id,
                'cashier': cashier,
                'started_at': current_time,
                'starting_cash': starting_cash,
                'cash_verified': cash_count_verified,
                'cash_discrepancy': cash_discrepancy,
                'discrepancy_amount': cash_discrepancy_amount,
                'status': 'otwarta'
            }, "Zmiana kasowa została otwarta")
        else:
            return error_response("Błąd otwierania zmiany", 500)
        
    except Exception as e:
        return error_response(f"Błąd otwierania zmiany: {str(e)}", 500)

@shifts_enhanced_bp.route('/shifts/close-enhanced', methods=['POST'])
def close_shift_enhanced():
    """
    Zamknij zmianę z pełnym raportem
    POST /api/shifts/close-enhanced
    Body: {
        "cashier": "admin",
        "ending_cash": 750.00,
        "ending_cash_physical": 750.00,
        "card_terminal_system": 250.00,
        "card_terminal_actual": 250.00,
        "fiscal_printer_report": 1000.00,
        "social_media": {
            "tiktok": "Post o dzisiejszej promocji",
            "facebook": "Podzieliliśmy się zdjęciami nowych produktów",
            "instagram": "Story z behind the scenes",
            "google_business": "Odpowiedzieliśmy na recenzje"
        },
        "daily_achievements": {
            "sales_description": "Dobra sprzedaż elektroniki",
            "work_description": "Przygotowanie magazynu na nowe dostawy"
        },
        "notes": "Koniec zmiany, wszystko OK"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        cashier = data.get('cashier')
        ending_cash = data.get('ending_cash', 0)
        ending_cash_physical = data.get('ending_cash_physical', 0)
        card_terminal_system = data.get('card_terminal_system', 0)
        card_terminal_actual = data.get('card_terminal_actual', 0)
        fiscal_printer_report = data.get('fiscal_printer_report', 0)
        social_media = data.get('social_media', {})
        daily_achievements = data.get('daily_achievements', {})
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
            return error_response("Nie znaleziono otwartej zmiany dla tego kasjera", 400)
        
        shift = shift_result[0]
        
        # Oblicz statystyki ze sprzedaży (z pos_transakcje)
        shift_stats_sql = """
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
        
        stats_result = execute_query(shift_stats_sql, (cashier, shift['data_zmiany']))
        shift_stats = stats_result[0] if stats_result else {}
        
        # Pobierz location_id ze zmiany lub parametru
        location_id = data.get('location_id') or shift.get('location_id')
        
        # Pobierz sumę safebag z bieżącego dnia dla tej lokalizacji
        safebag_today_sql = """
        SELECT COALESCE(SUM(kwota), 0) as safebag_total
        FROM safebag_deposits
        WHERE data_wplaty = ? AND location_id = ?
        """
        safebag_result = execute_query(safebag_today_sql, (shift['data_zmiany'], location_id))
        safebag_today = safebag_result[0]['safebag_total'] if safebag_result else 0
        
        # Pobierz całkowity stan safebag (suma wszystkich wpłat dla lokalizacji)
        safebag_total_sql = """
        SELECT COALESCE(SUM(kwota), 0) as safebag_balance
        FROM safebag_deposits
        WHERE location_id = ?
        """
        safebag_balance_result = execute_query(safebag_total_sql, (location_id,))
        safebag_balance = safebag_balance_result[0]['safebag_balance'] if safebag_balance_result else 0
        
        # Oblicz różnice w kasie (uwzględniając safebag!)
        # Oczekiwana gotówka w kasie = Kasa systemowa - wpłaty do safebaga tego dnia
        expected_cash = shift['saldo_poczatkowe'] + shift_stats.get('cash_sales', 0)
        expected_drawer_cash = ending_cash - safebag_today  # Oczekiwana gotówka w szufladzie po wpłacie do safebaga
        
        # Różnica kasy = Kasa fizyczna - Oczekiwana gotówka w szufladzie
        # Jeśli wpłacono 100 zł do safebaga, to w szufladzie powinno być mniej o 100 zł
        cash_physical_difference = ending_cash_physical - expected_drawer_cash
        
        cash_difference = ending_cash - expected_cash
        card_terminal_difference = card_terminal_actual - card_terminal_system
        
        # Utwórz szczegółowy raport zamknięcia
        current_time = datetime.now().time().isoformat()
        current_datetime = datetime.now().isoformat()
        
        # Zapisz raport zamknięcia dnia w nowej tabeli
        daily_report_sql = """
        INSERT INTO daily_closure_reports (
            zmiana_id, kasjer_login, data_zamkniecia, czas_zamkniecia,
            kasa_system, kasa_fizyczna, roznica_kasa,
            terminal_system, terminal_rzeczywisty, roznica_terminal,
            kasa_fiskalna_raport,
            social_media_tiktok, social_media_facebook, social_media_instagram, social_media_google,
            osiagniecia_sprzedaz, osiagniecia_praca,
            uwagi_zamkniecia,
            safebag_wplaty, safebag_stan, location_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        report_id = execute_insert(daily_report_sql, (
            shift['id'], cashier, shift['data_zmiany'], current_time,
            ending_cash, ending_cash_physical, cash_physical_difference,
            card_terminal_system, card_terminal_actual, card_terminal_difference,
            fiscal_printer_report,
            social_media.get('tiktok', ''), social_media.get('facebook', ''),
            social_media.get('instagram', ''), social_media.get('google_business', ''),
            daily_achievements.get('sales_description', ''), daily_achievements.get('work_description', ''),
            notes,
            safebag_today, safebag_balance, location_id
        ))
        
        # Zamknij zmianę
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
            uwagi = ?,
            saldo_fizyczne = ?,
            roznica_fizyczna = ?,
            terminal_karta_system = ?,
            terminal_karta_rzeczywisty = ?,
            roznica_terminal = ?,
            raport_fiskalny = ?,
            raport_zamkniecia_id = ?
        WHERE id = ?
        """
        
        success = execute_insert(close_sql, (
            current_time,
            ending_cash,
            shift_stats.get('cash_sales', 0),
            shift_stats.get('card_sales', 0),
            shift_stats.get('other_sales', 0),
            shift_stats.get('transactions_count', 0),
            cash_difference,
            notes,
            ending_cash_physical,
            cash_physical_difference,
            card_terminal_system,
            card_terminal_actual,
            card_terminal_difference,
            fiscal_printer_report,
            report_id,
            shift['id']
        ))
        
        if success:
            return success_response({
                'shift_id': shift['id'],
                'report_id': report_id,
                'cashier': cashier,
                'closed_at': current_time,
                'starting_cash': shift['saldo_poczatkowe'],
                'ending_cash': ending_cash,
                'ending_cash_physical': ending_cash_physical,
                'total_sales': shift_stats.get('total_sales', 0),
                'cash_sales': shift_stats.get('cash_sales', 0),
                'card_sales': shift_stats.get('card_sales', 0),
                'other_sales': shift_stats.get('other_sales', 0),
                'transactions_count': shift_stats.get('transactions_count', 0),
                'cash_difference': cash_difference,
                'cash_physical_difference': cash_physical_difference,
                'card_terminal_difference': card_terminal_difference,
                'expected_cash': expected_cash,
                'fiscal_printer_report': fiscal_printer_report,
                'social_media': social_media,
                'daily_achievements': daily_achievements
            }, "Zmiana kasowa została zamknięta z pełnym raportem")
        else:
            return error_response("Błąd zamykania zmiany", 500)
        
    except Exception as e:
        return error_response(f"Błąd zamykania zmiany: {str(e)}", 500)

@shifts_enhanced_bp.route('/admin/daily-closure-reports', methods=['GET'])
def get_daily_closure_reports():
    """
    Pobierz raporty zamknięć dnia dla administratora
    GET /api/admin/daily-closure-reports?date_from=2025-01-01&date_to=2025-01-31&cashier=admin
    """
    try:
        date_from = request.args.get('date_from', date.today().isoformat())
        date_to = request.args.get('date_to', date.today().isoformat())
        cashier = request.args.get('cashier', '')
        
        # Base query
        base_sql = """
        SELECT 
            dcr.*,
            pz.kasjer_login,
            pz.data_zmiany,
            pz.czas_rozpoczecia,
            pz.saldo_poczatkowe,
            pz.sprzedaz_gotowka,
            pz.sprzedaz_karta,
            pz.sprzedaz_inne,
            pz.liczba_transakcji
        FROM daily_closure_reports dcr
        JOIN pos_zmiany pz ON dcr.zmiana_id = pz.id
        WHERE dcr.data_zamkniecia BETWEEN ? AND ?
        """
        
        params = [date_from, date_to]
        
        if cashier:
            base_sql += " AND dcr.kasjer_login = ?"
            params.append(cashier)
        
        base_sql += " ORDER BY dcr.data_zamkniecia DESC, dcr.czas_zamkniecia DESC"
        
        reports = execute_query(base_sql, params)
        
        # Oblicz podsumowania
        summary_sql = """
        SELECT 
            COUNT(*) as total_shifts,
            SUM(pz.sprzedaz_gotowka + pz.sprzedaz_karta + pz.sprzedaz_inne) as total_sales,
            SUM(pz.sprzedaz_gotowka) as total_cash_sales,
            SUM(pz.sprzedaz_karta) as total_card_sales,
            SUM(pz.liczba_transakcji) as total_transactions,
            SUM(dcr.roznica_kasa) as total_cash_differences,
            SUM(dcr.roznica_terminal) as total_terminal_differences
        FROM daily_closure_reports dcr
        JOIN pos_zmiany pz ON dcr.zmiana_id = pz.id
        WHERE dcr.data_zamkniecia BETWEEN ? AND ?
        """ + (" AND dcr.kasjer_login = ?" if cashier else "")
        
        summary = execute_query(summary_sql, params)
        
        return success_response({
            'reports': reports or [],
            'summary': summary[0] if summary else {},
            'filters': {
                'date_from': date_from,
                'date_to': date_to,
                'cashier': cashier
            }
        }, f"Znaleziono {len(reports or [])} raportów zamknięć")
        
    except Exception as e:
        return error_response(f"Błąd pobierania raportów: {str(e)}", 500)

@shifts_enhanced_bp.route('/admin/daily-closure-reports/<int:report_id>', methods=['GET'])
def get_daily_closure_report_details(report_id):
    """
    Pobierz szczegóły raportu zamknięcia dnia
    GET /api/admin/daily-closure-reports/123
    """
    try:
        sql = """
        SELECT 
            dcr.*,
            pz.*
        FROM daily_closure_reports dcr
        JOIN pos_zmiany pz ON dcr.zmiana_id = pz.id
        WHERE dcr.id = ?
        """
        
        result = execute_query(sql, (report_id,))
        
        if not result:
            return not_found_response("Raport nie został znaleziony")
        
        report = result[0]
        
        # Pobierz także transakcje z tej zmiany
        transactions_sql = """
        SELECT * FROM pos_transakcje 
        WHERE kasjer_login = ? AND data_transakcji = ? AND status = 'zakonczony'
        ORDER BY czas_transakcji DESC
        """
        
        transactions = execute_query(transactions_sql, (report['kasjer_login'], report['data_zmiany']))
        
        return success_response({
            'report': report,
            'transactions': transactions or []
        }, "Szczegóły raportu zamknięcia")
        
    except Exception as e:
        return error_response(f"Błąd pobierania szczegółów raportu: {str(e)}", 500)
