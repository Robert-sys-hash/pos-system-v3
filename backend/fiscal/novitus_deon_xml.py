"""
Implementacja drukarki fiskalnej Novitus Deon - protokół XML
Zgodna ze specyfikacją protokołu komunikacyjnego XML wersja 1.08 PL
"""

import serial
import time
import logging
from dataclasses import dataclass
from typing import Optional, List, Any, Dict
import json
import xml.etree.ElementTree as ET
import zlib

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@dataclass
class FiscalItem:
    name: str
    quantity: float
    price: float
    vat_rate: str = "A"  # Default VAT rate
    unit: str = "szt"
    total: Optional[float] = None

@dataclass
class FiscalTransaction:
    items: List[FiscalItem]
    payment_method: str = "gotowka"
    total_amount: float = 0.0
    transaction_id: Optional[str] = None

class NovitusDeonPrinter:
    def __init__(self, port: str = "/dev/cu.usbmodem101", baudrate: int = 9600, timeout: int = 10):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.connection = None
        self.receipt_open = False
        
    def connect(self) -> bool:
        """Connect to the fiscal printer"""
        try:
            self.connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE
            )
            logger.info(f"Connected to Novitus Deon printer on {self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to printer: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from the fiscal printer"""
        if self.connection and self.connection.is_open:
            self.connection.close()
            logger.info("Disconnected from printer")
    
    def calculate_crc32(self, data: str) -> str:
        """Calculate CRC32 checksum for XML data according to specification"""
        try:
            # Convert to Windows-1250 encoding as specified in documentation
            encoded_data = data.encode('windows-1250', errors='ignore')
            # Calculate CRC32
            crc_value = zlib.crc32(encoded_data) & 0xffffffff
            # Convert to hex string (lowercase as per examples)
            return format(crc_value, '08x').lower()
        except Exception as e:
            logger.error(f"Error calculating CRC32: {e}")
            return "00000000"
    
    def create_xml_packet(self, content: str, use_crc: bool = True) -> str:
        """Create XML packet with optional CRC32 checksum"""
        if use_crc:
            crc = self.calculate_crc32(content)
            return f'<pakiet crc="{crc}">\n{content}\n</pakiet>'
        else:
            return f'<pakiet>\n{content}\n</pakiet>'
    
    def send_xml_command(self, xml_packet: str) -> Optional[str]:
        """Send XML command to the printer and receive response"""
        if not self.connection or not self.connection.is_open:
            logger.error("Printer not connected")
            return None
        
        try:
            logger.debug(f"Sending XML packet: {xml_packet}")
            
            # Send XML packet (Windows-1250 encoding as specified)
            xml_bytes = xml_packet.encode('windows-1250', errors='ignore')
            self.connection.write(xml_bytes)
            self.connection.flush()
            
            # Wait for response
            time.sleep(1.0)
            
            # Read response
            response = b""
            start_time = time.time()
            while time.time() - start_time < self.timeout:
                if self.connection.in_waiting > 0:
                    chunk = self.connection.read(self.connection.in_waiting)
                    response += chunk
                    time.sleep(0.1)
                    
                    # Check if we have a complete XML response
                    try:
                        response_str = response.decode('windows-1250', errors='ignore')
                        if '</pakiet>' in response_str:
                            break
                    except UnicodeDecodeError:
                        continue
                else:
                    time.sleep(0.1)
            
            if response:
                response_str = response.decode('windows-1250', errors='ignore')
                logger.debug(f"Received XML response: {response_str}")
                return response_str
            else:
                logger.warning("No response received")
                return None
                
        except Exception as e:
            logger.error(f"Error sending XML command: {e}")
            return None
    
    def check_printer_status(self) -> Dict[str, Any]:
        """Check printer status using DLE command (section 1)"""
        xml_content = '<dle_pl/>'
        xml_packet = self.create_xml_packet(xml_content)
        
        response = self.send_xml_command(xml_packet)
        
        if response:
            try:
                # Parse XML response
                root = ET.fromstring(response)
                dle_pl = root.find('dle_pl')
                if dle_pl is not None:
                    return {
                        'online': dle_pl.get('online', 'nie') == 'tak',
                        'paper_out': dle_pl.get('brak_papieru', 'nie') == 'tak',
                        'device_error': dle_pl.get('blad_urzadzenia', 'nie') == 'tak'
                    }
            except ET.ParseError as e:
                logger.error(f"Error parsing status response: {e}")
        
        return {'online': False, 'paper_out': True, 'device_error': True}
    
    def start_receipt(self) -> bool:
        """Start a new fiscal receipt using XML protocol (section 7)"""
        if self.receipt_open:
            logger.warning("Receipt already open")
            return True
        
        # According to section 7: Otwarcie paragonu
        xml_content = '<paragon akcja="poczatek" tryb="online" apteczny="nie"></paragon>'
        xml_packet = self.create_xml_packet(xml_content)
        
        response = self.send_xml_command(xml_packet)
        
        if response is not None:
            self.receipt_open = True
            logger.info("Receipt started successfully")
            return True
        else:
            logger.error("Failed to start receipt")
            return False
    
    def add_item(self, item: FiscalItem) -> bool:
        """Add an item to the current receipt using XML protocol (section 12)"""
        if not self.receipt_open:
            logger.error("No receipt open - cannot add item")
            return False
        
        try:
            # Calculate total if not provided
            total = item.total if item.total is not None else item.quantity * item.price
            
            # According to section 12: Dodawanie pozycji paragonu/faktury
            xml_content = (
                f'<pozycja nazwa="{item.name}" '
                f'ilosc="{item.quantity}" '
                f'jednostka="{item.unit}" '
                f'stawka="{item.vat_rate}" '
                f'cena="{item.price:.2f}" '
                f'kwota="{total:.2f}" '
                f'recepta="" oplata="" plu="" opis="" akcja="sprzedaz">'
                f'</pozycja>'
            )
            xml_packet = self.create_xml_packet(xml_content)
            
            response = self.send_xml_command(xml_packet)
            
            if response is not None:
                logger.info(f"Added item: {item.name} - {item.quantity}x{item.price} = {total}")
                return True
            else:
                logger.error(f"Failed to add item: {item.name}")
                return False
                
        except Exception as e:
            logger.error(f"Error adding item: {e}")
            return False
    
    def add_payment(self, payment_method: str, amount: float) -> bool:
        """Add payment method using XML protocol (section 11)"""
        if not self.receipt_open:
            logger.error("No receipt open - cannot add payment")
            return False
        
        try:
            # According to section 11: Formy płatności
            xml_content = (
                f'<platnosc typ="{payment_method}" '
                f'akcja="dodaj" '
                f'wartosc="{amount:.2f}" '
                f'tryb="platnosc" kurs="" nazwa="">'
                f'</platnosc>'
            )
            xml_packet = self.create_xml_packet(xml_content)
            
            response = self.send_xml_command(xml_packet)
            
            if response is not None:
                logger.info(f"Added payment: {payment_method} - {amount}")
                return True
            else:
                logger.error(f"Failed to add payment: {payment_method}")
                return False
                
        except Exception as e:
            logger.error(f"Error adding payment: {e}")
            return False
    
    def end_receipt(self, payment_method: str = "gotowka", total_amount: float = 0.0) -> bool:
        """End the current receipt using XML protocol (section 9)"""
        if not self.receipt_open:
            logger.error("No receipt open - cannot end receipt")
            return False
        
        try:
            # Add payment if amount > 0
            if total_amount > 0:
                if not self.add_payment(payment_method, total_amount):
                    logger.error("Failed to add payment")
                    return False
            
            # According to section 9: Zamykanie paragonu
            xml_content = (
                f'<paragon akcja="zamknij" '
                f'numer_systemowy="" '
                f'numer_kasy="1" '
                f'kasjer="POS System" '
                f'kwota="{total_amount:.2f}" '
                f'oplata="" nip="">'
                f'</paragon>'
            )
            xml_packet = self.create_xml_packet(xml_content)
            
            response = self.send_xml_command(xml_packet)
            
            if response is not None:
                self.receipt_open = False
                logger.info(f"Receipt completed successfully - Total: {total_amount}, Payment: {payment_method}")
                return True
            else:
                logger.error("Failed to complete receipt")
                return False
                
        except Exception as e:
            logger.error(f"Error ending receipt: {e}")
            return False
    
    def cancel_receipt(self) -> bool:
        """Cancel the current receipt using XML protocol (section 8)"""
        if not self.receipt_open:
            logger.warning("No receipt open to cancel")
            return True
        
        try:
            # According to section 8: Anulowanie paragonu
            xml_content = '<paragon akcja="anuluj"></paragon>'
            xml_packet = self.create_xml_packet(xml_content)
            
            response = self.send_xml_command(xml_packet)
            
            if response is not None:
                self.receipt_open = False
                logger.info("Receipt cancelled successfully")
                return True
            else:
                logger.error("Failed to cancel receipt")
                return False
                
        except Exception as e:
            logger.error(f"Error cancelling receipt: {e}")
            return False
    
    def fiscalize_transaction(self, transaction: FiscalTransaction) -> Dict[str, Any]:
        """Complete fiscalization of a transaction"""
        try:
            logger.info(f"Starting fiscalization for transaction with {len(transaction.items)} items")
            
            # Check printer status first
            status = self.check_printer_status()
            if not status['online']:
                return {
                    'success': False,
                    'error': 'Printer offline',
                    'fiscal_id': None
                }
            
            # Start receipt
            if not self.start_receipt():
                return {
                    'success': False,
                    'error': 'Failed to start receipt',
                    'fiscal_id': None
                }
            
            # Add all items
            total = 0.0
            for item in transaction.items:
                if not self.add_item(item):
                    self.cancel_receipt()
                    return {
                        'success': False,
                        'error': f'Failed to add item: {item.name}',
                        'fiscal_id': None
                    }
                item_total = item.total if item.total else item.quantity * item.price
                total += item_total
            
            # End receipt with payment
            if not self.end_receipt(transaction.payment_method, total):
                return {
                    'success': False,
                    'error': 'Failed to complete receipt',
                    'fiscal_id': None
                }
            
            # Generate fiscal ID (in real implementation, this would come from printer)
            fiscal_id = f"FISCAL_{int(time.time())}"
            
            logger.info(f"Transaction fiscalized successfully: {fiscal_id}")
            return {
                'success': True,
                'error': None,
                'fiscal_id': fiscal_id,
                'total_amount': total,
                'payment_method': transaction.payment_method
            }
            
        except Exception as e:
            logger.error(f"Error during fiscalization: {e}")
            self.cancel_receipt()
            return {
                'success': False,
                'error': str(e),
                'fiscal_id': None
            }
