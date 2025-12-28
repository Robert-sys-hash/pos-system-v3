from flask import Blueprint, request, jsonify
import sqlite3
from datetime import datetime
import os

announcements_bp = Blueprint('announcements', __name__)

def get_db_connection():
    """Połączenie z bazą danych"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'kupony.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_announcements_tables():
    """Tworzy tabele dla ogłoszeń"""
    conn = get_db_connection()
    try:
        # Tabela ogłoszeń
        conn.execute('''
            CREATE TABLE IF NOT EXISTS ogloszenia (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tytul TEXT NOT NULL,
                tresc TEXT NOT NULL,
                autor TEXT NOT NULL,
                data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
                aktywne BOOLEAN DEFAULT 1,
                wazne_do DATETIME NULL,
                priorytet INTEGER DEFAULT 0
            )
        ''')
        
        # Tabela komentarzy do ogłoszeń
        conn.execute('''
            CREATE TABLE IF NOT EXISTS ogloszenia_komentarze (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ogloszenie_id INTEGER NOT NULL,
                autor TEXT NOT NULL,
                komentarz TEXT NOT NULL,
                data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ogloszenie_id) REFERENCES ogloszenia (id) ON DELETE CASCADE
            )
        ''')
        
        conn.commit()
    except Exception as e:
        print(f"Błąd tworzenia tabel ogłoszeń: {e}")
    finally:
        conn.close()

# Inicjalizacja tabel przy imporcie
init_announcements_tables()

@announcements_bp.route('/api/announcements', methods=['GET'])
def get_announcements():
    """Pobiera wszystkie aktywne ogłoszenia"""
    try:
        conn = get_db_connection()
        
        # Pobierz ogłoszenia z liczbą komentarzy
        query = '''
            SELECT 
                o.id,
                o.tytul,
                o.tresc,
                o.autor,
                o.data_utworzenia,
                o.wazne_do,
                o.priorytet,
                COUNT(k.id) as liczba_komentarzy
            FROM ogloszenia o
            LEFT JOIN ogloszenia_komentarze k ON o.id = k.ogloszenie_id
            WHERE o.aktywne = 1 
                AND (o.wazne_do IS NULL OR o.wazne_do > datetime('now'))
            GROUP BY o.id
            ORDER BY o.priorytet DESC, o.data_utworzenia DESC
        '''
        
        announcements = conn.execute(query).fetchall()
        
        result = []
        for ann in announcements:
            result.append({
                'id': ann['id'],
                'tytul': ann['tytul'],
                'tresc': ann['tresc'],
                'autor': ann['autor'],
                'data_utworzenia': ann['data_utworzenia'],
                'wazne_do': ann['wazne_do'],
                'priorytet': ann['priorytet'],
                'liczba_komentarzy': ann['liczba_komentarzy']
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ogłoszenia pobrane pomyślnie',
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd pobierania ogłoszeń: {str(e)}'
        }), 500

@announcements_bp.route('/api/announcements', methods=['POST'])
def create_announcement():
    """Tworzy nowe ogłoszenie (tylko admin)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Brak danych w żądaniu'
            }), 400
            
        # Walidacja wymaganych pól
        required_fields = ['tytul', 'tresc', 'autor']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'Pole {field} jest wymagane'
                }), 400
        
        conn = get_db_connection()
        
        # Dodaj ogłoszenie
        query = '''
            INSERT INTO ogloszenia (tytul, tresc, autor, wazne_do, priorytet)
            VALUES (?, ?, ?, ?, ?)
        '''
        
        cursor = conn.execute(query, (
            data['tytul'],
            data['tresc'],
            data['autor'],
            data.get('wazne_do'),
            data.get('priorytet', 0)
        ))
        
        announcement_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ogłoszenie utworzone pomyślnie',
            'data': {'id': announcement_id}
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd tworzenia ogłoszenia: {str(e)}'
        }), 500

@announcements_bp.route('/api/announcements/<int:announcement_id>/comments', methods=['GET'])
def get_announcement_comments(announcement_id):
    """Pobiera komentarze do ogłoszenia"""
    try:
        conn = get_db_connection()
        
        query = '''
            SELECT id, autor, komentarz, data_utworzenia
            FROM ogloszenia_komentarze
            WHERE ogloszenie_id = ?
            ORDER BY data_utworzenia ASC
        '''
        
        comments = conn.execute(query, (announcement_id,)).fetchall()
        
        result = []
        for comment in comments:
            result.append({
                'id': comment['id'],
                'autor': comment['autor'],
                'komentarz': comment['komentarz'],
                'data_utworzenia': comment['data_utworzenia']
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Komentarze pobrane pomyślnie',
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd pobierania komentarzy: {str(e)}'
        }), 500

@announcements_bp.route('/api/announcements/<int:announcement_id>/comments', methods=['POST'])
def add_comment(announcement_id):
    """Dodaje komentarz do ogłoszenia"""
    try:
        data = request.get_json()
        
        if not data or not data.get('komentarz') or not data.get('autor'):
            return jsonify({
                'success': False,
                'message': 'Komentarz i autor są wymagane'
            }), 400
        
        conn = get_db_connection()
        
        # Sprawdź czy ogłoszenie istnieje
        announcement = conn.execute(
            'SELECT id FROM ogloszenia WHERE id = ? AND aktywne = 1', 
            (announcement_id,)
        ).fetchone()
        
        if not announcement:
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Ogłoszenie nie istnieje'
            }), 404
        
        # Dodaj komentarz
        query = '''
            INSERT INTO ogloszenia_komentarze (ogloszenie_id, autor, komentarz)
            VALUES (?, ?, ?)
        '''
        
        cursor = conn.execute(query, (
            announcement_id,
            data['autor'],
            data['komentarz']
        ))
        
        comment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Komentarz dodany pomyślnie',
            'data': {'id': comment_id}
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd dodawania komentarza: {str(e)}'
        }), 500

@announcements_bp.route('/api/announcements/<int:announcement_id>', methods=['DELETE'])
def delete_announcement(announcement_id):
    """Usuwa ogłoszenie (tylko admin)"""
    try:
        conn = get_db_connection()
        
        # Sprawdź czy ogłoszenie istnieje
        announcement = conn.execute(
            'SELECT id FROM ogloszenia WHERE id = ?', 
            (announcement_id,)
        ).fetchone()
        
        if not announcement:
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Ogłoszenie nie istnieje'
            }), 404
        
        # Oznacz jako nieaktywne zamiast usuwać
        conn.execute(
            'UPDATE ogloszenia SET aktywne = 0 WHERE id = ?',
            (announcement_id,)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ogłoszenie usunięte pomyślnie'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Błąd usuwania ogłoszenia: {str(e)}'
        }), 500
