#!/usr/bin/env python3
"""
Skrypt do automatycznego wyciągania gramatur i ilości z nazw produktów
"""

import sqlite3
import re
import sys
import os

# Dodaj ścieżkę do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

def extract_weight_info(product_name):
    """
    Wyciąga informacje o wadze/ilości z nazwy produktu
    Zwraca tuple: (gramatura, ilosc_jednostek, jednostka_wagi)
    """
    if not product_name:
        return None, None, 'gramy'
    
    name = product_name.upper()
    
    # Lista produktów które naturalnie sprzedają się per sztuka
    # (nawet jeśli nie mają w nazwie "szt")
    piece_products = [
        'SHAKER', 'SZEJKER', 'BUTELKA', 'KUBEK', 'BIDON', 'TERMOS',
        'RĘKAWICE', 'REKAWICE', 'GLOVES', 'TACA', 'KOSZYK', 'MATA',
        'RĘCZNIK', 'RECZNIK', 'TOWEL', 'OPASKA', 'PASEK', 'BELT',
        'KOSZULKA', 'T-SHIRT', 'TSHIRT', 'BLUZKA', 'SPODENKI', 'SHORTS',
        'LEGINSY', 'SPODNIE', 'CZAPKA', 'HAT', 'CAP', 'TORBA', 'BAG',
        'PLECAK', 'BACKPACK', 'SASZETKA', 'BRANSOLETKA', 'NASZYJNIK',
        'KOLCZYKI', 'PIERŚCIONEK', 'ZEGAREK', 'WATCH', 'OKULARY',
        'SUNGLASSES', 'SŁUCHAWKI', 'HEADPHONES', 'POWERBANK', 'ŁADOWARKA',
        'CHARGER', 'KABEL', 'CABLE', 'ADAPTER', 'PENDRIVE', 'MYSZKA',
        'MOUSE', 'KLAWIATURA', 'KEYBOARD', 'PAD', 'PODKŁADKA'
    ]
    
    # Wzorce dla gramatur/objętości - bardziej elastyczne
    weight_patterns = [
        # Gramy - 390 g, 360g, 908 g, 500G (ale nie mg!)
        (r'(\d+(?:\.\d+)?)\s*[gG](?![mM])(?:\s|$|[^\w])', 'gramy'),
        (r'(\d+(?:\.\d+)?)(?:[gG])(?![mM])(?:\s|$|[^\w])', 'gramy'),
        
        # ML/ml - 500 ml, 250ml, 100ML, 50mL (przyklejone i z spacją)
        (r'(\d+(?:\.\d+)?)\s*(?:ml|ML|mL|Ml)(?:\s|$|[^\w])', 'ml'),
        (r'(\d+(?:\.\d+)?)(?:ml|ML|mL|Ml)(?:\s|$|[^\w])', 'ml'),
        
        # Miligramy - 500 mg, 250mg, 100MG
        (r'(\d+(?:\.\d+)?)\s*(?:mg|MG|mG|Mg)(?:\s|$|[^\w])', 'mg'),
        (r'(\d+(?:\.\d+)?)(?:mg|MG|mG|Mg)(?:\s|$|[^\w])', 'mg'),
        
        # Kilogramy - 2.5 kg, 1kg, 2KG
        (r'(\d+(?:\.\d+)?)\s*(?:kg|KG|kG|Kg)(?:\s|$|[^\w])', 'kg'),
        (r'(\d+(?:\.\d+)?)(?:kg|KG|kG|Kg)(?:\s|$|[^\w])', 'kg'),
    ]
    
    # Wzorce dla ilości tabletek/kapsułek - bardziej elastyczne
    quantity_patterns = [
        # Tabletki - tabletek, tablet (z przestrzenią - długa forma, case insensitive)
        (r'(\d+)\s+(?:tabletek|tablet|TABLETEK|TABLET)\b', 'tabletki'),
        
        # Tabletki - tab, tabs, TAB, TABS, tabl, table (przyklejone i z spacją)
        (r'(\d+)\s*(?:tab|tabs|TAB|TABS|tabl|table|TABLE|Tabl|Tab|Tabs|Table)(?:\s|$|[^\w])', 'tabletki'),
        (r'(\d+)(?:tab|tabs|TAB|TABS|tabl|table|TABLE|Tab|Tabs|Tabl|Table)(?:\s|$|[^\w])', 'tabletki'),
        
        # Kapsułki - caps, kap, kaps, CAP, CAPS, KAP, KAPS (przyklejone i z spacją)
        (r'(\d+)\s*(?:caps|kap|kaps|CAP|CAPS|KAP|KAPS|kapsułek|kapsulek|kapsul|KAPSUŁEK|KAPSULEK|KAPSUL)(?:\s|$|[^\w])', 'kapsułki'),
        (r'(\d+)(?:caps|kap|kaps|CAP|CAPS|KAP|KAPS)(?:\s|$|[^\w])', 'kapsułki'),
        
        # Saszetki - sasz, SASZ, saszetek
        (r'(\d+)\s*(?:sasz|SASZ|saszetek|saszetka|Sasz)(?:\s|$|[^\w])', 'saszetki'),
        (r'(\d+)(?:sasz|SASZ)(?:\s|$|[^\w])', 'saszetki'),
        
        # Sztuki - szt, SZT, sztuka, sztuk, sztuki (używamy \b dla granic słów)
        (r'(\d+)\s*(?:szt|SZT|sztuka|sztuk|sztuki|Szt|Sztuka|Sztuk|Sztuki)\b', 'sztuki'),
        (r'(\d+)(?:szt|SZT|Szt)\b', 'sztuki'),
    ]
    
    gramatura = None
    ilosc_jednostek = None
    jednostka_wagi = 'nieustawiono'  # domyślnie nieustawiono
    
    # Sprawdź wzorce wagi
    for pattern, unit in weight_patterns:
        match = re.search(pattern, name)
        if match:
            value = float(match.group(1))
            
            # Konwertuj do gramów dla łatwiejszego przeliczania
            if unit == 'kg':
                gramatura = value * 1000  # kg -> g
                jednostka_wagi = 'gramy'
            elif unit == 'mg':
                gramatura = value / 1000  # mg -> g
                jednostka_wagi = 'gramy'
            else:
                gramatura = value
                jednostka_wagi = unit
            break
    
    # Sprawdź wzorce ilości
    for pattern, unit in quantity_patterns:
        match = re.search(pattern, name)
        if match:
            ilosc_jednostek = int(match.group(1))
            jednostka_wagi = unit
            break
    
    # Jeśli nie znaleziono ani wagi ani ilości, sprawdź czy produkt
    # naturalnie sprzedaje się per sztuka
    if gramatura is None and ilosc_jednostek is None:
        for piece_product in piece_products:
            if piece_product in name:
                # Ustaw domyślnie 1 sztukę (może być później nadpisane ręcznie)
                ilosc_jednostek = 1
                jednostka_wagi = 'sztuki'
                break
    
    return gramatura, ilosc_jednostek, jednostka_wagi

