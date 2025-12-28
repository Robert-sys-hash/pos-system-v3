"""
API modułu Cenowki - zarządzanie cenami produktów
"""

from flask import Blueprint, request, jsonify, send_file
from datetime import datetime
import sqlite3
import os
import sys
from io import BytesIO
import tempfile

# Dodaj ścieżki do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from utils.database import get_db_connection, execute_query

cenowki_bp = Blueprint('cenowki', __name__)

class CenowkiManager:
    def __init__(self, db_path=None):
        # Używamy funkcji get_db_connection z utils/database.py
        pass
    
    def get_connection(self):
        """Pobierz połączenie z bazą danych"""
        return get_db_connection()
    
    def get_all_products(self, limit=100, offset=0, category_filter=None):
        """Pobierz wszystkie produkty z cenami"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    p.id,
                    p.nazwa as nazwa,
                    p.kod_produktu as kod_kreskowy,
                    p.kategoria,
                    p.cena as cena_sprzedazy,
                    COALESCE(p.cena_zakupu_brutto, p.cena_zakupu, 0) as cena_zakupu,
                    p.marza_procent as marza,
                    0 as stan_magazynowy,
                    p.jednostka,
                    p.kategoria as kategoria_nazwa
                FROM produkty p
                WHERE p.aktywny = 1
            """
            
            params = []
            if category_filter:
                query += " AND p.kategoria = ?"
                params.append(category_filter)
                
            query += " ORDER BY p.nazwa LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            products = cursor.fetchall()
            
            return [dict(row) for row in products]
        finally:
            conn.close()
    
    def get_categories(self):
        """Pobierz wszystkie kategorie"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT DISTINCT kategoria as nazwa 
                FROM produkty 
                WHERE kategoria IS NOT NULL AND kategoria != ''
                ORDER BY kategoria
            """)
            categories = cursor.fetchall()
            result = []
            for i, row in enumerate(categories):
                result.append({
                    'id': i + 1,
                    'nazwa': row['nazwa']
                })
            return result
        finally:
            conn.close()
    
    def update_product_price(self, product_id, new_price, price_type='sprzedazy'):
        """Aktualizuj cenę produktu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            if price_type == 'sprzedazy':
                cursor.execute("""
                    UPDATE produkty 
                    SET cena = ?, 
                        data_modyfikacji = ? 
                    WHERE id = ?
                """, (new_price, datetime.now().isoformat(), product_id))
            elif price_type == 'zakupu':
                cursor.execute("""
                    UPDATE produkty 
                    SET cena_zakupu = ?, 
                        data_modyfikacji = ? 
                    WHERE id = ?
                """, (new_price, datetime.now().isoformat(), product_id))
            
            conn.commit()
            
            # Przelicz marżę
            cursor.execute("""
                SELECT cena, cena_zakupu 
                FROM produkty 
                WHERE id = ?
            """, (product_id,))
            result = cursor.fetchone()
            
            if result and result['cena_zakupu'] and result['cena']:
                marza = ((result['cena'] - result['cena_zakupu']) / result['cena_zakupu']) * 100
                cursor.execute("""
                    UPDATE produkty 
                    SET marza_procent = ? 
                    WHERE id = ?
                """, (round(marza, 2), product_id))
                conn.commit()
            
            return True
            
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
    
    def bulk_update_prices(self, updates):
        """Masowa aktualizacja cen produktów"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            success_count = 0
            
            for update in updates:
                product_id = update.get('id')
                new_price = update.get('price')
                price_type = update.get('type', 'sprzedazy')
                
                if price_type == 'sprzedazy':
                    cursor.execute("""
                        UPDATE produkty 
                        SET cena_sprzedazy = ?, 
                            data_ostatniej_zmiany = ? 
                        WHERE id = ?
                    """, (new_price, datetime.now().isoformat(), product_id))
                elif price_type == 'zakupu':
                    cursor.execute("""
                        UPDATE produkty 
                        SET cena_zakupu = ?, 
                            data_ostatniej_zmiany = ? 
                        WHERE id = ?
                    """, (new_price, datetime.now().isoformat(), product_id))
                
                if cursor.rowcount > 0:
                    success_count += 1
            
            conn.commit()
            return True, success_count
            
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
    
    def get_price_history(self, product_id, days=30):
        """Pobierz historię zmian cen produktu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    h.*,
                    p.nazwa as product_name
                FROM historia_cen h
                JOIN produkty p ON h.product_id = p.id
                WHERE h.product_id = ?
                AND h.data_zmiany >= date('now', '-{} days')
                ORDER BY h.data_zmiany DESC
            """.format(days), (product_id,))
            
            history = cursor.fetchall()
            return [dict(row) for row in history]
        finally:
            conn.close()
    
    def get_pricing_stats(self):
        """Pobierz statystyki cenowe"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Podstawowe statystyki
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_products,
                    AVG(cena) as avg_price,
                    MIN(cena) as min_price,
                    MAX(cena) as max_price,
                    AVG(marza_procent) as avg_margin
                FROM produkty 
                WHERE cena > 0 AND aktywny = 1
            """)
            stats = dict(cursor.fetchone())
            
            # Statystyki kategorii
            cursor.execute("""
                SELECT 
                    kategoria as category,
                    COUNT(id) as count,
                    AVG(cena) as avg_price,
                    AVG(marza_procent) as avg_margin
                FROM produkty
                WHERE cena > 0 AND aktywny = 1 AND kategoria IS NOT NULL
                GROUP BY kategoria
                ORDER BY count DESC
            """)
            category_stats = [dict(row) for row in cursor.fetchall()]
            
            stats['categories'] = category_stats
            return stats
            
        finally:
            conn.close()

