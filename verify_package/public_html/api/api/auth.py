"""
API endpoint dla autoryzacji i zarządzania użytkownikami
JWT tokens, logowanie, sesje, role użytkowników
"""

from flask import Blueprint, request, jsonify, session
from utils.database import execute_query, execute_insert, success_response, error_response
import hashlib
import secrets
import datetime
from functools import wraps

auth_bp = Blueprint('auth', __name__)

def hash_password(password):
    """Hashowanie hasła z solą"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{hashed}:{salt}"

def verify_password(password, hashed_password):
    """Weryfikacja hasła"""
    try:
        stored_hash, salt = hashed_password.split(':')
        return hashlib.sha256((password + salt).encode()).hexdigest() == stored_hash
    except:
        return False

def require_auth(f):
    """Dekorator wymagający autoryzacji"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return error_response("Wymagana autoryzacja", 401)
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """
    Logowanie użytkownika
    POST /api/auth/login
    Body: {"login": "admin", "password": "haslo123"}
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        login = data.get('login', '').strip()
        password = data.get('password', '').strip()
        
        if not login or not password:
            return error_response("Login i hasło są wymagane", 400)
        
        # Sprawdź użytkownika w bazie (różne tabele)
        user_queries = [
            "SELECT id, login, haslo, typ, 1 as active FROM users WHERE login = ?",
            "SELECT id, login, password as haslo, role as typ, 1 as active FROM user_accounts WHERE login = ? AND active = 1"
        ]
        
        user = None
        for query in user_queries:
            result = execute_query(query, (login,))
            if result:
                user = result[0]
                break
        
        if not user:
            return error_response("Nieprawidłowy login lub hasło", 401)
        
        # Weryfikacja hasła (obsługa różnych formatów)
        password_valid = False
        stored_password = user['haslo']
        
        # Sprawdź różne formaty hasła
        if ':' in stored_password:
            # Hashowane hasło z solą
            password_valid = verify_password(password, stored_password)
        else:
            # Proste hasło tekstowe (legacy)
            password_valid = (password == stored_password)
        
        if not password_valid:
            return error_response("Nieprawidłowy login lub hasło", 401)
        
        # Utwórz sesję
        session['user_id'] = user['id']
        session['login'] = user['login']
        session['user_login'] = user['login']  # Dodane dla kompatybilności
        session['user_type'] = user['typ']
        session['logged_in_at'] = datetime.datetime.now().isoformat()
        
        # Zapisz log logowania
        log_query = """
        INSERT INTO user_sessions (user_id, login_time, ip_address, user_agent)
        VALUES (?, datetime('now'), ?, ?)
        """
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', '')
        execute_insert(log_query, (user['id'], ip_address, user_agent))
        
        return success_response({
            'user_id': user['id'],
            'login': user['login'],
            'user_type': user['typ'],
            'session_id': session.get('_id', 'unknown')
        }, "Logowanie pomyślne")
        
    except Exception as e:
        return error_response(f"Błąd logowania: {str(e)}", 500)

@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    """
    Wylogowanie użytkownika
    POST /api/auth/logout
    """
    try:
        user_id = session.get('user_id')
        
        if user_id:
            # Zapisz log wylogowania
            log_query = """
            UPDATE user_sessions 
            SET logout_time = datetime('now')
            WHERE user_id = ? AND logout_time IS NULL
            ORDER BY login_time DESC
            LIMIT 1
            """
            execute_insert(log_query, (user_id,))
        
        session.clear()
        
        return success_response({}, "Wylogowanie pomyślne")
        
    except Exception as e:
        return error_response(f"Błąd wylogowania: {str(e)}", 500)

@auth_bp.route('/auth/profile', methods=['GET'])
@require_auth
def get_profile():
    """
    Pobierz profil aktualnego użytkownika
    GET /api/auth/profile
    """
    try:
        user_id = session.get('user_id')
        
        profile_query = """
        SELECT id, login, typ, email, full_name, created_at, last_login
        FROM users WHERE id = ?
        """
        
        result = execute_query(profile_query, (user_id,))
        
        if not result:
            return error_response("Użytkownik nie znaleziony", 404)
        
        profile = result[0]
        profile['session_info'] = {
            'logged_in_at': session.get('logged_in_at'),
            'user_type': session.get('user_type')
        }
        
        return success_response(profile, "Profil użytkownika")
        
    except Exception as e:
        return error_response(f"Błąd pobierania profilu: {str(e)}", 500)

@auth_bp.route('/auth/check', methods=['GET'])
def check_auth():
    """
    Sprawdź status autoryzacji
    GET /api/auth/check
    """
    try:
        if 'user_id' in session:
            return success_response({
                'authenticated': True,
                'user_id': session.get('user_id'),
                'login': session.get('login'),
                'user_type': session.get('user_type'),
                'logged_in_at': session.get('logged_in_at')
            }, "Użytkownik zalogowany")
        else:
            return success_response({
                'authenticated': False
            }, "Użytkownik niezalogowany")
            
    except Exception as e:
        return error_response(f"Błąd sprawdzania autoryzacji: {str(e)}", 500)

@auth_bp.route('/auth/users', methods=['GET'])
@require_auth
def get_users():
    """
    Lista użytkowników (tylko dla adminów)
    GET /api/auth/users
    """
    try:
        user_type = session.get('user_type')
        if user_type != 'admin':
            return error_response("Brak uprawnień administratora", 403)
        
        users_query = """
        SELECT id, login, typ, email, full_name, active, created_at, last_login
        FROM users
        ORDER BY login ASC
        """
        
        users = execute_query(users_query, ())
        
        return success_response(users or [], f"Znaleziono {len(users or [])} użytkowników")
        
    except Exception as e:
        return error_response(f"Błąd pobierania użytkowników: {str(e)}", 500)


# === ZARZĄDZANIE MAGAZYNEM W SESJI ===

@auth_bp.route('/auth/current-warehouse', methods=['GET'])
@require_auth
def get_current_warehouse():
    """Pobiera aktualnie wybrany magazyn użytkownika"""
    try:
        user_login = session.get('user_login')
        current_warehouse_id = session.get('current_warehouse_id')
        
        if current_warehouse_id:
            # Sprawdź czy użytkownik ma dostęp do tego magazynu
            warehouse_check = execute_query("""
                SELECT 
                    w.id,
                    w.nazwa,
                    w.kod_magazynu,
                    uw.rola,
                    u.typ as user_type
                FROM warehouses w
                LEFT JOIN user_warehouses uw ON w.id = uw.warehouse_id AND uw.user_login = ? AND uw.aktywny = 1
                LEFT JOIN users u ON u.login = ?
                WHERE w.id = ? AND w.aktywny = 1
                AND (u.typ = 'admin' OR uw.warehouse_id IS NOT NULL)
            """, (user_login, user_login, current_warehouse_id))
            
            if warehouse_check:
                return success_response({
                    'warehouse': warehouse_check[0],
                    'has_access': True
                }, "Aktualny magazyn")
        
        # Jeśli brak aktualnego magazynu lub brak dostępu, pobierz pierwszy dostępny
        available = execute_query("""
            SELECT 
                w.id,
                w.nazwa,
                w.kod_magazynu,
                COALESCE(uw.rola, 'admin') as rola,
                u.typ as user_type
            FROM warehouses w
            LEFT JOIN user_warehouses uw ON w.id = uw.warehouse_id AND uw.user_login = ? AND uw.aktywny = 1
            JOIN users u ON u.login = ?
            WHERE w.aktywny = 1
            AND (u.typ = 'admin' OR uw.warehouse_id IS NOT NULL)
            ORDER BY w.nazwa
            LIMIT 1
        """, (user_login, user_login))
        
        if available:
            # Automatycznie ustaw pierwszy dostępny magazyn
            session['current_warehouse_id'] = available[0]['id']
            return success_response({
                'warehouse': available[0],
                'has_access': True,
                'auto_selected': True
            }, "Automatycznie wybrano pierwszy dostępny magazyn")
        else:
            return error_response("Brak dostępu do żadnego magazynu", 403)
        
    except Exception as e:
        return error_response(f"Błąd pobierania aktualnego magazynu: {str(e)}", 500)

@auth_bp.route('/auth/current-warehouse', methods=['POST'])
@require_auth
def set_current_warehouse():
    """Ustawia aktualny magazyn użytkownika"""
    try:
        data = request.get_json()
        warehouse_id = data.get('warehouse_id')
        user_login = session.get('user_login')
        
        if not warehouse_id:
            return error_response("Brak warehouse_id", 400)
        
        # Sprawdź czy użytkownik ma dostęp do tego magazynu
        access_check = execute_query("""
            SELECT 
                w.id,
                w.nazwa,
                w.kod_magazynu,
                COALESCE(uw.rola, 'admin') as rola,
                u.typ as user_type
            FROM warehouses w
            LEFT JOIN user_warehouses uw ON w.id = uw.warehouse_id AND uw.user_login = ? AND uw.aktywny = 1
            JOIN users u ON u.login = ?
            WHERE w.id = ? AND w.aktywny = 1
            AND (u.typ = 'admin' OR uw.warehouse_id IS NOT NULL)
        """, (user_login, user_login, warehouse_id))
        
        if not access_check:
            return error_response("Brak dostępu do tego magazynu", 403)
        
        # Sprawdź czy użytkownik ma otwartą zmianę
        shift_check = execute_query("""
            SELECT id FROM shifts 
            WHERE cashier = ? AND shift_end IS NULL
        """, (user_login,))
        
        if shift_check:
            return error_response("Nie można zmienić magazynu podczas otwartej zmiany", 409)
        
        # Ustaw nowy magazyn w sesji
        session['current_warehouse_id'] = warehouse_id
        session['current_warehouse_name'] = access_check[0]['nazwa']
        
        return success_response({
            'warehouse': access_check[0],
            'session_updated': True
        }, f"Magazyn został zmieniony na: {access_check[0]['nazwa']}")
        
    except Exception as e:
        return error_response(f"Błąd zmiany magazynu: {str(e)}", 500)

@auth_bp.route('/auth/available-warehouses', methods=['GET'])
@require_auth
def get_available_warehouses():
    """Pobiera magazyny dostępne dla użytkownika"""
    try:
        user_login = session.get('user_login')
        
        warehouses = execute_query("""
            SELECT 
                w.id,
                w.nazwa,
                w.kod_magazynu,
                w.miasto,
                w.wojewodztwo,
                COALESCE(uw.rola, 'admin') as rola,
                u.typ as user_type,
                CASE WHEN w.id = ? THEN 1 ELSE 0 END as is_current
            FROM warehouses w
            LEFT JOIN user_warehouses uw ON w.id = uw.warehouse_id AND uw.user_login = ? AND uw.aktywny = 1
            JOIN users u ON u.login = ?
            WHERE w.aktywny = 1
            AND (u.typ = 'admin' OR uw.warehouse_id IS NOT NULL)
            ORDER BY w.nazwa
        """, (session.get('current_warehouse_id'), user_login, user_login))
        
        user_type = execute_query("SELECT typ FROM users WHERE login = ?", (user_login,))
        can_change = not bool(execute_query("SELECT id FROM shifts WHERE cashier = ? AND shift_end IS NULL", (user_login,)))
        
        return success_response({
            'warehouses': warehouses or [],
            'can_change_warehouse': can_change,
            'is_admin': user_type and user_type[0]['typ'] == 'admin',
            'current_warehouse_id': session.get('current_warehouse_id')
        }, f"Znaleziono {len(warehouses or [])} dostępnych magazynów")
        
    except Exception as e:
        return error_response(f"Błąd pobierania dostępnych magazynów: {str(e)}", 500)
