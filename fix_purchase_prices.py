#!/usr/bin/env python3
"""
Skrypt naprawy błędnych cen zakupu w systemie POS
Naprawia ceny zakupu które zostały nieprawidłowo obliczone z faktur
"""

import sqlite3
import sys
import os

def fix_purchase_prices():
    """Napraw błędne ceny zakupu na podstawie danych z faktur"""
    
    # Połącz z bazą danych
    conn = sqlite3.connect('kupony.db')
    cursor = conn.cursor()
    
    print("🔧 Rozpoczynam naprawę cen zakupu...")
    
    # Znajdź wszystkie produkty z błędnymi cenami zakupu (wyższymi od ceny sprzedaży)
    cursor.execute("""
        SELECT id, nazwa, cena_zakupu, cena 
        FROM produkty 
        WHERE cena_zakupu > cena AND cena > 0
        ORDER BY (cena_zakupu - cena) DESC
    """)
    
    problematic_products = cursor.fetchall()
    print(f"📊 Znaleziono {len(problematic_products)} produktów z podejrzanymi cenami zakupu")
    
    if not problematic_products:
        print("✅ Brak produktów do naprawy!")
        conn.close()
        return
    
    # Wyświetl top 10 najgorszych przypadków
    print("\n🚨 Top 10 najgorszych przypadków:")
    for i, product in enumerate(problematic_products[:10]):
        print(f"   {i+1}. ID:{product[0]}, {product[1][:40]}")
        print(f"      Zakup: {product[2]:.2f} zł, Sprzedaż: {product[3]:.2f} zł, Różnica: {(product[2] - product[3]):.2f} zł")
    
    # Spróbuj naprawić ceny na podstawie faktury
    fixed_count = 0
    not_found_count = 0
    
    for product in problematic_products:
        product_id = product[0]
        
        # Znajdź pozycje faktury dla tego produktu
        cursor.execute("""
            SELECT p.cena_netto, p.wartosc_brutto, p.ilosc, f.numer_faktury
            FROM faktury_zakupowe_pozycje p
            JOIN faktury_zakupowe f ON p.faktura_id = f.id
            WHERE p.produkt_id = ?
            ORDER BY f.data_faktury DESC
            LIMIT 1
        """, (product_id,))
        
        invoice_data = cursor.fetchone()
        
        if invoice_data:
            cena_netto_pozycji, wartosc_brutto_pozycji, ilosc, numer_faktury = invoice_data
            ilosc = ilosc or 1
            
            # Oblicz prawidłową cenę za sztukę
            correct_netto = (cena_netto_pozycji or 0) / ilosc
            correct_brutto = (wartosc_brutto_pozycji or 0) / ilosc
            
            # Aktualizuj w bazie
            cursor.execute("""
                UPDATE produkty 
                SET cena_zakupu_netto = ?, cena_zakupu_brutto = ?, cena_zakupu = ?
                WHERE id = ?
            """, (correct_netto, correct_brutto, correct_brutto, product_id))
            
            print(f"✅ Naprawiono ID:{product_id} - było: {product[2]:.2f} zł, jest: {correct_brutto:.2f} zł (z faktury {numer_faktury}, ilość: {ilosc})")
            fixed_count += 1
        else:
            print(f"⚠️  Nie znaleziono faktury dla produktu ID:{product_id} - {product[1][:40]}")
            not_found_count += 1
    
    # Zapisz zmiany
    conn.commit()
    conn.close()
    
    print(f"\n📊 Podsumowanie naprawy:")
    print(f"   ✅ Naprawiono: {fixed_count} produktów")
    print(f"   ⚠️  Nie znaleziono danych faktury: {not_found_count} produktów")
    print(f"   📦 Razem przetworzono: {len(problematic_products)} produktów")
    
    return fixed_count, not_found_count

if __name__ == "__main__":
    if not os.path.exists('kupony.db'):
        print("❌ Nie znaleziono pliku bazy danych 'kupony.db'")
        sys.exit(1)
    
    try:
        fix_purchase_prices()
        print("\n🎉 Naprawa zakończona pomyślnie!")
    except Exception as e:
        print(f"❌ Błąd podczas naprawy: {e}")
        sys.exit(1)
