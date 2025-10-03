#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import serial
import time

def check_all_responses(ser):
    """Sprawdź wszystkie odpowiedzi drukarki"""
    print("🔍 SPRAWDZANIE WSZYSTKICH ODPOWIEDZI DRUKARKI")
    print("=" * 50)
    
    # 1. ENQ
    print("\n1. ENQ ($05):")
    ser.write(b'\x05')
    ser.flush()
    time.sleep(0.2)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        print(f"Odpowiedź: {response}")
        print(f"Hex: {' '.join(f'{b:02X}' for b in response)}")
        
        if len(response) > 0:
            status_byte = response[0]
            fsk = (status_byte & 0x08) >> 3
            cmd = (status_byte & 0x04) >> 2  
            par = (status_byte & 0x02) >> 1
            trf = (status_byte & 0x01)
            print(f"Status: FSK={fsk}, CMD={cmd}, PAR={par}, TRF={trf}")
    else:
        print("Brak odpowiedzi")
    
    # 2. DLE ($10) 
    print("\n2. DLE ($10):")
    ser.write(b'\x10')
    ser.flush()
    time.sleep(0.2)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        print(f"Odpowiedź: {response}")
        print(f"Hex: {' '.join(f'{b:02X}' for b in response)}")
    else:
        print("Brak odpowiedzi")
    
    # 3. DLE2 ($1A)
    print("\n3. DLE2 ($1A):")
    ser.write(b'\x1A')
    ser.flush()
    time.sleep(0.2)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        print(f"Odpowiedź: {response}")
        print(f"Hex: {' '.join(f'{b:02X}' for b in response)}")
        try:
            decoded = response.decode('ascii', errors='ignore')
            print(f"ASCII: {decoded}")
        except:
            pass
    else:
        print("Brak odpowiedzi")
    
    # 4. Komenda #n (kod błędu)
    print("\n4. Komenda #n (kod błędu):")
    command = b'\x1B\x50\x23\x6E\x1B\x5C'  # ESC P #n ESC \
    print(f"Wysyłam: {' '.join(f'{b:02X}' for b in command)}")
    ser.write(command)
    ser.flush()
    time.sleep(0.3)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        print(f"Odpowiedź: {response}")
        print(f"Hex: {' '.join(f'{b:02X}' for b in response)}")
        try:
            decoded = response.decode('ascii', errors='ignore')
            print(f"ASCII: {decoded}")
        except:
            pass
    else:
        print("Brak odpowiedzi")
    
    # 5. Komenda #s (status)
    print("\n5. Komenda #s (status kasowy):")
    command = b'\x1B\x50\x23\x73\x1B\x5C'  # ESC P #s ESC \
    print(f"Wysyłam: {' '.join(f'{b:02X}' for b in command)}")
    ser.write(command)
    ser.flush()
    time.sleep(0.3)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        print(f"Odpowiedź: {response}")
        print(f"Hex: {' '.join(f'{b:02X}' for b in response)}")
        try:
            decoded = response.decode('ascii', errors='ignore')
            print(f"ASCII: {decoded}")
        except:
            pass
    else:
        print("Brak odpowiedzi")
    
    # 6. Prosta komenda $h bez sumy kontrolnej
    print("\n6. Prosta komenda $h (bez sumy):")
    command = b'\x1B\x50\x24\x68\x1B\x5C'  # ESC P $h ESC \
    print(f"Wysyłam: {' '.join(f'{b:02X}' for b in command)}")
    ser.write(command)
    ser.flush()
    time.sleep(0.3)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        print(f"Odpowiedź: {response}")
        print(f"Hex: {' '.join(f'{b:02X}' for b in response)}")
    else:
        print("Brak odpowiedzi")
    
    # 7. Sprawdź ENQ po komendzie
    print("\n7. ENQ po komendzie $h:")
    ser.write(b'\x05')
    ser.flush()
    time.sleep(0.1)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        print(f"Odpowiedź: {response}")
        print(f"Hex: {' '.join(f'{b:02X}' for b in response)}")
        
        if len(response) > 0:
            status_byte = response[0]
            fsk = (status_byte & 0x08) >> 3
            cmd = (status_byte & 0x04) >> 2  
            par = (status_byte & 0x02) >> 1
            trf = (status_byte & 0x01)
            print(f"Status: FSK={fsk}, CMD={cmd}, PAR={par}, TRF={trf}")
    else:
        print("Brak odpowiedzi")

def main():
    port = '/dev/cu.usbmodem101'
    
    try:
        with serial.Serial(port, 9600, timeout=1) as ser:
            time.sleep(1)
            check_all_responses(ser)
                
    except Exception as e:
        print(f"Błąd: {e}")

if __name__ == "__main__":
    main()
