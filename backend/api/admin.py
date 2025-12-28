"""
API endpoint dla administracji systemu
Zarządzanie użytkownikami, ustawienia systemowe, logi
"""

from flask import Blueprint, request, jsonify
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime, date
import json

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/users', methods=['GET'])
def get_users():
    """
    Lista użytkowników systemu
    """
    try:
        users_sql = """
        SELECT 
            id,
            login,
            login as username,
            typ as role,
            1 as active,
            datetime('now') as last_login,
            datetime('now') as created_at,
            'online' as status
        FROM users
        ORDER BY id DESC
        """
        
        results = execute_query(users_sql)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'users': results,
            'total': len(results)
        }, f"Znaleziono {len(results)} użytkowników")
        
    except Exception as e:
        print(f"Błąd pobierania użytkowników: {e}")
        return error_response("Wystąpił błąd podczas pobierania użytkowników", 500)

@admin_bp.route('/admin/users', methods=['POST'])
def create_user():
    """
    Dodaj nowego użytkownika
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('login'):
            return error_response("Login jest wymagany", 400)
            
        login = data.get('login', '').strip()
        haslo = data.get('haslo', '').strip()
        typ = data.get('typ', 'kasjer').strip()
        
        if not login:
            return error_response("Login nie może być pusty", 400)
            
        if not haslo:
            return error_response("Hasło jest wymagane", 400)
            
        # Sprawdź czy użytkownik już istnieje
        check_query = "SELECT id FROM users WHERE login = ?"
        existing = execute_query(check_query, [login])
        
        if existing:
            return error_response("Użytkownik o tym loginie już istnieje", 409)
            
        # Utwórz nowego użytkownika
        insert_query = """
        INSERT INTO users (login, haslo, typ)
        VALUES (?, ?, ?)
        """
        
        result = execute_insert(insert_query, [login, haslo, typ])
        
        if result:
            # Pobierz utworzonego użytkownika
            get_query = """
            SELECT 
                id,
                login,
                login as username,
                typ as role,
                1 as active,
                datetime('now') as created_at
            FROM users 
            WHERE id = ?
            """
            
            user = execute_query(get_query, [result])
            
            return success_response({
                'user': user[0] if user else None
            }, "Użytkownik został utworzony pomyślnie", 201)
        else:
            return error_response("Nie udało się utworzyć użytkownika", 500)
            
    except Exception as e:
        print(f"Błąd tworzenia użytkownika: {e}")
        return error_response("Wystąpił błąd podczas tworzenia użytkownika", 500)

@admin_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """
    Aktualizuj użytkownika
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych do aktualizacji", 400)
            
        # Sprawdź czy użytkownik istnieje
        check_query = "SELECT id FROM users WHERE id = ?"
        existing = execute_query(check_query, [user_id])
        
        if not existing:
            return not_found_response("Użytkownik nie został znaleziony")
            
        login = data.get('login', '').strip()
        haslo = data.get('haslo', '').strip()
        typ = data.get('typ', '').strip()
        
        if not login:
            return error_response("Login nie może być pusty", 400)
            
        # Sprawdź czy nowy login nie koliduje z innym użytkownikiem
        if login:
            collision_query = "SELECT id FROM users WHERE login = ? AND id != ?"
            collision = execute_query(collision_query, [login, user_id])
            
            if collision:
                return error_response("Użytkownik o tym loginie już istnieje", 409)
        
        # Aktualizuj użytkownika
        if haslo:  # Jeśli podano nowe hasło
            update_query = """
            UPDATE users 
            SET login = ?, haslo = ?, typ = ?
            WHERE id = ?
            """
            execute_insert(update_query, [login, haslo, typ, user_id])
        else:  # Jeśli nie zmienia hasła
            update_query = """
            UPDATE users 
            SET login = ?, typ = ?
            WHERE id = ?
            """
            execute_insert(update_query, [login, typ, user_id])
        
        # Pobierz zaktualizowanego użytkownika
        get_query = """
        SELECT 
            id,
            login,
            login as username,
            typ as role,
            1 as active,
            datetime('now') as updated_at
        FROM users 
        WHERE id = ?
        """
        
        user = execute_query(get_query, [user_id])
        
        return success_response({
            'user': user[0] if user else None
        }, "Użytkownik został zaktualizowany pomyślnie")
        
    except Exception as e:
        print(f"Błąd aktualizacji użytkownika: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji użytkownika", 500)

@admin_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """
    Usuń użytkownika
    """
    try:
        # Sprawdź czy użytkownik istnieje
        check_query = "SELECT id, login FROM users WHERE id = ?"
        existing = execute_query(check_query, [user_id])
        
        if not existing:
            return not_found_response("Użytkownik nie został znaleziony")
            
        # Usuń użytkownika
        delete_query = "DELETE FROM users WHERE id = ?"
        execute_insert(delete_query, [user_id])
        
        return success_response(None, f"Użytkownik '{existing[0]['login']}' został usunięty pomyślnie")
        
    except Exception as e:
        print(f"Błąd usuwania użytkownika: {e}")
        return error_response("Wystąpił błąd podczas usuwania użytkownika", 500)

@admin_bp.route('/admin/stats', methods=['GET'])
def get_admin_stats():
    """
    Statystyki administracyjne systemu
    """
    try:
        # Statystyki użytkowników
        users_stats_sql = """
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN aktywny = 1 THEN 1 END) as active_users,
            COUNT(CASE WHEN ostatnie_logowanie > datetime('now', '-1 day') THEN 1 END) as daily_active,
            COUNT(CASE WHEN ostatnie_logowanie > datetime('now', '-7 days') THEN 1 END) as weekly_active
        FROM users
        """
        
        users_result = execute_query(users_stats_sql)
        users_stats = users_result[0] if users_result else {}
        
        # Statystyki systemu
        system_stats_sql = """
        SELECT 
            (SELECT COUNT(*) FROM produkty) as total_products,
            (SELECT COUNT(*) FROM pos_klienci) as total_customers,
            (SELECT COUNT(*) FROM pos_transakcje) as total_transactions,
            (SELECT COUNT(*) FROM faktury_zakupowe) as total_invoices
        """
        
        system_result = execute_query(system_stats_sql)
        system_stats = system_result[0] if system_result else {}
        
        # Statystyki aktywności (ostatnie 7 dni)
        activity_sql = """
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as transactions_count,
            COALESCE(SUM(suma_brutto), 0) as daily_revenue
        FROM pos_transakcje
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        """
        
        activity_result = execute_query(activity_sql)
        
        stats = {
            'users': users_stats,
            'system': system_stats,
            'activity': activity_result or [],
            'generated_at': datetime.now().isoformat()
        }
        
        return success_response(stats, "Statystyki administracyjne")
        
    except Exception as e:
        print(f"Błąd pobierania statystyk admin: {e}")
        return error_response("Wystąpił błąd podczas pobierania statystyk", 500)

