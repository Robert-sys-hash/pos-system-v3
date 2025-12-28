"""
API endpoint dla systemu rabatów POS
Zarządzanie rabatami, stosowanie rabatów, raporty
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime, date
import uuid

rabaty_bp = Blueprint('rabaty', __name__)

@rabaty_bp.route('/rabaty', methods=['GET'])
def get_rabaty():
    """
    Pobierz wszystkie aktywne rabaty z informacjami o limitach
    """
    try:
        # Sprawdź filtry
        aktywny = request.args.get('aktywny', '1')
        user_id = request.args.get('user_id', '')
        
        if aktywny == '1':
            query = """
            SELECT 
                r.*,
                -- Limity miesięczne dla użytkownika
                COALESCE(lm.wykorzystana_kwota, 0) as wykorzystana_kwota_miesiac,
                COALESCE(lm.wykorzystana_ilosc, 0) as wykorzystana_ilosc_miesiac,
                -- Limity dzienne dla użytkownika  
                COALESCE(ld.wykorzystana_kwota, 0) as wykorzystana_kwota_dzien,
                COALESCE(ld.wykorzystana_ilosc, 0) as wykorzystana_ilosc_dzien,
                -- Status dostępności
                CASE 
                    WHEN r.limit_miesieczny_aktywny = 1 AND r.limit_miesieczny_kwota > 0 
                         AND COALESCE(lm.wykorzystana_kwota, 0) >= r.limit_miesieczny_kwota THEN 'LIMIT_MIESIECZNY_KWOTA'
                    WHEN r.limit_miesieczny_aktywny = 1 AND r.limit_miesieczny_ilosc > 0 
                         AND COALESCE(lm.wykorzystana_ilosc, 0) >= r.limit_miesieczny_ilosc THEN 'LIMIT_MIESIECZNY_ILOSC'
                    WHEN r.limit_dzienny_aktywny = 1 AND r.limit_dzienny_kwota > 0 
                         AND COALESCE(ld.wykorzystana_kwota, 0) >= r.limit_dzienny_kwota THEN 'LIMIT_DZIENNY_KWOTA'
                    WHEN r.limit_dzienny_aktywny = 1 AND r.limit_dzienny_ilosc > 0 
                         AND COALESCE(ld.wykorzystana_ilosc, 0) >= r.limit_dzienny_ilosc THEN 'LIMIT_DZIENNY_ILOSC'
                    ELSE 'DOSTEPNY'
                END as status_dostepnosci
            FROM rabaty r
            LEFT JOIN rabaty_limity_miesieczne lm ON r.id = lm.rabat_id 
                AND lm.user_id = ? AND lm.miesiac_rok = strftime('%Y-%m', 'now')
            LEFT JOIN rabaty_limity_dzienne ld ON r.id = ld.rabat_id 
                AND ld.user_id = ? AND ld.dzien = date('now')
            WHERE r.aktywny = 1
            ORDER BY r.nazwa
            """
            params = (user_id, user_id)
        elif aktywny == '0':
            query = "SELECT * FROM rabaty WHERE aktywny = 0 ORDER BY created_at DESC"
            params = ()
        else:
            query = "SELECT * FROM rabaty ORDER BY created_at DESC"
            params = ()
            
        results = execute_query(query, params)
        if results is None:
            return error_response("Błąd bazy danych", 500)
            
        return success_response("Pobrano rabaty", {"rabaty": results})
        
    except Exception as e:
        print(f"Błąd get_rabaty: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty', methods=['POST'])
def create_rabat():
    """
    Utwórz nowy rabat
    """
    try:
        data = request.get_json()
        
        # Walidacja wymaganych pól
        required_fields = ['nazwa', 'typ_rabatu', 'wartosc']
        for field in required_fields:
            if field not in data:
                return error_response(f"Pole {field} jest wymagane", 400)
        
        # Walidacja typu rabatu
        if data['typ_rabatu'] not in ['procentowy', 'kwotowy']:
            return error_response("Typ rabatu musi być 'procentowy' lub 'kwotowy'", 400)
            
        # Walidacja wartości
        if float(data['wartosc']) < 0:
            return error_response("Wartość rabatu nie może być ujemna", 400)
            
        # Sprawdź unikalność nazwy
        existing = execute_query("SELECT id FROM rabaty WHERE nazwa = ?", (data['nazwa'],))
        if existing:
            return error_response("Rabat o tej nazwie już istnieje", 400)
            
        query = """
        INSERT INTO rabaty (
            nazwa, typ_rabatu, wartosc, opis, kod_rabatu, wymagane_uprawnienie,
            limit_miesieczny_aktywny, limit_miesieczny_kwota, limit_miesieczny_ilosc,
            limit_dzienny_aktywny, limit_dzienny_kwota, limit_dzienny_ilosc,
            minimum_koszyka, maksimum_koszyka, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            data['nazwa'],
            data['typ_rabatu'],
            data['wartosc'],
            data.get('opis', ''),
            data.get('kod_rabatu', ''),
            data.get('wymagane_uprawnienie', 'pracownik'),
            data.get('limit_miesieczny_aktywny', 0),
            data.get('limit_miesieczny_kwota', 0),
            data.get('limit_miesieczny_ilosc', 0),
            data.get('limit_dzienny_aktywny', 0),
            data.get('limit_dzienny_kwota', 0),
            data.get('limit_dzienny_ilosc', 0),
            data.get('minimum_koszyka', 0),
            data.get('maksimum_koszyka', None),
            data.get('created_by', 'admin')
        )
        
        rabat_id = execute_insert(query, params)
        
        if rabat_id:
            return success_response("Rabat został utworzony", {"rabat_id": rabat_id})
        else:
            return error_response("Nie udało się utworzyć rabatu", 500)
            
    except Exception as e:
        print(f"Błąd create_rabat: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/<int:rabat_id>', methods=['PUT'])
def update_rabat(rabat_id):
    """
    Aktualizuj rabat
    """
    try:
        data = request.get_json()
        
        # Sprawdź czy rabat istnieje
        existing = execute_query("SELECT id FROM rabaty WHERE id = ?", (rabat_id,))
        if not existing:
            return not_found_response("Rabat nie został znaleziony")
            
        # Walidacja
        if 'typ_rabatu' in data and data['typ_rabatu'] not in ['procentowy', 'kwotowy']:
            return error_response("Typ rabatu musi być 'procentowy' lub 'kwotowy'", 400)
            
        if 'wartosc' in data and float(data['wartosc']) < 0:
            return error_response("Wartość rabatu nie może być ujemna", 400)
            
        # Sprawdź unikalność nazwy (jeśli zmieniana)
        if 'nazwa' in data:
            existing_name = execute_query("SELECT id FROM rabaty WHERE nazwa = ? AND id != ?", (data['nazwa'], rabat_id))
            if existing_name:
                return error_response("Rabat o tej nazwie już istnieje", 400)
        
        # Przygotuj zapytanie UPDATE
        update_fields = []
        params = []
        
        updatable_fields = [
            'nazwa', 'typ_rabatu', 'wartosc', 'opis', 'kod_rabatu', 'wymagane_uprawnienie',
            'aktywny', 'limit_miesieczny_aktywny', 'limit_miesieczny_kwota', 'limit_miesieczny_ilosc',
            'limit_dzienny_aktywny', 'limit_dzienny_kwota', 'limit_dzienny_ilosc',
            'minimum_koszyka', 'maksimum_koszyka'
        ]
        
        for field in updatable_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                params.append(data[field])
        
        if not update_fields:
            return error_response("Brak danych do aktualizacji", 400)
            
        params.append(rabat_id)
        query = f"UPDATE rabaty SET {', '.join(update_fields)} WHERE id = ?"
        
        result = execute_insert(query, params)
        
        if result:
            return success_response("Rabat został zaktualizowany")
        else:
            return error_response("Nie udało się zaktualizować rabatu", 500)
            
    except Exception as e:
        print(f"Błąd update_rabat: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/<int:rabat_id>', methods=['DELETE'])
def delete_rabat(rabat_id):
    """
    Usuń rabat (soft delete - ustaw aktywny = 0)
    """
    try:
        # Sprawdź czy rabat istnieje
        existing = execute_query("SELECT id FROM rabaty WHERE id = ?", (rabat_id,))
        if not existing:
            return not_found_response("Rabat nie został znaleziony")
            
        # Soft delete
        result = execute_insert("UPDATE rabaty SET aktywny = 0 WHERE id = ?", (rabat_id,))
        
        if result:
            return success_response("Rabat został dezaktywowany")
        else:
            return error_response("Nie udało się dezaktywować rabatu", 500)
            
    except Exception as e:
        print(f"Błąd delete_rabat: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/calculate', methods=['POST'])
def calculate_rabat():
    """
    Oblicz rabat dla podanej kwoty i rabatu
    """
    try:
        data = request.get_json()
        
        if 'rabat_id' not in data or 'kwota_koszyka' not in data:
            return error_response("Pole rabat_id i kwota_koszyka są wymagane", 400)
            
        rabat_id = data['rabat_id']
        kwota_koszyka = float(data['kwota_koszyka'])
        user_id = data.get('user_id', '')
        
        # Pobierz rabat
        rabat = execute_query("SELECT * FROM rabaty WHERE id = ? AND aktywny = 1", (rabat_id,))
        if not rabat:
            return error_response("Rabat nie został znaleziony lub jest nieaktywny", 404)
            
        rabat = rabat[0]
        
        # Sprawdź minimum i maksimum koszyka
        if kwota_koszyka < rabat['minimum_koszyka']:
            return error_response(f"Minimalna wartość koszyka: {rabat['minimum_koszyka']} zł", 400)
            
        if rabat['maksimum_koszyka'] and kwota_koszyka > rabat['maksimum_koszyka']:
            return error_response(f"Maksymalna wartość koszyka: {rabat['maksimum_koszyka']} zł", 400)
        
        # Sprawdź limity miesięczne
        if rabat['limit_miesieczny_aktywny']:
            limity_m = execute_query("""
                SELECT wykorzystana_kwota, wykorzystana_ilosc 
                FROM rabaty_limity_miesieczne 
                WHERE rabat_id = ? AND user_id = ? AND miesiac_rok = strftime('%Y-%m', 'now')
            """, (rabat_id, user_id))
            
            if limity_m:
                limity_m = limity_m[0]
                if (rabat['limit_miesieczny_kwota'] > 0 and 
                    limity_m['wykorzystana_kwota'] >= rabat['limit_miesieczny_kwota']):
                    return error_response("Przekroczony miesięczny limit kwotowy", 400)
                    
                if (rabat['limit_miesieczny_ilosc'] > 0 and 
                    limity_m['wykorzystana_ilosc'] >= rabat['limit_miesieczny_ilosc']):
                    return error_response("Przekroczony miesięczny limit ilościowy", 400)
        
        # Sprawdź limity dzienne
        if rabat['limit_dzienny_aktywny']:
            limity_d = execute_query("""
                SELECT wykorzystana_kwota, wykorzystana_ilosc 
                FROM rabaty_limity_dzienne 
                WHERE rabat_id = ? AND user_id = ? AND dzien = date('now')
            """, (rabat_id, user_id))
            
            if limity_d:
                limity_d = limity_d[0]
                if (rabat['limit_dzienny_kwota'] > 0 and 
                    limity_d['wykorzystana_kwota'] >= rabat['limit_dzienny_kwota']):
                    return error_response("Przekroczony dzienny limit kwotowy", 400)
                    
                if (rabat['limit_dzienny_ilosc'] > 0 and 
                    limity_d['wykorzystana_ilosc'] >= rabat['limit_dzienny_ilosc']):
                    return error_response("Przekroczony dzienny limit ilościowy", 400)
        
        # Oblicz rabat
        if rabat['typ_rabatu'] == 'procentowy':
            kwota_rabatu = (kwota_koszyka * rabat['wartosc']) / 100
        else:  # kwotowy
            kwota_rabatu = min(rabat['wartosc'], kwota_koszyka)  # Nie więcej niż wartość koszyka
            
        kwota_po_rabacie = kwota_koszyka - kwota_rabatu
        
        return success_response("Rabat obliczony", {
            "rabat": rabat,
            "kwota_przed_rabatem": kwota_koszyka,
            "kwota_rabatu": round(kwota_rabatu, 2),
            "kwota_po_rabacie": round(kwota_po_rabacie, 2),
            "procent_rabatu": round((kwota_rabatu / kwota_koszyka) * 100, 2) if kwota_koszyka > 0 else 0
        })
        
    except Exception as e:
        print(f"Błąd calculate_rabat: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/apply', methods=['POST'])
def apply_rabat():
    """
    Zastosuj rabat do transakcji
    """
    try:
        data = request.get_json()
        
        required_fields = ['rabat_id', 'kwota_przed_rabatem', 'transakcja_id', 'user_id']
        for field in required_fields:
            if field not in data:
                return error_response(f"Pole {field} jest wymagane", 400)
        
        rabat_id = data['rabat_id']
        kwota_przed_rabatem = float(data['kwota_przed_rabatem'])
        transakcja_id = data['transakcja_id']
        user_id = data['user_id']
        
        # Sprawdź czy transakcja istnieje
        transakcja = execute_query("SELECT id, status FROM pos_transakcje WHERE id = ?", (transakcja_id,))
        if not transakcja:
            return error_response("Transakcja nie została znaleziona", 404)
            
        if transakcja[0]['status'] != 'w_trakcie':
            return error_response("Można zastosować rabat tylko do transakcji w trakcie", 400)
        
        # Najpierw oblicz rabat (zawiera walidację)
        calc_result = calculate_rabat()
        calc_data = calc_result.get_json()
        
        if calc_data['status'] != 'success':
            return calc_result
            
        rabat_info = calc_data['data']
        kwota_rabatu = rabat_info['kwota_rabatu']
        kwota_po_rabacie = rabat_info['kwota_po_rabacie']
        
        # Zapisz użycie rabatu
        query = """
        INSERT INTO rabaty_uzycie (
            rabat_id, transakcja_id, user_id, kwota_przed_rabatem, 
            kwota_rabatu, kwota_po_rabacie, notatka, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            rabat_id, transakcja_id, user_id, kwota_przed_rabatem,
            kwota_rabatu, kwota_po_rabacie, 
            data.get('notatka', ''), data.get('ip_address', '')
        )
        
        uzycie_id = execute_insert(query, params)
        
        if uzycie_id:
            # Aktualizuj transakcję
            execute_query("""
                UPDATE pos_transakcje 
                SET suma_rabatow = suma_rabatow + ?, 
                    ilosc_rabatow = ilosc_rabatow + 1,
                    suma_brutto = suma_brutto - ?
                WHERE id = ?
            """, (kwota_rabatu, kwota_rabatu, transakcja_id))
            
            return success_response("Rabat został zastosowany", {
                "uzycie_id": uzycie_id,
                "kwota_rabatu": kwota_rabatu,
                "kwota_po_rabacie": kwota_po_rabacie
            })
        else:
            return error_response("Nie udało się zastosować rabatu", 500)
            
    except Exception as e:
        print(f"Błąd apply_rabat: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/raporty/dzienne', methods=['GET'])
def get_raport_rabaty_dzienne():
    """
    Raport rabatów dziennych
    """
    try:
        data_od = request.args.get('data_od', date.today().strftime('%Y-%m-%d'))
        data_do = request.args.get('data_do', date.today().strftime('%Y-%m-%d'))
        user_id = request.args.get('user_id', '')
        rabat_id = request.args.get('rabat_id', '')
        
        query = """
        SELECT 
            ru.dzien,
            r.id as rabat_id,
            r.nazwa as rabat_nazwa,
            r.typ_rabatu,
            ru.user_id as kasjer,
            COUNT(*) as ilosc_uzyc,
            SUM(ru.kwota_rabatu) as suma_rabatow,
            AVG(ru.kwota_rabatu) as sredni_rabat,
            SUM(ru.kwota_przed_rabatem) as suma_przed_rabatem,
            SUM(ru.kwota_po_rabacie) as suma_po_rabacie,
            MIN(ru.kwota_rabatu) as min_rabat,
            MAX(ru.kwota_rabatu) as max_rabat
        FROM rabaty_uzycie ru
        JOIN rabaty r ON ru.rabat_id = r.id
        WHERE ru.dzien BETWEEN ? AND ?
        """
        params = [data_od, data_do]
        
        if user_id:
            query += " AND ru.user_id = ?"
            params.append(user_id)
        
        if rabat_id:
            query += " AND ru.rabat_id = ?"
            params.append(rabat_id)
            
        query += " GROUP BY ru.dzien, ru.rabat_id, ru.user_id ORDER BY ru.dzien DESC, r.nazwa"
        
        results = execute_query(query, params)
        if results is None:
            return error_response("Błąd bazy danych", 500)
            
        # Podsumowanie
        summary_query = """
        SELECT 
            COUNT(DISTINCT ru.dzien) as dni_z_rabatami,
            COUNT(DISTINCT ru.rabat_id) as total_uzyc,
            SUM(ilosc_uzyc) as suma_uzyc,
            SUM(suma_rabatow) as suma_wszystkich_rabatow,
            AVG(sredni_rabat) as sredni_rabat_globalny
        FROM (
            SELECT 
                ru.dzien,
                ru.rabat_id,
                COUNT(*) as ilosc_uzyc,
                SUM(ru.kwota_rabatu) as suma_rabatow,
                AVG(ru.kwota_rabatu) as sredni_rabat
            FROM rabaty_uzycie ru
            JOIN rabaty r ON ru.rabat_id = r.id
            WHERE ru.dzien BETWEEN ? AND ?
        """
        summary_params = [data_od, data_do]
        
        if user_id:
            summary_query += " AND ru.user_id = ?"
            summary_params.append(user_id)
        
        if rabat_id:
            summary_query += " AND ru.rabat_id = ?"
            summary_params.append(rabat_id)
            
        summary_query += " GROUP BY ru.dzien, ru.rabat_id, ru.user_id) subquery"
            
        summary = execute_query(summary_query, summary_params)
        
        return success_response("Raport dzienny pobrany", {
            "raporty": results,
            "podsumowanie": summary[0] if summary else {},
            "okres": {"od": data_od, "do": data_do}
        })
        
    except Exception as e:
        print(f"Błąd get_raport_rabaty_dzienne: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/raporty/miesieczne', methods=['GET'])
def get_raport_rabaty_miesieczne():
    """
    Raport rabatów miesięcznych
    """
    try:
        miesiac = request.args.get('miesiac', date.today().strftime('%Y-%m'))
        user_id = request.args.get('user_id', '')
        
        query = """
        SELECT * FROM v_raporty_rabaty_miesieczne 
        WHERE miesiac_rok = ?
        """
        params = [miesiac]
        
        if user_id:
            query += " AND kasjer = ?"
            params.append(user_id)
            
        query += " ORDER BY rabat_nazwa, kasjer"
        
        results = execute_query(query, params)
        if results is None:
            return error_response("Błąd bazy danych", 500)
            
        return success_response("Raport miesięczny pobrany", {
            "raporty": results,
            "miesiac": miesiac
        })
        
    except Exception as e:
        print(f"Błąd get_raport_rabaty_miesieczne: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/stats', methods=['GET'])
def get_rabaty_stats():
    """
    Statystyki rabatów - ogólne
    """
    try:
        query = """
        SELECT 
            COUNT(*) as total_rabaty,
            COUNT(CASE WHEN aktywny = 1 THEN 1 END) as aktywne_rabaty,
            COUNT(CASE WHEN typ_rabatu = 'procentowy' THEN 1 END) as rabaty_procentowe,
            COUNT(CASE WHEN typ_rabatu = 'kwotowy' THEN 1 END) as rabaty_kwotowe,
            COUNT(CASE WHEN limit_miesieczny_aktywny = 1 THEN 1 END) as z_limitami_miesiecznymi,
            COUNT(CASE WHEN limit_dzienny_aktywny = 1 THEN 1 END) as z_limitami_dziennymi
        FROM rabaty
        """
        
        rabaty_stats = execute_query(query)
        
        # Statystyki użycia
        uzycie_query = """
        SELECT 
            COUNT(*) as total_uzyc,
            SUM(kwota_rabatu) as suma_rabatow,
            AVG(kwota_rabatu) as sredni_rabat,
            COUNT(CASE WHEN dzien = date('now') THEN 1 END) as uzycia_dzisiaj,
            SUM(CASE WHEN dzien = date('now') THEN kwota_rabatu ELSE 0 END) as rabaty_dzisiaj,
            COUNT(CASE WHEN miesiac_rok = strftime('%Y-%m', 'now') THEN 1 END) as uzycia_ten_miesiac,
            SUM(CASE WHEN miesiac_rok = strftime('%Y-%m', 'now') THEN kwota_rabatu ELSE 0 END) as rabaty_ten_miesiac
        FROM rabaty_uzycie
        """
        
        uzycie_stats = execute_query(uzycie_query)
        
        return success_response("Statystyki rabatów", {
            "rabaty": rabaty_stats[0] if rabaty_stats else {},
            "uzycie": uzycie_stats[0] if uzycie_stats else {}
        })
        
    except Exception as e:
        print(f"Błąd get_rabaty_stats: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/<int:rabat_id>/szczegoly', methods=['GET'])
def get_rabat_szczegoly(rabat_id):
    """
    Szczegółowy raport dla konkretnego rabatu
    """
    try:
        data_od = request.args.get('data_od', date.today().strftime('%Y-%m-%d'))
        data_do = request.args.get('data_do', date.today().strftime('%Y-%m-%d'))
        
        # Podstawowe informacje o rabacie
        rabat_info = execute_query("""
            SELECT r.*, 
                   COUNT(ru.id) as total_uzyc,
                   COALESCE(SUM(ru.kwota_rabatu), 0) as suma_rabatow,
                   COALESCE(AVG(ru.kwota_rabatu), 0) as sredni_rabat,
                   MIN(ru.data_zastosowania) as pierwsze_uzycie,
                   MAX(ru.data_zastosowania) as ostatnie_uzycie
            FROM rabaty r
            LEFT JOIN rabaty_uzycie ru ON r.id = ru.rabat_id
            WHERE r.id = ?
            GROUP BY r.id
        """, (rabat_id,))
        
        if not rabat_info:
            return not_found_response("Rabat nie został znaleziony")
            
        # Szczegółowa historia użyć
        historia_query = """
        SELECT 
            ru.*,
            pt.numer_transakcji,
            pt.data_transakcji,
            pt.suma_brutto as wartosc_transakcji,
            pt.kasjer_login as kasjer_id,
            pt.status
        FROM rabaty_uzycie ru
        LEFT JOIN pos_transakcje pt ON ru.transakcja_id = pt.id
        WHERE ru.rabat_id = ? 
        AND ru.dzien BETWEEN ? AND ?
        ORDER BY ru.data_zastosowania DESC
        """
        
        historia = execute_query(historia_query, (rabat_id, data_od, data_do))
        
        # Statystyki po dniach
        stats_dzienne = execute_query("""
        SELECT 
            dzien,
            COUNT(*) as ilosc_uzyc,
            SUM(kwota_rabatu) as suma_rabatow,
            AVG(kwota_rabatu) as sredni_rabat,
            MIN(kwota_rabatu) as min_rabat,
            MAX(kwota_rabatu) as max_rabat,
            COUNT(DISTINCT user_id) as unikalnych_kasjerow
        FROM rabaty_uzycie 
        WHERE rabat_id = ? AND dzien BETWEEN ? AND ?
        GROUP BY dzien
        ORDER BY dzien DESC
        """, (rabat_id, data_od, data_do))
        
        # Statystyki po kasjerach
        stats_kasjerzy = execute_query("""
        SELECT 
            user_id as kasjer,
            COUNT(*) as ilosc_uzyc,
            SUM(kwota_rabatu) as suma_rabatow,
            AVG(kwota_rabatu) as sredni_rabat,
            MIN(dzien) as pierwszego_uzycia,
            MAX(dzien) as ostatniego_uzycia
        FROM rabaty_uzycie 
        WHERE rabat_id = ? AND dzien BETWEEN ? AND ?
        GROUP BY user_id
        ORDER BY suma_rabatow DESC
        """, (rabat_id, data_od, data_do))
        
        # Limity - aktualne wykorzystanie
        limity_miesieczne = execute_query("""
        SELECT 
            miesiac_rok,
            SUM(wykorzystana_kwota) as wykorzystana_kwota,
            SUM(wykorzystana_ilosc) as wykorzystana_ilosc
        FROM rabaty_limity_miesieczne 
        WHERE rabat_id = ?
        GROUP BY miesiac_rok
        ORDER BY miesiac_rok DESC
        LIMIT 12
        """, (rabat_id,))
        
        limity_dzienne = execute_query("""
        SELECT 
            dzien,
            SUM(wykorzystana_kwota) as wykorzystana_kwota,
            SUM(wykorzystana_ilosc) as wykorzystana_ilosc
        FROM rabaty_limity_dzienne 
        WHERE rabat_id = ? AND dzien BETWEEN ? AND ?
        GROUP BY dzien
        ORDER BY dzien DESC
        """, (rabat_id, data_od, data_do))
        
        return success_response("Szczegóły rabatu", {
            "rabat": rabat_info[0],
            "historia_uzyc": historia or [],
            "statystyki_dzienne": stats_dzienne or [],
            "statystyki_kasjerzy": stats_kasjerzy or [],
            "limity_miesieczne": limity_miesieczne or [],
            "limity_dzienne": limity_dzienne or [],
            "okres": {"od": data_od, "do": data_do}
        })
        
    except Exception as e:
        print(f"Błąd get_rabat_szczegoly: {e}")
        return error_response(f"Błąd serwera: {e}", 500)

@rabaty_bp.route('/rabaty/uzycia/search', methods=['GET'])
def search_rabaty_uzycia():
    """
    Wyszukiwanie użyć rabatów z filtrami
    """
    try:
        # Parametry filtrowania
        rabat_id = request.args.get('rabat_id', '')
        user_id = request.args.get('user_id', '')
        transakcja_id = request.args.get('transakcja_id', '')
        data_od = request.args.get('data_od', '')
        data_do = request.args.get('data_do', '')
        kwota_min = request.args.get('kwota_min', '')
        kwota_max = request.args.get('kwota_max', '')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        # Buduj zapytanie dynamicznie
        query = """
        SELECT 
            ru.*,
            r.nazwa as rabat_nazwa,
            r.typ_rabatu,
            r.wartosc as rabat_wartosc,
            pt.numer_transakcji,
            pt.data_transakcji,
            pt.suma_brutto as wartosc_transakcji,
            pt.kasjer_id,
            pt.location_id
        FROM rabaty_uzycie ru
        JOIN rabaty r ON ru.rabat_id = r.id
        LEFT JOIN pos_transakcje pt ON ru.transakcja_id = pt.id
        WHERE 1=1
        """
        
        params = []
        
        if rabat_id:
            query += " AND ru.rabat_id = ?"
            params.append(rabat_id)
            
        if user_id:
            query += " AND ru.user_id = ?"
            params.append(user_id)
            
        if transakcja_id:
            query += " AND ru.transakcja_id = ?"
            params.append(transakcja_id)
            
        if data_od:
            query += " AND ru.dzien >= ?"
            params.append(data_od)
            
        if data_do:
            query += " AND ru.dzien <= ?"
            params.append(data_do)
            
        if kwota_min:
            query += " AND ru.kwota_rabatu >= ?"
            params.append(float(kwota_min))
            
        if kwota_max:
            query += " AND ru.kwota_rabatu <= ?"
            params.append(float(kwota_max))
            
        # Dodaj sortowanie i limit
        query += " ORDER BY ru.data_zastosowania DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        results = execute_query(query, params)
        
        # Policz łączną liczbę wyników
        count_query = query.replace("SELECT ru.*,", "SELECT COUNT(*) as total").split("ORDER BY")[0]
        count_params = params[:-2]  # Usuń limit i offset
        count_result = execute_query(count_query, count_params)
        total_count = count_result[0]['total'] if count_result else 0
        
        return success_response("Wyniki wyszukiwania", {
            "uzycia": results or [],
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total_count
        })
        
    except Exception as e:
        print(f"Błąd search_rabaty_uzycia: {e}")
        return error_response(f"Błąd serwera: {e}", 500)
