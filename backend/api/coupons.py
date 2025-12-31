"""
API endpoint dla zarządzania kuponami rabatowymi
Tworzenie, walidacja, wykorzystywanie kuponów, statystyki
"""

from flask import Blueprint, request, jsonify, session
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime, timedelta
import random
import string
from api.auth import require_auth

coupons_bp = Blueprint('coupons', __name__)

def generate_coupon_code(length=8):
    """Generuj unikalny kod kuponu"""
    max_attempts = 10
    for _ in range(max_attempts):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        
        # Sprawdź unikalność
        check_query = "SELECT id FROM kupony WHERE kod = ?"
        existing = execute_query(check_query, (code,))
        
        if not existing:
            return code
    
    raise Exception("Nie można wygenerować unikalnego kodu po 10 próbach")

@coupons_bp.route('/coupons', methods=['GET'])
# @require_auth  # Wyłączono dla testów
def get_all_coupons():
    """
    Pobierz wszystkie kupony z filtrowaniem po lokalizacji
    GET /api/coupons?location_id=1
    """
    try:
        location_id = request.args.get('location_id')
        
        query = """
        SELECT 
            id, kod, wartosc, data_waznosci, numer_telefonu,
            status, data_utworzenia, data_wykorzystania,
            sklep, numer_paragonu, location_id
        FROM kupony"""
        
        params = []
        if location_id:
            query += " WHERE location_id = ?"
            params.append(location_id)
            
        query += " ORDER BY data_utworzenia DESC LIMIT 100"
        
        result = execute_query(query, params)
        if result is None:
            return error_response("Błąd pobierania kuponów z bazy danych", 500)
        
        return success_response(result, f"Pobrano {len(result)} kuponów")
        
    except Exception as e:
        return error_response(f"Błąd pobierania kuponów: {str(e)}", 500)

