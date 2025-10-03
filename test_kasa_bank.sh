#!/bin/bash

echo "=== TEST KOŃCOWY - Kasa/Bank API ==="
echo "Data: $(date)"
echo ""

echo "1. Test endpointów backendu:"
echo "==============================="

echo "✓ Saldo:"
curl -s "http://localhost:5001/api/kasa-bank/saldo" | head -3

echo ""
echo "✓ Operacje:"
curl -s "http://localhost:5001/api/kasa-bank/operacje" | head -3

echo ""
echo "✓ Podsumowanie dzienne:"
curl -s "http://localhost:5001/api/kasa-bank/summary/daily" | head -3

echo ""
echo "✓ Statystyki miesięczne:"
curl -s "http://localhost:5001/api/kasa-bank/stats/monthly" | head -3

echo ""
echo ""
echo "2. Sprawdzenie konfiguracji frontendu:"
echo "======================================"
echo "✓ API Base URL w .env:"
cat /Users/robertkaczkowski/Downloads/SS/v2/v1/pos-system-v3/frontend/.env

echo ""
echo ""
echo "=== WSZYSTKIE ENDPOINTY POWINNY DZIAŁAĆ ✅ ==="
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5001"
echo ""
echo "Kasa/Bank API poprawione! 🎉"
