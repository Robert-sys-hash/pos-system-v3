#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Diagnostyka błędu transmisji z drukarką Novitus Deon
"""

import serial
import time

def test_basic_communication():
    """Test podstawowej komunikacji - minimalne komendy"""
    port = "/dev/cu.usbmodem101"
    baudrate = 9600
    
    print("=== DIAGNOSTYKA BŁĘDU TRANSMISJI ===")
    print(f"Port: {port}")
    print(f"Baudrate: {baudrate}")
    
    try:
        conn = serial.Serial(port, baudrate, timeout=3)
        time.sleep(0.5)
        
        print(f"✓ Połączenie otwarte")
        
        # Test 1: ENQ - podstawowy status
        print("\n--- Test 1: ENQ (status podstawowy) ---")
        conn.reset_input_buffer()
        conn.write(b'\x05')
        time.sleep(0.5)
        response = conn.read(10)
        if response:
            status = response[0]
            print(f"✓ ENQ status: 0x{status:02X}")
            print(f"  FSK: {(status >> 2) & 1}")
            print(f"  CMD: {(status >> 1) & 1}")
            print(f"  PAR: {status & 1}")
        else:
            print("✗ Brak odpowiedzi na ENQ")
            return
        
        # Test 2: Kod błędu
        print("\n--- Test 2: Kod błędu ---")
        conn.reset_input_buffer()
        conn.write(b'\x1BP#n\x1B\\')
        time.sleep(1)
        response = conn.read(50)
        if response:
            print(f"✓ Kod błędu: {response.hex()}")
            try:
                # Usuń ESC P i ESC \
                if response.startswith(b'\x1BP') and response.endswith(b'\x1B\\'):
                    error_data = response[2:-2]
                    error_text = error_data.decode('ascii', errors='replace')
                    print(f"  Błąd: {error_text}")
                    
                    # Interpretacja kodu błędu
                    if 'E0' in error_text:
                        print("  → Brak błędu")
                    elif 'E1' in error_text:
                        print("  → Nie zainicjowany zegar")
                    elif 'E2' in error_text:
                        print("  → Błąd bajtu kontrolnego")
                    elif 'E4' in error_text:
                        print("  → Błąd parametru")
                    elif 'E5' in error_text:
                        print("  → Błąd odczytu zegara")
                    else:
                        print(f"  → Nieznany błąd: {error_text}")
            except:
                pass
        
        # Test 3: Wersja (bezpieczna komenda)
        print("\n--- Test 3: Wersja firmware ---")
        conn.reset_input_buffer()
        conn.write(b'\x1BP#v\x1B\\')
        time.sleep(1)
        response = conn.read(100)
        if response:
            print(f"✓ Wersja: {response.hex()[:40]}...")
            try:
                if response.startswith(b'\x1BP') and response.endswith(b'\x1B\\'):
                    version_data = response[2:-2]
                    version_text = version_data.decode('ascii', errors='replace')
                    print(f"  Firmware: {version_text}")
            except:
                pass
        
        # Test 4: Reset błędów
        print("\n--- Test 4: Reset błędów ---")
        conn.reset_input_buffer()
        # Wyślij ENQ kilka razy aby wyczyścić bufor
        for i in range(3):
            conn.write(b'\x05')
            time.sleep(0.2)
            response = conn.read(10)
            if response:
                status = response[0]
                print(f"  Reset {i+1}: 0x{status:02X}")
        
        # Test 5: Sprawdź ponownie kod błędu
        print("\n--- Test 5: Kod błędu po resecie ---")
        conn.reset_input_buffer()
        conn.write(b'\x1BP#n\x1B\\')
        time.sleep(1)
        response = conn.read(50)
        if response:
            print(f"✓ Kod błędu: {response.hex()}")
            try:
                if response.startswith(b'\x1BP') and response.endswith(b'\x1B\\'):
                    error_data = response[2:-2]
                    error_text = error_data.decode('ascii', errors='replace')
                    print(f"  Błąd: {error_text}")
            except:
                pass
        
        conn.close()
        
    except Exception as e:
        print(f"✗ Błąd komunikacji: {e}")

def test_different_baudrates():
    """Test różnych prędkości transmisji"""
    port = "/dev/cu.usbmodem101"
    baudrates = [9600, 19200, 38400, 57600, 115200]
    
    print("\n=== TEST RÓŻNYCH BAUDRATES ===")
    
    for br in baudrates:
        print(f"\n--- Baudrate: {br} ---")
        try:
            conn = serial.Serial(port, br, timeout=2)
            time.sleep(0.3)
            
            # Test ENQ
            conn.reset_input_buffer()
            conn.write(b'\x05')
            time.sleep(0.3)
            response = conn.read(10)
            
            if response:
                status = response[0]
                print(f"✓ Status: 0x{status:02X}")
                
                # Test prostej komendy
                conn.reset_input_buffer()
                conn.write(b'\x1BP#n\x1B\\')
                time.sleep(0.5)
                response2 = conn.read(20)
                if response2:
                    print(f"✓ Komenda działa na {br}")
                else:
                    print(f"✗ Komenda nie działa na {br}")
            else:
                print(f"✗ Brak odpowiedzi na {br}")
            
            conn.close()
            
        except Exception as e:
            print(f"✗ Błąd na {br}: {e}")

def main():
    print("Diagnostyka błędu transmisji - Novitus Deon")
    print("=" * 50)
    
    test_basic_communication()
    test_different_baudrates()
    
    print("\n" + "=" * 50)
    print("🔧 ROZWIĄZANIA BŁĘDU TRANSMISJI:")
    print("1. Sprawdź ustawienia drukarki w menu")
    print("2. Upewnij się że protokół to 'NOVITUS ZGODNY'")
    print("3. Sprawdź prędkość transmisji (baudrate)")
    print("4. Sprawdź ustawienia kontroli przepływu")
    print("5. Spróbuj zrestartować drukarkę")

if __name__ == "__main__":
    main()