# Inicjalizacja managera
cenowki_manager = CenowkiManager()

@cenowki_bp.route('/products')
def get_products():
    """Pobierz produkty z cenami"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        category = request.args.get('category', type=int)
        
        products = cenowki_manager.get_all_products(
            limit=limit, 
            offset=offset, 
            category_filter=category
        )
        
        return jsonify({
            'success': True,
            'data': products,
            'count': len(products)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania produktów: {str(e)}'
        }), 500

@cenowki_bp.route('/categories')
def get_categories():
    """Pobierz kategorie produktów"""
    try:
        categories = cenowki_manager.get_categories()
        
        return jsonify({
            'success': True,
            'data': categories,
            'count': len(categories)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania kategorii: {str(e)}'
        }), 500

@cenowki_bp.route('/products/<int:product_id>/price', methods=['PUT'])
def update_product_price(product_id):
    """Aktualizuj cenę produktu"""
    try:
        data = request.get_json()
        new_price = data.get('price')
        price_type = data.get('type', 'sprzedazy')
        
        if not new_price or new_price <= 0:
            return jsonify({
                'success': False,
                'error': 'Nieprawidłowa cena'
            }), 400
        
        result = cenowki_manager.update_product_price(product_id, new_price, price_type)
        
        if result is True:
            return jsonify({
                'success': True,
                'message': 'Cena została zaktualizowana'
            })
        else:
            return jsonify({
                'success': False,
                'error': result[1] if isinstance(result, tuple) else 'Błąd aktualizacji'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd aktualizacji ceny: {str(e)}'
        }), 500

@cenowki_bp.route('/products/bulk-update', methods=['POST'])
def bulk_update_prices():
    """Masowa aktualizacja cen"""
    try:
        data = request.get_json()
        updates = data.get('updates', [])
        
        if not updates:
            return jsonify({
                'success': False,
                'error': 'Brak danych do aktualizacji'
            }), 400
        
        result = cenowki_manager.bulk_update_prices(updates)
        
        if result[0]:
            return jsonify({
                'success': True,
                'message': f'Zaktualizowano {result[1]} produktów'
            })
        else:
            return jsonify({
                'success': False,
                'error': result[1]
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd masowej aktualizacji: {str(e)}'
        }), 500

@cenowki_bp.route('/products/<int:product_id>/history')
def get_price_history(product_id):
    """Pobierz historię cen produktu"""
    try:
        days = request.args.get('days', 30, type=int)
        history = cenowki_manager.get_price_history(product_id, days)
        
        return jsonify({
            'success': True,
            'data': history,
            'count': len(history)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania historii: {str(e)}'
        }), 500

@cenowki_bp.route('/stats')
def get_pricing_stats():
    """Pobierz statystyki cenowe"""
    try:
        stats = cenowki_manager.get_pricing_stats()
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania statystyk: {str(e)}'
        }), 500

@cenowki_bp.route('/health')
def health_check():
    """Sprawdzenie stanu modułu"""
    return jsonify({
        'module': 'cenowki',
        'status': 'OK',
        'timestamp': datetime.now().isoformat()
    })
