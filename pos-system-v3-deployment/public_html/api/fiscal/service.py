"""
Serwis fiskalizacji dla systemu POS
Integracja z drukarką fiskalną Novitus Deon
"""

import logging
import platform
from typing import Dict, Optional, List
from decimal import Decimal
from datetime import datetime

from .config import FISCAL_PRINTER_CONFIG, FISCAL_CONFIG, MESSAGES
from utils.database import execute_query, execute_insert

# Konfiguracja logowania
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Globalna instancja serwisu fiskalizacji (singleton)
_fiscal_service = None
# Globalna instancja drukarki fiskalnej (singleton) 
_fiscal_printer = None

class FiscalService:
    """
    Serwis obsługi fiskalizacji w systemie POS
    """
    
    def __init__(self):
        self.printer = None
        self.is_enabled = FISCAL_PRINTER_CONFIG.get('enabled', True)
        
        # Załaduj status trybu testowego z pliku konfiguracyjnego
        try:
            from .config_manager import get_test_mode_status
            self.test_mode = get_test_mode_status()
        except ImportError:
            self.test_mode = FISCAL_PRINTER_CONFIG.get('test_mode', False)
        
        self.require_fiscal = FISCAL_CONFIG.get('require_fiscal', False)
        self.auto_connect = FISCAL_PRINTER_CONFIG.get('auto_connect', True)
        
        if self.is_enabled and self.auto_connect and not self.test_mode:
            self.initialize_printer()
    
    def initialize_printer(self) -> bool:
        """
        Inicjalizacja drukarki fiskalnej - używa współdzielonej instancji
        
        Returns:
            bool: True jeśli inicjalizacja udana
        """
        global _fiscal_printer
        
        try:
            # Jeśli mamy już działającą instancję drukarki, użyj jej
            if _fiscal_printer is not None and hasattr(_fiscal_printer, 'is_connected') and _fiscal_printer.is_connected:
                self.printer = _fiscal_printer
                logger.info("📞 Używam istniejącej instancji drukarki fiskalnej")
                return True
            
            # Import drukarki (może nie być dostępna)
            from .novitus_deon import get_fiscal_printer
            
            # Wykrycie systemu i wybór portu
            system = platform.system().lower()
            if system == 'linux':
                port = FISCAL_CONFIG.get('port', '/dev/ttyUSB0')
            elif system == 'darwin':  # macOS
                port = FISCAL_CONFIG.get('port', '/dev/cu.usbmodem101')
            elif system == 'windows':
                port = FISCAL_CONFIG.get('port', 'COM1')
            else:
                port = FISCAL_CONFIG.get('port', '/dev/ttyUSB0')
            
            # Utworzenie nowej instancji drukarki tylko jeśli nie ma globalnej
            if _fiscal_printer is None:
                _fiscal_printer = get_fiscal_printer(
                    port=port,
                    baudrate=FISCAL_PRINTER_CONFIG.get('baudrate', 9600),
                    simulation_mode=False  # Real printer mode
                )
                
                # Próba połączenia
                if _fiscal_printer.connect():
                    logger.info(MESSAGES['connection_success'])
                    self.printer = _fiscal_printer
                    return True
                else:
                    logger.warning(MESSAGES['connection_failed'])
                    logger.info("🎭 Switching to simulation mode due to connection failure")
                    
                    # Switch to simulation mode
                    _fiscal_printer = get_fiscal_printer(
                        port=port,
                        baudrate=FISCAL_PRINTER_CONFIG.get('baudrate', 9600),
                        simulation_mode=True
                    )
                    
                    if self.require_fiscal:
                        raise Exception("Drukarka fiskalna jest wymagana")
                    
                    self.printer = _fiscal_printer
                    return True  # Return True for simulation mode
            else:
                # Użyj istniejącej globalnej instancji
                self.printer = _fiscal_printer
                return True
                
        except ImportError:
            logger.warning("Brak biblioteki pyserial - fiskalizacja wyłączona")
            self.is_enabled = False
            return False
        except Exception as e:
            logger.error(f"Błąd inicjalizacji drukarki: {e}")
            if self.require_fiscal:
                raise
            return False
    
    def is_printer_available(self) -> bool:
        """
        Sprawdzenie czy drukarka jest dostępna
        
        Returns:
            bool: True jeśli drukarka jest dostępna
        """
        if not self.is_enabled:
            return False
            
        # Tryb testowy zawsze zwraca True
        if self.test_mode:
            return True
            
        if not self.printer:
            return False
            
        try:
            status = self.printer.get_status()
            return status.get('connected', False)
        except:
            return False
    
    def get_printer_status(self) -> Dict:
        """
        Pobranie statusu drukarki
        
        Returns:
            Dict: Status drukarki
        """
        # Tryb testowy zwraca symulowany status
        if self.test_mode:
            return {
                'available': True,
                'status': 'test_mode',
                'message': 'Drukarka w trybie testowym - fiskalizacja symulowana',
                'connected': True,
                'test_mode': True,
                'fiscal_memory': '12345678',
                'daily_counter': 42
            }
            
        if not self.printer:
            return {
                'available': False,
                'status': 'not_initialized',
                'message': 'Drukarka nie została zainicjalizowana',
                'test_mode': False
            }
        
        try:
            status = self.printer.get_status()
            
            # Dodatkowe informacje
            status['available'] = status.get('connected', False)
            status['fiscal_enabled'] = self.is_enabled
            status['require_fiscal'] = self.require_fiscal
            
            # Ostrzeżenia
            warnings = []
            if status.get('paper_low'):
                warnings.append(MESSAGES['paper_low'])
            if status.get('memory_full'):
                warnings.append(MESSAGES['memory_full'])
            
            status['warnings'] = warnings
            
            return status
            
        except Exception as e:
            return {
                'available': False,
                'status': 'error',
                'error': str(e),
                'message': MESSAGES['printer_error']
            }
    
    def fiscalize_transaction(self, transaction_id: int) -> Dict:
        """
        Fiskalizacja transakcji
        
        Args:
            transaction_id: ID transakcji do fiskalizacji
            
        Returns:
            Dict: Wynik fiskalizacji
        """
        try:
            logger.info(f"🧾 FISCALIZE_TRANSACTION: Start dla transakcji {transaction_id}")
            logger.info(f"🧾 Service config: enabled={self.is_enabled}, test_mode={self.test_mode}")
            
            # Pobranie danych transakcji
            transaction_data = self._get_transaction_data(transaction_id)
            if not transaction_data:
                logger.error(f"🧾 Transakcja {transaction_id} nie została znaleziona w bazie")
                return {
                    'success': False,
                    'error': 'Transakcja nie została znaleziona'
                }
            
            logger.info(f"🧾 Znaleziono transakcję: typ={transaction_data['transaction'].get('typ_transakcji')}, kwota={transaction_data['transaction'].get('suma_brutto')}")
            
            # Sprawdzenie czy transakcja już została sfiskalizowana
            if transaction_data['transaction'].get('fiskalizacja', 0) == 1:
                logger.info(f"🧾 Transakcja {transaction_id} już została sfiskalizowana")
                return {
                    'success': True,
                    'already_fiscalized': True,
                    'message': 'Transakcja już została sfiskalizowana'
                }
            
            # Sprawdzenie dostępności drukarki
            if not self.is_printer_available():
                logger.warning(f"🧾 Drukarka niedostępna, require_fiscal={self.require_fiscal}")
                if self.require_fiscal:
                    return {
                        'success': False,
                        'error': 'Drukarka fiskalna niedostępna (wymagana)'
                    }
                else:
                    # Oznacz jako "sfiskalizowana" bez fizycznego druku
                    self._mark_as_fiscalized(transaction_id, 'NO_PRINTER')
                    return {
                        'success': True,
                        'fiscalized_offline': True,
                        'message': 'Transakcja oznaczona (drukarka niedostępna)'
                    }
            
            # Tryb testowy - symulacja fiskalizacji
            if self.test_mode:
                logger.info(f"🧾 TRYB TESTOWY: Symulacja fiskalizacji transakcji {transaction_id}")
                import time
                import random
                
                # Symuluj krótkie opóźnienie jak prawdziwa drukarka
                time.sleep(0.5)
                
                # Wygeneruj symulowany numer fiskalny
                fiscal_number = f"TEST{random.randint(100000, 999999)}"
                logger.info(f"🧾 Wygenerowany numer fiskalny: {fiscal_number}")
                
                # Oznacz jako sfiskalizowana z numerem testowym
                self._mark_as_fiscalized(transaction_id, fiscal_number)
                logger.info(f"🧾 Oznaczono transakcję jako sfiskalizowaną w bazie")
                
                # Zapisz do historii fiskalizacji
                test_result = {
                    'success': True,
                    'fiscal_number': fiscal_number,
                    'test_mode': True,
                    'timestamp': datetime.now().isoformat(),
                    'printer_serial': 'TEST_PRINTER_001'
                }
                self._save_fiscal_history(transaction_id, fiscal_number, test_result)
                logger.info(f"🧾 Zapisano historię fiskalizacji")
                
                return {
                    'success': True,
                    'fiscal_number': fiscal_number,
                    'test_mode': True,
                    'message': f'Transakcja sfiskalizowana w trybie testowym (nr: {fiscal_number})'
                }
            
            # Przygotowanie danych do fiskalizacji
            fiscal_data = self._prepare_fiscal_data(transaction_data)
            
            # Fiskalizacja na drukarce
            result = self.printer.print_fiscal_receipt(fiscal_data)
            
            if result.get('success'):
                # Aktualizacja transakcji w bazie
                fiscal_number = result.get('fiscal_number')
                self._mark_as_fiscalized(transaction_id, fiscal_number)
                
                # Zapis do historii fiskalizacji
                self._save_fiscal_history(transaction_id, fiscal_number, result)
                
                return {
                    'success': True,
                    'fiscal_number': fiscal_number,
                    'message': MESSAGES['fiscalization_success']
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Nieznany błąd fiskalizacji'),
                    'message': MESSAGES['fiscalization_failed']
                }
                
        except Exception as e:
            logger.error(f"🧾 Błąd fiskalizacji transakcji {transaction_id}: {e}")
            import traceback
            logger.error(f"🧾 Traceback: {traceback.format_exc()}")
            # Oznacz transakcję jako błędną fiskalizację
            self._mark_as_fiscalization_failed(transaction_id, str(e))
            return {
                'success': False,
                'error': str(e),
                'message': MESSAGES['fiscalization_failed']
            }
    
    def _get_transaction_data(self, transaction_id: int) -> Optional[Dict]:
        """Pobranie danych transakcji z bazy"""
        try:
            # Transakcja główna
            transaction_sql = """
                SELECT * FROM pos_transakcje WHERE id = ?
            """
            transaction = execute_query(transaction_sql, (transaction_id,))
            
            if not transaction:
                logger.error(f"❌ Transakcja {transaction_id} nie została znaleziona")
                return None
            
            transaction = transaction[0]
            logger.info(f"🔍 Znaleziono transakcję {transaction_id}: typ={transaction.get('typ_transakcji')}, kwota={transaction.get('suma_brutto')}")
            
            # Pozycje transakcji - STARA TABELA (frontend nadal używa pos_pozycje)
            items_sql = """
                SELECT 
                    pp.ilosc,
                    pp.wartosc_brutto as cena_brutto,
                    pp.nazwa_produktu as product_name,
                    pp.stawka_vat
                FROM pos_pozycje pp
                WHERE pp.transakcja_id = ?
                ORDER BY pp.lp
            """
            items = execute_query(items_sql, (transaction_id,))
            logger.info(f"🔍 Znaleziono {len(items or [])} pozycji dla transakcji {transaction_id}")
            
            if items:
                for i, item in enumerate(items):
                    logger.info(f"   Pozycja {i+1}: {item.get('product_name')} x{item.get('ilosc')} = {item.get('cena_brutto')}")
            
            result = {
                'transaction': transaction,
                'items': items or []
            }
            return result
            
        except Exception as e:
            logger.error(f"Błąd pobierania danych transakcji {transaction_id}: {e}")
            return None
    
    def _prepare_fiscal_data(self, transaction_data: Dict) -> Dict:
        """Przygotowanie danych do fiskalizacji"""
        transaction = transaction_data['transaction']
        items = transaction_data['items']
        
        # Przygotowanie pozycji
        fiscal_items = []
        for item in items:
            fiscal_items.append({
                'name': item.get('product_name', 'Produkt')[:40],  # Max 40 znaków
                'quantity': Decimal(str(item.get('ilosc', 1))),
                'price': Decimal(str(item.get('cena_brutto', 0))),
                'vat_rate': int(item.get('stawka_vat', 23))
            })
        
        return {
            'items': fiscal_items,
            'total': Decimal(str(transaction.get('suma_brutto', 0))),
            'payment_amount': Decimal(str(transaction.get('suma_brutto', 0))),
            'payment_method': transaction.get('forma_platnosci', 'gotowka'),
            'transaction_id': transaction.get('id'),
            'cashier': transaction.get('kasjer_login', 'admin'),
            'receipt_number': transaction.get('numer_paragonu'),  # Numer paragonu z systemu
            'transaction_number': transaction.get('numer_transakcji')  # Numer transakcji z systemu
        }
    
    def _mark_as_fiscalized(self, transaction_id: int, fiscal_number: str):
        """Oznaczenie transakcji jako sfiskalizowanej"""
        try:
            # Nie zastępuj numer_paragonu z systemu - zachowaj oryginalny numer
            update_sql = """
                UPDATE pos_transakcje 
                SET fiskalizacja = 1
                WHERE id = ?
            """
            execute_insert(update_sql, (transaction_id,))
            logger.info(f"Transakcja {transaction_id} oznaczona jako sfiskalizowana (zachowano numer_paragonu z systemu)")
            
        except Exception as e:
            logger.error(f"Błąd aktualizacji transakcji {transaction_id}: {e}")
    
    def _mark_as_fiscalization_failed(self, transaction_id: int, error_message: str):
        """Oznaczenie transakcji jako błędnej fiskalizacji"""
        try:
            update_sql = """
                UPDATE pos_transakcje 
                SET fiskalizacja = -1
                WHERE id = ?
            """
            execute_insert(update_sql, (transaction_id,))
            logger.error(f"Transakcja {transaction_id} oznaczona jako błędna fiskalizacja: {error_message}")
            
        except Exception as e:
            logger.error(f"Błąd oznaczania błędnej fiskalizacji {transaction_id}: {e}")
    
    def _save_fiscal_history(self, transaction_id: int, fiscal_number: str, result: Dict):
        """Zapis historii fiskalizacji"""
        try:
            # Sprawdzenie czy tabela historii istnieje
            create_history_table = """
                CREATE TABLE IF NOT EXISTS fiscal_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id INTEGER NOT NULL,
                    fiscal_number TEXT,
                    fiscal_amount DECIMAL(10,2),
                    printer_response TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (transaction_id) REFERENCES pos_transakcje(id)
                )
            """
            execute_insert(create_history_table)
            
            # Zapisanie historii
            history_sql = """
                INSERT INTO fiscal_history 
                (transaction_id, fiscal_number, fiscal_amount, printer_response)
                VALUES (?, ?, ?, ?)
            """
            execute_insert(history_sql, (
                transaction_id,
                fiscal_number,
                float(result.get('total_gross', 0)),
                str(result)
            ))
            
        except Exception as e:
            logger.error(f"Błąd zapisu historii fiskalizacji: {e}")
    
    def open_cash_drawer(self) -> bool:
        """
        Otwarcie szuflady kasowej
        
        Returns:
            bool: True jeśli otwarto pomyślnie
        """
        # Tryb testowy - symuluje otwieranie szuflady
        if self.test_mode:
            logger.info("🔓 TRYB TESTOWY: Symulacja otwierania szuflady kasowej")
            return True
            
        if not self.is_printer_available():
            return False
        
        try:
            return self.printer.open_drawer()
        except Exception as e:
            logger.error(f"Błąd otwierania szuflady: {e}")
            return False
    
    def generate_daily_report(self) -> Dict:
        """
        Generowanie raportu dobowego (raport Z)
        
        Returns:
            Dict: Wynik generowania raportu
        """
        # Tryb testowy - symuluje raport dobowy
        if self.test_mode:
            logger.info("📊 TRYB TESTOWY: Symulacja raportu dobowego")
            return {
                'success': True,
                'message': 'Raport dobowy wykonany (symulacja)',
                'report_number': '001/2025',
                'total_sales': 1234.56,
                'test_mode': True
            }
            
        if not self.is_printer_available():
            return {
                'success': False,
                'error': 'Drukarka fiskalna niedostępna'
            }
        
        try:
            result = self.printer.daily_report()
            
            if result.get('success'):
                # Zapis raportu do bazy
                self._save_daily_report(result)
                
                return {
                    'success': True,
                    'report_number': result.get('report_number'),
                    'total_sales': result.get('total_sales'),
                    'receipts_count': result.get('receipts_count'),
                    'message': MESSAGES['daily_report_success']
                }
            else:
                return {
                    'success': False,
                    'error': 'Błąd generowania raportu dobowego'
                }
                
        except Exception as e:
            logger.error(f"Błąd raportu dobowego: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _save_daily_report(self, report_data: Dict):
        """Zapis raportu dobowego do bazy"""
        try:
            # Sprawdzenie czy tabela raportów istnieje
            create_reports_table = """
                CREATE TABLE IF NOT EXISTS daily_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_number TEXT,
                    total_sales DECIMAL(10,2),
                    receipts_count INTEGER,
                    report_date TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            """
            execute_insert(create_reports_table)
            
            # Zapisanie raportu
            report_sql = """
                INSERT INTO daily_reports 
                (report_number, total_sales, receipts_count, report_date)
                VALUES (?, ?, ?, ?)
            """
            execute_insert(report_sql, (
                report_data.get('report_number'),
                float(report_data.get('total_sales', 0)),
                report_data.get('receipts_count', 0),
                datetime.now().strftime('%Y-%m-%d')
            ))
            
        except Exception as e:
            logger.error(f"Błąd zapisu raportu dobowego: {e}")

# Singleton instance
_fiscal_service = None

def get_fiscal_service() -> FiscalService:
    """
    Pobranie instancji serwisu fiskalizacji (singleton)
    
    Returns:
        FiscalService: Instancja serwisu
    """
    global _fiscal_service
    
    if _fiscal_service is None:
        _fiscal_service = FiscalService()
    
    return _fiscal_service


def set_global_fiscal_printer(printer_instance):
    """
    Ustawia globalną instancję drukarki fiskalnej
    Pozwala API współdzielić wykrytą instancję z serwisem
    """
    global _fiscal_printer
    _fiscal_printer = printer_instance
    logger.info(f"🔄 Ustawiono globalną instancję drukarki: {printer_instance.detected_protocol if printer_instance else 'None'}")


def get_global_fiscal_printer():
    """
    Pobiera globalną instancję drukarki fiskalnej
    """
    global _fiscal_printer
    return _fiscal_printer
