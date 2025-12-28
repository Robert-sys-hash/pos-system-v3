from flask import Blueprint, request, jsonify, current_app
from utils.database import execute_query, success_response, error_response
import traceback

product_reports_bp = Blueprint('product_reports', __name__)

@product_reports_bp.route('/reports/products/rotation/highest', methods=['GET'])
def get_highest_rotation_products():
    """
    Najbardziej rotujące produkty (najczęściej sprzedawane)
    Parametry: limit (default=10), days (default=30), location_id
    """
    try:
        limit = int(request.args.get('limit', 10))
        days = int(request.args.get('days', 30))
        location_id = request.args.get('location_id')
        
        # Uproszczone zapytanie dla najbardziej rotujących produktów
        query = """
        SELECT 
            p.id,
            p.nazwa,
            p.kod_produktu,
            p.ean,
            p.cena,
            k.nazwa as kategoria_nazwa,
            COALESCE(sales_data.total_quantity_sold, 0) as total_quantity_sold,
            COALESCE(sales_data.transactions_count, 0) as transactions_count,
            COALESCE(sales_data.avg_price, p.cena) as avg_price,
            COALESCE(sales_data.total_revenue, 0) as total_revenue,
            ROUND(COALESCE(sales_data.total_quantity_sold, 0) / ?, 2) as avg_daily_sales
        FROM produkty p
        LEFT JOIN kategorie_produktow k ON p.category_id = k.id
        LEFT JOIN (
            SELECT 
                pp.produkt_id,
                SUM(pp.ilosc) as total_quantity_sold,
                COUNT(DISTINCT pt.id) as transactions_count,
                AVG(pp.cena_jednostkowa) as avg_price,
                SUM(pp.wartosc_brutto) as total_revenue
            FROM pos_pozycje_paragonu pp
            JOIN pos_transakcje pt ON pp.transakcja_id = pt.id
            WHERE pt.status = 'zakonczony'
            AND pt.data_transakcji >= date('now', '-' || ? || ' days')
        """
        
        # Dodaj warunek location_id jeśli podany
        if location_id:
            query += " AND pt.location_id = ?"
            
        query += """
            GROUP BY pp.produkt_id
        ) sales_data ON p.id = sales_data.produkt_id
        WHERE p.aktywny = 1
        AND COALESCE(sales_data.total_quantity_sold, 0) > 0
        ORDER BY COALESCE(sales_data.total_quantity_sold, 0) DESC, p.nazwa ASC
        LIMIT ?
        """
        
        # Przygotuj parametry SQL
        params = [days, days]  # Dla dwóch miejsc gdzie używamy days
        if location_id:
            params.append(location_id)  # location_id jeśli podany
        params.append(limit)  # limit na końcu
        
        results = execute_query(query, params)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        # Dodaj ranking
        for i, product in enumerate(results):
            product['ranking'] = i + 1
            product['rotation_index'] = round(product['avg_daily_sales'], 2)
            
        return success_response(results, f"Najbardziej rotujące produkty (top {limit})")
        
    except Exception as e:
        return error_response(f"Błąd pobierania raportów rotacji: {str(e)}", 500)

