"""
API endpoints dla drukarki fiskalnej Novitus Deon
"""

from flask import Blueprint, request, jsonify
from flask import current_app
import logging

from fiscal.service import get_fiscal_service, set_global_fiscal_printer
from utils.database import success_response, error_response

# Konfiguracja logowania
logger = logging.getLogger(__name__)

# Blueprint dla endpointów fiskalnych
fiscal_bp = Blueprint('fiscal', __name__)

@fiscal_bp.route('/fiscal/status', methods=['GET'])
def get_fiscal_status():
    """
    Sprawdzenie statusu drukarki fiskalnej
    """
    try:
        fiscal_service = get_fiscal_service()
        status = fiscal_service.get_printer_status()
        
        return success_response("Status drukarki fiskalnej", status)
        
    except Exception as e:
        logger.error(f"Błąd sprawdzania statusu drukarki: {e}")
        return error_response(f"Błąd sprawdzania statusu: {e}", 500)

@fiscal_bp.route('/fiscal/test-command', methods=['POST'])
def test_command():
    """
    Test bezpośredniej komendy do drukarki (tylko do debugowania)
    """
    try:
        data = request.get_json()
        command = data.get('command', '1#e')
        description = data.get('description', 'Test komunikacji')
        
        fiscal_service = get_fiscal_service()
        printer = fiscal_service.printer
        
        # Wywołaj bezpośrednio metodę send_command
        response = printer.send_command(command)
        
        if response:
            return success_response(f"Komenda wykonana: {description}", {
                'command': command,
                'response_hex': response.hex(),
                'response_length': len(response)
            })
        else:
            return error_response(f"Brak odpowiedzi na komendę: {command}", 400)
            
    except Exception as e:
        logger.error(f"Błąd testowania komendy: {e}")
        return error_response(f"Błąd komendy: {e}", 500)

@fiscal_bp.route('/fiscal/fiscalize/<int:transaction_id>', methods=['POST'])
def fiscalize_transaction(transaction_id):
    """
    Fiskalizacja konkretnej transakcji
    """
    try:
        fiscal_service = get_fiscal_service()
        result = fiscal_service.fiscalize_transaction(transaction_id)
        
        if result.get('success'):
            return success_response(
                result.get('message', 'Transakcja sfiskalizowana pomyślnie'),
                result
            )
        else:
            return error_response(
                result.get('error', 'Błąd fiskalizacji'),
                400
            )
            
    except Exception as e:
        logger.error(f"Błąd fiskalizacji transakcji {transaction_id}: {e}")
        return error_response(f"Błąd fiskalizacji: {e}", 500)

@fiscal_bp.route('/fiscal/drawer/open', methods=['POST'])
def open_cash_drawer():
    """
    Otwarcie szuflady kasowej
    """
    try:
        fiscal_service = get_fiscal_service()
        result = fiscal_service.open_cash_drawer()
        
        if result:
            return success_response("Szuflada kasowa została otwarta", {
                'drawer_opened': True
            })
        else:
            return error_response("Nie można otworzyć szuflady kasowej", 400)
            
    except Exception as e:
        logger.error(f"Błąd otwierania szuflady: {e}")
        return error_response(f"Błąd otwierania szuflady: {e}", 500)

@fiscal_bp.route('/fiscal/daily-report', methods=['POST'])
def generate_daily_report():
    """
    Generowanie raportu dobowego (raport Z)
    """
    try:
        fiscal_service = get_fiscal_service()
        result = fiscal_service.generate_daily_report()
        
        if result.get('success'):
            return success_response(
                result.get('message', 'Raport dobowy został wykonany'),
                result
            )
        else:
            return error_response(
                result.get('error', 'Błąd generowania raportu'),
                400
            )
            
    except Exception as e:
        logger.error(f"Błąd raportu dobowego: {e}")
        return error_response(f"Błąd raportu dobowego: {e}", 500)

@fiscal_bp.route('/fiscal/debug', methods=['GET'])
def debug_fiscal_printer():
    """
    Debug informacji o drukarce fiskalnej
    """
    try:
        fiscal_service = get_fiscal_service()
        
        debug_info = {
            'service_enabled': fiscal_service.is_enabled,
            'service_test_mode': fiscal_service.test_mode,
            'printer_exists': fiscal_service.printer is not None,
            'printer_type': type(fiscal_service.printer).__name__ if fiscal_service.printer else None,
            'printer_methods': [],
            'printer_status_methods': []
        }
        
        if fiscal_service.printer:
            # Lista wszystkich metod drukarki
            all_methods = [method for method in dir(fiscal_service.printer) if not method.startswith('_')]
            debug_info['printer_methods'] = all_methods
            
            # Lista metod zawierających "status"
            status_methods = [method for method in all_methods if 'status' in method.lower()]
            debug_info['printer_status_methods'] = status_methods
            
            # Sprawdź czy get_status istnieje
            debug_info['has_get_status'] = hasattr(fiscal_service.printer, 'get_status')
            debug_info['has_get_device_status'] = hasattr(fiscal_service.printer, 'get_device_status')
        
        return success_response("Debug drukarki fiskalnej", debug_info)
        
    except Exception as e:
        logger.error(f"Błąd debug drukarki: {e}")
        return error_response(f"Błąd debug drukarki: {e}", 500)