@admin_bp.route('/admin/system-info', methods=['GET'])
def get_system_info():
    """
    Informacje o systemie - wersja, konfiguracja, status
    """
    try:
        # Sprawdź tabele w bazie
        tables_sql = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        tables_result = execute_query(tables_sql)
        tables = [row['name'] for row in tables_result] if tables_result else []
        
        # Informacje o systemie
        system_info = {
            'version': '3.0.0',
            'environment': 'development',
            'database': {
                'type': 'SQLite',
                'tables_count': len(tables),
                'tables': tables[:10]  # Pierwszych 10 tabel
            },
            'modules': {
                'products': True,
                'customers': True,
                'pos': True,
                'shifts': True,
                'auth': True,
                'coupons': True,
                'invoices': True,
                'admin': True
            },
            'api_endpoints': [
                '/api/health',
                '/api/products/search',
                '/api/customers/search',
                '/api/pos/stats',
                '/api/invoices/search',
                '/api/admin/stats'
            ]
        }
        
        return success_response(system_info, "Informacje o systemie")
        
    except Exception as e:
        print(f"Błąd pobierania informacji o systemie: {e}")
        return error_response("Wystąpił błąd podczas pobierania informacji", 500)

@admin_bp.route('/admin/logs', methods=['GET'])
def get_system_logs():
    """
    Logi systemowe (jeśli tabela istnieje)
    """
    try:
        limit = int(request.args.get('limit', 50))
        log_type = request.args.get('type', '').strip()
        
        # Sprawdź czy tabela logów istnieje
        check_table_sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='error_logs'"
        table_exists = execute_query(check_table_sql)
        
        if not table_exists:
            return success_response({
                'logs': [],
                'total': 0,
                'message': 'Tabela logów nie istnieje'
            }, "Brak logów systemowych")
        
        # Pobierz logi
        logs_sql = """
        SELECT 
            id,
            timestamp,
            level,
            message,
            module,
            user_id
        FROM error_logs
        """
        
        params = []
        if log_type:
            logs_sql += " WHERE level = ?"
            params.append(log_type)
            
        logs_sql += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        results = execute_query(logs_sql, params)
        
        return success_response({
            'logs': results or [],
            'total': len(results) if results else 0,
            'types': ['error', 'warning', 'info', 'debug']
        }, f"Pobrano {len(results) if results else 0} logów")
        
    except ValueError:
        return error_response("Parametr 'limit' musi być liczbą", 400)
    except Exception as e:
        print(f"Błąd pobierania logów: {e}")
        return error_response("Wystąpił błąd podczas pobierania logów", 500)

@admin_bp.route('/admin/settings', methods=['GET'])
def get_system_settings():
    """
    Ustawienia systemowe
    """
    try:
        settings_sql = """
        SELECT 
            klucz as key,
            wartosc as value,
            opis as description,
            typ as type,
            updated_at
        FROM ustawienia_systemu
        ORDER BY klucz
        """
        
        results = execute_query(settings_sql)
        
        if results is None:
            # Jeśli tabela nie istnieje, zwróć domyślne ustawienia
            default_settings = [
                {
                    'key': 'company_name',
                    'value': 'POS System V3',
                    'description': 'Nazwa firmy',
                    'type': 'string'
                },
                {
                    'key': 'currency',
                    'value': 'PLN',
                    'description': 'Waluta systemu',
                    'type': 'string'
                },
                {
                    'key': 'tax_rate',
                    'value': '23',
                    'description': 'Domyślna stawka VAT (%)',
                    'type': 'number'
                }
            ]
            
            return success_response({
                'settings': default_settings,
                'total': len(default_settings),
                'source': 'default'
            }, "Ustawienia domyślne")
            
        return success_response({
            'settings': results,
            'total': len(results),
            'source': 'database'
        }, f"Pobrano {len(results)} ustawień")
        
    except Exception as e:
        print(f"Błąd pobierania ustawień: {e}")
        return error_response("Wystąpił błąd podczas pobierania ustawień", 500)

# === ZARZĄDZANIE STAWKAMI VAT ===

@admin_bp.route('/admin/vat-rates', methods=['GET'])
def get_vat_rates():
    """API - pobierz wszystkie stawki VAT"""
    try:
        rates_sql = """
            SELECT id, name, rate, description, is_active
            FROM vat_rates 
            WHERE is_active = 1
            ORDER BY rate ASC
        """
        
        results = execute_query(rates_sql)
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        rates_list = []
        for rate in results:
            rates_list.append({
                'id': rate['id'],
                'name': rate['name'],
                'rate': rate['rate'],
                'description': rate['description'],
                'is_active': rate['is_active']
            })
        
        return success_response({
            'rates': rates_list,
            'total': len(rates_list)
        }, f"Pobrano {len(rates_list)} stawek VAT")
        
    except Exception as e:
        print(f"Błąd pobierania stawek VAT: {e}")
        return error_response("Wystąpił błąd podczas pobierania stawek VAT", 500)

