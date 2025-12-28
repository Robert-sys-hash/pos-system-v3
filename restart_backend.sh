#!/bin/bash
echo "🔄 Restarting backend..."

# Find and kill the running backend process
echo "🛑 Stopping existing backend process..."
pkill -f "python app_fixed.py"

# Activate virtual environment
source .venv/bin/activate

# Start the backend
echo "🚀 Starting backend server..."
python app_fixed.py &
