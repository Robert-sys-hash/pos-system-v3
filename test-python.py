#!/usr/bin/env python3
import sys
import cgi
import cgitb

# Włącz debugowanie CGI
cgitb.enable()

# Nagłówki HTTP
print("Content-Type: text/plain")
print()

# Informacje o Python
print("Python version:", sys.version)
print("Python executable:", sys.executable)
print("Python path:", sys.path[:3])  # Tylko pierwsze 3 ścieżki

# Sprawdź dostępne moduły
try:
    import flask
    print("Flask:", flask.__version__)
except ImportError:
    print("Flask: NIEDOSTĘPNY")

try:
    import sqlite3
    print("SQLite3: DOSTĘPNY")
except ImportError:
    print("SQLite3: NIEDOSTĘPNY")

try:
    import json
    print("JSON: DOSTĘPNY")
except ImportError:
    print("JSON: NIEDOSTĘPNY")
