#!/usr/bin/env python3
"""
Skrypt naprawczy dla błędnych cen zakupu produktów
Problem: Ceny zakupu były zapisywane jako całkowita wartość pozycji faktury zamiast ceny za sztukę
"""

import sqlite3
import sys

def fix_purchase_prices():
    """
    Naprawia błędne ceny zakupu produktów w bazie danych
    """
    conn = sqlite3.connect('kupony.db')
    cursor = conn.cursor()
    
    try:
        # Znajdź wszystkie produkty które mają błędną cenę zakupu (wyższą od sprzedaży)
        print("🔍 Szukam produktów z błędnymi cenami zakupu...")
        
        cursor.execute("""
            SELECT DISTINCT p.id, p.nazwa, p.cena_zakupu, p.cena, fzp.ilosc, fzp.wartosc_brutto, fzp.cena_netto
            FROM produkty p
            JOIN faktury_zakupowe_pozycje fzp ON p.id = fzp.produkt_id
            WHERE p.cena_zakupu > p.cena 
            AND p.cena > 0 
            AND fzp.ilosc > 0
            AND fzp.status_mapowania = 'zmapowany'
            ORDER BY p.id
        """)
        
        products_to_fix = cursor.fetchall()
        
        if not products_to_fix:
            print("✅ Nie znaleziono produktów do naprawy!")
            return
        
        print(f"📋 Znaleziono {len(products_to_fix)} produktów do naprawy:")
        
        fixed_count = 0
        
        for product in products_to_fix:
            product_id = product[0]
            nazwa = product[1]
            old_cena_zakupu = product[2]
            cena_sprzedazy = product[3]
            ilosc = product[4]
            wartosc_brutto_razem = product[5]
            cena_netto_razem = product[6]
            
            # Oblicz prawidłową cenę za sztukę
            if ilosc > 0:
                new_cena_zakupu_brutto = wartosc_brutto_razem / ilosc
                new_cena_zakupu_netto = cena_netto_razem / ilosc if cena_netto_razem else 0
                
                print(f"🔧 Produkt ID {product_id}: {nazwa[:40]}...")
                print(f"   Stara cena zakupu: {old_cena_zakupu:.2f} zł")
                print(f"   Nowa cena zakupu: {new_cena_zakupu_brutto:.2f} zł (wartość {wartosc_brutto_razem:.2f} ÷ ilość {ilosc})")
                print(f"   Cena sprzedaży: {cena_sprzedazy:.2f} zł")
                
                # Aktualizuj cenę w bazie
                cursor.execute("""
                    UPDATE produkty 
                    SET cena_zakupu_netto = ?, 
                        cena_zakupu_brutto = ?, 
                        cena_zakupu = ?
                    WHERE id = ?
                """, (new_cena_zakupu_netto, new_cena_zakupu_brutto, new_cena_zakupu_brutto, product_id))
                
                fixed_count += 1
                print(f"   ✅ Poprawiono!")
            
            print()
        
        conn.commit()
        print(f"🎉 Naprawiono ceny zakupu dla {fixed_count} produktów!")
        
        # Pokaż statystyki po naprawie
        cursor.execute("""
            SELECT COUNT(*) 
            FROM produkty 
            WHERE cena_zakupu > cena AND cena > 0
        """)
        remaining = cursor.fetchone()[0]
        
        print(f"📊 Produktów z ceną zakupu > sprzedaży: {remaining}")
        
    except Exception as e:
        print(f"❌ Błąd: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Uruchamiam naprawę cen zakupu...")
    fix_purchase_prices()
    print("✅ Zakończono!")
