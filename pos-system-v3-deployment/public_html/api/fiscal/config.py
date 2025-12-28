"""
KFISCAL_PRINTER_CONFIG = {
    'enabled': True,
    'port': '/dev/tty.usbmodem101',
    'port_macos': '/dev/tty.usbmodem101',
    'baudrate': 9600,uracja drukarki fiskalnej Novitus Deon
"""

# Konfiguracja drukarki fiskalnej Novitus Deon
FISCAL_PRINTER_CONFIG = {
    'enabled': True,
    'port': '/dev/cu.usbmodem101',  # AKTUALNY PORT Z DZIAŁAJĄCEGO TESTU
    'port_macos': '/dev/cu.usbmodem101',  # AKTUALNY PORT Z DZIAŁAJĄCEGO TESTU
    'baudrate': 9600,
    'timeout': 5,
    'test_mode': False,  # RZECZYWISTA DRUKARKA - test fizyczny
    'protocol': 'novitus_zgod',  # Protokół Novitus zgodny ESC/P
    'encoding': 'windows-1250',  # WYKRYTE KODOWANIE
    'debug': True,  # Szczegółowe logi
    
    # Obsługiwane protokoły Novitus Deon (3 tryby)
    'supported_protocols': {
        'xml': {
            'description': 'Protokół XML Novitus v1.08 PL',
            'test_command': b'<pakiet><dle_pl></dle_pl></pakiet>\x0D\x0A',  # Pełna struktura XML zgodna z dokumentacją
            'encoding': 'utf-8',
            'preferred_baudrate': 9600
        },
        'novitus': {
            'description': 'Protokół Novitus (własnościowy)',
            'test_command': b'\x10\x04',  # DLE + EOT
            'encoding': 'windows-1250',
            'preferred_baudrate': 9600
        },
        'novitus_zgod': {
            'description': 'Protokół Novitus zgodny (ESC/P)',
            'test_command': b'\x05',  # ENQ
            'encoding': 'windows-1250',
            'preferred_baudrate': 9600
        }
    },
    
    # Alternatywne ustawienia komunikacji - TYLKO PORT 101!
    'alternative_ports': ['/dev/cu.usbmodem101'],
    'alternative_baudrates': [9600, 19200, 38400, 57600, 115200],
    'parity': 'N',  # None
    'stopbits': 1,
    'bytesize': 8,
    'xonxoff': False,
    'rtscts': False,
    'dsrdtr': False
}

# Konfiguracja fiskalizacji
FISCAL_CONFIG = {
    'enabled': True,
    'port': '/dev/cu.usbmodem101',  # Port z działającego testu
    'baudrate': 9600,
    'timeout': 5,
    'test_mode': False,
    'protocol': 'novitus_zgod',  # 'xml', 'novitus', 'auto'
    'encoding': 'windows-1250',  # Domyślne kodowanie
    'debug': True,
    'supported_protocols': {
        'xml': {
            'description': 'Protokół XML Novitus v1.08 PL',
            'test_command': b'<pakiet><dle_pl></dle_pl></pakiet>\r\n',
            'encoding': 'utf-8',
            'preferred_baudrate': 9600
        },
        'novitus': {
            'description': 'Protokół Novitus (własnościowy)',
            'test_command': b'\x10\x04',
            'encoding': 'windows-1250',
            'preferred_baudrate': 9600
        },
        'novitus_zgod': {
            'description': 'Protokół Novitus zgodny (ESC/P)',
            'test_command': b'\x05',
            'encoding': 'windows-1250',
            'preferred_baudrate': 9600
        }
    },
    'alternative_ports': ['/dev/cu.usbmodem101'],
    'alternative_baudrates': [9600, 19200, 38400, 57600, 115200],
    'parity': 'N',
    'stopbits': 1,
    'bytesize': 8,
    'xonxoff': False,
    'rtscts': False,
    'dsrdtr': False
}

# Mapowanie stawek VAT na kody drukarki
VAT_MAPPING = {
    23: 'A',    # VAT 23%
    8: 'B',     # VAT 8%
    5: 'C',     # VAT 5%
    0: 'D',     # VAT 0%
    -1: 'E'     # Zwolnione z VAT
}

# Mapowanie metod płatności na kody drukarki
PAYMENT_MAPPING = {
    'gotowka': '0',
    'cash': '0',
    'karta': '1',
    'card': '1',
    'przelew': '2',
    'transfer': '2',
    'blik': '3',
    'voucher': '4',
    'bon': '4'
}

# Konfiguracja komunikatów
MESSAGES = {
    'connection_success': 'Połączono z drukarką fiskalną Novitus Deon',
    'connection_failed': 'Nie można połączyć z drukarką fiskalną',
    'fiscalization_success': 'Paragon został wydrukowany fiskalnie',
    'fiscalization_failed': 'Błąd fiskalizacji paragonu',
    'drawer_opened': 'Szuflada kasowa została otwarta',
    'daily_report_success': 'Raport dobowy został wykonany',
    'printer_error': 'Błąd drukarki fiskalnej',
    'paper_low': 'Uwaga: Mało papieru w drukarce',
    'memory_full': 'Uwaga: Pamięć fiskalna zapełniona'
}

# Konfiguracja logowania
LOGGING_CONFIG = {
    'level': 'INFO',
    'file': 'fiscal_printer.log',
    'max_size': 10 * 1024 * 1024,  # 10MB
    'backup_count': 5,
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
}
