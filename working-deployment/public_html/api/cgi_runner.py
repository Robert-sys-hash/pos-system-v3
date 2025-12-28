#!/usr/bin/env python3
"""
CGI Runner dla POS System V3 API
Uruchamia Flask aplikację w trybie CGI dla DirectAdmin
"""

import os
import sys
import cgitb

# Włącz debugging CGI
cgitb.enable()

# Dodaj ścieżkę do aplikacji
sys.path.insert(0, os.path.dirname(__file__))

# Importuj i uruchom aplikację
from app import create_app

# Stwórz aplikację Flask
application = create_app()

# CGI obsługuje request automatycznie przez WSGI
if __name__ == '__main__':
    from wsgiref.handlers import CGIHandler
    CGIHandler().run(application)
