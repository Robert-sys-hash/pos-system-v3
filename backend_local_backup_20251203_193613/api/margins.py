"""
API endpoint for centralized margin calculations
"""

from flask import Blueprint, request, jsonify
import sys
import os
from datetime import datetime

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

margins_bp = Blueprint('margins_new', __name__)

print("🔍 MARGINS: Blueprint margins został zainicjowany! WERSJA 2024-12-02-20:05")

@margins_bp.route('/', methods=['GET'])
def margins_root():
    """Root endpoint for margins API"""
    print("🔍 MARGINS: Root endpoint wywołany - NOWA WERSJA")
    return jsonify({
        'success': True,
        'message': 'Margins API root endpoint - WERSJA TESTOWA',
        'endpoints': ['/calculate', '/health', '/test'],
        'version': 'NEW'
    })

# Próbuj zaimportować MarginService
try:
    from api.margin_service import MarginService, PurchasePriceStrategy
    print("🔍 MARGINS: Import MarginService udany")
except Exception as e:
    print(f"🔍 MARGINS: Błąd importu MarginService: {e}")
    MarginService = None

@margins_bp.route('/calculate', methods=['POST'])
def calculate_margin():
    """
    Endpoint do centralnego obliczania marży
    
    Expected JSON:
    {
        "sell_price": float,
        "buy_price": float,
        "product_id": int (optional),
        "warehouse_id": int (optional)
    }
    """
    try:
        print("🔍 MARGINS: Otrzymano request do /margins/calculate")
        data = request.get_json()
        print(f"🔍 MARGINS: Dane JSON: {data}")
        
        if not data:
            print("🔍 MARGINS: Brak danych JSON")
            return jsonify({
                'success': False,
                'error': 'Brak danych JSON'
            }), 400
        
        # Pobierz dane z requestu - akceptuj różne nazwy pól dla kompatybilności
        sell_price = data.get('sell_price') or data.get('sell_price_net') or data.get('sellPriceNet')
        buy_price = data.get('buy_price') or data.get('buy_price_net') or data.get('buyPriceNet')
        product_id = data.get('product_id')
        warehouse_id = data.get('warehouse_id')
        
        print(f"🔍 MARGINS: sell_price={sell_price}, buy_price={buy_price}")
        
        # Walidacja danych
        if sell_price is None or buy_price is None:
            print("🔍 MARGINS: Brak wymaganych pól")
            return jsonify({
                'success': False,
                'error': 'Wymagane pola: sell_price, buy_price'
            }), 400
            
        try:
            sell_price = float(sell_price)
            buy_price = float(buy_price)
            print(f"🔍 MARGINS: Skonwertowano ceny: sell_price={sell_price}, buy_price={buy_price}")
        except (ValueError, TypeError):
            print("🔍 MARGINS: Błąd konwersji cen")
            return jsonify({
                'success': False,
                'error': 'sell_price i buy_price muszą być liczbami'
            }), 400
        
        # Sprawdź czy ceny są dodatnie
        if sell_price <= 0 or buy_price <= 0:
            print(f"🔍 MARGINS: Nieprawidłowe ceny - sell_price={sell_price}, buy_price={buy_price}")
            return jsonify({
                'success': False,
                'error': 'Ceny muszą być większe od 0'
            }), 400
        
        # Sprawdź czy MarginService jest dostępny
        if MarginService is None:
            return jsonify({
                'success': False,
                'error': 'MarginService nie jest dostępny'
            }), 500
            
        # Utwórz serwis marż i oblicz
        margin_service = MarginService()
        result = margin_service.calculate_margin(
            sell_price_net=sell_price,
            buy_price_net=buy_price,
            calculation_method="api_request"
        )
        
        # Zwróć wynik
        return jsonify({
            'success': True,
            'data': {
                'margin_percent': result.margin_percent,
                'margin_amount': result.margin_amount,
                'markup_percent': result.markup_percent,
                'sell_price_net': result.sell_price_net,
                'buy_price_net': result.buy_price_net,
                'profit_amount': result.profit_amount,
                'calculation_method': result.calculation_method
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd serwera: {str(e)}'
        }), 500

@margins_bp.route('/product/<int:product_id>', methods=['GET'])
def get_product_margin(product_id):
    """
    Pobierz marżę dla konkretnego produktu
    """
    try:
        warehouse_id = request.args.get('warehouse_id', type=int)
        
        if MarginService is None:
            return jsonify({
                'success': False,
                'error': 'MarginService nie jest dostępny'
            }), 500
            
        margin_service = MarginService()
        
        # Pobierz cenę zakupu produktu
        buy_price, method_description = margin_service.get_product_purchase_price(
            product_id=product_id,
            warehouse_id=warehouse_id
        )
        
        if buy_price <= 0:
            return jsonify({
                'success': False,
                'error': f'Nie znaleziono ceny zakupu dla produktu {product_id}'
            }), 404
            
        # Pobierz cenę sprzedaży z bazy
        # TODO: Implementuj pobieranie ceny sprzedaży
        
        return jsonify({
            'success': True,
            'data': {
                'product_id': product_id,
                'buy_price': buy_price,
                'method_description': method_description
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd serwera: {str(e)}'
        }), 500

@margins_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Margins API is working',
        'timestamp': str(datetime.now())
    })

