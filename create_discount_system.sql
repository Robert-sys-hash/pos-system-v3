-- System rabatów dla POS z pełnym zarządzaniem
-- Pozwala na definiowanie rabatów procentowych i kwotowych z limitami miesięcznymi

-- Tabela definicji rabatów
CREATE TABLE IF NOT EXISTS rabaty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nazwa TEXT NOT NULL UNIQUE,
    typ_rabatu VARCHAR(20) NOT NULL CHECK (typ_rabatu IN ('procentowy', 'kwotowy')), 
    wartosc DECIMAL(10,2) NOT NULL CHECK (wartosc >= 0),
    opis TEXT,
    kod_rabatu VARCHAR(50) UNIQUE, -- opcjonalny kod dla rabatu
    aktywny BOOLEAN NOT NULL DEFAULT 1,
    wymagane_uprawnienie TEXT, -- np. 'manager', 'admin', 'pracownik'
    
    -- Limity miesięczne
    limit_miesieczny_aktywny BOOLEAN DEFAULT 0,
    limit_miesieczny_kwota DECIMAL(10,2) DEFAULT 0,
    limit_miesieczny_ilosc INTEGER DEFAULT 0,
    
    -- Limity dzienne  
    limit_dzienny_aktywny BOOLEAN DEFAULT 0,
    limit_dzienny_kwota DECIMAL(10,2) DEFAULT 0,
    limit_dzienny_ilosc INTEGER DEFAULT 0,
    
    -- Warunki stosowania
    minimum_koszyka DECIMAL(10,2) DEFAULT 0, -- minimalna wartość koszyka
    maksimum_koszyka DECIMAL(10,2), -- maksymalna wartość koszyka (NULL = bez limitu)
    
    -- Metadane
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'admin'
);

-- Tabela użycia rabatów (historia zastosowanych rabatów)
CREATE TABLE IF NOT EXISTS rabaty_uzycie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rabat_id INTEGER NOT NULL,
    transakcja_id INTEGER, -- ID transakcji POS
    user_id TEXT, -- ID użytkownika który zastosował rabat
    
    -- Kwoty rabatu
    kwota_przed_rabatem DECIMAL(10,2) NOT NULL,
    kwota_rabatu DECIMAL(10,2) NOT NULL,
    kwota_po_rabacie DECIMAL(10,2) NOT NULL,
    
    -- Metadane
    data_zastosowania TEXT NOT NULL DEFAULT (datetime('now')),
    miesiac_rok TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')), -- dla raportów miesięcznych
    dzien TEXT NOT NULL DEFAULT (date('now')), -- dla raportów dziennych
    
    -- Dodatkowe informacje
    notatka TEXT, -- dodatkowa notatka o zastosowaniu rabatu
    ip_address TEXT, -- adres IP z którego zastosowano rabat
    
    FOREIGN KEY (rabat_id) REFERENCES rabaty(id) ON DELETE CASCADE,
    FOREIGN KEY (transakcja_id) REFERENCES pos_transakcje(id) ON DELETE SET NULL
);