@admin_bp.route('/admin/vat-rates', methods=['POST'])
def create_vat_rate():
    """API - dodaj nową stawkę VAT"""
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ['name', 'rate']):
            return error_response('Wymagane pola: name, rate', 400)
            
        name = data['name'].strip()
        rate = float(data['rate'])
        description = data.get('description', '').strip()
        
        # Walidacja
        if not name:
            return error_response('Nazwa stawki VAT jest wymagana', 400)
            
        if rate < 0 or rate > 100:
            return error_response('Stawka VAT musi być między 0 a 100%', 400)
        
        # Sprawdź unikalność nazwy
        check_sql = "SELECT id FROM vat_rates WHERE name = ?"
        existing = execute_query(check_sql, (name,))
        if existing:
            return error_response('Stawka VAT o tej nazwie już istnieje', 400)
        
        # Dodaj nową stawkę
        insert_sql = """
            INSERT INTO vat_rates (name, rate, description)
            VALUES (?, ?, ?)
        """
        
        success = execute_insert(insert_sql, (name, rate, description))
        
        if success:
            return success_response({
                'message': 'Stawka VAT została dodana'
            }, 'Stawka VAT została dodana pomyślnie')
        else:
            return error_response('Błąd dodawania stawki VAT', 500)
        
    except ValueError:
        return error_response('Stawka musi być liczbą', 400)
    except Exception as e:
        print(f"Błąd tworzenia stawki VAT: {e}")
        return error_response("Wystąpił błąd podczas tworzenia stawki VAT", 500)

@admin_bp.route('/admin/vat-rates/<int:rate_id>', methods=['PUT'])
def update_vat_rate(rate_id):
    """API - aktualizuj stawkę VAT"""
    try:
        data = request.get_json()
        
        if not data:
            return error_response('Brak danych do aktualizacji', 400)
        
        # Sprawdź czy stawka istnieje
        check_sql = "SELECT id FROM vat_rates WHERE id = ?"
        existing = execute_query(check_sql, (rate_id,))
        if not existing:
            return not_found_response('Stawka VAT nie została znaleziona')
        
        # Przygotuj dane do aktualizacji
        update_fields = []
        params = []
        
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return error_response('Nazwa stawki VAT nie może być pusta', 400)
                
            # Sprawdź unikalność nazwy
            name_check_sql = "SELECT id FROM vat_rates WHERE name = ? AND id != ?"
            name_exists = execute_query(name_check_sql, (name, rate_id))
            if name_exists:
                return error_response('Stawka VAT o tej nazwie już istnieje', 400)
                
            update_fields.append("name = ?")
            params.append(name)
        
        if 'rate' in data:
            rate = float(data['rate'])
            if rate < 0 or rate > 100:
                return error_response('Stawka VAT musi być między 0 a 100%', 400)
                
            update_fields.append("rate = ?")
            params.append(rate)
        
        if 'description' in data:
            update_fields.append("description = ?")
            params.append(data['description'].strip())
        
        if 'is_active' in data:
            update_fields.append("is_active = ?")
            params.append(1 if data['is_active'] else 0)
        
        if update_fields:
            update_fields.append("updated_at = datetime('now')")
            params.append(rate_id)
            
            sql = f"UPDATE vat_rates SET {', '.join(update_fields)} WHERE id = ?"
            success = execute_insert(sql, params)
            
            if success:
                return success_response({
                    'message': 'Stawka VAT została zaktualizowana'
                }, 'Stawka VAT została zaktualizowana pomyślnie')
            else:
                return error_response('Błąd aktualizacji stawki VAT', 500)
        
        return success_response({
            'message': 'Brak zmian do zapisania'
        }, 'Brak zmian do zapisania')
        
    except ValueError:
        return error_response('Stawka musi być liczbą', 400)
    except Exception as e:
        print(f"Błąd aktualizacji stawki VAT: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji stawki VAT", 500)

@admin_bp.route('/admin/vat-rates/<int:rate_id>', methods=['DELETE'])
def delete_vat_rate(rate_id):
    """API - usuń stawkę VAT (tylko dezaktywacja)"""
    try:
        # Sprawdź czy stawka istnieje
        check_sql = "SELECT id FROM vat_rates WHERE id = ?"
        existing = execute_query(check_sql, (rate_id,))
        if not existing:
            return not_found_response('Stawka VAT nie została znaleziona')
        
        # Sprawdź czy stawka jest używana przez produkty
        products_sql = "SELECT COUNT(*) FROM produkty WHERE stawka_vat = (SELECT rate FROM vat_rates WHERE id = ?)"
        count_result = execute_query(products_sql, (rate_id,))
        count = count_result[0]['COUNT(*)'] if count_result and count_result[0] else 0
        
        if count > 0:
            # Tylko dezaktywuj, nie usuwaj
            update_sql = "UPDATE vat_rates SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
            success = execute_insert(update_sql, (rate_id,))
            message = f'stawka VAT została dezaktywowana (używana przez {count} produktów)'
        else:
            # Można bezpiecznie usunąć
            delete_sql = "DELETE FROM vat_rates WHERE id = ?"
            success = execute_insert(delete_sql, (rate_id,))
            message = 'Stawka VAT została usunięta'
        
        if success:
            return success_response({
                'message': message
            }, message)
        else:
            return error_response('Błąd usuwania stawki VAT', 500)
        
    except Exception as e:
        print(f"Błąd usuwania stawki VAT: {e}")
        return error_response("Wystąpił błąd podczas usuwania stawki VAT", 500)

@admin_bp.route('/admin/backup', methods=['POST'])
def backup_database():
    """
    Tworzenie kopii zapasowej bazy danych
    """
    try:
        import shutil
        import os
        from datetime import datetime
        
        # Ścieżka do głównej bazy danych
        db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'kupony.db')
        db_path = os.path.abspath(db_path)
        
        if not os.path.exists(db_path):
            return error_response("Plik bazy danych nie został znaleziony", 404)
        
        # Nazwa pliku backup z timestampem
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'kupony_backup_{timestamp}.db'
        backup_path = os.path.join(os.path.dirname(db_path), backup_filename)
        
        # Kopiuj bazę danych
        shutil.copy2(db_path, backup_path)
        
        # Sprawdź czy kopia została utworzona
        if os.path.exists(backup_path):
            file_size = os.path.getsize(backup_path)
            return success_response({
                'backup_filename': backup_filename,
                'backup_path': backup_path,
                'file_size': file_size,
                'created_at': datetime.now().isoformat()
            }, f"Kopia zapasowa utworzona: {backup_filename}")
        else:
            return error_response("Nie udało się utworzyć kopii zapasowej", 500)
        
    except Exception as e:
        print(f"Błąd tworzenia kopii zapasowej: {e}")
        return error_response(f"Błąd tworzenia kopii zapasowej: {str(e)}", 500)

