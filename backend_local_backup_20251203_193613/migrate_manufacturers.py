#!/usr/bin/env python3
"""
Migracja bazy danych - dodanie tabeli producentów i pola uproszczonej nazwy
"""

import sqlite3
import sys
import os

def create_manufacturers_table(cursor):
    """Tworzy tabelę producentów"""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS producenci (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nazwa TEXT NOT NULL UNIQUE,
            opis TEXT,
            aktywny BOOLEAN DEFAULT 1,
            data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_modyfikacji DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✓ Tabela 'producenci' została utworzona")

def add_manufacturer_to_products(cursor):
    """Dodaje pole producent_id do tabeli products"""
    try:
        cursor.execute("ALTER TABLE products ADD COLUMN producent_id INTEGER")
        print("✓ Dodano pole 'producent_id' do tabeli products")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✓ Pole 'producent_id' już istnieje w tabeli products")
        else:
            raise e

def add_simplified_name_to_products(cursor):
    """Dodaje pole uproszczonej nazwy do tabeli products"""
    try:
        cursor.execute("ALTER TABLE products ADD COLUMN nazwa_uproszczona TEXT")
        print("✓ Dodano pole 'nazwa_uproszczona' do tabeli products")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✓ Pole 'nazwa_uproszczona' już istnieje w tabeli products")
        else:
            raise e

def create_foreign_key_index(cursor):
    """Tworzy indeks dla klucza obcego producent_id"""
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_products_producent_id 
        ON products(producent_id)
    """)
    print("✓ Indeks dla producent_id został utworzony")

def insert_default_manufacturers(cursor):
    """Wstawia domyślnych producentów"""
    default_manufacturers = [
        ('Nie określono', 'Domyślny producent dla produktów bez określonego producenta'),
        ('ALLNUTRITION', 'Suplementy diety i odżywki'),
        ('TREC NUTRITION', 'Suplementy sportowe'),
        ('OLIMP', 'Suplementy i żywność funkcjonalna'),
        ('ACTIVLAB', 'Odżywki sportowe'),
        ('BIOTECH USA', 'Suplementy sportowe'),
        ('SCITEC', 'Odżywki dla sportowców')
    ]
    
    for nazwa, opis in default_manufacturers:
        try:
            cursor.execute(
                "INSERT INTO producenci (nazwa, opis) VALUES (?, ?)",
                (nazwa, opis)
            )
        except sqlite3.IntegrityError:
            # Producent już istnieje
            pass
    
    print("✓ Dodano domyślnych producentów")

def migrate_existing_manufacturers(cursor):
    """Migruje istniejących producentów z nazw produktów"""
    print("📋 Analizuję nazwy produktów w poszukiwaniu producentów...")
    
    # Pobierz wszystkie unikalne pierwsze słowa z nazw produktów
    cursor.execute("""
        SELECT DISTINCT 
            CASE 
                WHEN INSTR(name, ' ') > 0 
                THEN SUBSTR(name, 1, INSTR(name, ' ') - 1)
                ELSE name
            END as potential_manufacturer
        FROM products 
        WHERE name IS NOT NULL AND name != ''
        ORDER BY potential_manufacturer
    """)
    
    potential_manufacturers = cursor.fetchall()
    
    known_manufacturers = [
        'ALLNUTRITION', 'TREC', 'OLIMP', 'ACTIVLAB', 'BIOTECH', 'SCITEC', 
        'MUTANT', 'BSN', 'OPTIMUM', 'DYMATIZE', 'CELLUCOR', 'NUTREX',
        'MUSCLETECH', 'UNIVERSAL', 'WEIDER', 'GOLD', 'PURE', 'PRO',
        'KEVIN', 'LEVRONE', 'REAL', 'IRON', 'MUSCLE', 'ULTIMATE'
    ]
    
    added_count = 0
    for row in potential_manufacturers:
        potential = row[0].upper()
        
        # Sprawdź czy to może być producent (więcej niż 2 znaki i w znanej liście)
        if len(potential) > 2 and any(known in potential for known in known_manufacturers):
            try:
                cursor.execute(
                    "INSERT INTO producenci (nazwa, opis) VALUES (?, ?)",
                    (potential, f"Producent zidentyfikowany automatycznie z nazw produktów")
                )
                added_count += 1
            except sqlite3.IntegrityError:
                # Producent już istnieje
                pass
    
    print(f"✓ Dodano {added_count} producentów zidentyfikowanych z nazw produktów")

def run_migration():
    """Uruchamia pełną migrację"""
    db_path = 'kupony.db'
    
    if not os.path.exists(db_path):
        print(f"❌ Nie znaleziono bazy danych: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("🚀 Rozpoczynam migrację bazy danych...")
        print("=" * 50)
        
        # Wykonaj migrację
        create_manufacturers_table(cursor)
        add_manufacturer_to_products(cursor)
        add_simplified_name_to_products(cursor)
        create_foreign_key_index(cursor)
        insert_default_manufacturers(cursor)
        migrate_existing_manufacturers(cursor)
        
        # Zatwierdź zmiany
        conn.commit()
        
        print("=" * 50)
        print("✅ Migracja zakończona pomyślnie!")
        
        # Pokaż statystyki
        cursor.execute("SELECT COUNT(*) as count FROM producenci")
        manufacturers_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) as count FROM products")
        products_count = cursor.fetchone()[0]
        
        print(f"📊 Statystyki:")
        print(f"   • Producenci: {manufacturers_count}")
        print(f"   • Produkty: {products_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Błąd podczas migracji: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    if run_migration():
        sys.exit(0)
    else:
        sys.exit(1)
