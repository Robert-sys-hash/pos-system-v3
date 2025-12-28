"""
API Endpoints dla zarządzania marżą
===================================

Endpoints do centralnego zarządzania marżą w systemie POS
"""

from flask import Blueprint, request, jsonify
from api.margin_service import margin_service, PurchasePriceStrategy
import logging

margins_bp = Blueprint('margins', __name__)
logger = logging.getLogger(__name__)

@margins_bp.route('/margins/calculate', methods=['POST'])
def calculate_margin():
    """
    Oblicza marżę dla podanych cen
    
    Body:
    {
        "sell_price_net": 100.00,
        "buy_price_net": 80.00
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Brak danych JSON"}), 400
        
        sell_price = data.get('sell_price_net', 0)
        buy_price = data.get('buy_price_net', 0)
        
        if sell_price <= 0 or buy_price <= 0:
            return jsonify({"error": "Ceny muszą być większe od 0"}), 400
        
        calculation = margin_service.calculate_margin(
            sell_price_net=float(sell_price),
            buy_price_net=float(buy_price)
        )
        
        return jsonify({
            "success": True,
            "data": {
                "margin_percent": calculation.margin_percent,
                "margin_amount": calculation.margin_amount,
                "markup_percent": calculation.markup_percent,
                "profit_amount": calculation.profit_amount,
                "sell_price_net": calculation.sell_price_net,
                "buy_price_net": calculation.buy_price_net,
                "calculation_method": calculation.calculation_method
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd obliczania marży: {str(e)}")
        return jsonify({"error": str(e)}), 500

@margins_bp.route('/margins/product/<int:product_id>', methods=['GET'])
def get_product_margin(product_id):
    """
    Pobiera marżę dla produktu
    
    Query params:
    - sell_price_net: cena sprzedaży netto
    - warehouse_id: ID magazynu (opcjonalnie)
    - purchase_strategy: latest|weighted_average|specific
    """
    try:
        sell_price_net = request.args.get('sell_price_net')
        warehouse_id = request.args.get('warehouse_id')
        strategy_method = request.args.get('purchase_strategy', 'latest')
        
        if not sell_price_net:
            return jsonify({"error": "Wymagana cena sprzedaży (sell_price_net)"}), 400
        
        # Przygotuj strategię
        strategy = PurchasePriceStrategy(method=strategy_method)
        
        calculation = margin_service.calculate_product_margin(
            product_id=product_id,
            sell_price_net=float(sell_price_net),
            warehouse_id=int(warehouse_id) if warehouse_id else None,
            purchase_strategy=strategy
        )
        
        return jsonify({
            "success": True,
            "data": {
                "product_id": product_id,
                "margin_percent": calculation.margin_percent,
                "margin_amount": calculation.margin_amount,
                "markup_percent": calculation.markup_percent,
                "profit_amount": calculation.profit_amount,
                "sell_price_net": calculation.sell_price_net,
                "buy_price_net": calculation.buy_price_net,
                "calculation_method": calculation.calculation_method
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd pobierania marży produktu {product_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@margins_bp.route('/margins/product/<int:product_id>/purchase-price', methods=['GET'])
def get_product_purchase_price(product_id):
    """
    Pobiera cenę zakupu produktu według strategii
    
    Query params:
    - warehouse_id: ID magazynu (opcjonalnie)
    - strategy: latest|weighted_average|specific
    - timeframe_days: okres analizy dla weighted_average (domyślnie 90)
    """
    try:
        warehouse_id = request.args.get('warehouse_id')
        strategy_method = request.args.get('strategy', 'latest')
        timeframe_days = int(request.args.get('timeframe_days', 90))
        
        strategy = PurchasePriceStrategy(
            method=strategy_method,
            timeframe_days=timeframe_days
        )
        
        price, method_desc = margin_service.get_product_purchase_price(
            product_id=product_id,
            warehouse_id=int(warehouse_id) if warehouse_id else None,
            strategy=strategy
        )
        
        return jsonify({
            "success": True,
            "data": {
                "product_id": product_id,
                "purchase_price_net": price,
                "method_description": method_desc,
                "strategy_used": strategy_method
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd pobierania ceny zakupu produktu {product_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@margins_bp.route('/margins/target-price', methods=['POST'])
def calculate_target_price():
    """
    Oblicza cenę sprzedaży dla zadanej marży
    
    Body:
    {
        "product_id": 123,
        "target_margin_percent": 30.0,
        "warehouse_id": 1 (opcjonalnie)
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Brak danych JSON"}), 400
        
        product_id = data.get('product_id')
        target_margin = data.get('target_margin_percent')
        warehouse_id = data.get('warehouse_id')
        
        if not product_id or target_margin is None:
            return jsonify({"error": "Wymagane: product_id i target_margin_percent"}), 400
        
        if target_margin >= 100 or target_margin < 0:
            return jsonify({"error": "Marża musi być między 0 a 100%"}), 400
        
        success, result = margin_service.set_target_margin(
            product_id=int(product_id),
            target_margin_percent=float(target_margin),
            warehouse_id=int(warehouse_id) if warehouse_id else None
        )
        
        if success:
            return jsonify({
                "success": True,
                "data": result
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("error", "Nieznany błąd")
            }), 400
        
    except Exception as e:
        logger.error(f"Błąd obliczania ceny dla marży: {str(e)}")
        return jsonify({"error": str(e)}), 500

@margins_bp.route('/margins/products/batch', methods=['POST'])
def calculate_margins_batch():
    """
    Oblicza marże dla listy produktów
    
    Body:
    {
        "products": [
            {
                "id": 123,
                "cena_sprzedazy_netto": 100.00
            },
            {
                "id": 124,
                "price_net": 150.00
            }
        ],
        "warehouse_id": 1 (opcjonalnie)
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('products'):
            return jsonify({"error": "Wymagana lista produktów"}), 400
        
        products = data.get('products', [])
        warehouse_id = data.get('warehouse_id')
        
        results = margin_service.get_margin_for_products_list(
            products=products,
            warehouse_id=int(warehouse_id) if warehouse_id else None
        )
        
        return jsonify({
            "success": True,
            "data": {
                "products": results,
                "count": len(results)
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd obliczania marż batch: {str(e)}")
        return jsonify({"error": str(e)}), 500

@margins_bp.route('/margins/config', methods=['GET'])
def get_margin_config():
    """
    Pobiera konfigurację serwisu marży
    """
    try:
        strategy = margin_service.default_purchase_strategy
        
        return jsonify({
            "success": True,
            "data": {
                "default_purchase_strategy": {
                    "method": strategy.method,
                    "timeframe_days": strategy.timeframe_days,
                    "min_transactions": strategy.min_transactions
                },
                "available_strategies": ["latest", "weighted_average", "specific"],
                "margin_formula": "MARŻA = (Cena sprzedaży - Cena zakupu) / Cena sprzedaży × 100%",
                "markup_formula": "NARZUT = (Cena sprzedaży - Cena zakupu) / Cena zakupu × 100%"
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd pobierania konfiguracji marży: {str(e)}")
        return jsonify({"error": str(e)}), 500

@margins_bp.route('/margins/calculate-pos', methods=['POST'])
def calculate_pos_margin():
    """
    Oblicza marżę dla systemu POS
    
    Body:
    {
        "product_id": 123,
        "sell_price_brutto": 120.00,
        "warehouse_id": 5
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Brak danych JSON"}), 400
        
        product_id = data.get('product_id')
        sell_price_brutto = data.get('sell_price_brutto')
        warehouse_id = data.get('warehouse_id')
        
        if not product_id or not sell_price_brutto:
            return jsonify({"error": "Wymagane: product_id i sell_price_brutto"}), 400
        
        # Pobierz VAT produktu dla konwersji brutto -> netto
        from utils.database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT stawka_vat FROM produkty WHERE id = ?", (product_id,))
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return jsonify({"error": f"Produkt {product_id} nie istnieje"}), 404
        
        vat_rate = float(result[0]) if result[0] else 0.0
        
        # Przelicz cenę brutto na netto
        sell_price_net = float(sell_price_brutto) / (1 + vat_rate / 100)
        
        # Przygotuj strategię
        strategy = PurchasePriceStrategy(method='latest')
        
        calculation = margin_service.calculate_product_margin(
            product_id=int(product_id),
            sell_price_net=sell_price_net,
            warehouse_id=int(warehouse_id) if warehouse_id else None,
            purchase_strategy=strategy
        )
        
        return jsonify({
            "success": True,
            "data": {
                "product_id": product_id,
                "margin_percent": calculation.margin_percent,
                "margin_amount": calculation.margin_amount,
                "markup_percent": calculation.markup_percent,
                "profit_amount": calculation.profit_amount,
                "sell_price_net": calculation.sell_price_net,
                "sell_price_brutto": float(sell_price_brutto),
                "purchase_price": calculation.buy_price_net,
                "purchase_price_method": calculation.calculation_method,
                "vat_rate": vat_rate,
                "can_calculate": True
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd obliczania marży POS dla produktu {product_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@margins_bp.route('/margins/validate', methods=['POST'])
def validate_margin_calculation():
    """
    Waliduje obliczenia marży - porównuje z różnymi metodami
    
    Body:
    {
        "product_id": 123,
        "sell_price_net": 100.00
    }
    """
    try:
        data = request.get_json()
        
        product_id = data.get('product_id')
        sell_price_net = data.get('sell_price_net')
        
        if not product_id or not sell_price_net:
            return jsonify({"error": "Wymagane: product_id i sell_price_net"}), 400
        
        # Oblicz marżę różnymi metodami
        strategies = ['latest', 'weighted_average']
        results = {}
        
        for strategy_method in strategies:
            strategy = PurchasePriceStrategy(method=strategy_method)
            calculation = margin_service.calculate_product_margin(
                product_id=int(product_id),
                sell_price_net=float(sell_price_net),
                purchase_strategy=strategy
            )
            
            results[strategy_method] = {
                "margin_percent": calculation.margin_percent,
                "buy_price_net": calculation.buy_price_net,
                "calculation_method": calculation.calculation_method
            }
        
        return jsonify({
            "success": True,
            "data": {
                "product_id": product_id,
                "sell_price_net": sell_price_net,
                "strategies_comparison": results,
                "recommendation": "Użyj metody 'latest' dla najnowszych cen lub 'weighted_average' dla stabilniejszych wyników"
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd walidacji marży: {str(e)}")
        return jsonify({"error": str(e)}), 500


@margins_bp.route('/marze/products', methods=['GET'])
def get_products_with_margin():
    """
    Pobiera listę produktów z informacją o marży.
    Opcjonalnie filtruje produkty z niską marżą.
    
    Query params:
    - low_margin: próg marży (jeśli podany, zwraca tylko produkty poniżej tego progu)
    - limit: maksymalna liczba wyników (domyślnie 50)
    """
    try:
        from utils.database import execute_query
        
        low_margin_threshold = request.args.get('low_margin', type=float)
        limit = request.args.get('limit', 50, type=int)
        
        # Zapytanie pobierające produkty z obliczoną marżą
        query = """
            SELECT 
                p.id,
                p.nazwa,
                p.kod_produktu,
                p.ean,
                p.cena as cena_brutto,
                p.cena_sprzedazy_netto,
                p.cena_zakupu_netto,
                p.cena_zakupu_brutto,
                p.marza_procent,
                p.stawka_vat,
                k.nazwa as kategoria_nazwa,
                CASE 
                    WHEN p.cena_sprzedazy_netto > 0 AND p.cena_zakupu_netto > 0 
                    THEN ROUND(((p.cena_sprzedazy_netto - p.cena_zakupu_netto) / p.cena_sprzedazy_netto) * 100, 2)
                    WHEN p.cena > 0 AND p.cena_zakupu_brutto > 0
                    THEN ROUND(((p.cena - p.cena_zakupu_brutto) / p.cena) * 100, 2)
                    ELSE COALESCE(p.marza_procent, 0)
                END as calculated_margin
            FROM produkty p
            LEFT JOIN kategorie_produktow k ON p.category_id = k.id
            WHERE p.aktywny = 1
        """
        
        params = []
        
        # Filtruj po niskiej marży jeśli podano próg
        if low_margin_threshold is not None:
            query += """
                AND (
                    (p.cena_sprzedazy_netto > 0 AND p.cena_zakupu_netto > 0 
                     AND ((p.cena_sprzedazy_netto - p.cena_zakupu_netto) / p.cena_sprzedazy_netto) * 100 < ?)
                    OR 
                    (p.cena > 0 AND p.cena_zakupu_brutto > 0 
                     AND ((p.cena - p.cena_zakupu_brutto) / p.cena) * 100 < ?)
                    OR
                    (COALESCE(p.marza_procent, 0) > 0 AND p.marza_procent < ?)
                )
            """
            params.extend([low_margin_threshold, low_margin_threshold, low_margin_threshold])
        
        query += """
            ORDER BY calculated_margin ASC
            LIMIT ?
        """
        params.append(limit)
        
        results = execute_query(query, params)
        
        if results is None:
            return jsonify({"success": False, "error": "Błąd bazy danych"}), 500
        
        # Formatuj wyniki
        products = []
        for row in results:
            products.append({
                "id": row['id'],
                "nazwa": row['nazwa'],
                "kod_produktu": row['kod_produktu'],
                "ean": row['ean'],
                "cena_brutto": row['cena_brutto'],
                "cena_sprzedazy_netto": row['cena_sprzedazy_netto'],
                "cena_zakupu_netto": row['cena_zakupu_netto'],
                "cena_zakupu_brutto": row['cena_zakupu_brutto'],
                "marza_procent": row['calculated_margin'],
                "stawka_vat": row['stawka_vat'],
                "kategoria": row['kategoria_nazwa']
            })
        
        return jsonify({
            "success": True,
            "data": products,
            "count": len(products),
            "threshold": low_margin_threshold
        })
        
    except Exception as e:
        logger.error(f"Błąd pobierania produktów z marżą: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
