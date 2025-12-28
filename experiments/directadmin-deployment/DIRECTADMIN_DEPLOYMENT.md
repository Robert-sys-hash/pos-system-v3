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
