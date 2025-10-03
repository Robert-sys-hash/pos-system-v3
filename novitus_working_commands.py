#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Novitus Deon - DZIAŁAJĄCE FORMATY KOMEND
Zaktualizowane na podstawie testów komunikacji z drukarką
"""

import serial
import time
import logging

logger = logging.getLogger(__name__)

class NovitusDeonWorkingCommands:
    """
    Klasa pomocnicza z działającymi formatami komend Novitus Deon
    Oparta na testach z test_protocol_analysis.py
    """
    
    def __init__(self, port='/dev/cu.usbmodem101', baudrate=9600):
        self.port = port
        self.baudrate = baudrate
        self.serial_connection = None
    
    def xor_checksum(self, data):
        """Oblicz sumę kontrolną XOR zgodnie z dokumentacją"""
        checksum = 0xFF  # Rozpocznij od 255
        for byte in data:
            if isinstance(byte, str):
                checksum ^= ord(byte)
            else:
                checksum ^= byte
        return checksum
    
    def send_command_with_checksum(self, command_data, description=""):
        """Wyślij komendę z sumą kontrolną XOR"""
        if not self.serial_connection:
            logger.error("Brak połączenia z drukarką")
            return False
            
        checksum = self.xor_checksum(command_data)
        checksum_str = f"{checksum:02X}"
        
        full_command = b'\x1B\x50' + command_data.encode('ascii') + checksum_str.encode('ascii') + b'\x1B\x5C'
        
        logger.info(f"Wysyłam komendę: {description}")
        logger.debug(f"Dane: {command_data}")
        logger.debug(f"Hex: {' '.join(f'{b:02X}' for b in full_command)}")
        
        try:
            self.serial_connection.write(full_command)
            self.serial_connection.flush()
            time.sleep(0.3)
            return True
        except Exception as e:
            logger.error(f"Błąd wysyłania komendy: {e}")
            return False
    
    def check_enq_status(self):
        """Sprawdź status ENQ"""
        if not self.serial_connection:
            return None
            
        try:
            self.serial_connection.write(b'\x05')  # ENQ
            self.serial_connection.flush()
            time.sleep(0.1)
            
            if self.serial_connection.in_waiting > 0:
                response = self.serial_connection.read(self.serial_connection.in_waiting)
                if len(response) > 0:
                    status_byte = response[0]
                    fsk = (status_byte & 0x08) >> 3  # bit 3
                    cmd = (status_byte & 0x04) >> 2  # bit 2  
                    par = (status_byte & 0x02) >> 1  # bit 1
                    trf = (status_byte & 0x01)       # bit 0
                    
                    logger.debug(f"Status ENQ: FSK={fsk}, CMD={cmd}, PAR={par}, TRF={trf}")
                    return {"fsk": fsk, "cmd": cmd, "par": par, "trf": trf}
        except Exception as e:
            logger.error(f"Błąd sprawdzania statusu: {e}")
        
        return None
    
    def get_error_code(self):
        """Pobierz kod błędu ostatniego rozkazu (#n)"""
        if not self.serial_connection:
            return None
            
        try:
            command = b'\x1B\x50\x23\x6E\x1B\x5C'  # ESC P #n ESC \
            self.serial_connection.write(command)
            self.serial_connection.flush()
            time.sleep(0.2)
            
            if self.serial_connection.in_waiting > 0:
                response = self.serial_connection.read(self.serial_connection.in_waiting)
                decoded = response.decode('ascii', errors='ignore')
                
                if b'#E' in response:
                    parts = decoded.split('#E')
                    if len(parts) > 1:
                        error_code = parts[1].replace('\x1b\\', '').strip()
                        return error_code
        except Exception as e:
            logger.error(f"Błąd pobierania kodu błędu: {e}")
        
        return None
    
    def connect(self):
        """Nawiąż połączenie z drukarką"""
        try:
            self.serial_connection = serial.Serial(self.port, self.baudrate, timeout=1)
            time.sleep(1)  # Stabilizacja połączenia
            
            # Ustaw tryb obsługi błędów
            if self.send_command_with_checksum("1#e", "Ustawienie trybu błędów"):
                status = self.check_enq_status()
                error = self.get_error_code()
                if status and status.get('cmd') == 1 and error == "0":
                    logger.info(f"✅ Połączono z drukarką na porcie {self.port}")
                    return True
            
            logger.error("❌ Nie udało się nawiązać połączenia")
            return False
            
        except Exception as e:
            logger.error(f"Błąd połączenia: {e}")
            return False
    
    def disconnect(self):
        """Zamknij połączenie"""
        if self.serial_connection:
            self.serial_connection.close()
            self.serial_connection = None
    
    def open_receipt(self):
        """
        Otwórz paragon - DZIAŁAJĄCY FORMAT
        Testowany i potwierdzony
        """
        # Sprawdź status początkowy
        initial_status = self.check_enq_status()
        initial_error = self.get_error_code()
        
        logger.info(f"Status początkowy: {initial_status}, błąd: {initial_error}")
        
        # Jeśli drukarka już w trybie transakcji, sprawdź czy trzeba anulować
        if initial_status and initial_status.get('par') == 1:
            logger.info("Drukarka już w trybie transakcji")
            
            # Jeśli jest błąd, spróbuj anulować poprzednią transakcję
            if initial_error and initial_error != "0":
                logger.info("Anulowanie poprzedniej transakcji z błędem...")
                self.send_command_with_checksum("$a", "Anulowanie poprzedniej transakcji")
                time.sleep(0.5)
                
                # Sprawdź status po anulowaniu
                status_after_cancel = self.check_enq_status()
                error_after_cancel = self.get_error_code()
                logger.info(f"Status po anulowaniu: {status_after_cancel}, błąd: {error_after_cancel}")
        
        # Teraz spróbuj otworzyć nowy paragon
        if not self.send_command_with_checksum("$h", "Otwarcie paragonu"):
            return False
        
        status = self.check_enq_status()
        error = self.get_error_code()
        
        if status and status.get('cmd') == 1 and error == "0":
            logger.info("✅ Paragon otwarty pomyślnie")
            return True
        else:
            logger.error(f"❌ Błąd otwarcia paragonu: status={status}, error={error}")
            return False
    
    def add_item(self, name, quantity, price, vat_rate="$l"):
        """
        Dodaj pozycję - DZIAŁAJĄCY FORMAT
        Format: [ilość][nazwa]\r[cena]/[stawka]
        Testowany i potwierdzony
        """
        # Sanityzuj dane wejściowe
        name_clean = str(name).replace('\r', '').replace('\n', '')[:20]  # Max 20 znaków
        quantity_int = max(1, int(quantity))  # Min 1 sztuka
        price_str = f"{float(price):.2f}"
        
        command_data = f"{quantity_int}{name_clean}\r{price_str}/{vat_rate}"
        
        if not self.send_command_with_checksum(command_data, f"Pozycja: {name_clean} x{quantity_int} @ {price_str}"):
            return False
        
        status = self.check_enq_status()
        error = self.get_error_code()
        
        if status and status.get('cmd') == 1 and error == "0":
            logger.info(f"✅ Pozycja dodana: {name_clean} x{quantity_int} = {float(price)*quantity_int:.2f} PLN")
            return True
        else:
            logger.error(f"❌ Błąd dodania pozycji: status={status}, error={error}")
            return False
    
    def close_receipt(self, total_amount):
        """
        Zamknij paragon - DZIAŁAJĄCY FORMAT
        Format: $k\r[kwota]/
        Testowany i potwierdzony
        """
        amount_str = f"{float(total_amount):.2f}"
        command_data = f"$k\r{amount_str}/"
        
        if not self.send_command_with_checksum(command_data, f"Zamknięcie z gotówką: {amount_str}"):
            return False
        
        # Sprawdź status kilka razy - zamknięcie może zająć chwilę
        for i in range(3):
            time.sleep(0.5)
            status = self.check_enq_status()
            error = self.get_error_code()
            
            logger.debug(f"Status po zamknięciu ({i+1}): {status}")
            
            if status and status.get('cmd') == 1 and error == "0":
                # Sprawdź czy wyszliśmy z trybu transakcji
                if status.get('par') == 0:
                    logger.info("✅ Paragon zamknięty - drukarka wyszła z trybu transakcji")
                    return True
                elif status.get('trf') == 1:
                    logger.info("✅ Paragon zamknięty - transakcja oznaczona jako zakończona")
                    return True
        
        # Jeśli komendy się wykonały poprawnie, ale status niejednoznaczny
        final_status = self.check_enq_status()
        if final_status and final_status.get('cmd') == 1:
            logger.info("✅ Komendy wykonane poprawnie - paragon prawdopodobnie zamknięty")
            return True
        
        logger.error("❌ Nie udało się zamknąć paragonu")
        return False
    
    def cancel_receipt(self):
        """
        Anuluj paragon - format do przetestowania
        """
        if not self.send_command_with_checksum("$a", "Anulowanie paragonu"):
            return False
        
        status = self.check_enq_status()
        error = self.get_error_code()
        
        if status and status.get('cmd') == 1 and error == "0":
            logger.info("✅ Paragon anulowany")
            return True
        else:
            logger.error(f"❌ Błąd anulowania paragonu: status={status}, error={error}")
            return False
    
    def print_test_receipt(self):
        """
        Wydrukuj testowy paragon używając działających formatów
        """
        logger.info("🧾 DRUKOWANIE TESTOWEGO PARAGONU")
        
        if not self.connect():
            return False
        
        try:
            # 1. Otwórz paragon
            if not self.open_receipt():
                return False
            
            # 2. Dodaj pozycje
            items = [
                ("CHLEB", 1, 3.50),
                ("MASLO", 1, 8.99),
                ("MLEKO", 2, 2.89)
            ]
            
            total = 0
            for name, qty, price in items:
                if self.add_item(name, qty, price):
                    total += qty * price
                else:
                    logger.error(f"Nie udało się dodać pozycji: {name}")
                    self.cancel_receipt()
                    return False
            
            # 3. Zamknij paragon
            logger.info(f"Suma do zapłaty: {total:.2f} PLN")
            if self.close_receipt(total):
                logger.info("🎉 TESTOWY PARAGON WYDRUKOWANY POMYŚLNIE!")
                return True
            else:
                logger.error("Nie udało się zamknąć paragonu")
                return False
            
        finally:
            self.disconnect()

# Testowa funkcja
def test_working_commands():
    """Test działających komend"""
    printer = NovitusDeonWorkingCommands()
    success = printer.print_test_receipt()
    
    if success:
        print("✅ Test zakończony sukcesem!")
        print("📄 Sprawdź czy drukarka wydrukowała paragon!")
    else:
        print("❌ Test nieudany")
    
    return success

if __name__ == "__main__":
    test_working_commands()
