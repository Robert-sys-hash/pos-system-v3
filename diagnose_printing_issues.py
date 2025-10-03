#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import serial
import time

def xor_checksum(data):
    """Oblicz sumę kontrolną XOR zgodnie z dokumentacją"""
    checksum = 0xFF
    for byte in data:
        if isinstance(byte, str):
            checksum ^= ord(byte)
        else:
            checksum ^= byte
    return checksum

def send_command_with_checksum(ser, command_data, description=""):
    """Wyślij komendę z sumą kontrolną XOR"""
    checksum = xor_checksum(command_data)
    checksum_str = f"{checksum:02X}"
    
    full_command = b'\x1B\x50' + command_data.encode('ascii') + checksum_str.encode('ascii') + b'\x1B\x5C'
    
    print(f"\n--- {description} ---")
    print(f"Komenda: {command_data}")
    
    ser.write(full_command)
    ser.flush()
    time.sleep(0.3)

def check_status_enq(ser):
    """Sprawdź status ENQ"""
    ser.write(b'\x05')
    ser.flush()
    time.sleep(0.1)
    
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

def get_printer_info(ser):
    """Pobierz informacje o drukarce ($i)"""
    print("\n--- Informacje o drukarce ($i) ---")
    command = b'\x1B\x50\x24\x69\x1B\x5C'  # ESC P $i ESC \
    ser.write(command)
    ser.flush()
    time.sleep(0.5)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        print(f"Odpowiedź $i: {response}")
        try:
            decoded = response.decode('ascii', errors='ignore')
            print(f"ASCII: {decoded}")
        except:
            pass
        return response
    return None

def check_paper_status(ser):
    """Sprawdź status papieru - DLE ($10)"""
    print("\n--- Status papieru (DLE) ---")
    ser.write(b'\x10')  # DLE
    ser.flush()
    time.sleep(0.1)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        if len(response) > 0:
            status_byte = response[0]
            # Format: 0111 0 ONL PE ERR
            onl = (status_byte & 0x04) >> 2  # bit 2
            pe = (status_byte & 0x02) >> 1   # bit 1  
            err = (status_byte & 0x01)       # bit 0
            
            print(f"Status DLE: ONL={onl}, PE={pe}, ERR={err} (0x{status_byte:02X})")
            print(f"  ONL (Online): {onl} ({'tak' if onl else 'nie'})")
            print(f"  PE (Brak papieru): {pe} ({'tak' if pe else 'nie'})")
            print(f"  ERR (Błąd mechanizmu): {err} ({'tak' if err else 'nie'})")
            
            return {"online": onl, "paper_empty": pe, "error": err}
    return None

def try_activate_fiscal_mode(ser):
    """Spróbuj przełączyć drukarkę w tryb fiskalny"""
    print("\n=== PRÓBA AKTYWACJI TRYBU FISKALNEGO ===")
    
    # Sprawdź status początkowy
    status = check_status_enq(ser)
    if status and status.get('fsk') == 1:
        print("✅ Drukarka już w trybie fiskalnym")
        return True
    
    print("Drukarka w trybie szkoleniowym - próba przełączenia...")
    
    # Różne komendy aktywacji trybu fiskalnego
    activation_commands = [
        "1#F",          # Komenda fiskalizacji
        "0#F",          # Alternatywna fiskalizacja
        "1#A",          # Aktywacja
        "$f",           # Fiscal mode
    ]
    
    for cmd in activation_commands:
        print(f"\nPróba: {cmd}")
        send_command_with_checksum(ser, cmd, f"Aktywacja fiskalnego: {cmd}")
        
        # Sprawdź czy się zmieniło
        time.sleep(1)
        new_status = check_status_enq(ser)
        if new_status and new_status.get('fsk') == 1:
            print(f"✅ Tryb fiskalny aktywowany komendą: {cmd}")
            return True
        else:
            print(f"❌ Komenda {cmd} nie zmieniła trybu")
    
    print("❌ Nie udało się aktywować trybu fiskalnego")
    return False

def force_receipt_close(ser):
    """Wymuś zamknięcie paragonu jeśli jest otwarty"""
    print("\n=== WYMUSZENIE ZAMKNIĘCIA PARAGONU ===")
    
    status = check_status_enq(ser)
    if not status or status.get('par') == 0:
        print("✅ Brak otwartego paragonu")
        return True
    
    print("Paragon otwarty - próba zamknięcia...")
    
    # Różne sposoby zamknięcia
    close_commands = [
        "$k",                    # Podstawowe
        "$k\r0.01/",            # Z minimalną gotówką
        "$a",                    # Anulowanie
        "0$a",                   # Anulowanie z parametrem
    ]
    
    for cmd in close_commands:
        print(f"\nPróba zamknięcia: {cmd}")
        send_command_with_checksum(ser, cmd, f"Zamknięcie: {cmd}")
        
        time.sleep(0.5)
        new_status = check_status_enq(ser)
        if new_status and new_status.get('par') == 0:
            print(f"✅ Paragon zamknięty komendą: {cmd}")
            return True
    
    print("❌ Nie udało się zamknąć paragonu")
    return False