@margins_bp.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint"""
    print("🔍 MARGINS: Test endpoint wywołany")
    return jsonify({
        'success': True,
        'message': 'Test margins API działa!'
    })

@margins_bp.route('/calculate-pos', methods=['POST'])
def calculate_pos_margin():
    """
    Oblicza marżę dla produktu w POS na podstawie aktualnej ceny sprzedaży
    POST /api/margins/calculate-pos
    {
        "product_id": 123,
        "sell_price_brutto": 25.99,
        "warehouse_id": 5
    }
    """
    try:
        print("🔍 MARGINS: Otrzymano request do /margins/calculate-pos")
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Brak danych w zapytaniu'
            }), 400
            
        product_id = data.get('product_id')
        sell_price_brutto = data.get('sell_price_brutto')
        warehouse_id = data.get('warehouse_id', 5)  # Domyślnie magazyn 5
        
        if not product_id or sell_price_brutto is None:
            return jsonify({
                'success': False,
                'error': 'product_id i sell_price_brutto są wymagane'
            }), 400
            
        try:
            sell_price_brutto = float(sell_price_brutto)
            if sell_price_brutto <= 0:
                return jsonify({
                    'success': False,
                    'error': 'Cena sprzedaży musi być większa od 0'
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'sell_price_brutto musi być liczbą'
            }), 400
        
        if not MarginService:
            return jsonify({
                'success': False,
                'error': 'MarginService nie jest dostępny'
            }), 500
            
        # Stwórz instancję MarginService
        margin_service = MarginService()
        
        # Pobierz najnowszą cenę zakupu
        purchase_price_netto, method = margin_service.get_product_purchase_price(
            product_id=product_id,
            warehouse_id=warehouse_id
        )
        
        print(f"🔍 MARGINS: Product {product_id}, purchase_price: {purchase_price_netto}, method: {method}")
        
        if purchase_price_netto <= 0:
            return jsonify({
                'success': True,
                'data': {
                    'margin_percent': 0,
                    'margin_amount': 0,
                    'purchase_price': purchase_price_netto,
                    'purchase_price_method': method,
                    'sell_price_brutto': sell_price_brutto,
                    'can_calculate': False,
                    'message': 'Brak ceny zakupu - nie można obliczyć marży'
                }
            })
        
        # Oblicz marżę (zakładam VAT 23% - można to poprawić)
        sell_price_net = sell_price_brutto / 1.23
        
        # Oblicz marżę ręcznie
        margin_amount = sell_price_net - purchase_price_netto
        margin_percent = (margin_amount / sell_price_net) * 100 if sell_price_net > 0 else 0
        
        print(f"🔍 MARGINS: Calculated margin: {margin_percent}% ({margin_amount} zł)")
        
        return jsonify({
            'success': True,
            'data': {
                'margin_percent': round(margin_percent, 2),
                'margin_amount': round(margin_amount, 2),
                'purchase_price': purchase_price_netto,
                'purchase_price_method': method,
                'sell_price_brutto': sell_price_brutto,
                'sell_price_net': round(sell_price_net, 2),
                'can_calculate': True
            }
        })
        
    except Exception as e:
        print(f"❌ MARGINS: Błąd obliczania marży: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Błąd obliczania marży: {str(e)}'
        }), 500
