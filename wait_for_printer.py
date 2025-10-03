#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import serial
import time

def wait_for_printer_ready():
    """Czekaj aż drukarka będzie gotowa po restarcie"""
    print("⏳ OCZEKIWANIE NA GOTOWOŚĆ DRUKARKI PO RESTARCIE")
    print("=" * 50)
    
    ports = ['/dev/cu.usbmodem101', '/dev/cu.usbmodem103']
    
    for attempt in range(10):  # 10 prób co 5 sekund = 50 sekund
        print(f"\n🔄 Próba {attempt + 1}/10 (po {(attempt + 1) * 5} sekundach)")
        
        for port in ports:
            print(f"   Testowanie {port}...")
            
            try:
                with serial.Serial(port, 9600, timeout=1) as ser:
                    time.sleep(2)  # Dłuższa stabilizacja
                    
                    # Sprawdź czy drukarka odpowiada
                    ser.write(b'\x05')  # ENQ
                    ser.flush()
                    time.sleep(0.5)  # Dłuższe oczekiwanie
                    
                    if ser.in_waiting > 0:
                        response = ser.read(ser.in_waiting)
                        print(f"   ✅ ODPOWIEDŹ! Port: {port}")
                        print(f"   📨 Dane: {response}")
                        print(f"   📨 Hex: {' '.join(f'{b:02X}' for b in response)}")
                        
                        # Sprawdź status
                        if len(response) > 0:
                            status_byte = response[0]
                            fsk = (status_byte & 0x08) >> 3
                            cmd = (status_byte & 0x04) >> 2  
                            par = (status_byte & 0x02) >> 1
                            trf = (status_byte & 0x01)
                            print(f"   📊 Status: FSK={fsk}, CMD={cmd}, PAR={par}, TRF={trf}")
                            
                            # Jeśli drukarka odpowiada, sprawdź czy można wysyłać komendy
                            print(f"   🧪 Test komendy...")
                            command_data = "1#e"
                            checksum = 0xFF
                            for byte in command_data:
                                checksum ^= ord(byte)
                            checksum_str = f"{checksum:02X}"
                            
                            full_command = b'\x1B\x50' + command_data.encode('ascii') + checksum_str.encode('ascii') + b'\x1B\x5C'
                            ser.write(full_command)
                            ser.flush()
                            time.sleep(0.5)
                            
                            # Sprawdź status po komendzie
                            ser.write(b'\x05')
                            ser.flush()
                            time.sleep(0.2)
                            
                            if ser.in_waiting > 0:
                                response2 = ser.read(ser.in_waiting)
                                if len(response2) > 0:
                                    status_byte2 = response2[0]
                                    cmd2 = (status_byte2 & 0x04) >> 2
                                    print(f"   📊 CMD po komendzie: {cmd2}")
                                    
                                    if cmd2:
                                        print(f"   🎉 DRUKARKA GOTOWA NA PORCIE: {port}")
                                        return port
                            else:
                                print(f"   ⚠️ Drukarka odpowiada ale nie wykonuje komend")
                        
                        return port  # Zwróć port nawet jeśli tylko odpowiada na ENQ
                    else:
                        print(f"   ❌ Brak odpowiedzi na {port}")
                        
            except Exception as e:
                print(f"   ❌ Błąd {port}: {e}")
        
        if attempt < 9:  # Nie czekaj po ostatniej próbie
            print(f"   ⏳ Czekam 5 sekund przed następną próbą...")
            time.sleep(5)
    
    print("\n❌ Drukarka nie odpowiada po 50 sekundach oczekiwania")
    print("💡 Sprawdź:")
    print("   - Czy drukarka faktycznie się uruchomiła")
    print("   - Czy wyświetla się menu lub komunikaty")
    print("   - Czy nie ma błędów na wyświetlaczu")
    print("   - Czy kabel USB jest dobrze podłączony")
    return None

def main():
    working_port = wait_for_printer_ready()
    
    if working_port:
        print(f"\n✅ DRUKARKA GOTOWA NA PORCIE: {working_port}")
        print("🧾 Możesz teraz uruchomić testy drukowania paragonów")
    else:
        print("\n❌ Drukarka nie jest gotowa")

if __name__ == "__main__":
    main()