def test_simple_print(ser):
    """Test prostego drukowania niefiskalnego"""
    print("\n=== TEST PROSTEGO DRUKOWANIA ===")
    
    # Komenda druku niefiskalnego
    print_commands = [
        "#i100.00/WPŁATA",      # Wpłata do kasy
        "#o100.00/WYPŁATA",     # Wypłata z kasy
        "$d\rTEST DRUKU\r",     # Tekst niefiskalny
    ]
    
    for cmd in print_commands:
        print(f"\nTest druku: {cmd}")
        send_command_with_checksum(ser, cmd, f"Druk: {cmd}")
        
        time.sleep(1)
        status = check_status_enq(ser)
        if status and status.get('cmd') == 1:
            print(f"✅ Komenda druku zaakceptowana: {cmd}")
            print("📄 SPRAWDŹ CZY DRUKARKA WYDRUKOWAŁA COKOLWIEK!")
            return True
        else:
            print(f"❌ Komenda druku odrzucona: {cmd}")
    
    return False

def diagnose_printer_issues(ser):
    """Kompletna diagnostyka problemów z drukowaniem"""
    print("\n" + "="*70)
    print("DIAGNOSTYKA PROBLEMÓW Z DRUKOWANIEM NOVITUS DEON")
    print("="*70)
    
    # 1. Ustaw tryb błędów
    send_command_with_checksum(ser, "1#e", "Ustawienie trybu błędów")
    
    # 2. Status podstawowy
    print("\n1. STATUS PODSTAWOWY:")
    enq_status = check_status_enq(ser)
    dle_status = check_paper_status(ser)
    
    # 3. Informacje o drukarce
    print("\n2. INFORMACJE O DRUKARCE:")
    printer_info = get_printer_info(ser)
    
    # 4. Sprawdź czy jest papier
    if dle_status:
        if dle_status.get('paper_empty'):
            print("❌ BRAK PAPIERU - to może być główny problem!")
            print("📄 Sprawdź czy w drukarce jest papier!")
        else:
            print("✅ Papier obecny")
        
        if dle_status.get('error'):
            print("❌ BŁĄD MECHANIZMU DRUKUJĄCEGO!")
            print("🔧 Sprawdź pokrywę, zacięcia papieru, mechanizm")
        else:
            print("✅ Mechanizm drukujący OK")
    
    # 5. Wymuś zamknięcie jeśli paragon otwarty
    force_receipt_close(ser)
    
    # 6. Spróbuj przełączyć w tryb fiskalny
    fiscal_activated = try_activate_fiscal_mode(ser)
    
    # 7. Test prostego drukowania
    if not fiscal_activated:
        print("\n7. TEST W TRYBIE SZKOLENIOWYM:")
        test_simple_print(ser)
    
    # 8. Test nowego paragonu w odpowiednim trybie
    print("\n8. TEST NOWEGO PARAGONU:")
    final_status = check_status_enq(ser)
    
    if final_status and final_status.get('fsk') == 1:
        print("Testowanie w trybie fiskalnym...")
    else:
        print("Testowanie w trybie szkoleniowym...")
    
    # Reset i nowy paragon
    send_command_with_checksum(ser, "$h", "Nowy paragon")
    time.sleep(0.5)
    
    send_command_with_checksum(ser, "1TEST DRUKU\r1.00/$l", "Pozycja testowa")
    time.sleep(0.5)
    
    send_command_with_checksum(ser, "$k\r1.00/", "Zamknięcie z gotówką")
    time.sleep(1)
    
    final_check = check_status_enq(ser)
    print(f"\nStatus końcowy: {final_check}")
    
    print("\n" + "="*70)
    print("SPRAWDŹ TERAZ SZUFLADĘ DRUKARKI:")
    print("📄 Czy został wydrukowany jakikolwiek paragon/dokument?")
    print("📄 Czy są błędy na wyświetlaczu drukarki?")
    print("📄 Czy drukarka ma papier?")
    print("📄 Czy pokrywa jest zamknięta?")
    print("="*70)

def main():
    port = '/dev/cu.usbmodem101'
    
    try:
        with serial.Serial(port, 9600, timeout=1) as ser:
            time.sleep(1)
            diagnose_printer_issues(ser)
            
    except Exception as e:
        print(f"Błąd: {e}")

if __name__ == "__main__":
    main()
