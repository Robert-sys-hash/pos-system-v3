#!/bin/bash

# Instrukcje instalacji plików na panelv3.pl
echo "=== INSTRUKCJE INSTALACJI POS SYSTEM V3 ==="
echo ""

echo "1. Przesyłanie plików:"
echo "   - Prześlij .htaccess do ~/domains/panelv3.pl/public_html/"
echo "   - Prześlij app.cgi do ~/domains/panelv3.pl/public_html/api/"
echo "   - Prześlij flask_test.py do ~/domains/panelv3.pl/public_html/api/"
echo "   - Prześlij simple_health.py do ~/domains/panelv3.pl/public_html/api/"
echo ""

echo "2. Ustawienie uprawnień:"
echo "   chmod 644 ~/domains/panelv3.pl/public_html/.htaccess"
echo "   chmod 755 ~/domains/panelv3.pl/public_html/api/app.cgi"
echo "   chmod 755 ~/domains/panelv3.pl/public_html/api/flask_test.py"
echo "   chmod 755 ~/domains/panelv3.pl/public_html/api/simple_health.py"
echo ""

echo "3. Testowanie:"
echo "   curl https://panelv3.pl/api/simple_health.py"
echo "   curl https://panelv3.pl/api/flask_test.py"
echo "   curl https://panelv3.pl/api/app.cgi"
echo ""

echo "4. Sprawdzenie frontendu:"
echo "   https://panelv3.pl"
echo ""

echo "Pliki przygotowane w katalogu: server-files/"
