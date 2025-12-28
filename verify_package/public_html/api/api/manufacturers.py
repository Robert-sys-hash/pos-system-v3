"""
API endpoint dla zarządzania producentami
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response

manufacturers_bp = Blueprint('manufacturers', __name__)

@manufacturers_bp.route('/manufacturers', methods=['GET'])
def get_manufacturers():
    """Pobierz wszystkich producentów"""
    try:
        sql_query = """
        SELECT id, nazwa, opis, aktywny, data_utworzenia, data_modyfikacji
        FROM producenci 
        ORDER BY nazwa ASC
        """
        
        results = execute_query(sql_query)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'manufacturers': results,
            'total': len(results)
        }, f"Znaleziono {len(results)} producentów")
        
    except Exception as e:
        print(f"Błąd pobierania producentów: {e}")
        return error_response("Wystąpił błąd podczas pobierania producentów", 500)

@manufacturers_bp.route('/manufacturers', methods=['POST'])
def add_manufacturer():
    """Dodaj nowego producenta"""
    try:
        data = request.json
        nazwa = data.get('nazwa', '').strip()
        opis = data.get('opis', '').strip()
        aktywny = data.get('aktywny', True)
        
        if not nazwa:
            return error_response("Nazwa producenta jest wymagana", 400)
            
        # Sprawdź czy producent już istnieje
        existing_query = "SELECT id FROM producenci WHERE nazwa = ?"
        existing = execute_query(existing_query, [nazwa])
        
        if existing:
            return error_response("Producent o tej nazwie już istnieje", 400)
            
        sql_insert = """
        INSERT INTO producenci (nazwa, opis, aktywny, data_utworzenia, data_modyfikacji)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        """
        
        result = execute_insert(sql_insert, [nazwa, opis, aktywny])
        
        if result:
            return success_response({
                'id': result,
                'nazwa': nazwa,
                'opis': opis,
                'aktywny': aktywny
            }, "Producent został dodany pomyślnie")
        else:
            return error_response("Błąd podczas dodawania producenta", 500)
            
    except Exception as e:
        print(f"Błąd dodawania producenta: {e}")
        return error_response("Wystąpił błąd podczas dodawania producenta", 500)

@manufacturers_bp.route('/manufacturers/<int:manufacturer_id>', methods=['PUT'])
def update_manufacturer(manufacturer_id):
    """Aktualizuj producenta"""
    try:
        data = request.json
        nazwa = data.get('nazwa', '').strip()
        opis = data.get('opis', '').strip()
        aktywny = data.get('aktywny', True)
        
        if not nazwa:
            return error_response("Nazwa producenta jest wymagana", 400)
            
        # Sprawdź czy producent istnieje
        existing_query = "SELECT id FROM producenci WHERE id = ?"
        existing = execute_query(existing_query, [manufacturer_id])
        
        if not existing:
            return error_response("Producent nie został znaleziony", 404)
            
        # Sprawdź czy nazwa nie jest już zajęta przez innego producenta
        name_check_query = "SELECT id FROM producenci WHERE nazwa = ? AND id != ?"
        name_exists = execute_query(name_check_query, [nazwa, manufacturer_id])
        
        if name_exists:
            return error_response("Producent o tej nazwie już istnieje", 400)
            
        sql_update = """
        UPDATE producenci 
        SET nazwa = ?, opis = ?, aktywny = ?, data_modyfikacji = datetime('now')
        WHERE id = ?
        """
        
        result = execute_insert(sql_update, [nazwa, opis, aktywny, manufacturer_id])
        
        if result:
            return success_response({
                'id': manufacturer_id,
                'nazwa': nazwa,
                'opis': opis,
                'aktywny': aktywny
            }, "Producent został zaktualizowany pomyślnie")
        else:
            return error_response("Błąd podczas aktualizacji producenta", 500)
            
    except Exception as e:
        print(f"Błąd aktualizacji producenta: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji producenta", 500)

@manufacturers_bp.route('/manufacturers/<int:manufacturer_id>', methods=['DELETE'])
def delete_manufacturer(manufacturer_id):
    """Usuń producenta"""
    try:
        # Sprawdź czy producent istnieje
        existing_query = "SELECT id FROM producenci WHERE id = ?"
        existing = execute_query(existing_query, [manufacturer_id])
        
        if not existing:
            return error_response("Producent nie został znaleziony", 404)
            
        # Sprawdź czy producent jest używany przez jakieś produkty
        products_query = "SELECT COUNT(*) as count FROM products WHERE producent_id = ?"
        products_count = execute_query(products_query, [manufacturer_id])
        
        if products_count and products_count[0]['count'] > 0:
            return error_response("Nie można usunąć producenta, ponieważ jest używany przez produkty", 400)
            
        sql_delete = "DELETE FROM producenci WHERE id = ?"
        result = execute_insert(sql_delete, [manufacturer_id])
        
        if result:
            return success_response({}, "Producent został usunięty pomyślnie")
        else:
            return error_response("Błąd podczas usuwania producenta", 500)
            
    except Exception as e:
        print(f"Błąd usuwania producenta: {e}")
        return error_response("Wystąpił błąd podczas usuwania producenta", 500)

@manufacturers_bp.route('/manufacturers/active', methods=['GET'])
def get_active_manufacturers():
    """Pobierz tylko aktywnych producentów"""
    try:
        sql_query = """
        SELECT id, nazwa, opis
        FROM producenci 
        WHERE aktywny = 1
        ORDER BY nazwa ASC
        """
        
        results = execute_query(sql_query)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'manufacturers': results,
            'total': len(results)
        }, f"Znaleziono {len(results)} aktywnych producentów")
        
    except Exception as e:
        print(f"Błąd pobierania aktywnych producentów: {e}")
        return error_response("Wystąpił błąd podczas pobierania producentów", 500)
