"""
Uproszczona wersja app.py bez blueprintów - tylko dla Railway deployment
"""
from flask import Flask, jsonify, request, send_from_directory, send_file, render_template
from flask_cors import CORS
import os
import sys
from datetime import datetime

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_app():
    app = Flask(__name__, static_folder=None)
    
    # Lista błędów blueprintów do debugowania  
    app.blueprint_errors = ["Blueprints disabled for Railway deployment - SQLite issues"]
    
    # Automatyczne wykrywanie środowiska
    if os.environ.get('RAILWAY_ENVIRONMENT'):
        # Railway production
        from config import ProductionConfig
        app.config.from_object(ProductionConfig())
        print("🚂 Railway production environment detected")
    elif os.environ.get('DYNO'):
        # Heroku production
        from config import ProductionConfig  
        app.config.from_object(ProductionConfig())
        print("🟣 Heroku production environment detected")
    else:
        # Development
        from config import DevelopmentConfig
        app.config.from_object(DevelopmentConfig())
        print("🛠️  Development environment")

    # Konfiguracja CORS
    cors_origins = app.config['CORS_ORIGINS']
    
    if os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('DYNO'):
        cors_origins = ['*']  # Dla produkcji dozwalamy wszystkie origins
    
    CORS(app, 
         origins=cors_origins,
         allow_headers=['Content-Type', 'Authorization', 'Access-Control-Allow-Headers', 'Origin', 'Accept', 'X-Requested-With'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         supports_credentials=True)

    print("⚠️  Blueprinty wyłączone na Railway - problem z SQLite")

    # Podstawowe API endpoints bez blueprintów
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'OK',
            'message': 'POS System V3 API is running',
            'version': '3.0.0'
        })

    @app.route('/api/test')
    def test_endpoint():
        return jsonify({
            'status': 'working',
            'message': 'Direct endpoint works',
            'time': datetime.now().isoformat()
        })

    @app.route('/api/debug/blueprint-errors')
    def debug_blueprint_errors():
        return jsonify({
            'blueprint_errors': app.blueprint_errors,
            'error_count': len(app.blueprint_errors),
            'working_directory': os.getcwd(),
            'backend_directory': os.path.dirname(__file__),
            'message': 'Blueprints disabled due to SQLite issues on Railway'
        })

    @app.route('/api/debug/blueprints')
    def debug_blueprints():
        return jsonify({
            'blueprints_count': len(app.blueprints),
            'blueprints': {},
            'all_routes_count': len(list(app.url_map.iter_rules())),
            'message': 'No blueprints loaded - SQLite not available'
        })

    @app.route('/api')
    def api_home():
        return jsonify({
            'name': 'POS System V3 API',
            'version': '3.0.0',
            'status': 'running',
            'description': 'Backend API for POS System V3 (Railway Deployment)',
            'note': 'Blueprints disabled due to SQLite issues',
            'available_endpoints': [
                '/api/health',
                '/api/test', 
                '/api/debug/blueprint-errors',
                '/api/debug/blueprints'
            ]
        })

    # Frontend routes na końcu
    @app.route('/favicon.ico')
    def favicon():
        static_dir = os.path.join(os.path.dirname(__file__), 'static')
        if os.path.exists(static_dir):
            return send_from_directory(static_dir, 'favicon.ico')
        return jsonify({'error': 'Favicon not found'}), 404

    @app.route('/static/<path:filename>')
    def static_files_route(filename):
        static_dir = os.path.join(os.path.dirname(__file__), 'static', 'static')
        if os.path.exists(static_dir):
            return send_from_directory(static_dir, filename)
        return jsonify({'error': 'Static file not found'}), 404

    @app.route('/')
    def serve_frontend_root():
        # Railway: backend/static/
        index_path = os.path.join(os.path.dirname(__file__), 'static', 'index.html')
        if os.path.exists(index_path):
            print(f"✅ Serving frontend from: {index_path}")
            return send_file(index_path)
        
        return jsonify({
            'message': 'POS System V3 - Frontend not found',
            'api': '/api'
        })

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend_path(path=''):
        # Przekieruj API do 404 - pozwól blueprintom obsłużyć
        if path.startswith('api/'):
            from flask import abort
            abort(404)
            
        # Dla frontendu - serwuj index.html
        index_path = os.path.join(os.path.dirname(__file__), 'static', 'index.html')
        if os.path.exists(index_path):
            return send_file(index_path)
            
        return jsonify({
            'message': 'POS System V3 - File not found',
            'requested_path': path,
            'api_available': '/api'
        })

    return app

# Utwórz instancję aplikacji
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    print(f"🚀 Uruchamianie POS System V3 API na porcie {port}...")
    app.run(debug=False, host='0.0.0.0', port=port)
