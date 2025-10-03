-- Schemat bazy danych dla modułu Faktur Sprzedaży
-- Stworzony: 2025-08-29

-- Tabela główna faktur sprzedaży
CREATE TABLE IF NOT EXISTS faktury_sprzedazy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Numeracja
    numer_faktury TEXT UNIQUE NOT NULL,
    data_wystawienia DATE NOT NULL,
    data_sprzedazy DATE NOT NULL,
    termin_platnosci DATE NOT NULL,
    
    -- Powiązania
    paragon_id INTEGER, -- ID transakcji z pos_transakcje (jeśli faktura z paragonu)
    klient_id INTEGER, -- ID klienta
    location_id INTEGER NOT NULL, -- lokalizacja wystawienia
    
    -- Dane sprzedawcy (kopiowane z tabeli firma)
    sprzedawca_nazwa TEXT NOT NULL,
    sprzedawca_nip TEXT,
    sprzedawca_regon TEXT,
    sprzedawca_adres TEXT,
    sprzedawca_miasto TEXT,
    sprzedawca_kod_pocztowy TEXT,
    sprzedawca_telefon TEXT,
    sprzedawca_email TEXT,
    
    -- Dane nabywcy
    nabywca_nazwa TEXT NOT NULL,
    nabywca_nip TEXT,
    nabywca_regon TEXT,
    nabywca_adres TEXT,
    nabywca_miasto TEXT,
    nabywca_kod_pocztowy TEXT,
    nabywca_telefon TEXT,
    nabywca_email TEXT,
    
    -- Kwoty
    suma_netto DECIMAL(10,2) NOT NULL DEFAULT 0,
    suma_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
    suma_brutto DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Status i typ
    status TEXT NOT NULL DEFAULT 'wystawiona', -- wystawiona, anulowana, skorygowana
    typ_faktury TEXT NOT NULL DEFAULT 'normalna', -- normalna, korekta, zaliczka
    faktura_oryginalna_id INTEGER, -- ID faktury oryginalnej (dla korekt)
    
    -- Płatność
    forma_platnosci TEXT NOT NULL DEFAULT 'gotowka',
    status_platnosci TEXT NOT NULL DEFAULT 'nieoplacona', -- nieoplacona, oplacona, czesciowo_oplacona
    kwota_zaplacona DECIMAL(10,2) DEFAULT 0,
    
    -- Uwagi i notatki
    uwagi TEXT,
    uwagi_wewnetrzne TEXT,
    
    -- Metadane
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (paragon_id) REFERENCES pos_transakcje(id),
    FOREIGN KEY (klient_id) REFERENCES pos_klienci(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (faktura_oryginalna_id) REFERENCES faktury_sprzedazy(id)
);

-- Tabela pozycji faktur sprzedaży
CREATE TABLE IF NOT EXISTS faktury_sprzedazy_pozycje (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Powiązania
    faktura_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    
    -- Dane produktu (kopiowane w momencie wystawienia)
    nazwa_produktu TEXT NOT NULL,
    kod_produktu TEXT,
    jednostka TEXT NOT NULL DEFAULT 'szt',
    
    -- Ilość i ceny
    ilosc DECIMAL(10,3) NOT NULL,
    cena_jednostkowa_netto DECIMAL(10,2) NOT NULL,
    cena_jednostkowa_brutto DECIMAL(10,2) NOT NULL,
    stawka_vat DECIMAL(5,2) NOT NULL,
    
    -- Kwoty całkowite pozycji
    wartosc_netto DECIMAL(10,2) NOT NULL,
    wartosc_vat DECIMAL(10,2) NOT NULL,
    wartosc_brutto DECIMAL(10,2) NOT NULL,
    
    -- Rabaty na pozycji
    rabat_kwota DECIMAL(10,2) DEFAULT 0,
    rabat_procent DECIMAL(5,2) DEFAULT 0,
    
    -- Metadane
    kolejnosc INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (faktura_id) REFERENCES faktury_sprzedazy(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES produkty(id)
);

-- Tabela podsumowań VAT
CREATE TABLE IF NOT EXISTS faktury_sprzedazy_vat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faktura_id INTEGER NOT NULL,
    stawka_vat DECIMAL(5,2) NOT NULL,
    podstawa_netto DECIMAL(10,2) NOT NULL,
    kwota_vat DECIMAL(10,2) NOT NULL,
    wartosc_brutto DECIMAL(10,2) NOT NULL,
    
    FOREIGN KEY (faktura_id) REFERENCES faktury_sprzedazy(id) ON DELETE CASCADE
);

-- Tabela numeracji faktur
CREATE TABLE IF NOT EXISTS faktury_numeracja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rok INTEGER NOT NULL,
    miesiac INTEGER,
    location_id INTEGER,
    typ_faktury TEXT NOT NULL DEFAULT 'sprzedaz',
    ostatni_numer INTEGER NOT NULL DEFAULT 0,
    format_numeru TEXT NOT NULL DEFAULT '{numer}/{rok}',
    
    UNIQUE(rok, miesiac, location_id, typ_faktury)
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_faktury_sprzedazy_numer ON faktury_sprzedazy(numer_faktury);
CREATE INDEX IF NOT EXISTS idx_faktury_sprzedazy_data ON faktury_sprzedazy(data_wystawienia);
CREATE INDEX IF NOT EXISTS idx_faktury_sprzedazy_klient ON faktury_sprzedazy(klient_id);
CREATE INDEX IF NOT EXISTS idx_faktury_sprzedazy_paragon ON faktury_sprzedazy(paragon_id);
CREATE INDEX IF NOT EXISTS idx_faktury_sprzedazy_status ON faktury_sprzedazy(status);
CREATE INDEX IF NOT EXISTS idx_faktury_pozycje_faktura ON faktury_sprzedazy_pozycje(faktura_id);
CREATE INDEX IF NOT EXISTS idx_faktury_pozycje_produkt ON faktury_sprzedazy_pozycje(product_id);

