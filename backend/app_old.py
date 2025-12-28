from flask import Flask, jsonify, request
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    
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

    @app.route('/api/test')
    def test():
        return jsonify({"message": "Simple API works", "status": "ok"})

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 8000))
    print(f"🚀 Starting Simple POS API on port {port}...")
    app.run(debug=False, host='0.0.0.0', port=port)
