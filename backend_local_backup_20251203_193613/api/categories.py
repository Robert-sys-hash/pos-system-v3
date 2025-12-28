"""
API endpoint dla zarządzania kategoriami produktów
CRUD operations dla kategorii w panelu administracyjnym
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('/categories', methods=['GET'])
def get_all_categories():
    """
    Pobierz wszystkie kategorie produktów w strukturze drzewa
    """
    try:
        sql_query = """
        SELECT 
            id,
            nazwa as name,
            opis as description,
            aktywna as active,
            parent_id,
            data_utworzenia as created_at,
            user_utworzyl as created_by
        FROM kategorie_produktow 
        WHERE aktywna = 1
        ORDER BY parent_id ASC, nazwa ASC
        """
        
        results = execute_query(sql_query)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
        
        # Przekształć płaską listę w strukturę drzewa
        tree = build_category_tree(results)
            
        return success_response({
            'categories': tree,
            'total': len(results)
        }, f"Znaleziono {len(results)} kategorii")
        
    except Exception as e:
        print(f"Błąd pobierania kategorii: {e}")
        return error_response("Wystąpił błąd podczas pobierania kategorii", 500)

def build_category_tree(categories):
    """
    Buduje drzewo kategorii z płaskiej listy
    """
    category_dict = {}
    tree = []
    
    # Utwórz słownik kategorii dla szybkiego dostępu
    for category in categories:
        category['children'] = []
        category['level'] = 0
        category_dict[category['id']] = category
    
    # Buduj drzewo
    for category in categories:
        parent_id = category.get('parent_id')
        if parent_id is None:
            # Kategoria główna
            tree.append(category)
        else:
            # Podkategoria
            parent = category_dict.get(parent_id)
            if parent:
                category['level'] = parent['level'] + 1
                parent['children'].append(category)
    
    return tree

@categories_bp.route('/categories/flat', methods=['GET'])
def get_categories_flat():
    """
    Pobierz wszystkie kategorie w formie płaskiej listy do selectów
    Zwraca kategorie z wcięciami pokazującymi hierarchię
    """
    try:
        sql_query = """
        SELECT 
            id,
            nazwa as name,
            opis as description,
            parent_id,
            aktywna as active
        FROM kategorie_produktow 
        WHERE aktywna = 1
        ORDER BY parent_id ASC, nazwa ASC
        """
        
        results = execute_query(sql_query)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
        
        # Przekształć w drzewo i spłaszcz z wcięciami
        tree = build_category_tree(results)
        flat_list = flatten_categories_for_select(tree)
            
        return success_response({
            'categories': flat_list,
            'total': len(flat_list)
        }, f"Znaleziono {len(flat_list)} kategorii")
        
    except Exception as e:
        print(f"Błąd pobierania kategorii: {e}")
        return error_response("Wystąpił błąd podczas pobierania kategorii", 500)

def flatten_categories_for_select(categories, level=0):
    """
    Spłaszcza drzewo kategorii do listy z wcięciami dla selectów
    """
    flattened = []
    for category in categories:
        indent = '  ' * level
        prefix = '└─ ' if level > 0 else ''
        
        flattened.append({
            'id': category['id'],
            'name': category['name'],
            'display_name': indent + prefix + category['name'],
            'level': level,
            'parent_id': category.get('parent_id')
        })
        
        if category.get('children'):
            flattened.extend(flatten_categories_for_select(category['children'], level + 1))
    
    return flattened

def is_descendant(parent_id, potential_child_id):
    """
    Sprawdza czy potential_child_id jest potomkiem parent_id
    (zapobiega tworzeniu cykli w hierarchii)
    """
    if parent_id == potential_child_id:
        return True
    
    # Pobierz wszystkie dzieci parent_id
    children_query = "SELECT id FROM kategorie_produktow WHERE parent_id = ? AND aktywna = 1"
    children = execute_query(children_query, [parent_id])
    
    if not children:
        return False
    
    for child in children:
        # Rekurencyjnie sprawdź czy potential_child_id jest w poddrzewie
        if child['id'] == potential_child_id or is_descendant(child['id'], potential_child_id):
            return True
    
    return False

@categories_bp.route('/categories', methods=['POST'])
def create_category():
    """
    Utwórz nową kategorię produktów
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('name'):
            return error_response("Nazwa kategorii jest wymagana", 400)
            
        name = data.get('name', '').strip()
        description = data.get('description', '').strip() or None
        parent_id = data.get('parent_id') or None
        
        if not name:
            return error_response("Nazwa kategorii nie może być pusta", 400)
        
        # Sprawdź czy kategoria rodzic istnieje (jeśli podano)
        if parent_id:
            parent_check = execute_query("SELECT id FROM kategorie_produktow WHERE id = ? AND aktywna = 1", [parent_id])
            if not parent_check:
                return error_response("Kategoria nadrzędna nie istnieje", 400)
            
        # Sprawdź czy kategoria już istnieje (w tej samej kategorii nadrzędnej)
        if parent_id:
            check_query = "SELECT id FROM kategorie_produktow WHERE nazwa = ? AND parent_id = ?"
            existing = execute_query(check_query, [name, parent_id])
        else:
            check_query = "SELECT id FROM kategorie_produktow WHERE nazwa = ? AND parent_id IS NULL"
            existing = execute_query(check_query, [name])
        
        if existing:
            return error_response("Kategoria o tej nazwie już istnieje w tej lokalizacji", 409)
            
        # Utwórz nową kategorię
        insert_query = """
        INSERT INTO kategorie_produktow (nazwa, opis, parent_id)
        VALUES (?, ?, ?)
        """
        
        result = execute_insert(insert_query, [name, description, parent_id])
        
        if result:
            # Pobierz utworzoną kategorię
            get_query = """
            SELECT 
                id,
                nazwa as name,
                opis as description,
                aktywna as active,
                parent_id,
                data_utworzenia as created_at,
                user_utworzyl as created_by
            FROM kategorie_produktow 
            WHERE id = ?
            """
            
            category = execute_query(get_query, [result])
            
            return success_response({
                'category': category[0] if category else None
            }, "Kategoria została utworzona pomyślnie", 201)
        else:
            return error_response("Nie udało się utworzyć kategorii", 500)
            
    except Exception as e:
        print(f"Błąd tworzenia kategorii: {e}")
        return error_response("Wystąpił błąd podczas tworzenia kategorii", 500)

