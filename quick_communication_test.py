#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test sprawdzający czy komunikacja wróciła po przywróceniu ustawień
"""

import serial
import time

def quick_test():
    """Szybki test podstawowej komunikacji"""
    ports = ["/dev/cu.usbmodem101", "/dev/cu.usbmodem103"]
    
    print("=== SZYBKI TEST KOMUNIKACJI ===")
    
    for port in ports:
        print(f"\nTest portu: {port}")
        
        try:
            conn = serial.Serial(port, 9600, timeout=2)
            time.sleep(0.5)
            
            # Test ENQ
            conn.write(b'\x05')
            time.sleep(0.5)
            resp = conn.read(10)
            
            if resp:
                status = resp[0]
                print(f"✓ ENQ działa: 0x{status:02X}")
                
                # Test prostej komendy
                conn.write(b'\x1BP#v\x1B\\')
                time.sleep(1)
                resp2 = conn.read(100)
                
                if resp2:
                    print(f"✓ Komendy działają: {resp2.hex()[:40]}...")
                    print("🎉 KOMUNIKACJA PRZYWRÓCONA!")
                    return True
                else:
                    print("✗ Komendy nie działają")
            else:
                print("✗ Brak odpowiedzi ENQ")
            
            conn.close()
            
        except Exception as e:
            print(f"✗ Błąd: {e}")
    
    return False

if __name__ == "__main__":
    print("Szybki test komunikacji po przywróceniu ustawień")
    print("=" * 50)
    print("1. Zmień protokół z powrotem na NOVITUS ZGODNY")
    print("2. Zrestartuj drukarkę")
    print("3. Uruchom ten test")
    print()
    
    if quick_test():
        print("\n✅ Komunikacja przywrócona - możesz kontynuować testy")
    else:
        print("\n❌ Komunikacja nadal nie działa")
        print("Może być potrzebny reset do ustawień fabrycznych")
