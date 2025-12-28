#!/usr/bin/env python3
import sys
import os
import cgitb

cgitb.enable()
sys.path.insert(0, '/home/forboty/domains/panelv3.pl/public_html/api')

os.environ['FLASK_ENV'] = 'production'
os.environ['DATABASE_PATH'] = '/home/forboty/domains/panelv3.pl/public_html/api/kupony.db'
os.environ['DOMAIN'] = 'panelv3.pl'

try:
    from app import create_app
    app = create_app()
    
    from wsgiref.handlers import CGIHandler
    CGIHandler().run(app)
        
except Exception as e:
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    import json
    print(json.dumps({"error": str(e)}))
