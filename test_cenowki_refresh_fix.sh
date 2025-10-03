#!/bin/bash

# Test sprawdzający czy problem z odświeżaniem cen specjalnych został rozwiązany

echo "🧪 Test poprawki odświeżania cen specjalnych w cenówkach"
echo "======================================================"

# Kolory dla outputu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

FRONTEND_URL="http://localhost:3002"
BACKEND_URL="http://localhost:5002"

echo -e "${YELLOW}1. Sprawdzam czy backend działa...${NC}"
if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend działa${NC}"
else
    echo -e "${RED}❌ Backend nie działa${NC}"
    echo "Uruchom backend: cd backend && python3 app.py"
    exit 1
fi

echo -e "${YELLOW}2. Sprawdzam czy frontend działa...${NC}"
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend działa${NC}"
else
    echo -e "${RED}❌ Frontend nie działa${NC}"
    echo "Uruchom frontend: cd frontend && PORT=3002 npm start"
    exit 1
fi

echo -e "${YELLOW}3. Testuję aktualizację cen specjalnych...${NC}"

# Pobierz pierwszy produkt
PRODUCT_DATA=$(curl -s "$BACKEND_URL/api/products?limit=5")
PRODUCT_ID=$(echo "$PRODUCT_DATA" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'data' in data and 'products' in data['data'] and len(data['data']['products']) > 0:
        print(data['data']['products'][0]['id'])
    else:
        print('')
except Exception as e:
    print('')
")

if [ -z "$PRODUCT_ID" ]; then
    echo -e "${RED}❌ Nie można pobrać produktu do testu${NC}"
    exit 1
fi

echo "📦 Testuję produkt ID: $PRODUCT_ID"

# Ustaw nową cenę specjalną
NEW_PRICE_NETTO=25.50
NEW_PRICE_BRUTTO=31.37

echo -e "${YELLOW}4. Ustawiam nową cenę specjalną: $NEW_PRICE_BRUTTO zł...${NC}"

PRICE_UPDATE_RESPONSE=$(curl -s -X PUT "$BACKEND_URL/api/warehouses/4/products/$PRODUCT_ID/price" \
  -H "Content-Type: application/json" \
  -d "{
    \"cena_sprzedazy_netto\": $NEW_PRICE_NETTO,
    \"cena_sprzedazy_brutto\": $NEW_PRICE_BRUTTO
  }")

if echo "$PRICE_UPDATE_RESPONSE" | grep -q '"success".*true'; then
    echo -e "${GREEN}✅ Cena została zaktualizowana w bazie danych${NC}"
else
    echo -e "${RED}❌ Błąd podczas aktualizacji ceny${NC}"
    echo "Response: $PRICE_UPDATE_RESPONSE"
    exit 1
fi

echo -e "${YELLOW}5. Sprawdzam czy nowa cena jest widoczna w API...${NC}"

# Sprawdź czy cena została zapisana
LOCATION_PRICES=$(curl -s "$BACKEND_URL/api/warehouses/4/prices")
if echo "$LOCATION_PRICES" | grep -q "\"product_id\": $PRODUCT_ID"; then
    CURRENT_PRICE=$(echo "$LOCATION_PRICES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data:
    if item['product_id'] == $PRODUCT_ID:
        print(f\"{item['cena_sprzedazy_brutto']:.2f}\")
        break
")
    echo -e "${GREEN}✅ Nowa cena w API: $CURRENT_PRICE zł${NC}"
else
    echo -e "${RED}❌ Nowa cena nie jest widoczna w API${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎯 Test zakończony pomyślnie!${NC}"
echo "=============================="
echo ""
echo "📱 Teraz sprawdź ręcznie:"
echo "1. Otwórz: $FRONTEND_URL/cenowki"
echo "2. Znajdź produkt ID: $PRODUCT_ID"
echo "3. Sprawdź czy cena specjalna to: $NEW_PRICE_BRUTTO zł"
echo ""
echo "🔄 Jeśli cena się nie odświeżyła automatycznie:"
echo "- Kliknij przycisk 'Odśwież' obok informacji o lokalizacji"
echo "- Lub przełącz się na inną kartę i wróć"
echo "- Sprawdź konsolę przeglądarki (F12) czy są logi o odświeżaniu"
echo ""
echo "🎉 Oczekiwane logi w konsoli:"
echo "- '🔄 Odświeżono ceny lokalizacyjne: X'"
echo "- '✅ Produkt [nazwa] MA cenę specjalną: $NEW_PRICE_BRUTTO zł'"
echo "- '✅ Odświeżono produkty: X z cenami specjalnymi: Y'"
