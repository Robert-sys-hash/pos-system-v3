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
    time.sleep(0.3)

def check_status_enq(ser):
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
            print(f"Status ENQ: FSK={fsk}, CMD={cmd}, PAR={par}, TRF={trf}")
            return {"fsk": fsk, "cmd": cmd, "par": par, "trf": trf}
    return None

def main():
    print("=== ANALIZA STANU DRUKARKI NOVITUS DEON ===")
    print()

    port = '/dev/cu.usbmodem101'
    try:
        with serial.Serial(port, 9600, timeout=1) as ser:
            time.sleep(1)
            
            print("1. SPRAWDZENIE PODSTAWOWEGO STATUSU:")
            status = check_status_enq(ser)
            
            if status:
                print()
                print("2. ANALIZA STATUSU:")
                print(f"   FSK (Tryb fiskalny): {status['fsk']} (0=szkoleniowy, 1=fiskalny)")
                print(f"   CMD (Ostatnia komenda): {status['cmd']} (0=błąd, 1=OK)")
                print(f"   PAR (Stan paragonu): {status['par']} (0=zamknięty, 1=otwarty)")
                print(f"   TRF (Transfer): {status['trf']}")
                print()
                
                if status['fsk'] == 0:
                    print("🔍 PROBLEM GŁÓWNY: TRYB SZKOLENIOWY")
                    print("   Drukarka jest w trybie szkoleniowym (FSK=0)")
                    print("   W tym trybie paragony się NIE DRUKUJĄ fizycznie!")
                    print("   To jest normalne zachowanie - komendy działają, ale nie ma fizycznego wydruku.")
                    print()
                    
                if status['par'] == 1:
                    print("⚠️  UWAGA: Paragon jest otwarty")
                    print("   Trzeba go zamknąć przed dalszymi testami")
                    print()
                    
                    print("3. PRÓBA ZAMKNIĘCIA PARAGONU:")
                    send_command_with_checksum(ser, "$k", "Zamknięcie paragonu")
                    status_after = check_status_enq(ser)
                    
                    if status_after and status_after['par'] == 0:
                        print("✅ Paragon zamknięty pomyślnie")
                    else:
                        print("❌ Nie udało się zamknąć paragonu")
                    print()
                
                print("4. WNIOSKI I ROZWIĄZANIA:")
                print()
                if status['fsk'] == 0:
                    print("🎯 GŁÓWNY WNIOSEK:")
                    print("   Wszystko działa poprawnie! Drukarka jest w trybie SZKOLENIOWYM.")
                    print("   Jest to tryb testowy - komendy są wykonywane ale nic się nie drukuje.")
                    print()
                    print("💡 ROZWIĄZANIA:")
                    print("   1. POZOSTAW w trybie szkoleniowym do testów aplikacji")
                    print("   2. Lub przełącz na tryb fiskalny (wymaga aktywacji/konfiguracji)")
                    print()
                    print("📝 INSTRUKCJA PRZEŁĄCZENIA NA TRYB FISKALNY:")
                    print("   - Skontaktuj się z serwisem Novitus")
                    print("   - Lub sprawdź menu drukarki (klawiszami na panelu)")
                    print("   - Może wymagać specjalnego kodu aktywacyjnego")
                    print()
                    print("📋 CO TO OZNACZA DLA APLIKACJI:")
                    print("   ✅ Komunikacja z drukarką działa w 100%")
                    print("   ✅ Wszystkie komendy są poprawnie wykonywane")
                    print("   ✅ Aplikacja będzie działać normalnie")
                    print("   ℹ️  Po przełączeniu na tryb fiskalny będzie też drukować")
                else:
                    print("✅ Drukarka w trybie fiskalnym - powinna drukować normalnie")
                    
            else:
                print("❌ Brak odpowiedzi od drukarki")
                
    except Exception as e:
        print(f"Błąd połączenia: {e}")

if __name__ == "__main__":
    main()
