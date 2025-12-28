# 🚀 INSTRUKCJE WGRANIA - FINALNA PACZKA

## 📦 PACZKA: pos-system-v3-READY.tar.gz

**Rozmiar:** 2.4MB  
**Data:** 3 października 2025, 20:04  

## ✅ CO ZOSTAŁO NAPRAWIONE:

1. **Frontend** - wszystkie URL na `panelv3.pl` (żadnych localhost!)
2. **Backend** - CORS wildcard `origins="*"` (pozwala wszystkim)
3. **Konfiguracja** - DirectAdmin `FLASK_ENV=directadmin`
4. **Struktura** - identyczna jak działająca paczka

---

## 🔧 INSTRUKCJE WGRANIA:

### 1. USUŃ STARĄ ZAWARTOŚĆ
- Usuń wszystkie pliki z `public_html/`
- Usuń wszystkie pliki z `cgi-bin/` (jeśli są)

### 2. WGRAJ NOWĄ PACZKĘ
- Wgraj `pos-system-v3-READY.tar.gz` do DirectAdmin
- Rozpakuj w głównym katalogu

### 3. PRZENIEŚ PLIKI
```
cgi-bin/ → przenieś do głównego cgi-bin/
public_html/ → przenieś zawartość do głównego public_html/
```

### 4. STRUKTURA KOŃCOWA
```
public_html/
├── index.html              (frontend React)
├── static/                 (CSS, JS, obrazy)
├── asset-manifest.json     (manifest)
├── api/                    (backend Flask)
│   ├── app.py             (główny backend)
│   ├── config.py          (konfiguracja)
│   ├── .env               (zmienne środowiskowe)
│   └── api/               (wszystkie blueprinty)
└── kupony.db              (baza danych SQLite)
```

---

## 🔍 TESTY PO WGRANIU:

### 1. TEST FRONTEND
**URL:** http://panelv3.pl  
**Oczekiwany:** Interfejs POS powinien się załadować

### 2. TEST API
**URL:** http://panelv3.pl/api/health  
**Oczekiwany:** JSON odpowiedź:
```json
{
  "status": "ok",
  "message": "API is running"
}
```

### 3. TEST POŁĄCZENIA
- Otwórz F12 → Console
- **Nie powinno być błędów CORS**
- **Nie powinno być "localhost:5002"**

---

## 🛠️ ROZWIĄZYWANIE PROBLEMÓW:

### Nadal błędy CORS?
1. Wyczyść cache: `Ctrl+Shift+R`
2. Sprawdź czy backend działa: `/api/health`
3. Zrestartuj backend (jeśli możliwe)

### Nadal localhost w błędach?
- Wyczyść całkowicie cache przeglądarki
- Sprawdź czy wgrałeś właściwą paczkę

### Backend nie odpowiada?
- Sprawdź uprawnienia plików
- Sprawdź czy Python3 jest dostępny
- Sprawdź error_log DirectAdmin

---

## 🎯 WAŻNE UWAGI:

- **CORS ustawiony na wildcard** - dla testów
- **Wszystkie localhost zamienione** na panelv3.pl
- **Baza danych w tej samej lokalizacji**
- **Konfiguracja DirectAdmin włączona**

---

**Status:** GOTOWE DO WGRANIA! 🚀
