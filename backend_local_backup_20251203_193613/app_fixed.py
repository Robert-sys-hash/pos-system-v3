"""
POS System V3 - Flask API Backend
Główny plik aplikacji Flask z konfiguracją CORS i rejestracją blueprintów
"""

from flask import Flask, jsonify, request, send_from_directory, send_file, render_template
from flask_cors import CORS
import os
import sys
from datetime import datetime

# Załaduj zmienne środowiskowe - opcjonalnie
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv nie jest dostępny, używamy zmiennych środowiskowych Railway
    pass

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_app():
    # Konfiguracja ścieżek dla frontendu
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build'))
    
    app = Flask(__name__, static_folder=None)
    
    # Lista błędów blueprintów do debugowania  
    app.blueprint_errors = []
    
    # Określ środowisko
    env = os.environ.get('FLASK_ENV', 'development')
    domain = os.environ.get('DOMAIN')
    
    # Załaduj konfigurację
    from config import config
    if env == 'production' and domain:
        app_config = config['production'](domain)
    else:
        app_config = config.get(env, config['default'])()
    
    # Zastosuj konfigurację
    app.config['SECRET_KEY'] = app_config.SECRET_KEY
    app.config['DEBUG'] = app_config.DEBUG
    app.config['DATABASE_PATH'] = app_config.DATABASE_PATH
    
    # Konfiguracja CORS - dodajemy obsługę Heroku
    cors_origins = app_config.CORS_ORIGINS
    
    # Jeśli to Heroku, dodaj domeny .herokuapp.com
    if os.environ.get('DYNO'):  # DYNO jest zmienną środowiskową Heroku
        cors_origins = ['*']  # Dla Heroku dozwalamy wszystkie origins
    
    CORS(app, 
         origins=cors_origins,
         allow_headers=['Content-Type', 'Authorization', 'Access-Control-Allow-Headers', 'Origin', 'Accept', 'X-Requested-With'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         supports_credentials=True)
    
    # Rejestracja blueprintów API
    blueprint_errors = []
    try:
        # 1. Najpierw blueprint kuponów!
        from api.coupons import coupons_bp
        app.register_blueprint(coupons_bp, url_prefix='/api')
        print("✅ Coupons blueprint OK (pierwszy)")
    except Exception as e:
        error_msg = f"❌ Błąd coupons blueprint: {e}"
        print(error_msg)
        app.blueprint_errors.append(error_msg)


    # Potem reszta - poza except
        from api.customers import customers_bp
        from api.products import products_bp  
        from api.pos import pos_bp
        from api.categories import categories_bp
        print("✅ Podstawowe blueprinty załadowane")
        app.register_blueprint(customers_bp, url_prefix='/api')
        app.register_blueprint(products_bp, url_prefix='/api')
        app.register_blueprint(pos_bp, url_prefix='/api')
        app.register_blueprint(categories_bp, url_prefix='/api')
        print("✅ Podstawowe blueprinty zarejestrowane")

        # Dodaj nowe blueprinty z obsługą błędów
        try:
            from api.transactions import transactions_bp
            app.register_blueprint(transactions_bp, url_prefix='/api')
            print("✅ Transactions blueprint OK")
        except Exception as e:
            print(f"❌ Błąd transactions blueprint: {e}")
        try:
            from api.shifts import shifts_bp
            app.register_blueprint(shifts_bp, url_prefix='/api')
            print("✅ Shifts blueprint OK")
        except Exception as e:
            print(f"❌ Błąd shifts blueprint: {e}")
            
        try:
            from api.shifts_enhanced import shifts_enhanced_bp
            app.register_blueprint(shifts_enhanced_bp, url_prefix='/api')
            print("✅ Shifts Enhanced blueprint OK")
        except Exception as e:
            print(f"❌ Błąd shifts enhanced blueprint: {e}")
        # Dodaj blueprint autoryzacji
        try:
            from api.auth import auth_bp
            app.register_blueprint(auth_bp, url_prefix='/api')
            print("✅ Auth blueprint OK")
        except Exception as e:
            print(f"❌ Błąd auth blueprint: {e}")
        # Dodaj blueprint faktur
        try:
            from api.invoices import invoices_bp
            app.register_blueprint(invoices_bp, url_prefix='/api')
            print("✅ Invoices blueprint OK")
        except Exception as e:
            print(f"❌ Błąd invoices blueprint: {e}")
        # Dodaj blueprint administracji
        try:
            from api.admin import admin_bp
            app.register_blueprint(admin_bp, url_prefix='/api')
            print("✅ Admin blueprint OK")
        except Exception as e:
            print(f"❌ Błąd admin blueprint: {e}")
        
        # Dodaj blueprint producentów
        try:
            from api.manufacturers import manufacturers_bp
            app.register_blueprint(manufacturers_bp, url_prefix='/api')
            print("✅ Manufacturers blueprint OK")
        except Exception as e:
            print(f"❌ Błąd manufacturers blueprint: {e}")
        
        # Dodaj blueprint cenówek (stary)
        try:
            from api.cenowki import cenowki_bp
            app.register_blueprint(cenowki_bp, url_prefix='/api/cenowki')
            print("✅ Cenowki blueprint OK")
        except Exception as e:
            print(f"❌ Błąd cenowki blueprint: {e}")
        
        # Dodaj blueprint cenówek z uproszczonymi nazwami (nowy)
        try:
            from api.cenowki_advanced import cenowki_api_bp
            app.register_blueprint(cenowki_api_bp, url_prefix='/api')
            print("✅ Cenowki Advanced blueprint OK")
        except Exception as e:
            print(f"❌ Błąd cenowki_advanced blueprint: {e}")
        
        # Dodaj blueprint faktur sprzedaży
        try:
            from api.sales_invoices import sales_invoices_api_bp
            app.register_blueprint(sales_invoices_api_bp, url_prefix='/api')
            print("✅ Sales Invoices blueprint OK")
        except Exception as e:
            print(f"❌ Błąd sales_invoices blueprint: {e}")
        
        # Dodaj blueprint raportów produktowych
        try:
            from api.product_reports import product_reports_bp
            app.register_blueprint(product_reports_bp, url_prefix='/api')
            print("✅ Product Reports blueprint OK")
        except Exception as e:
            print(f"❌ Błąd product_reports blueprint: {e}")
        
        # Dodaj blueprint kasa/bank
        try:
            from api.kasa_bank import kasa_bank_bp
            app.register_blueprint(kasa_bank_bp, url_prefix='/api/kasa-bank')
            print("✅ Kasa/Bank blueprint OK")
        except Exception as e:
            print(f"❌ Błąd kasa_bank blueprint: {e}")
        
        # Dodaj blueprint lokalizacji
        try:
            from api.locations import locations_bp
            app.register_blueprint(locations_bp, url_prefix='/api/locations')
            print("✅ Locations blueprint OK")
        except Exception as e:
            print(f"❌ Błąd locations blueprint: {e}")
            
        # Dodaj blueprint faktur zakupowych
        try:
            from api.purchase_invoices import purchase_invoices_bp
            app.register_blueprint(purchase_invoices_bp, url_prefix='/api')
            print("✅ Purchase invoices blueprint OK")
        except Exception as e:
            print(f"❌ Błąd purchase_invoices blueprint: {e}")
        
        # Dodaj blueprint magazynów wielomagazynowych
        try:
            from api.warehouses import warehouses_bp
            app.register_blueprint(warehouses_bp, url_prefix='/api')
            print("✅ Warehouses blueprint OK")
        except Exception as e:
            print(f"❌ Błąd warehouses blueprint: {e}")
        
        # Dodaj blueprint customowych szablonów faktur
        try:
            from api.custom_templates import custom_templates_bp
            app.register_blueprint(custom_templates_bp, url_prefix='/api')
            print("✅ Custom Templates blueprint OK")
        except Exception as e:
            print(f"❌ Błąd custom_templates blueprint: {e}")
        
        # Dodaj blueprint komunikatora/czatu pracowników
        try:
            from api.messenger import messenger_bp
            app.register_blueprint(messenger_bp, url_prefix='/api/messenger')
            print("✅ Messenger blueprint OK")
        except Exception as e:
            print(f"❌ Błąd messenger blueprint: {e}")
        
        # Dodaj blueprint rabatów POS
        try:
            from api.rabaty import rabaty_bp
            app.register_blueprint(rabaty_bp, url_prefix='/api')
            print("✅ Rabaty blueprint OK")
        except Exception as e:
            print(f"❌ Błąd rabaty blueprint: {e}")
        except Exception as e:
            print(f"❌ Błąd messenger blueprint: {e}")
        
        # Dodaj blueprint zamówień od klientów
        try:
            from api.orders import orders_bp
            app.register_blueprint(orders_bp, url_prefix='/api')
            print("✅ Orders blueprint OK")
        except Exception as e:
            print(f"❌ Błąd orders blueprint: {e}")

        try:
            from api.warehouse_operations import warehouse_operations_bp
            app.register_blueprint(warehouse_operations_bp, url_prefix='/api')
            print("✅ Warehouse operations blueprint OK")
        except Exception as e:
            print(f"❌ Błąd warehouse operations blueprint: {e}")
        
        # Dodaj blueprint cennika lokalizacyjnego
        try:
            from api.warehouse_pricing import warehouse_pricing_bp
            app.register_blueprint(warehouse_pricing_bp, url_prefix='/api')
            print("✅ Location pricing blueprint OK")
        except Exception as e:
            print(f"❌ Błąd location pricing blueprint: {e}")
        
        # Dodaj blueprint ogłoszeń
        try:
            from api.announcements import announcements_bp
            app.register_blueprint(announcements_bp)
            print("✅ Announcements blueprint OK")
        except Exception as e:
            print(f"❌ Błąd announcements blueprint: {e}")
        
        # Dodaj blueprint prefiksów dokumentów
        try:
            from api.document_prefixes import document_prefixes_bp
            app.register_blueprint(document_prefixes_bp, url_prefix='/api')
            print("✅ Document Prefixes blueprint OK")
        except Exception as e:
            print(f"❌ Błąd document prefixes blueprint: {e}")
        
        # Dodaj blueprint drukarki fiskalnej
        try:
            from api.fiscal import fiscal_bp
            app.register_blueprint(fiscal_bp, url_prefix='/api')
            print("✅ Fiscal Printer blueprint OK")
        except Exception as e:
            print(f"❌ Błąd fiscal printer blueprint: {e}")

        # Kontynuuj dalej - nie zwracaj app tutaj!
    
    except ImportError as e:
        print(f"Błąd importu blueprintów: {e}")
    
    # Endpoint zdrowia API
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'OK',
            'message': 'POS System V3 API is running',
            'version': '3.0.0'
        })
    
    # Endpoint inicjalizacji wielomagazynowego systemu
    @app.route('/api/init-multiwarehouse')
    def init_multiwarehouse():
        try:
            from api.warehouses import init_warehouse_tables
            init_warehouse_tables()
            return jsonify({
                'success': True, 
                'message': 'System wielomagazynowy został zainicjalizowany'
            })
        except Exception as e:
            return jsonify({
                'success': False, 
                'error': f'Błąd inicjalizacji: {e}'
            }), 500
    
    # Endpoint dla użytkowników (dla zarządzania magazynami)
    @app.route('/api/users', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def manage_users():
        try:
            from utils.database import execute_query, execute_insert
            
            if request.method == 'GET':
                users = execute_query("SELECT id, login, typ as user_type FROM users ORDER BY login", ())
                if users is None:
                    users = []
                return jsonify({
                    'success': True,
                    'data': users,
                    'message': f'Znaleziono {len(users)} użytkowników'
                })
            
            elif request.method == 'POST':
                data = request.get_json()
                query = "INSERT INTO users (login, haslo, typ) VALUES (?, ?, ?)"
                params = (data['login'], data['haslo'], data['typ'])
                result = execute_insert(query, params)
                if result:
                    return jsonify({'success': True, 'message': 'Użytkownik dodany pomyślnie'})
                else:
                    return jsonify({'success': False, 'message': 'Błąd dodawania użytkownika'}), 500
                    
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd zarządzania użytkownikami: {e}'
            }), 500
    
    # Informacje o API
    @app.route('/api/info')
    def api_info():
        return jsonify({
            'name': 'POS System V3 API',
            'version': '3.0.0',
            'endpoints': {
                'health': '/api/health',
                'customers': {
                    'search': '/api/customers/search',
                    'details': '/api/customers/{id}',
                    'stats': '/api/customers/stats'
                },
                'products': {
                    'search': '/api/products/search',
                    'details': '/api/products/{id}',
                    'barcode': '/api/products/barcode/{code}',
                    'categories': '/api/products/categories',
                    'low_stock': '/api/products/low-stock',
                    'update_inventory': '/api/products/{id}/inventory'
                },
                'transactions': {
                    'create': '/api/transactions',
                    'get': '/api/transactions/{id}',
                    'update': '/api/transactions/{id}',
                    'complete': '/api/transactions/{id}/complete',
                    'drafts': '/api/transactions/drafts'
                },
                'shifts': {
                    'current': '/api/shifts/current',
                    'open': '/api/shifts/open',
                    'close': '/api/shifts/close',
                    'open_enhanced': '/api/shifts/open-enhanced',
                    'close_enhanced': '/api/shifts/close-enhanced',
                    'report': '/api/shifts/{id}/report',
                    'history': '/api/shifts/history'
                },
                'auth': {
                    'login': '/api/auth/login',
                    'logout': '/api/auth/logout',
                    'check': '/api/auth/check',
                    'profile': '/api/auth/profile'
                },
                'coupons': {
                    'search': '/api/coupons/search',
                    'validate': '/api/coupons/validate/{code}',
                    'use': '/api/coupons/use/{code}',
                    'stats': '/api/coupons/stats'
                },
                'invoices': {
                    'search': '/api/invoices/search',
                    'details': '/api/invoices/{id}',
                    'stats': '/api/invoices/stats',
                    'suppliers': '/api/invoices/suppliers'
                },
                'admin': {
                    'users': '/api/admin/users',
                    'system_info': '/api/admin/system',
                    'settings': '/api/admin/settings',
                    'daily_closure_reports': '/api/admin/daily-closure-reports',
                    'daily_closure_report_details': '/api/admin/daily-closure-reports/{id}'
                },
                'cenowki': {
                    'products': '/api/cenowki/products',
                    'categories': '/api/cenowki/categories',
                    'stats': '/api/cenowki/stats',
                    'price_update': '/api/cenowki/products/{id}/price'
                },
                'kasa_bank': {
                    'saldo': '/api/kasa-bank/saldo',
                    'operacje': '/api/kasa-bank/operacje',
                    'summary': '/api/kasa-bank/summary/daily',
                    'stats': '/api/kasa-bank/stats/monthly'
                },
                'locations': {
                    'list': '/api/locations/',
                    'details': '/api/locations/{id}',
                    'search': '/api/locations/search',
                    'stats': '/api/locations/{id}/stats'
                },
                'pos': '/api/pos/stats'
            }
        })
    
    # API info endpoint - przeniesiony z głównej strony
    @app.route('/api')
    def api_home():
        return jsonify({
            'name': 'POS System V3 API',
            'version': '3.0.0',
            'status': 'running',
            'description': 'Backend API for POS System V3',
            'frontend_url': os.environ.get('FRONTEND_URL', 'https://web-production-c493.up.railway.app'),
            'modules': [
                'products', 'customers', 'pos', 'shifts', 'auth', 'coupons',
                'invoices', 'admin', 'cenowki', 'kasa-bank', 'locations'
            ],
            'api_docs': {
                'health': '/api/health',
                'info': '/api/info',
                'products': '/api/products/search?query=mleko',
                'customers': '/api/customers/search?query=Jan',
                'stats': '/api/products/stats',
                'cenowki': '/api/cenowki/products',
                'kasa_bank': '/api/kasa-bank/saldo',
                'locations': '/api/locations/'
            },
            'usage': f'This is an API backend. Frontend available at: {os.environ.get("FRONTEND_URL", "https://web-production-c493.up.railway.app")}'
        })
    
    @app.route('/api/debug/blueprint-errors')
    def debug_blueprint_errors():
        """Debug błędów podczas ładowania blueprintów"""
        return jsonify({
            'blueprint_errors': app.blueprint_errors,
            'error_count': len(app.blueprint_errors),
            'working_directory': os.getcwd(),
            'backend_directory': os.path.dirname(__file__),
            'python_path': sys.path
        })

    @app.route('/api/debug/blueprints')
    def debug_blueprints():
        """Debug info o zarejestrowanych blueprintach"""
        blueprints_info = {}
        for name, blueprint in app.blueprints.items():
            blueprints_info[name] = {
                'name': blueprint.name,
                'url_prefix': getattr(blueprint, 'url_prefix', None),
                'routes': []
            }
            
            # Pobierz routes blueprintu
            for rule in app.url_map.iter_rules():
                if rule.endpoint.startswith(f'{name}.'):
                    blueprints_info[name]['routes'].append({
                        'endpoint': rule.endpoint,
                        'rule': str(rule),
                        'methods': list(rule.methods)
                    })
        
        return jsonify({
            'blueprints_count': len(app.blueprints),
            'blueprints': blueprints_info,
            'all_routes_count': len(list(app.url_map.iter_rules()))
        })

    @app.route('/api/test')
    def test_endpoint():
        """Prosty test endpoint bez blueprintów"""
        return jsonify({
            'status': 'working',
            'message': 'Direct endpoint works',
            'time': datetime.now().isoformat()
        })

    @app.route('/api/debug/database')
    def debug_database():
        """Debug info o bazie danych"""
        import sqlite3
        db_path = app.config.get('DATABASE_PATH')
        current_dir = os.path.dirname(__file__)
        
        debug_info = {
            'config_db_path': db_path,
            'current_directory': current_dir,
            'db_exists': os.path.exists(db_path) if db_path else False,
            'possible_paths': [],
            'working_directory': os.getcwd()
        }
        
        # Sprawdź wszystkie możliwe lokalizacje
        possible_paths = [
            os.path.join(current_dir, 'kupony.db'),
            os.path.join(current_dir, '..', 'kupony.db'),
            os.path.join(current_dir, '..', '..', 'kupony.db'),
            'kupony.db'
        ]
        
        for path in possible_paths:
            abs_path = os.path.abspath(path)
            debug_info['possible_paths'].append({
                'path': path,
                'absolute_path': abs_path,
                'exists': os.path.exists(abs_path)
            })
            
        # Sprawdź czy możemy połączyć się z bazą
        if db_path and os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table'")
                table_count = cursor.fetchone()[0]
                conn.close()
                debug_info['database_status'] = 'connected'
                debug_info['tables_count'] = table_count
            except Exception as e:
                debug_info['database_status'] = f'error: {str(e)}'
        else:
            debug_info['database_status'] = 'not_found'
            
        return jsonify(debug_info)

    # ===== FRONTEND ROUTES - MUSZĄ BYĆ NA KOŃCU =====
    # Frontend routes muszą być po wszystkich API routes!
    
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

    # Obsługa frontendu - serwuj React build
    @app.route('/')
    def serve_frontend_root():
        # Sprawdź różne lokalizacje frontendu
        possible_paths = [
            os.path.join(os.path.dirname(__file__), 'static', 'index.html'),  # Railway: backend/static/
            os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build', 'index.html'),  # Lokalne
            os.path.join(os.path.dirname(__file__), '..', 'build', 'index.html')  # Alternatywne
        ]
        
        for index_path in possible_paths:
            if os.path.exists(index_path):
                print(f"✅ Serving frontend from: {index_path}")
                return send_file(index_path)
        
        # Debug info jeśli nie znajdzie
        current_dir = os.path.dirname(__file__)
        static_dir = os.path.join(current_dir, 'static')
        debug_info = {
            'message': 'POS System V3 - Frontend files not found',
            'searched_paths': possible_paths,
            'current_dir': current_dir,
            'static_dir_exists': os.path.exists(static_dir),
            'api': '/api'
        }
        
        if os.path.exists(static_dir):
            debug_info['static_contents'] = os.listdir(static_dir)
        
        return jsonify(debug_info)

    # Catch-all route TYLKO dla frontendu - wyklucza API
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend_path(path=''):
        # NATYCHMIAST przekieruj API do 404 - nie przetwarzaj
        if path.startswith('api/'):
            from flask import abort
            abort(404)
            
        # Sprawdź czy to plik statyczny
        possible_base_dirs = [
            os.path.join(os.path.dirname(__file__), 'static'),
            os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build'),
            os.path.join(os.path.dirname(__file__), '..', 'build')
        ]
        
        for base_dir in possible_base_dirs:
            file_path = os.path.join(base_dir, path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                return send_file(file_path)
        
        # Dla wszystkich innych ścieżek - serwuj index.html (React Router)
        for base_dir in possible_base_dirs:
            index_path = os.path.join(base_dir, 'index.html')
            if os.path.exists(index_path):
                return send_file(index_path)
            
        return jsonify({
            'message': 'POS System V3 - File not found',
            'requested_path': path,
            'api_available': '/api'
        })

    return app

# Utwórz instancję aplikacji dla Heroku
app = create_app()

if __name__ == '__main__':
    # Sprawdź połączenie z bazą danych przy starcie
    db_path = app.config['DATABASE_PATH']
    print(f"🗄️  Ścieżka do bazy danych: {db_path}")
    
    if os.path.exists(db_path):
        print("✅ Baza danych znaleziona")
    else:
        print(f"❌ Baza danych nie istnieje: {db_path}")
        print("🔍 Sprawdzam alternatywne lokalizacje...")
        # Sprawdź różne możliwe lokalizacje bazy
        alternatives = [
            os.path.join(os.path.dirname(__file__), 'kupony.db'),  # backend/kupony.db (Railway)
            os.path.join(os.path.dirname(__file__), '..', 'kupony.db'),  # Lokalne
            os.path.join(os.path.dirname(__file__), '..', '..', 'kupony.db'),
        ]
        for alt_path in alternatives:
            if os.path.exists(alt_path):
                print(f"✅ Znaleziono bazę: {alt_path}")
                app.config['DATABASE_PATH'] = alt_path
                break
    
    # Uruchom scheduler automatycznych backupów
    try:
        from utils.scheduler import auto_backup_scheduler
        auto_backup_scheduler.init_app(app)
        auto_backup_scheduler.start_scheduler()
        print("✅ Scheduler automatycznych backupów uruchomiony")
    except Exception as e:
        print(f"❌ Błąd uruchamiania schedulera: {e}")
    
    # Heroku ustawi PORT w zmiennych środowiskowych
    port = int(os.environ.get('PORT', 8000))
    
    print(f"🚀 Uruchamianie POS System V3 API na porcie {port}...")
    print("📡 CORS skonfigurowany dla React frontend")
    
    app.run(debug=False, host='0.0.0.0', port=port)
