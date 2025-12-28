    # NAPRAWIENIE PROBLEMÓW ROUTINGU FRONTEND
    
    # 1. Przekierowania dla podwójnego /api/api/
    @app.route('/api/api/<path:path>')
    def redirect_double_api(path):
        """Przekierowanie /api/api/xyz -> /api/xyz"""
        return redirect(f'/api/{path}', code=301)
    
    # 2. Endpoint /api/locations bez slasha
    @app.route('/api/locations')
    def locations_redirect():
        """Przekierowanie /api/locations -> /api/locations/"""
        return redirect('/api/locations/', code=301)
    
    # 3. Endpoint products z limit (jeśli nie istnieje)
    @app.route('/api/products')
    def products_with_params():
        """Endpoint produktów z parametrami"""
        try:
            from api.products import products_bp
            # Sprawdź czy endpoint istnieje w blueprincie
            # Jeśli nie, przekieruj do podstawowego endpointu
            limit = request.args.get('limit', 100)
            return redirect(f'/api/products?limit={limit}', code=302)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd produktów: {e}'
            }), 500
    
    # 4. Endpoint categories/flat jeśli nie istnieje
    @app.route('/api/categories/flat')
    def categories_flat():
        """Endpoint płaskich kategorii"""
        try:
            from utils.database import execute_query
            query = """
            SELECT DISTINCT 
                category_old as name,
                category_old as id,
                COUNT(*) as product_count
            FROM products 
            WHERE category_old IS NOT NULL 
              AND category_old != ''
            GROUP BY category_old
            ORDER BY category_old
            """
            categories = execute_query(query, ())
            if categories is None:
                categories = []
            
            return jsonify({
                'success': True,
                'data': categories,
                'message': f'Znaleziono {len(categories)} kategorii'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Błąd kategorii: {e}'
            }), 500
