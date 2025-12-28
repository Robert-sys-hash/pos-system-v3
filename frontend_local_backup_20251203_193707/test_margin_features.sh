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

echo
echo "🎯 Test zakończony - sprawdź frontend!"
