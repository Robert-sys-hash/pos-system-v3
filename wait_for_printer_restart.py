#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import serial
import time

def wait_for_printer():
    """Czeka na ponowne uruchomienie drukarki"""
    ports = ['/dev/cu.usbmodem101', '/dev/cu.usbmodem103']
    
    print("=== OCZEKIWANIE NA RESTART DRUKARKI ===")
    print("Proszę wyłączyć i włączyć drukarę...")
    print("Sprawdzanie co 2 sekundy...")
    
    for attempt in range(60):  # 2 minuty
        for port in ports:
            try:
                print(f"🔍 Próba {attempt+1}/60, port {port}")
                
                with serial.Serial(
                    port=port,
                    baudrate=9600,
                    timeout=1,
                    parity='N',
                    stopbits=1,
                    bytesize=8,
                    xonxoff=False,
                    rtscts=False,
                    dsrdtr=False
                ) as ser:
                    time.sleep(0.5)  # Krótki czas na połączenie
                    
                    # Test komenda status
                    test_cmd = b'\x05'  # ENQ
                    ser.write(test_cmd)
                    time.sleep(0.2)
                    
                    response = ser.read(100)
                    if response:
                        print(f"✅ DRUKARKA ODPOWIADA na porcie {port}!")
                        print(f"Odpowiedź: {response}")
                        return port
                        
            except Exception as e:
                pass  # Ignoruj błędy
                
        time.sleep(2)
    
    print("❌ Timeout - drukarka nie odpowiada po 2 minutach")
    return None

if __name__ == "__main__":
    working_port = wait_for_printer()
    if working_port:
        print(f"🎉 Drukarka gotowa na porcie: {working_port}")
    else:
        print("❌ Drukarka nie odpowiada")
