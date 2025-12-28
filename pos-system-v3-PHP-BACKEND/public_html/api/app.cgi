#!/usr/bin/env python3
"""
CGI wrapper dla POS System V3 API
Plik do umieszczenia w cgi-bin/python3/ na serwerze DirectAdmin
"""

import sys
import os
import cgitb

# Włącz debugging CGI
cgitb.enable()

# Dodaj ścieżkę do aplikacji
sys.path.insert(0, '/home/username/domains/yourdomain.com/public_html/api')

# Import aplikacji Flask
try:
    from app import create_app
    
    # Utwórz aplikację
    app = create_app()
    
    # Uruchom aplikację
    if __name__ == '__main__':
        # Dla CGI używamy wsgi
        from wsgiref.handlers import CGIHandler
        CGIHandler().run(app)
        
except Exception as e:
    print("Content-Type: application/json\n")
    print(f'{{"error": "Application failed to start", "details": "{str(e)}"}}')
