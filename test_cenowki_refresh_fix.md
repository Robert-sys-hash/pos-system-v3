# Test poprawki odświeżania cen specjalnych w cenówkach

## Problem
Gdy edytujesz ceny specjalne produktu w module Location Pricing, zmiany są zapisywane poprawnie, ale na stronie Cenówki nadal wyświetlają się stare ceny specjalne.

## Rozwiązanie
Dodaliśmy następujące mechanizmy automatycznego odświeżania:

### 1. Automatyczne odświeżanie przy focus okna
- Gdy użytkownik wraca do strony (przełącza karty przeglądarki)
- Event listener na `window focus`
- Event listener na `document visibilitychange`

### 2. Okresowe odświeżanie
- Co 30 sekund gdy strona jest aktywna
- Tylko gdy użytkownik nie jest w innej karcie

### 3. Przycisk ręcznego odświeżania
- Przycisk "Odśwież" z ikoną sync
- Animacja spin podczas ładowania
- Dostępny obok informacji o lokalizacji

## Pliki zmodyfikowane
- `/frontend/src/pages/CenowkiPage.jsx`
- `/frontend/src/pages/CenowkiPageNew.jsx`

## Jak przetestować

### Test 1: Automatyczne odświeżanie przy focus
1. Otwórz stronę Cenówki
2. Przełącz się na stronę Location Pricing  
3. Zmień cenę specjalną jakiegoś produktu
4. Wróć do strony Cenówki
5. ✅ Powinna pokazać zaktualizowaną cenę

### Test 2: Ręczne odświeżanie
1. Otwórz stronę Cenówki w jednej karcie
2. W drugiej karcie zmień ceny specjalne
3. Na stronie Cenówki kliknij przycisk "Odśwież"
4. ✅ Powinna pokazać zaktualizowane ceny

### Test 3: Okresowe odświeżanie
1. Otwórz stronę Cenówki
2. W drugiej karcie zmień ceny specjalne
3. Zostaw stronę Cenówki otwartą na 30+ sekund
4. ✅ Powinna automatycznie pobrać nowe dane

## Logi
Sprawdź w konsoli przeglądarki komunikaty:
- "Okno uzyskało focus - odświeżam dane cenówek"
- "Strona stała się widoczna - odświeżam dane cenówek"  
- "Periodic refresh - odświeżam dane cenówek"
- "Załadowano ceny lokalizacyjne: X"
