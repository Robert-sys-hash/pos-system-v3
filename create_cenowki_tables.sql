-- Skrypt tworzący tabele dla systemu cenowek z uproszczonymi nazwami produktów
-- Pozwala na zarządzanie cenowkami z uproszczonymi nazwami produktów

-- Tabela główna cenowek z uproszczonymi nazwami
CREATE TABLE IF NOT EXISTS cenowki (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    nazwa_uproszczona TEXT NOT NULL,
    cena_cenowkowa DECIMAL(10,2) NOT NULL DEFAULT 0,
    cena_promocyjna DECIMAL(10,2) NULL,
    data_od DATE NOT NULL DEFAULT (date('now')),
    data_do DATE NULL,
    aktywny BOOLEAN NOT NULL DEFAULT 1,
    typ_cenowki VARCHAR(50) DEFAULT 'standardowa', -- 'standardowa', 'promocyjna', 'wyprzedaz'
    priorytet INTEGER DEFAULT 0, -- dla sortowania w cenowkach
    kategoria_cenowki VARCHAR(100), -- dodatkowa kategoryzacja dla cenowek
    opis_cenowki TEXT, -- dodatkowy opis dla cenowki
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'admin',
    
    -- Klucze obce
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    -- Indeksy unikalne - jeden aktywny cennik na produkt
    UNIQUE(product_id, data_od, aktywny)
);

-- Tabela szablonów nazw uproszczonych dla kategorii
CREATE TABLE IF NOT EXISTS cenowki_szablony_nazw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kategoria_id INTEGER NULL,
    producent_id INTEGER NULL,
    szablon_nazwy TEXT NOT NULL, -- np. "{{producent}} {{nazwa_podstawowa}}"
    priorytet INTEGER DEFAULT 0,
    aktywny BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (kategoria_id) REFERENCES categories(id),
    FOREIGN KEY (producent_id) REFERENCES producenci(id)
);

-- Tabela historii zmian nazw uproszczonych
CREATE TABLE IF NOT EXISTS cenowki_historia_nazw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    nazwa_uproszczona_stara TEXT,
    nazwa_uproszczona_nowa TEXT NOT NULL,
    powod_zmiany TEXT,
    data_zmiany TEXT DEFAULT (datetime('now')),
    zmienil_user TEXT DEFAULT 'admin',
    
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_cenowki_product ON cenowki(product_id);
CREATE INDEX IF NOT EXISTS idx_cenowki_aktywny ON cenowki(aktywny, data_od, data_do);
CREATE INDEX IF NOT EXISTS idx_cenowki_dates ON cenowki(data_od, data_do);
CREATE INDEX IF NOT EXISTS idx_cenowki_typ ON cenowki(typ_cenowki);
CREATE INDEX IF NOT EXISTS idx_cenowki_kategoria ON cenowki(kategoria_cenowki);

CREATE INDEX IF NOT EXISTS idx_cenowki_szablony_kategoria ON cenowki_szablony_nazw(kategoria_id);
CREATE INDEX IF NOT EXISTS idx_cenowki_szablony_producent ON cenowki_szablony_nazw(producent_id);

CREATE INDEX IF NOT EXISTS idx_cenowki_historia_product ON cenowki_historia_nazw(product_id);
CREATE INDEX IF NOT EXISTS idx_cenowki_historia_data ON cenowki_historia_nazw(data_zmiany);

-- Trigger automatycznie ustawiający updated_at przy każdej zmianie
CREATE TRIGGER IF NOT EXISTS update_cenowki_timestamp 
    AFTER UPDATE ON cenowki
BEGIN
    UPDATE cenowki 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger zapisujący historię zmian nazw uproszczonych
CREATE TRIGGER IF NOT EXISTS cenowki_historia_trigger
    AFTER UPDATE OF nazwa_uproszczona ON cenowki
    WHEN OLD.nazwa_uproszczona != NEW.nazwa_uproszczona