@fiscal_bp.route('/fiscal/diagnostics', methods=['POST'])
def run_printer_diagnostics():
    """
    Uruchomienie pełnej diagnostyki drukarki fiskalnej
    """
    try:
        fiscal_service = get_fiscal_service()
        
        if fiscal_service.printer and hasattr(fiscal_service.printer, 'printer_diagnostics'):
            # Uruchom diagnostykę
            fiscal_service.printer.printer_diagnostics()
            
            return success_response("Diagnostyka drukarki zakończona", {
                'diagnostics_completed': True,
                'check_logs': 'Sprawdź logi backendu dla szczegółowych wyników'
            })
        else:
            return error_response("Drukarka nie obsługuje diagnostyki", 400)
        
    except Exception as e:
        logger.error(f"Błąd diagnostyki drukarki: {e}")
        return error_response(f"Błąd diagnostyki drukarki: {e}", 500)

@fiscal_bp.route('/fiscal/test-print', methods=['POST'])
def test_direct_print():
    """
    Test bezpośredniego druku na drukarce fiskalnej
    """
    try:
        fiscal_service = get_fiscal_service()
        
        if fiscal_service.printer and hasattr(fiscal_service.printer, 'test_direct_print'):
            # Uruchom test bezpośredniego druku
            result = fiscal_service.printer.test_direct_print()
            
            return success_response("Test bezpośredniego druku zakończony", {
                'print_test_result': result,
                'success': result,
                'message': 'Druk testowy wykonany pomyślnie' if result else 'Druk testowy nieudany - sprawdź logi',
                'check_logs': 'Sprawdź logi backendu dla szczegółowych wyników'
            })
        else:
            return error_response("Drukarka nie obsługuje testu bezpośredniego druku", 400)
        
    except Exception as e:
        logger.error(f"Błąd testu druku: {e}")
        return error_response(f"Błąd testu druku: {e}", 500)

@fiscal_bp.route('/fiscal/test', methods=['POST'])
def test_fiscal_printer():
    """
    Test połączenia z drukarką fiskalną - tworzy i współdzieli instancję
    """
    try:
        # Tworzenie bezpośredniej instancji drukarki do testu protokołu
        from fiscal.novitus_deon import get_fiscal_printer
        from fiscal.config import FISCAL_PRINTER_CONFIG
        import platform
        
        # Wykrycie systemu i wybór portu
        system = platform.system().lower()
        if system == 'linux':
            port = FISCAL_PRINTER_CONFIG.get('port', '/dev/ttyUSB0')
        elif system == 'darwin':  # macOS
            port = FISCAL_PRINTER_CONFIG.get('port_macos', '/dev/tty.usbserial')
        elif system == 'windows':
            port = FISCAL_PRINTER_CONFIG.get('port_windows', 'COM1')
        else:
            port = FISCAL_PRINTER_CONFIG.get('port', '/dev/ttyUSB0')
        
        # Tworzymy nową instancję drukarki z auto-detekcją protokołu
        test_printer = get_fiscal_printer(
            port=port,
            baudrate=FISCAL_PRINTER_CONFIG.get('baudrate', 9600),
            simulation_mode=False
        )
        
        # Testujemy połączenie
        if test_printer.connect():
            # Jeśli połączenie udane, ustawiamy jako globalną instancję
            set_global_fiscal_printer(test_printer)
            
            # Teraz pobieramy serwis fiskalny który użyje naszej instancji
            fiscal_service = get_fiscal_service()
            fiscal_service.initialize_printer()  # To teraz użyje globalnej instancji
            
            # Sprawdzenie statusu
            if fiscal_service.printer and hasattr(fiscal_service.printer, 'get_status'):
                status = fiscal_service.get_printer_status()
            else:
                status = {
                    'available': True,
                    'connected': True,
                    'detected_protocol': test_printer.detected_protocol,
                    'test_mode': test_printer.test_mode,
                    'printer_available': True
                }
            
            return success_response({
                'test_result': 'success',
                'status': status
            }, "Test drukarki pomyślny")
        else:
            return error_response("Test drukarki nieudany - brak połączenia", 400, {
                'test_result': 'failed',
                'status': {'available': False, 'connected': False}
            })
            
    except Exception as e:
        logger.error(f"Błąd testu drukarki: {e}")
        return error_response(f"Błąd testu drukarki: {e}", 500)

