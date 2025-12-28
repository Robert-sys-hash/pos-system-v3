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
        """Ustaw cenę produktu dla magazynu i synchronizuj z innymi magazynami w tej lokalizacji"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            if not data_od:
                data_od = date.today().isoformat()
            
            # Sprawdzenie czy magazyn istnieje i pobierz location_id
            cursor.execute("SELECT id, location_id FROM warehouses WHERE id = ?", (warehouse_id,))
            warehouse_data = cursor.fetchone()
            if not warehouse_data:
                return False, "Magazyn nie istnieje"
            
            location_id = warehouse_data['location_id']
                
            cursor.execute("SELECT id FROM produkty WHERE id = ?", (product_id,))
            if not cursor.fetchone():
                return False, "Produkt nie istnieje"
            
            # Znajdź wszystkie aktywne magazyny w tej lokalizacji
            cursor.execute("""
                SELECT id FROM warehouses 
                WHERE location_id = ? AND aktywny = 1
            """, (location_id,))
            warehouses_in_location = [row['id'] for row in cursor.fetchall()]
            
            print(f"🔄 Synchronizacja ceny dla produktu {product_id} w lokalizacji {location_id}")
            print(f"📦 Magazyny do aktualizacji: {warehouses_in_location}")
            
            # Aktualizuj cenę we wszystkich magazynach w lokalizacji
            for wh_id in warehouses_in_location:
                # Sprawdź czy już istnieje aktywna cena na dzisiaj
                cursor.execute("""
                    SELECT id FROM warehouse_product_prices 
                    WHERE warehouse_id = ? AND product_id = ? AND data_od = ? AND aktywny = 1
                """, (wh_id, product_id, data_od))
                
                existing = cursor.fetchone()
                
                if existing:
                    # Aktualizuj istniejący rekord
                    cursor.execute("""
                        UPDATE warehouse_product_prices 
                        SET cena_sprzedazy_netto = ?, 
                            cena_sprzedazy_brutto = ?,
                            updated_at = ?,
                            created_by = ?
                        WHERE warehouse_id = ? AND product_id = ? AND data_od = ?
                    """, (cena_netto, cena_brutto, datetime.now().isoformat(), 
                          created_by, wh_id, product_id, data_od))
                    print(f"✅ Zaktualizowano cenę w magazynie {wh_id}")
                else:
                    # Dezaktywuj poprzednie ceny
                    cursor.execute("""
                        UPDATE warehouse_product_prices 
                        SET data_do = ?, updated_at = ?, aktywny = 0
                        WHERE warehouse_id = ? AND product_id = ? AND data_od < ? AND aktywny = 1
                    """, (data_od, datetime.now().isoformat(), wh_id, product_id, data_od))
                    
                    # Dodaj nową cenę
                    cursor.execute("""
                        INSERT INTO warehouse_product_prices 
                        (warehouse_id, product_id, cena_sprzedazy_netto, cena_sprzedazy_brutto, 
                         data_od, aktywny, created_at, created_by)
                        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    """, (wh_id, product_id, cena_netto, cena_brutto, data_od, 
                          datetime.now().isoformat(), created_by))
                    print(f"✅ Dodano nową cenę w magazynie {wh_id}")
            
            conn.commit()
            return True, f"Cena została zsynchronizowana we wszystkich magazynach lokalizacji {location_id}"
            
        except Exception as e:
            conn.rollback()
            return False, f"Błąd podczas ustawiania ceny: {str(e)}"
        finally:
            conn.close()
    
    def get_warehouse_price(self, warehouse_id, product_id, data=None):
        """Pobierz aktualną cenę produktu dla magazynu"""
        conn = self.get_connection()
        try:
            if not data:
                data = date.today().isoformat()
                
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    wpp.cena_sprzedazy_netto,
                    wpp.cena_sprzedazy_brutto,
                    wpp.data_od,
                    wpp.data_do,
                    w.nazwa as warehouse_name,
                    p.nazwa as product_name
                FROM warehouse_product_prices wpp
                JOIN warehouses w ON wpp.warehouse_id = w.id
                JOIN produkty p ON wpp.product_id = p.id
                WHERE wpp.warehouse_id = ? AND wpp.product_id = ? 
                  AND wpp.data_od <= ? 
                  AND (wpp.data_do IS NULL OR wpp.data_do >= ?)
                  AND wpp.aktywny = 1
                ORDER BY wpp.data_od DESC
                LIMIT 1
            """, (warehouse_id, product_id, data, data))
            
            result = cursor.fetchone()
            if result:
                return dict(result)
            return None
            
        finally:
            conn.close()
    
    def delete_warehouse_price(self, warehouse_id, product_id, data_od):
        """Usuń cenę produktu dla magazynu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE warehouse_product_prices 
                SET aktywny = 0, updated_at = ?
                WHERE warehouse_id = ? AND product_id = ? AND data_od = ?
            """, (datetime.now().isoformat(), warehouse_id, product_id, data_od))
            
            conn.commit()
            return cursor.rowcount > 0
            
        except Exception as e:
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def copy_prices_between_warehouses(self, source_warehouse_id, target_warehouse_id):
        """Kopiuj ceny między magazynami"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz aktywne ceny z magazynu źródłowego
            cursor.execute("""
                SELECT product_id, cena_sprzedazy_netto, cena_sprzedazy_brutto, data_od
                FROM warehouse_product_prices
                WHERE warehouse_id = ? AND aktywny = 1
            """, (source_warehouse_id,))
            
            source_prices = cursor.fetchall()
            copied_count = 0
            
            for price in source_prices:
                # Sprawdź czy cena już istnieje w magazynie docelowym
                cursor.execute("""
                    SELECT id FROM warehouse_product_prices
                    WHERE warehouse_id = ? AND product_id = ? AND data_od = ? AND aktywny = 1
                """, (target_warehouse_id, price['product_id'], price['data_od']))
                
                if not cursor.fetchone():
                    # Dodaj cenę do magazynu docelowego
                    cursor.execute("""
                        INSERT INTO warehouse_product_prices 
                        (warehouse_id, product_id, cena_sprzedazy_netto, cena_sprzedazy_brutto, 
                         data_od, aktywny, created_at, created_by)
                        VALUES (?, ?, ?, ?, ?, 1, ?, 'system_copy')
                    """, (target_warehouse_id, price['product_id'], 
                          price['cena_sprzedazy_netto'], price['cena_sprzedazy_brutto'],
                          price['data_od'], datetime.now().isoformat()))
                    copied_count += 1
            
            conn.commit()
            return True, f"Skopiowano {copied_count} cen"
            
        except Exception as e:
            conn.rollback()
            return False, f"Błąd podczas kopiowania cen: {str(e)}"
        finally:
            conn.close()

# Inicjalizacja managera
warehouse_pricing_manager = WarehousePricingManager()

@warehouse_pricing_bp.route('/warehouses/<int:warehouse_id>/prices')
def get_warehouse_prices(warehouse_id):
    """Pobierz ceny produktów dla magazynu"""
    try:
        product_id = request.args.get('product_id', type=int)
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        prices = warehouse_pricing_manager.get_warehouse_prices(
            warehouse_id=warehouse_id,
            product_id=product_id,
            active_only=active_only
        )
        
        return jsonify({
            'success': True,
            'data': prices,
            'count': len(prices)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd podczas pobierania cen: {str(e)}'
        }), 500

@warehouse_pricing_bp.route('/products/<int:product_id>/prices')
def get_product_prices_all_warehouses(product_id):
    """Pobierz ceny produktu we wszystkich magazynach"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        prices = warehouse_pricing_manager.get_warehouse_prices(
            product_id=product_id,
            active_only=active_only
        )
        
        return jsonify({
            'success': True,
            'data': prices,
            'count': len(prices)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd podczas pobierania cen produktu: {str(e)}'
        }), 500

