"""
API modułu Cenowki z uproszczonymi nazwami produktów
Zarządzanie cenowkami z dedykowanymi uproszczonymi nazwami
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date
import sqlite3
import os
import sys

# Dodaj ścieżki do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from utils.database import execute_query, execute_insert, get_db_connection
from utils.response_helpers import success_response, error_response

cenowki_api_bp = Blueprint('cenowki_api', __name__)
                ]nazwami
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date
import sqlite3
import os
import sys

# Dodaj ścieżki do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from utils.database import execute_query, execute_insert, get_db_connection
from utils.response_helpers import success_response, error_response

cenowki_api_bp = Blueprint('cenowki_api', __name__)

class CenowkiManager:
    def __init__(self, db_path=None):
        # Używamy funkcji get_db_connection z utils/database.py
        pass
    
    def get_connection(self):
        """Pobierz połączenie z bazą danych"""
        return get_db_connection()

    def get_all_cenowki(self, limit=100, offset=0, category_filter=None, type_filter=None):
        """Pobierz wszystkie aktywne cenowki"""
        conn = self.get_connection()
        try:
            query = """
                SELECT * FROM v_active_cenowki
                WHERE 1=1
            """
            
            params = []
            if category_filter:
                query += " AND kategoria_cenowki = ?"
                params.append(category_filter)
                
            if type_filter:
                query += " AND typ_cenowki = ?"
                params.append(type_filter)
                
            query += " ORDER BY kategoria_cenowki, priorytet DESC, nazwa_uproszczona LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            result = cursor.fetchall()
            return [dict(row) for row in result] if result else []
            
        except Exception as e:
            print(f"Błąd pobierania cenowek: {e}")
            return []
        finally:
            conn.close()

    def create_cenowka(self, product_id, nazwa_uproszczona, cena_cenowkowa, 
                      cena_promocyjna=None, typ_cenowki='standardowa', 
                      kategoria_cenowki=None, opis_cenowki=None, 
                      data_od=None, data_do=None, created_by='admin', waga=None, jednostka_wagi='gramy'):
        """Utwórz nową pozycję cenowki lub zaktualizuj istniejącą"""
        conn = self.get_connection()
        try:
            if not data_od:
                data_od = date.today().isoformat()
            
            # Sprawdź czy cenówka już istnieje dla tego produktu (niezależnie od daty)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id FROM cenowki 
                WHERE product_id = ? AND aktywny = 1
                ORDER BY updated_at DESC, id DESC 
                LIMIT 1
            """, (product_id,))
            
            existing = cursor.fetchone()
            
            if existing:
                # Aktualizuj istniejącą cenówkę
                query = """
                    UPDATE cenowki SET
                        nazwa_uproszczona = ?, cena_cenowkowa = ?, cena_promocyjna = ?,
                        typ_cenowki = ?, kategoria_cenowki = ?, opis_cenowki = ?,
                        data_do = ?, waga = ?, jednostka_wagi = ?, updated_at = datetime('now')
                    WHERE id = ?
                """
                params = [
                    nazwa_uproszczona, cena_cenowkowa, cena_promocyjna,
                    typ_cenowki, kategoria_cenowki, opis_cenowki,
                    data_do, waga, jednostka_wagi, existing['id']
                ]
            else:
                # Utwórz nową cenówkę
                query = """
                    INSERT INTO cenowki (
                        product_id, nazwa_uproszczona, cena_cenowkowa, cena_promocyjna,
                        typ_cenowki, kategoria_cenowki, opis_cenowki, 
                        data_od, data_do, created_by, waga, jednostka_wagi
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                params = [
                    product_id, nazwa_uproszczona, cena_cenowkowa, cena_promocyjna,
                    typ_cenowki, kategoria_cenowki, opis_cenowki,
                    data_od, data_do, created_by, waga, jednostka_wagi
                ]
            
            cursor.execute(query, params)
            conn.commit()
            return True
            
        except Exception as e:
            print(f"Błąd tworzenia/aktualizacji cenowki: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def update_cenowka(self, cenowka_id, **kwargs):
        """Aktualizuj pozycję cenowki"""
        conn = self.get_connection()
        try:
            # Pobranie obecnych danych
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM cenowki WHERE id = ?", [cenowka_id])
            current_data = cursor.fetchone()
            
            if not current_data:
                return False, "Cenowka nie znaleziona"
            
            # Przygotowanie pól do aktualizacji
            update_fields = []
            params = []
            
            allowed_fields = [
                'nazwa_uproszczona', 'cena_cenowkowa', 'cena_promocyjna',
                'typ_cenowki', 'kategoria_cenowki', 'opis_cenowki',
                'data_od', 'data_do', 'aktywny', 'priorytet', 'waga', 'jednostka_wagi'
            ]
            
            for field in allowed_fields:
                if field in kwargs:
                    update_fields.append(f"{field} = ?")
                    params.append(kwargs[field])
            
            if not update_fields:
                return False, "Brak pól do aktualizacji"
            
            # Dodaj updated_at
            update_fields.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            
            # Dodaj ID na końcu
            params.append(cenowka_id)
            
            query = f"UPDATE cenowki SET {', '.join(update_fields)} WHERE id = ?"
            
            cursor.execute(query, params)
            conn.commit()
            return True, "Aktualizacja zakończona pomyślnie"
            
        except Exception as e:
            print(f"Błąd aktualizacji cenowki: {e}")
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    def get_cenowka_by_product(self, product_id):
        """Pobierz aktywną cenówkę dla produktu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM cenowki 
                WHERE product_id = ? AND aktywny = 1 
                  AND (data_do IS NULL OR data_do >= date('now'))
                ORDER BY updated_at DESC, id DESC 
                LIMIT 1
            """, [product_id])
            
            result = cursor.fetchone()
            return dict(result) if result else None
            
        except Exception as e:
            print(f"Błąd pobierania cenówki dla produktu {product_id}: {e}")
            return None
        finally:
            conn.close()

    def delete_cenowka(self, cenowka_id):
        """Usuń pozycję cenowki (oznacz jako nieaktywną)"""
        conn = self.get_connection()
        try:
            query = """
                UPDATE cenowki 
                SET aktywny = 0, updated_at = ?
                WHERE id = ?
            """
            
            cursor = conn.cursor()
            cursor.execute(query, [datetime.now().isoformat(), cenowka_id])
            conn.commit()
            return True
            
        except Exception as e:
            print(f"Błąd usuwania cenowki: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def bulk_create_cenowki_from_products(self, category_filter=None, force_recreate=False):
        """Masowe tworzenie cenowek z istniejących produktów"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz produkty które nie mają cenowek lub force_recreate
            if force_recreate:
                products_query = """
                    SELECT p.id, p.nazwa, p.cena_sprzedazy_brutto, p.kategoria_id, pr.nazwa as producent_nazwa
                    FROM products p
                    LEFT JOIN producenci pr ON p.producent_id = pr.id
                    WHERE p.aktywny = 1
                """
            else:
                products_query = """
                    SELECT p.id, p.nazwa, p.cena_sprzedazy_brutto, p.kategoria_id, pr.nazwa as producent_nazwa
                    FROM products p
                    LEFT JOIN producenci pr ON p.producent_id = pr.id
                    LEFT JOIN cenowki c ON p.id = c.product_id AND c.aktywny = 1
                    WHERE p.aktywny = 1 AND c.id IS NULL
                """
            
            params = []
            if category_filter:
                products_query += " AND p.kategoria_id = ?"
                params.append(category_filter)
            
            cursor.execute(products_query, params)
            products = cursor.fetchall()
            
            if not products:
                return 0, "Brak produktów do przetworzenia"
            
            created_count = 0
            
            for product in products:
                # Generuj uproszczoną nazwę
                simplified_name = self.generate_simplified_name(
                    product['nazwa'], 
                    product['producent_nazwa']
                )
                
                # Określ kategorię cenowki
                kategoria_cenowki = self.map_category_to_cenowka_category(product['kategoria_id'])
                
                # Utwórz cenowkę
                success = self.create_cenowka(
                    product_id=product['id'],
                    nazwa_uproszczona=simplified_name,
                    cena_cenowkowa=product['cena_sprzedazy_brutto'] or 0,
                    kategoria_cenowki=kategoria_cenowki,
                    opis_cenowki=f"Auto-generowana z produktu: {product['nazwa']}"
                )
                
                if success:
                    created_count += 1
            
            return created_count, f"Utworzono {created_count} cenowek"
            
        except Exception as e:
            print(f"Błąd masowego tworzenia cenowek: {e}")
            return 0, str(e)
        finally:
            conn.close()

    def generate_simplified_name(self, product_name, producent_name=None):
        """Generuj uproszczoną nazwę produktu dla cenowki"""
        try:
            # Usuń typowe słowa opisowe
            stop_words = ['i', 'w', 'z', 'na', 'do', 'od', 'po', 'o', 'kg', 'g', 'ml', 'l', 'szt', 'op']
            
            words = product_name.split()
            filtered_words = []
            
            for word in words:
                # Usuń liczby z jednostkami (np. "500g", "1L")
                if not any(char.isdigit() for char in word):
                    if word.lower() not in stop_words:
                        filtered_words.append(word)
            
            # Ogranicz do pierwszych 3-4 słów
            simplified = ' '.join(filtered_words[:4])
            
            # Dodaj producenta na początku jeśli istnieje
            if producent_name and producent_name.strip():
                simplified = f"{producent_name} {simplified}"
            
            # Ogranicz długość i wyczyść
            return simplified[:50].strip()
            
        except Exception as e:
            print(f"Błąd generowania uproszczonej nazwy: {e}")
            return product_name[:50]

    def map_category_to_cenowka_category(self, category_id):
        """Mapuj ID kategorii produktu na kategorię cenowki"""
        category_mapping = {
            1: "Pieczywo",
            2: "Nabiał", 
            3: "Mięso i wędliny",
            4: "Warzywa i owoce",
            5: "Napoje",
            6: "Słodycze",
            7: "Artykuły gospodarstwa domowego",
            8: "Kosmetyki i higiena"
        }
        
        return category_mapping.get(category_id, "Inne")

    def get_cenowki_categories(self):
        """Pobierz listę kategorii cenowek"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    kategoria_cenowki,
                    COUNT(*) as liczba_produktow,
                    AVG(cena_cenowkowa) as srednia_cena
                FROM cenowki 
                WHERE aktywny = 1 AND kategoria_cenowki IS NOT NULL
                GROUP BY kategoria_cenowki
                ORDER BY kategoria_cenowki
            """
            
            cursor = conn.cursor()
            cursor.execute(query)
            result = cursor.fetchall()
            return [dict(row) for row in result] if result else []
            
        except Exception as e:
            print(f"Błąd pobierania kategorii: {e}")
            return []
        finally:
            conn.close()

    def get_cenowki_stats(self):
        """Pobierz statystyki cenowek"""
        conn = self.get_connection()
        try:
            stats = {}
            cursor = conn.cursor()
            
            # Podstawowe statystyki
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_cenowki,
                    COUNT(CASE WHEN aktywny = 1 THEN 1 END) as active_cenowki,
                    AVG(CASE WHEN aktywny = 1 THEN cena_cenowkowa END) as avg_price,
                    MIN(CASE WHEN aktywny = 1 THEN cena_cenowkowa END) as min_price,
                    MAX(CASE WHEN aktywny = 1 THEN cena_cenowkowa END) as max_price,
                    COUNT(CASE WHEN cena_promocyjna IS NOT NULL AND aktywny = 1 THEN 1 END) as promo_count
                FROM cenowki
            """)
            
            basic_stats = cursor.fetchone()
            if basic_stats:
                stats.update(dict(basic_stats))
            
            # Statystyki według kategorii
            cursor.execute("""
                SELECT 
                    kategoria_cenowki,
                    typ_cenowki,
                    COUNT(*) as liczba_produktow,
                    AVG(cena_cenowkowa) as srednia_cena,
                    MIN(cena_cenowkowa) as min_cena,
                    MAX(cena_cenowkowa) as max_cena,
                    COUNT(CASE WHEN cena_promocyjna IS NOT NULL THEN 1 END) as liczba_promocji
                FROM cenowki
                WHERE aktywny = 1 
                  AND (data_do IS NULL OR data_do >= date('now'))
                GROUP BY kategoria_cenowki, typ_cenowki
                ORDER BY kategoria_cenowki, typ_cenowki
            """)
            
            category_stats = cursor.fetchall()
            stats['categories'] = [dict(row) for row in category_stats] if category_stats else []
            
            return stats
            
        except Exception as e:
            print(f"Błąd pobierania statystyk: {e}")
            return {}
        finally:
            conn.close()

# Inicjalizacja managera
cenowki_manager = CenowkiManager()

# === ENDPOINTY API ===

@cenowki_api_bp.route('/cenowki', methods=['GET'])
def get_cenowki():
    """Pobierz wszystkie aktywne cenowki"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        category = request.args.get('category')
        type_filter = request.args.get('type')
        
        cenowki = cenowki_manager.get_all_cenowki(
            limit=limit, 
            offset=offset, 
            category_filter=category,
            type_filter=type_filter
        )
        
        return success_response({
            'cenowki': cenowki,
            'count': len(cenowki),
            'limit': limit,
            'offset': offset
        }, "Lista cenowek")
        
    except Exception as e:
        return error_response(f"Błąd pobierania cenowek: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki', methods=['POST'])
def create_cenowka():
    """Utwórz nową pozycję cenowki"""
    try:
        data = request.get_json()
        
        required_fields = ['product_id', 'nazwa_uproszczona', 'cena_cenowkowa']
        for field in required_fields:
            if field not in data:
                return error_response(f"Brak wymaganego pola: {field}", 400)
        
        success = cenowki_manager.create_cenowka(
            product_id=data['product_id'],
            nazwa_uproszczona=data['nazwa_uproszczona'],
            cena_cenowkowa=data['cena_cenowkowa'],
            cena_promocyjna=data.get('cena_promocyjna'),
            typ_cenowki=data.get('typ_cenowki', 'standardowa'),
            kategoria_cenowki=data.get('kategoria_cenowki'),
            opis_cenowki=data.get('opis_cenowki'),
            data_od=data.get('data_od'),
            data_do=data.get('data_do'),
            created_by=data.get('created_by', 'admin'),
            waga=data.get('waga'),
            jednostka_wagi=data.get('jednostka_wagi', 'gramy')
        )
        
        if success:
            return success_response({}, "Cenowka utworzona pomyślnie")
        else:
            return error_response("Błąd tworzenia cenowki", 500)
            
    except Exception as e:
        return error_response(f"Błąd tworzenia cenowki: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki/<int:cenowka_id>', methods=['PUT'])
def update_cenowka(cenowka_id):
    """Aktualizuj pozycję cenowki"""
    try:
        data = request.get_json()
        
        success, message = cenowki_manager.update_cenowka(cenowka_id, **data)
        
        if success:
            return success_response({}, message)
        else:
            return error_response(message, 400)
            
    except Exception as e:
        return error_response(f"Błąd aktualizacji cenowki: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki/product/<int:product_id>', methods=['GET'])
def get_cenowka_by_product(product_id):
    """Pobierz aktywną cenówkę dla produktu"""
    try:
        cenowka = cenowki_manager.get_cenowka_by_product(product_id)
        
        if cenowka:
            return success_response(cenowka, "Cenówka znaleziona")
        else:
            return success_response(None, "Brak cenówki dla produktu")
            
    except Exception as e:
        return error_response(f"Błąd pobierania cenówki: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki/<int:cenowka_id>', methods=['DELETE'])
def delete_cenowka(cenowka_id):
    """Usuń pozycję cenowki"""
    try:
        success = cenowki_manager.delete_cenowka(cenowka_id)
        
        if success:
            return success_response({}, "Cenowka usunięta pomyślnie")
        else:
            return error_response("Błąd usuwania cenowki", 500)
            
    except Exception as e:
        return error_response(f"Błąd usuwania cenowki: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki/bulk-create', methods=['POST'])
def bulk_create_cenowki():
    """Masowe tworzenie cenowek z produktów"""
    try:
        data = request.get_json() or {}
        category_filter = data.get('category_filter')
        force_recreate = data.get('force_recreate', False)
        
        count, message = cenowki_manager.bulk_create_cenowki_from_products(
            category_filter=category_filter,
            force_recreate=force_recreate
        )
        
        return success_response({
            'created_count': count,
            'message': message
        }, "Masowe tworzenie cenowek")
        
    except Exception as e:
        return error_response(f"Błąd masowego tworzenia: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki/categories', methods=['GET'])
def get_cenowki_categories():
    """Pobierz kategorie cenowek"""
    try:
        categories = cenowki_manager.get_cenowki_categories()
        return success_response(categories, "Kategorie cenowek")
        
    except Exception as e:
        return error_response(f"Błąd pobierania kategorii: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki/stats', methods=['GET'])
def get_cenowki_stats():
    """Pobierz statystyki cenowek"""
    try:
        stats = cenowki_manager.get_cenowki_stats()
        return success_response(stats, "Statystyki cenowek")
        
    except Exception as e:
        return error_response(f"Błąd pobierania statystyk: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki/health', methods=['GET'])
def health_check():
    """Sprawdzenie stanu modułu"""
    return success_response({
        'module': 'cenowki_api',
        'status': 'OK',
        'timestamp': datetime.now().isoformat()
    }, "Moduł cenowek działa poprawnie")

# Utwórz instancję managera
cenowki_manager = CenowkiManager()
