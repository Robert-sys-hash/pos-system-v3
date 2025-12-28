print("🔥 LOCATIONS MODULE LOADED")
"""
API modułu Locations - zarządzanie lokalizacjami i sklepami
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import sqlite3
import os
import sys

# Dodaj ścieżki do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

locations_bp = Blueprint('locations', __name__)
print(f"🔥 LOCATIONS BLUEPRINT CREATED: {locations_bp}")

class LocationsManager:
    def __init__(self, db_path=None):
        if db_path is None:
            # Bezwzględna ścieżka do bazy danych
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.db_path = os.path.join(current_dir, '..', 'kupony.db')
        else:
            self.db_path = db_path
    
    def get_connection(self):
        """Połączenie z bazą danych"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_all_locations(self, active_only=True):
        """Pobierz wszystkie lokalizacje"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    id,
                    kod_lokalizacji,
                    nazwa,
                    typ,
                    adres,
                    miasto,
                    kod_pocztowy,
                    telefon,
                    email,
                    manager_login,
                    aktywny,
                    godziny_otwarcia,
                    created_at,
                    updated_at
                FROM locations
            """
            
            params = []
            if active_only:
                query += " WHERE aktywny = 1"
                
            query += " ORDER BY nazwa"
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            locations = cursor.fetchall()
            
            return [dict(row) for row in locations]
            
        finally:
            conn.close()
    
    def get_location_by_id(self, location_id):
        """Pobierz lokalizację po ID"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    id,
                    kod_lokalizacji,
                    nazwa,
                    typ,
                    adres,
                    miasto,
                    kod_pocztowy,
                    telefon,
                    email,
                    manager_login,
                    aktywny,
                    godziny_otwarcia,
                    created_at,
                    updated_at
                FROM locations 
                WHERE id = ?
            """, (location_id,))
            
            location = cursor.fetchone()
            return dict(location) if location else None
            
        finally:
            conn.close()
    
    def create_location(self, data):
        """Utwórz nową lokalizację"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO locations 
                (kod_lokalizacji, nazwa, typ, adres, miasto, kod_pocztowy, 
                 telefon, email, manager_login, aktywny, godziny_otwarcia)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('kod_lokalizacji', f"LOC{datetime.now().strftime('%Y%m%d%H%M%S')}"),
                data.get('nazwa'),
                data.get('typ', 'sklep'),
                data.get('adres', ''),
                data.get('miasto', ''),
                data.get('kod_pocztowy', ''),
                data.get('telefon', ''),
                data.get('email', ''),
                data.get('manager_login', ''),
                data.get('aktywny', True),
                data.get('godziny_otwarcia', '')
            ))
            
            location_id = cursor.lastrowid
            conn.commit()
            
            return location_id
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def update_location(self, location_id, data):
        """Aktualizuj lokalizację"""
        print(f"🔍 DEBUG LocationsManager.update_location: location_id={location_id}, data={data}")
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Sprawdź czy lokalizacja istnieje
            cursor.execute("SELECT id FROM locations WHERE id = ?", (location_id,))
            if not cursor.fetchone():
                return False, "Lokalizacja nie została znaleziona"
            
            # Mapowanie pól - używamy nazw kolumn z bazy danych
            update_data = {
                'kod_lokalizacji': data.get('kod_lokalizacji'),
                'nazwa': data.get('nazwa'),
                'typ': data.get('typ', 'sklep'),
                'adres': data.get('adres', ''),
                'miasto': data.get('miasto', ''),
                'kod_pocztowy': data.get('kod_pocztowy', ''),
                'telefon': data.get('telefon', ''),
                'email': data.get('email', ''),
                'manager_login': data.get('manager_login', ''),
                'aktywny': data.get('aktywny', True),
                'godziny_otwarcia': data.get('godziny_otwarcia', ''),
                'updated_at': datetime.now().isoformat()
            }
            
            print(f"🔍 DEBUG: Mapped update_data={update_data}")
            
            # Aktualizuj dane
            cursor.execute("""
                UPDATE locations 
                SET kod_lokalizacji = ?, nazwa = ?, typ = ?, adres = ?, miasto = ?, 
                    kod_pocztowy = ?, telefon = ?, email = ?, manager_login = ?, 
                    aktywny = ?, godziny_otwarcia = ?, updated_at = ?
                WHERE id = ?
            """, (
                update_data['kod_lokalizacji'],
                update_data['nazwa'],
                update_data['typ'],
                update_data['adres'],
                update_data['miasto'],
                update_data['kod_pocztowy'],
                update_data['telefon'],
                update_data['email'],
                update_data['manager_login'],
                update_data['aktywny'],
                update_data['godziny_otwarcia'],
                update_data['updated_at'],
                location_id
            ))
            
            conn.commit()
            print(f"✅ DEBUG: Location {location_id} updated successfully")
            return True, "Lokalizacja została zaktualizowana"
            
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
    
    def delete_location(self, location_id):
        """Usuń lokalizację (fizyczne usunięcie z bazy)"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Najpierw usuń powiązane rekordy z location_employees
            cursor.execute("DELETE FROM location_employees WHERE location_id = ?", (location_id,))
            
            # Usuń lokalizację fizycznie
            cursor.execute("DELETE FROM locations WHERE id = ?", (location_id,))
            
            conn.commit()
            return cursor.rowcount > 0
            
        finally:
            conn.close()
    
    def get_location_stats(self, location_id):
        """Pobierz statystyki lokalizacji"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Podstawowe statystyki sprzedaży
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(total) as total_revenue,
                    AVG(total) as avg_transaction
                FROM transactions 
                WHERE location_id = ? 
                AND status = 'completed'
            """, (location_id,))
            
            sales_stats = cursor.fetchone()
            
            # Statystyki produktów
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT product_id) as unique_products,
                    SUM(quantity) as total_items_sold
                FROM transaction_items ti
                JOIN transactions t ON ti.transaction_id = t.id
                WHERE t.location_id = ? 
                AND t.status = 'completed'
            """, (location_id,))
            
            product_stats = cursor.fetchone()
            
            result = {
                'sales': dict(sales_stats) if sales_stats else {},
                'products': dict(product_stats) if product_stats else {}
            }
            
            return result
            
        finally:
            conn.close()
    
    def search_locations(self, query):
        """Wyszukaj lokalizacje"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            search_pattern = f"%{query}%"
            
            cursor.execute("""
                SELECT 
                    id,
                    nazwa,
                    adres,
                    miasto,
                    kod_pocztowy,
                    telefon,
                    manager_login,
                    aktywny
                FROM locations 
                WHERE (nazwa LIKE ? OR adres LIKE ? OR miasto LIKE ? OR manager_login LIKE ?)
                AND aktywny = 1
                ORDER BY nazwa
            """, (search_pattern, search_pattern, search_pattern, search_pattern))
            
            locations = cursor.fetchall()
            return [dict(row) for row in locations]
            
        finally:
            conn.close()
    
    def get_location_employees(self, location_id):
        """Pobierz pracowników przypisanych do lokalizacji"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    ul.id,
                    ul.user_login,
                    ul.rola,
                    ul.uprawnienia,
                    ul.data_od,
                    ul.data_do,
                    ul.aktywny,
                    u.typ as user_type
                FROM user_locations ul
                LEFT JOIN users u ON ul.user_login = u.login
                WHERE ul.location_id = ? AND ul.aktywny = 1
                ORDER BY ul.rola, ul.user_login
            """, (location_id,))
            
            employees = cursor.fetchall()
            return [dict(row) for row in employees]
            
        finally:
            conn.close()
    
    def assign_employee_to_location(self, location_id, data):
        """Przypisz pracownika do lokalizacji"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Sprawdź czy użytkownik już nie jest przypisany do tej lokalizacji
            cursor.execute("""
                SELECT id FROM user_locations 
                WHERE user_login = ? AND location_id = ? AND aktywny = 1
            """, (data['user_login'], location_id))
            
            if cursor.fetchone():
                raise ValueError('Użytkownik jest już przypisany do tej lokalizacji')
            
            # Dodaj przypisanie
            cursor.execute("""
                INSERT INTO user_locations 
                (user_login, location_id, rola, uprawnienia, data_od, aktywny)
                VALUES (?, ?, ?, ?, date('now'), 1)
            """, (
                data['user_login'],
                location_id,
                data.get('rola', 'pracownik'),
                data.get('uprawnienia', '')
            ))
            
            assignment_id = cursor.lastrowid
            conn.commit()
            
            return {'id': assignment_id}
            
        finally:
            conn.close()
    
    def update_employee_assignment(self, assignment_id, data):
        """Aktualizuj przypisanie pracownika"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE user_locations 
                SET rola = ?, uprawnienia = ?
                WHERE id = ?
            """, (
                data.get('rola'),
                data.get('uprawnienia', ''),
                assignment_id
            ))
            
            if cursor.rowcount == 0:
                raise ValueError('Przypisanie nie zostało znalezione')
            
            conn.commit()
            return {'id': assignment_id}
            
        finally:
            conn.close()
    
    def remove_employee_from_location(self, assignment_id):
        """Usuń pracownika z lokalizacji (soft delete)"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE user_locations 
                SET aktywny = 0, data_do = date('now')
                WHERE id = ?
            """, (assignment_id,))
            
            if cursor.rowcount == 0:
                raise ValueError('Przypisanie nie zostało znalezione')
            
            conn.commit()
            return True
            
        finally:
            conn.close()

# Inicjalizacja managera
locations_manager = LocationsManager()

@locations_bp.route('/locations')
@locations_bp.route('/locations/')
def get_locations():
    """Pobierz wszystkie lokalizacje"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        locations = locations_manager.get_all_locations(active_only)
        
        return jsonify({
            'success': True,
            'data': locations,
            'count': len(locations)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania lokalizacji: {str(e)}'
        }), 500

