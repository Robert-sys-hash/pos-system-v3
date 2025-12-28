# Instrukcja Wdrożenia POS System V3 - NAPRAWA LOGOWANIA

## Problem
Blueprint autoryzacji (`auth_bp`) nie był ładowany z powodu błędu w strukturze try/except w pliku `app.py`.

## Naprawa
✅ Poprawiono strukturę rejestracji blueprintów w `backend/app.py`
✅ Blueprint `auth` jest teraz ładowany niezależnie od innych blueprintów
✅ Zaktualizowano frontend z konfiguracją produkcyjną

## Wdrożenie na serwer panelv3.pl

### Krok 1: Upload plików
1. Zaloguj się do panelu DirectAdmin lub przez SSH
2. Przejdź do katalogu `public_html`
3. Zrób backup obecnych plików:
   ```bash
   tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz public_html/
   ```

### Krok 2: Wgraj nowe pliki
1. Upload pliku `pos-system-v3-FIXED-[data].tar.gz` do katalogu `public_html`
2. Rozpakuj:
   ```bash
   cd public_html
   tar -xzf pos-system-v3-FIXED-*.tar.gz
   ```

### Krok 3: Restart aplikacji
1. Jeśli używasz Passenger (DirectAdmin):
   - Przejdź do Panel → Node.js/Python Setup
   - Kliknij "Restart" dla aplikacji

2. Jeśli używasz systemd:
   ```bash
   sudo systemctl restart pos-system-v3
   ```

3. Lub restart przez plik:
   ```bash
   touch public_html/api/tmp/restart.txt
   ```

### Krok 4: Weryfikacja
1. Otwórz https://panelv3.pl w przeglądarce
2. Wyczyść cache przeglądarki (Ctrl+Shift+R lub Cmd+Shift+R)
3. Spróbuj się zalogować:
   - **Login:** admin
   - **Hasło:** admin123

### Krok 5: Test API
Możesz przetestować API bezpośrednio:
```bash
curl -X POST https://panelv3.pl/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

Powinien zwrócić:
```json
{
  "success": true,
  "message": "Logowanie pomyślne",
  "data": {
    "user_id": 1423,
    "login": "admin",
    "user_type": "admin"
  }
}
```

## Użytkownicy w systemie
- **admin** / admin123 (typ: admin)
- **kalisz** (typ: sklep)
- **Marika Klimczak** (typ: pracownik)
- **Kasia Kamińska** (typ: kasjer)

## Rozwiązywanie problemów

### Problem: 405 Method Not Allowed
**Przyczyna:** Blueprint auth nie został załadowany
**Rozwiązanie:** Sprawdź logi backendu czy widać "✅ Auth blueprint OK"

### Problem: CORS errors
**Przyczyna:** Niepoprawna konfiguracja CORS
**Rozwiązanie:** Sprawdź czy w `config.py` są poprawne domeny

### Problem: Timeout
**Przyczyna:** Backend nie działa lub jest niedostępny
**Rozwiązanie:** Sprawdź czy proces Python jest uruchomiony

## Logi
Sprawdź logi aplikacji:
```bash
tail -f ~/logs/pos-system-v3.log
# lub
tail -f public_html/api/app.log
```

## Data naprawy
2 grudnia 2025

## Pliki zmienione
- `backend/app.py` - naprawiono strukturę rejestracji blueprintów
- `frontend/.env` - przywrócono konfigurację produkcyjną
- `frontend/build/` - nowy build z konfiguracją produkcyjną
