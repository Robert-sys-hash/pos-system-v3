from flask import Flask, jsonify, request
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    
    # Database configuration
    app.config['SECRET_KEY'] = 'dev-secret-key-2024'
    app.config['DATABASE_PATH'] = os.path.abspath(os.path.join(os.path.dirname(__file__), 'kupony.db'))
    
    # CORS configuration
    CORS(app, 
         origins=['https://panelv3.pl', 'http://localhost:3000', 'http://localhost:3002'],
         allow_headers=['Content-Type', 'Authorization', 'Access-Control-Allow-Headers', 'Origin', 'Accept', 'X-Requested-With'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         supports_credentials=True)
    
    # Register blueprints with error handling
    blueprints = [
        ('api.coupons', 'coupons_bp'),
        ('api.customers', 'customers_bp'),
        ('api.products', 'products_bp'),
        ('api.pos', 'pos_bp'),
        ('api.categories', 'categories_bp'),
        ('api.warehouses', 'warehouses_bp'),
        ('api.locations', 'locations_bp'),
        ('api.auth', 'auth_bp'),
        ('api.transactions', 'transactions_bp'),
        ('api.sales_invoices', 'sales_invoices_api_bp'),
        ('api.purchase_invoices', 'purchase_invoices_bp'),
        ('api.admin', 'admin_bp'),
        ('api.manufacturers', 'manufacturers_bp'),
        ('api.rabaty', 'rabaty_bp'),
        ('api.messenger', 'messenger_bp'),
        ('api.custom_templates', 'custom_templates_bp'),
        ('api.document_prefixes', 'document_prefixes_bp'),
        ('api.orders', 'orders_bp'),
        ('api.announcements', 'announcements_bp'),
        ('api.location_pricing', 'location_pricing_bp'),
        ('api.warehouse_pricing', 'warehouse_pricing_bp'),
        ('api.cenowki_advanced', 'cenowki_api_bp'),
        ('api.shifts', 'shifts_bp'),
        ('api.fiscal', 'fiscal_bp'),
        ('api.product_reports', 'product_reports_bp'),
        ('api.warehouse_operations', 'warehouse_operations_bp'),
        ("api.kasa_bank", "kasa_bank_bp"),
    ]
    
    for module_name, blueprint_name in blueprints:
        try:
            module = __import__(module_name, fromlist=[blueprint_name])
            blueprint = getattr(module, blueprint_name)
            app.register_blueprint(blueprint, url_prefix='/api')
            print(f"✅ {blueprint_name} registered")
        except Exception as e:
            print(f"❌ Failed to register {blueprint_name}: {e}")
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "healthy", "message": "POS System V3 API is running"})
    
    @app.route('/api/info')
    def api_info():
        return jsonify({
            "service": "POS System V3 API",
            "version": "3.0.0",
            "status": "running"
        })
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    # Check database path
    db_path = app.config['DATABASE_PATH']
    print(f"🗄️  Database path: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        # Try alternative locations
        alternatives = [
            os.path.join(os.path.dirname(__file__), 'kupony.db'),
            os.path.join(os.path.dirname(__file__), '..', 'kupony.db'),
        ]
        for alt_path in alternatives:
            if os.path.exists(alt_path):
                print(f"✅ Found database: {alt_path}")
                app.config['DATABASE_PATH'] = alt_path
                break
    else:
        print("✅ Database found")
    
    port = int(os.environ.get('PORT', 8000))
    print(f"🚀 Starting POS System V3 API on port {port}...")
    print("📡 CORS configured for React frontend")
    
    app.run(debug=False, host='0.0.0.0', port=port)
