import sqlite3

conn = sqlite3.connect('backend/kupony.db')
cursor = conn.cursor()

# Znajdź produkt po EAN
cursor.execute('SELECT id, nazwa, cena_sprzedazy_brutto, cena_sprzedazy_netto, cena_zakupu, stawka_vat FROM produkty WHERE ean = ?', ('5902837746760',))
product = cursor.fetchone()

if product:
    print('Produkt z tabeli produkty:')
    print(f'  ID: {product[0]}')
    print(f'  Nazwa: {product[1]}')
    print(f'  Cena sprzedaży brutto: {product[2]}')
    print(f'  Cena sprzedaży netto: {product[3]}')
    print(f'  Cena zakupu (brutto z tabeli): {product[4]}')
    print(f'  Stawka VAT: {product[5]}%')
    
    # Oblicz cenę zakupu netto z brutto
    if product[4]:
        cena_zakupu_netto_obliczona = product[4] / (1 + product[5] / 100)
        print(f'  Cena zakupu netto (obliczona): {cena_zakupu_netto_obliczona:.2f}')
    
    # Sprawdź warehouse_product_prices
    cursor.execute('SELECT cena_sprzedazy_brutto, cena_sprzedazy_netto, cena_zakupu_brutto, cena_zakupu_netto, warehouse_id FROM warehouse_product_prices WHERE product_id = ?', (product[0],))
    wps = cursor.fetchall()
    
    if wps:
        print(f'\nCeny z warehouse_product_prices ({len(wps)} rekordów):')
        for i, wp in enumerate(wps, 1):
            print(f'\n  Magazyn ID {wp[4]}:')
            print(f'    Cena sprzedaży brutto: {wp[0]}')
            print(f'    Cena sprzedaży netto: {wp[1]}')
            print(f'    Cena zakupu brutto: {wp[2]}')
            print(f'    Cena zakupu netto: {wp[3]}')
            
            # Oblicz marżę
            if wp[3] and wp[3] > 0 and wp[1] and wp[1] > 0:
                narzut = ((wp[1] - wp[3]) / wp[3]) * 100
                marza = ((wp[1] - wp[3]) / wp[1]) * 100
                print(f'    Narzut (obecny wzór - BŁĄD): {narzut:.1f}%')
                print(f'    Marża (prawidłowy wzór): {marza:.1f}%')
    else:
        print('\nBrak cen w warehouse_product_prices')
else:
    print('Produkt nie znaleziony')

conn.close()