BEGIN
    INSERT INTO cenowki_historia_nazw (
        product_id, 
        nazwa_uproszczona_stara, 
        nazwa_uproszczona_nowa,
        powod_zmiany
    )
    VALUES (
        NEW.product_id,
        OLD.nazwa_uproszczona,
        NEW.nazwa_uproszczona,
        'Automatyczna zmiana przez system'
    );
END;

-- Trigger walidujący poprawność dat
CREATE TRIGGER IF NOT EXISTS validate_cenowki_dates
    BEFORE INSERT ON cenowki
BEGIN
    -- Sprawdź czy data_do jest większa od data_od (jeśli podana)
    SELECT CASE 
        WHEN NEW.data_do IS NOT NULL AND NEW.data_do < NEW.data_od THEN
            RAISE(ABORT, 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia')
    END;
    
    -- Sprawdź czy ceny są dodatnie
    SELECT CASE 
        WHEN NEW.cena_cenowkowa < 0 THEN
            RAISE(ABORT, 'Cena cenowkowa nie może być ujemna')
        WHEN NEW.cena_promocyjna IS NOT NULL AND NEW.cena_promocyjna < 0 THEN
            RAISE(ABORT, 'Cena promocyjna nie może być ujemna')
    END;
END;

-- Trigger walidujący przy UPDATE
CREATE TRIGGER IF NOT EXISTS validate_cenowki_dates_update
    BEFORE UPDATE ON cenowki
BEGIN
    -- Sprawdź czy data_do jest większa od data_od (jeśli podana)
    SELECT CASE 
        WHEN NEW.data_do IS NOT NULL AND NEW.data_do < NEW.data_od THEN
            RAISE(ABORT, 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia')
    END;
    
    -- Sprawdź czy ceny są dodatnie
    SELECT CASE 
        WHEN NEW.cena_cenowkowa < 0 THEN
            RAISE(ABORT, 'Cena cenowkowa nie może być ujemna')
        WHEN NEW.cena_promocyjna IS NOT NULL AND NEW.cena_promocyjna < 0 THEN
            RAISE(ABORT, 'Cena promocyjna nie może być ujemna')
    END;
END;

-- Widok ułatwiający pobieranie aktywnych cenowek z pełnymi informacjami
CREATE VIEW IF NOT EXISTS v_active_cenowki AS
SELECT 
    c.id,
    c.product_id,
    c.nazwa_uproszczona,
    c.cena_cenowkowa,
    c.cena_promocyjna,
    c.data_od,
    c.data_do,
    c.typ_cenowki,
    c.priorytet,
    c.kategoria_cenowki,
    c.opis_cenowki,
    c.created_at,
    c.created_by,
    
    -- Informacje o produkcie
    p.nazwa as product_name,
    p.kod_produktu,
    p.kod_kreskowy,
    p.cena_sprzedazy_netto as default_price_netto,
    p.cena_sprzedazy_brutto as default_price_brutto,
    p.stawka_vat,
    p.kategoria_id,
    p.stan_magazynowy,
    p.jednostka,
    
    -- Informacje o producencie
    pr.nazwa as producent_nazwa,
    
    -- Status okresu
    CASE 
        WHEN c.data_do IS NULL THEN 'Bezterminowo'
        WHEN c.data_do >= date('now') THEN 'Aktywny'
        ELSE 'Zakończony'
    END as status_okresu,
    
    -- Czy ma cenę promocyjną
    CASE 
        WHEN c.cena_promocyjna IS NOT NULL AND c.cena_promocyjna > 0 THEN 1
        ELSE 0
    END as ma_promocje

FROM cenowki c
JOIN products p ON c.product_id = p.id
LEFT JOIN producenci pr ON p.producent_id = pr.id
WHERE c.aktywny = 1 
  AND (c.data_do IS NULL OR c.data_do >= date('now'))
ORDER BY c.kategoria_cenowki, c.priorytet DESC, p.nazwa;

-- Widok pokazujący wszystkie cenowki (aktywne i nieaktywne) z historią
CREATE VIEW IF NOT EXISTS v_cenowki_history AS
SELECT 
    c.id,
    c.product_id,
    c.nazwa_uproszczona,
    c.cena_cenowkowa,
    c.cena_promocyjna,
    c.data_od,
    c.data_do,
    c.aktywny,
    c.typ_cenowki,
    c.created_at,
    c.updated_at,
    c.created_by,
    
    -- Informacje o produkcie
    p.nazwa as product_name,
    p.kod_produktu,
    p.kod_kreskowy,
    
    -- Informacje o producencie
    pr.nazwa as producent_nazwa,
    
    -- Status okresu
    CASE 
        WHEN c.data_do IS NULL THEN 'Bezterminowo'
        WHEN c.data_do >= date('now') THEN 'Aktywny'
        ELSE 'Zakończony'
    END as status_okresu

FROM cenowki c
JOIN products p ON c.product_id = p.id
LEFT JOIN producenci pr ON p.producent_id = pr.id
ORDER BY p.nazwa, c.data_od DESC;

-- Widok podsumowujący statystyki cenowek
CREATE VIEW IF NOT EXISTS v_cenowki_stats AS
SELECT 
    c.kategoria_cenowki,
    c.typ_cenowki,
    COUNT(*) as liczba_produktow,
    AVG(c.cena_cenowkowa) as srednia_cena,
    MIN(c.cena_cenowkowa) as min_cena,
    MAX(c.cena_cenowkowa) as max_cena,
    COUNT(CASE WHEN c.cena_promocyjna IS NOT NULL THEN 1 END) as liczba_promocji
FROM cenowki c
WHERE c.aktywny = 1 
  AND (c.data_do IS NULL OR c.data_do >= date('now'))
GROUP BY c.kategoria_cenowki, c.typ_cenowki
ORDER BY c.kategoria_cenowki, c.typ_cenowki;

-- Funkcja pomocnicza do generowania uproszczonych nazw
-- (to będzie używane w aplikacji Python)
/*
Przykład użycia w kodzie Python:

def generate_simplified_name(product_name, producent_name=None, template=None):
    # Domyślny szablon uproszczenia nazwy
    if not template:
        words = product_name.split()
        # Usuń typowe słowa opisowe
        stop_words = ['i', 'w', 'z', 'na', 'do', 'od', 'po', 'o', 'kg', 'g', 'ml', 'l']
        filtered_words = [w for w in words if w.lower() not in stop_words]
        
        # Ogranicz do pierwszych 3-4 słów
        simplified = ' '.join(filtered_words[:4])
        
        if producent_name:
            simplified = f"{producent_name} {simplified}"
            
        return simplified[:50]  # Ogranicz długość
    
    # Użyj szablonu jeśli podany
    return template.replace('{{producent}}', producent_name or '').replace('{{nazwa_podstawowa}}', product_name)

def create_cenowka_entry(product_id, simplified_name, price, price_type='standardowa'):
    cursor.execute('''
        INSERT INTO cenowki (
            product_id, nazwa_uproszczona, cena_cenowkowa, typ_cenowki
        ) VALUES (?, ?, ?, ?)
    ''', (product_id, simplified_name, price, price_type))

def get_active_cenowki_for_category(category=None):
    if category:
        cursor.execute('''
            SELECT * FROM v_active_cenowki 
            WHERE kategoria_cenowki = ?
            ORDER BY priorytet DESC, nazwa_uproszczona
        ''', (category,))
    else:
        cursor.execute('''
            SELECT * FROM v_active_cenowki 
            ORDER BY kategoria_cenowki, priorytet DESC, nazwa_uproszczona
        ''')
    return cursor.fetchall()
*/
