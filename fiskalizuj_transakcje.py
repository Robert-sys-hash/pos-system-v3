#!/usr/bin/env python3
"""
Ręczna fiskalizacja transakcji z bazy bezpośrednio na drukarce
"""

import serial
import time
import sqlite3

def send_command(ser, command, data=""):
    """Wysyła komendę do drukarki w formacie Novitus zgodny"""
    # Format: ESC P + komenda + data + kontrolka + ESC \
    full_command = f"\x1bP{command}{data}CF\x1b\\"
    
    # Wyślij as ASCII
    ser.write(full_command.encode('ascii'))
    ser.flush()
    time.sleep(0.1)
    
    print(f"✅ Wysłano: {command} + '{data}'")

def get_status(ser):
    """Pobiera status drukarki"""
    ser.write(b'\x1b\x05')  # ENQ
    time.sleep(0.1)
    response = ser.read(1)
    if response:
        status_byte = response[0]
        fsk = (status_byte >> 3) & 1
        cmd = (status_byte >> 2) & 1  
        par = (status_byte >> 1) & 1
        trf = status_byte & 1
        return f"FSK={fsk}, CMD={cmd}, PAR={par}, TRF={trf}"
    return "Brak odpowiedzi"

def fiskalizuj_transakcje_z_bazy():
    """Fiskalizuje rzeczywiste transakcje z bazy"""
    
    # Połącz z bazą
    conn = sqlite3.connect('kupony.db')
    cursor = conn.cursor()
    
    # Znajdź nieskalizowane transakcje z pozycjami
    cursor.execute("""
        SELECT DISTINCT t.id, t.numer_transakcji, t.suma_brutto
        FROM pos_transakcje t
        JOIN pos_transakcje_pozycje p ON t.id = p.transakcja_id  
        WHERE t.status = 'zakonczony' 
        AND (t.fiskalizacja = 0 OR t.fiskalizacja IS NULL)
        ORDER BY t.id DESC
        LIMIT 3
    """)
    
    transakcje = cursor.fetchall()
    
    if not transakcje:
        print("❌ Brak nieskalizowanych transakcji z pozycjami")
        return
    
    print(f"🔍 Znaleziono {len(transakcje)} transakcji do fiskalizacji")
    
    # Połącz z drukarką
    port = '/dev/cu.usbmodem101'
    ser = serial.Serial(port, 9600, timeout=1)
    
    try:
        for transakcja_id, numer, suma in transakcje:
            print(f"\n📋 TRANSAKCJA {transakcja_id}: {numer} (suma: {suma} zł)")
            
            # Pobierz pozycje transakcji
            cursor.execute("""
                SELECT pt.nazwa_produktu, pt.ilosc, pt.cena_jednostkowa, pt.wartosc_brutto
                FROM pos_transakcje_pozycje pt
                WHERE pt.transakcja_id = ?
                ORDER BY pt.id
            """, (transakcja_id,))
            
            pozycje = cursor.fetchall()
            print(f"📦 Pozycji: {len(pozycje)}")
            
            # Status początkowy
            print(f"Status początkowy: {get_status(ser)}")
            
            # 1. Początek transakcji
            send_command(ser, f"{len(pozycje)}$h", "")
            print(f"Status po otwarciu: {get_status(ser)}")
            
            # 2. Dodaj pozycje
            for i, (nazwa, ilosc, cena, wartosc) in enumerate(pozycje, 1):
                data = f"{nazwa}\r{ilosc}\rA/{cena:.2f}/{wartosc:.2f}/"
                send_command(ser, "1$l", data)
                print(f"  Pozycja {i}: {nazwa} x{ilosc} = {wartosc:.2f}")
            
            print(f"Status po pozycjach: {get_status(ser)}")
            
            # 3. Zakończ transakcję
            data = f"{suma:.2f}/{suma:.2f}/"
            send_command(ser, "1$e", data)
            
            print(f"Status końcowy: {get_status(ser)}")
            
            # Oznacz jako sfiskalizowaną w bazie
            fiscal_number = f"MANUAL_{int(time.time())}"
            cursor.execute("""
                UPDATE pos_transakcje 
                SET fiskalizacja = 1, fiscal_number = ?
                WHERE id = ?
            """, (fiscal_number, transakcja_id))
            
            print(f"✅ SFISKALIZOWANO: {fiscal_number}")
            print("-" * 50)
    
    finally:
        ser.close()
        conn.commit()
        conn.close()

if __name__ == "__main__":
    fiskalizuj_transakcje_z_bazy()
