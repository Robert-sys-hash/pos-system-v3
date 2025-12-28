#!/usr/bin/env python3
"""
Skrypt do naprawy nieprawidłowych cen zakupu brutto w bazie danych.
Poprawia ceny zakupu brutto na podstawie cen netto i stawki VAT.
"""

import sqlite3
import os

def fix_purchase_prices_brutto():
    """Napraw ceny zakupu brutto na podstawie cen netto i stawki VAT"""
    
    # Połącz z bazą danych
    db_path = 'backend/kupony.db'
    if not os.path.exists(db_path):
        print(f"❌ Plik bazy danych nie istnieje: {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Znajdź produkty z nieprawidłowymi cenami zakupu brutto
        cursor.execute("""
        SELECT id, nazwa, cena_zakupu_netto, cena_zakupu_brutto, stawka_vat
        FROM produkty 
        WHERE cena_zakupu_netto > 0 
        AND stawka_vat IS NOT NULL 
        AND stawka_vat > 0
        """)
        
        products = cursor.fetchall()
        print(f"🔍 Znaleziono {len(products)} produktów do sprawdzenia...")
        
        fixed_count = 0
        errors_count = 0
        
        for product in products:
            product_id, nazwa, cena_netto, cena_brutto_baza, vat_rate = product
            
            # Oblicz prawidłową cenę brutto
            if cena_netto and vat_rate:
                prawidlowa_cena_brutto = round(cena_netto * (1 + vat_rate / 100), 2)
                
                # Porównaj z ceną w bazie (z tolerancją 0.01 zł)
                if not cena_brutto_baza or abs(cena_brutto_baza - prawidlowa_cena_brutto) > 0.01:
                    print(f"🔧 Naprawiam produkt: {nazwa[:40]}")
                    print(f"   Netto: {cena_netto} zł, VAT: {vat_rate}%")
                    print(f"   Stara brutto: {cena_brutto_baza} zł")
                    print(f"   Nowa brutto: {prawidlowa_cena_brutto} zł")
                    
                    # Aktualizuj cenę w bazie
                    cursor.execute("""
                    UPDATE produkty 
                    SET cena_zakupu_brutto = ? 
                    WHERE id = ?
                    """, [prawidlowa_cena_brutto, product_id])
                    
                    fixed_count += 1
                else:
                    # Cena jest prawidłowa
                    pass
            else:
                errors_count += 1
                print(f"⚠️ Brak danych dla produktu: {nazwa} (ID: {product_id})")
        
        # Zatwierdź zmiany
        conn.commit()
        
        print(f"\n✅ Naprawiono {fixed_count} produktów")
        print(f"⚠️ Błędów: {errors_count}")
        
        # Pokaż przykłady po naprawie
        cursor.execute("""
        SELECT nazwa, cena_zakupu_netto, cena_zakupu_brutto, stawka_vat
        FROM produkty 
        WHERE cena_zakupu_netto > 0 AND cena_zakupu_brutto > 0
        LIMIT 5
        """)
        
        print("\n📊 Przykłady po naprawie:")
        print("Nazwa | Netto | Brutto | VAT")
        print("-" * 60)
        for row in cursor.fetchall():
            nazwa, netto, brutto, vat = row
            print(f"{nazwa[:30]:<30} | {netto:<6.2f} | {brutto:<7.2f} | {vat}%")
        
        return True
        
    except Exception as e:
        print(f"❌ Błąd podczas naprawy cen: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Rozpoczynam naprawę cen zakupu brutto...")
    success = fix_purchase_prices_brutto()
    if success:
        print("✅ Naprawa zakończona pomyślnie!")
    else:
        print("❌ Naprawa zakończona niepowodzeniem!")