@admin_bp.route('/admin/export', methods=['POST'])
def export_data():
    """
    Eksport danych systemu w formacie JSON
    """
    try:
        export_data = {}
        
        # Eksportuj główne tabele
        tables_to_export = [
            'produkty',
            'pos_transakcje', 
            'pos_pozycje',
            'users',
            'kategorie',
            'klienci',
            'rabaty'
        ]
        
        for table in tables_to_export:
            try:
                # Sprawdź czy tabela istnieje
                check_sql = f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'"
                table_exists = execute_query(check_sql)
                
                if table_exists:
                    # Eksportuj dane z tabeli
                    data_sql = f"SELECT * FROM {table} LIMIT 1000"  # Limit dla bezpieczeństwa
                    table_data = execute_query(data_sql)
                    export_data[table] = table_data or []
                else:
                    export_data[table] = []
                    
            except Exception as table_error:
                print(f"Błąd eksportu tabeli {table}: {table_error}")
                export_data[table] = []
        
        # Dodaj metadane eksportu
        export_data['_metadata'] = {
            'export_date': datetime.now().isoformat(),
            'system_version': '3.0.0',
            'exported_tables': list(export_data.keys())
        }
        
        return success_response({
            'export_data': export_data,
            'tables_exported': len([t for t in tables_to_export if export_data.get(t)]),
            'total_records': sum(len(export_data.get(t, [])) for t in tables_to_export)
        }, "Dane zostały wyeksportowane pomyślnie")
        
    except Exception as e:
        print(f"Błąd eksportu danych: {e}")
        return error_response(f"Błąd eksportu danych: {str(e)}", 500)

@admin_bp.route('/admin/backup/scheduler/status', methods=['GET'])
def get_backup_scheduler_status():
    """
    Status schedulera automatycznych backupów
    """
    try:
        from utils.scheduler import auto_backup_scheduler
        
        status = auto_backup_scheduler.get_scheduler_status()
        
        return success_response(status, "Status schedulera pobrany pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania statusu schedulera: {e}")
        return error_response(f"Błąd pobierania statusu schedulera: {str(e)}", 500)

@admin_bp.route('/admin/backup/scheduler/start', methods=['POST'])
def start_backup_scheduler():
    """
    Uruchomienie schedulera automatycznych backupów
    """
    try:
        from utils.scheduler import auto_backup_scheduler
        
        auto_backup_scheduler.start_scheduler()
        
        return success_response({
            'status': 'started',
            'message': 'Scheduler automatycznych backupów uruchomiony'
        }, "Scheduler uruchomiony pomyślnie")
        
    except Exception as e:
        print(f"Błąd uruchamiania schedulera: {e}")
        return error_response(f"Błąd uruchamiania schedulera: {str(e)}", 500)

@admin_bp.route('/admin/backup/scheduler/stop', methods=['POST'])
def stop_backup_scheduler():
    """
    Zatrzymanie schedulera automatycznych backupów
    """
    try:
        from utils.scheduler import auto_backup_scheduler
        
        auto_backup_scheduler.stop_scheduler()
        
        return success_response({
            'status': 'stopped',
            'message': 'Scheduler automatycznych backupów zatrzymany'
        }, "Scheduler zatrzymany pomyślnie")
        
    except Exception as e:
        print(f"Błąd zatrzymywania schedulera: {e}")
        return error_response(f"Błąd zatrzymywania schedulera: {str(e)}", 500)

@admin_bp.route('/admin/backup/manual', methods=['POST'])
def trigger_manual_backup():
    """
    Ręczne uruchomienie backupu (do testów)
    """
    try:
        from utils.scheduler import auto_backup_scheduler
        
        result = auto_backup_scheduler.trigger_manual_backup()
        
        if result.get('success'):
            return success_response(result, "Backup wykonany pomyślnie")
        else:
            return error_response(result.get('error', 'Nieznany błąd'), 500)
        
    except Exception as e:
        print(f"Błąd ręcznego backupu: {e}")
        return error_response(f"Błąd ręcznego backupu: {str(e)}", 500)

@admin_bp.route('/admin/backup/list', methods=['GET'])
def list_backups():
    """
    Lista dostępnych kopii zapasowych
    """
    try:
        import os
        from flask import current_app
        
        # Ścieżka do folderu backup
        db_path = current_app.config.get('DATABASE_PATH')
        backup_dir = os.path.join(os.path.dirname(db_path), 'backup')
        
        backups = []
        
        if os.path.exists(backup_dir):
            for filename in os.listdir(backup_dir):
                if filename.endswith('.db'):
                    file_path = os.path.join(backup_dir, filename)
                    file_stat = os.stat(file_path)
                    
                    backups.append({
                        'filename': filename,
                        'size': file_stat.st_size,
                        'created': datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                        'modified': datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                        'is_automatic': 'auto_backup' in filename
                    })
        
        # Sortuj po dacie utworzenia (najnowsze pierwsze)
        backups.sort(key=lambda x: x['created'], reverse=True)
        
        return success_response({
            'backups': backups,
            'total': len(backups),
            'backup_dir': backup_dir
        }, f"Znaleziono {len(backups)} kopii zapasowych")
        
    except Exception as e:
        print(f"Błąd pobierania listy backupów: {e}")
        return error_response(f"Błąd pobierania listy backupów: {str(e)}", 500)


# === DEFINICJE DOKUMENTÓW ===

