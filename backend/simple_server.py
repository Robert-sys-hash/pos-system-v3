#!/usr/bin/env python3
"""
Minimalny serwer testowy dla POS System V3
Tylko podstawowe endpointy do testowania połączenia
"""

from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'OK',
        'message': 'Minimalny serwer testowy działa',
        'version': '3.0.0-test'
    })

@app.route('/api/test-db')
def test_database():
    try:
        from utils.database import get_db_connection, execute_query
        
        # Test połączenia
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'status': 'ERROR',
                'message': 'Nie można połączyć się z bazą danych'
            }), 500
        
        conn.close()
        
        # Test zapytania
        result = execute_query("SELECT COUNT(*) as count FROM kupony")
        if result:
            count = result[0]['count']
            return jsonify({
                'status': 'OK',
                'message': 'Połączenie z bazą OK',
                'coupon_count': count
            })
        else:
            return jsonify({
                'status': 'ERROR',
                'message': 'Nie można wykonać zapytania'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'ERROR',
            'message': f'Błąd bazy danych: {str(e)}'
        }), 500

@app.route('/api/coupons/test')
def test_coupons():
    try:
        from utils.database import execute_query
        
        result = execute_query("SELECT * FROM kupony LIMIT 5")
        return jsonify({
            'status': 'OK',
            'message': 'Test kuponów',
            'data': result or []
        })
        
    except Exception as e:
        return jsonify({
            'status': 'ERROR',
            'message': f'Błąd pobierania kuponów: {str(e)}'
        }), 500

@app.route('/')
def home():
    return jsonify({
        'name': 'POS System V3 - Test Server',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'test_db': '/api/test-db',
            'test_coupons': '/api/coupons/test'
        }
    })

if __name__ == '__main__':
    print("🧪 Uruchamianie serwera testowego na porcie 5001...")
    print("🔗 Testuj: http://localhost:5001/api/health")
    print("🗄️  Test bazy: http://localhost:5001/api/test-db")
    app.run(debug=True, host='0.0.0.0', port=5001)
