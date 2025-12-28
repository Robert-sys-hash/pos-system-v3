from flask import Blueprint, jsonify

locations_bp = Blueprint('locations', __name__)

@locations_bp.route('/')
def get_locations():
    return jsonify({
        'success': True,
        'data': {
            'locations': [
                {
                    'id': 1,
                    'nazwa': 'Test Location',
                    'kod_lokalizacji': 'TEST001',
                    'typ': 'sklep',
                    'adres': 'Test address',
                    'miasto': 'Test city',
                    'aktywny': 1
                }
            ],
            'count': 1
        }
    })