@admin_bp.route('/admin/document-definitions', methods=['GET'])
def get_document_definitions():
    """Pobiera listę definicji dokumentów"""
    try:
        query = """
        SELECT 
            id,
            document_type,
            symbol,
            current_number,
            format_template,
            description,
            active,
            created_at,
            updated_at
        FROM document_definitions 
        ORDER BY document_type, symbol
        """
        
        definitions = execute_query(query)
        
        return success_response({
            'definitions': definitions or [],
            'total': len(definitions) if definitions else 0
        }, "Definicje dokumentów pobrane pomyślnie")
        
    except Exception as e:
        print(f"Błąd pobierania definicji dokumentów: {e}")
        return error_response(f"Błąd pobierania definicji dokumentów: {str(e)}", 500)


@admin_bp.route('/admin/document-definitions', methods=['POST'])
def create_document_definition():
    """Tworzy nową definicję dokumentu"""
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych", 400)
        
        required_fields = ['document_type', 'symbol', 'format_template', 'description']
        for field in required_fields:
            if not data.get(field):
                return error_response(f"Pole {field} jest wymagane", 400)
        
        # Sprawdź czy definicja już istnieje
        check_query = """
        SELECT id FROM document_definitions 
        WHERE document_type = ? AND symbol = ?
        """
        existing = execute_query(check_query, (data['document_type'], data['symbol']))
        
        if existing:
            return error_response("Definicja dla tego typu dokumentu i symbolu już istnieje", 400)
        
        # Wstawienie nowej definicji
        insert_query = """
        INSERT INTO document_definitions 
        (document_type, symbol, current_number, format_template, description, active)
        VALUES (?, ?, ?, ?, ?, ?)
        """
        
        current_number = data.get('current_number', 1)
        active = data.get('active', 1)
        
        result = execute_insert(
            insert_query, 
            (data['document_type'], data['symbol'], current_number, 
             data['format_template'], data['description'], active)
        )
        
        if result:
            return success_response({'id': result}, "Definicja dokumentu została utworzona")
        else:
            return error_response("Błąd podczas tworzenia definicji", 500)
            
    except Exception as e:
        print(f"Błąd tworzenia definicji dokumentu: {e}")
        return error_response(f"Błąd tworzenia definicji dokumentu: {str(e)}", 500)


@admin_bp.route('/admin/document-definitions/<int:definition_id>', methods=['PUT'])
def update_document_definition(definition_id):
    """Aktualizuje definicję dokumentu"""
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych", 400)
        
        # Sprawdź czy definicja istnieje
        check_query = "SELECT id FROM document_definitions WHERE id = ?"
        existing = execute_query(check_query, (definition_id,))
        
        if not existing:
            return not_found_response("Definicja dokumentu nie została znaleziona")
        
        # Przygotuj zapytanie aktualizacji
        update_fields = []
        update_values = []
        
        updatable_fields = ['document_type', 'symbol', 'current_number', 'format_template', 'description', 'active']
        
        for field in updatable_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(data[field])
        
        if not update_fields:
            return error_response("Brak pól do aktualizacji", 400)
        
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.append(definition_id)
        
        update_query = f"""
        UPDATE document_definitions 
        SET {', '.join(update_fields)} 
        WHERE id = ?
        """
        
        result = execute_query(update_query, update_values)
        
        return success_response({}, "Definicja dokumentu została zaktualizowana")
        
    except Exception as e:
        print(f"Błąd aktualizacji definicji dokumentu: {e}")
        return error_response(f"Błąd aktualizacji definicji dokumentu: {str(e)}", 500)


@admin_bp.route('/admin/document-definitions/<int:definition_id>', methods=['DELETE'])
def delete_document_definition(definition_id):
    """Usuwa definicję dokumentu"""
    try:
        # Sprawdź czy definicja istnieje
        check_query = "SELECT id FROM document_definitions WHERE id = ?"
        existing = execute_query(check_query, (definition_id,))
        
        if not existing:
            return not_found_response("Definicja dokumentu nie została znaleziona")
        
        # Usuń definicję
        delete_query = "DELETE FROM document_definitions WHERE id = ?"
        execute_query(delete_query, (definition_id,))
        
        return success_response({}, "Definicja dokumentu została usunięta")
        
    except Exception as e:
        print(f"Błąd usuwania definicji dokumentu: {e}")
        return error_response(f"Błąd usuwania definicji dokumentu: {str(e)}", 500)


@admin_bp.route('/admin/document-definitions/generate-number/<document_type>', methods=['POST'])
def generate_document_number(document_type):
    """Generuje następny numer dokumentu dla danego typu"""
    try:
        data = request.get_json() or {}
        warehouse_id = data.get('warehouse_id', 'M001')  # Domyślny magazyn
        
        # Pobierz definicję dokumentu
        query = """
        SELECT id, symbol, current_number, format_template
        FROM document_definitions 
        WHERE document_type = ? AND active = 1
        LIMIT 1
        """
        
        definition = execute_query(query, (document_type,))
        
        if not definition:
            return error_response(f"Nie znaleziono aktywnej definicji dla typu dokumentu: {document_type}", 404)
        
        definition = definition[0]
        
        # Pobierz aktualną datę
        now = datetime.now()
        month = f"{now.month:02d}"
        year = str(now.year)
        
        # Wygeneruj numer dokumentu
        current_number = definition['current_number']
        format_template = definition['format_template']
        
        # Zamień placeholdery na rzeczywiste wartości
        document_number = format_template.format(
            number=current_number,
            month=month,
            year=year,
            warehouse=warehouse_id
        )
        
        # Zaktualizuj licznik w bazie danych
        update_query = """
        UPDATE document_definitions 
        SET current_number = current_number + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """
        execute_query(update_query, (definition['id'],))
        
        return success_response({
            'document_number': document_number,
            'next_number': current_number + 1,
            'format_used': format_template
        }, f"Numer dokumentu wygenerowany: {document_number}")
        
    except Exception as e:
        print(f"Błąd generowania numeru dokumentu: {e}")
        return error_response(f"Błąd generowania numeru dokumentu: {str(e)}", 500)