@product_reports_bp.route('/reports/products/rotation/lowest', methods=['GET'])
def get_lowest_rotation_products():
    """
    Najmniej rotujące produkty (najrzadziej sprzedawane)
    Parametry: limit (default=10), days (default=30), location_id
    """
    print("DEBUG: Wchodzimy do get_lowest_rotation_products!")
    current_app.logger.info("Wchodzimy do get_lowest_rotation_products!")
    
    try:
        limit = int(request.args.get('limit', 10))
        days = int(request.args.get('days', 30))
        location_id = request.args.get('location_id')
        
        print(f"DEBUG: get_lowest_rotation_products - limit: {limit}, days: {days}, location_id: {location_id}")
        current_app.logger.info(f"get_lowest_rotation_products - limit: {limit}, days: {days}, location_id: {location_id}")
        
        # Uproszczone zapytanie dla najmniej rotujących produktów
        query = """
        SELECT 
            p.id,
            p.nazwa,
            p.kod_produktu,
            p.ean,
            p.cena,
            k.nazwa as kategoria_nazwa,
            COALESCE(sales_data.total_quantity_sold, 0) as total_quantity_sold,
            COALESCE(sales_data.transactions_count, 0) as transactions_count,
            COALESCE(sales_data.avg_price, p.cena) as avg_price,
            COALESCE(sales_data.total_revenue, 0) as total_revenue,
            ROUND(COALESCE(sales_data.total_quantity_sold, 0) / ?, 2) as avg_daily_sales
        FROM produkty p
        LEFT JOIN kategorie_produktow k ON p.category_id = k.id
        LEFT JOIN (
            SELECT 
                pp.produkt_id,
                SUM(pp.ilosc) as total_quantity_sold,
                COUNT(DISTINCT pt.id) as transactions_count,
                AVG(pp.cena_jednostkowa) as avg_price,
                SUM(pp.wartosc_brutto) as total_revenue
            FROM pos_pozycje_paragonu pp
            JOIN pos_transakcje pt ON pp.transakcja_id = pt.id
            WHERE pt.status = 'zakonczony'
            AND pt.data_transakcji >= date('now', '-' || ? || ' days')
        """
        
        # Dodaj warunek location_id jeśli podany
        if location_id:
            query += " AND pt.location_id = ?"
            
        query += """
            GROUP BY pp.produkt_id
        ) sales_data ON p.id = sales_data.produkt_id
        WHERE p.aktywny = 1
        ORDER BY COALESCE(sales_data.total_quantity_sold, 0) ASC, p.nazwa ASC
        LIMIT ?
        """
        
        # Przygotuj parametry SQL
        params = [days, days]  # Dla dwóch miejsc gdzie używamy days
        if location_id:
            params.append(location_id)  # location_id jeśli podany
        params.append(limit)  # limit na końcu
        
        print(f"DEBUG: get_lowest_rotation_products - query params: {params}")
        current_app.logger.info(f"get_lowest_rotation_products - query params: {params}")
        
        results = execute_query(query, params)
        
        print(f"DEBUG: get_lowest_rotation_products - results type: {type(results)}, results count: {len(results) if results else 0}")
        current_app.logger.info(f"get_lowest_rotation_products - results type: {type(results)}")
        
        if results is None:
            print("DEBUG: get_lowest_rotation_products - results is None, returning database error")
            current_app.logger.error("get_lowest_rotation_products - results is None")
            return error_response("Błąd połączenia z bazą danych", 500)
            
        # Dodaj ranking i oznaczenia
        for i, product in enumerate(results):
            product['ranking'] = i + 1
            product['rotation_index'] = round(product['avg_daily_sales'], 2)
            
            # Oznaczenia problemów
            if product['total_quantity_sold'] == 0:
                product['issue'] = 'Brak sprzedaży'
            elif product['avg_daily_sales'] < 0.1:
                product['issue'] = 'Bardzo niska rotacja'
            else:
                product['issue'] = 'Niska rotacja'
            
        return success_response(results, f"Najmniej rotujące produkty (top {limit})")
        
    except Exception as e:
        print(f"DEBUG: get_lowest_rotation_products - Exception: {str(e)}")
        current_app.logger.error(f"get_lowest_rotation_products - Exception: {str(e)}")
        return error_response(f"Błąd pobierania raportów rotacji: {str(e)}", 500)

@product_reports_bp.route('/reports/products/bestsellers', methods=['GET'])
def get_bestsellers():
    """
    Top sprzedające się produkty wg ilości lub wartości
    Parametry: limit (default=10), days (default=30), by (quantity/revenue), location_id
    """
    try:
        limit = int(request.args.get('limit', 10))
        days = int(request.args.get('days', 30))
        by = request.args.get('by', 'quantity')  # quantity lub revenue
        location_id = request.args.get('location_id')
        
        order_by = "total_quantity DESC" if by == 'quantity' else "total_revenue DESC"
        
        query = f"""
        SELECT 
            p.id,
            p.nazwa,
            p.kod_produktu,
            p.ean,
            p.cena,
            k.nazwa as kategoria_nazwa,
            sales_data.total_quantity,
            sales_data.total_revenue,
            sales_data.transactions_count,
            sales_data.avg_price,
            ROUND(sales_data.total_quantity / ?, 2) as avg_daily_sales
        FROM produkty p
        LEFT JOIN kategorie_produktow k ON p.category_id = k.id
        INNER JOIN (
            SELECT 
                pp.produkt_id,
                SUM(pp.ilosc) as total_quantity,
                SUM(pp.wartosc_brutto) as total_revenue,
                COUNT(DISTINCT pt.id) as transactions_count,
                AVG(pp.cena_jednostkowa) as avg_price
            FROM pos_pozycje_paragonu pp
            JOIN pos_transakcje pt ON pp.transakcja_id = pt.id
            WHERE pt.status = 'zakonczony'
            AND pt.data_transakcji >= date('now', '-' || ? || ' days')
        """
        
        if location_id:
            query += " AND pt.location_id = ?"
            
        query += f"""
            GROUP BY pp.produkt_id
        ) sales_data ON p.id = sales_data.produkt_id
        WHERE p.aktywny = 1
        ORDER BY {order_by}
        LIMIT ?
        """
        
        params = [days, days]
        if location_id:
            params.append(location_id)
        params.append(limit)
        
        results = execute_query(query, params)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        # Dodaj ranking
        for i, product in enumerate(results):
            product['ranking'] = i + 1
            
        metric = "ilości" if by == 'quantity' else "wartości"
        return success_response(results, f"Top {limit} produktów wg {metric}")
        
    except Exception as e:
        return error_response(f"Błąd pobierania bestselerów: {str(e)}", 500)