def update_products_with_extracted_data():
    """
    Aktualizuje produkty z wyciągniętymi danymi
    """
    conn = sqlite3.connect('kupony.db')
    conn.row_factory = sqlite3.Row
    
    try:
        cursor = conn.cursor()
        
        # Pobierz wszystkie produkty które nie były jeszcze przetworzone
        cursor.execute("""
            SELECT id, nazwa FROM produkty 
            WHERE gramatura_extracted = 0 OR gramatura_extracted IS NULL
        """)
        
        products = cursor.fetchall()
        
        print(f"Znaleziono {len(products)} produktów do przetworzenia...")
        
        updated_count = 0
        for product in products:
            product_id = product['id']
            product_name = product['nazwa']
            
            gramatura, ilosc_jednostek, jednostka_wagi = extract_weight_info(product_name)
            
            if gramatura is not None or ilosc_jednostek is not None:
                cursor.execute("""
                    UPDATE produkty SET 
                        gramatura = ?,
                        ilosc_jednostek = ?,
                        jednostka_wagi = ?,
                        gramatura_extracted = 1,
                        data_modyfikacji = datetime('now')
                    WHERE id = ?
                """, [gramatura, ilosc_jednostek, jednostka_wagi, product_id])
                
                print(f"✅ {product_name}")
                print(f"   Gramatura: {gramatura} | Ilość: {ilosc_jednostek} | Jednostka: {jednostka_wagi}")
                updated_count += 1
            else:
                # Oznacz jako przetworzony bez wyciągniętych danych
                cursor.execute("""
                    UPDATE produkty SET 
                        gramatura_extracted = 1,
                        data_modyfikacji = datetime('now')
                    WHERE id = ?
                """, [product_id])
        
        conn.commit()
        print(f"\n🎉 Zaktualizowano {updated_count} produktów z {len(products)} przetworzonych.")
        
    except Exception as e:
        print(f"❌ Błąd: {e}")
        conn.rollback()
    finally:
        conn.close()

def test_extraction():
    """
    Test funkcji wyciągania na przykładowych nazwach
    """
    test_names = [
        "ALLNUTRITION CRE7 390 g LEMON",
        "ALLNUTRITION WHEY ULTRA 908 g BANANA", 
        "SFD D3 + K2 90 tabl",
        "Witamina C 1000mg 60 kaps",
        "Omega-3 500ml",
        "Kreatyna Monohydrat 2.5 kg",
        "Magnez B6 100 mg 30 tabletek"
    ]
    
    print("=== TEST WYCIĄGANIA DANYCH ===")
    for name in test_names:
        print(f"Analizuję: {name}")
        print(f"Wielkie litery: {name.upper()}")
        
        # Sprawdź wzorce ręcznie
        import re
        name_upper = name.upper()
        
        tablet_patterns = [
            r'(\d+)\s*(?:TABL[^\w]|TABLETEK|TABLET(?:[^K]|$))',
            r'(\d+)\s*TABL\b',
            r'(\d+)\s*TABL(?:\s|$)',
        ]
        
        for pattern in tablet_patterns:
            match = re.search(pattern, name_upper)
            if match:
                print(f"  ✅ Pattern '{pattern}' matched: {match.group(0)} -> {match.group(1)}")
            else:
                print(f"  ❌ Pattern '{pattern}' nie pasuje")
        
        gramatura, ilosc, jednostka = extract_weight_info(name)
        print(f"  WYNIK: Gramatura: {gramatura}, Ilość: {ilosc}, Jednostka: {jednostka}")
        print()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        test_extraction()
    else:
        print("=== EKSTRAKCJA GRAMATUR I ILOŚCI Z NAZW PRODUKTÓW ===")
        print()
        update_products_with_extracted_data()