@admin_bp.route('/admin/document-definitions/preview/<document_type>', methods=['GET'])
def preview_document_number_get(document_type):
    """Podgląd numeru dokumentu bez aktualizacji licznika (GET)"""
    try:
        warehouse_id = request.args.get('warehouse_id', 'M001')
        test_number = request.args.get('test_number', type=int)
        
        # Pobierz definicję dokumentu
        query = """
        SELECT symbol, current_number, format_template
        FROM document_definitions 
        WHERE document_type = ? AND active = 1
        LIMIT 1
        """
        
        definition = execute_query(query, (document_type,))
        
        if not definition:
            return error_response(f"Nie znaleziono definicji dla typu dokumentu: {document_type}", 404)
        
        definition = definition[0]
        
        # Pobierz aktualną datę
        now = datetime.now()
        month = f"{now.month:02d}"
        year = str(now.year)
        
        # Użyj numeru testowego lub aktualnego
        number_to_use = test_number if test_number is not None else definition['current_number']
        format_template = definition['format_template']
        
        # Wygeneruj podgląd numeru dokumentu
        preview_number = format_template.format(
            number=number_to_use,
            month=month,
            year=year,
            warehouse=warehouse_id
        )
        
        return success_response("Podgląd numeru dokumentu", {
            'preview_number': preview_number,
            'format_template': format_template,
            'current_number': definition['current_number'],
            'month': month,
            'year': year,
            'warehouse': warehouse_id
        })
        
    except Exception as e:
        print(f"Błąd podglądu numeru dokumentu: {e}")
        return error_response(f"Błąd podglądu numeru dokumentu: {str(e)}", 500)


@admin_bp.route('/admin/document-definitions/preview/<document_type>', methods=['POST'])
def preview_document_number(document_type):
    """Podgląd numeru dokumentu bez aktualizacji licznika"""
    try:
        data = request.get_json() or {}
        warehouse_id = data.get('warehouse_id', 'M001')
        test_number = data.get('test_number')  # Opcjonalny numer do testowania
        
        # Pobierz definicję dokumentu
        query = """
        SELECT symbol, current_number, format_template
        FROM document_definitions 
        WHERE document_type = ? AND active = 1
        LIMIT 1
        """
        
        definition = execute_query(query, (document_type,))
        
        if not definition:
            return error_response(f"Nie znaleziono aktywnej definicji dla typu dokumentu: {document_type}", 404)
        
        definition = definition[0]
        
        # Pobierz aktualną datę
        now = datetime.now()
        month = f"{now.month:02d}"
        year = str(now.year)
        
        # Użyj numeru testowego lub aktualnego
        number_to_use = test_number if test_number is not None else definition['current_number']
        format_template = definition['format_template']
        
        # Wygeneruj podgląd numeru dokumentu
        preview_number = format_template.format(
            number=number_to_use,
            month=month,
            year=year,
            warehouse=warehouse_id
        )
        
        return success_response({
            'preview_number': preview_number,
            'format_template': format_template,
            'current_number': definition['current_number'],
            'month': month,
            'year': year,
            'warehouse': warehouse_id
        }, f"Podgląd numeru: {preview_number}")
        
    except Exception as e:
        print(f"Błąd podglądu numeru dokumentu: {e}")
        return error_response(f"Błąd podglądu numeru dokumentu: {str(e)}", 500)


@admin_bp.route('/admin/document-definitions/<document_type>/reset', methods=['POST'])
def reset_document_counter(document_type):
    """Resetuje licznik dla danego typu dokumentu"""
    try:
        data = request.get_json() or {}
        new_number = data.get('new_number', 1)
        
        # Sprawdź czy definicja istnieje
        check_query = """
        SELECT id FROM document_definitions 
        WHERE document_type = ? AND active = 1
        LIMIT 1
        """
        
        definition = execute_query(check_query, (document_type,))
        
        if not definition:
            return error_response(f"Nie znaleziono definicji dla typu dokumentu: {document_type}", 404)
        
        # Resetuj licznik
        update_query = """
        UPDATE document_definitions 
        SET current_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE document_type = ? AND active = 1
        """
        
        result = execute_insert(update_query, (new_number, document_type))
        
        if result is not None:
            return success_response(f"Licznik dla typu '{document_type}' został zresetowany na {new_number}", {
                'document_type': document_type,
                'new_number': new_number
            })
        else:
            return error_response("Nie udało się zresetować licznika", 500)
        
    except Exception as e:
        print(f"Błąd resetowania licznika: {e}")
        return error_response(f"Błąd resetowania licznika: {str(e)}", 500)


# === ZARZĄDZANIE MAGAZYNAMI UŻYTKOWNIKÓW ===

@admin_bp.route('/admin/user-warehouses', methods=['GET'])
def get_user_warehouses():
    """Pobiera przypisania użytkowników do magazynów"""
    try:
        user_login = request.args.get('user_login')
        
        sql = """
        SELECT 
            uw.id,
            uw.user_login,
            uw.warehouse_id,
            w.nazwa as warehouse_name,
            w.kod_magazynu,
            uw.rola,
            uw.data_od,
            uw.data_do,
            uw.aktywny,
            u.typ as user_type
        FROM user_warehouses uw
        JOIN warehouses w ON uw.warehouse_id = w.id
        JOIN users u ON uw.user_login = u.login
        WHERE uw.aktywny = 1
        """
        
        params = []
        if user_login:
            sql += " AND uw.user_login = ?"
            params.append(user_login)
            
        sql += " ORDER BY uw.user_login, w.nazwa"
        
        result = execute_query(sql, params if params else None)
        
        if result is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        return success_response({
            'assignments': result,
            'total': len(result)
        }, f"Znaleziono {len(result)} przypisań")
        
    except Exception as e:
        print(f"Błąd pobierania przypisań: {e}")
        return error_response("Wystąpił błąd podczas pobierania przypisań", 500)