@coupons_bp.route('/coupons/create', methods=['POST'])
# @require_auth  # Wyłączono dla testów
def create_coupon():
    """
    Stwórz nowy kupon rabatowy
    POST /api/coupons/create
    Body: {
        "value": 50.00,
        "type": "fixed|percentage",
        "expiry_date": "2025-12-31",
        "phone_number": "123456789",
        "payment_method": "cash|card",
        "description": "Kupon testowy"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        # Walidacja danych (wsparcie dla polskich i angielskich nazw pól)
        value = data.get('wartosc') or data.get('value')
        expiry_date = data.get('data_waznosci') or data.get('expiry_date')
        phone_number = data.get('numer_telefonu') or data.get('phone_number', '')
        payment_method = data.get('sposob_platnosci') or data.get('payment_method', '')
        
        # Sprawdź czy wartości nie są pustymi stringami
        if not value or value == '':
            value = None
        if not expiry_date or expiry_date == '':
            expiry_date = None
        if not value or not expiry_date:
            return error_response("Wartość i data ważności są wymagane", 400)
        
        # Walidacja wartości
        try:
            value = float(value)
            if value <= 0:
                return error_response("Wartość musi być większa od 0", 400)
            if value > 10000:
                return error_response("Wartość nie może przekraczać 10000", 400)
        except ValueError:
            return error_response("Nieprawidłowa wartość", 400)
        
        # Walidacja daty ważności
        try:
            expiry_datetime = datetime.strptime(expiry_date, '%Y-%m-%d')
            if expiry_datetime.date() <= datetime.now().date():
                return error_response("Data ważności musi być w przyszłości", 400)
        except ValueError:
            return error_response("Nieprawidłowy format daty (YYYY-MM-DD)", 400)
        
        # Generuj unikalny kod
        coupon_code = generate_coupon_code()
        
        # Pobierz location_id z danych lub użyj domyślnej lokalizacji
        location_id = data.get('location_id', 1)  # Domyślnie lokalizacja 1
        
        # Zapisz kupon do bazy (zgodne ze strukturą tabeli v1)
        insert_query = """
        INSERT INTO kupony (
            kod, wartosc, data_waznosci, numer_telefonu, 
            sposob_platnosci, sklep, data_utworzenia, status, location_id
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'aktywny', ?)
        """
        
        shop = session.get('login', 'admin')  # Pobierz sklep z sesji
        
        params = (
            coupon_code, value, expiry_date, 
            phone_number, payment_method, shop, location_id
        )
        
        success = execute_insert(insert_query, params)
        
        if success:
            # Pobierz utworzony kupon
            coupon_query = "SELECT * FROM kupony WHERE kod = ?"
            coupon_result = execute_query(coupon_query, (coupon_code,))
            
            if coupon_result:
                coupon = coupon_result[0]
                return success_response({
                    'coupon_id': coupon['id'],
                    'code': coupon['kod'],
                    'value': coupon['wartosc'],
                    'expiry_date': coupon['data_waznosci'],
                    'created_at': coupon['data_utworzenia'],
                    'status': coupon['status']
                }, "Kupon utworzony pomyślnie")
        
        return error_response("Błąd tworzenia kuponu", 500)
        
    except Exception as e:
        return error_response(f"Błąd tworzenia kuponu: {str(e)}", 500)

@coupons_bp.route('/coupons/validate/<code>', methods=['GET'])
def validate_coupon(code):
    """
    Sprawdź ważność kuponu
    GET /api/coupons/validate/ABC12345
    """
    try:
        # Sprawdź kupon w bazie
        query = """
        SELECT 
            id, kod, wartosc, data_waznosci, 
            status, data_wykorzystania,
            sklep, kwota_wykorzystana
        FROM kupony 
        WHERE kod = ?
        """
        
        result = execute_query(query, (code.upper(),))
        
        if not result:
            return not_found_response(f"Kupon {code} nie został znaleziony")
        
        coupon = result[0]
        
        # Sprawdź status kuponu
        validation_result = {
            'code': coupon['kod'],
            'value': coupon['wartosc'],
            'expiry_date': coupon['data_waznosci'],
            'valid': True,
            'errors': []
        }
        
        # Sprawdź czy aktywny
        if coupon['status'] != 'aktywny':
            validation_result['valid'] = False
            if coupon['status'] == 'wykorzystany':
                validation_result['errors'].append("Kupon został już wykorzystany")
            else:
                validation_result['errors'].append(f"Kupon ma status: {coupon['status']}")
        
        # Sprawdź datę ważności
        if coupon['data_waznosci']:
            from datetime import datetime
            try:
                expiry_date = datetime.strptime(coupon['data_waznosci'], '%Y-%m-%d').date()
                if expiry_date < datetime.now().date():
                    validation_result['valid'] = False
                    validation_result['errors'].append(f"Kupon wygasł {coupon['data_waznosci']}")
            except ValueError:
                validation_result['valid'] = False
                validation_result['errors'].append("Nieprawidłowa data ważności")
        
        if validation_result['valid']:
            return success_response(validation_result, "Kupon jest ważny")
        else:
            return error_response({
                'validation': validation_result
            }, "Kupon jest nieważny", 400)
        
    except Exception as e:
        return error_response(f"Błąd walidacji kuponu: {str(e)}", 500)


def use_coupon_internal(code, amount_used, transaction_id=None):
    """
    Wewnętrzna funkcja do wykorzystania kuponu (nie endpoint)
    Używana przez pos.py i transactions.py
    
    Returns:
        dict: {'success': True/False, 'error': 'message', ...}
    """
    try:
        from datetime import datetime
        
        # Sprawdź kupon bezpośrednio w bazie
        query = """
        SELECT 
            id, kod, wartosc, data_waznosci, 
            status, data_wykorzystania
        FROM kupony 
        WHERE kod = ?
        """
        
        result = execute_query(query, (code.upper(),))
        
        if not result:
            return {'success': False, 'error': f"Kupon {code} nie został znaleziony"}
        
        coupon = result[0]
        
        # Sprawdź czy można wykorzystać
        if coupon['status'] != 'aktywny':
            return {'success': False, 'error': f"Kupon ma status: {coupon['status']}"}
        
        # Sprawdź datę ważności
        if coupon['data_waznosci']:
            try:
                expiry_date = datetime.strptime(coupon['data_waznosci'], '%Y-%m-%d').date()
                if expiry_date < datetime.now().date():
                    return {'success': False, 'error': f"Kupon wygasł {coupon['data_waznosci']}"}
            except ValueError:
                return {'success': False, 'error': "Nieprawidłowa data ważności"}
        
        # Oblicz nową wartość kuponu po wykorzystaniu
        current_value = float(coupon['wartosc'])
        used_amount = float(amount_used or current_value)
        
        # Sprawdź czy nie próbuje się wykorzystać więcej niż wartość kuponu
        if used_amount > current_value:
            return {'success': False, 'error': f"Nie można wykorzystać {used_amount} zł z kuponu o wartości {current_value} zł"}
        
        new_value = current_value - used_amount
        new_status = 'wykorzystany' if new_value <= 0 else 'aktywny'
        
        # Aktualizuj kupon: obniż wartość lub oznacz jako wykorzystany
        update_query = """
        UPDATE kupony 
        SET wartosc = ?, 
            status = ?,
            data_wykorzystania = datetime('now'),
            kwota_wykorzystana = COALESCE(kwota_wykorzystana, 0) + ?
        WHERE kod = ?
        """
        
        success = execute_insert(update_query, (new_value, new_status, used_amount, code.upper()))
        
        if success:
            print(f"✅ Kupon {code.upper()} wykorzystany: -{used_amount} zł, pozostało: {new_value} zł, status: {new_status}")
            return {
                'success': True,
                'code': code.upper(),
                'original_value': current_value,
                'used_amount': used_amount,
                'remaining_value': new_value,
                'status': new_status,
                'transaction_id': transaction_id
            }
        else:
            return {'success': False, 'error': "Błąd aktualizacji kuponu w bazie"}
            
    except Exception as e:
        print(f"❌ Błąd use_coupon_internal: {e}")
        return {'success': False, 'error': str(e)}


@coupons_bp.route('/coupons/use/<code>', methods=['POST'])
# @require_auth  # Wyłączono dla testów
def use_coupon(code):
    """
    Wykorzystaj kupon (oznacz jako wykorzystany)
    POST /api/coupons/use/ABC12345
    Body: {"transaction_id": 123, "amount_used": 25.50}
    """
    try:
        data = request.get_json()
        transaction_id = data.get('transaction_id') if data else None
        amount_used = data.get('amount_used') or data.get('amount') if data else None
        
        # Sprawdź kupon bezpośrednio w bazie
        query = """
        SELECT 
            id, kod, wartosc, data_waznosci, 
            status, data_wykorzystania
        FROM kupony 
        WHERE kod = ?
        """
        
        result = execute_query(query, (code.upper(),))
        
        if not result:
            return not_found_response(f"Kupon {code} nie został znaleziony")
        
        coupon = result[0]
        
        # Sprawdź czy można wykorzystać
        if coupon['status'] != 'aktywny':
            return error_response(f"Kupon ma status: {coupon['status']}", 400)
        
        # Sprawdź datę ważności
        if coupon['data_waznosci']:
            from datetime import datetime
            try:
                expiry_date = datetime.strptime(coupon['data_waznosci'], '%Y-%m-%d').date()
                if expiry_date < datetime.now().date():
                    return error_response(f"Kupon wygasł {coupon['data_waznosci']}", 400)
            except ValueError:
                return error_response("Nieprawidłowa data ważności", 400)
        
        # Oblicz nową wartość kuponu po wykorzystaniu
        current_value = float(coupon['wartosc'])
        used_amount = float(amount_used or current_value)
        
        # Sprawdź czy nie próbuje się wykorzystać więcej niż wartość kuponu
        if used_amount > current_value:
            return error_response(f"Nie można wykorzystać {used_amount} zł z kuponu o wartości {current_value} zł", 400)
        
        new_value = current_value - used_amount
        new_status = 'wykorzystany' if new_value <= 0 else 'aktywny'
        
        # Aktualizuj kupon: obniż wartość lub oznacz jako wykorzystany
        update_query = """
        UPDATE kupony 
        SET wartosc = ?, 
            status = ?,
            data_wykorzystania = datetime('now'),
            kwota_wykorzystana = COALESCE(kwota_wykorzystana, 0) + ?
        WHERE kod = ?
        """
        
        success = execute_insert(update_query, (new_value, new_status, used_amount, code.upper()))
        
        if success:
            return success_response({
                'code': code.upper(),
                'original_value': current_value,
                'used_amount': used_amount,
                'remaining_value': new_value,
                'status': new_status,
                'used_at': datetime.now().isoformat(),
                'transaction_id': transaction_id
            }, f"Wykorzystano {used_amount} zł z kuponu. Pozostało: {new_value} zł")
        else:
            return error_response("Błąd wykorzystania kuponu", 500)
        
    except Exception as e:
        return error_response(f"Błąd wykorzystania kuponu: {str(e)}", 500)

@coupons_bp.route('/coupons/search', methods=['GET'])
# @require_auth  # Wyłączono dla testów
def search_coupons():
    """
    Wyszukaj kupony
    GET /api/coupons/search?query=ABC&status=active&limit=20
    """
    try:
        query_param = request.args.get('query', '').strip()
        status = request.args.get('status', 'all')  # all, active, used, expired
        limit = int(request.args.get('limit', 20))
        
        conditions = []
        params = []
        
        base_query = """
        SELECT 
            id, kod, wartosc, data_waznosci, numer_telefonu,
            status, data_utworzenia, data_wykorzystania,
            sklep, numer_paragonu, sposob_platnosci, numer_kp,
            kwota_wykorzystana
        FROM kupony 
        WHERE 1=1
        """
        
        # Filtry
        if query_param:
            conditions.append("(kod LIKE ? OR numer_telefonu LIKE ?)")
            search_pattern = f"%{query_param}%"
            params.extend([search_pattern, search_pattern])
        
        if status == 'active':
            conditions.append("status = 'aktywny' AND data_waznosci >= date('now')")
        elif status == 'used':
            conditions.append("status = 'wykorzystany'")
        elif status == 'expired':
            conditions.append("data_waznosci < date('now')")
        
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        base_query += " ORDER BY data_utworzenia DESC LIMIT ?"
        params.append(limit)
        
        results = execute_query(base_query, params)
        
        return success_response({
            'coupons': results or [],
            'total': len(results or []),
            'query': query_param,
            'status': status,
            'limit': limit
        }, f"Znaleziono {len(results or [])} kuponów")
        
    except Exception as e:
        return error_response(f"Błąd wyszukiwania kuponów: {str(e)}", 500)

@coupons_bp.route('/coupons/stats', methods=['GET'])
# @require_auth  # Wyłączono dla testów
def get_coupons_stats():
    """
    Statystyki kuponów
    GET /api/coupons/stats
    """
    try:
        stats_query = """
        SELECT 
            COUNT(*) as total_coupons,
            COUNT(CASE WHEN status = 'aktywny' AND data_waznosci >= date('now') THEN 1 END) as active_coupons,
            COUNT(CASE WHEN status = 'wykorzystany' THEN 1 END) as used_coupons,
            COUNT(CASE WHEN data_waznosci < date('now') THEN 1 END) as expired_coupons,
            SUM(CASE WHEN status = 'wykorzystany' THEN COALESCE(kwota_wykorzystana, wartosc) ELSE 0 END) as total_value_used,
            SUM(CASE WHEN status = 'aktywny' AND data_waznosci >= date('now') THEN wartosc ELSE 0 END) as total_value_active,
            COUNT(CASE WHEN DATE(data_utworzenia) = DATE('now') THEN 1 END) as created_today,
            COUNT(CASE WHEN DATE(data_wykorzystania) = DATE('now') THEN 1 END) as used_today
        FROM kupony
        """
        
        result = execute_query(stats_query, ())
        
        stats = result[0] if result else {
            'total_coupons': 0,
            'active_coupons': 0,
            'used_coupons': 0,
            'expired_coupons': 0,
            'total_value_used': 0,
            'total_value_active': 0,
            'created_today': 0,
            'used_today': 0
        }
        
        return success_response(stats, "Statystyki kuponów")
        
    except Exception as e:
        return error_response(f"Błąd pobierania statystyk kuponów: {str(e)}", 500)

@coupons_bp.route('/coupons/<int:coupon_id>/test', methods=['GET'])
def test_coupon_endpoint(coupon_id):
    """Test endpoint dla sprawdzania routingu"""
    return success_response({
        'coupon_id': coupon_id,
        'message': 'Test endpoint działa!',
        'type': type(coupon_id).__name__
    }, "Test OK")

@coupons_bp.route('/coupons/<int:coupon_id>/history', methods=['GET'])
# @require_auth  # Wyłączono dla testów
def get_coupon_history(coupon_id):
    """
    Pobierz historię kuponu
    GET /api/coupons/123/history
    """
    import sys
    print(f"🔥 [ENTRY] get_coupon_history wywołane! coupon_id: {coupon_id}", file=sys.stderr, flush=True)
    
    try:
        print(f"[DEBUG] get_coupon_history - coupon_id: {coupon_id} (type: {type(coupon_id)})", file=sys.stderr, flush=True)
        
        # Sprawdź czy coupon_id jest poprawne
        if not coupon_id or coupon_id <= 0:
            print(f"[DEBUG] Niepoprawne coupon_id: {coupon_id}", file=sys.stderr)
            return error_response("Niepoprawne ID kuponu", 400)
        
        # Pobierz szczegóły kuponu
        coupon_query = """
        SELECT 
            id, kod, wartosc, data_waznosci, numer_telefonu,
            status, data_utworzenia, data_wykorzystania,
            sklep, numer_paragonu, sposob_platnosci, numer_kp,
            kwota_wykorzystana
        FROM kupony 
        WHERE id = ?
        """
        print(f"[DEBUG] Wykonuję zapytanie dla coupon_id: {coupon_id}", file=sys.stderr, flush=True)
        coupon_result = execute_query(coupon_query, (coupon_id,))
        print(f"[DEBUG] Wynik zapytania: {len(coupon_result) if coupon_result else 0} rekordów", file=sys.stderr, flush=True)
        
        if not coupon_result:
            print(f"[DEBUG] Kupon ID {coupon_id} nie znaleziony w bazie", file=sys.stderr, flush=True)
            return not_found_response("Kupon nie został znaleziony")
        
        coupon = coupon_result[0]
        print(f"[DEBUG] Znaleziono kupon: {coupon['kod']}", file=sys.stderr, flush=True)
        
        # Przygotuj historię wydarzeń
        history_events = []
        
        # Wydarzenie utworzenia
        history_events.append({
            'date': coupon['data_utworzenia'],
            'type': 'created',
            'description': 'Kupon utworzony',
            'details': {
                'value': coupon['wartosc'],
                'expiry_date': coupon['data_waznosci'],
                'shop': coupon['sklep'],
                'payment_method': coupon['sposob_platnosci']
            }
        })
        
        # Wydarzenie wykorzystania (jeśli było)
        if coupon['data_wykorzystania']:
            history_events.append({
                'date': coupon['data_wykorzystania'],
                'type': 'used',
                'description': 'Kupon wykorzystany',
                'details': {
                    'amount_used': coupon['kwota_wykorzystana'],
                    'receipt_number': coupon['numer_paragonu'],
                    'transaction_id': coupon.get('transakcja_id')  # Może nie istnieć w bazie
                }
            })
        
        # Sprawdź czy kupon wygasł
        from datetime import datetime
        expiry_date = datetime.strptime(coupon['data_waznosci'], '%Y-%m-%d').date()
        today = datetime.now().date()
        
        is_expired = expiry_date < today
        days_to_expiry = (expiry_date - today).days if not is_expired else 0
        
        # Przygotuj pełną odpowiedź
        response_data = {
            'coupon': coupon,
            'history': history_events,
            'status_info': {
                'is_expired': is_expired,
                'days_to_expiry': days_to_expiry,
                'can_be_used': coupon['status'] == 'aktywny' and not is_expired
            }
        }
        
        print(f"[DEBUG] Zwracam odpowiedź: {len(history_events)} wydarzeń", file=sys.stderr, flush=True)
        return success_response(response_data, "Historia kuponu pobrana pomyślnie")
        
    except Exception as e:
        print(f"[ERROR] Błąd w get_coupon_history: {str(e)}", file=sys.stderr, flush=True)
        return error_response(f"Błąd pobierania historii kuponu: {str(e)}", 500)

@coupons_bp.route('/coupons/<int:coupon_id>/use', methods=['POST'])
# @require_auth  # Wyłączono dla testów  
def use_coupon_by_id(coupon_id):
    """
    Wykorzystaj kupon po ID
    POST /api/coupons/123/use
    Body: {"receipt_number": "PAR20250709123456", "transaction_id": 123, "amount_used": 50.0}
    """
    try:
        data = request.get_json() or {}
        receipt_number = data.get('receipt_number', '')
        transaction_id = data.get('transaction_id')
        amount_used = data.get('amount_used')
        
        # Pobierz kupon po ID
        coupon_query = "SELECT * FROM kupony WHERE id = ?"
        coupon_result = execute_query(coupon_query, (coupon_id,))
        
        if not coupon_result:
            return not_found_response("Kupon nie został znaleziony")
        
        coupon = coupon_result[0]
        
        # Sprawdź czy już wykorzystany
        if coupon['status'] == 'wykorzystany':
            return error_response("Kupon został już wykorzystany", 400)
        
        # Sprawdź ważność
        from datetime import datetime
        expiry_date = datetime.strptime(coupon['data_waznosci'], '%Y-%m-%d').date()
        if expiry_date < datetime.now().date():
            return error_response("Kupon wygasł", 400)
        
        # Oznacz jako wykorzystany z numerem paragonu
        update_query = """
        UPDATE kupony 
        SET status = 'wykorzystany', 
            data_wykorzystania = datetime('now'),
            kwota_wykorzystana = COALESCE(?, wartosc),
            numer_paragonu = ?
        WHERE id = ?
        """
        
        success = execute_insert(update_query, (
            amount_used or coupon['wartosc'], 
            receipt_number,
            coupon_id
        ))
        
        if success:
            return success_response({
                'coupon_id': coupon_id,
                'code': coupon['kod'],
                'value': coupon['wartosc'],
                'amount_used': amount_used or coupon['wartosc'],
                'receipt_number': receipt_number,
                'used_at': datetime.now().isoformat()
            }, "Kupon został wykorzystany")
        else:
            return error_response("Błąd wykorzystania kuponu", 500)
        
    except Exception as e:
        return error_response(f"Błąd wykorzystania kuponu: {str(e)}", 500)

@coupons_bp.route('/coupons/<int:coupon_id>/receipt', methods=['POST'])
# @require_auth  # Wyłączono dla testów
def update_coupon_receipt(coupon_id):
    """
    Aktualizuj numer paragonu kuponu
    POST /api/coupons/123/receipt
    Body: {"receipt_number": "PAR20250709123456"}
    """
    try:
        data = request.get_json()
        if not data or 'receipt_number' not in data:
            return error_response("Numer paragonu jest wymagany", 400)
        
        receipt_number = data['receipt_number'].strip()
        if not receipt_number:
            return error_response("Numer paragonu nie może być pusty", 400)
        
        # Sprawdź czy kupon istnieje
        check_query = "SELECT id, kod FROM kupony WHERE id = ?"
        check_result = execute_query(check_query, (coupon_id,))
        
        if not check_result:
            return not_found_response("Kupon nie został znaleziony")
        
        # Aktualizuj numer paragonu
        update_query = "UPDATE kupony SET numer_paragonu = ? WHERE id = ?"
        success = execute_insert(update_query, (receipt_number, coupon_id))
        
        if success:
            return success_response({
                'coupon_id': coupon_id,
                'receipt_number': receipt_number
            }, "Numer paragonu został zaktualizowany")
        else:
            return error_response("Błąd aktualizacji numeru paragonu", 500)
        
    except Exception as e:
        return error_response(f"Błąd aktualizacji numeru paragonu: {str(e)}", 500)
