#!/bin/bash
# Railway.app startup script

echo "🚀 Starting POS System V3..."

# Build frontend if needed
if [ ! -d "frontend/build" ]; then
    echo "📦 Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend
python app.py
