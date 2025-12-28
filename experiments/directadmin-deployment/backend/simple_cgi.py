#!/usr/bin/env python3
"""
Prostszy CGI dla DirectAdmin - obsługa tylko podstawowych ścieżek
"""

import sys
import os
import cgi
import cgitb
import json

# Włącz debugging CGI
cgitb.enable()

# Dodaj ścieżkę do bieżącego katalogu
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def application(environ, start_response):
    """WSGI application"""
    
    # Podstawowe nagłówki
    headers = [
        ('Content-Type', 'application/json'),
        ('Access-Control-Allow-Origin', '*'),
        ('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'),
        ('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    ]
    
    # Odpowiedź na OPTIONS (CORS preflight)
    if environ.get('REQUEST_METHOD') == 'OPTIONS':
        start_response('200 OK', headers)
        return [b'']
    
    # Podstawowa odpowiedź health check
    path_info = environ.get('PATH_INFO', '/')
    
    if path_info.startswith('/api/health') or path_info == '/health':
        response_data = {
            "status": "ok",
            "message": "DirectAdmin API is running",
            "timestamp": "2024-10-03T19:30:00Z"
        }
        start_response('200 OK', headers)
        return [json.dumps(response_data).encode('utf-8')]
    
    # Dla innych ścieżek
    response_data = {
        "error": "Not found", 
        "path": path_info,
        "message": "Use /api/health for health check"
    }
    start_response('404 Not Found', headers)
    return [json.dumps(response_data).encode('utf-8')]

# Dla CGI
if __name__ == '__main__':
    # CGI handling
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()  # Pusta linia przed danymi
    
    # Prosta odpowiedź JSON
    response = {
        "status": "ok",
        "message": "DirectAdmin CGI is working",
        "method": os.environ.get('REQUEST_METHOD', 'GET'),
        "path": os.environ.get('PATH_INFO', '/')
    }
    
    print(json.dumps(response))
