#!/bin/bash
echo "🚀 Uruchamianie backendu Flask na porcie 5002..."
cd "$(dirname "$0")/backend"
export FLASK_APP=app.py
export FLASK_ENV=development
/Users/robertkaczkowski/.pyenv/versions/3.7.17/bin/python app.py
