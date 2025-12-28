"""
API modułu Marże - kalkulacja marż i analiza zyskowności
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
import sqlite3
import os
import sys

# Dodaj ścieżki do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from utils.database import get_db_connection, execute_query, execute_insert, success_response, error_response

marze_bp = Blueprint('marze', __name__)

class MarzeManager:
    def __init__(self):
        pass
    
    def get_connection(self):
        """Połączenie z bazą danych"""
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        return conn
    
    def calculate_product_margins(self, product_id=None, category_id=None):
        """Oblicz marże produktów"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    p.id,
                    p.nazwa,
                    p.kod_produktu as kod_kreskowy,
                    p.cena_zakupu,
                    p.cena as cena_sprzedazy,
                    p.marza_procent as current_margin,
                    p.kategoria as kategoria_nazwa,
                    CASE 
                        WHEN p.cena_zakupu > 0 THEN 
                            ROUND(((p.cena - p.cena_zakupu) / p.cena_zakupu) * 100, 2)
                        ELSE 0 
                    END as calculated_margin,
                    ROUND(p.cena - p.cena_zakupu, 2) as profit_per_unit
                FROM produkty p
                WHERE p.cena_zakupu > 0 AND p.cena > 0 AND p.aktywny = 1
            """
            
            params = []
            
            if product_id:
                query += " AND p.id = ?"
                params.append(product_id)
                
            if category_id:
                query += " AND p.kategoria = ?"
                params.append(category_id)
            
            query += " ORDER BY calculated_margin DESC"
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            products = cursor.fetchall()
            
            return [dict(row) for row in products]
            
        finally:
            conn.close()
    
    def get_margin_analysis(self):
        """Analiza marż - podstawowe statystyki"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Statystyki ogólne
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_products,
                    AVG(CASE 
                        WHEN cena_zakupu > 0 THEN 
                            ((cena - cena_zakupu) / cena_zakupu) * 100
                        ELSE 0 
                    END) as avg_margin,
                    MIN(CASE 
                        WHEN cena_zakupu > 0 THEN 
                            ((cena - cena_zakupu) / cena_zakupu) * 100
                        ELSE 0 
                    END) as min_margin,
                    MAX(CASE 
                        WHEN cena_zakupu > 0 THEN 
                            ((cena - cena_zakupu) / cena_zakupu) * 100
                        ELSE 0 
                    END) as max_margin,
                    SUM(cena - cena_zakupu) as total_potential_profit
                FROM produkty 
                WHERE cena_zakupu > 0 AND cena > 0 AND aktywny = 1
            """)
            
            general_stats = dict(cursor.fetchone())
            
            # Produkty z najwyższymi i najniższymi marżami
            cursor.execute("""
                SELECT 
                    nazwa,
                    cena_zakupu,
                    cena as cena_sprzedazy,
                    ROUND(((cena - cena_zakupu) / cena_zakupu) * 100, 2) as margin
                FROM produkty 
                WHERE cena_zakupu > 0 AND cena > 0 AND aktywny = 1
                ORDER BY margin DESC
                LIMIT 10
            """)
            
            highest_margins = [dict(row) for row in cursor.fetchall()]
            
            cursor.execute("""
                SELECT 
                    nazwa,
                    cena_zakupu,
                    cena as cena_sprzedazy,
                    ROUND(((cena - cena_zakupu) / cena_zakupu) * 100, 2) as margin
                FROM produkty 
                WHERE cena_zakupu > 0 AND cena > 0 AND aktywny = 1
                ORDER BY margin ASC
                LIMIT 10
            """)
            
            lowest_margins = [dict(row) for row in cursor.fetchall()]
            
            # Analiza kategorii
            cursor.execute("""
                SELECT 
                    kategoria as category,
                    COUNT(id) as product_count,
                    AVG(CASE 
                        WHEN cena_zakupu > 0 THEN 
                            ((cena - cena_zakupu) / cena_zakupu) * 100
                        ELSE 0 
                    END) as avg_margin,
                    SUM(cena - cena_zakupu) as total_potential_profit
                FROM produkty
                WHERE cena_zakupu > 0 AND cena > 0 AND aktywny = 1 AND kategoria IS NOT NULL
                GROUP BY kategoria
                ORDER BY avg_margin DESC
            """)
            
            category_analysis = [dict(row) for row in cursor.fetchall()]
            
            return {
                'general_stats': general_stats,
                'highest_margins': highest_margins,
                'lowest_margins': lowest_margins,
                'category_analysis': category_analysis
            }
            
        finally:
            conn.close()
    
    def get_sales_margin_analysis(self, days=30):
        """Analiza marż ze sprzedaży"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Analiza sprzedaży z marżami
            cursor.execute("""
                SELECT 
                    p.nazwa as product_name,
                    p.cena_zakupu,
                    p.cena_sprzedazy,
                    SUM(ti.quantity) as total_sold,
                    SUM(ti.quantity * p.cena_zakupu) as total_cost,
                    SUM(ti.quantity * p.cena_sprzedazy) as total_revenue,
                    SUM(ti.quantity * (p.cena_sprzedazy - p.cena_zakupu)) as total_profit,
                    CASE 
                        WHEN SUM(ti.quantity * p.cena_zakupu) > 0 THEN
                            ROUND((SUM(ti.quantity * (p.cena_sprzedazy - p.cena_zakupu)) / 
                                  SUM(ti.quantity * p.cena_zakupu)) * 100, 2)
                        ELSE 0
                    END as realized_margin
                FROM transaction_items ti
                JOIN transactions t ON ti.transaction_id = t.id
                JOIN produkty p ON ti.product_id = p.id
                WHERE t.status = 'completed' 
                AND t.created_at >= date('now', '-{} days')
                AND p.cena_zakupu > 0
                GROUP BY p.id, p.nazwa, p.cena_zakupu, p.cena_sprzedazy
                HAVING total_sold > 0
                ORDER BY total_profit DESC
            """.format(days))
            
            sales_analysis = [dict(row) for row in cursor.fetchall()]
            
            # Podsumowanie całkowite
            cursor.execute("""
                SELECT 
                    SUM(ti.quantity * p.cena_zakupu) as total_cost,
                    SUM(ti.quantity * p.cena_sprzedazy) as total_revenue,
                    SUM(ti.quantity * (p.cena_sprzedazy - p.cena_zakupu)) as total_profit,
                    COUNT(DISTINCT p.id) as products_sold,
                    SUM(ti.quantity) as total_items_sold
                FROM transaction_items ti
                JOIN transactions t ON ti.transaction_id = t.id
                JOIN produkty p ON ti.product_id = p.id
                WHERE t.status = 'completed' 
                AND t.created_at >= date('now', '-{} days')
                AND p.cena_zakupu > 0
            """.format(days))
            
            summary = dict(cursor.fetchone())
            
            if summary['total_cost'] and summary['total_cost'] > 0:
                summary['overall_margin'] = round((summary['total_profit'] / summary['total_cost']) * 100, 2)
            else:
                summary['overall_margin'] = 0
            
            return {
                'period_days': days,
                'summary': summary,
                'products': sales_analysis
            }
            
        finally:
            conn.close()
    
    def update_product_margins(self, updates):
        """Masowa aktualizacja marż produktów"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            updated_count = 0
            
            for update in updates:
                product_id = update.get('id')
                new_margin = update.get('margin')
                
                if not product_id or new_margin is None:
                    continue
                
                # Pobierz aktualną cenę zakupu
                cursor.execute("SELECT cena_zakupu FROM produkty WHERE id = ?", (product_id,))
                result = cursor.fetchone()
                
                if result and result['cena_zakupu'] > 0:
                    # Oblicz nową cenę sprzedaży na podstawie marży
                    new_price = result['cena_zakupu'] * (1 + new_margin / 100)
                    
                    cursor.execute("""
                        UPDATE produkty 
                        SET cena_sprzedazy = ?, 
                            marza = ?,
                            data_ostatniej_zmiany = ?
                        WHERE id = ?
                    """, (round(new_price, 2), new_margin, datetime.now().isoformat(), product_id))
                    
                    if cursor.rowcount > 0:
                        updated_count += 1
            
            conn.commit()
            return True, updated_count
            
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
    
    def get_margin_recommendations(self, target_margin=20):
        """Rekomendacje adjustacji marż"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    p.id,
                    p.nazwa,
                    p.cena_zakupu,
                    p.cena as cena_sprzedazy,
                    ROUND(((p.cena - p.cena_zakupu) / p.cena_zakupu) * 100, 2) as current_margin,
                    ROUND(p.cena_zakupu * (1 + ? / 100), 2) as recommended_price,
                    ROUND((p.cena_zakupu * (1 + ? / 100)) - p.cena, 2) as price_difference
                FROM produkty p
                WHERE p.cena_zakupu > 0 
                AND p.cena > 0
                AND p.aktywny = 1
                AND ((p.cena - p.cena_zakupu) / p.cena_zakupu) * 100 < ?
                ORDER BY current_margin ASC
                LIMIT 50
            """, (target_margin, target_margin, target_margin))
            
            recommendations = [dict(row) for row in cursor.fetchall()]
            
            return recommendations
            
        finally:
            conn.close()
    
    def get_low_margin_alert(self, threshold=15):
        """Sprawdź produkty z niską marżą dla alertu na dashboardzie"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM produkty p
                WHERE p.cena_zakupu > 0 
                AND p.cena > 0
                AND p.aktywny = 1
                AND ((p.cena - p.cena_zakupu) / p.cena_zakupu) * 100 < ?
            """, (threshold,))
            
            result = cursor.fetchone()
            count = result['count'] if result else 0
            
            return {
                'count': count,
                'threshold': threshold,
                'show_alert': count > 0
            }
            
        finally:
            conn.close()

# Inicjalizacja managera
marze_manager = MarzeManager()

@marze_bp.route('/products')
def get_product_margins():
    """Pobierz marże produktów"""
    try:
        product_id = request.args.get('product_id', type=int)
        category_id = request.args.get('category_id', type=int)
        
        margins = marze_manager.calculate_product_margins(product_id, category_id)
        
        return jsonify({
            'success': True,
            'data': margins,
            'count': len(margins)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania marż: {str(e)}'
        }), 500

@marze_bp.route('/analysis')
def get_margin_analysis():
    """Analiza marż"""
    try:
        analysis = marze_manager.get_margin_analysis()
        
        return jsonify({
            'success': True,
            'data': analysis
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd analizy marż: {str(e)}'
        }), 500

@marze_bp.route('/sales-analysis')
def get_sales_margin_analysis():
    """Analiza marż ze sprzedaży"""
    try:
        days = request.args.get('days', 30, type=int)
        analysis = marze_manager.get_sales_margin_analysis(days)
        
        return jsonify({
            'success': True,
            'data': analysis
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd analizy sprzedaży: {str(e)}'
        }), 500

@marze_bp.route('/products/bulk-update', methods=['POST'])
def bulk_update_margins():
    """Masowa aktualizacja marż"""
    try:
        data = request.get_json()
        updates = data.get('updates', [])
        
        if not updates:
            return jsonify({
                'success': False,
                'error': 'Brak danych do aktualizacji'
            }), 400
        
        success, result = marze_manager.update_product_margins(updates)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Zaktualizowano marże dla {result} produktów'
            })
        else:
            return jsonify({
                'success': False,
                'error': result
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd aktualizacji marż: {str(e)}'
        }), 500

@marze_bp.route('/recommendations')
def get_margin_recommendations():
    """Rekomendacje marż"""
    try:
        target_margin = request.args.get('target_margin', 20, type=float)
        recommendations = marze_manager.get_margin_recommendations(target_margin)
        
        return jsonify({
            'success': True,
            'data': recommendations,
            'count': len(recommendations),
            'target_margin': target_margin
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania rekomendacji: {str(e)}'
        }), 500

@marze_bp.route('/alert')
def get_low_margin_alert():
    """Alert o produktach z niską marżą dla dashboardu"""
    try:
        threshold = request.args.get('threshold', 15, type=int)
        alert_data = marze_manager.get_low_margin_alert(threshold)
        
        return jsonify({
            'success': True,
            'data': alert_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania alertu marż: {str(e)}'
        }), 500

@marze_bp.route('/health')
def health_check():
    """Sprawdzenie stanu modułu"""
    return jsonify({
        'module': 'marze',
        'status': 'OK',
        'timestamp': datetime.now().isoformat()
    })
