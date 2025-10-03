#!/bin/bash

echo "🧪 Test zbiorczego edytowania cen - wszystkie scenariusze"
echo "========================================================"

BASE_URL="http://localhost:5002"

# Funkcja do testowania API
test_bulk_price_update() {
    local product_id=$1
    local price_netto=$2
    local price_brutto=$3
    local description=$4
    
    echo "📝 Test: $description"
    echo "   Produkt: $product_id, Netto: $price_netto, Brutto: $price_brutto"
    
    response=$(curl -s -X PUT -H "Content-Type: application/json" \
        -d "{\"cena_netto\": $price_netto, \"cena_brutto\": $price_brutto, \"data_od\": \"2025-01-25\"}" \
        "$BASE_URL/api/locations/1/products/$product_id/price")
    
    if echo "$response" | grep -q '"success": true'; then
        echo "   ✅ PASS - Cena została ustawiona"
    else
        echo "   ❌ FAIL - $response"
    fi
    echo
}

# Test różnych scenariuszy
echo "🔧 Testowanie różnych scenariuszy ustawiania cen:"
echo

test_bulk_price_update 65 0 0 "Cena zerowa (darmowy produkt)"
test_bulk_price_update 66 5.99 7.37 "Cena normalna z .99"
test_bulk_price_update 67 10.95 13.47 "Cena z .95"
test_bulk_price_update 68 15.00 18.45 "Cena zaokrąglona .00"
test_bulk_price_update 69 0.01 0.01 "Minimalna cena"
test_bulk_price_update 70 999.99 1229.99 "Wysoka cena"

# Test błędnych scenariuszy
echo "🚫 Testowanie błędnych scenariuszy:"
echo

echo "📝 Test: Ujemne ceny"
response=$(curl -s -X PUT -H "Content-Type: application/json" \
    -d '{"cena_netto": -1, "cena_brutto": -1, "data_od": "2025-01-25"}' \
    "$BASE_URL/api/locations/1/products/65/price")

if echo "$response" | grep -q '"success": false'; then
    echo "   ✅ PASS - Ujemne ceny zostały odrzucone"
else
    echo "   ❌ FAIL - Ujemne ceny nie zostały odrzucone"
fi
echo

echo "📝 Test: Brakujące dane"
response=$(curl -s -X PUT -H "Content-Type: application/json" \
    -d '{"cena_netto": 10}' \
    "$BASE_URL/api/locations/1/products/65/price")

if echo "$response" | grep -q '"success": false'; then
    echo "   ✅ PASS - Brakujące dane zostały wykryte"
else
    echo "   ❌ FAIL - Brakujące dane nie zostały wykryte"
fi
echo

echo "📝 Test: Nieprawidłowe dane"
response=$(curl -s -X PUT -H "Content-Type: application/json" \
    -d '{"cena_netto": "abc", "cena_brutto": "def"}' \
    "$BASE_URL/api/locations/1/products/65/price")

if echo "$response" | grep -q '"success": false'; then
    echo "   ✅ PASS - Nieprawidłowe dane zostały odrzucone"
else
    echo "   ❌ FAIL - Nieprawidłowe dane nie zostały odrzucone"
fi
echo

# Sprawdź aktualną listę cen
echo "📊 Sprawdzenie aktualnych cen dla lokalizacji 1:"
echo "================================================"

response=$(curl -s "$BASE_URL/api/locations/1/prices")
if echo "$response" | grep -q '"success": true'; then
    echo "$response" | python3 -m json.tool | grep -E '"product_name"|"cena_sprzedazy_netto"|"cena_sprzedazy_brutto"' | head -20
    echo "   ✅ Lista cen pobrana pomyślnie"
else
    echo "   ❌ FAIL - Nie udało się pobrać listy cen"
fi

echo
echo "🎯 Test zbiorczego edytowania cen zakończony!"
echo "=============================================="
