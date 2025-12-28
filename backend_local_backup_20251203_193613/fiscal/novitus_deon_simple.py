"""
Uproszczona implementacja drukarki fiskalnej Novitus Deon - protokół binarny
Testowa wersja dla debugowania komunikacji
"""

import logging
import time
import serial
from decimal import Decimal
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class NovitusDeonError(Exception):
    """Wyjątek związany z drukarką Novitus Deon"""
    pass

class NovitusDeonPrinter:
    """
    Uproszczona implementacja drukarki fiskalnej Novitus Deon
    Używa protokołu binarnego, nie XML
    """
    
    def __init__(self, port: str = '/dev/cu.usbmodem101', baudrate: int = 9600, timeout: float = 3.0):
        """Inicjalizacja drukarki"""
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.connection = None
        self.is_connected = False
        
    def connect(self) -> bool:
        """Nawiązanie połączenia z drukarką"""
        try:
            self.connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=self.timeout
            )
            
            # Test połączenia - ping
            self.connection.write(b'\x05')  # ENQ
            time.sleep(0.5)
            
            if self.connection.in_waiting > 0:
                response = self.connection.read_all()
                if response == b'e':  # Drukarka odpowiada
                    self.is_connected = True
                    logger.info(f"Połączono z drukarką Novitus Deon na porcie {self.port}")
                    return True
            
            raise NovitusDeonError("Drukarka nie odpowiada na ping")
                
        except Exception as e:
            logger.error(f"Błąd połączenia z drukarką: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self):
        """Rozłączenie z drukarką"""
        if self.connection and self.connection.is_open:
            self.connection.close()
        self.is_connected = False
        logger.info("Rozłączono z drukarką fiskalną")
    
    def get_status(self) -> Dict:
        """Pobranie statusu drukarki"""
        if not self.is_connected:
            if not self.connect():
                return {
                    'connected': False,
                    'available': False,
                    'status': 'connection_failed',
                    'error': 'Nie można połączyć z drukarką'
                }
        
        try:
            # Ping drukarki
            self.connection.write(b'\x05')  # ENQ
            time.sleep(0.5)
            
            if self.connection.in_waiting > 0:
                response = self.connection.read_all()
                logger.info(f"Odpowiedź drukarki (hex): {response.hex()}, (raw): {response}")
                
                if response == b'e':
                    return {
                        'connected': True,
                        'available': True,
                        'status': 'ready',
                        'response': response.hex()
                    }
                else:
                    return {
                        'connected': True,
                        'available': False,
                        'status': 'error',
                        'response': response.hex()
                    }
            else:
                return {
                    'connected': False,
                    'available': False,
                    'status': 'no_response'
                }
        except Exception as e:
            logger.error(f"Błąd sprawdzania statusu: {e}")
            return {
                'connected': False,
                'available': False,
                'status': 'error',
                'error': str(e)
            }
    
    def print_fiscal_receipt(self, items: list, payment_method: str = 'gotowka', 
                           total_amount: Decimal = None, cashier: str = "Kasjer") -> Dict:
        """
        Drukowanie kompletnego paragonu fiskalnego
        Testowa implementacja - nie drukuje, tylko testuje komunikację
        """
        try:
            logger.info("🧾 Rozpoczęcie testowego druku paragonu fiskalnego")
            
            # 1. Start paragonu
            fiscal_number = self.start_receipt()
            if not fiscal_number:
                raise NovitusDeonError("Nie można rozpocząć paragonu")
            
            # 2. Dodanie pozycji
            for item in items:
                success = self.add_item(
                    item['name'], 
                    Decimal(str(item['quantity'])), 
                    Decimal(str(item['price'])), 
                    item.get('vat_rate', 23)
                )
                if not success:
                    raise NovitusDeonError(f"Nie można dodać pozycji: {item['name']}")
            
            # 3. Dodanie płatności
            if total_amount:
                success = self.add_payment(total_amount, payment_method)
                if not success:
                    raise NovitusDeonError("Nie można dodać płatności")
            
            # 4. Zakończenie paragonu
            result = self.end_receipt(total_amount, cashier)
            
            logger.info("✅ Testowy paragon fiskalny zakończony pomyślnie")
            return result
            
        except Exception as e:
            logger.error(f"❌ Błąd druku paragonu: {e}")
            # Próba anulowania w przypadku błędu
            try:
                self.cancel_receipt()
            except:
                pass
            
            return {
                'success': False,
                'error': str(e),
                'message': 'Błąd fiskalizacji paragonu'
            }
    
    def start_receipt(self) -> str:
        """Rozpoczęcie paragonu - testowa implementacja"""
        try:
            logger.info("🧾 Rozpoczynanie paragonu fiskalnego (test)")
            
            # Test ping
            ping_response = self._send_binary_command(b'\x05')  # ENQ
            
            if ping_response == b'e':
                logger.info("✅ Paragon rozpoczęty (testowo)")
                return f"NOVITUS_TEST_{int(time.time())}"
            else:
                raise NovitusDeonError(f"Ping failed: {ping_response.hex() if ping_response else 'no response'}")
                
        except Exception as e:
            logger.error(f"❌ Błąd rozpoczęcia paragonu: {e}")
            raise
    
    def add_item(self, name: str, quantity: Decimal, price: Decimal, vat_rate: int = 23) -> bool:
        """Dodanie pozycji - testowa implementacja"""
        try:
            logger.info(f"🛒 Dodawanie pozycji (test): {name}, {quantity}x{price} zł, VAT {vat_rate}%")
            
            # Test ping
            ping_response = self._send_binary_command(b'\x05')  # ENQ
            
            if ping_response == b'e':
                logger.info(f"✅ Pozycja dodana (testowo): {name}")
                return True
            else:
                logger.error(f"❌ Ping failed dla pozycji: {name}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Błąd dodania pozycji {name}: {e}")
            return False
    
    def add_payment(self, amount: Decimal, method: str = 'gotowka') -> bool:
        """Dodanie płatności - testowa implementacja"""
        try:
            logger.info(f"💳 Dodawanie płatności (test): {amount:.2f} zł ({method})")
            
            # Test ping
            ping_response = self._send_binary_command(b'\x05')  # ENQ
            
            if ping_response == b'e':
                logger.info(f"✅ Płatność dodana (testowo): {amount:.2f} zł")
                return True
            else:
                logger.error("❌ Ping failed dla płatności")
                return False
                
        except Exception as e:
            logger.error(f"❌ Błąd dodania płatności: {e}")
            return False
    
    def end_receipt(self, total_amount: Decimal = None, cashier: str = "Kasjer") -> Dict:
        """Zakończenie paragonu - testowa implementacja"""
        try:
            logger.info("🏁 Kończenie paragonu fiskalnego (test)")
            
            # Test ping
            ping_response = self._send_binary_command(b'\x05')  # ENQ
            
            if ping_response == b'e':
                logger.info("✅ Paragon zakończony pomyślnie (testowo)")
                
                return {
                    'success': True,
                    'fiscal_number': f"TEST_{int(time.time())}",
                    'total_gross': total_amount,
                    'total_net': None,
                    'total_vat': None,
                    'timestamp': datetime.now(),
                    'message': 'Testowy paragon fiskalny zakończony'
                }
            else:
                raise NovitusDeonError(f"Ping failed na końcu: {ping_response.hex() if ping_response else 'no response'}")
                
        except Exception as e:
            logger.error(f"❌ Błąd zakończenia paragonu: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now()
            }
    
    def cancel_receipt(self) -> bool:
        """Anulowanie paragonu - testowa implementacja"""
        try:
            logger.info("🚫 Anulowanie paragonu fiskalnego (test)")
            
            # Test ping
            ping_response = self._send_binary_command(b'\x05')  # ENQ
            
            if ping_response == b'e':
                logger.info("✅ Paragon anulowany pomyślnie (testowo)")
                return True
            else:
                logger.error("❌ Ping failed dla anulowania")
                return False
                
        except Exception as e:
            logger.error(f"❌ Błąd anulowania paragonu: {e}")
            return False
    
    def _send_binary_command(self, command: bytes) -> bytes:
        """Wysyłanie komendy binarnej"""
        try:
            if not self.connection or not self.connection.is_open:
                raise NovitusDeonError("Brak połączenia z drukarką")
            
            logger.info(f"Wysyłanie komendy binarnej: {command.hex()}")
            
            self.connection.write(command)
            time.sleep(0.5)
            
            if self.connection.in_waiting > 0:
                response = self.connection.read_all()
                logger.info(f"Odpowiedź drukarki (hex): {response.hex()}, (raw): {response}")
                return response
            else:
                logger.warning("Brak odpowiedzi na komendę binarną")
                return b''
                
        except Exception as e:
            logger.error(f"Błąd wysyłania komendy binarnej: {e}")
            raise

# Singleton instance
_printer_instance = None

def get_fiscal_printer(port: str = None, baudrate: int = 9600) -> NovitusDeonPrinter:
    """Pobranie instancji drukarki (singleton)"""
    global _printer_instance
    
    if _printer_instance is None:
        if port is None:
            port = '/dev/cu.usbmodem101'  # macOS default
        
        _printer_instance = NovitusDeonPrinter(port=port, baudrate=baudrate)
    
    return _printer_instance