@fiscal_bp.route('/fiscal/auto-fiscalize', methods=['POST'])
def auto_fiscalize_transactions():
    """
    Automatyczna fiskalizacja nieskalizowanych transakcji
    """
    try:
        from utils.database import execute_query
        from utils.shifts import get_current_shift
        
        # Sprawdźmy czy jest otwarta zmiana (opcjonalne dla auto-fiscalize)
        # W przeciwieństwie do POS, auto-fiscalize może działać bez otwartej zmiany
        current_shift = get_current_shift()
        if not current_shift:
            logger.warning("Brak aktywnej zmiany podczas auto-fiskalizacji - kontynuujemy")
        
        # Pobranie nieskalizowanych transakcji
        transactions_sql = """
            SELECT id, numer_transakcji, suma_brutto
            FROM pos_transakcje 
            WHERE status = 'zakonczony' 
            AND (fiskalizacja = 0 OR fiskalizacja IS NULL)
            ORDER BY id DESC
            LIMIT 50
        """
        
        transactions = execute_query(transactions_sql)
        
        if not transactions:
            return success_response("Brak transakcji do fiskalizacji", {
                'processed_count': 0,
                'success_count': 0,
                'failed_count': 0
            })
        
        fiscal_service = get_fiscal_service()
        
        results = {
            'processed_count': 0,
            'success_count': 0,
            'failed_count': 0,
            'results': []
        }
        
        for transaction in transactions:
            transaction_id = transaction['id']
            results['processed_count'] += 1
            
            try:
                result = fiscal_service.fiscalize_transaction(transaction_id)
                
                if result.get('success'):
                    results['success_count'] += 1
                    results['results'].append({
                        'transaction_id': transaction_id,
                        'status': 'success',
                        'fiscal_number': result.get('fiscal_number')
                    })
                else:
                    results['failed_count'] += 1
                    results['results'].append({
                        'transaction_id': transaction_id,
                        'status': 'failed',
                        'error': result.get('error')
                    })
                    
            except Exception as e:
                results['failed_count'] += 1
                results['results'].append({
                    'transaction_id': transaction_id,
                    'status': 'error',
                    'error': str(e)
                })
        
        return success_response(
            f"Przetworzono {results['processed_count']} transakcji. "
            f"Pomyślne: {results['success_count']}, Błędy: {results['failed_count']}",
            results
        )
        
    except Exception as e:
        logger.error(f"Błąd automatycznej fiskalizacji: {e}")
        return error_response(f"Błąd automatycznej fiskalizacji: {e}", 500)

@fiscal_bp.route('/fiscal/test/error/<int:transaction_id>', methods=['POST'])
def test_fiscalization_error(transaction_id):
    """
    Test oznaczania transakcji jako błędnej fiskalizacji (do celów testowych)
    """
    try:
        from utils.database import execute_insert
        
        # Oznacz transakcję jako błędną fiskalizację
        update_sql = "UPDATE pos_transakcje SET fiskalizacja = -1 WHERE id = ?"
        execute_insert(update_sql, (transaction_id,))
        
        return success_response(
            f"Transakcja {transaction_id} oznaczona jako błędna fiskalizacja",
            {'transaction_id': transaction_id, 'fiscal_status': 'F!'}
        )
        
    except Exception as e:
        logger.error(f"Błąd oznaczania błędnej fiskalizacji: {e}")
        return error_response(f"Błąd oznaczania błędnej fiskalizacji: {e}", 500)

@fiscal_bp.route('/fiscal/config', methods=['GET'])
def get_fiscal_config():
    """
    Pobranie konfiguracji fiskalizacji
    """
    try:
        from fiscal.config import FISCAL_PRINTER_CONFIG, FISCAL_CONFIG
        
        config = {
            'printer_config': FISCAL_PRINTER_CONFIG,
            'fiscal_config': FISCAL_CONFIG,
            'status': get_fiscal_service().get_printer_status()
        }
        
        return success_response("Konfiguracja fiskalizacji", config)
        
    except Exception as e:
        logger.error(f"Błąd pobierania konfiguracji: {e}")
        return error_response(f"Błąd pobierania konfiguracji: {e}", 500)