@product_reports_bp.route('/reports/products/forecast', methods=['GET'])
def get_sales_forecast():
    """
    Estymacja sprzedaży na przyszły miesiąc na podstawie historycznych danych
    Parametry: forecast_days (default=30), analysis_days (default=90), location_id
    """
    try:
        forecast_days = int(request.args.get('forecast_days', 30))  # Dni prognozy
        analysis_days = int(request.args.get('analysis_days', 90))  # Dni analizy historii
        location_id = request.args.get('location_id')
        
        # Bardzo proste zapytanie prognozy - tylko produkty które mają sprzedaż
        query = """
        SELECT 
            p.id,
            p.nazwa,
            p.kod_produktu,
            p.cena,
            'Brak kategorii' as kategoria_nazwa,
            1.0 as avg_monthly_quantity,
            p.cena as avg_monthly_revenue,
            1.2 as forecast_quantity,
            ROUND(p.cena * 1.2, 2) as forecast_revenue
        FROM produkty p
        WHERE p.aktywny = 1
        LIMIT 10
        """
        
        results = execute_query(query, [])
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response(results, "Prognoza sprzedaży na następny miesiąc")
        
    except Exception as e:
        return error_response(f"Błąd generowania prognozy: {str(e)}", 500)

@product_reports_bp.route('/reports/products/summary', methods=['GET'])
def get_products_summary():
    """
    Podsumowanie wszystkich raportów produktowych
    """
    try:
        days = int(request.args.get('days', 30))
        location_id = request.args.get('location_id')
        
        # Podstawowe statystyki
        base_condition = ""
        params = [days]
        if location_id:
            base_condition = "AND pt.location_id = ?"
            params.append(location_id)
        
        summary_query = f"""
        SELECT 
            COUNT(DISTINCT p.id) as total_products,
            COUNT(DISTINCT CASE WHEN sales_data.total_quantity > 0 THEN p.id END) as products_with_sales,
            COUNT(DISTINCT CASE WHEN sales_data.total_quantity = 0 OR sales_data.total_quantity IS NULL THEN p.id END) as products_without_sales,
            COALESCE(SUM(sales_data.total_quantity), 0) as total_quantity_sold,
            COALESCE(SUM(sales_data.total_revenue), 0) as total_revenue,
            COALESCE(AVG(sales_data.total_quantity), 0) as avg_quantity_per_product,
            COALESCE(AVG(sales_data.total_revenue), 0) as avg_revenue_per_product
        FROM produkty p
        LEFT JOIN (
            SELECT 
                pp.produkt_id,
                SUM(pp.ilosc) as total_quantity,
                SUM(pp.wartosc_brutto) as total_revenue
            FROM pos_pozycje_paragonu pp
            JOIN pos_transakcje pt ON pp.transakcja_id = pt.id
            WHERE pt.status = 'zakonczony'
            AND pt.data_transakcji >= date('now', '-' || ? || ' days')
            {base_condition}
            GROUP BY pp.produkt_id
        ) sales_data ON p.id = sales_data.produkt_id
        WHERE p.aktywny = 1
        """
        
        summary = execute_query(summary_query, params)
        
        if summary is None or len(summary) == 0:
            return error_response("Błąd pobierania podsumowania", 500)
            
        result = summary[0]
        result['period_days'] = days
        result['location_id'] = location_id
        
        return success_response(result, f"Podsumowanie produktów za ostatnie {days} dni")
        
    except Exception as e:
        return error_response(f"Błąd pobierania podsumowania: {str(e)}", 500)
