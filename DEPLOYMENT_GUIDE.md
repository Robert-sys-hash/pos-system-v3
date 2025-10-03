# 📋 Instrukcje wdrożenia POS System V3 na serwer DirectAdmin

## 🎯 Przygotowanie przed wdrożeniem

### 1. Informacje potrzebne do wdrożenia:
- [ ] Nazwa domeny (np. `mojskleppos.com`)
- [ ] Dane dostępowe do DirectAdmin
- [ ] Sprawdź czy serwer obsługuje Python 3.x
- [ ] Sprawdź czy są dostępne moduły: Flask, Flask-CORS

### 2. Przygotowanie lokalne:

```bash
# Zbuduj aplikację do produkcji
cd /Users/robson/Downloads/pos-system-v3
chmod +x deploy.sh
./deploy.sh
```

## 🚀 Wdrożenie na serwer

### Opcja A: DirectAdmin z obsługą Python

1. **Upload plików:**
   - Zaloguj się do DirectAdmin
   - File Manager → Upload → `pos-system-v3-deployment.tar.gz`
   - Rozpakuj w `public_html`

2. **Konfiguracja:**
   ```bash
   # Edytuj api/.env
   DOMAIN=twoja-domena.com
   SECRET_KEY=wygenerowany-klucz-bezpieczenstwa
   ```

3. **Uprawnienia:**
   - Katalogi: 755
   - Pliki: 644
   - app.cgi: 755
   - kupony.db: 666

### Opcja B: DirectAdmin bez Python (alternatywne rozwiązania)

#### B1. Heroku (zalecane)
```bash
# Utwórz aplikację na Heroku
heroku create nazwa-aplikacji

# Ustaw zmienne środowiskowe
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=$(openssl rand -hex 32)

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### B2. Railway.app
1. Połącz repository z GitHub
2. Railway automatycznie wykryje Flask
3. Ustaw zmienne środowiskowe w panelu

#### B3. Render.com
1. Utwórz Web Service z GitHub repo
2. Build Command: `cd frontend && npm run build`
3. Start Command: `cd backend && python app.py`

## 🔧 Konfiguracja po wdrożeniu

### 1. Testowanie:
- [ ] Strona główna ładuje się: `https://twoja-domena.com`
- [ ] API odpowiada: `https://twoja-domena.com/api/health`
- [ ] Baza danych działa: sprawdź listę produktów

### 2. Potencjalne problemy:

**Problem:** API nie odpowiada
**Rozwiązanie:** 
- Sprawdź logi serwera
- Upewnij się że Python 3.x jest zainstalowany
- Sprawdź uprawnienia plików

**Problem:** CORS errors
**Rozwiązanie:**
- Sprawdź czy .htaccess jest załadowany
- Upewnij się że domena w .env jest poprawna

**Problem:** Baza danych błędy
**Rozwiązanie:**
- Sprawdź uprawnienia kupony.db (666)
- Sprawdź ścieżkę w DATABASE_PATH

## 📞 Wsparcie

W przypadku problemów:
1. Sprawdź logi serwera w DirectAdmin
2. Przetestuj lokalnie z `FLASK_ENV=production`
3. Sprawdź czy wszystkie moduły Python są zainstalowane

## 🔄 Aktualizacje

Dla przyszłych aktualizacji:
1. Uruchom `./deploy.sh` lokalnie
2. Upload nowego archiwum
3. Zachowaj plik `.env` z produkcyjnymi ustawieniami
