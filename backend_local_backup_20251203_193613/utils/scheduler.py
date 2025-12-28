"""
Scheduler do automatycznych zadań systemowych
Obsługuje automatyczne tworzenie kopii zapasowych bazy danych
"""

import schedule
import time
import threading
import os
import shutil
from datetime import datetime

class AutoBackupScheduler:
    def __init__(self, app=None):
        self.app = app
        self.is_running = False
        self.scheduler_thread = None
        
    def init_app(self, app):
        """Inicjalizacja schedulera z aplikacją Flask"""
        self.app = app
        
    def create_automatic_backup(self):
        """Tworzy automatyczną kopię zapasową bazy danych"""
        try:
            # Ścieżki
            db_path = self.app.config.get('DATABASE_PATH')
            backup_dir = os.path.join(os.path.dirname(db_path), 'backup')
            
            # Upewnij się, że folder backup istnieje
            os.makedirs(backup_dir, exist_ok=True)
            
            # Nazwa pliku backup z timestampem
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"kupony_auto_backup_{timestamp}.db"
            backup_path = os.path.join(backup_dir, backup_filename)
            
            # Kopiuj bazę danych
            shutil.copy2(db_path, backup_path)
            
            # Sprawdź rozmiar pliku
            file_size = os.path.getsize(backup_path)
            
            print(f"✅ Automatyczny backup utworzony: {backup_filename} ({file_size} bytes)")
            
            # Opcjonalne: usuń stare backupy (starsze niż 30 dni)
            self.cleanup_old_backups(backup_dir, days=30)
            
            return {
                'success': True,
                'backup_filename': backup_filename,
                'backup_path': backup_path,
                'file_size': file_size,
                'timestamp': timestamp
            }
            
        except Exception as e:
            print(f"❌ Błąd podczas tworzenia automatycznego backupu: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def cleanup_old_backups(self, backup_dir, days=30):
        """Usuwa stare backupy starsze niż określona liczba dni"""
        try:
            current_time = time.time()
            cutoff_time = current_time - (days * 24 * 60 * 60)  # dni w sekundach
            
            removed_count = 0
            for filename in os.listdir(backup_dir):
                if filename.startswith('kupony_auto_backup_') and filename.endswith('.db'):
                    file_path = os.path.join(backup_dir, filename)
                    if os.path.getmtime(file_path) < cutoff_time:
                        os.remove(file_path)
                        removed_count += 1
                        print(f"🗑️  Usunięto stary backup: {filename}")
            
            if removed_count > 0:
                print(f"✅ Usunięto {removed_count} starych backupów")
                
        except Exception as e:
            print(f"❌ Błąd podczas czyszczenia starych backupów: {str(e)}")
    
    def start_scheduler(self):
        """Uruchamia scheduler w osobnym wątku"""
        if self.is_running:
            print("⚠️  Scheduler już działa")
            return
            
        # Zaplanuj automatyczny backup codziennie o 21:30
        schedule.every().day.at("21:30").do(self.create_automatic_backup)
        
        self.is_running = True
        
        def run_schedule():
            print("🕘 Uruchomiono scheduler automatycznych backupów (21:30 codziennie)")
            while self.is_running:
                schedule.run_pending()
                time.sleep(60)  # Sprawdzaj co minutę
        
        self.scheduler_thread = threading.Thread(target=run_schedule, daemon=True)
        self.scheduler_thread.start()
        
        print("✅ Scheduler automatycznych backupów uruchomiony")
    
    def stop_scheduler(self):
        """Zatrzymuje scheduler"""
        self.is_running = False
        schedule.clear()
        print("🛑 Scheduler automatycznych backupów zatrzymany")
    
    def get_scheduler_status(self):
        """Zwraca status schedulera"""
        next_run = None
        if schedule.jobs:
            next_run = schedule.next_run()
            
        return {
            'is_running': self.is_running,
            'next_backup': str(next_run) if next_run else None,
            'scheduled_jobs': len(schedule.jobs)
        }
    
    def trigger_manual_backup(self):
        """Ręczne uruchomienie backupu (dla testów)"""
        print("🔧 Ręczne uruchomienie backupu...")
        return self.create_automatic_backup()

# Globalna instancja schedulera
auto_backup_scheduler = AutoBackupScheduler()