@admin_bp.route('/admin/user-warehouses', methods=['POST'])
def assign_user_to_warehouse():
    """Przypisuje użytkownika do magazynu"""
    try:
        data = request.get_json()
        
        user_login = data.get('user_login')
        warehouse_id = data.get('warehouse_id')
        rola = data.get('rola', 'pracownik')
        data_od = data.get('data_od', datetime.now().strftime('%Y-%m-%d'))
        
        if not user_login or not warehouse_id:
            return error_response("Brak wymaganych danych: user_login, warehouse_id", 400)
        
        # Sprawdź czy użytkownik istnieje
        user_check = execute_query("SELECT login FROM users WHERE login = ?", (user_login,))
        if not user_check:
            return error_response("Użytkownik nie istnieje", 404)
            
        # Sprawdź czy magazyn istnieje
        warehouse_check = execute_query("SELECT id FROM warehouses WHERE id = ?", (warehouse_id,))
        if not warehouse_check:
            return error_response("Magazyn nie istnieje", 404)
        
        # Dodaj przypisanie
        sql = """
        INSERT OR REPLACE INTO user_warehouses 
        (user_login, warehouse_id, rola, data_od, aktywny, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """
        
        result = execute_query(sql, (user_login, warehouse_id, rola, data_od))
        
        if result is not None:
            return success_response(f"Użytkownik {user_login} został przypisany do magazynu", {
                'user_login': user_login,
                'warehouse_id': warehouse_id,
                'rola': rola
            })
        else:
            return error_response("Nie udało się przypisać użytkownika", 500)
        
    except Exception as e:
        print(f"Błąd przypisywania użytkownika: {e}")
        return error_response(f"Błąd przypisywania użytkownika: {str(e)}", 500)

@admin_bp.route('/admin/user-warehouses/<int:assignment_id>', methods=['DELETE'])
def remove_user_warehouse_assignment(assignment_id):
    """Usuwa przypisanie użytkownika do magazynu"""
    try:
        sql = "UPDATE user_warehouses SET aktywny = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        result = execute_query(sql, (assignment_id,))
        
        if result is not None:
            return success_response("Przypisanie zostało usunięte", {'assignment_id': assignment_id})
        else:
            return error_response("Nie udało się usunąć przypisania", 500)
        
    except Exception as e:
        print(f"Błąd usuwania przypisania: {e}")
        return error_response(f"Błąd usuwania przypisania: {str(e)}", 500)

@admin_bp.route('/admin/users/<user_login>/warehouses', methods=['GET'])
def get_user_available_warehouses(user_login):
    """Pobiera magazyny dostępne dla użytkownika"""
    try:
        # Pobierz wszystkie magazyny użytkownika
        user_warehouses = execute_query("""
            SELECT 
                uw.warehouse_id,
                w.nazwa,
                w.kod_magazynu,
                uw.rola,
                u.typ as user_type,
                CASE WHEN u.typ = 'admin' THEN 1 ELSE 0 END as can_change_warehouse
            FROM user_warehouses uw
            JOIN warehouses w ON uw.warehouse_id = w.id
            JOIN users u ON uw.user_login = u.login
            WHERE uw.user_login = ? AND uw.aktywny = 1 AND w.aktywny = 1
            ORDER BY w.nazwa
        """, (user_login,))
        
        if user_warehouses is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        # Jeśli użytkownik to admin, może mieć dostęp do wszystkich magazynów
        user_type = execute_query("SELECT typ FROM users WHERE login = ?", (user_login,))
        is_admin = user_type and user_type[0]['typ'] == 'admin'
        
        if is_admin:
            all_warehouses = execute_query("""
                SELECT 
                    id as warehouse_id,
                    nazwa,
                    kod_magazynu,
                    'admin' as rola,
                    1 as can_change_warehouse
                FROM warehouses 
                WHERE aktywny = 1
                ORDER BY nazwa
            """)
            return success_response({
                'warehouses': all_warehouses or [],
                'can_change_warehouse': True,
                'is_admin': True
            }, f"Admin ma dostęp do wszystkich magazynów")
        else:
            return success_response({
                'warehouses': user_warehouses,
                'can_change_warehouse': False,
                'is_admin': False
            }, f"Znaleziono {len(user_warehouses)} magazynów dla użytkownika")
        
    except Exception as e:
        print(f"Błąd pobierania magazynów użytkownika: {e}")
        return error_response(f"Błąd pobierania magazynów użytkownika: {str(e)}", 500)


@admin_bp.route('/admin/company', methods=['GET'])
def get_company_data():
    """
    Pobierz dane firmy
    """
    try:
        company_sql = """
        SELECT 
            id,
            nazwa,
            adres_ulica,
            adres_kod,
            adres_miasto,
            nip,
            regon,
            krs,
            telefon,
            email,
            www,
            kapital_zakladowy,
            prezes,
            bank_nazwa,
            bank_numer_konta
        FROM firma 
        ORDER BY id DESC
        LIMIT 1
        """
        
        results = execute_query(company_sql)
        
        print(f"🔍 COMPANY GET: Pobrano {len(results) if results else 0} rekordów")
        if results:
            print(f"🔍 COMPANY GET: Pierwszy rekord: {results[0]}")
        
        if results is None:
            return error_response("Błąd połączenia z bazą danych", 500)
            
        if not results:
            return success_response({
                'company': {
                    'nazwa': '',
                    'adres_ulica': '',
                    'adres_kod': '',
                    'adres_miasto': '',
                    'nip': '',
                    'regon': '',
                    'krs': '',
                    'telefon': '',
                    'email': '',
                    'www': '',
                    'kapital_zakladowy': '',
                    'prezes': '',
                    'bank_nazwa': '',
                    'bank_numer_konta': ''
                }
            }, "Brak danych firmy - zwracam puste")
            
        return success_response({
            'company': results[0]
        }, "Dane firmy")
        
    except Exception as e:
        print(f"Błąd pobierania danych firmy: {e}")
        return error_response("Wystąpił błąd podczas pobierania danych firmy", 500)


