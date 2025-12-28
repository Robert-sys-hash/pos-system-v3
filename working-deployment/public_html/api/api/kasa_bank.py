"""
API modułu Kasa/Bank - zarządzanie operacjami kasowymi i bankowymi
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
import sqlite3
import os
import sys

# Dodaj ścieżki do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

# Import funkcji bazy danych
from utils.database import get_db_connection, execute_query, execute_insert, success_response, error_response, not_found_response

kasa_bank_bp = Blueprint('kasa_bank', __name__)

class KasaBankManager:
    def get_connection(self):
        """Połączenie z bazą danych"""
        return get_db_connection()
    
    def get_saldo(self):
        """Pobierz aktualne salda kont"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    typ_platnosci,
                    SUM(CASE 
                        WHEN typ_operacji = 'KP' THEN kwota 
                        WHEN typ_operacji = 'KW' THEN -kwota 
                        ELSE 0 
                    END) as saldo
                FROM kasa_operacje 
                GROUP BY typ_platnosci
                ORDER BY typ_platnosci
            """)
            
            salda = cursor.fetchall()
            result = {}
            for row in salda:
                result[row['typ_platnosci']] = float(row['saldo'] or 0)
            
            # Dodaj domyślne konta jeśli nie istnieją
            default_accounts = ['gotowka', 'karta', 'blik', 'przelew']
            for account in default_accounts:
                if account not in result:
                    result[account] = 0.0
                    
            return result
            
        finally:
            conn.close()
    
    def get_operacje(self, limit=50, offset=0, date_from=None, date_to=None, typ_platnosci=None, location_id=None):
        """Pobierz operacje finansowe z filtrowaniem według lokalizacji"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    id,
                    data_operacji,
                    typ_operacji,
                    typ_platnosci,
                    kwota,
                    opis,
                    kategoria,
                    numer_dokumentu,
                    kontrahent,
                    data_utworzenia,
                    utworzyl,
                    uwagi,
                    location_id
                FROM kasa_operacje
                WHERE 1=1
            """
            
            params = []
            
            if date_from:
                query += " AND date(data_operacji) >= ?"
                params.append(date_from)
                
            if date_to:
                query += " AND date(data_operacji) <= ?"
                params.append(date_to)
                
            if typ_platnosci:
                query += " AND typ_platnosci = ?"
                params.append(typ_platnosci)
                
            if location_id:
                query += " AND location_id = ?"
                params.append(location_id)
            
            query += " ORDER BY data_operacji DESC, id DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            operacje = cursor.fetchall()
            
            return [dict(row) for row in operacje]
            
        finally:
            conn.close()
    
    def create_operacja(self, data):
        """Utwórz nową operację finansową"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO kasa_operacje 
                (typ_operacji, typ_platnosci, kwota, opis, kategoria, 
                 numer_dokumentu, kontrahent, data_operacji, utworzyl, uwagi)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('typ_operacji', 'KP'),
                data.get('typ_platnosci', 'gotowka'),
                data.get('kwota'),
                data.get('opis', ''),
                data.get('kategoria', 'inne'),
                data.get('numer_dokumentu', ''),
                data.get('kontrahent', ''),
                data.get('data_operacji', datetime.now().date().isoformat()),
                data.get('utworzyl', 'admin'),
                data.get('uwagi', '')
            ))
            
            operacja_id = cursor.lastrowid
            conn.commit()
            
            return operacja_id
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def update_operacja(self, operacja_id, data):
        """Aktualizuj operację finansową"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE kasa_operacje 
                SET typ_operacji = ?, typ_platnosci = ?, kwota = ?, 
                    opis = ?, kategoria = ?, uwagi = ?, 
                    numer_dokumentu = ?, kontrahent = ?, data_operacji = ?
                WHERE id = ?
            """, (
                data.get('typ_operacji'),
                data.get('typ_platnosci'),
                data.get('kwota'),
                data.get('opis', ''),
                data.get('kategoria', 'inne'),
                data.get('uwagi', ''),
                data.get('numer_dokumentu', ''),
                data.get('kontrahent', ''),
                data.get('data_operacji'),
                operacja_id
            ))
            
            conn.commit()
            return cursor.rowcount > 0
            
        finally:
            conn.close()
    
    def get_kategorie(self):
        """Pobierz kategorie operacji"""
        return [
            'wpłata',
            'wypłata', 
            'sprzedaż',
            'zakup',
            'przelew',
            'opłata',
            'prowizja',
            'korekta',
            'inne'
        ]
    
    def get_daily_summary(self, target_date=None):
        """Podsumowanie dzienne operacji"""
        if not target_date:
            target_date = date.today().isoformat()
            
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Wpływy i wydatki dzienne
            cursor.execute("""
                SELECT 
                    typ_platnosci,
                    typ_operacji,
                    SUM(kwota) as suma
                FROM kasa_operacje 
                WHERE date(data_operacji) = ? 
                GROUP BY typ_platnosci, typ_operacji
            """, (target_date,))
            
            summary = cursor.fetchall()
            
            result = {
                'date': target_date,
                'accounts': {},
                'total_income': 0,
                'total_expense': 0
            }
            
            for row in summary:
                account = row['typ_platnosci']
                operation = row['typ_operacji']
                amount = float(row['suma'])
                
                if account not in result['accounts']:
                    result['accounts'][account] = {'income': 0, 'expense': 0}
                
                if operation == 'KP':  # Kasa Przyjmie
                    result['accounts'][account]['income'] += amount
                    result['total_income'] += amount
                else:  # KW - Kasa Wydaje
                    result['accounts'][account]['expense'] += amount
                    result['total_expense'] += amount
            
            return result
            
        finally:
            conn.close()
    
    def get_monthly_stats(self, year=None, month=None):
        """Statystyki miesięczne"""
        if not year:
            year = date.today().year
        if not month:
            month = date.today().month
            
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Statystyki miesięczne
            cursor.execute("""
                SELECT 
                    strftime('%d', data_operacji) as day,
                    typ_operacji,
                    SUM(kwota) as suma
                FROM kasa_operacje 
                WHERE strftime('%Y', data_operacji) = ? 
                AND strftime('%m', data_operacji) = ?
                GROUP BY strftime('%d', data_operacji), typ_operacji
                ORDER BY day
            """, (str(year), str(month).zfill(2)))
            
            monthly_data = cursor.fetchall()
            
            # Organizuj dane
            result = {
                'year': year,
                'month': month,
                'daily_data': {},
                'total_income': 0,
                'total_expense': 0
            }
            
            for row in monthly_data:
                day = row['day']
                operation = row['typ_operacji']
                amount = float(row['suma'])
                
                if day not in result['daily_data']:
                    result['daily_data'][day] = {'income': 0, 'expense': 0}
                
                if operation == 'KP':  # Kasa Przyjmie
                    result['daily_data'][day]['income'] += amount
                    result['total_income'] += amount
                else:  # KW - Kasa Wydaje
                    result['daily_data'][day]['expense'] += amount
                    result['total_expense'] += amount
            
            return result
            
        finally:
            conn.close()
    
    def get_payments_by_type(self, date_from=None, date_to=None):
        """Pobierz płatności pogrupowane według typu"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    typ_platnosci,
                    typ_operacji,
                    COUNT(*) as liczba_operacji,
                    SUM(kwota) as suma_kwota,
                    AVG(kwota) as srednia_kwota
                FROM kasa_operacje
                WHERE 1=1
            """
            
            params = []
            
            if date_from:
                query += " AND date(data_operacji) >= ?"
                params.append(date_from)
                
            if date_to:
                query += " AND date(data_operacji) <= ?"
                params.append(date_to)
            
            query += """
                GROUP BY typ_platnosci, typ_operacji
                ORDER BY typ_platnosci, typ_operacji
            """
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # Grupuj dane według typu płatności
            result = {}
            
            for row in rows:
                typ_platnosci = row['typ_platnosci']
                typ_operacji = row['typ_operacji']
                
                if typ_platnosci not in result:
                    result[typ_platnosci] = {
                        'kp': {'liczba': 0, 'suma': 0, 'srednia': 0},
                        'kw': {'liczba': 0, 'suma': 0, 'srednia': 0},
                        'saldo': 0
                    }
                
                op_key = 'kp' if typ_operacji == 'KP' else 'kw'
                result[typ_platnosci][op_key] = {
                    'liczba': int(row['liczba_operacji']),
                    'suma': float(row['suma_kwota']),
                    'srednia': float(row['srednia_kwota'])
                }
                
                # Oblicz saldo (KP to przychód, KW to rozchód)
                if typ_operacji == 'KP':
                    result[typ_platnosci]['saldo'] += float(row['suma_kwota'])
                else:
                    result[typ_platnosci]['saldo'] -= float(row['suma_kwota'])
            
            return result
            
        finally:
            conn.close()
    
    def get_kp_documents(self, limit=50, offset=0, date_from=None, date_to=None):
        """Pobierz dokumenty KP (Kasa Przyjmie)"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    id,
                    data_operacji,
                    typ_platnosci,
                    kwota,
                    opis,
                    kategoria,
                    numer_dokumentu,
                    kontrahent,
                    data_utworzenia,
                    utworzyl,
                    uwagi
                FROM kasa_operacje
                WHERE typ_operacji = 'KP'
            """
            
            params = []
            
            if date_from:
                query += " AND date(data_operacji) >= ?"
                params.append(date_from)
                
            if date_to:
                query += " AND date(data_operacji) <= ?"
                params.append(date_to)
            
            query += " ORDER BY data_operacji DESC, id DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            operacje = []
            for row in rows:
                operacje.append({
                    'id': row['id'],
                    'data_operacji': row['data_operacji'],
                    'typ_platnosci': row['typ_platnosci'],
                    'kwota': float(row['kwota']),
                    'opis': row['opis'],
                    'kategoria': row['kategoria'],
                    'numer_dokumentu': row['numer_dokumentu'],
                    'kontrahent': row['kontrahent'],
                    'data_utworzenia': row['data_utworzenia'],
                    'utworzyl': row['utworzyl'],
                    'uwagi': row['uwagi']
                })
            
            return operacje
            
        finally:
            conn.close()
    
    def get_kw_documents(self, limit=50, offset=0, date_from=None, date_to=None):
        """Pobierz dokumenty KW (Kasa Wydaje)"""
        conn = self.get_connection()
        try:
            query = """
                SELECT 
                    id,
                    data_operacji,
                    typ_platnosci,
                    kwota,
                    opis,
                    kategoria,
                    numer_dokumentu,
                    kontrahent,
                    data_utworzenia,
                    utworzyl,
                    uwagi
                FROM kasa_operacje
                WHERE typ_operacji = 'KW'
            """
            
            params = []
            
            if date_from:
                query += " AND date(data_operacji) >= ?"
                params.append(date_from)
                
            if date_to:
                query += " AND date(data_operacji) <= ?"
                params.append(date_to)
            
            query += " ORDER BY data_operacji DESC, id DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            operacje = []
            for row in rows:
                operacje.append({
                    'id': row['id'],
                    'data_operacji': row['data_operacji'],
                    'typ_platnosci': row['typ_platnosci'],
                    'kwota': float(row['kwota']),
                    'opis': row['opis'],
                    'kategoria': row['kategoria'],
                    'numer_dokumentu': row['numer_dokumentu'],
                    'kontrahent': row['kontrahent'],
                    'data_utworzenia': row['data_utworzenia'],
                    'utworzyl': row['utworzyl'],
                    'uwagi': row['uwagi']
                })
            
            return operacje
            
        finally:
            conn.close()

