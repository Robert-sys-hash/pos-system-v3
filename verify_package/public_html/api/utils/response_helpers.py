"""
Response helpers for API endpoints
"""

from flask import jsonify

def success_response(data=None, message="Success"):
    """Zwraca sukces odpowiedzi"""
    return jsonify({
        'success': True,
        'message': message,
        'data': data
    })

def error_response(message="Error", status_code=400):
    """Zwraca błąd odpowiedzi"""
    response = jsonify({
        'success': False,
        'error': message
    })
    response.status_code = status_code
    return response

def not_found_response(message="Resource not found"):
    """Zwraca błąd 404"""
    return error_response(message, 404)

def validation_error_response(errors):
    """Zwraca błąd walidacji"""
    response = jsonify({
        'success': False,
        'error': 'Validation error',
        'validation_errors': errors
    })
    response.status_code = 400
    return response
