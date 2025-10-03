#!/bin/bash
# deploy.sh - Skrypt do wdrożenia POS System V3 na serwer

echo "🚀 POS System V3 - Deployment Script"
echo "=================================="

# Konfiguracja
DOMAIN="yourdomain.com"
BUILD_DIR="deployment"
BACKEND_DIR="backend"
FRONTEND_BUILD_DIR="frontend/build"

# Tworzenie katalogu deploymentu
echo "📁 Tworzenie struktury deploymentu..."
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR/public_html
mkdir -p $BUILD_DIR/public_html/api
mkdir -p $BUILD_DIR/cgi-bin/python3

# Kopiowanie frontendu
echo "📦 Kopiowanie frontendu..."
cp -r $FRONTEND_BUILD_DIR/* $BUILD_DIR/public_html/

# Kopiowanie backendu
echo "📦 Kopiowanie backendu..."
cp -r $BACKEND_DIR/* $BUILD_DIR/public_html/api/
cp $BACKEND_DIR/app.cgi $BUILD_DIR/cgi-bin/python3/

# Kopiowanie bazy danych
echo "📦 Kopiowanie bazy danych..."
cp kupony.db $BUILD_DIR/public_html/

# Kopiowanie .htaccess
echo "📦 Kopiowanie .htaccess..."
cp .htaccess $BUILD_DIR/public_html/

# Tworzenie pliku .env dla produkcji
echo "📦 Tworzenie .env dla produkcji..."
cat > $BUILD_DIR/public_html/api/.env << EOF
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
DOMAIN=$DOMAIN
DATABASE_PATH=../kupony.db
PORT=5002
HOST=0.0.0.0
EOF

# Ustawienie uprawnień
echo "🔐 Ustawianie uprawnień..."
find $BUILD_DIR -type d -exec chmod 755 {} \;
find $BUILD_DIR -type f -exec chmod 644 {} \;
chmod 755 $BUILD_DIR/cgi-bin/python3/app.cgi
chmod 666 $BUILD_DIR/public_html/kupony.db

# Tworzenie archiwum
echo "📦 Tworzenie archiwum deployment..."
cd $BUILD_DIR
tar -czf ../pos-system-v3-deployment.tar.gz .
cd ..

echo "✅ Deployment przygotowany!"
echo ""
echo "📋 Następne kroki:"
echo "1. Upload pos-system-v3-deployment.tar.gz do DirectAdmin"
echo "2. Rozpakuj w public_html"
echo "3. Zmień DOMAIN w api/.env na właściwą domenę"
echo "4. Sprawdź uprawnienia plików"
echo "5. Przetestuj aplikację"
echo ""
echo "🌐 Po wdrożeniu aplikacja będzie dostępna pod:"
echo "   https://$DOMAIN"
