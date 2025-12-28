#!/bin/bash
# DirectAdmin Deployment Package Creator

echo "📦 Tworzenie pakietu deployment dla DirectAdmin..."

# Utwórz katalog deployment
mkdir -p directadmin-deployment
cd directadmin-deployment

# Skopiuj pliki backendu
echo "📂 Kopiowanie backendu..."
cp -r ../backend .

# Skopiuj bazę danych
echo "💾 Kopiowanie bazy danych..."
cp ../kupony.db .

# Skopiuj zbudowany frontend
echo "🌐 Kopiowanie zbudowanego frontendu..."
cp -r ../frontend/build/* .

# Utwórz .htaccess dla DirectAdmin
echo "⚙️  Tworzenie konfiguracji .htaccess..."
cat > .htaccess << 'EOL'
# DirectAdmin Python Flask Configuration
RewriteEngine On

# Frontend static files
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\.(css|js|png|jpg|gif|ico|svg)$

# API requests to backend
RewriteRule ^api/(.*)$ /backend/app.py/$1 [L,QSA]

# Everything else to frontend
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# Python configuration
AddHandler cgi-script .py
Options +ExecCGI

# Environment variables for DirectAdmin
SetEnv FLASK_ENV directadmin
SetEnv DATABASE_PATH /home/username/domains/panelv3.pl/public_html/kupony.db
EOL

# Utwórz requirements.txt dla DirectAdmin
echo "📋 Tworzenie requirements.txt..."
cat > requirements.txt << 'EOL'
Flask==2.3.3
Flask-CORS==4.0.0
EOL

# Utwórz instrukcje deployment
echo "📄 Tworzenie instrukcji..."
cat > DIRECTADMIN_DEPLOYMENT.md << 'EOL'
# DirectAdmin Deployment Instructions

## 1. Upload plików
- Wgraj wszystkie pliki do /public_html/
- Upewnij się że kupony.db ma odpowiednie uprawnienia (644)
- Upewnij się że backend/app.py ma uprawnienia +x (755)

## 2. Konfiguracja środowiska
- Ustaw zmienne środowiskowe w DirectAdmin:
  - FLASK_ENV=directadmin
  - DATABASE_PATH=/home/yourusername/domains/panelv3.pl/public_html/kupony.db

## 3. Python requirements
- Zainstaluj: pip install Flask Flask-CORS

## 4. Test
- Frontend: http://panelv3.pl
- Backend API: http://panelv3.pl/api/health

## 5. CORS
Backend jest skonfigurowany dla panelv3.pl
EOL

echo "✅ Pakiet deployment utworzony w katalogu: directadmin-deployment/"
echo "📁 Zawiera:"
ls -la

cd ..
echo "🚀 Gotowe do wgrania na DirectAdmin!"
