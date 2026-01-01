"""
API dla szybkich produktów w POS
Pozwala na konfigurację przycisków szybkiego dodawania produktów do koszyka
"""

from flask import Blueprint, request, jsonify
import sqlite3
import os

quick_products_bp = Blueprint('quick_products', __name__)

def get_db():
    """Połączenie z bazą danych"""
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'kupony.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@quick_products_bp.route('/pos/quick-products', methods=['GET'])
def get_quick_products():
    """Pobierz wszystkie aktywne szybkie produkty"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Pobierz parametr lokalizacji
        location_id = request.args.get('location_id', 5, type=int)
        
        # Pobierz szybkie produkty wraz z danymi produktu i stanem magazynowym
        cursor.execute('''
            SELECT 
                qp.id,
                qp.nazwa,
                qp.ikona,
                qp.product_id,
                qp.kolejnosc,
                qp.aktywny,
                p.nazwa as product_nazwa,
                p.cena_sprzedazy_brutto as product_cena,
                p.ean as kod_kreskowy,
                p.jednostka,
                COALESCE(pm.stan_aktualny, 0) as stock_quantity
            FROM pos_quick_products qp
            LEFT JOIN produkty p ON qp.product_id = p.id
            LEFT JOIN pos_magazyn pm ON p.id = pm.produkt_id AND pm.lokalizacja = ?
            WHERE qp.aktywny = 1
            ORDER BY qp.kolejnosc ASC, qp.id ASC
        ''', (location_id,))
        
        quick_products = []
        for row in cursor.fetchall():
            quick_products.append({
                'id': row['id'],
                'nazwa': row['nazwa'],
                'ikona': row['ikona'],
                'product_id': row['product_id'],
                'kolejnosc': row['kolejnosc'],
                'aktywny': row['aktywny'],
                'product_nazwa': row['product_nazwa'],
                'product_cena': row['product_cena'],
                'kod_kreskowy': row['kod_kreskowy'],
                'jednostka': row['jednostka'],
                'stock_quantity': row['stock_quantity']
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': quick_products,
            'count': len(quick_products)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd pobierania szybkich produktów: {str(e)}'
        }), 500

@quick_products_bp.route('/pos/quick-products/all', methods=['GET'])
def get_all_quick_products():
    """Pobierz wszystkie szybkie produkty (aktywne i nieaktywne) - dla admina"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                qp.id,
                qp.nazwa,
                qp.ikona,
                qp.product_id,
                qp.kolejnosc,
                qp.aktywny,
                p.nazwa as product_nazwa,
                p.cena_sprzedazy_brutto as product_cena,
                p.ean as kod_kreskowy,
                p.jednostka
            FROM pos_quick_products qp
            LEFT JOIN produkty p ON qp.product_id = p.id
            ORDER BY qp.kolejnosc ASC, qp.id ASC
        ''')
        
        quick_products = []
        for row in cursor.fetchall():
            quick_products.append({
                'id': row['id'],
                'nazwa': row['nazwa'],
                'ikona': row['ikona'],
                'product_id': row['product_id'],
                'kolejnosc': row['kolejnosc'],
                'aktywny': row['aktywny'],
                'product_nazwa': row['product_nazwa'],
                'product_cena': row['product_cena'],
                'kod_kreskowy': row['kod_kreskowy'],
                'jednostka': row['jednostka']
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': quick_products,
            'count': len(quick_products)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd pobierania szybkich produktów: {str(e)}'
        }), 500

@quick_products_bp.route('/pos/quick-products', methods=['POST'])
def add_quick_product():
    """Dodaj nowy szybki produkt"""
    try:
        data = request.get_json()
        
        if not data.get('nazwa'):
            return jsonify({
                'success': False,
                'message': 'Nazwa jest wymagana'
            }), 400
            
        if not data.get('product_id'):
            return jsonify({
                'success': False,
                'message': 'ID produktu jest wymagane'
            }), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Sprawdź czy produkt istnieje
        cursor.execute('SELECT id FROM produkty WHERE id = ?', (data['product_id'],))
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Produkt o podanym ID nie istnieje'
            }), 404
        
        # Pobierz następną kolejność
        cursor.execute('SELECT COALESCE(MAX(kolejnosc), 0) + 1 as next_order FROM pos_quick_products')
        next_order = cursor.fetchone()['next_order']
        
        cursor.execute('''
            INSERT INTO pos_quick_products (nazwa, ikona, product_id, kolejnosc, aktywny)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['nazwa'],
            data.get('ikona', 'fas fa-shopping-bag'),
            data['product_id'],
            data.get('kolejnosc', next_order),
            1 if data.get('aktywny', True) else 0
        ))
        
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Szybki produkt dodany',
            'id': new_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd dodawania szybkiego produktu: {str(e)}'
        }), 500

@quick_products_bp.route('/pos/quick-products/<int:id>', methods=['PUT'])
def update_quick_product(id):
    """Aktualizuj szybki produkt"""
    try:
        data = request.get_json()
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Sprawdź czy istnieje
        cursor.execute('SELECT id FROM pos_quick_products WHERE id = ?', (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Szybki produkt nie znaleziony'
            }), 404
        
        # Jeśli zmienia się product_id, sprawdź czy nowy produkt istnieje
        if data.get('product_id'):
            cursor.execute('SELECT id FROM produkty WHERE id = ?', (data['product_id'],))
            if not cursor.fetchone():
                conn.close()
                return jsonify({
                    'success': False,
                    'message': 'Produkt o podanym ID nie istnieje'
                }), 404
        
        # Buduj zapytanie aktualizacji
        update_fields = []
        params = []
        
        if 'nazwa' in data:
            update_fields.append('nazwa = ?')
            params.append(data['nazwa'])
        if 'ikona' in data:
            update_fields.append('ikona = ?')
            params.append(data['ikona'])
        if 'product_id' in data:
            update_fields.append('product_id = ?')
            params.append(data['product_id'])
        if 'kolejnosc' in data:
            update_fields.append('kolejnosc = ?')
            params.append(data['kolejnosc'])
        if 'aktywny' in data:
            update_fields.append('aktywny = ?')
            params.append(1 if data['aktywny'] else 0)
        
        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        
        if update_fields:
            params.append(id)
            cursor.execute(f'''
                UPDATE pos_quick_products 
                SET {', '.join(update_fields)}
                WHERE id = ?
            ''', params)
            conn.commit()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Szybki produkt zaktualizowany'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd aktualizacji szybkiego produktu: {str(e)}'
        }), 500

@quick_products_bp.route('/pos/quick-products/<int:id>', methods=['DELETE'])
def delete_quick_product(id):
    """Usuń szybki produkt"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Sprawdź czy istnieje
        cursor.execute('SELECT id FROM pos_quick_products WHERE id = ?', (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Szybki produkt nie znaleziony'
            }), 404
        
        cursor.execute('DELETE FROM pos_quick_products WHERE id = ?', (id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Szybki produkt usunięty'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd usuwania szybkiego produktu: {str(e)}'
        }), 500

@quick_products_bp.route('/pos/quick-products/reorder', methods=['POST'])
def reorder_quick_products():
    """Zmień kolejność szybkich produktów"""
    try:
        data = request.get_json()
        
        if not data.get('order') or not isinstance(data['order'], list):
            return jsonify({
                'success': False,
                'message': 'Lista kolejności jest wymagana'
            }), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        for index, item_id in enumerate(data['order']):
            cursor.execute('''
                UPDATE pos_quick_products 
                SET kolejnosc = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (index, item_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Kolejność zaktualizowana'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd zmiany kolejności: {str(e)}'
        }), 500
