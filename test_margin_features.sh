#!/bin/bash

echo "🧪 Test nowych funkcjonalności Location Pricing"
echo "==============================================="

BASE_URL="http://localhost:5002"
FRONTEND_URL="http://localhost:3002"

echo "📊 1. Test produktu z marżą"
echo "=========================================="

# Dodaj produkt testowy z ceną zakupu
sqlite3 kupony.db "INSERT OR REPLACE INTO produkty (id, nazwa, cena_zakupu, cena_sprzedazy_netto, cena_sprzedazy_brutto, stawka_vat, kod_produktu, ean) VALUES (999, 'Test Margin Product', 8.00, 10.00, 12.30, 23, 'TEST999', '1234567890999');"

echo "   ✅ Produkt testowy dodany (cena zakupu: 8.00 zł, sprzedaży: 12.30 zł)"

# Test ustawiania marży 25%
echo "📝 2. Test ustawiania marży 25%"
echo "   Cena zakupu: 8.00 zł + marża 25% = 10.00 zł netto"

response=$(curl -s -X PUT -H "Content-Type: application/json" \
    -d '{"cena_netto": 10.00, "cena_brutto": 12.30, "data_od": "2025-01-25"}' \
    "$BASE_URL/api/locations/1/products/999/price")

if echo "$response" | grep -q '"success": true'; then
    echo "   ✅ PASS - Cena z marżą ustawiona"
else
    echo "   ❌ FAIL - $response"
fi

# Test pobierania ceny z marżą
echo "📝 3. Test pobierania ceny specjalnej"
response=$(curl -s "$BASE_URL/api/locations/1/products/999/price")

if echo "$response" | grep -q '"success": true'; then
    echo "   ✅ PASS - Cena specjalna pobrana"
    echo "$response" | python3 -m json.tool | grep -E '"cena_sprzedazy_|"price_type"'
else
    echo "   ❌ FAIL - $response"
fi

echo
echo "🎯 4. Sprawdzenie frontendu"
echo "=========================="

# Test dostępności frontendu
response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/location-pricing")
if [ "$response" = "200" ]; then
    echo "   ✅ PASS - Frontend dostępny ($FRONTEND_URL/location-pricing)"
else
    echo "   ❌ FAIL - Frontend niedostępny (kod: $response)"
fi

echo
echo "💾 5. Sprawdzenie struktury danych produktu"
echo "=========================================="

echo "   Pola produktu testowego:"
sqlite3 kupony.db "SELECT id, nazwa, cena_zakupu, cena_sprzedazy_netto, cena_sprzedazy_brutto, marza_procent FROM produkty WHERE id = 999;"

echo
echo "   Obliczenia marży:"
sqlite3 kupony.db "SELECT 
    nazwa,
    cena_zakupu,
    cena_sprzedazy_netto,
    ROUND((cena_sprzedazy_netto - cena_zakupu), 2) as marza_kwotowa,
    ROUND(((cena_sprzedazy_netto - cena_zakupu) / cena_zakupu * 100), 2) as marza_procent
FROM produkty WHERE id = 999;"

echo
echo "📋 6. Sprawdzenie cen specjalnych w lokalizacji"
echo "=============================================="

response=$(curl -s "$BASE_URL/api/locations/1/prices")
if echo "$response" | grep -q '"success": true'; then
    count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('count', 0))")
    echo "   ✅ PASS - API zwraca $count cen specjalnych"
    
    # Sprawdź czy nasz testowy produkt jest na liście
    if echo "$response" | grep -q '"product_id": 999'; then
        echo "   ✅ PASS - Produkt testowy ma cenę specjalną"
    else
        echo "   ❌ FAIL - Produkt testowy nie ma ceny specjalnej"
    fi
else
    echo "   ❌ FAIL - Błąd API: $response"
fi

echo
echo "🎯 Test zakończony!"
echo "=================="
echo "📱 Otwórz: $FRONTEND_URL/location-pricing"
echo "📊 Sprawdź widok magazynu i operacje zbiorcze"
echo "💰 Przetestuj ustawianie marży 25% na produktach"
