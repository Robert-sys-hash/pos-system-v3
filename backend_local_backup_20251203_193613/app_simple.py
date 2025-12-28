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
    
    # Register blueprints
    try:
        from api.coupons import coupons_bp
        app.register_blueprint(coupons_bp, url_prefix='/api')
        print("✅ Coupons blueprint OK")
    except Exception as e:
        print(f"❌ Błąd coupons blueprint: {e}")

    try:
        from api.customers import customers_bp
        app.register_blueprint(customers_bp, url_prefix='/api')
        print("✅ Customers blueprint OK")
    except Exception as e:
        print(f"❌ Błąd customers blueprint: {e}")

    try:
        from api.products import products_bp
        app.register_blueprint(products_bp, url_prefix='/api')
        print("✅ Products blueprint OK")
    except Exception as e:
        print(f"❌ Błąd products blueprint: {e}")

    try:
        from api.pos import pos_bp
        app.register_blueprint(pos_bp, url_prefix='/api')
        print("✅ POS blueprint OK")
    except Exception as e:
        print(f"❌ Błąd pos blueprint: {e}")

    try:
        from api.categories import categories_bp
        app.register_blueprint(categories_bp, url_prefix='/api')
        print("✅ Categories blueprint OK")
    except Exception as e:
        print(f"❌ Błąd categories blueprint: {e}")

    try:
        from api.warehouses import warehouses_bp
        app.register_blueprint(warehouses_bp, url_prefix='/api')
        print("✅ Warehouses blueprint OK")
    except Exception as e:
        print(f"❌ Błąd warehouses blueprint: {e}")

    try:
        from api.locations import locations_bp
        app.register_blueprint(locations_bp, url_prefix='/api')
        print("✅ Locations blueprint OK")
    except Exception as e:
        print(f"❌ Błąd locations blueprint: {e}")

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
        from api.product_reports import product_reports_bp
        app.register_blueprint(product_reports_bp, url_prefix='/api')
        print("✅ Product Reports blueprint OK")
    except Exception as e:
        print(f"❌ Błąd product_reports blueprint: {e}")

    @app.route('/api/test')
    def test():
        return jsonify({"message": "Simple API works", "status": "ok"})

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 8000))
    print(f"🚀 Starting Simple POS API on port {port}...")
    app.run(debug=False, host='0.0.0.0', port=port)
