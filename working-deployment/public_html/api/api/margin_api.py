"""
API endpoint dla zarządzania marżami
"""

from flask import Blueprint, request, jsonify
from utils.margin_manager import SmartMarginManager
from utils.database import get_db_connection
from utils.response_helpers import success_response, error_response

margin_bp = Blueprint('margin', __name__)

@margin_bp.route('/api/margin/product/<int:product_id>/analysis', methods=['GET'])
def get_margin_analysis(product_id):
    """
    Pobierz aktualną analizę marż dla produktu we wszystkich lokalizacjach
    """
    try:
        # Pobierz aktualne dane produktu
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                id, nazwa, stawka_vat,
                cena_zakupu_netto, cena_zakupu_brutto,
                cena_sprzedazy_netto, cena_sprzedazy_brutto,
                marza_procent
            FROM produkty 
            WHERE id = ?
        """, (product_id,))
        
        product_data = cursor.fetchone()
        
        if not product_data:
            conn.close()
            return error_response("Produkt nie został znaleziony", 404)
        
        # Konwertuj na dict
        product_dict = dict(product_data)
        
        # Analizuj marże
        margin_manager = SmartMarginManager()
        analysis = margin_manager._analyze_margins_all_locations(
            cursor, product_id, product_dict['cena_zakupu_brutto'], product_dict
        )
        
        conn.close()
        
        return success_response({
            'product': {
                'id': product_dict['id'],
                'name': product_dict['nazwa'],
                'tax_rate': product_dict['stawka_vat'],
                'purchase_price_netto': product_dict['cena_zakupu_netto'],
                'purchase_price_brutto': product_dict['cena_zakupu_brutto'],
                'sale_price_netto': product_dict['cena_sprzedazy_netto'],
                'sale_price_brutto': product_dict['cena_sprzedazy_brutto'],
                'current_margin': product_dict['marza_procent']
            },
            'margin_analysis': analysis
        })
        
    except Exception as e:
        return error_response(f"Błąd analizy marż: {str(e)}", 500)

@margin_bp.route('/api/margin/product/<int:product_id>/reports', methods=['GET'])
def get_margin_reports(product_id):
    """
    Pobierz historię raportów marż dla produktu
    """
    try:
        limit = request.args.get('limit', 10, type=int)
        
        margin_manager = SmartMarginManager()
        reports = margin_manager.get_margin_report(product_id, limit)
        
        return success_response({
            'product_id': product_id,
            'reports': reports,
            'count': len(reports)
        })
        
    except Exception as e:
        return error_response(f"Błąd pobierania raportów: {str(e)}", 500)

@margin_bp.route('/api/margin/products/low-margins', methods=['GET'])
def get_products_with_low_margins():
    """
    Pobierz produkty z niskimi marżami (wymagające uwagi)
    """
    try:
        threshold = request.args.get('threshold', 10, type=float)  # Domyślnie marża < 10%
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Pobierz produkty z niskimi marżami domyślnymi
        cursor.execute("""
            SELECT 
                p.id, p.nazwa, p.kod_produktu, p.ean,
                p.cena_zakupu_brutto, p.cena_sprzedazy_brutto,
                p.marza_procent,
                CASE 
                    WHEN p.cena_zakupu_brutto > 0 AND p.cena_sprzedazy_brutto > 0 THEN
                        ROUND(((p.cena_sprzedazy_brutto - p.cena_zakupu_brutto) / p.cena_zakupu_brutto) * 100, 2)
                    ELSE 0
                END as calculated_margin
            FROM produkty p
            WHERE p.aktywny = 1
                AND p.cena_zakupu_brutto > 0
                AND (
                    p.marza_procent < ? 
                    OR ((p.cena_sprzedazy_brutto - p.cena_zakupu_brutto) / p.cena_zakupu_brutto) * 100 < ?
                )
            ORDER BY calculated_margin ASC
            LIMIT 50
        """, (threshold, threshold))
        
        products = cursor.fetchall()
        products_list = [dict(row) for row in products] if products else []
        
        # Pobierz też ceny specjalne z niskimi marżami
        cursor.execute("""
            SELECT 
                p.id, p.nazwa, p.kod_produktu,
                l.nazwa as location_name, l.kod_lokalizacji,
                lpp.cena_sprzedazy_brutto as special_price,
                p.cena_zakupu_brutto,
                ROUND(((lpp.cena_sprzedazy_brutto - p.cena_zakupu_brutto) / p.cena_zakupu_brutto) * 100, 2) as margin,
                lpp.uwagi
            FROM location_product_prices lpp
            JOIN produkty p ON lpp.product_id = p.id
            JOIN locations l ON lpp.location_id = l.id
            WHERE lpp.aktywny = 1
                AND (lpp.data_do IS NULL OR lpp.data_do >= date('now'))
                AND p.cena_zakupu_brutto > 0
                AND ((lpp.cena_sprzedazy_brutto - p.cena_zakupu_brutto) / p.cena_zakupu_brutto) * 100 < ?
            ORDER BY margin ASC
            LIMIT 50
        """, (threshold,))
        
        special_prices = cursor.fetchall()
        special_prices_list = [dict(row) for row in special_prices] if special_prices else []
        conn.close()
        
        return success_response({
            'threshold': threshold,
            'low_margin_products': products_list,
            'low_margin_special_prices': special_prices_list,
            'summary': {
                'default_prices_count': len(products_list),
                'special_prices_count': len(special_prices_list)
            }
        })
        
    except Exception as e:
        return error_response(f"Błąd pobierania produktów: {str(e)}", 500)

@margin_bp.route('/api/margin/product/<int:product_id>/correct', methods=['POST'])
def correct_product_margins(product_id):
    """
    Ręczna korekta marż produktu
    """
    try:
        data = request.get_json()
        target_margin = data.get('target_margin', 30)
        correct_default = data.get('correct_default', True)
        location_ids = data.get('location_ids', [])  # Lista lokalizacji do korekty
        
        margin_manager = SmartMarginManager()
        margin_manager.DEFAULT_MARGIN = target_margin
        
        # Pobierz aktualne dane produktu
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT cena_zakupu_brutto, stawka_vat FROM produkty WHERE id = ?
        """, (product_id,))
        
        product_data = cursor.fetchone()
        if not product_data:
            return error_response("Produkt nie został znaleziony", 404)
        
        results = []
        
        # Korekta ceny domyślnej
        if correct_default:
            new_sale_price_netto = round(
                product_data['cena_zakupu_brutto'] / (1 + product_data['stawka_vat'] / 100) * (1 + target_margin / 100), 2
            )
            new_sale_price_brutto = round(new_sale_price_netto * (1 + product_data['stawka_vat'] / 100), 2)
            
            cursor.execute("""
                UPDATE produkty 
                SET 
                    cena_sprzedazy_netto = ?,
                    cena_sprzedazy_brutto = ?,
                    cena = ?,
                    marza_procent = ?
                WHERE id = ?
            """, (new_sale_price_netto, new_sale_price_brutto, new_sale_price_brutto, target_margin, product_id))
            
            results.append({
                'type': 'default_price',
                'new_price_brutto': new_sale_price_brutto,
                'new_margin': target_margin
            })
        
        # Korekta cen specjalnych (opcjonalnie)
        if location_ids:
            for location_id in location_ids:
                new_sale_price_netto = round(
                    product_data['cena_zakupu_brutto'] / (1 + product_data['stawka_vat'] / 100) * (1 + target_margin / 100), 2
                )
                new_sale_price_brutto = round(new_sale_price_netto * (1 + product_data['stawka_vat'] / 100), 2)
                
                cursor.execute("""
                    UPDATE location_product_prices 
                    SET 
                        cena_sprzedazy_netto = ?,
                        cena_sprzedazy_brutto = ?,
                        uwagi = COALESCE(uwagi, '') || ' [Skorygowano marżę: ' || ? || '%]'
                    WHERE product_id = ? AND location_id = ? AND aktywny = 1
                """, (new_sale_price_netto, new_sale_price_brutto, target_margin, product_id, location_id))
                
                results.append({
                    'type': 'location_price',
                    'location_id': location_id,
                    'new_price_brutto': new_sale_price_brutto,
                    'new_margin': target_margin
                })
        
        conn.commit()
        conn.close()
        
        return success_response({
            'product_id': product_id,
            'target_margin': target_margin,
            'corrections': results
        })
        
    except Exception as e:
        return error_response(f"Błąd korekty marż: {str(e)}", 500)