@fiscal_bp.route('/fiscal/config', methods=['PUT'])
def update_fiscal_config():
    """
    Aktualizacja konfiguracji fiskalizacji
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response("Brak danych konfiguracji", 400)
        
        # Tutaj można dodać logikę aktualizacji konfiguracji
        # Na razie zwracamy informację o konieczności restart
        
        return success_response(
            "Konfiguracja zostanie zaktualizowana po restarcie serwera",
            {'restart_required': True}
        )
        
    except Exception as e:
        logger.error(f"Błąd aktualizacji konfiguracji: {e}")
        return error_response(f"Błąd aktualizacji konfiguracji: {e}", 500)

@fiscal_bp.route('/fiscal/test-mode/status', methods=['GET'])
def get_test_mode_status():
    """
    Sprawdzenie statusu trybu testowego
    """
    try:
        fiscal_service = get_fiscal_service()
        
        return success_response("Status trybu testowego", {
            'test_mode': fiscal_service.test_mode,
            'enabled': fiscal_service.is_enabled,
            'printer_available': fiscal_service.is_printer_available()
        })
        
    except Exception as e:
        logger.error(f"Błąd sprawdzania trybu testowego: {e}")
        return error_response(f"Błąd sprawdzania trybu testowego: {e}", 500)

@fiscal_bp.route('/fiscal/test-mode/enable', methods=['POST'])
def enable_test_mode():
    """
    Włączenie trybu testowego
    """
    try:
        from fiscal.config import FISCAL_PRINTER_CONFIG
        from fiscal.config_manager import update_test_mode
        
        # Aktualizuj konfigurację w runtime
        FISCAL_PRINTER_CONFIG['test_mode'] = True
        
        # Zapisz do pliku konfiguracyjnego
        update_test_mode(True)
        
        # Utwórz nową instancję serwisu z nową konfiguracją
        fiscal_service = get_fiscal_service()
        fiscal_service.test_mode = True
        
        logger.info("🧪 Tryb testowy drukarki fiskalnej został WŁĄCZONY")
        
        return success_response("Tryb testowy został włączony", {
            'test_mode': True,
            'message': 'Fiskalizacja będzie symulowana bez rzeczywistej drukarki'
        })
        
    except Exception as e:
        logger.error(f"Błąd włączania trybu testowego: {e}")
        return error_response(f"Błąd włączania trybu testowego: {e}", 500)

@fiscal_bp.route('/fiscal/test-mode/disable', methods=['POST'])
def disable_test_mode():
    """
    Wyłączenie trybu testowego
    """
    try:
        from fiscal.config import FISCAL_PRINTER_CONFIG
        from fiscal.config_manager import update_test_mode
        
        # Aktualizuj konfigurację w runtime
        FISCAL_PRINTER_CONFIG['test_mode'] = False
        
        # Zapisz do pliku konfiguracyjnego
        update_test_mode(False)
        
        # Utwórz nową instancję serwisu z nową konfiguracją
        fiscal_service = get_fiscal_service()
        fiscal_service.test_mode = False
        
        # Próba ponownej inicjalizacji drukarki
        if fiscal_service.is_enabled:
            fiscal_service.initialize_printer()
        
        logger.info("🖨️ Tryb testowy drukarki fiskalnej został WYŁĄCZONY")
        
        return success_response("Tryb testowy został wyłączony", {
            'test_mode': False,
            'message': 'Przywrócono normalną komunikację z drukarką fiskalną'
        })
        
    except Exception as e:
        logger.error(f"Błąd wyłączania trybu testowego: {e}")
        return error_response(f"Błąd wyłączania trybu testowego: {e}", 500)

@fiscal_bp.route('/fiscal/test-fiscalize/<int:transaction_id>', methods=['POST'])
def test_fiscalize_transaction(transaction_id):
    """
    Testowa fiskalizacja transakcji (wymusza tryb testowy dla tej operacji)
    """
    try:
        fiscal_service = get_fiscal_service()
        
        # Tymczasowo włącz tryb testowy
        original_test_mode = fiscal_service.test_mode
        fiscal_service.test_mode = True
        
        try:
            result = fiscal_service.fiscalize_transaction(transaction_id)
            
            # Przywróć oryginalny tryb
            fiscal_service.test_mode = original_test_mode
            
            if result.get('success'):
                return success_response(
                    "Testowa fiskalizacja zakończona pomyślnie",
                    result
                )
            else:
                return error_response(
                    result.get('error', 'Błąd testowej fiskalizacji'),
                    400
                )
        finally:
            # Zawsze przywróć oryginalny tryb
            fiscal_service.test_mode = original_test_mode
            
    except Exception as e:
        logger.error(f"Błąd testowej fiskalizacji transakcji {transaction_id}: {e}")
        return error_response(f"Błąd testowej fiskalizacji: {e}", 500)

# Dodanie middleware do automatycznej fiskalizacji
@fiscal_bp.after_request
def after_request(response):
    """Middleware wykonywane po każdym żądaniu"""
    return response