@warehouse_pricing_bp.route('/warehouses/<int:warehouse_id>/products/<int:product_id>/price', methods=['PUT'])
def set_warehouse_product_price(warehouse_id, product_id):
    """Ustaw cenę produktu dla magazynu"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Brak danych'
            }), 400
        
        cena_netto = data.get('cena_sprzedazy_netto')
        cena_brutto = data.get('cena_sprzedazy_brutto')
        data_od = data.get('data_od')
        created_by = data.get('created_by', 'api_user')
        
        if cena_netto is None or cena_brutto is None:
            return jsonify({
                'success': False,
                'error': 'Wymagane pola: cena_sprzedazy_netto, cena_sprzedazy_brutto'
            }), 400
        
        success, message = warehouse_pricing_manager.set_warehouse_price(
            warehouse_id=warehouse_id,
            product_id=product_id,
            cena_netto=float(cena_netto),
            cena_brutto=float(cena_brutto),
            data_od=data_od,
            created_by=created_by
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
            'error': f'Błąd podczas ustawiania ceny: {str(e)}'
        }), 500

@warehouse_pricing_bp.route('/warehouses/<int:warehouse_id>/products/<int:product_id>/price')
def get_warehouse_product_price(warehouse_id, product_id):
    """Pobierz aktualną cenę produktu dla magazynu"""
    try:
        data = request.args.get('data')
        
        price = warehouse_pricing_manager.get_warehouse_price(
            warehouse_id=warehouse_id,
            product_id=product_id,
            data=data
        )
        
        if price:
            return jsonify({
                'success': True,
                'data': price
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Nie znaleziono ceny dla podanych parametrów'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd podczas pobierania ceny: {str(e)}'
        }), 500

@warehouse_pricing_bp.route('/warehouses/<int:warehouse_id>/products/<int:product_id>/price', methods=['DELETE'])
def delete_warehouse_product_price(warehouse_id, product_id):
    """Usuń cenę produktu dla magazynu"""
    try:
        data = request.get_json()
        data_od = data.get('data_od') if data else None
        
        if not data_od:
            return jsonify({
                'success': False,
                'error': 'Wymagane pole: data_od'
            }), 400
        
        success = warehouse_pricing_manager.delete_warehouse_price(
            warehouse_id=warehouse_id,
            product_id=product_id,
            data_od=data_od
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Cena została usunięta'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Nie udało się usunąć ceny'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd podczas usuwania ceny: {str(e)}'
        }), 500

@warehouse_pricing_bp.route('/warehouses/<int:source_warehouse_id>/copy-prices-to/<int:target_warehouse_id>', methods=['POST'])
def copy_prices_between_warehouses(source_warehouse_id, target_warehouse_id):
    """Kopiuj ceny między magazynami"""
    try:
        success, message = warehouse_pricing_manager.copy_prices_between_warehouses(
            source_warehouse_id=source_warehouse_id,
            target_warehouse_id=target_warehouse_id
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
            'error': f'Błąd podczas kopiowania cen: {str(e)}'
        }), 500

@warehouse_pricing_bp.route('/health')
def health_check():
    """Sprawdzenie stanu API"""
    return jsonify({
        'status': 'ok',
        'service': 'warehouse_pricing_api',
        'timestamp': datetime.now().isoformat()
    })
