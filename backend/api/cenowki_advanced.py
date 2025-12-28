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
from api.warehouse_pricing import warehouse_pricing_manager

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

    def create_cenowka_with_location_price(self, product_id, nazwa_uproszczona, cena_cenowkowa, 
                                          location_id, cena_promocyjna=None, typ_cenowki='standardowa', 
                                          kategoria_cenowki=None, opis_cenowki=None, 
                                          data_od=None, data_do=None, created_by='admin', waga=None, jednostka_wagi='gramy'):
        """Utwórz nową pozycję cenowki + ustaw cenę lokalizacyjną jednocześnie z synchronizacją"""
        conn = self.get_connection()
        try:
            if not data_od:
                data_od = date.today().isoformat()
            
            cursor = conn.cursor()
            
            # 1. Sprawdź czy cenówka już istnieje dla tego produktu
            cursor.execute("""
                SELECT id FROM cenowki 
                WHERE product_id = ? AND aktywny = 1
                ORDER BY updated_at DESC, id DESC 
                LIMIT 1
            """, (product_id,))
            
            existing = cursor.fetchone()
            
            if existing:
                # Aktualizuj istniejącą cenówkę (bez ceny - ta będzie w warehouse_product_prices)
                cursor.execute("""
                    UPDATE cenowki SET
                        nazwa_uproszczona = ?, typ_cenowki = ?, kategoria_cenowki = ?, 
                        opis_cenowki = ?, data_do = ?, waga = ?, jednostka_wagi = ?, 
                        updated_at = datetime('now')
                    WHERE id = ?
                """, [nazwa_uproszczona, typ_cenowki, kategoria_cenowki, opis_cenowki,
                      data_do, waga, jednostka_wagi, existing['id']])
            else:
                # Utwórz nową cenówkę (cena_cenowkowa = 0, prawdziwa cena w warehouse_product_prices)
                cursor.execute("""
                    INSERT INTO cenowki (
                        product_id, nazwa_uproszczona, cena_cenowkowa, cena_promocyjna,
                        typ_cenowki, kategoria_cenowki, opis_cenowki, 
                        data_od, data_do, created_by, waga, jednostka_wagi
                    ) VALUES (?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
                """, [product_id, nazwa_uproszczona, typ_cenowki, kategoria_cenowki, 
                      opis_cenowki, data_od, data_do, created_by, waga, jednostka_wagi])
            
            conn.commit()
            
            # 2. Ustaw cenę poprzez warehouse_pricing_manager (z synchronizacją)
            final_price = cena_promocyjna if cena_promocyjna else cena_cenowkowa
            
            # Znajdź warehouse_id na podstawie location_id
            cursor.execute("""
                SELECT id FROM warehouses WHERE location_id = ? AND aktywny = 1 LIMIT 1
            """, (location_id,))
            
            warehouse_result = cursor.fetchone()
            if not warehouse_result:
                print(f"❌ Nie znaleziono magazynu dla location_id: {location_id}")
                return False
                
            warehouse_id = warehouse_result['id']
            print(f"🔍 Mapowanie: location_id={location_id} -> warehouse_id={warehouse_id}")
            
            # Użyj warehouse_pricing_manager do ustawienia ceny (z synchronizacją)
            vat_rate = 1.23
            cena_netto = float(final_price) / vat_rate
            
            success = warehouse_pricing_manager.set_warehouse_price(
                warehouse_id=warehouse_id,
                product_id=product_id,
                cena_netto=cena_netto,
                cena_brutto=float(final_price),
                created_by=created_by
            )
            
            if not success:
                print(f"❌ Błąd ustawienia ceny magazynowej")
                return False
                
            print(f"✅ Cena ustawiona i zsynchronizowana dla wszystkich magazynów lokalizacji {location_id}")
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

    def get_cenowka_by_product(self, product_id, location_id=None):
        """Pobierz aktywną cenówkę dla produktu + cenę lokalizacyjną"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz cenówkę (nazwa, opis, waga itp.)
            cursor.execute("""
                SELECT * FROM cenowki 
                WHERE product_id = ? AND aktywny = 1 
                  AND (data_do IS NULL OR data_do >= date('now'))
                ORDER BY updated_at DESC, id DESC 
                LIMIT 1
            """, [product_id])
            
            cenowka = cursor.fetchone()
            
            if not cenowka:
                return None
                
            cenowka_dict = dict(cenowka)
            
            # ZAWSZE pobierz cenę z warehouse_product_prices jeśli location_id jest podane
            if location_id:
                # Znajdź warehouse_id na podstawie location_id
                cursor.execute("""
                    SELECT id FROM warehouses WHERE location_id = ? AND aktywny = 1 LIMIT 1
                """, (location_id,))
                
                warehouse_result = cursor.fetchone()
                
                if warehouse_result:
                    warehouse_id = warehouse_result['id']
                    
                    cursor.execute("""
                        SELECT cena_sprzedazy_netto, cena_sprzedazy_brutto 
                        FROM warehouse_product_prices 
                        WHERE product_id = ? AND warehouse_id = ? AND aktywny = 1
                        ORDER BY updated_at DESC LIMIT 1
                    """, [product_id, warehouse_id])
                    
                    warehouse_price = cursor.fetchone()
                    
                    if warehouse_price:
                        # ZAWSZE zastąp ceny z cenówki cenami magazynowymi (aktualnymi cenami specjalnymi)
                        cenowka_dict['cena_cenowkowa'] = warehouse_price['cena_sprzedazy_brutto']
                        cenowka_dict['cena_netto'] = warehouse_price['cena_sprzedazy_netto']
                        cenowka_dict['location_id'] = location_id
                        cenowka_dict['warehouse_id'] = warehouse_id
                        print(f"🔍 DEBUG - Zwracam cenę z warehouse_product_prices: {warehouse_price['cena_sprzedazy_brutto']} dla produktu {product_id}, warehouse {warehouse_id}")
                    else:
                        print(f"🔍 DEBUG - Brak ceny w warehouse_product_prices dla produktu {product_id}, warehouse {warehouse_id}")
                else:
                    print(f"🔍 DEBUG - Nie znaleziono warehouse dla location_id: {location_id}")
            
            # Dodaj cenę zakupu produktu do obliczeń marży
            cursor.execute("""
                SELECT cena_zakupu, cena_sprzedazy_netto, cena_sprzedazy_brutto 
                FROM produkty 
                WHERE id = ?
            """, [product_id])
            
            product_data = cursor.fetchone()
            
            if product_data:
                cenowka_dict['cena_zakupu'] = product_data['cena_zakupu']
                cenowka_dict['cena_zakupu_netto'] = product_data['cena_zakupu']  # Dla kompatybilności
                
                # Oblicz marżę jeśli jest cena zakupu
                if product_data['cena_zakupu'] and product_data['cena_zakupu'] > 0:
                    sell_price = cenowka_dict.get('cena_netto', product_data['cena_sprzedazy_netto'])
                    if sell_price and sell_price > 0:
                        margin_percent = round(((sell_price - product_data['cena_zakupu']) / product_data['cena_zakupu']) * 100, 2)
                        margin_amount = round(sell_price - product_data['cena_zakupu'], 2)
                        cenowka_dict['marza_procent'] = margin_percent
                        cenowka_dict['marza_kwotowa'] = margin_amount
            
            return cenowka_dict
            
        except Exception as e:
            print(f"Błąd pobierania cenówki dla produktu {product_id}: {e}")
            return None
        finally:
            conn.close()

    def update_cenowka_with_location_price(self, product_id, location_id, **kwargs):
        """Aktualizuj cenówkę + cenę lokalizacyjną jednocześnie z synchronizacją magazynów"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # 1. Aktualizuj cenówkę (nazwa, opis, waga)
            cenowka_fields = []
            cenowka_params = []
            
            cenowka_allowed_fields = [
                'nazwa_uproszczona', 'typ_cenowki', 'kategoria_cenowki', 
                'opis_cenowki', 'waga', 'jednostka_wagi'
            ]
            
            for field in cenowka_allowed_fields:
                if field in kwargs:
                    cenowka_fields.append(f"{field} = ?")
                    cenowka_params.append(kwargs[field])
            
            if cenowka_fields:
                cenowka_fields.append("updated_at = ?")
                cenowka_params.append(datetime.now().isoformat())
                cenowka_params.append(product_id)
                
                cursor.execute(f"""
                    UPDATE cenowki SET {', '.join(cenowka_fields)} 
                    WHERE product_id = ? AND aktywny = 1
                """, cenowka_params)
            
            conn.commit()
            
            # 2. Aktualizuj cenę lokalizacyjną poprzez warehouse_pricing_manager (z synchronizacją)
            if 'cena_cenowkowa' in kwargs or 'cena_promocyjna' in kwargs:
                # Użyj ceny promocyjnej jeśli podana, w przeciwnym razie cenówkowej
                final_price = kwargs.get('cena_promocyjna') or kwargs.get('cena_cenowkowa')
                
                if final_price:
                    # Znajdź pierwszy magazyn dla tej lokalizacji
                    cursor.execute("""
                        SELECT id FROM warehouses WHERE location_id = ? AND aktywny = 1 LIMIT 1
                    """, (location_id,))
                    
                    warehouse_result = cursor.fetchone()
                    if not warehouse_result:
                        print(f"❌ Nie znaleziono magazynu dla location_id: {location_id}")
                        return False, "Nie znaleziono magazynu dla tej lokalizacji"
                        
                    warehouse_id = warehouse_result['id']
                    print(f"🔍 Mapowanie: location_id={location_id} -> warehouse_id={warehouse_id}")
                    
                    # Użyj warehouse_pricing_manager do ustawienia ceny (z synchronizacją)
                    created_by = kwargs.get('created_by', 'cenowka')
                    vat_rate = 1.23
                    cena_netto = float(final_price) / vat_rate
                    
                    success = warehouse_pricing_manager.set_warehouse_price(
                        warehouse_id=warehouse_id,
                        product_id=product_id,
                        cena_netto=cena_netto,
                        cena_brutto=float(final_price),
                        created_by=created_by
                    )
                    
                    if not success:
                        return False, "Błąd aktualizacji ceny magazynowej"
                    
                    print(f"✅ Cena zaktualizowana i zsynchronizowana dla wszystkich magazynów lokalizacji {location_id}")
            
            return True, "Aktualizacja zakończona pomyślnie"
            
        except Exception as e:
            print(f"Błąd aktualizacji cenówki: {e}")
            conn.rollback()
            return False, str(e)
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
        
        return success_response(cenowki, "Lista cenowek")
        
    except Exception as e:
        return error_response(f"Błąd pobierania cenowek: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki', methods=['POST'])
def create_cenowka():
    """Utwórz nową pozycję cenowki z ceną lokalizacyjną"""
    try:
        data = request.get_json()
        print(f"🔍 DEBUG - Otrzymane dane cenowki: {data}")
        
        required_fields = ['product_id', 'nazwa_uproszczona', 'cena_cenowkowa', 'location_id']
        for field in required_fields:
            if field not in data:
                print(f"❌ DEBUG - Brak wymaganego pola: {field}")
                return error_response(f"Brak wymaganego pola: {field}", 400)
        
        success = cenowki_manager.create_cenowka_with_location_price(
            product_id=data['product_id'],
            nazwa_uproszczona=data['nazwa_uproszczona'],
            cena_cenowkowa=data['cena_cenowkowa'],
            location_id=data['location_id'],
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

@cenowki_api_bp.route('/cenowki/product/<int:product_id>', methods=['GET'])
def get_cenowka_by_product(product_id):
    """Pobierz aktywną cenówkę dla produktu + cenę lokalizacyjną"""
    try:
        location_id = request.args.get('location_id', type=int)
        
        cenowka = cenowki_manager.get_cenowka_by_product(product_id, location_id)
        
        if cenowka:
            return success_response(cenowka, "Cenówka znaleziona")
        else:
            return success_response(None, "Brak cenówki dla produktu")
            
    except Exception as e:
        return error_response(f"Błąd pobierania cenówki: {str(e)}", 500)

@cenowki_api_bp.route('/cenowki/product/<int:product_id>/location/<int:location_id>', methods=['PUT'])
def update_cenowka_for_location(product_id, location_id):
    """Aktualizuj cenówkę + cenę lokalizacyjną"""
    try:
        data = request.get_json()
        
        success, message = cenowki_manager.update_cenowka_with_location_price(
            product_id, location_id, **data
        )
        
        if success:
            return success_response({}, message)
        else:
            return error_response(message, 400)
            
    except Exception as e:
        return error_response(f"Błąd aktualizacji cenowki: {str(e)}", 500)

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


