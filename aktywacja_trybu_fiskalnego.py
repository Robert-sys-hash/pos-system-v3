#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import serial
import time

def xor_checksum(data):
    checksum = 0xFF
    for byte in data:
        if isinstance(byte, str):
            checksum ^= ord(byte)
        else:
            checksum ^= byte
    return checksum

def send_command_with_checksum(ser, command_data, description=""):
    checksum = xor_checksum(command_data)
    checksum_str = f"{checksum:02X}"
    full_command = b'\x1B\x50' + command_data.encode('ascii') + checksum_str.encode('ascii') + b'\x1B\x5C'
    print(f"--- {description} ---")
    print(f"Komenda: {command_data}")
    ser.write(full_command)
    ser.flush()
    time.sleep(0.5)

def check_status_enq(ser):
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
            return {"fsk": fsk, "cmd": cmd, "par": par, "trf": trf}
    return None

def try_close_receipt(ser):
    """Najpierw zamknij otwarty paragon"""
    print("\n=== ZAMYKANIE OTWARTEGO PARAGONU ===")
    
    # Spróbuj różne metody zamknięcia
    close_commands = [
        ("$k", "Standardowe zamknięcie"),
        ("0$k", "Zamknięcie z zerem"),
        ("$a", "Anulowanie paragonu"),
        ("0$a", "Anulowanie z zerem"),
        ("\\$k", "Zamknięcie escape"),
    ]
    
    for cmd, desc in close_commands:
        print(f"\nPróba: {cmd}")
        send_command_with_checksum(ser, cmd, desc)
        status = check_status_enq(ser)
        
        if status and status['par'] == 0:
            print("✅ Paragon zamknięty!")
            return True
    
    print("❌ Nie udało się zamknąć paragonu")
    return False

def try_fiscal_activation(ser):
    """Próby aktywacji trybu fiskalnego"""
    print("\n=== AKTYWACJA TRYBU FISKALNEGO ===")
    
    # Lista komend do aktywacji fiskalnej
    fiscal_commands = [
        # Standardowe komendy aktywacji
        ("1#F", "Aktywacja trybu fiskalnego #F"),
        ("0#F", "Aktywacja trybu fiskalnego 0#F"),
        ("2#F", "Aktywacja trybu fiskalnego 2#F"),
        
        # Komendy aktywacji z różnymi parametrami
        ("1#A", "Aktywacja #A"),
        ("0#A", "Aktywacja 0#A"),
        ("2#A", "Aktywacja 2#A"),
        
        # Inne możliwe komendy
        ("$f", "Tryb fiskalny $f"),
        ("1$f", "Tryb fiskalny 1$f"),
        ("0$f", "Tryb fiskalny 0$f"),
        
        # Komendy konfiguracji
        ("1#T", "Konfiguracja trybu #T"),
        ("0#T", "Konfiguracja trybu 0#T"),
        
        # Możliwe komendy aktywacji online
        ("1#O", "Aktywacja online #O"),
        ("0#O", "Aktywacja online 0#O"),
        
        # Reset i przełączenie
        ("1#R", "Reset do trybu fiskalnego"),
        ("0#R", "Reset do trybu fiskalnego 0"),
    ]
    
    initial_status = check_status_enq(ser)
    if not initial_status:
        print("❌ Brak komunikacji z drukarką")
        return False
    
    print(f"Status początkowy: FSK={initial_status['fsk']}")
    
    for cmd, desc in fiscal_commands:
        print(f"\nPróba: {cmd} - {desc}")
        send_command_with_checksum(ser, cmd, desc)
        
        # Sprawdź status po komendzie
        status = check_status_enq(ser)
        if status:
            if status['fsk'] == 1:
                print("🎉 SUKCES! Tryb fiskalny aktywowany!")
                return True
            elif status['cmd'] == 0:
                print(f"   ❌ Błąd komendy (CMD=0)")
            else:
                print(f"   ⏸️ Komenda wykonana, ale FSK nadal = {status['fsk']}")
        else:
            print("   ❌ Brak odpowiedzi")
    
    return False

def check_printer_settings(ser):
    """Sprawdź ustawienia drukarki"""
    print("\n=== SPRAWDZANIE USTAWIEŃ DRUKARKI ===")
    
    # Sprawdź informacje o drukarce
    settings_commands = [
        ("0$i", "Informacje ogólne"),
        ("1$i", "Informacje szczegółowe"),
        ("2$i", "Informacje o trybie"),
        ("$s", "Status drukarki"),
        ("$v", "Wersja oprogramowania"),
    ]
    
    for cmd, desc in settings_commands:
        print(f"\n{desc} ({cmd}):")
        send_command_with_checksum(ser, cmd, desc)
        time.sleep(0.3)
        
        if ser.in_waiting > 0:
            response = ser.read(ser.in_waiting)
            try:
                decoded = response.decode('ascii', errors='ignore')
                print(f"Odpowiedź: {decoded.strip()}")
            except:
                print(f"Odpowiedź (hex): {' '.join(f'{b:02X}' for b in response)}")

def main():
    print("=== PRZEŁĄCZANIE DRUKARKI NOVITUS NA TRYB FISKALNY ===")
    print()

    port = '/dev/cu.usbmodem101'
    try:
        with serial.Serial(port, 9600, timeout=1) as ser:
            time.sleep(1)
            
            # 1. Sprawdź stan początkowy
            print("1. SPRAWDZENIE STANU POCZĄTKOWEGO:")
            initial_status = check_status_enq(ser)
            
            if not initial_status:
                print("❌ Brak komunikacji z drukarką")
                return
            
            if initial_status['fsk'] == 1:
                print("✅ Drukarka już jest w trybie fiskalnym!")
                return
            
            # 2. Zamknij otwarty paragon jeśli jest
            if initial_status['par'] == 1:
                if not try_close_receipt(ser):
                    print("⚠️ Kontynuuję mimo otwartego paragonu...")
            
            # 3. Sprawdź ustawienia drukarki
            check_printer_settings(ser)
            
            # 4. Próbuj aktywować tryb fiskalny
            if try_fiscal_activation(ser):
                print("\n🎉 SUKCES! Drukarka przełączona na tryb fiskalny!")
                
                # Sprawdź końcowy status
                final_status = check_status_enq(ser)
                if final_status:
                    print(f"Status końcowy: FSK={final_status['fsk']}")
            else:
                print("\n❌ NIEPOWODZENIE - nie udało się przełączyć na tryb fiskalny")
                print("\n💡 MOŻLIWE PRZYCZYNY:")
                print("   1. Drukarka wymaga aktywacji serwisowej")
                print("   2. Potrzebny kod aktywacyjny od Novitus")
                print("   3. Trzeba użyć menu drukarki (przyciski na panelu)")
                print("   4. Drukarka może być zablokowana w trybie demo")
                print("\n📞 ZALECENIE:")
                print("   Skontaktuj się z serwisem Novitus lub sprawdź instrukcję obsługi")
                print("   dla procedury aktywacji trybu fiskalnego.")
                
    except Exception as e:
        print(f"Błąd połączenia: {e}")

if __name__ == "__main__":
    main()
