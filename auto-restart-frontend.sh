#!/bin/bash

# Skrypt auto-restart frontendu
echo "🚀 Uruchamiam frontend z auto-restartem..."

cd /Users/robertkaczkowski/Downloads/pos-system-v3/frontend

while true; do
    echo "📅 $(date): Uruchamiam frontend..."
    
    # Sprawdź czy port jest zajęty i zabij proces
    if lsof -i :3002 >/dev/null 2>&1; then
        echo "⚠️  Port 3002 zajęty, zabijam procesy..."
        kill -9 $(lsof -t -i :3002) 2>/dev/null || true
        sleep 2
    fi
    
    # Uruchom frontend
    npm start
    
    # Jeśli się zakończył, czekaj 3 sekundy i restartuj
    echo "💥 Frontend się zakończył. Restartuję za 3 sekundy..."
    sleep 3
done
