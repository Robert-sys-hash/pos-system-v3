#!/usr/bin/env python3
"""
Skrypt debugowania struktury bazy danych
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import execute_query

def debug_database():
    print("=== DEBUG STRUKTURY BAZY DANYCH ===")
    
    # Sprawdź jakie tabele związane ze zmianami istnieją
    print("\n1. Tabele związane ze zmianami:")
    try:
        tables_sql = """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%zmian%'
        """
        tables = execute_query(tables_sql, ())
        if tables:
            for table in tables:
                print(f"   - {table['name']}")
        else:
            print("   Brak tabel ze słowem 'zmian'")
    except Exception as e:
        print(f"   Błąd: {e}")
    
    # Sprawdź wszystkie tabele POS
    print("\n2. Wszystkie tabele POS:")
    try:
        pos_tables_sql = """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE 'pos_%'
        """
        pos_tables = execute_query(pos_tables_sql, ())
        if pos_tables:
            for table in pos_tables:
                print(f"   - {table['name']}")
        else:
            print("   Brak tabel POS")
    except Exception as e:
        print(f"   Błąd: {e}")
    
    # Sprawdź strukturę pos_zmiany
    print("\n3. Struktura tabeli pos_zmiany:")
    try:
        structure = execute_query("PRAGMA table_info(pos_zmiany)", ())
        if structure:
            print("   Kolumny:")
            for col in structure:
                print(f"     {col['name']} - {col['type']} {'(PK)' if col['pk'] else ''}")
        else:
            print("   Tabela nie istnieje lub jest pusta")
            
        # Sprawdź przykładowe dane
        sample = execute_query("SELECT * FROM pos_zmiany LIMIT 2", ())
        if sample:
            print(f"   Przykładowe dane ({len(sample)} rekordów):")
            for row in sample:
                print(f"     {dict(row)}")
        else:
            print("   Brak danych w tabeli")
            
    except Exception as e:
        print(f"   Błąd: {e}")
    
    # Sprawdź pos_transakcje
    print("\n4. Struktura tabeli pos_transakcje:")
    try:
        structure = execute_query("PRAGMA table_info(pos_transakcje)", ())
        if structure:
            print("   Pierwszych 10 kolumn:")
            for col in structure[:10]:
                print(f"     {col['name']} - {col['type']}")
        else:
            print("   Tabela nie istnieje")
    except Exception as e:
        print(f"   Błąd: {e}")
    
    print("\n=== KONIEC DEBUGOWANIA ===")

if __name__ == "__main__":
    debug_database()
