#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import serial
import time

def test_port_and_baudrate(port, baudrate):
    """Test konkretnego portu i baudrate"""
    print(f"\n--- Testowanie {port} @ {baudrate} ---")
    
    try:
        with serial.Serial(port, baudrate, timeout=1) as ser:
            time.sleep(1)  # Stabilizacja
            
            # Test ENQ
            ser.write(b'\x05')
            ser.flush()
            time.sleep(0.2)
            
            if ser.in_waiting > 0:
                response = ser.read(ser.in_waiting)
                print(f"✅ Odpowiedź ENQ: {response} (hex: {' '.join(f'{b:02X}' for b in response)})")
                return True
            else:
                print("❌ Brak odpowiedzi na ENQ")
                return False
                
    except Exception as e:
        print(f"❌ Błąd: {e}")
        return False

def find_working_connection():
    """Znajdź działające połączenie po restarcie"""
    print("🔍 SZUKANIE DZIAŁAJĄCEGO POŁĄCZENIA PO RESTARCIE DRUKARKI")
    print("=" * 60)
    
    # Lista portów do przetestowania
    ports = [
        '/dev/cu.usbmodem101',
        '/dev/cu.usbmodem103', 
        '/dev/cu.usbserial-110',
        '/dev/cu.usbserial-120'
    ]
    
    # Lista baudrates do przetestowania
    baudrates = [9600, 19200, 38400, 4800, 2400, 115200]
    
    working_configs = []
    
    for port in ports:
        print(f"\n🔌 Testowanie portu: {port}")
        
        for baudrate in baudrates:
            if test_port_and_baudrate(port, baudrate):
                working_configs.append((port, baudrate))
                print(f"🎉 ZNALEZIONO DZIAŁAJĄCE: {port} @ {baudrate}")
                break  # Pierwszy działający baudrate dla tego portu
    
    print(f"\n📊 PODSUMOWANIE:")
    if working_configs:
        print("✅ Znalezione działające konfiguracje:")
        for port, baudrate in working_configs:
            print(f"   - {port} @ {baudrate}")
        
        # Przetestuj najlepszą konfigurację
        best_port, best_baudrate = working_configs[0]
        test_full_communication(best_port, best_baudrate)
        
    else:
        print("❌ Nie znaleziono żadnego działającego połączenia")
        print("💡 Sprawdź:")
        print("   - Czy drukarka jest włączona")
        print("   - Czy kabel USB jest podłączony")
        print("   - Czy drukarka nie jest w trybie offline/error")

def test_full_communication(port, baudrate):
    """Przetestuj pełną komunikację z najlepszą konfiguracją"""
    print(f"\n🧪 PEŁNY TEST KOMUNIKACJI: {port} @ {baudrate}")
    print("=" * 50)
    
    try:
        with serial.Serial(port, baudrate, timeout=1) as ser:
            time.sleep(1)
            
            # 1. ENQ
            print("\n1. Test ENQ:")
            ser.write(b'\x05')
            ser.flush()
            time.sleep(0.2)
            
            if ser.in_waiting > 0:
                response = ser.read(ser.in_waiting)
                if len(response) > 0:
                    status_byte = response[0]
                    fsk = (status_byte & 0x08) >> 3
                    cmd = (status_byte & 0x04) >> 2  
                    par = (status_byte & 0x02) >> 1
                    trf = (status_byte & 0x01)
                    print(f"Status: FSK={fsk}, CMD={cmd}, PAR={par}, TRF={trf}")
                    
                    # 2. Jeśli ENQ działa, przetestuj komendę z sumą kontrolną
                    print("\n2. Test komendy z sumą kontrolną:")
                    
                    # Komenda 1#e (tryb błędów)
                    command_data = "1#e"
                    checksum = 0xFF
                    for byte in command_data:
                        checksum ^= ord(byte)
                    checksum_str = f"{checksum:02X}"
                    
                    full_command = b'\x1B\x50' + command_data.encode('ascii') + checksum_str.encode('ascii') + b'\x1B\x5C'
                    print(f"Wysyłam: {command_data} (suma: {checksum_str})")
                    
                    ser.write(full_command)
                    ser.flush()
                    time.sleep(0.3)
                    
                    # Sprawdź status po komendzie
                    ser.write(b'\x05')
                    ser.flush()
                    time.sleep(0.1)
                    
                    if ser.in_waiting > 0:
                        response2 = ser.read(ser.in_waiting)
                        if len(response2) > 0:
                            status_byte2 = response2[0]
                            cmd2 = (status_byte2 & 0x04) >> 2
                            print(f"CMD po komendzie: {cmd2} ({'OK' if cmd2 else 'błąd'})")
                            
                            if cmd2:
                                print("🎉 KOMUNIKACJA DZIAŁA! Można kontynuować testy drukowania")
                                return True
            
            print("❌ Komunikacja nie działa poprawnie")
            return False
            
    except Exception as e:
        print(f"❌ Błąd testu: {e}")
        return False

if __name__ == "__main__":
    find_working_connection()
