#!/bin/bash
echo "⚛️  Uruchamianie frontendu React na porcie 3002..."
cd "$(dirname "$0")/frontend"
export PORT=3002
npm start