@categories_bp.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """
    Aktualizuj kategorię produktów
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych do aktualizacji", 400)
            
        # Sprawdź czy kategoria istnieje
        check_query = "SELECT id FROM kategorie_produktow WHERE id = ?"
        existing = execute_query(check_query, [category_id])
        
        if not existing:
            return not_found_response("Kategoria nie została znaleziona")
            
        name = data.get('name', '').strip()
        description = data.get('description', '').strip() or None
        parent_id = data.get('parent_id') or None
        
        if not name:
            return error_response("Nazwa kategorii nie może być pusta", 400)
        
        # Sprawdź czy kategoria rodzic istnieje (jeśli podano)
        if parent_id:
            parent_check = execute_query("SELECT id FROM kategorie_produktow WHERE id = ? AND aktywna = 1", [parent_id])
            if not parent_check:
                return error_response("Kategoria nadrzędna nie istnieje", 400)
            
            # Sprawdź czy nie próbujemy ustawić kategorii jako swoją własną podkategorię
            if parent_id == category_id:
                return error_response("Kategoria nie może być swoją własną podkategorią", 400)
            
            # Sprawdź czy nie tworzymy cyklu (czy parent_id nie jest potomkiem tej kategorii)
            if is_descendant(category_id, parent_id):
                return error_response("Nie można przenieść kategorii do swojego potomka", 400)
            
        # Sprawdź czy nowa nazwa nie koliduje z inną kategorią w tej samej lokalizacji
        if parent_id:
            collision_query = "SELECT id FROM kategorie_produktow WHERE nazwa = ? AND parent_id = ? AND id != ?"
            collision = execute_query(collision_query, [name, parent_id, category_id])
        else:
            collision_query = "SELECT id FROM kategorie_produktow WHERE nazwa = ? AND parent_id IS NULL AND id != ?"
            collision = execute_query(collision_query, [name, category_id])
        
        if collision:
            return error_response("Kategoria o tej nazwie już istnieje w tej lokalizacji", 409)
        
        # Aktualizuj kategorię
        update_query = """
        UPDATE kategorie_produktow 
        SET nazwa = ?, opis = ?, parent_id = ?
        WHERE id = ?
        """
        
        execute_insert(update_query, [name, description, parent_id, category_id])
        
        # Pobierz zaktualizowaną kategorię
        get_query = """
        SELECT 
            id,
            nazwa as name,
            opis as description,
            aktywna as active,
            parent_id,
            data_utworzenia as created_at,
            user_utworzyl as created_by
        FROM kategorie_produktow 
        WHERE id = ?
        """
        
        category = execute_query(get_query, [category_id])
        
        return success_response({
            'category': category[0] if category else None
        }, "Kategoria została zaktualizowana pomyślnie")
        
    except Exception as e:
        print(f"Błąd aktualizacji kategorii: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji kategorii", 500)

@categories_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """
    Usuń kategorię produktów (soft delete)
    """
    try:
        # Sprawdź czy kategoria istnieje
        check_query = "SELECT id FROM kategorie_produktow WHERE id = ?"
        existing = execute_query(check_query, [category_id])
        
        if not existing:
            return not_found_response("Kategoria nie została znaleziona")
            
        # Sprawdź czy kategoria jest używana przez produkty
        products_query = "SELECT COUNT(*) as count FROM produkty WHERE kategoria = (SELECT nazwa FROM kategorie_produktow WHERE id = ?)"
        products_count = execute_query(products_query, [category_id])
        
        if products_count and products_count[0]['count'] > 0:
            return error_response(f"Nie można usunąć kategorii - jest używana przez {products_count[0]['count']} produktów", 409)
        
        # Soft delete - ustaw aktywna = 0
        delete_query = "UPDATE kategorie_produktow SET aktywna = 0 WHERE id = ?"
        execute_insert(delete_query, [category_id])
        
        return success_response(None, "Kategoria została usunięta pomyślnie")
        
    except Exception as e:
        print(f"Błąd usuwania kategorii: {e}")
        return error_response("Wystąpił błąd podczas usuwania kategorii", 500)

@categories_bp.route('/categories/assign', methods=['POST'])
def assign_category_to_products():
    """
    Przypisz kategorię do wybranych produktów
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych", 400)
            
        product_ids = data.get('product_ids', [])
        category_name = data.get('category_name', '').strip()
        
        if not product_ids:
            return error_response("Lista produktów jest wymagana", 400)
            
        if not category_name:
            return error_response("Nazwa kategorii jest wymagana", 400)
            
        # Sprawdź czy kategoria istnieje
        check_query = "SELECT id FROM kategorie_produktow WHERE nazwa = ? AND aktywna = 1"
        category = execute_query(check_query, [category_name])
        
        if not category:
            return error_response("Kategoria nie została znaleziona", 404)
            
        # Przypisz kategorię do produktów
        update_query = "UPDATE produkty SET kategoria = ? WHERE id = ?"
        updated_count = 0
        
        for product_id in product_ids:
            try:
                execute_insert(update_query, [category_name, product_id])
                updated_count += 1
            except Exception as e:
                print(f"Błąd aktualizacji produktu {product_id}: {e}")
                continue
        
        return success_response({
            'updated_count': updated_count,
            'total_products': len(product_ids),
            'category_name': category_name
        }, f"Zaktualizowano kategorię dla {updated_count} produktów")
        
    except Exception as e:
        print(f"Błąd przypisywania kategorii: {e}")
        return error_response("Wystąpił błąd podczas przypisywania kategorii", 500)