-- Triggery do automatycznego przeliczania sum
CREATE TRIGGER IF NOT EXISTS update_faktura_suma_after_pozycja_insert
    AFTER INSERT ON faktury_sprzedazy_pozycje
BEGIN
    -- Aktualizuj sumy w fakturze
    UPDATE faktury_sprzedazy 
    SET 
        suma_netto = (
            SELECT COALESCE(SUM(wartosc_netto), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = NEW.faktura_id
        ),
        suma_vat = (
            SELECT COALESCE(SUM(wartosc_vat), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = NEW.faktura_id
        ),
        suma_brutto = (
            SELECT COALESCE(SUM(wartosc_brutto), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = NEW.faktura_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.faktura_id;
    
    -- Zaktualizuj podsumowanie VAT
    DELETE FROM faktury_sprzedazy_vat WHERE faktura_id = NEW.faktura_id;
    INSERT INTO faktury_sprzedazy_vat (faktura_id, stawka_vat, podstawa_netto, kwota_vat, wartosc_brutto)
    SELECT 
        NEW.faktura_id,
        stawka_vat,
        SUM(wartosc_netto) as podstawa_netto,
        SUM(wartosc_vat) as kwota_vat,
        SUM(wartosc_brutto) as wartosc_brutto
    FROM faktury_sprzedazy_pozycje 
    WHERE faktura_id = NEW.faktura_id
    GROUP BY stawka_vat;
END;

CREATE TRIGGER IF NOT EXISTS update_faktura_suma_after_pozycja_update
    AFTER UPDATE ON faktury_sprzedazy_pozycje
BEGIN
    -- Aktualizuj sumy w fakturze
    UPDATE faktury_sprzedazy 
    SET 
        suma_netto = (
            SELECT COALESCE(SUM(wartosc_netto), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = NEW.faktura_id
        ),
        suma_vat = (
            SELECT COALESCE(SUM(wartosc_vat), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = NEW.faktura_id
        ),
        suma_brutto = (
            SELECT COALESCE(SUM(wartosc_brutto), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = NEW.faktura_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.faktura_id;
    
    -- Zaktualizuj podsumowanie VAT
    DELETE FROM faktury_sprzedazy_vat WHERE faktura_id = NEW.faktura_id;
    INSERT INTO faktury_sprzedazy_vat (faktura_id, stawka_vat, podstawa_netto, kwota_vat, wartosc_brutto)
    SELECT 
        NEW.faktura_id,
        stawka_vat,
        SUM(wartosc_netto) as podstawa_netto,
        SUM(wartosc_vat) as kwota_vat,
        SUM(wartosc_brutto) as wartosc_brutto
    FROM faktury_sprzedazy_pozycje 
    WHERE faktura_id = NEW.faktura_id
    GROUP BY stawka_vat;
END;

CREATE TRIGGER IF NOT EXISTS update_faktura_suma_after_pozycja_delete
    AFTER DELETE ON faktury_sprzedazy_pozycje
BEGIN
    -- Aktualizuj sumy w fakturze
    UPDATE faktury_sprzedazy 
    SET 
        suma_netto = (
            SELECT COALESCE(SUM(wartosc_netto), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = OLD.faktura_id
        ),
        suma_vat = (
            SELECT COALESCE(SUM(wartosc_vat), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = OLD.faktura_id
        ),
        suma_brutto = (
            SELECT COALESCE(SUM(wartosc_brutto), 0) 
            FROM faktury_sprzedazy_pozycje 
            WHERE faktura_id = OLD.faktura_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.faktura_id;
    
    -- Zaktualizuj podsumowanie VAT
    DELETE FROM faktury_sprzedazy_vat WHERE faktura_id = OLD.faktura_id;
    INSERT INTO faktury_sprzedazy_vat (faktura_id, stawka_vat, podstawa_netto, kwota_vat, wartosc_brutto)
    SELECT 
        OLD.faktura_id,
        stawka_vat,
        SUM(wartosc_netto) as podstawa_netto,
        SUM(wartosc_vat) as kwota_vat,
        SUM(wartosc_brutto) as wartosc_brutto
    FROM faktury_sprzedazy_pozycje 
    WHERE faktura_id = OLD.faktura_id
    GROUP BY stawka_vat;
END;

-- Widok do łatwego dostępu do faktur z danymi klientów
CREATE VIEW IF NOT EXISTS v_faktury_sprzedazy AS
SELECT 
    f.*,
    k.nazwa as klient_nazwa,
    k.email as klient_email,
    k.telefon as klient_telefon,
    l.nazwa as location_nazwa,
    p.numer_transakcji as paragon_numer
FROM faktury_sprzedazy f
LEFT JOIN pos_klienci k ON f.klient_id = k.id
LEFT JOIN locations l ON f.location_id = l.id
LEFT JOIN pos_transakcje p ON f.paragon_id = p.id;

-- Dodaj przykładowe dane do numeracji
INSERT OR IGNORE INTO faktury_numeracja (rok, location_id, typ_faktury, format_numeru) 
VALUES (2025, 1, 'sprzedaz', 'FS/{numer}/{rok}');
