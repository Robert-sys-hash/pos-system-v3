-- Skrypt migracji dla rozszerzonych funkcjonalności zmian kasowych
-- Dodanie nowych kolumn do tabeli pos_zmiany

-- Dodaj nowe kolumny do pos_zmiany dla weryfikacji gotówki podczas otwierania
ALTER TABLE pos_zmiany ADD COLUMN kasa_zweryfikowana BOOLEAN DEFAULT FALSE;
ALTER TABLE pos_zmiany ADD COLUMN rozbieznosc_kasy BOOLEAN DEFAULT FALSE;
ALTER TABLE pos_zmiany ADD COLUMN kwota_rozbieznosci REAL DEFAULT 0;

-- Dodaj nowe kolumny do pos_zmiany dla szczegółowego zamykania
ALTER TABLE pos_zmiany ADD COLUMN saldo_fizyczne REAL DEFAULT 0;
ALTER TABLE pos_zmiany ADD COLUMN roznica_fizyczna REAL DEFAULT 0;
ALTER TABLE pos_zmiany ADD COLUMN terminal_karta_system REAL DEFAULT 0;
ALTER TABLE pos_zmiany ADD COLUMN terminal_karta_rzeczywisty REAL DEFAULT 0;
ALTER TABLE pos_zmiany ADD COLUMN roznica_terminal REAL DEFAULT 0;
ALTER TABLE pos_zmiany ADD COLUMN raport_fiskalny REAL DEFAULT 0;
ALTER TABLE pos_zmiany ADD COLUMN raport_zamkniecia_id INTEGER;

-- Utwórz tabelę dla szczegółowych raportów zamknięć dnia
CREATE TABLE IF NOT EXISTS daily_closure_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zmiana_id INTEGER NOT NULL,
    kasjer_login TEXT NOT NULL,
    data_zamkniecia TEXT NOT NULL,
    czas_zamkniecia TEXT NOT NULL,
    
    -- Raporty kasowe
    kasa_system REAL DEFAULT 0,
    kasa_fizyczna REAL DEFAULT 0,
    roznica_kasa REAL DEFAULT 0,
    
    -- Raporty z terminala kartowego
    terminal_system REAL DEFAULT 0,
    terminal_rzeczywisty REAL DEFAULT 0,
    roznica_terminal REAL DEFAULT 0,
    
    -- Raport z kasy fiskalnej
    kasa_fiskalna_raport REAL DEFAULT 0,
    
    -- Social media
    social_media_tiktok TEXT DEFAULT '',
    social_media_facebook TEXT DEFAULT '',
    social_media_instagram TEXT DEFAULT '',
    social_media_google TEXT DEFAULT '',
    
    -- Osiągnięcia dnia
    osiagniecia_sprzedaz TEXT DEFAULT '',
    osiagniecia_praca TEXT DEFAULT '',
    
    -- Dodatkowe uwagi
    uwagi_zamkniecia TEXT DEFAULT '',
    
    -- Metadane
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zmiana_id) REFERENCES pos_zmiany(id)
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_daily_closure_reports_date ON daily_closure_reports(data_zamkniecia);
CREATE INDEX IF NOT EXISTS idx_daily_closure_reports_cashier ON daily_closure_reports(kasjer_login);
CREATE INDEX IF NOT EXISTS idx_daily_closure_reports_shift ON daily_closure_reports(zmiana_id);

-- Dodaj trigger do automatycznego ustawiania daty utworzenia
CREATE TRIGGER IF NOT EXISTS set_daily_closure_created_at 
AFTER INSERT ON daily_closure_reports
BEGIN
    UPDATE daily_closure_reports 
    SET created_at = datetime('now', 'localtime') 
    WHERE id = NEW.id;
END;

-- Komentarze (tylko informacyjne - SQLite nie obsługuje komentarzy w ten sposób)
-- kasa_zweryfikowana - czy kasjer potwierdził zgodność gotówki w kasie
-- rozbieznosc_kasy - czy jest rozbieżność w gotówce
-- kwota_rozbieznosci - kwota rozbieżności w gotówce
-- saldo_fizyczne - faktyczna ilość gotówki policzona fizycznie
-- roznica_fizyczna - różnica między systemową a fizyczną gotówką
-- terminal_karta_system - kwota z systemu dla płatności kartą
-- terminal_karta_rzeczywisty - rzeczywista kwota z terminala kartowego
-- roznica_terminal - różnica w płatnościach kartą
-- raport_fiskalny - suma wszystkich płatności z raportu kasy fiskalnej
-- raport_zamkniecia_id - ID szczegółowego raportu zamknięcia dnia
