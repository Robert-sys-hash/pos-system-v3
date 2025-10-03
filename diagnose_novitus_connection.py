#!/usr/bin/env python3
"""
Diagnostyka komunikacji z drukarką Novitus Deon
Testuje różne parametry połączenia
"""

import serial
import time
import sys

def test_baudrates():
    """Test różnych szybkości transmisji"""
    baudrates = [9600, 19200, 38400, 57600, 115200, 4800, 2400, 1200]
    port = "/dev/cu.usbmodem103"  # Znaleziony port
    
    print("=== TEST RÓŻNYCH BAUDRATE ===")
    
    for baudrate in baudrates:
        print(f"\nTestowanie baudrate: {baudrate}")
        
        try:
            conn = serial.Serial(
                port=port,
                baudrate=baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=1,
                xonxoff=False,
                rtscts=False,
                dsrdtr=False
            )
            
            time.sleep(0.5)
            
            # Test ENQ
            print(f"  Wysyłanie ENQ na {baudrate}...")
            conn.write(b'\x05')
            time.sleep(0.2)
            
            response = conn.read(10)
            if response:
                print(f"  ✓ ODPOWIEDŹ na {baudrate}: {response.hex()}")
                
                # Analiza odpowiedzi
                if len(response) == 1:
                    status = ord(response)
                    print(f"    Status byte: 0x{status:02X} ({status:08b})")
            else:
                print(f"  ✗ Brak odpowiedzi na {baudrate}")
            
            conn.close()
            
        except Exception as e:
            print(f"  ✗ Błąd dla {baudrate}: {e}")

def test_different_commands():
    """Test różnych komend inicjalizujących"""
    port = "/dev/cu.usbmodem103"
    baudrate = 9600
    
    print("\n=== TEST RÓŻNYCH KOMEND ===")
    
    try:
        conn = serial.Serial(port, baudrate, timeout=2)
        time.sleep(0.5)
        
        # Lista komend do przetestowania
        commands = [
            (b'\x05', "ENQ (0x05)"),
            (b'\x10', "DLE (0x10)"),
            (b'\x06', "ACK (0x06)"),
            (b'\x15', "NAK (0x15)"),
            (b'\x04', "EOT (0x04)"),
            (b'\x02', "STX (0x02)"),
            (b'\x03', "ETX (0x03)"),
            (b'\x1b\x50\x23\x76\x55\x1b\x5c', "ESC P #v (wersja)"),
            (b'\x1b\x50\x23\x69\x4a\x1b\x5c', "ESC P #i (info)"),
            (b'\x1b\x50\x23\x73\x50\x1b\x5c', "ESC P #s (status)"),
        ]
        
        for cmd, desc in commands:
            print(f"\nTestowanie: {desc}")
            print(f"Wysyłanie: {cmd.hex()}")
            
            # Wyczyść bufor wejściowy
            conn.reset_input_buffer()
            
            # Wyślij komendę
            conn.write(cmd)
            time.sleep(0.3)
            
            # Czytaj odpowiedź
            response = conn.read(50)
            if response:
                print(f"✓ ODPOWIEDŹ: {response.hex()}")
                # Spróbuj zdekodować jako tekst
                try:
                    text = response.decode('utf-8', errors='ignore')
                    if text.isprintable():
                        print(f"  Tekst: '{text}'")
                except:
                    pass
            else:
                print("✗ Brak odpowiedzi")
        
        conn.close()
        
    except Exception as e:
        print(f"✗ Błąd testowania komend: {e}")

def test_flow_control():
    """Test różnych rodzajów kontroli przepływu"""
    port = "/dev/cu.usbmodem103"
    baudrate = 9600
    
    print("\n=== TEST KONTROLI PRZEPŁYWU ===")
    
    flow_controls = [
        (False, False, False, "Brak kontroli"),
        (True, False, False, "XON/XOFF"),
        (False, True, False, "RTS/CTS"),
        (False, False, True, "DSR/DTR"),
        (True, True, True, "Wszystkie")
    ]
    
    for xonxoff, rtscts, dsrdtr, desc in flow_controls:
        print(f"\nTestowanie: {desc}")
        
        try:
            conn = serial.Serial(
                port=port,
                baudrate=baudrate,
                timeout=1,
                xonxoff=xonxoff,
                rtscts=rtscts,
                dsrdtr=dsrdtr
            )
            
            time.sleep(0.5)
            
            # Test ENQ
            conn.write(b'\x05')
            time.sleep(0.2)
            
            response = conn.read(5)
            if response:
                print(f"  ✓ ODPOWIEDŹ: {response.hex()}")
            else:
                print(f"  ✗ Brak odpowiedzi")
            
            conn.close()
            
        except Exception as e:
            print(f"  ✗ Błąd: {e}")

def test_wake_up_sequence():
    """Test sekwencji przebudzenia drukarki"""
    port = "/dev/cu.usbmodem103"
    baudrate = 9600
    
    print("\n=== TEST SEKWENCJI PRZEBUDZENIA ===")
    
    try:
        conn = serial.Serial(port, baudrate, timeout=2)
        time.sleep(1)
        
        # Sekwencje przebudzenia
        wake_sequences = [
            (b'\x00' * 10, "10x NULL"),
            (b'\xff' * 10, "10x 0xFF"),
            (b'\x55' * 10, "10x 0x55 (pattern)"),
            (b'\xaa' * 10, "10x 0xAA (pattern)"),
            (b'\r\n' * 5, "5x CRLF"),
            (b'\x05' * 5, "5x ENQ"),
            (b'\x1b\x40', "ESC @ (reset)"),
            (b'\x1b\x21\x00', "ESC ! 0 (inicjalizacja)"),
        ]
        
        for seq, desc in wake_sequences:
            print(f"\nTestowanie sekwencji: {desc}")
            print(f"Wysyłanie: {seq.hex()}")
            
            # Wyczyść bufory
            conn.reset_input_buffer()
            conn.reset_output_buffer()
            
            # Wyślij sekwencję przebudzenia
            conn.write(seq)
            time.sleep(0.5)
            
            # Następnie wyślij ENQ
            conn.write(b'\x05')
            time.sleep(0.3)
            
            response = conn.read(20)
            if response:
                print(f"✓ ODPOWIEDŹ po {desc}: {response.hex()}")
            else:
                print(f"✗ Brak odpowiedzi po {desc}")
        
        conn.close()
        
    except Exception as e:
        print(f"✗ Błąd testowania sekwencji: {e}")

def main():
    """Główna funkcja diagnostyczna"""
    print("=== DIAGNOSTYKA POŁĄCZENIA NOVITUS DEON ===")
    
    # 1. Test różnych baudrate
    test_baudrates()
    
    # 2. Test różnych komend
    test_different_commands()
    
    # 3. Test kontroli przepływu
    test_flow_control()
    
    # 4. Test sekwencji przebudzenia
    test_wake_up_sequence()
    
    print("\n=== DIAGNOSTYKA ZAKOŃCZONA ===")
    print("Sprawdź wyniki powyżej w poszukiwaniu działających parametrów.")

if __name__ == "__main__":
    main()
