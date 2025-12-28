#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Skrypt do wyczyszczenia bazy danych z wszystkich produktów i powiązanych danych
"""

import sqlite3
import os
from datetime import datetime

def clean_database():
    """
    Czyści bazę danych z wszystkich produktów i powiązanych danych
    """
    db_path = 'kupony.db'
    
    if not os.path.exists(db_path):
        print(f"❌ Nie znaleziono bazy danych: {db_path}")
        return False
        
    # Utworzenie kopii zapasowej
    backup_path = f"kupony_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    
    try:
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Utworzono kopię zapasową: {backup_path}")
    except Exception as e:
        print(f"⚠️  Nie udało się utworzyć kopii zapasowej: {e}")
        response = input("Czy kontynuować bez kopii zapasowej? (tak/nie): ")
        if response.lower() not in ['tak', 'yes', 'y', 't']:
            return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Wyłącz sprawdzanie kluczy obcych podczas usuwania
        cursor.execute("PRAGMA foreign_keys = OFF")
        
        print("\n🧹 Rozpoczynam czyszczenie bazy danych...")
        
        # Lista tabel do wyczyszczenia w odpowiedniej kolejności
        # (najpierw tabele zależne, potem główne)
        tables_to_clear = [
            # Pozycje faktur i zamówień (zależne od produktów)
            'faktury_sprzedazy_pozycje',
            'faktury_zakupowe_pozycje', 
            'zamowienia_pozycje',
            'pos_transakcje_pozycje',
            'pos_pozycje_paragonu',
            'warehouse_receipt_items',
            'warehouse_issue_items',
            'transfer_items',
            
            # Główne dokumenty (faktury, zamówienia, transakcje)
            'faktury_sprzedazy',
            'faktury_zakupowe',
            'zamowienia_klientow', 
            'pos_transakcje',
            'pos_pozycje',
            'warehouse_receipts',
            'warehouse_issues',
            'warehouse_transfers',
            
            # Magazyn i ruchy magazynowe
            'pos_ruchy_magazynowe',
            'pos_magazyn',
            'inventory_movements',
            'inventory_items',
            'inventory_sessions',
            'warehouse_history',
            
            # Cenówki i ceny lokalizacji/magazynów
            'cenowki',
            'location_product_prices',
            'warehouse_product_prices',
            'cenniki_historia',
            'cenowki_historia_nazw',
            
            # Mapowania produktów
            'mapowania_produktow',
            'produkty_warianty',
            
            # Główna tabela produktów (na końcu)
            'produkty'
        ]
        
        deleted_counts = {}
        
        for table in tables_to_clear:
            try:
                # Sprawdź czy tabela istnieje
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                if not cursor.fetchone():
                    print(f"⏭️  Tabela {table} nie istnieje - pomijam")
                    continue
                
                # Policz rekordy przed usunięciem
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count_before = cursor.fetchone()[0]
                
                if count_before > 0:
                    # Usuń wszystkie rekordy z tabeli
                    cursor.execute(f"DELETE FROM {table}")
                    deleted_counts[table] = count_before
                    print(f"🗑️  {table}: usunięto {count_before} rekordów")
                else:
                    print(f"⚪ {table}: tabela już pusta")
                    
            except Exception as e:
                print(f"❌ Błąd podczas czyszczenia tabeli {table}: {e}")
        
        # Reset sekwencji ID dla tabel z auto-increment
        try:
            cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ({})".format(
                ','.join(['?' for _ in tables_to_clear])
            ), tables_to_clear)
            print("🔄 Zresetowano sekwencje ID")
        except Exception as e:
            print(f"⚠️  Nie udało się zresetować sekwencji: {e}")
        
        # Włącz z powrotem sprawdzanie kluczy obcych
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Zatwierdź wszystkie zmiany
        conn.commit()
        
        # Wykonaj VACUUM żeby zmniejszyć rozmiar bazy
        cursor.execute("VACUUM")
        
        print("\n✅ Czyszczenie bazy danych zakończone pomyślnie!")
        print("\n📊 Podsumowanie usuniętych rekordów:")
        total_deleted = 0
        for table, count in deleted_counts.items():
            print(f"   • {table}: {count}")
            total_deleted += count
        print(f"\n🎯 Łącznie usunięto: {total_deleted} rekordów")
        
        return True
        
    except Exception as e:
        print(f"❌ Błąd podczas czyszczenia bazy: {e}")
        if 'conn' in locals():
            conn.rollback()
        return False
    
    finally:
        if 'conn' in locals():
            conn.close()

def verify_cleanup():
    """
    Weryfikuje czy czyszczenie przebiegło pomyślnie
    """
    print("\n🔍 Weryfikacja czyszczenia...")
    
    try:
        conn = sqlite3.connect('kupony.db')
        cursor = conn.cursor()
        
        # Sprawdź główne tabele
        main_tables = ['produkty', 'cenowki', 'faktury_zakupowe', 'zamowienia_klientow', 'pos_transakcje']
        
        all_empty = True
        for table in main_tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"⚠️  {table}: nadal zawiera {count} rekordów")
                all_empty = False
            else:
                print(f"✅ {table}: pusta")
        
        conn.close()
        
        if all_empty:
            print("\n🎉 Baza danych jest całkowicie czysta!")
        else:
            print("\n⚠️  Niektóre tabele nadal zawierają dane")
            
        return all_empty
        
    except Exception as e:
        print(f"❌ Błąd podczas weryfikacji: {e}")
        return False

if __name__ == "__main__":
    print("🧹 CZYSZCZENIE BAZY DANYCH POS SYSTEM 🧹")
    print("=" * 50)
    print("Ten skrypt usunie WSZYSTKIE:")
    print("• Produkty")
    print("• Cenówki") 
    print("• Stany magazynowe")
    print("• Faktury zakupowe")
    print("• Faktury sprzedaży")
    print("• Zamówienia klientów")
    print("• Transakcje POS")
    print("• Ruchy magazynowe")
    print("• Ceny w lokalizacjach/magazynach")
    print("=" * 50)
    
    response = input("\nCzy na pewno chcesz kontynuować? (WPISZ: 'CZYŚĆ BAZĘ'): ")
    
    if response == "CZYŚĆ BAZĘ":
        if clean_database():
            verify_cleanup()
        else:
            print("\n❌ Czyszczenie nie powiodło się!")
    else:
        print("\n❌ Anulowano. Baza danych pozostaje niezmieniona.")
