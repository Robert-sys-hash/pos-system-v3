"""
API modułu Warehouse Pricing - zarządzanie cenami produktów per magazyn
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date
import sqlite3
import os
import sys

# Dodaj ścieżki do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

warehouse_pricing_bp = Blueprint('warehouse_pricing', __name__)
location_pricing_bp = warehouse_pricing_bp  # Alias dla kompatybilności

class WarehousePricingManager:
    def __init__(self, db_path=None):
        if db_path is None:
            # Bezwzględna ścieżka do bazy danych
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.db_path = os.path.join(current_dir, '..', '..', 'kupony.db')
        else:
            self.db_path = db_path
    
    def get_connection(self):
        """Połączenie z bazą danych"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_warehouse_prices(self, warehouse_id=None, product_id=None, active_only=True):
        """Pobierz ceny produktów dla magazynu"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    wpp.id,
                    wpp.warehouse_id,
                    wpp.product_id,
                    wpp.cena_sprzedazy_netto,
                    wpp.cena_sprzedazy_brutto,
                    wpp.data_od,
                    wpp.data_do,
                    wpp.aktywny,
                    wpp.created_at,
                    wpp.updated_at,
                    wpp.created_by,
                    w.nazwa as warehouse_name,
                    w.kod_magazynu,
                    p.nazwa as product_name,
                    p.kod_produktu,
                    p.ean as kod_kreskowy,
                    p.cena_sprzedazy_netto as default_price_netto,
                    p.cena_sprzedazy_brutto as default_price_brutto,
                    p.stawka_vat
                FROM warehouse_product_prices wpp
                JOIN warehouses w ON wpp.warehouse_id = w.id
                JOIN produkty p ON wpp.product_id = p.id
                WHERE 1=1
            """
            
            params = []
            
            if warehouse_id:
                query += " AND wpp.warehouse_id = ?"
                params.append(warehouse_id)
            
            if product_id:
                query += " AND wpp.product_id = ?"
                params.append(product_id)
            
            if active_only:
                query += " AND wpp.aktywny = 1"
                query += " AND (wpp.data_do IS NULL OR wpp.data_do >= DATE('now'))"
            
            query += " ORDER BY w.nazwa, p.nazwa, wpp.data_od DESC"
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            prices = cursor.fetchall()
            
            return [dict(row) for row in prices]
            
        finally:
            conn.close()
    
    def set_warehouse_price(self, warehouse_id, product_id, cena_netto, cena_brutto, data_od=None, created_by='admin'):
        """Ustaw cenę produktu dla magazynu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            if not data_od:
                data_od = date.today().isoformat()
            
            # Sprawdź czy produkt i magazyn istnieją
            cursor.execute("SELECT id FROM warehouses WHERE id = ?", (warehouse_id,))
            if not cursor.fetchone():
                return False, "Lokalizacja nie istnieje"
                
            cursor.execute("SELECT id FROM produkty WHERE id = ?", (product_id,))
            if not cursor.fetchone():
                return False, "Produkt nie istnieje"
            
            # Sprawdź czy już istnieje cena na tę datę
            cursor.execute("""
                SELECT id FROM location_product_prices 
                WHERE location_id = ? AND product_id = ? AND data_od = ?
            """, (location_id, product_id, data_od))
            existing_record = cursor.fetchone()
            
            if existing_record:
                # Aktualizuj istniejący rekord
                cursor.execute("""
                    UPDATE location_product_prices 
                    SET cena_sprzedazy_netto = ?,
                        cena_sprzedazy_brutto = ?,
                        aktywny = 1,
                        updated_at = ?
                    WHERE location_id = ? AND product_id = ? AND data_od = ?
                """, (cena_netto, cena_brutto, datetime.now().isoformat(), 
                      location_id, product_id, data_od))
                price_id = existing_record[0]
            else:
                # Dezaktywuj poprzednie ceny (tylko jeśli dodajemy nową datę)
                cursor.execute("""
                    UPDATE location_product_prices 
                    SET aktywny = 0, 
                        data_do = DATE(?, '-1 day'),
                        updated_at = ?
                    WHERE location_id = ? AND product_id = ? AND aktywny = 1 AND data_od < ?
                """, (data_od, datetime.now().isoformat(), location_id, product_id, data_od))
                
                # Dodaj nową cenę
                cursor.execute("""
                    INSERT INTO location_product_prices 
                    (location_id, product_id, cena_sprzedazy_netto, cena_sprzedazy_brutto, 
                     data_od, aktywny, created_by)
                    VALUES (?, ?, ?, ?, ?, 1, ?)
                """, (location_id, product_id, cena_netto, cena_brutto, data_od, created_by))
                
                price_id = cursor.lastrowid
            conn.commit()
            
            return True, price_id
            
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
    
    def get_current_price(self, location_id, product_id):
        """Pobierz aktualną cenę produktu dla lokalizacji"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Najpierw sprawdź czy jest cena specjalna dla lokalizacji
            cursor.execute("""
                SELECT 
                    lpp.cena_sprzedazy_netto,
                    lpp.cena_sprzedazy_brutto,
                    'location_specific' as price_type
                FROM location_product_prices lpp
                WHERE lpp.location_id = ? 
                AND lpp.product_id = ? 
                AND lpp.aktywny = 1
                AND (lpp.data_do IS NULL OR lpp.data_do >= DATE('now'))
                ORDER BY lpp.data_od DESC
                LIMIT 1
            """, (location_id, product_id))
            
            price = cursor.fetchone()
            
            if price:
                return dict(price)
            
            # Jeśli nie ma ceny specjalnej, użyj ceny domyślnej
            cursor.execute("""
                SELECT 
                    cena_sprzedazy_netto,
                    cena_sprzedazy_brutto,
                    'default' as price_type
                FROM produkty
                WHERE id = ?
            """, (product_id,))
            
            default_price = cursor.fetchone()
            return dict(default_price) if default_price else None
            
        finally:
            conn.close()
    
    def remove_location_price(self, location_id, product_id):
        """Usuń cenę specjalną dla lokalizacji (powrót do ceny domyślnej)"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE location_product_prices 
                SET aktywny = 0, 
                    data_do = DATE('now'),
                    updated_at = ?
                WHERE location_id = ? AND product_id = ? AND aktywny = 1
            """, (datetime.now().isoformat(), location_id, product_id))
            
            conn.commit()
            return True, "Cena specjalna została usunięta"
            
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
    
    def copy_prices_to_location(self, source_location_id, target_location_id, overwrite=False):
        """Skopiuj ceny z jednej lokalizacji do drugiej"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz aktywne ceny z lokalizacji źródłowej
            cursor.execute("""
                SELECT product_id, cena_sprzedazy_netto, cena_sprzedazy_brutto
                FROM location_product_prices
                WHERE location_id = ? AND aktywny = 1
            """, (source_location_id,))
            
            source_prices = cursor.fetchall()
            copied_count = 0
            
            for price in source_prices:
                # Sprawdź czy cena już istnieje w lokalizacji docelowej
                cursor.execute("""
                    SELECT id FROM location_product_prices
                    WHERE location_id = ? AND product_id = ? AND aktywny = 1
                """, (target_location_id, price['product_id']))
                
                exists = cursor.fetchone()
                
                if not exists or overwrite:
                    if exists and overwrite:
                        # Dezaktywuj istniejącą cenę
                        cursor.execute("""
                            UPDATE location_product_prices 
                            SET aktywny = 0, data_do = DATE('now', '-1 day')
                            WHERE location_id = ? AND product_id = ? AND aktywny = 1
                        """, (target_location_id, price['product_id']))
                    
                    # Dodaj nową cenę
                    cursor.execute("""
                        INSERT INTO location_product_prices 
                        (location_id, product_id, cena_sprzedazy_netto, cena_sprzedazy_brutto, 
                         data_od, aktywny, created_by)
                        VALUES (?, ?, ?, ?, DATE('now'), 1, 'system_copy')
                    """, (target_location_id, price['product_id'], 
                          price['cena_sprzedazy_netto'], price['cena_sprzedazy_brutto']))
                    
                    copied_count += 1
            
            conn.commit()
            return True, f"Skopiowano {copied_count} cen"
            
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
    
    def get_price_history(self, location_id, product_id):
        """Pobierz historię cen produktu dla lokalizacji"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    lpp.cena_sprzedazy_netto,
                    lpp.cena_sprzedazy_brutto,
                    lpp.data_od,
                    lpp.data_do,
                    lpp.aktywny,
                    lpp.created_at,
                    lpp.created_by
                FROM location_product_prices lpp
                WHERE lpp.location_id = ? AND lpp.product_id = ?
                ORDER BY lpp.data_od DESC
            """, (location_id, product_id))
            
            history = cursor.fetchall()
            return [dict(row) for row in history]
            
        finally:
            conn.close()

# Inicjalizacja managera  
LocationPricingManager = WarehousePricingManager  # Alias dla kompatybilności
location_pricing_manager = LocationPricingManager()

@location_pricing_bp.route('/locations/<int:location_id>/prices')
def get_location_prices(location_id):
    """Pobierz wszystkie ceny dla lokalizacji"""
    try:
        prices = location_pricing_manager.get_location_prices(location_id=location_id)
        
        return jsonify({
            'success': True,
            'data': prices,
            'count': len(prices)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania cen: {str(e)}'
        }), 500

@location_pricing_bp.route('/products/<int:product_id>/prices')
def get_product_prices(product_id):
    """Pobierz ceny produktu we wszystkich lokalizacjach"""
    try:
        prices = location_pricing_manager.get_location_prices(product_id=product_id)
        
        return jsonify({
            'success': True,
            'data': prices,
            'count': len(prices)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania cen produktu: {str(e)}'
        }), 500

@location_pricing_bp.route('/locations/<int:location_id>/products/<int:product_id>/price', methods=['PUT'])
def set_location_price(location_id, product_id):
    """Ustaw cenę produktu dla lokalizacji"""
    try:
        data = request.get_json()
        
        cena_netto = data.get('cena_netto')
        cena_brutto = data.get('cena_brutto')
        data_od = data.get('data_od')
        created_by = data.get('created_by', 'admin')
        
        if cena_netto is None or cena_brutto is None:
            return jsonify({
                'success': False,
                'error': 'Wymagane są ceny netto i brutto'
            }), 400
            
        # Konwertuj na float i sprawdź czy są liczbami
        try:
            cena_netto = float(cena_netto)
            cena_brutto = float(cena_brutto)
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Ceny muszą być liczbami'
            }), 400
            
        if cena_netto < 0 or cena_brutto < 0:
            return jsonify({
                'success': False,
                'error': 'Ceny nie mogą być ujemne'
            }), 400
        
        success, result = location_pricing_manager.set_location_price(
            location_id, product_id, cena_netto, cena_brutto, data_od, created_by
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Cena została ustawiona',
                'price_id': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd ustawiania ceny: {str(e)}'
        }), 500

@location_pricing_bp.route('/locations/<int:location_id>/products/<int:product_id>/price')
def get_current_price(location_id, product_id):
    """Pobierz aktualną cenę produktu dla lokalizacji"""
    try:
        price = location_pricing_manager.get_current_price(location_id, product_id)
        
        if price:
            return jsonify({
                'success': True,
                'data': price
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Nie znaleziono ceny dla tego produktu'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania ceny: {str(e)}'
        }), 500

@location_pricing_bp.route('/locations/<int:location_id>/products/<int:product_id>/price', methods=['DELETE'])
def remove_location_price(location_id, product_id):
    """Usuń cenę specjalną dla lokalizacji"""
    try:
        success, message = location_pricing_manager.remove_location_price(location_id, product_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd usuwania ceny: {str(e)}'
        }), 500

@location_pricing_bp.route('/locations/<int:source_location_id>/copy-prices-to/<int:target_location_id>', methods=['POST'])
def copy_prices_to_location(source_location_id, target_location_id):
    """Skopiuj ceny z jednej lokalizacji do drugiej"""
    try:
        data = request.get_json() or {}
        overwrite = data.get('overwrite', False)
        
        success, message = location_pricing_manager.copy_prices_to_location(
            source_location_id, target_location_id, overwrite
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd kopiowania cen: {str(e)}'
        }), 500

@location_pricing_bp.route('/locations/<int:location_id>/products/<int:product_id>/price/history')
def get_price_history(location_id, product_id):
    """Pobierz historię cen produktu dla lokalizacji"""
    try:
        history = location_pricing_manager.get_price_history(location_id, product_id)
        
        return jsonify({
            'success': True,
            'data': history,
            'count': len(history)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania historii cen: {str(e)}'
        }), 500

@location_pricing_bp.route('/health')
def health_check():
    """Sprawdzenie stanu modułu"""
    return jsonify({
        'module': 'location_pricing',
        'status': 'OK',
        'timestamp': datetime.now().isoformat()
    })
