#!/usr/bin/env python3
"""
Skrypt weryfikacyjny dla poprawy cen zakupu brutto.
Sprawdza czy API zwraca poprawione dane i czy obliczenia VAT są prawidłowe.
"""

import requests
import json

def verify_purchase_prices():
    """Sprawdź czy API zwraca poprawne ceny zakupu brutto"""
    
    print("🔍 Sprawdzam ceny zakupu brutto w API...")
    
    try:
        # Pobierz produkty z API
        response = requests.get("https://panelv3.pl/api/products?limit=100")
        response.raise_for_status()
        data = response.json()
        
        if not data.get('success'):
            print(f"❌ API zwróciło błąd: {data.get('message', 'Nieznany błąd')}")
            return False
        
        products = data.get('data', [])
        print(f"📦 Znaleziono {len(products)} produktów")
        
        # Sprawdź produkty z cenami zakupu brutto
        products_with_purchase_prices = []
        incorrect_calculations = []
        
        for product in products:
            cena_zakupu_netto = product.get('cena_zakupu_netto')
            cena_zakupu_brutto = product.get('cena_zakupu_brutto')
            stawka_vat = product.get('tax_rate') or product.get('stawka_vat')
            
            if cena_zakupu_netto and cena_zakupu_brutto and cena_zakupu_netto > 0 and cena_zakupu_brutto > 0:
                products_with_purchase_prices.append(product)
                
                # Sprawdź prawidłowość obliczeń VAT
                if stawka_vat and stawka_vat > 0:
                    expected_brutto = round(cena_zakupu_netto * (1 + stawka_vat / 100), 2)
                    
                    # Tolerancja 0.01 zł
                    if abs(cena_zakupu_brutto - expected_brutto) > 0.01:
                        incorrect_calculations.append({
                            'name': product.get('name', product.get('nazwa', 'Nieznany')),
                            'netto': cena_zakupu_netto,
                            'brutto_actual': cena_zakupu_brutto,
                            'brutto_expected': expected_brutto,
                            'vat': stawka_vat
                        })
        
        print(f"💰 Produkty z cenami zakupu: {len(products_with_purchase_prices)}")
        
        if incorrect_calculations:
            print(f"❌ Znaleziono {len(incorrect_calculations)} błędnych obliczeń:")
            for item in incorrect_calculations[:5]:  # Pokaż pierwsze 5
                print(f"   {item['name'][:40]}: netto {item['netto']}, brutto {item['brutto_actual']} (oczekiwano {item['brutto_expected']}, VAT {item['vat']}%)")
        else:
            print("✅ Wszystkie obliczenia VAT są prawidłowe!")
        
        # Pokaż przykłady poprawnych cen
        print("\n📊 Przykłady poprawnych cen zakupu brutto:")
        print("Nazwa | Netto | Brutto | VAT | Status")
        print("-" * 80)
        
        for product in products_with_purchase_prices[:5]:
            name = product.get('name', product.get('nazwa', 'Nieznany'))[:30]
            netto = product.get('cena_zakupu_netto', 0)
            brutto = product.get('cena_zakupu_brutto', 0)
            vat = product.get('tax_rate') or product.get('stawka_vat', 0)
            
            expected_brutto = round(netto * (1 + vat / 100), 2) if vat > 0 else 0
            is_correct = abs(brutto - expected_brutto) <= 0.01 if expected_brutto > 0 else True
            status = "✅" if is_correct else "❌"
            
            print(f"{name:<30} | {netto:>6.2f} | {brutto:>7.2f} | {vat:>3.0f}% | {status}")
        
        return len(incorrect_calculations) == 0
        
    except requests.RequestException as e:
        print(f"❌ Błąd połączenia z API: {e}")
        return False
    except Exception as e:
        print(f"❌ Nieoczekiwany błąd: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Rozpoczynam weryfikację cen zakupu brutto...")
    success = verify_purchase_prices()
    
    if success:
        print("\n✅ Weryfikacja zakończona pomyślnie - wszystkie ceny są prawidłowe!")
    else:
        print("\n❌ Weryfikacja wykryła problemy - wymagane dodatkowe poprawki!")
