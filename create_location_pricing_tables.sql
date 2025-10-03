-- Skrypt tworzący tabele dla systemu cen lokalizacyjnych
-- Pozwala na ustawienie różnych cen sprzedaży dla każdej lokalizacji

-- Tabela główna przechowująca ceny produktów per lokalizacja
CREATE TABLE IF NOT EXISTS location_product_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    cena_sprzedazy_netto REAL NOT NULL DEFAULT 0,
    cena_sprzedazy_brutto REAL NOT NULL DEFAULT 0,
    data_od DATE NOT NULL DEFAULT (date('now')),
    data_do DATE NULL,
    aktywny BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'admin',
    uwagi TEXT,
    
    -- Klucze obce
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES produkty(id) ON DELETE CASCADE,
    
    -- Indeksy unikalne - jeden aktywny cennik na produkt per lokalizacja
    UNIQUE(location_id, product_id, data_od)
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_location_product_prices_location ON location_product_prices(location_id);
CREATE INDEX IF NOT EXISTS idx_location_product_prices_product ON location_product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_location_product_prices_active ON location_product_prices(aktywny, data_od, data_do);
CREATE INDEX IF NOT EXISTS idx_location_product_prices_dates ON location_product_prices(data_od, data_do);

-- Trigger automatycznie ustawiający updated_at przy każdej zmianie
CREATE TRIGGER IF NOT EXISTS update_location_product_prices_timestamp 
    AFTER UPDATE ON location_product_prices
BEGIN
    UPDATE location_product_prices 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger walidujący poprawność dat
CREATE TRIGGER IF NOT EXISTS validate_location_price_dates
    BEFORE INSERT ON location_product_prices
BEGIN
    -- Sprawdź czy data_do jest większa od data_od (jeśli podana)
    SELECT CASE 
        WHEN NEW.data_do IS NOT NULL AND NEW.data_do < NEW.data_od THEN
            RAISE(ABORT, 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia')
    END;
    
    -- Sprawdź czy ceny są dodatnie
    SELECT CASE 
        WHEN NEW.cena_sprzedazy_netto < 0 OR NEW.cena_sprzedazy_brutto < 0 THEN
            RAISE(ABORT, 'Ceny nie mogą być ujemne')
    END;
END;

-- Trigger walidujący przy UPDATE
CREATE TRIGGER IF NOT EXISTS validate_location_price_dates_update
    BEFORE UPDATE ON location_product_prices
BEGIN
    -- Sprawdź czy data_do jest większa od data_od (jeśli podana)
    SELECT CASE 
        WHEN NEW.data_do IS NOT NULL AND NEW.data_do < NEW.data_od THEN
            RAISE(ABORT, 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia')
    END;
    
    -- Sprawdź czy ceny są dodatnie
    SELECT CASE 
        WHEN NEW.cena_sprzedazy_netto < 0 OR NEW.cena_sprzedazy_brutto < 0 THEN
            RAISE(ABORT, 'Ceny nie mogą być ujemne')
    END;
END;

-- Widok ułatwiający pobieranie aktualnych cen z pełnymi informacjami
CREATE VIEW IF NOT EXISTS v_current_location_prices AS
SELECT 
    lpp.id,
    lpp.location_id,
    lpp.product_id,
    lpp.cena_sprzedazy_netto,
    lpp.cena_sprzedazy_brutto,
    lpp.data_od,
    lpp.data_do,
    lpp.created_at,
    lpp.created_by,
    lpp.uwagi,
    
    -- Informacje o lokalizacji
    l.kod_lokalizacji,
    l.nazwa as location_name,
    l.typ as location_type,
    
    -- Informacje o produkcie
    p.nazwa as product_name,
    p.kod_produktu,
    p.ean as kod_kreskowy,
    p.cena_sprzedazy_netto as default_price_netto,
    p.cena_sprzedazy_brutto as default_price_brutto,
    p.stawka_vat,
    p.kategoria,
    
    -- Różnica w cenach względem ceny domyślnej
    (lpp.cena_sprzedazy_netto - p.cena_sprzedazy_netto) as diff_netto,
    (lpp.cena_sprzedazy_brutto - p.cena_sprzedazy_brutto) as diff_brutto,
    
    -- Procentowa różnica
    CASE 
        WHEN p.cena_sprzedazy_brutto > 0 THEN
            ROUND(((lpp.cena_sprzedazy_brutto - p.cena_sprzedazy_brutto) / p.cena_sprzedazy_brutto) * 100, 2)
        ELSE 0
    END as diff_percent

FROM location_product_prices lpp
JOIN locations l ON lpp.location_id = l.id
JOIN produkty p ON lpp.product_id = p.id
WHERE lpp.aktywny = 1 
  AND (lpp.data_do IS NULL OR lpp.data_do >= date('now'))
ORDER BY l.nazwa, p.nazwa;

-- Widok pokazujący wszystkie ceny (aktywne i nieaktywne) z historią
CREATE VIEW IF NOT EXISTS v_location_prices_history AS
SELECT 
    lpp.id,
    lpp.location_id,
    lpp.product_id,
    lpp.cena_sprzedazy_netto,
    lpp.cena_sprzedazy_brutto,
    lpp.data_od,
    lpp.data_do,
    lpp.aktywny,
    lpp.created_at,
    lpp.updated_at,
    lpp.created_by,
    lpp.uwagi,
    
    -- Informacje o lokalizacji
    l.kod_lokalizacji,
    l.nazwa as location_name,
    
    -- Informacje o produkcie
    p.nazwa as product_name,
    p.kod_produktu,
    p.ean as kod_kreskowy,
    p.cena_sprzedazy_netto as default_price_netto,
    p.cena_sprzedazy_brutto as default_price_brutto,
    
    -- Status okresu
    CASE 
        WHEN lpp.data_do IS NULL THEN 'Bezterminowo'
        WHEN lpp.data_do >= date('now') THEN 'Aktywny'
        ELSE 'Zakończony'
    END as status_okresu

FROM location_product_prices lpp
JOIN locations l ON lpp.location_id = l.id
JOIN produkty p ON lpp.product_id = p.id
ORDER BY l.nazwa, p.nazwa, lpp.data_od DESC;

-- Funkcja do pobierania aktualnej ceny produktu dla lokalizacji
-- (to będzie używane w aplikacji)
/*
Przykład użycia w kodzie Python:

def get_effective_price(location_id, product_id):
    cursor.execute('''
        SELECT 
            COALESCE(lpp.cena_sprzedazy_netto, p.cena_sprzedazy_netto) as effective_price_netto,
            COALESCE(lpp.cena_sprzedazy_brutto, p.cena_sprzedazy_brutto) as effective_price_brutto,
            CASE 
                WHEN lpp.id IS NOT NULL THEN 'location_specific'
                ELSE 'default'
            END as price_source
        FROM produkty p
        LEFT JOIN location_product_prices lpp ON (
            lpp.product_id = p.id 
            AND lpp.location_id = ?
            AND lpp.aktywny = 1
            AND (lpp.data_do IS NULL OR lpp.data_do >= date('now'))
        )
        WHERE p.id = ?
    ''', (location_id, product_id))
*/
