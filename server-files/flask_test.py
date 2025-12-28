#!/usr/bin/env python3
import sys
import os

# Dodaj ścieżkę do aplikacji
sys.path.insert(0, '/home/forboty/domains/panelv3.pl/public_html/api')

# Nagłówki HTTP
print("Content-Type: application/json")
print("Access-Control-Allow-Origin: *")
print("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS") 
print("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With")
print()

try:
    # Test importu Flask app
    from app import create_app
    
    # Ustaw zmienne środowiskowe
    os.environ['FLASK_ENV'] = 'production'
    os.environ['DATABASE_PATH'] = '/home/forboty/domains/panelv3.pl/public_html/api/kupony.db'
    os.environ['DOMAIN'] = 'panelv3.pl'
    
    # Utwórz aplikację
    app = create_app()
    
    import json
    print(json.dumps({
        "status": "ok", 
        "message": "Flask app loaded successfully",
        "app_name": app.name,
        "config_debug": app.config.get('DEBUG', False)
    }))
    
except ImportError as e:
    import json
    print(json.dumps({"error": "Import error", "details": str(e)}))
except Exception as e:
    import json
    print(json.dumps({"error": "Flask error", "details": str(e)}))