# Inicjalizacja managera
kasa_bank_manager = KasaBankManager()

@kasa_bank_bp.route('/saldo')
def get_saldo():
    """Pobierz aktualne salda"""
    try:
        salda = kasa_bank_manager.get_saldo()
        return success_response(salda, "Salda pobrane pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania salda: {e}")
        return error_response(f'Błąd pobierania salda: {str(e)}', 500)

@kasa_bank_bp.route('/operacje')
def get_operacje():
    """Pobierz operacje finansowe z filtrowaniem według lokalizacji"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        typ_platnosci = request.args.get('typ_platnosci')
        location_id = request.args.get('location_id', type=int)
        
        operacje = kasa_bank_manager.get_operacje(
            limit=limit,
            offset=offset,
            date_from=date_from,
            date_to=date_to,
            typ_platnosci=typ_platnosci,
            location_id=location_id
        )
        
        return success_response({
            'operacje': operacje,
            'count': len(operacje)
        }, "Operacje pobrane pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania operacji: {e}")
        return error_response(f'Błąd pobierania operacji: {str(e)}', 500)

@kasa_bank_bp.route('/operacje', methods=['POST'])
def create_operacja():
    """Utwórz nową operację finansową"""
    try:
        data = request.get_json()
        
        # Walidacja danych
        required_fields = ['typ_operacji', 'typ_platnosci', 'kwota']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Brak wymaganego pola: {field}'
                }), 400
        
        if data['kwota'] == 0:
            return jsonify({
                'success': False,
                'error': 'Kwota nie może być równa 0'
            }), 400
        
        if data['typ_operacji'] not in ['KP', 'KW']:
            return jsonify({
                'success': False,
                'error': 'Typ operacji musi być KP (Kasa Przyjmie) lub KW (Kasa Wydaje)'
            }), 400
        
        operacja_id = kasa_bank_manager.create_operacja(data)
        
        return jsonify({
            'success': True,
            'message': 'Operacja została utworzona',
            'id': operacja_id
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd tworzenia operacji: {str(e)}'
        }), 500

@kasa_bank_bp.route('/operacje/<int:operacja_id>', methods=['PUT'])
def update_operacja(operacja_id):
    """Aktualizuj operację"""
    try:
        data = request.get_json()
        
        success = kasa_bank_manager.update_operacja(operacja_id, data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Operacja została zaktualizowana'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Operacja nie została znaleziona'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd aktualizacji operacji: {str(e)}'
        }), 500

@kasa_bank_bp.route('/kategorie')
def get_kategorie():
    """Pobierz kategorie operacji"""
    try:
        kategorie = kasa_bank_manager.get_kategorie()
        
        return jsonify({
            'success': True,
            'data': kategorie
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania kategorii: {str(e)}'
        }), 500

@kasa_bank_bp.route('/summary/daily')
def get_daily_summary():
    """Podsumowanie dzienne"""
    try:
        target_date = request.args.get('date')
        summary = kasa_bank_manager.get_daily_summary(target_date)
        
        return jsonify({
            'success': True,
            'data': summary
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania podsumowania: {str(e)}'
        }), 500

@kasa_bank_bp.route('/stats/monthly')
def get_monthly_stats():
    """Statystyki miesięczne"""
    try:
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        
        stats = kasa_bank_manager.get_monthly_stats(year, month)
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania statystyk: {str(e)}'
        }), 500

@kasa_bank_bp.route('/payments/by-type')
def get_payments_by_type():
    """Płatności pogrupowane według typu"""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        payments = kasa_bank_manager.get_payments_by_type(date_from, date_to)
        
        return jsonify({
            'success': True,
            'data': payments
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania płatności według typu: {str(e)}'
        }), 500

@kasa_bank_bp.route('/documents/kp')
def get_kp_documents():
    """Dokumenty KP (Kasa Przyjmie)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        documents = kasa_bank_manager.get_kp_documents(limit, offset, date_from, date_to)
        
        return jsonify({
            'success': True,
            'data': documents,
            'count': len(documents)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania dokumentów KP: {str(e)}'
        }), 500

@kasa_bank_bp.route('/documents/kw')
def get_kw_documents():
    """Dokumenty KW (Kasa Wydaje)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        documents = kasa_bank_manager.get_kw_documents(limit, offset, date_from, date_to)
        
        return jsonify({
            'success': True,
            'data': documents,
            'count': len(documents)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania dokumentów KW: {str(e)}'
        }), 500

@kasa_bank_bp.route('/health')
def health_check():
    """Sprawdzenie stanu modułu"""
    return jsonify({
        'module': 'kasa_bank',
        'status': 'OK',
        'timestamp': datetime.now().isoformat()
    })
