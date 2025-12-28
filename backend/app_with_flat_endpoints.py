"""
POS System V3 - Flask API Backend
Główny plik aplikacji Flask z konfiguracją CORS i rejestracją blueprintów
"""

from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
import os
import sys
from dotenv import load_dotenv

# Załaduj zmienne środowiskowe
load_dotenv()

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_app():
    app = Flask(__name__)
    
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
    
    # Konfiguracja CORS - WILDCARD dla testów
    CORS(app, 
         origins="*",  # Pozwól wszystkim (tymczasowo)
         allow_headers=['Content-Type', 'Authorization', 'Access-Control-Allow-Headers', 'Origin', 'Accept', 'X-Requested-With'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         supports_credentials=True)
    
    # Rejestracja blueprintów API
    try:
        # 1. Najpierw blueprint kuponów!
        from api.coupons import coupons_bp
        app.register_blueprint(coupons_bp, url_prefix='/api')
        print("✅ Coupons blueprint OK (pierwszy)")

        # Potem reszta
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
    
    # Główna strona API - informacje dla deweloperów
    @app.route('/')
    def api_home():
        return jsonify({
            'name': 'POS System V3 API',
            'version': '3.0.0',
            'status': 'running',
            'description': 'Backend API for POS System V3',
            'frontend_url': 'http://localhost:3002',
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
            'usage': 'This is an API backend. Please use the React frontend at http://localhost:3000'
        })
    
    # Favicon - zapobieganie błędom 404
    @app.route('/favicon.ico')
    def favicon():
        return '', 204  # No content
    
    # NAPRAWIENIE PROBLEMÓW ROUTINGU FRONTEND
    
    # 1. Przekierowania dla podwójnego /api/api/
    @app.route('/api/api/<path:path>')
    def redirect_double_api(path):
        """Przekierowanie /api/api/xyz -> /api/xyz"""
        return redirect(f'/api/{path}', code=301)
    
    # 2. Endpoint /api/locations bez slasha
    @app.route('/api/locations')
    def locations_redirect():
        """Przekierowanie /api/locations -> /api/locations/"""
        return redirect('/api/locations/', code=301)
    
    # 3. Endpoint categories/flat jeśli nie istnieje
    @app.route('/api/categories/flat')
    def categories_flat():
        """Endpoint płaskich kategorii"""
        try:
            from utils.database import execute_query
            query = """
            SELECT DISTINCT 
                category_old as name,
                category_old as id,
                COUNT(*) as product_count
            FROM products 
            WHERE category_old IS NOT NULL 
              AND category_old != ''
            GROUP BY category_old
            ORDER BY category_old
            """
            categories = execute_query(query, ())
            if categories is None:
                categories = []
            
            return jsonify({
                'success': True,
                'data': categories,
                'message': f'Znaleziono {len(categories)} kategorii'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd kategorii: {e}'
            }), 500
    
    # NORMALIZACJA FORMATÓW DANYCH DLA FRONTEND
    
    # Customers endpoint z płaską strukturą
    @app.route('/api/customers/flat')
    def customers_flat():
        """Endpoint klientów ze znormalizowanym formatem"""
        try:
            from utils.database import execute_query
            query = """
            SELECT id, name, imie, nazwisko, email, phone, 
                   address, miasto, kod_pocztowy, ulica,
                   created_at, updated_at
            FROM customers 
            ORDER BY name
            """
            customers = execute_query(query, ())
            if customers is None:
                customers = []
            
            return jsonify({
                'success': True,
                'data': customers,
                'message': f'Pobrano {len(customers)} klientów'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd klientów: {e}'
            }), 500
    
    # Warehouses endpoint z płaską strukturą  
    @app.route('/api/warehouses/flat')
    def warehouses_flat():
        """Endpoint magazynów ze znormalizowanym formatem"""
        try:
            from utils.database import execute_query
            query = """
            SELECT id, nazwa, kod_magazynu, location_id, aktywny,
                   miasto, wojewodztwo
            FROM warehouses 
            WHERE aktywny = 1
            ORDER BY nazwa
            """
            warehouses = execute_query(query, ())
            if warehouses is None:
                warehouses = []
            
            return jsonify({
                'success': True,
                'data': warehouses,
                'message': f'Znaleziono {len(warehouses)} magazynów'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd magazynów: {e}'
            }), 500
    
    # Coupons endpoint z płaską strukturą
    @app.route('/api/coupons/flat')
    def coupons_flat():
        """Endpoint kuponów ze znormalizowanym formatem"""
        try:
            from utils.database import execute_query
            query = """
            SELECT id, code, discount_amount, discount_type, status,
                   usage_limit, used_count, valid_from, valid_to,
                   created_at, updated_at
            FROM coupons 
            ORDER BY created_at DESC
            """
            coupons = execute_query(query, ())
            if coupons is None:
                coupons = []
            
            return jsonify({
                'success': True,
                'data': coupons,
                'message': f'Znaleziono {len(coupons)} kuponów'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd kuponów: {e}'
            }), 500

    # Override customers endpoint - zwraca array zamiast object
    @app.route('/api/customers')
    def customers_normalized():
        """Endpoint klientów z znormalizowanym formatem"""
        try:
            from api.customers import customers_bp
            # Pobierz dane z oryginalnego endpointu
            import requests
            response = requests.get(f'http://localhost:{port}/api/customers-original')
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'customers' in data.get('data', {}):
                    return jsonify({
                        'success': True,
                        'data': data['data']['customers'],  # Zwróć array bezpośrednio
                        'message': data.get('message', 'Pobrano klientów')
                    })
            
            # Fallback - bezpośrednie pobranie z bazy
            from utils.database import execute_query
            query = """
            SELECT id, name, imie, nazwisko, email, phone, 
                   address, miasto, kod_pocztowy, ulica,
                   created_at, updated_at
            FROM customers 
            ORDER BY name
            """
            customers = execute_query(query, ())
            if customers is None:
                customers = []
            
            return jsonify({
                'success': True,
                'data': customers,
                'message': f'Pobrano {len(customers)} klientów'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd klientów: {e}'
            }), 500
    
    # Override warehouses endpoint - zwraca array zamiast object  
    @app.route('/api/warehouses')
    def warehouses_normalized():
        """Endpoint magazynów z znormalizowanym formatem"""
        try:
            from utils.database import execute_query
            query = """
            SELECT id, nazwa, kod_magazynu, location_id, aktywny,
                   miasto, wojewodztwo
            FROM warehouses 
            WHERE aktywny = 1
            ORDER BY nazwa
            """
            warehouses = execute_query(query, ())
            if warehouses is None:
                warehouses = []
            
            return jsonify({
                'success': True,
                'data': warehouses,  # Zwróć array bezpośrednio
                'message': f'Znaleziono {len(warehouses)} magazynów'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd magazynów: {e}'
            }), 500
    
    # Override coupons endpoint - zwraca array zamiast object
    @app.route('/api/coupons')
    def coupons_normalized():
        """Endpoint kuponów z znormalizowanym formatem"""
        try:
            from utils.database import execute_query
            query = """
            SELECT id, code, discount_amount, discount_type, status,
                   usage_limit, used_count, valid_from, valid_to,
                   created_at, updated_at
            FROM coupons 
            ORDER BY created_at DESC
            """
            coupons = execute_query(query, ())
            if coupons is None:
                coupons = []
            
            return jsonify({
                'success': True,
                'data': coupons,  # Zwróć array bezpośrednio
                'message': f'Znaleziono {len(coupons)} kuponów'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd kuponów: {e}'
            }), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    
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
            os.path.join(os.path.dirname(__file__), '..', 'kupony.db'),
            os.path.join(os.path.dirname(__file__), '..', '..', 'kupony.db'),
            '/Users/robertkaczkowski/Downloads/SS/v2/v1/pos-system-v3/kupony.db'
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