@locations_bp.route('/locations/<int:location_id>')
def get_location(location_id):
    """Pobierz szczegóły lokalizacji"""
    try:
        location = locations_manager.get_location_by_id(location_id)
        
        if not location:
            return jsonify({
                'success': False,
                'error': 'Lokalizacja nie została znaleziona'
            }), 404
        
        return jsonify({
            'success': True,
            'data': location
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania lokalizacji: {str(e)}'
        }), 500

@locations_bp.route('/locations/', methods=['POST'])
@locations_bp.route('/locations', methods=['POST'])
def create_location():
    """Utwórz nową lokalizację"""
    try:
        data = request.get_json()
        
        # Walidacja danych
        if not data.get('nazwa'):
            return jsonify({
                'success': False,
                'error': 'Nazwa lokalizacji jest wymagana'
            }), 400
        
        location_id = locations_manager.create_location(data)
        
        return jsonify({
            'success': True,
            'message': 'Lokalizacja została utworzona',
            'id': location_id
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd tworzenia lokalizacji: {str(e)}'
        }), 500

@locations_bp.route('/locations/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    """Aktualizuj lokalizację"""
    try:
        data = request.get_json()
        print(f"🔍 DEBUG: Received data for location {location_id}: {data}")
        
        # Walidacja danych
        if not data.get('nazwa'):
            return jsonify({
                'success': False,
                'error': 'Nazwa lokalizacji jest wymagana'
            }), 400
        
        success, message = locations_manager.update_location(location_id, data)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            status_code = 404 if "nie została znaleziona" in message else 500
            return jsonify({
                'success': False,
                'error': message
            }), status_code
            
    except Exception as e:
        print(f"❌ ERROR in update_location endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Błąd aktualizacji lokalizacji: {str(e)}'
        }), 500

