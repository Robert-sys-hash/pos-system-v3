#!/usr/bin/env python3
"""
Skrypt do ponownej naprawy cen zakupu produktów na podstawie faktur
Nowy algorytm: cena_brutto_za_szt = cena_netto_za_szt * (1 + VAT/100)
"""

import sqlite3
from datetime import datetime

def fix_purchase_prices_from_invoices():
    """Napraw ceny zakupu na podstawie pozycji faktur z VAT"""
    
    conn = sqlite3.connect('kupony.db')
    cursor = conn.cursor()
    
    try:
        print("🔧 Naprawiam ceny zakupu na podstawie faktur z VAT...")
        
        # Znajdź wszystkie produkty które mają zmapowane pozycje na fakturach
        cursor.execute("""
        SELECT DISTINCT
            p.produkt_id,
            p.cena_netto,
            p.stawka_vat,
            pr.nazwa,
            pr.cena_zakupu as aktualna_cena_zakupu
        FROM faktury_zakupowe_pozycje p
        JOIN produkty pr ON p.produkt_id = pr.id
        WHERE p.status_mapowania = 'zmapowany' 
        AND p.cena_netto IS NOT NULL 
        AND p.cena_netto > 0
        AND p.produkt_id IS NOT NULL
        ORDER BY p.produkt_id
        """)
        
        products_to_fix = cursor.fetchall()
        print(f"📦 Znaleziono {len(products_to_fix)} produktów do naprawy")
        
        fixed_count = 0
        
        for product in products_to_fix:
            produkt_id = product[0]
            cena_netto_za_szt = product[1]
            stawka_vat = product[2] or 0
            nazwa = product[3]
            aktualna_cena = product[4]
            
            # Oblicz prawidłową cenę zakupu brutto
            cena_zakupu_netto = cena_netto_za_szt
            cena_zakupu_brutto = cena_netto_za_szt * (1 + stawka_vat / 100)
            
            # Sprawdź czy cena wymaga poprawy
            if abs(aktualna_cena - cena_zakupu_brutto) > 0.01:
                # Aktualizuj cenę w bazie
                cursor.execute("""
                UPDATE produkty 
                SET 
                    cena_zakupu_netto = ?, 
                    cena_zakupu_brutto = ?, 
                    cena_zakupu = ?,
                    data_modyfikacji = ?
                WHERE id = ?
                """, (
                    cena_zakupu_netto,
                    cena_zakupu_brutto,
                    cena_zakupu_brutto,  # kompatybilność
                    datetime.now().isoformat(),
                    produkt_id
                ))
                
                print(f"✅ ID {produkt_id}: {nazwa[:40]}...")
                print(f"   Stara cena: {aktualna_cena:.2f} zł")
                print(f"   Nowa cena: {cena_zakupu_netto:.2f} zł (netto) + {stawka_vat}% VAT = {cena_zakupu_brutto:.2f} zł (brutto)")
                fixed_count += 1
            else:
                print(f"⚡ ID {produkt_id}: {nazwa[:40]}... - cena już prawidłowa")
        
        conn.commit()
        print(f"\n🎉 Naprawiono {fixed_count} produktów!")
        
        # Sprawdź czy pozostały jeszcze problemy
        cursor.execute("""
        SELECT COUNT(*) 
        FROM produkty 
        WHERE cena_zakupu > cena AND cena > 0
        """)
        
        remaining_issues = cursor.fetchone()[0]
        if remaining_issues > 0:
            print(f"⚠️  Uwaga: Pozostało {remaining_issues} produktów gdzie cena zakupu > cena sprzedaży")
        else:
            print("✅ Wszystkie ceny zakupu są teraz logiczne!")
            
    except Exception as e:
        print(f"❌ Błąd: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_purchase_prices_from_invoices()
