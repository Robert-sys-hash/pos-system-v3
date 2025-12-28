"""
Moduł obsługi bazy danych SQLite dla POS System V3
Zawiera funkcje do łączenia z bazą i standardowe odpowiedzi API
"""

import sqlite3
import os
from flask import jsonify

def get_db_connection():
    """
    Utwórz połączenie z bazą danych SQLite
    Używa bazy kupony.db z katalogu głównego projektu
    """
    try:
        # Ścieżka do bazy danych w katalogu pos-system-v3 (2 poziomy wyżej od backend/utils/)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(current_dir, '..', '..', 'kupony.db')
        db_path = os.path.abspath(db_path)
        
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Nie znaleziono pliku bazy danych: {db_path}")
        
        print(f"🔍 DATABASE: Using database at: {db_path}")
        
        # ...existing code...
        print(f"🔌 Łączę z bazą danych: {db_path}")
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # Pozwala na dostęp do kolumn po nazwie
        return conn
    except Exception as e:
        print(f"Błąd połączenia z bazą danych: {e}")
        return None

def execute_query(query, params=None):
    """
    Wykonaj zapytanie SELECT i zwróć wyniki
    """
    conn = get_db_connection()
    if not conn:
        return None
        
    try:
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        results = cursor.fetchall()
        
        # Konwertuj sqlite3.Row na słowniki
        return [dict(row) for row in results]
        
    except Exception as e:
        print(f"Błąd wykonania zapytania: {e}")
        return None
    finally:
        conn.close()

def execute_insert(query, params=None):
    """
    Wykonaj zapytanie INSERT/UPDATE/DELETE
    Zwraca ID ostatnio wstawionego rekordu lub True/False
    """
    conn = get_db_connection()
    if not conn:
        return False
        
    try:
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
            
        conn.commit()
        return cursor.lastrowid if cursor.lastrowid else True
        
    except Exception as e:
        print(f"Błąd wykonania zapytania INSERT: {e}")
        return False
    finally:
        conn.close()

# Standardowe odpowiedzi API
def success_response(data, message="Operacja zakończona pomyślnie", status_code=200):
    """Zwraca standardową odpowiedź sukcesu"""
    return jsonify({
        'success': True,
        'data': data,
        'message': message,
        'status_code': status_code
    }), status_code

def error_response(message="Wystąpił błąd", status_code=400, error_code=None):
    """Zwraca standardową odpowiedź błędu"""
    response = {
        'success': False,
        'message': message,
        'status_code': status_code
    }
    
    if error_code:
        response['error_code'] = error_code
        
    return jsonify(response), status_code

def not_found_response(message="Nie znaleziono zasobu"):
    """Zwraca odpowiedź 404"""
    return error_response(message, 404, 'NOT_FOUND')

def validation_error_response(message="Błędne dane wejściowe"):
    """Zwraca odpowiedź 422 dla błędów walidacji"""
    return error_response(message, 422, 'VALIDATION_ERROR')