@locations_bp.route('/locations/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    """Usuń lokalizację"""
    try:
        success = locations_manager.delete_location(location_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Lokalizacja została usunięta'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Lokalizacja nie została znaleziona'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd usuwania lokalizacji: {str(e)}'
        }), 500

@locations_bp.route('/locations/<int:location_id>/stats')
def get_location_stats(location_id):
    """Pobierz statystyki lokalizacji"""
    try:
        stats = locations_manager.get_location_stats(location_id)
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania statystyk: {str(e)}'
        }), 500

@locations_bp.route('/locations/search')
def search_locations():
    """Wyszukaj lokalizacje"""
    try:
        query = request.args.get('query', '').strip()
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Brak zapytania wyszukiwania'
            }), 400
        
        locations = locations_manager.search_locations(query)
        
        return jsonify({
            'success': True,
            'data': locations,
            'count': len(locations)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd wyszukiwania: {str(e)}'
        }), 500

@locations_bp.route('/locations/health')
def health_check():
    """Sprawdzenie stanu modułu"""
    return jsonify({
        'module': 'locations',
        'status': 'OK',
        'timestamp': datetime.now().isoformat()
    })

# === ENDPOINTS ZARZĄDZANIA PRACOWNIKAMI W LOKALIZACJACH ===

@locations_bp.route('/locations/<int:location_id>/employees', methods=['GET'])
def get_location_employees(location_id):
    print(f"🔥 GET_LOCATION_EMPLOYEES called with location_id: {location_id}")
    """Pobierz pracowników przypisanych do lokalizacji"""
    try:
        employees = locations_manager.get_location_employees(location_id)
        
        return jsonify({
            'success': True,
            'data': employees,
            'count': len(employees)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania pracowników: {str(e)}'
        }), 500

@locations_bp.route('/locations/<int:location_id>/employees', methods=['POST'])
def assign_employee_to_location(location_id):
    """Przypisz pracownika do lokalizacji"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Brak danych w żądaniu'
            }), 400
        
        # Walidacja wymaganych pól
        required_fields = ['user_login', 'rola']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Brak wymaganego pola: {field}'
                }), 400
        
        result = locations_manager.assign_employee_to_location(location_id, data)
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Pracownik został przypisany do lokalizacji'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd przypisywania pracownika: {str(e)}'
        }), 500

@locations_bp.route('/locations/<int:location_id>/employees/<int:assignment_id>', methods=['PUT'])
def update_employee_assignment(location_id, assignment_id):
    """Aktualizuj przypisanie pracownika do lokalizacji"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Brak danych w żądaniu'
            }), 400
        
        result = locations_manager.update_employee_assignment(assignment_id, data)
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Przypisanie pracownika zostało zaktualizowane'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd aktualizacji przypisania: {str(e)}'
        }), 500

@locations_bp.route('/locations/<int:location_id>/employees/<int:assignment_id>', methods=['DELETE'])
def remove_employee_from_location(location_id, assignment_id):
    """Usuń pracownika z lokalizacji"""
    try:
        result = locations_manager.remove_employee_from_location(assignment_id)
        
        return jsonify({
            'success': True,
            'message': 'Pracownik został usunięty z lokalizacji'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd usuwania pracownika: {str(e)}'
        }), 500
