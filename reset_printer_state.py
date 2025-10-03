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
    
    print(f"\n--- {description} ---")
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
            
            print(f"Status: FSK={fsk}, CMD={cmd}, PAR={par}, TRF={trf}")
            return {"fsk": fsk, "cmd": cmd, "par": par, "trf": trf}
    return None

def get_error_code(ser):
    command = b'\x1B\x50\x23\x6E\x1B\x5C'
    ser.write(command)
    ser.flush()
    time.sleep(0.2)
    
    if ser.in_waiting > 0:
        response = ser.read(ser.in_waiting)
        try:
            decoded = response.decode('ascii', errors='ignore')
            if b'#E' in response:
                parts = decoded.split('#E')
                if len(parts) > 1:
                    error_code = parts[1].replace('\x1b\\', '').strip()
                    return error_code
        except:
            pass
    return None

def reset_printer_state(ser):
    """Spróbuj różnych metod resetu drukarki"""
    print("\n" + "="*60)
    print("PRÓBA RESETU STANU DRUKARKI")
    print("="*60)
    
    # 1. Sprawdź początkowy status
    print("\n1. Status początkowy:")
    status = check_status_enq(ser)
    error = get_error_code(ser)
    print(f"Błąd: {error}")
    
    # 2. Anulowanie transakcji (jeśli jest w trybie transakcji)
    if status and status.get('par') == 1:
        print("\n2. Anulowanie bieżącej transakcji:")
        send_command_with_checksum(ser, "$a", "Anulowanie transakcji")
        status = check_status_enq(ser)
        error = get_error_code(ser)
        print(f"Błąd po anulowaniu: {error}")
    
    # 3. Przerwanie interpretacji (CAN)
    print("\n3. Wysyłanie CAN (przerwanie interpretacji):")
    ser.write(b'\x18')  # CAN
    ser.flush()
    time.sleep(0.5)
    status = check_status_enq(ser)
    error = get_error_code(ser)
    print(f"Błąd po CAN: {error}")
    
    # 4. Wielokrotne CAN
    print("\n4. Wielokrotne CAN:")
    for i in range(3):
        ser.write(b'\x18')
        ser.flush()
        time.sleep(0.2)
    status = check_status_enq(ser)
    error = get_error_code(ser)
    print(f"Błąd po wielokrotnym CAN: {error}")
    
    # 5. Tryb obsługi błędów 4 (bez komunikatów, automatyczne odpowiedzi)
    print("\n5. Ustawienie trybu błędów 4:")
    send_command_with_checksum(ser, "4#e", "Tryb błędów 4")
    status = check_status_enq(ser)
    error = get_error_code(ser)
    print(f"Błąd po trybie 4: {error}")
    
    # 6. Ponownie tryb 1
    print("\n6. Powrót do trybu błędów 1:")
    send_command_with_checksum(ser, "1#e", "Tryb błędów 1")
    status = check_status_enq(ser)
    error = get_error_code(ser)
    print(f"Błąd po powrocie do trybu 1: {error}")
    
    # 7. Sprawdź czy możemy teraz otworzyć paragon
    print("\n7. Test otwarcia paragonu po resecie:")
    send_command_with_checksum(ser, "$h", "Otwarcie paragonu po resecie")
    status = check_status_enq(ser)
    error = get_error_code(ser)
    print(f"Błąd po otwarciu: {error}")
    
    if error == "0" and status and status.get('cmd') == 1:
        print("✅ RESET UDANY - paragon można otworzyć!")
        return True
    else:
        print("❌ Reset nie pomógł")
        return False

def main():
    port = '/dev/cu.usbmodem101'
    
    try:
        with serial.Serial(port, 9600, timeout=1) as ser:
            time.sleep(1)
            
            success = reset_printer_state(ser)
            
            if success:
                print("\n🎉 DRUKARKA ZRESETOWANA - można kontynuować!")
            else:
                print("\n❌ Nie udało się zresetować drukarki")
                print("💡 Spróbuj fizycznie zrestartować drukarkę (wyłącz/włącz)")
                
    except Exception as e:
        print(f"Błąd: {e}")

if __name__ == "__main__":
    main()
