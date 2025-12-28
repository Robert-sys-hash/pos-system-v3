# INSTRUKCJE WGRANIA NA DIRECTADMIN - UPROSZCZONE

## 1. WGRANIE PLIKÓW
1. Wgraj `directadmin-deployment-fixed.zip` do DirectAdmin File Manager
2. Rozpakuj w głównym katalogu (public_html/)
3. Przenieś wszystkie pliki z `directadmin-deployment/` do `public_html/`
4. Usuń pusty folder `directadmin-deployment/`

## 2. STRUKTURA KOŃCOWA
```
public_html/
├── index.html                 (frontend)
├── static/                    (pliki CSS/JS)
├── backend/
│   ├── simple_cgi.py         (prosty API)
│   └── app.py                (pełny Flask - zapasowy)
├── kupony.db                 (baza danych)
└── .htaccess                 (konfiguracja)
```

## 3. UPRAWNIENIA PLIKÓW
```bash
chmod 644 kupony.db
chmod 755 backend/simple_cgi.py
chmod 644 .htaccess
```

## 4. TEST DZIAŁANIA
- Frontend: http://panelv3.pl
- API Test: http://panelv3.pl/api/health

## 5. ROZWIĄZYWANIE PROBLEMÓW

### Internal Server Error?
1. Sprawdź error_log w DirectAdmin
2. Upewnij się że Python3 jest dostępny
3. Sprawdź uprawnienia plików

### API nie działa?
1. Testuj: http://panelv3.pl/api/health
2. Powinna zwrócić JSON: {"status": "ok"}

### Frontend nie ładuje się?
1. Sprawdź czy index.html jest w public_html/
2. Sprawdź console deweloperską w przeglądarce

## 6. UWAGI
- Ta wersja używa prostego CGI zamiast pełnego Flask
- Obsługuje tylko podstawowe API calls
- W razie problemów można użyć pełnej wersji Flask z app.py
