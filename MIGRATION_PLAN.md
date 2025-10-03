"""
PLAN MIGRACJI - ETAP 1: Rozszerzenie Backend API

1. Produkty API - rozbudowa endpoints
2. Transakcje/Koszyk API 
3. Płatności API
4. Kupony API
5. Zarządzanie stanem magazynu
6. Zmiana kasowa API
7. Statystyki i raporty API
"""

# PRODUKTY API - dodatkowe endpointy
PRODUCTS_ENDPOINTS = [
    "GET /api/products/search",           # ✅ już jest
    "GET /api/products/:id",              # szczegóły produktu  
    "GET /api/products/barcode/:code",    # wyszukiwanie po kodzie kreskowym
    "GET /api/products/categories",       # kategorie produktów
    "PUT /api/products/:id/inventory",    # aktualizacja stanu magazynu
    "GET /api/products/low-stock",        # produkty o niskim stanie
]

# TRANSAKCJE/KOSZYK API
TRANSACTIONS_ENDPOINTS = [
    "POST /api/transactions",             # tworzenie nowej transakcji
    "GET /api/transactions/:id",          # szczegóły transakcji
    "PUT /api/transactions/:id",          # aktualizacja transakcji (draft)
    "DELETE /api/transactions/:id",       # anulowanie transakcji
    "POST /api/transactions/:id/complete", # finalizacja transakcji
    "GET /api/transactions/drafts",       # niezakończone transakcje
    "POST /api/transactions/:id/print",   # drukowanie paragonu
]

# PŁATNOŚCI API  
PAYMENTS_ENDPOINTS = [
    "POST /api/payments/process",         # przetwarzanie płatności
    "GET /api/payments/methods",          # dostępne metody płatności
    "POST /api/payments/split",           # płatność mieszana
    "GET /api/payments/stats",            # statystyki płatności
]

# KUPONY API
COUPONS_ENDPOINTS = [
    "GET /api/coupons/validate/:code",    # walidacja kuponu
    "POST /api/coupons/apply",            # zastosowanie kuponu
    "GET /api/coupons/customer/:id",      # kupony klienta
    "GET /api/coupons/active",            # aktywne kupony
]

# ZMIANA KASOWA API
SHIFT_ENDPOINTS = [
    "GET /api/shifts/current",            # aktualna zmiana
    "POST /api/shifts/open",              # otwarcie zmiany
    "POST /api/shifts/close",             # zamknięcie zmiany
    "GET /api/shifts/:id/report",         # raport zmiany
    "GET /api/shifts/history",            # historia zmian
]

# MESSENGER API
MESSENGER_ENDPOINTS = [
    "GET /api/messenger/messages",        # lista wiadomości
    "POST /api/messenger/send",           # wysłanie wiadomości
    "PUT /api/messenger/:id/read",        # oznacz jako przeczytane
    "GET /api/messenger/unread-count",    # liczba nieprzeczytanych
]
