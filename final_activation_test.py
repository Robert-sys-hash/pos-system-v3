#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ostatni test - próba różnych sposobów aktywacji drukarki
"""

import serial
import time

def final_activation_test():
    """Końcowy test różnych sposobów aktywacji"""
    port = '/dev/cu.usbmodem103'
    
    print("🚨 KOŃCOWY TEST AKTYWACJI DRUKARKI NOVITUS DEON")
    print("=" * 60)
    print("🎯 Próba 'obudzenia' drukarki różnymi metodami")
    print()
    
    activation_methods = [
        # 1. Wake-up sequences
        {
            'name': 'NULL Wake-up',
            'commands': [b'\x00' * 10, b'\x10\x04'],
            'delay': 0.5
        },
        {
            'name': 'Break Signal',
            'commands': [b'\x00\x00\x00\xFF\xFF\xFF', b'\x05'],
            'delay': 1.0
        },
        {
            'name': 'Attention Sequence',
            'commands': [b'\x1B\x1B\x1B', b'\x40', b'\x10\x04'],
            'delay': 0.3
        },
        
        # 2. Reset sequences
        {
            'name': 'Hardware Reset',
            'commands': [b'\x1B@', b'\x1A\x01', b'\x10\x04'],
            'delay': 2.0
        },
        {
            'name': 'Software Reset', 
            'commands': [b'\x1A\x40', b'\x1A\x01', b'\x05'],
            'delay': 1.0
        },
        
        # 3. Protocol-specific activation
        {
            'name': 'XML Activation',
            'commands': [b'<init/>\r\n', b'<activate/>\r\n', b'<dle_pl/>\r\n'],
            'delay': 0.5
        },
        {
            'name': 'Binary Activation',
            'commands': [b'\x1A\x01\x02\x03', b'\x10\x04\x05'],
            'delay': 0.5  
        },
    ]
    
    for method in activation_methods:
        print(f"\n🔧 Metoda: {method['name']}")
        print("-" * 30)
        
        try:
            ser = serial.Serial(port, 9600, timeout=3)
            
            # Clear buffers
            ser.reset_input_buffer()
            ser.reset_output_buffer()
            
            # Send activation sequence
            for i, cmd in enumerate(method['commands']):
                print(f"   📤 Komenda {i+1}: {repr(cmd)}")
                ser.write(cmd)
                ser.flush()
                time.sleep(method['delay'])
                
                # Check for immediate response
                if ser.in_waiting > 0:
                    response = ser.read(ser.in_waiting)
                    print(f"   📥 Natychmiastowa odpowiedź: {repr(response)}")
            
            # Wait for delayed response
            print("   ⏳ Czekam na odpowiedź...")
            time.sleep(2)
            
            total_response = b''
            if ser.in_waiting > 0:
                total_response = ser.read(ser.in_waiting)
            
            ser.close()
            
            if total_response:
                print(f"   ✅ ODPOWIEDŹ! ({len(total_response)} B)")
                print(f"   📝 Hex: {total_response.hex()}")
                print(f"   📝 Repr: {repr(total_response)}")
                
                # Try to decode
                for encoding in ['utf-8', 'windows-1250', 'ascii']:
                    try:
                        decoded = total_response.decode(encoding, errors='ignore')
                        if decoded.strip():
                            print(f"   📝 {encoding}: {repr(decoded)}")
                            break
                    except:
                        continue
                        
                print(f"\n   🎉 METODA '{method['name']}' ZADZIAŁAŁA!")
                return method['name'], total_response
            else:
                print("   ❌ Brak odpowiedzi")
                
        except Exception as e:
            print(f"   ❌ Błąd: {e}")
        
        time.sleep(1)
    
    return None, None

def test_manual_commands():
    """Test komend które użytkownik może wypróbować ręcznie"""
    print(f"\n" + "=" * 60)
    print("⌨️  KOMENDY DO RĘCZNEGO TESTOWANIA")
    print("=" * 60)
    print()
    print("Możesz spróbować następujących komend w terminalu:")
    print()
    
    manual_commands = [
        ('echo -ne "\\x10\\x04" > /dev/cu.usbmodem103', 'DLE EOT'),
        ('echo -ne "\\x05" > /dev/cu.usbmodem103', 'ENQ'), 
        ('echo -ne "\\x1B@" > /dev/cu.usbmodem103', 'ESC @'),
        ('echo -ne "<dle_pl/>\\r\\n" > /dev/cu.usbmodem103', 'XML DLE'),
        ('echo -ne "\\x00\\x00\\x00\\x10\\x04" > /dev/cu.usbmodem103', 'NULL + DLE'),
    ]
    
    for cmd, desc in manual_commands:
        print(f"📤 {desc}:")
        print(f"   {cmd}")
        print()
    
    print("💡 Aby sprawdzić odpowiedź:")
    print("   cat /dev/cu.usbmodem103")
    print()

def check_system_services():
    """Sprawdź czy jakieś usługi nie blokują portu"""
    print(f"\n" + "=" * 60)
    print("🔍 SPRAWDZANIE USŁUG SYSTEMOWYCH")
    print("=" * 60)
    
    import subprocess
    
    try:
        # Sprawdź procesy używające portu
        result = subprocess.run(['lsof', '/dev/cu.usbmodem103'], 
                              capture_output=True, text=True)
        
        if result.stdout:
            print("⚠️  PROCESY UŻYWAJĄCE PORTU:")
            print(result.stdout)
        else:
            print("✅ Żaden proces nie używa portu")
            
    except Exception as e:
        print(f"❌ Nie można sprawdzić procesów: {e}")
    
    print()
    print("💡 Jeśli jakiś proces używa portu:")
    print("   sudo kill -9 <PID>")
    print()

if __name__ == "__main__":
    print("🚨 OSTATNIA PRÓBA KOMUNIKACJI Z DRUKARKĄ")
    print("=" * 60)
    print()
    
    # Check system services
    check_system_services()
    
    # Try activation methods
    working_method, response = final_activation_test()
    
    if working_method:
        print(f"\n🎉 SUKCES! Metoda '{working_method}' zadziałała!")
        print("Możesz teraz spróbować normalnej komunikacji.")
    else:
        print(f"\n❌ WSZYSTKIE METODY NIEPOWODZENIE")
        print()
        print("🔧 OSTATECZNE ZALECENIA:")
        print("1. Sprawdź fizyczne menu drukarki - zmień protokół")
        print("2. Sprawdź instrukcję obsługi drukarki")  
        print("3. Skontaktuj się z serwisem Novitus")
        print("4. Sprawdź czy drukarka nie wymaga specjalnych sterowników")
        print("5. Spróbuj z innym kablem USB")
        
    # Manual commands
    test_manual_commands()