-- Tabela transakcji POS (jeśli nie istnieje)
CREATE TABLE IF NOT EXISTS pos_transakcje (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numer_transakcji VARCHAR(50) UNIQUE NOT NULL,
    
    -- Kwoty podstawowe
    suma_netto DECIMAL(10,2) NOT NULL DEFAULT 0,
    suma_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
    suma_brutto DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Rabaty
    suma_rabatow DECIMAL(10,2) NOT NULL DEFAULT 0,
    ilosc_rabatow INTEGER NOT NULL DEFAULT 0,
    
    -- Płatność
    metoda_platnosci VARCHAR(50) DEFAULT 'gotowka',
    kwota_otrzymana DECIMAL(10,2),
    kwota_reszty DECIMAL(10,2),
    
    -- Status i metadane
    status VARCHAR(20) NOT NULL DEFAULT 'w_trakcie' CHECK (status IN ('w_trakcie', 'zakonczony', 'anulowany')),
    klient_id INTEGER,
    kasjer_id TEXT, -- ID użytkownika
    location_id INTEGER,
    shift_id INTEGER,
    
    -- Daty
    data_transakcji TEXT NOT NULL DEFAULT (datetime('now')),
    data_rozpoczecia TEXT NOT NULL DEFAULT (datetime('now')),
    data_zakonczenia TEXT,
    
    -- Dodatkowe informacje
    notatka TEXT,
    paragon_fiskalny VARCHAR(100), -- numer paragonu fiskalnego
    
    FOREIGN KEY (klient_id) REFERENCES customers(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- Tabela pozycji transakcji POS
CREATE TABLE IF NOT EXISTS pos_transakcje_pozycje (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transakcja_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    
    -- Ilość i ceny
    ilosc DECIMAL(10,3) NOT NULL DEFAULT 1,
    cena_jednostkowa_netto DECIMAL(10,2) NOT NULL,
    cena_jednostkowa_brutto DECIMAL(10,2) NOT NULL,
    stawka_vat DECIMAL(5,2) NOT NULL,
    
    -- Kwoty całkowite pozycji
    wartosc_netto DECIMAL(10,2) NOT NULL,
    wartosc_vat DECIMAL(10,2) NOT NULL,
    wartosc_brutto DECIMAL(10,2) NOT NULL,
    
    -- Rabaty na pozycji
    rabat_pozycji DECIMAL(10,2) DEFAULT 0,
    rabat_pozycji_procent DECIMAL(5,2) DEFAULT 0,
    
    -- Metadane
    data_dodania TEXT NOT NULL DEFAULT (datetime('now')),
    kolejnosc INTEGER, -- kolejność w koszyku
    
    FOREIGN KEY (transakcja_id) REFERENCES pos_transakcje(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabela rabatów miesięcznych użytkowników (dla śledzenia limitów)
CREATE TABLE IF NOT EXISTS rabaty_limity_miesieczne (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rabat_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    miesiac_rok TEXT NOT NULL, -- format YYYY-MM
    
    -- Wykorzystane limity
    wykorzystana_kwota DECIMAL(10,2) NOT NULL DEFAULT 0,
    wykorzystana_ilosc INTEGER NOT NULL DEFAULT 0,
    
    -- Ostatnia aktualizacja
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(rabat_id, user_id, miesiac_rok),
    FOREIGN KEY (rabat_id) REFERENCES rabaty(id) ON DELETE CASCADE
);

-- Tabela rabatów dziennych użytkowników (dla śledzenia limitów)
CREATE TABLE IF NOT EXISTS rabaty_limity_dzienne (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rabat_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    dzien TEXT NOT NULL, -- format YYYY-MM-DD
    
    -- Wykorzystane limity
    wykorzystana_kwota DECIMAL(10,2) NOT NULL DEFAULT 0,
    wykorzystana_ilosc INTEGER NOT NULL DEFAULT 0,
    
    -- Ostatnia aktualizacja
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(rabat_id, user_id, dzien),
    FOREIGN KEY (rabat_id) REFERENCES rabaty(id) ON DELETE CASCADE
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_rabaty_aktywny ON rabaty(aktywny);
CREATE INDEX IF NOT EXISTS idx_rabaty_typ ON rabaty(typ_rabatu);
CREATE INDEX IF NOT EXISTS idx_rabaty_kod ON rabaty(kod_rabatu);

CREATE INDEX IF NOT EXISTS idx_rabaty_uzycie_rabat ON rabaty_uzycie(rabat_id);
CREATE INDEX IF NOT EXISTS idx_rabaty_uzycie_transakcja ON rabaty_uzycie(transakcja_id);
CREATE INDEX IF NOT EXISTS idx_rabaty_uzycie_data ON rabaty_uzycie(data_zastosowania);
CREATE INDEX IF NOT EXISTS idx_rabaty_uzycie_miesiac ON rabaty_uzycie(miesiac_rok);
CREATE INDEX IF NOT EXISTS idx_rabaty_uzycie_dzien ON rabaty_uzycie(dzien);
CREATE INDEX IF NOT EXISTS idx_rabaty_uzycie_user ON rabaty_uzycie(user_id);

CREATE INDEX IF NOT EXISTS idx_pos_transakcje_status ON pos_transakcje(status);
CREATE INDEX IF NOT EXISTS idx_pos_transakcje_data ON pos_transakcje(data_transakcji);
CREATE INDEX IF NOT EXISTS idx_pos_transakcje_kasjer ON pos_transakcje(kasjer_id);
CREATE INDEX IF NOT EXISTS idx_pos_transakcje_location ON pos_transakcje(location_id);
CREATE INDEX IF NOT EXISTS idx_pos_transakcje_numer ON pos_transakcje(numer_transakcji);

CREATE INDEX IF NOT EXISTS idx_pos_pozycje_transakcja ON pos_transakcje_pozycje(transakcja_id);
CREATE INDEX IF NOT EXISTS idx_pos_pozycje_produkt ON pos_transakcje_pozycje(product_id);

CREATE INDEX IF NOT EXISTS idx_rabaty_limity_miesiac ON rabaty_limity_miesieczne(rabat_id, user_id, miesiac_rok);
CREATE INDEX IF NOT EXISTS idx_rabaty_limity_dzien ON rabaty_limity_dzienne(rabat_id, user_id, dzien);

-- Triggery dla automatycznych aktualizacji

-- Trigger aktualizujący updated_at w tabeli rabaty
CREATE TRIGGER IF NOT EXISTS update_rabaty_timestamp 
    AFTER UPDATE ON rabaty
BEGIN
    UPDATE rabaty 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger aktualizujący sumy w transakcji po dodaniu pozycji
CREATE TRIGGER IF NOT EXISTS update_transakcja_suma_after_insert
    AFTER INSERT ON pos_transakcje_pozycje
BEGIN
    UPDATE pos_transakcje 
    SET 
        suma_netto = (
            SELECT COALESCE(SUM(wartosc_netto), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = NEW.transakcja_id
        ),
        suma_vat = (
            SELECT COALESCE(SUM(wartosc_vat), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = NEW.transakcja_id
        ),
        suma_brutto = (
            SELECT COALESCE(SUM(wartosc_brutto), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = NEW.transakcja_id
        )
    WHERE id = NEW.transakcja_id;
END;

-- Trigger aktualizujący sumy w transakcji po aktualizacji pozycji
CREATE TRIGGER IF NOT EXISTS update_transakcja_suma_after_update
    AFTER UPDATE ON pos_transakcje_pozycje
BEGIN
    UPDATE pos_transakcje 
    SET 
        suma_netto = (
            SELECT COALESCE(SUM(wartosc_netto), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = NEW.transakcja_id
        ),
        suma_vat = (
            SELECT COALESCE(SUM(wartosc_vat), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = NEW.transakcja_id
        ),
        suma_brutto = (
            SELECT COALESCE(SUM(wartosc_brutto), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = NEW.transakcja_id
        )
    WHERE id = NEW.transakcja_id;
END;

-- Trigger aktualizujący sumy w transakcji po usunięciu pozycji
CREATE TRIGGER IF NOT EXISTS update_transakcja_suma_after_delete
    AFTER DELETE ON pos_transakcje_pozycje
BEGIN
    UPDATE pos_transakcje 
    SET 
        suma_netto = (
            SELECT COALESCE(SUM(wartosc_netto), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = OLD.transakcja_id
        ),
        suma_vat = (
            SELECT COALESCE(SUM(wartosc_vat), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = OLD.transakcja_id
        ),
        suma_brutto = (
            SELECT COALESCE(SUM(wartosc_brutto), 0) 
            FROM pos_transakcje_pozycje 
            WHERE transakcja_id = OLD.transakcja_id
        )
    WHERE id = OLD.transakcja_id;
END;

-- Trigger aktualizujący limity miesięczne po zastosowaniu rabatu
CREATE TRIGGER IF NOT EXISTS update_rabaty_limity_miesieczne
    AFTER INSERT ON rabaty_uzycie
BEGIN
    INSERT OR REPLACE INTO rabaty_limity_miesieczne (
        rabat_id, user_id, miesiac_rok, wykorzystana_kwota, wykorzystana_ilosc, updated_at
    )
    VALUES (
        NEW.rabat_id,
        NEW.user_id,
        NEW.miesiac_rok,
        COALESCE((
            SELECT wykorzystana_kwota FROM rabaty_limity_miesieczne 
            WHERE rabat_id = NEW.rabat_id AND user_id = NEW.user_id AND miesiac_rok = NEW.miesiac_rok
        ), 0) + NEW.kwota_rabatu,
        COALESCE((
            SELECT wykorzystana_ilosc FROM rabaty_limity_miesieczne 
            WHERE rabat_id = NEW.rabat_id AND user_id = NEW.user_id AND miesiac_rok = NEW.miesiac_rok
        ), 0) + 1,
        datetime('now')
    );
END;

-- Trigger aktualizujący limity dzienne po zastosowaniu rabatu
CREATE TRIGGER IF NOT EXISTS update_rabaty_limity_dzienne
    AFTER INSERT ON rabaty_uzycie
BEGIN
    INSERT OR REPLACE INTO rabaty_limity_dzienne (
        rabat_id, user_id, dzien, wykorzystana_kwota, wykorzystana_ilosc, updated_at
    )
    VALUES (
        NEW.rabat_id,
        NEW.user_id,
        NEW.dzien,
        COALESCE((
            SELECT wykorzystana_kwota FROM rabaty_limity_dzienne 
            WHERE rabat_id = NEW.rabat_id AND user_id = NEW.user_id AND dzien = NEW.dzien
        ), 0) + NEW.kwota_rabatu,
        COALESCE((
            SELECT wykorzystana_ilosc FROM rabaty_limity_dzienne 
            WHERE rabat_id = NEW.rabat_id AND user_id = NEW.user_id AND dzien = NEW.dzien
        ), 0) + 1,
        datetime('now')
    );
END;

-- Widoki dla raportowania

-- Widok aktywnych rabatów z informacjami o limitach
CREATE VIEW IF NOT EXISTS v_rabaty_aktywne AS
SELECT 
    r.id,
    r.nazwa,
    r.typ_rabatu,
    r.wartosc,
    r.opis,
    r.kod_rabatu,
    r.wymagane_uprawnienie,
    r.limit_miesieczny_aktywny,
    r.limit_miesieczny_kwota,
    r.limit_miesieczny_ilosc,
    r.limit_dzienny_aktywny,
    r.limit_dzienny_kwota,
    r.limit_dzienny_ilosc,
    r.minimum_koszyka,
    r.maksimum_koszyka,
    r.created_at,
    r.created_by,
    
    -- Statystyki użycia
    COALESCE(stats.total_uzycia, 0) as total_uzycia,
    COALESCE(stats.total_kwota_rabatow, 0) as total_kwota_rabatow,
    COALESCE(stats.uzycia_dzisiaj, 0) as uzycia_dzisiaj,
    COALESCE(stats.kwota_rabatow_dzisiaj, 0) as kwota_rabatow_dzisiaj,
    COALESCE(stats.uzycia_ten_miesiac, 0) as uzycia_ten_miesiac,
    COALESCE(stats.kwota_rabatow_ten_miesiac, 0) as kwota_rabatow_ten_miesiac

FROM rabaty r
LEFT JOIN (
    SELECT 
        rabat_id,
        COUNT(*) as total_uzycia,
        SUM(kwota_rabatu) as total_kwota_rabatow,
        COUNT(CASE WHEN dzien = date('now') THEN 1 END) as uzycia_dzisiaj,
        SUM(CASE WHEN dzien = date('now') THEN kwota_rabatu ELSE 0 END) as kwota_rabatow_dzisiaj,
        COUNT(CASE WHEN miesiac_rok = strftime('%Y-%m', 'now') THEN 1 END) as uzycia_ten_miesiac,
        SUM(CASE WHEN miesiac_rok = strftime('%Y-%m', 'now') THEN kwota_rabatu ELSE 0 END) as kwota_rabatow_ten_miesiac
    FROM rabaty_uzycie
    GROUP BY rabat_id
) stats ON r.id = stats.rabat_id
WHERE r.aktywny = 1
ORDER BY r.nazwa;

-- Widok raportów rabatów dziennych
CREATE VIEW IF NOT EXISTS v_raporty_rabaty_dzienne AS
SELECT 
    ru.dzien,
    r.nazwa as rabat_nazwa,
    r.typ_rabatu,
    ru.user_id as kasjer,
    COUNT(*) as ilosc_uzyc,
    SUM(ru.kwota_rabatu) as suma_rabatow,
    AVG(ru.kwota_rabatu) as sredni_rabat,
    SUM(ru.kwota_przed_rabatem) as suma_przed_rabatem,
    SUM(ru.kwota_po_rabacie) as suma_po_rabacie,
    MIN(ru.kwota_rabatu) as min_rabat,
    MAX(ru.kwota_rabatu) as max_rabat

FROM rabaty_uzycie ru
JOIN rabaty r ON ru.rabat_id = r.id
GROUP BY ru.dzien, ru.rabat_id, ru.user_id
ORDER BY ru.dzien DESC, r.nazwa, ru.user_id;

-- Widok raportów rabatów miesięcznych
CREATE VIEW IF NOT EXISTS v_raporty_rabaty_miesieczne AS
SELECT 
    ru.miesiac_rok,
    r.nazwa as rabat_nazwa,
    r.typ_rabatu,
    ru.user_id as kasjer,
    COUNT(*) as ilosc_uzyc,
    SUM(ru.kwota_rabatu) as suma_rabatow,
    AVG(ru.kwota_rabatu) as sredni_rabat,
    SUM(ru.kwota_przed_rabatem) as suma_przed_rabatem,
    SUM(ru.kwota_po_rabacie) as suma_po_rabacie,
    
    -- Sprawdź limity miesięczne
    r.limit_miesieczny_kwota,
    r.limit_miesieczny_ilosc,
    CASE 
        WHEN r.limit_miesieczny_aktywny = 1 THEN
            CASE 
                WHEN r.limit_miesieczny_kwota > 0 AND SUM(ru.kwota_rabatu) >= r.limit_miesieczny_kwota THEN 'PRZEKROCZONY_KWOTA'
                WHEN r.limit_miesieczny_ilosc > 0 AND COUNT(*) >= r.limit_miesieczny_ilosc THEN 'PRZEKROCZONY_ILOSC'
                ELSE 'OK'
            END
        ELSE 'BRAK_LIMITU'
    END as status_limitu

FROM rabaty_uzycie ru
JOIN rabaty r ON ru.rabat_id = r.id
GROUP BY ru.miesiac_rok, ru.rabat_id, ru.user_id
ORDER BY ru.miesiac_rok DESC, r.nazwa, ru.user_id;

-- Widok podsumowania sprzedaży z rabatami
CREATE VIEW IF NOT EXISTS v_sprzedaz_z_rabatami AS
SELECT 
    t.id as transakcja_id,
    t.numer_transakcji,
    t.data_transakcji,
    t.kasjer_id,
    t.location_id,
    t.suma_brutto,
    t.suma_rabatow,
    t.ilosc_rabatow,
    
    -- Procent rabatu
    CASE 
        WHEN t.suma_brutto > 0 THEN ROUND((t.suma_rabatow * 100.0) / (t.suma_brutto + t.suma_rabatow), 2)
        ELSE 0
    END as procent_rabatu,
    
    -- Informacje o rabatach
    GROUP_CONCAT(r.nazwa, ', ') as zastosowane_rabaty,
    GROUP_CONCAT(ru.kwota_rabatu, ', ') as kwoty_rabatow

FROM pos_transakcje t
LEFT JOIN rabaty_uzycie ru ON t.id = ru.transakcja_id
LEFT JOIN rabaty r ON ru.rabat_id = r.id
WHERE t.status = 'zakonczony'
GROUP BY t.id, t.numer_transakcji, t.data_transakcji, t.kasjer_id, t.location_id, t.suma_brutto, t.suma_rabatow, t.ilosc_rabatow
ORDER BY t.data_transakcji DESC;

-- Wstawienie przykładowych rabatów
INSERT OR IGNORE INTO rabaty (nazwa, typ_rabatu, wartosc, opis, wymagane_uprawnienie, limit_miesieczny_aktywny, limit_miesieczny_kwota, limit_miesieczny_ilosc) VALUES
('Standard', 'procentowy', 10.00, 'Standardowy rabat pracowniczy 10%', 'pracownik', 1, 500.00, 20),
('Manager', 'procentowy', 15.00, 'Rabat dla menedżerów 15%', 'manager', 1, 1000.00, 30),
('VIP Klient', 'procentowy', 5.00, 'Rabat dla klientów VIP 5%', 'pracownik', 0, 0, 0),
('Wyprzedaż', 'kwotowy', 20.00, 'Rabat wyprzedażowy 20 zł', 'pracownik', 1, 200.00, 10),
('Promocja Świąteczna', 'procentowy', 20.00, 'Specjalny rabat świąteczny 20%', 'manager', 1, 2000.00, 50);
