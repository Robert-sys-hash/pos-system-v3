#!/bin/bash

echo "🚀 Uruchamianie POS System V3..."
echo "📡 Backend Flask na porcie 5002"
echo "⚛️  Frontend React na porcie 3002"
echo ""

# Funkcja do zatrzymania serwerów przy Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Zatrzymywanie serwerów..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Ustawienie pułapki na SIGINT (Ctrl+C)
trap cleanup SIGINT

# Przejdź do katalogu głównego projektu
cd "$(dirname "$0")"

# Uruchom backend Flask
echo "▶️  Uruchamianie backendu Flask..."
cd backend
/Users/robertkaczkowski/.pyenv/versions/3.7.17/bin/python app.py &
BACKEND_PID=$!
echo "✅ Backend uruchomiony (PID: $BACKEND_PID)"

# Poczekaj chwilę na uruchomienie backendu
sleep 3

# Uruchom frontend React
echo "▶️  Uruchamianie frontendu React..."
cd ../frontend
PORT=3002 npm start &
FRONTEND_PID=$!
echo "✅ Frontend uruchomiony (PID: $FRONTEND_PID)"

echo ""
echo "🌐 Frontend: http://localhost:3002"
echo "🔌 Backend API: http://localhost:5002"
echo "📖 API Info: http://localhost:5002/api/info"
echo ""
echo "Naciśnij Ctrl+C aby zatrzymać serwery"

# Czekaj na zakończenie procesów
wait $BACKEND_PID $FRONTEND_PID
