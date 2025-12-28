from flask import Blueprint, request, jsonify
import sqlite3
import os
from datetime import datetime, date
from utils.database import get_db_connection

document_prefixes_bp = Blueprint('document_prefixes', __name__)

class DocumentPrefixManager:
    def __init__(self, db_path=None):
        if db_path:
            self.db_path = db_path
        else:
            # Ścieżka do głównej bazy danych w katalogu głównym projektu
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.db_path = os.path.join(current_dir, '..', '..', 'kupony.db')
    
    def get_connection(self):
        """Pobierz połączenie z bazą danych"""
        return get_db_connection()

    def get_all_prefixes(self, location_id=None):
        """Pobierz wszystkie prefiksy dokumentów"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            if location_id:
                cursor.execute("""
                    SELECT dp.*, l.nazwa as location_name 
                    FROM document_prefixes dp
                    LEFT JOIN locations l ON dp.location_id = l.id
                    WHERE dp.location_id = ?
                    ORDER BY dp.location_id, dp.document_type
                """, [location_id])
            else:
                cursor.execute("""
                    SELECT dp.*, l.nazwa as location_name 
                    FROM document_prefixes dp
                    LEFT JOIN locations l ON dp.location_id = l.id
                    ORDER BY dp.location_id, dp.document_type
                """)
            
            prefixes = cursor.fetchall()
            return [dict(row) for row in prefixes]
            
        except Exception as e:
            print(f"Błąd pobierania prefiksów: {e}")
            return []
        finally:
            conn.close()

    def get_prefix_for_document(self, location_id, document_type):
        """Pobierz prefiks dla konkretnego typu dokumentu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM document_prefixes 
                WHERE location_id = ? AND document_type = ? AND active = 1
            """, [location_id, document_type])
            
            result = cursor.fetchone()
            return dict(result) if result else None
            
        except Exception as e:
            print(f"Błąd pobierania prefiksu: {e}")
            return None
        finally:
            conn.close()

    def update_prefix(self, prefix_id, data):
        """Aktualizuj prefiks dokumentu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Sprawdź czy prefiks istnieje
            cursor.execute("SELECT id FROM document_prefixes WHERE id = ?", [prefix_id])
            if not cursor.fetchone():
                return False, "Prefiks nie istnieje"
            
            # Aktualizuj prefiks
            cursor.execute("""
                UPDATE document_prefixes 
                SET prefix = ?, format_pattern = ?, description = ?, 
                    reset_period = ?, active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, [
                data.get('prefix'),
                data.get('format_pattern'),
                data.get('description'),
                data.get('reset_period', 'yearly'),
                data.get('active', True),
                prefix_id
            ])
            
            conn.commit()
            return True, "Prefiks zaktualizowany pomyślnie"
            
        except Exception as e:
            print(f"Błąd aktualizacji prefiksu: {e}")
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    def create_prefix(self, data):
        """Utwórz nowy prefiks dokumentu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Sprawdź czy prefiks już nie istnieje
            cursor.execute("""
                SELECT id FROM document_prefixes 
                WHERE location_id = ? AND document_type = ?
            """, [data.get('location_id'), data.get('document_type')])
            
            if cursor.fetchone():
                return False, "Prefiks dla tego typu dokumentu już istnieje w tej lokalizacji"
            
            # Utwórz nowy prefiks
            cursor.execute("""
                INSERT INTO document_prefixes 
                (location_id, document_type, prefix, format_pattern, description, reset_period, active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [
                data.get('location_id'),
                data.get('document_type'),
                data.get('prefix'),
                data.get('format_pattern', '{prefix}/{numer}/{rok}'),
                data.get('description', ''),
                data.get('reset_period', 'yearly'),
                data.get('active', True)
            ])
            
            conn.commit()
            return True, "Prefiks utworzony pomyślnie"
            
        except Exception as e:
            print(f"Błąd tworzenia prefiksu: {e}")
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    def generate_document_number(self, location_id, document_type):
        """Wygeneruj numer dokumentu z prefiksem"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz konfigurację prefiksu
            prefix_config = self.get_prefix_for_document(location_id, document_type)
            if not prefix_config:
                return None, f"Brak konfiguracji prefiksu dla {document_type} w lokalizacji {location_id}"
            
            current_year = date.today().year
            current_month = date.today().month
            
            # Sprawdź czy resetować licznik
            reset_needed = False
            if prefix_config['reset_period'] == 'yearly':
                # Sprawdź czy ostatni numer był w tym roku
                cursor.execute("""
                    SELECT current_number, updated_at FROM document_prefixes 
                    WHERE id = ?
                """, [prefix_config['id']])
                result = cursor.fetchone()
                if result and result['updated_at']:
                    last_update = datetime.fromisoformat(result['updated_at'])
                    if last_update.year < current_year:
                        reset_needed = True
            elif prefix_config['reset_period'] == 'monthly':
                cursor.execute("""
                    SELECT current_number, updated_at FROM document_prefixes 
                    WHERE id = ?
                """, [prefix_config['id']])
                result = cursor.fetchone()
                if result and result['updated_at']:
                    last_update = datetime.fromisoformat(result['updated_at'])
                    if last_update.year < current_year or last_update.month < current_month:
                        reset_needed = True
            
            # Zwiększ licznik lub zresetuj
            if reset_needed:
                new_number = 1
            else:
                new_number = prefix_config['current_number'] + 1
            
            # Aktualizuj licznik
            cursor.execute("""
                UPDATE document_prefixes 
                SET current_number = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, [new_number, prefix_config['id']])
            
            # Wygeneruj numer dokumentu
            document_number = prefix_config['format_pattern'].format(
                prefix=prefix_config['prefix'],
                numer=str(new_number).zfill(4),
                rok=current_year,
                miesiac=str(current_month).zfill(2)
            )
            
            conn.commit()
            return document_number, None
            
        except Exception as e:
            print(f"Błąd generowania numeru dokumentu: {e}")
            conn.rollback()
            return None, str(e)
        finally:
            conn.close()

    def get_document_types(self):
        """Pobierz dostępne typy dokumentów"""
        return [
            {'type': 'faktura_sprzedazy', 'name': 'Faktury sprzedaży'},
            {'type': 'paragon', 'name': 'Paragony'},
            {'type': 'duplikat_faktury', 'name': 'Duplikaty faktur'},
            {'type': 'korekta_faktury', 'name': 'Korekty faktur'},
            {'type': 'korekta_paragonu', 'name': 'Korekty paragonów'},
            {'type': 'dokument_kp', 'name': 'Dokumenty KP'},
            {'type': 'faktura_zakupowa', 'name': 'Faktury zakupowe'},
            {'type': 'dokument_pz', 'name': 'Dokumenty PZ'},
            {'type': 'dokument_wz', 'name': 'Dokumenty WZ'},
            {'type': 'dokument_rw', 'name': 'Dokumenty RW'},
            {'type': 'dokument_pw', 'name': 'Dokumenty PW'},
        ]

    def create_default_prefixes_for_location(self, location_id, location_name=None):
        """Utwórz domyślne prefiksy dla nowej lokalizacji"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz informacje o lokalizacji jeśli nie podano nazwy
            if not location_name:
                cursor.execute("SELECT nazwa FROM locations WHERE id = ?", [location_id])
                result = cursor.fetchone()
                if result:
                    location_name = result['nazwa']
                else:
                    return False, "Lokalizacja nie istnieje"
            
            # Sprawdź czy już są prefiksy dla tej lokalizacji
            cursor.execute("SELECT COUNT(*) as count FROM document_prefixes WHERE location_id = ?", [location_id])
            result = cursor.fetchone()
            if result['count'] > 0:
                return False, "Prefiksy dla tej lokalizacji już istnieją"
            
            # Wygeneruj kod lokalizacji na podstawie nazwy
            location_code = self._generate_location_code(location_name)
            
            # Domyślne typy dokumentów z prefiksami
            default_prefixes = [
                {
                    'document_type': 'faktura_sprzedazy',
                    'prefix': f'FS-{location_code}',
                    'format_pattern': f'FS-{location_code}/{{numer}}/{{rok}}',
                    'description': f'Faktury sprzedaży - {location_name}',
                    'reset_period': 'yearly'
                },
                {
                    'document_type': 'paragon',
                    'prefix': f'PAR-{location_code}',
                    'format_pattern': f'PAR-{location_code}/{{numer}}/{{rok}}',
                    'description': f'Paragony - {location_name}',
                    'reset_period': 'yearly'
                },
                {
                    'document_type': 'duplikat_faktury',
                    'prefix': f'DUP-{location_code}',
                    'format_pattern': f'DUP-{location_code}/{{numer}}/{{rok}}',
                    'description': f'Duplikaty faktur - {location_name}',
                    'reset_period': 'yearly'
                },
                {
                    'document_type': 'korekta_faktury',
                    'prefix': f'KOR-{location_code}',
                    'format_pattern': f'KOR-{location_code}/{{numer}}/{{rok}}',
                    'description': f'Korekty faktur - {location_name}',
                    'reset_period': 'yearly'
                },
                {
                    'document_type': 'korekta_paragonu',
                    'prefix': f'KPAR-{location_code}',
                    'format_pattern': f'KPAR-{location_code}/{{numer}}/{{rok}}',
                    'description': f'Korekty paragonów - {location_name}',
                    'reset_period': 'yearly'
                },
                {
                    'document_type': 'dokument_kp',
                    'prefix': f'KP-{location_code}',
                    'format_pattern': f'KP-{location_code}/{{numer}}/{{rok}}',
                    'description': f'Dokumenty KP - {location_name}',
                    'reset_period': 'yearly'
                },
                {
                    'document_type': 'faktura_zakupowa',
                    'prefix': f'FZ-{location_code}',
                    'format_pattern': f'FZ-{location_code}/{{numer}}/{{rok}}',
                    'description': f'Faktury zakupowe - {location_name}',
                    'reset_period': 'yearly'
                }
            ]
            
            # Wstaw prefiksy do bazy
            for prefix_data in default_prefixes:
                cursor.execute("""
                    INSERT INTO document_prefixes 
                    (location_id, document_type, prefix, format_pattern, description, reset_period, current_number, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, [
                    location_id,
                    prefix_data['document_type'],
                    prefix_data['prefix'],
                    prefix_data['format_pattern'],
                    prefix_data['description'],
                    prefix_data['reset_period']
                ])
            
            conn.commit()
            return True, f"Utworzono {len(default_prefixes)} prefiksów dla lokalizacji {location_name}"
            
        except Exception as e:
            print(f"Błąd tworzenia domyślnych prefiksów: {e}")
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    def _generate_location_code(self, location_name):
        """Wygeneruj kod lokalizacji na podstawie nazwy"""
        # Usuń "SFD " z nazwy jeśli istnieje
        name = location_name.replace('SFD ', '').strip()
        
        # Mapowanie specjalnych nazw
        name_mapping = {
            'Szperk': 'SZP',
            'Kalisz': 'KAL',
            'Nysa': 'NYS',
            'Leszno': 'LES',
            'Poznań': 'POZ',
            'Wejherowo': 'WEJ'
        }
        
        if name in name_mapping:
            return name_mapping[name]
        
        # Dla innych nazw - pierwsze 3 litery wielką literą
        return name[:3].upper()

# Instancja managera
prefix_manager = DocumentPrefixManager()

@document_prefixes_bp.route('/document-prefixes', methods=['GET'])
def get_prefixes():
    """Pobierz wszystkie prefiksy dokumentów"""
    try:
        location_id = request.args.get('location_id', type=int)
        prefixes = prefix_manager.get_all_prefixes(location_id)
        
        return jsonify({
            'success': True,
            'data': prefixes
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@document_prefixes_bp.route('/document-prefixes/<int:prefix_id>', methods=['PUT'])
def update_prefix(prefix_id):
    """Aktualizuj prefiks dokumentu"""
    try:
        data = request.get_json()
        success, message = prefix_manager.update_prefix(prefix_id, data)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@document_prefixes_bp.route('/document-prefixes', methods=['POST'])
def create_prefix():
    """Utwórz nowy prefiks dokumentu"""
    try:
        data = request.get_json()
        success, message = prefix_manager.create_prefix(data)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@document_prefixes_bp.route('/document-types', methods=['GET'])
def get_document_types():
    """Pobierz dostępne typy dokumentów"""
    try:
        types = prefix_manager.get_document_types()
        return jsonify({
            'success': True,
            'data': types
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@document_prefixes_bp.route('/generate-document-number', methods=['POST'])
def generate_document_number():
    """Wygeneruj numer dokumentu"""
    try:
        data = request.get_json()
        location_id = data.get('location_id')
        document_type = data.get('document_type')
        
        if not location_id or not document_type:
            return jsonify({
                'success': False,
                'error': 'Wymagane: location_id i document_type'
            }), 400
        
        number, error = prefix_manager.generate_document_number(location_id, document_type)
        
        if number:
            return jsonify({
                'success': True,
                'document_number': number
            })
        else:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@document_prefixes_bp.route('/create-default-prefixes/<int:location_id>', methods=['POST'])
def create_default_prefixes(location_id):
    """Utwórz domyślne prefiksy dla lokalizacji"""
    try:
        success, message = prefix_manager.create_default_prefixes_for_location(location_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@document_prefixes_bp.route('/locations-without-prefixes', methods=['GET'])
def get_locations_without_prefixes():
    """Pobierz lokalizacje, które nie mają ustawionych prefiksów"""
    try:
        conn = prefix_manager.get_connection()
        cursor = conn.cursor()
        
        # Znajdź lokalizacje bez prefiksów
        cursor.execute("""
            SELECT l.id, l.nazwa, l.kod_lokalizacji
            FROM locations l
            WHERE l.aktywny = 1 
            AND l.id NOT IN (
                SELECT DISTINCT location_id 
                FROM document_prefixes 
                WHERE location_id IS NOT NULL
            )
            ORDER BY l.nazwa
        """)
        
        locations = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': [dict(row) for row in locations]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