@admin_bp.route('/admin/company', methods=['POST'])
def save_company_data():
    """
    Zapisz dane firmy
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych do zapisania", 400)
        
        print(f"🔍 COMPANY SAVE: Otrzymane dane: {data}")
        
        # Sprawdź czy istnieje rekord - użyj tego samego ORDER BY co w GET
        check_sql = "SELECT id FROM firma ORDER BY id DESC LIMIT 1"
        existing = execute_query(check_sql)
        
        print(f"🔍 COMPANY SAVE: Istniejący rekord: {existing}")
        
        if existing:
            # Update istniejącego rekordu
            update_sql = """
            UPDATE firma SET
                nazwa = ?,
                adres_ulica = ?,
                adres_kod = ?,
                adres_miasto = ?,
                nip = ?,
                regon = ?,
                krs = ?,
                telefon = ?,
                email = ?,
                www = ?,
                kapital_zakladowy = ?,
                prezes = ?,
                bank_nazwa = ?,
                bank_numer_konta = ?
            WHERE id = ?
            """
            
            success = execute_insert(update_sql, [
                data.get('nazwa', ''),
                data.get('adres_ulica', ''),
                data.get('adres_kod', ''),
                data.get('adres_miasto', ''),
                data.get('nip', ''),
                data.get('regon', ''),
                data.get('krs', ''),
                data.get('telefon', ''),
                data.get('email', ''),
                data.get('www', ''),
                data.get('kapital_zakladowy', ''),
                data.get('prezes', ''),
                data.get('bank_nazwa', ''),
                data.get('bank_numer_konta', ''),
                existing[0]['id']
            ])
            
            print(f"🔍 COMPANY SAVE: UPDATE wykonany dla ID: {existing[0]['id']}, success: {success}")
        else:
            # Insert nowego rekordu
            insert_sql = """
            INSERT INTO firma (
                nazwa, adres_ulica, adres_kod, adres_miasto, nip, regon, krs,
                telefon, email, www, kapital_zakladowy, prezes, bank_nazwa, bank_numer_konta
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            success = execute_insert(insert_sql, [
                data.get('nazwa', ''),
                data.get('adres_ulica', ''),
                data.get('adres_kod', ''),
                data.get('adres_miasto', ''),
                data.get('nip', ''),
                data.get('regon', ''),
                data.get('krs', ''),
                data.get('telefon', ''),
                data.get('email', ''),
                data.get('www', ''),
                data.get('kapital_zakladowy', ''),
                data.get('prezes', ''),
                data.get('bank_nazwa', ''),
                data.get('bank_numer_konta', '')
            ])
            
            print(f"🔍 COMPANY SAVE: INSERT wykonany, success: {success}")
        
        if success:
            return success_response({
                'company': data
            }, "Dane firmy zostały zapisane")
        else:
            return error_response("Błąd zapisywania danych firmy", 500)
            
    except Exception as e:
        print(f"Błąd zapisywania danych firmy: {e}")
        return error_response("Wystąpił błąd podczas zapisywania danych firmy", 500)

# ==========================================
# CELE SPRZEDAŻY - SALES TARGETS
# ==========================================

@admin_bp.route('/admin/sales-targets', methods=['GET'])
def get_sales_targets():
    """
    Pobierz cele sprzedaży dla wszystkich lokalizacji
    """
    print("🎯 GET_SALES_TARGETS: Function called!")
    try:
        print("🎯 GET_SALES_TARGETS: Starting function")
        # Sprawdź czy tabela istnieje
        check_table_sql = """
        CREATE TABLE IF NOT EXISTS sales_targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            target_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(location_id, year, month)
        )
        """
        execute_query(check_table_sql)
        
        # Pobierz cele dla bieżącego miesiąca
        current_date = datetime.now()
        targets_sql = """
        SELECT 
            st.*,
            l.nazwa as location_name
        FROM sales_targets st
        LEFT JOIN locations l ON st.location_id = l.id
        WHERE st.year = ? AND st.month = ?
        ORDER BY l.nazwa ASC
        """
        
        print(f"🎯 GET_SALES_TARGETS: Executing SQL query for year={current_date.year}, month={current_date.month}")
        
        results = execute_query(targets_sql, [current_date.year, current_date.month])
        
        if results is None:
            results = []
            
        return success_response({
            'targets': results,
            'year': current_date.year,
            'month': current_date.month
        }, f"Znaleziono {len(results)} celów sprzedaży")
        
    except Exception as e:
        print(f"Błąd pobierania celów sprzedaży: {e}")
        return error_response("Wystąpił błąd podczas pobierania celów sprzedaży", 500)

@admin_bp.route('/admin/sales-targets', methods=['POST'])
def set_sales_target():
    """
    Ustaw cel sprzedaży dla lokalizacji
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych w żądaniu", 400)
            
        required_fields = ['location_id', 'year', 'month', 'target_amount']
        for field in required_fields:
            if field not in data:
                return error_response(f"Brak wymaganego pola: {field}", 400)
        
        # Sprawdź czy tabela istnieje
        check_table_sql = """
        CREATE TABLE IF NOT EXISTS sales_targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            target_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(location_id, year, month)
        )
        """
        execute_query(check_table_sql)
        
        # Wstaw lub zaktualizuj cel
        upsert_sql = """
        INSERT OR REPLACE INTO sales_targets 
        (location_id, year, month, target_amount, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """
        
        success = execute_insert(upsert_sql, [
            data['location_id'],
            data['year'],
            data['month'],
            float(data['target_amount'])
        ])
        
        if success:
            return success_response({
                'target': data
            }, "Cel sprzedaży został zapisany")
        else:
            return error_response("Błąd zapisywania celu sprzedaży", 500)
            
    except Exception as e:
        print(f"Błąd zapisywania celu sprzedaży: {e}")
        return error_response("Wystąpił błąd podczas zapisywania celu sprzedaży", 500)

@admin_bp.route('/admin/sales-targets/<int:target_id>', methods=['DELETE'])
def delete_sales_target(target_id):
    """
    Usuń cel sprzedaży
    """
    try:
        delete_sql = "DELETE FROM sales_targets WHERE id = ?"
        success = execute_insert(delete_sql, [target_id])
        
        if success:
            return success_response(None, "Cel sprzedaży został usunięty")
        else:
            return error_response("Błąd usuwania celu sprzedaży", 500)
            
    except Exception as e:
        print(f"Błąd usuwania celu sprzedaży: {e}")
        return error_response("Wystąpił błąd podczas usuwania celu sprzedaży", 500)
