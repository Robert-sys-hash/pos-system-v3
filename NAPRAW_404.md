# 🚀 INSTRUKCJE NAPRAWY POS SYSTEM V3 - Błędy 404

## Problem: Frontend pokazuje błędy 404 dla API endpoints

Błędy które widzisz:
- Failed to load resource: stats (404)
- Failed to load resource: locations (404) 
- "This API endpoint is not available in the current version"

## ✅ ROZWIĄZANIE - Instalacja nowych plików serwera

### 1. ROZPAKUJ ARCHIWUM
```bash
# Na serwerze panelv3.pl przez SSH:
cd ~/domains/panelv3.pl/public_html/
tar -xzf pos-system-v3-server-update.tar.gz
```

### 2. USTAW UPRAWNIENIA
```bash
chmod 644 .htaccess
chmod 755 api/app.cgi
chmod 755 api/flask_test.py  
chmod 755 api/simple_health.py
```

### 3. SPRAWDŹ CZY PLIKI SĄ NA MIEJSCU
```bash
# Sprawdź .htaccess:
head -10 .htaccess

# Sprawdź pliki API:
ls -la api/app.cgi api/flask_test.py api/simple_health.py
```

### 4. PRZETESTUJ ENDPOINTY
```bash
# Test prostego Python endpoint:
curl https://panelv3.pl/api/simple_health.py

# Test Flask aplikacji:
curl https://panelv3.pl/api/flask_test.py

# Test pełnej Flask app:
curl https://panelv3.pl/api/app.cgi

# Test konkretnych endpoint API:
curl https://panelv3.pl/api/stats
curl https://panelv3.pl/api/locations
```

### 5. JEŚLI NADAL 404 - SPRAWDŹ .htaccess
```bash
# Sprawdź czy .htaccess ma prawidłowe reguły:
grep -A5 -B5 "Python CGI" .htaccess
grep -A5 -B5 "AddHandler cgi-script" .htaccess
```

### 6. RESTART SERWERA (jeśli potrzeba)
W DirectAdmin Panel:
- Apache Handlers → Restart
- LUB w SSH: `sudo systemctl reload apache2`

## 🔍 DIAGNOSTYKA

Jeśli nadal błędy 404:

1. **Sprawdź logi Apache:**
   ```bash
   tail -f ~/domains/panelv3.pl/logs/error.log
   ```

2. **Test bezpośredni URL:**
   - https://panelv3.pl/api/simple_health.py
   - https://panelv3.pl/api/flask_test.py

3. **Sprawdź czy CGI jest włączone:**
   - W DirectAdmin: Advanced Features → CGI

## 📞 CO POWINNO DZIAŁAĆ PO INSTALACJI:

✅ `curl https://panelv3.pl/api/simple_health.py` → JSON z status: "ok"
✅ `curl https://panelv3.pl/api/flask_test.py` → Flask app info  
✅ `curl https://panelv3.pl/api/stats` → Statystyki (przez PHP lub Flask)
✅ Frontend bez błędów 404

## 🎯 UWAGA: 
- Archiwum zawiera NOWY .htaccess z obsługą Python CGI
- Flask backend uruchamia się przez app.cgi
- Backup poprzedniego .htaccess w .htaccess.backup2
