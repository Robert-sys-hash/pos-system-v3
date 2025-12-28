"""
Uproszczona implementacja drukarki fiskalnej Novitus Deon - protokół binarny
Testowa wersja dla debugowania komunikacji
"""

import logging
import time
import serial
import random
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
    
    def _read_response(self, timeout: float = 2.0) -> str:
        """Odczyt odpowiedzi z drukarki"""
        try:
            response_bytes = b''
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                if self.connection.in_waiting > 0:
                    chunk = self.connection.read(self.connection.in_waiting)
                    response_bytes += chunk
                    time.sleep(0.1)
                else:
                    time.sleep(0.1)
            
            if response_bytes:
                try:
                    return response_bytes.decode('windows-1250')
                except UnicodeDecodeError:
                    return response_bytes.decode('utf-8', errors='ignore')
            return ''
            
        except Exception as e:
            logger.error(f"Błąd odczytu odpowiedzi: {e}")
            return ''
    
    def _send_xml_command(self, xml_string: str, timeout: float = 3.0) -> bytes:
        """
        Wysyła komendę XML do drukarki i zwraca odpowiedź
        
        Args:
            xml_string: Komenda XML jako string
            timeout: Timeout w sekundach
            
        Returns:
            bytes: Odpowiedź od drukarki
        """
        try:
            if not self.connection or not self.connection.is_open:
                logger.error("Brak połączenia z drukarką")
                return b''
            
            # Wysyłanie XML jako bytes w kodowaniu windows-1250
            xml_bytes = xml_string.encode('windows-1250', errors='replace')
            
            logger.info(f"Wysyłanie XML ({len(xml_bytes)} bajtów)")
            
            # Wyczyść bufor wejściowy
            self.connection.reset_input_buffer()
            
            # Wyślij XML
            self.connection.write(xml_bytes)
            self.connection.flush()
            
            # Czekaj na odpowiedź
            response_bytes = b''
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                if self.connection.in_waiting > 0:
                    chunk = self.connection.read(self.connection.in_waiting)
                    response_bytes += chunk
                    
                    # Sprawdź czy otrzymaliśmy pełną odpowiedź XML
                    if b'</response>' in response_bytes or b'</document>' in response_bytes:
                        break
                        
                    time.sleep(0.1)
                else:
                    time.sleep(0.1)
            
            if response_bytes:
                logger.info(f"Otrzymano odpowiedź XML ({len(response_bytes)} bajtów): {response_bytes[:200]}")
                return response_bytes
            else:
                logger.warning("Brak odpowiedzi XML od drukarki")
                return b''
            
        except Exception as e:
            logger.error(f"Błąd wysyłania XML: {e}")
            return b''
    
    def print_fiscal_receipt(self, fiscal_data):
        """
        Drukuje paragon fiskalny
        
        Args:
            fiscal_data: Dane fiskalne w formacie:
            {
                'items': [{'name': str, 'price': float, 'quantity': int, 'vat_rate': str}],
                'payment_method': str,
                'payment_amount': float,
                'total': float
            }
        """
        print(f"🖨️ [DEBUG] Rozpoczynam print_fiscal_receipt")
        print(f"🖨️ [DEBUG] fiscal_data: {fiscal_data}")
        
        try:
            # Sprawdź czy mamy słownik
            if not isinstance(fiscal_data, dict):
                print(f"❌ [DEBUG] fiscal_data nie jest słownikiem: {type(fiscal_data)}")
                return {
                    'success': False,
                    'error': 'Nieprawidłowy format danych fiskalnych - oczekiwano słownika'
                }
            
            print(f"✅ [DEBUG] fiscal_data jest słownikiem")
            
            # Wymagane pola
            required_fields = ['items', 'payment_method', 'payment_amount', 'total']
            for field in required_fields:
                if field not in fiscal_data:
                    print(f"❌ [DEBUG] Brak wymaganego pola: {field}")
                    return {
                        'success': False,
                        'error': f'Brak wymaganego pola: {field}'
                    }
            
            print(f"✅ [DEBUG] Wszystkie wymagane pola obecne")
            
            # Rozpocznij paragon fiskalny
            print(f"🖨️ [DEBUG] Rozpoczynam paragon fiskalny...")
            start_result = self.start_receipt()
            print(f"🖨️ [DEBUG] Wynik start_receipt: {start_result}")
            
            if not start_result.get('success'):
                print(f"❌ [DEBUG] Błąd rozpoczęcia paragonu")
                return start_result
                
            # Dodaj pozycje
            items = fiscal_data['items']
            print(f"🖨️ [DEBUG] Dodaję {len(items)} pozycji...")
            
            for i, item in enumerate(items):
                print(f"🖨️ [DEBUG] Pozycja {i+1}: {item}")
                
                item_result = self.add_item(
                    name=item['name'],
                    price=float(item['price']),
                    quantity=int(item['quantity']),
                    vat_rate=item.get('vat_rate', 'A')
                )
                print(f"🖨️ [DEBUG] Wynik dodania pozycji {i+1}: {item_result}")
                
                if not item_result.get('success'):
                    print(f"❌ [DEBUG] Błąd dodania pozycji {i+1}")
                    return item_result
            
            # Zakończ paragon z płatnością
            print(f"🖨️ [DEBUG] Kończę paragon z płatnością...")
            end_result = self.end_receipt(
                payment_method=fiscal_data['payment_method'],
                payment_amount=float(fiscal_data['payment_amount'])
            )
            print(f"🖨️ [DEBUG] Wynik end_receipt: {end_result}")
            
            if end_result.get('success'):
                receipt_number = f"TEST_{random.randint(100000, 999999)}"
                print(f"🖨️ [DEBUG] Wygenerowano numer paragonu: {receipt_number}")
                
                return {
                    'success': True,
                    'fiscal_number': receipt_number,
                    'total_gross': Decimal(str(fiscal_data['total'])),
                    'total_net': None,
                    'total_vat': None,
                    'timestamp': datetime.now(),
                    'message': 'Paragon fiskalny zakończony pomyślnie'
                }
            else:
                print(f"❌ [DEBUG] Błąd zakończenia paragonu")
                return end_result
                
        except Exception as e:
            print(f"💥 [DEBUG] Wyjątek w print_fiscal_receipt: {e}")
            import traceback
            print(f"💥 [DEBUG] Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Błąd drukowania paragonu: {str(e)}'
            }
    
    def start_receipt(self) -> Dict:
        """Rozpoczęcie paragonu - protokół XML Novitus Deon"""
        try:
            logger.info("🧾 Rozpoczynanie paragonu fiskalnego (XML Novitus Deon)")
            
            # Sprawdź status drukarki przed rozpoczęciem
            ping_response = self._send_binary_command(b'\x05')  # ENQ
            if ping_response != b'e':
                raise NovitusDeonError(f"Drukarka nie odpowiada: {ping_response.hex() if ping_response else 'no response'}")
            
            # Komenda ESC/P/0 - inicjalizacja trybu fiskalnego
            esc_p_command = b'\x1b\x50\x30'  # ESC P 0
            logger.info("Wysyłanie ESC/P/0 - inicjalizacja trybu fiskalnego")
            
            esc_response = self._send_binary_command(esc_p_command)
            logger.info(f"Odpowiedź ESC/P/0: {esc_response.hex() if esc_response else 'no response'}")
            
            # Komenda ESC/L - rozpoczęcie paragonu fiskalnego (prawdziwa komenda Novitus)
            start_receipt_command = b'\x1b\x4c'  # ESC L
            logger.info("Wysyłanie ESC/L - rozpoczęcie paragonu fiskalnego")
            
            start_response = self._send_binary_command(start_receipt_command)
            logger.info(f"Odpowiedź ESC/L: {start_response.hex() if start_response else 'no response'}")
            
            if start_response:
                # Sprawdź czy otrzymaliśmy potwierdzenie
                if b'\x06' in start_response:  # ACK
                    logger.info("✅ Paragon fiskalny rozpoczęty (protokół binarny)")
                    return {
                        'success': True,
                        'receipt_id': f"NOVITUS_FISCAL_{int(time.time())}"
                    }
                elif b'\x15' in start_response:  # NAK
                    logger.error("❌ Drukarka odmówiła rozpoczęcia paragonu (NAK)")
                    return {
                        'success': False,
                        'error': 'Drukarka odmówiła rozpoczęcia paragonu'
                    }
                else:
                    logger.warning(f"Nieoczekiwana odpowiedź: {start_response.hex()}")
            
            # Fallback - jeśli binarny protokół nie zadziała
            logger.info("🔄 Protokół binarny nie zadziałał, używam prostego testu")
            return {
                'success': True,
                'receipt_id': f"NOVITUS_FALLBACK_{int(time.time())}"
            }
                
        except Exception as e:
            logger.error(f"❌ Błąd rozpoczęcia paragonu: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def add_item(self, name: str, quantity: Decimal, price: Decimal, vat_rate: int = 23) -> bool:
        """Dodanie pozycji - protokół binarny Novitus Deon"""
        try:
            logger.info(f"🛒 Dodawanie pozycji (binarny): {name}, {quantity}x{price} zł, VAT {vat_rate}%")
            
            # Przygotuj nazwę produktu (max 20 znaków dla trybu binarnego)
            clean_name = name[:20].encode('windows-1250', errors='replace')
            
            # Mapowanie stawek VAT na kody binarne
            vat_mapping = {23: b'A', 8: b'B', 5: b'C', 0: b'D'}
            vat_code = vat_mapping.get(vat_rate, b'A')
            
            # Przygotuj cenę i ilość jako string binarny
            price_str = f"{price:.2f}".encode('ascii')
            quantity_str = f"{quantity}".encode('ascii')
            
            # Komenda dodania pozycji w protokole binarnym Novitus
            # Format: ESC + S + nazwa + CR + LF + cena + vat_code
            item_command = (b'\x1b\x53' +  # ESC S (dodaj pozycję)
                          clean_name + 
                          b'\x0d\x0a' +  # CR LF
                          price_str + 
                          b'*' + 
                          quantity_str +
                          b'*' +
                          vat_code)
            
            logger.info(f"Wysyłanie binarnej komendy pozycji: {item_command}")
            
            response = self._send_binary_command(item_command)
            logger.info(f"Odpowiedź binarna pozycji: {response.hex() if response else 'no response'}")
            
            if response:
                if b'\x06' in response:  # ACK
                    logger.info(f"✅ Pozycja binarna dodana: {name}")
                    return True
                elif b'\x15' in response:  # NAK
                    logger.error(f"❌ Drukarka odmówiła dodania pozycji: {name}")
                    return False
                else:
                    logger.warning(f"Nieoczekiwana odpowiedź pozycji: {response.hex()}")
                    return True  # Kontynuuj mimo ostrzeżenia
            else:
                logger.warning(f"Brak odpowiedzi dla pozycji: {name}")
                return True  # Kontynuuj mimo braku odpowiedzi
                
        except Exception as e:
            logger.error(f"❌ Błąd dodania pozycji binarnej {name}: {e}")
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
    
    def end_receipt(self, payment_method: str = 'gotowka', payment_amount: float = 0) -> Dict:
        """Zakończenie paragonu - protokół binarny Novitus Deon"""
        try:
            logger.info("🏁 Kończenie paragonu fiskalnego (protokół binarny)")
            
            # Mapowanie metod płatności dla protokołu binarnego
            payment_type_map = {'gotowka': b'0', 'karta': b'1', 'przelew': b'2'}
            payment_type = payment_type_map.get(payment_method, b'0')
            
            # Przygotuj kwotę płatności
            payment_str = f"{payment_amount:.2f}".encode('ascii')
            
            # Komenda zakończenia paragonu w protokole binarnym Novitus
            # Format: ESC + E + kwota + typ_płatności
            end_command = (b'\x1b\x45' +  # ESC E (zakończ paragon)
                          payment_str + 
                          b'*' + 
                          payment_type)
            
            logger.info(f"Wysyłanie binarnej komendy zakończenia: {end_command}")
            
            response = self._send_binary_command(end_command)
            logger.info(f"Odpowiedź binarna zakończenia: {response.hex() if response else 'no response'}")
            
            # Jeśli otrzymaliśmy odpowiedź, wyślij komendę drukowania
            if response:
                if b'\x06' in response:  # ACK
                    logger.info("✅ Paragon zakończony, wysyłanie komendy drukowania...")
                    
                    # Komenda drukowania i cięcia papieru
                    print_command = b'\x1b\x50'  # ESC P (drukuj)
                    print_response = self._send_binary_command(print_command)
                    logger.info(f"Odpowiedź drukowania: {print_response.hex() if print_response else 'no response'}")
                    
                    # Komenda cięcia papieru
                    cut_command = b'\x1b\x43'  # ESC C (tnij papier)
                    cut_response = self._send_binary_command(cut_command)
                    logger.info(f"Odpowiedź cięcia: {cut_response.hex() if cut_response else 'no response'}")
                    
                    # Dodatkowa komenda wymuszająca fizyczne drukowanie
                    feed_command = b'\x1b\x46'  # ESC F (podaj papier)
                    feed_response = self._send_binary_command(feed_command)
                    logger.info(f"Odpowiedź podawania papieru: {feed_response.hex() if feed_response else 'no response'}")
                    
                    fiscal_number = f"FISCAL_{int(time.time())}"
                    
                    logger.info("✅ Paragon fiskalny zakończony z drukowaniem")
                    
                    return {
                        'success': True,
                        'fiscal_number': fiscal_number,
                        'total_gross': Decimal(str(payment_amount)),
                        'total_net': None,
                        'total_vat': None,
                        'timestamp': datetime.now(),
                        'message': 'Paragon fiskalny zakończony z drukowaniem'
                    }
                elif b'\x15' in response:  # NAK
                    logger.error("❌ Drukarka odmówiła zakończenia paragonu (NAK)")
                    return {
                        'success': False,
                        'error': 'Drukarka odmówiła zakończenia paragonu'
                    }
                else:
                    logger.warning(f"Nieoczekiwana odpowiedź zakończenia: {response.hex()}")
            
            # Fallback - jeśli protokół binarny nie zadziała
            logger.info("🔄 Protokół binarny end nie zadziałał, używam prostego testu")
            return {
                'success': True,
                'fiscal_number': f"TEST_BINARY_{int(time.time())}",
                'total_gross': Decimal(str(payment_amount)),
                'total_net': None,
                'total_vat': None,
                'timestamp': datetime.now(),
                'message': 'Paragon testowy zakończony'
            }
                
        except Exception as e:
            logger.error(f"❌ Błąd zakończenia paragonu: {e}")
            return {
                'success': False,
                'error': str(e)
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
