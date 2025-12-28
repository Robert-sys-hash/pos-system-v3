-- ==============================================================================
-- SYSTEM FIFO (First In, First Out) dla POS System V3
-- ==============================================================================
-- Ten skrypt tworzy tabele do obsługi systemu FIFO w magazynie
-- Umożliwia śledzenie partii towarowych z datami ważności i automatyczne
-- wybieranie najstarszych produktów podczas sprzedaży
-- ==============================================================================

-- Tabela przechowująca partie towarowe (batches/lots)
CREATE TABLE IF NOT EXISTS product_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Podstawowe informacje o partii
    batch_number TEXT UNIQUE NOT NULL,              -- Numer partii (np. "BATCH-2024-001")
    product_id INTEGER NOT NULL,                    -- ID produktu
    warehouse_id INTEGER NOT NULL,                  -- ID magazynu
    
    -- Informacje o przyjęciu
    received_date TEXT NOT NULL,                    -- Data przyjęcia (format ISO)
    expiry_date TEXT,                               -- Data ważności (opcjonalnie)
    supplier_id INTEGER,                            -- ID dostawcy (opcjonalnie)
    purchase_invoice_id INTEGER,                    -- ID faktury zakupu (opcjonalnie)
    
    -- Ilości
    initial_quantity REAL NOT NULL DEFAULT 0,      -- Początkowa ilość w partii
    current_quantity REAL NOT NULL DEFAULT 0,      -- Aktualna ilość w partii
    reserved_quantity REAL NOT NULL DEFAULT 0,     -- Zarezerwowana ilość
    
    -- Ceny
    purchase_price_net REAL NOT NULL DEFAULT 0,    -- Cena zakupu netto za jednostkę
    purchase_price_gross REAL NOT NULL DEFAULT 0,  -- Cena zakupu brutto za jednostkę
    
    -- Status i metadane
    status TEXT NOT NULL DEFAULT 'active',         -- 'active', 'expired', 'sold_out', 'quarantine'
    location_in_warehouse TEXT,                     -- Lokalizacja fizyczna (np. "Regal A-2-3")
    notes TEXT,                                     -- Dodatkowe notatki
    
    -- Audyt
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system',
    
    -- Klucze obce
    FOREIGN KEY (product_id) REFERENCES produkty(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES dostawcy(id),
    FOREIGN KEY (purchase_invoice_id) REFERENCES faktury_zakupowe(id)
);

-- Tabela przechowująca ruchy partii (batch movements)
CREATE TABLE IF NOT EXISTS batch_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Podstawowe informacje
    batch_id INTEGER NOT NULL,                      -- ID partii
    movement_type TEXT NOT NULL,                    -- 'in', 'out', 'transfer', 'adjustment', 'reserve', 'unreserve'
    
    -- Ilości
    quantity REAL NOT NULL,                         -- Ilość ruchu (zawsze dodatnia)
    quantity_before REAL NOT NULL DEFAULT 0,       -- Stan przed ruchem
    quantity_after REAL NOT NULL DEFAULT 0,        -- Stan po ruchu
    
    -- Dokumenty i powody
    document_type TEXT,                             -- 'sale', 'receipt', 'transfer', 'adjustment', 'reservation'
    document_number TEXT,                           -- Numer dokumentu źródłowego
    reference_id INTEGER,                           -- ID dokumentu źródłowego
    reason TEXT,                                    -- Powód ruchu
    
    -- Audyt
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT NOT NULL DEFAULT 'system',
    
    -- Klucze obce
    FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE CASCADE
);

-- Tabela do automatycznych alokacji FIFO podczas sprzedaży
CREATE TABLE IF NOT EXISTS fifo_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Podstawowe informacje
    product_id INTEGER NOT NULL,                    -- ID produktu
    warehouse_id INTEGER NOT NULL,                  -- ID magazynu
    requested_quantity REAL NOT NULL,              -- Żądana ilość
    allocated_quantity REAL NOT NULL DEFAULT 0,    -- Faktycznie alokowana ilość
    
    -- Status alokacji
    status TEXT NOT NULL DEFAULT 'pending',        -- 'pending', 'allocated', 'completed', 'cancelled'
    allocation_strategy TEXT NOT NULL DEFAULT 'fifo', -- 'fifo', 'fefo', 'manual'
    
    -- Dokumenty
    document_type TEXT NOT NULL,                    -- 'sale', 'transfer', 'reservation'
    document_id INTEGER,                            -- ID dokumentu źródłowego
    
    -- Audyt
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    created_by TEXT NOT NULL DEFAULT 'system',
    
    -- Klucze obce
    FOREIGN KEY (product_id) REFERENCES produkty(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- Tabela szczegółowych alokacji dla każdej partii
CREATE TABLE IF NOT EXISTS fifo_allocation_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Podstawowe informacje
    allocation_id INTEGER NOT NULL,                -- ID głównej alokacji
    batch_id INTEGER NOT NULL,                     -- ID partii
    allocated_quantity REAL NOT NULL,             -- Alokowana ilość z tej partii
    
    -- Status
    status TEXT NOT NULL DEFAULT 'allocated',      -- 'allocated', 'used', 'cancelled'
    
    -- Audyt
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    used_at TEXT,                                   -- Kiedy zostało użyte
    
    -- Klucze obce
    FOREIGN KEY (allocation_id) REFERENCES fifo_allocations(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE CASCADE
);

-- ==============================================================================
-- INDEKSY dla wydajności
-- ==============================================================================

-- Indeksy dla product_batches
CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_warehouse ON product_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_received_date ON product_batches(received_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_status ON product_batches(status);
CREATE INDEX IF NOT EXISTS idx_product_batches_current_qty ON product_batches(current_quantity);

-- Indeksy dla batch_movements
CREATE INDEX IF NOT EXISTS idx_batch_movements_batch ON batch_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_movements_type ON batch_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_batch_movements_date ON batch_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_movements_document ON batch_movements(document_type, document_number);

-- Indeksy dla fifo_allocations
CREATE INDEX IF NOT EXISTS idx_fifo_allocations_product_warehouse ON fifo_allocations(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_fifo_allocations_status ON fifo_allocations(status);
CREATE INDEX IF NOT EXISTS idx_fifo_allocations_document ON fifo_allocations(document_type, document_id);

-- Indeksy dla fifo_allocation_details
CREATE INDEX IF NOT EXISTS idx_fifo_allocation_details_allocation ON fifo_allocation_details(allocation_id);
CREATE INDEX IF NOT EXISTS idx_fifo_allocation_details_batch ON fifo_allocation_details(batch_id);

-- ==============================================================================
-- TRIGGERY do automatycznego zarządzania
-- ==============================================================================

-- Trigger do aktualizacji updated_at w product_batches
CREATE TRIGGER IF NOT EXISTS update_product_batches_timestamp 
    AFTER UPDATE ON product_batches
BEGIN
    UPDATE product_batches 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger do sprawdzania czy partia nie jest przeterminowana
CREATE TRIGGER IF NOT EXISTS check_batch_expiry 
    AFTER UPDATE OF current_quantity ON product_batches
    WHEN NEW.expiry_date IS NOT NULL
BEGIN
    UPDATE product_batches 
    SET status = CASE 
        WHEN NEW.expiry_date < date('now') AND NEW.status = 'active' THEN 'expired'
        WHEN NEW.current_quantity <= 0 AND NEW.status = 'active' THEN 'sold_out'
        ELSE NEW.status
    END
    WHERE id = NEW.id;
END;

-- Trigger do automatycznego tworzenia ruchu przy zmianie ilości
CREATE TRIGGER IF NOT EXISTS auto_create_batch_movement 
    AFTER UPDATE OF current_quantity ON product_batches
    WHEN OLD.current_quantity != NEW.current_quantity
BEGIN
    INSERT INTO batch_movements (
        batch_id, 
        movement_type, 
        quantity, 
        quantity_before, 
        quantity_after,
        document_type,
        reason,
        created_by
    ) VALUES (
        NEW.id,
        CASE 
            WHEN NEW.current_quantity > OLD.current_quantity THEN 'in'
            ELSE 'out'
        END,
        ABS(NEW.current_quantity - OLD.current_quantity),
        OLD.current_quantity,
        NEW.current_quantity,
        'adjustment',
        'Automatyczna korekta systemu',
        'system'
    );
END;

-- ==============================================================================
-- WIDOKI dla łatwego dostępu do danych
-- ==============================================================================

-- Widok pokazujący aktywne partie z informacjami o produkcie
CREATE VIEW IF NOT EXISTS v_active_batches AS
SELECT 
    pb.*,
    p.nazwa as product_name,
    p.kod_produktu as product_code,
    p.ean as barcode,
    p.jednostka as unit,
    w.nazwa as warehouse_name,
    w.kod_magazynu as warehouse_code,
    
    -- Obliczenia
    (pb.current_quantity - pb.reserved_quantity) as available_quantity,
    CASE 
        WHEN pb.expiry_date IS NULL THEN 999999
        ELSE julianday(pb.expiry_date) - julianday('now')
    END as days_to_expiry,
    
    -- Status tekstowy
    CASE 
        WHEN pb.expiry_date IS NOT NULL AND pb.expiry_date < date('now') THEN 'Przeterminowana'
        WHEN pb.current_quantity <= 0 THEN 'Wyprzedana'
        WHEN pb.expiry_date IS NOT NULL AND julianday(pb.expiry_date) - julianday('now') <= 30 THEN 'Wkrótce przeterminowana'
        WHEN pb.current_quantity - pb.reserved_quantity <= 0 THEN 'Zarezerwowana'
        ELSE 'Aktywna'
    END as batch_status_text

FROM product_batches pb
JOIN produkty p ON pb.product_id = p.id
JOIN warehouses w ON pb.warehouse_id = w.id
WHERE pb.status = 'active' AND pb.current_quantity > 0
ORDER BY pb.received_date ASC;

-- Widok do szybkiego podglądu dostępnych ilości per produkt
CREATE VIEW IF NOT EXISTS v_product_stock_summary AS
SELECT 
    p.id as product_id,
    p.nazwa as product_name,
    p.kod_produktu as product_code,
    pb.warehouse_id,
    w.nazwa as warehouse_name,
    
    -- Sumy ilości
    SUM(pb.current_quantity) as total_quantity,
    SUM(pb.reserved_quantity) as total_reserved,
    SUM(pb.current_quantity - pb.reserved_quantity) as available_quantity,
    
    -- Najstarsza i najnowsza partia
    MIN(pb.received_date) as oldest_batch_date,
    MAX(pb.received_date) as newest_batch_date,
    
    -- Informacje o datach ważności
    MIN(CASE WHEN pb.expiry_date IS NOT NULL THEN pb.expiry_date END) as earliest_expiry,
    COUNT(CASE WHEN pb.expiry_date IS NOT NULL AND pb.expiry_date < date('now', '+30 days') THEN 1 END) as batches_expiring_soon,
    
    -- Liczba aktywnych partii
    COUNT(*) as active_batches_count

FROM product_batches pb
JOIN produkty p ON pb.product_id = p.id
JOIN warehouses w ON pb.warehouse_id = w.id
WHERE pb.status = 'active' AND pb.current_quantity > 0
GROUP BY p.id, pb.warehouse_id;

-- ==============================================================================
-- FUNKCJE (przez triggery, SQLite nie ma stored procedures)
-- ==============================================================================

-- Trigger funkcja do generowania numerów partii
CREATE TRIGGER IF NOT EXISTS generate_batch_number 
    BEFORE INSERT ON product_batches
    WHEN NEW.batch_number IS NULL OR NEW.batch_number = ''
BEGIN
    UPDATE product_batches SET batch_number = (
        'BATCH-' || 
        strftime('%Y', 'now') || '-' || 
        strftime('%m', 'now') || '-' || 
        printf('%06d', (
            SELECT COALESCE(MAX(CAST(SUBSTR(batch_number, -6) AS INTEGER)), 0) + 1 
            FROM product_batches 
            WHERE batch_number LIKE 'BATCH-' || strftime('%Y', 'now') || '-' || strftime('%m', 'now') || '-%'
        ))
    ) WHERE id = NEW.id;
END;

-- ==============================================================================
-- KOMENTARZE KOŃCOWE
-- ==============================================================================

/*
Instrukcje użytkowania systemu FIFO:

1. PRZYJĘCIA TOWARU:
   - Przy każdym przyjęciu (PZ) tworzymy nową partię w product_batches
   - Zapisujemy datę przyjęcia, cenę zakupu i opcjonalnie datę ważności
   - System automatycznie generuje numer partii

2. SPRZEDAŻ/WYDANIA:
   - System automatycznie wybiera najstarsze partie (FIFO)
   - Można też użyć FEFO (First Expired, First Out) dla produktów z datą ważności
   - Każda sprzedaż jest rejestrowana w batch_movements

3. MONITOROWANIE:
   - Widok v_active_batches pokazuje wszystkie aktywne partie
   - Widok v_product_stock_summary pokazuje sumaryczne stany
   - System automatycznie oznacza przeterminowane partie

4. ALOKACJE:
   - fifo_allocations pozwala na rezerwację towaru przed sprzedażą
   - fifo_allocation_details zawiera szczegóły które partie zostały zarezerwowane

Aby uruchomić system:
sqlite3 kupony.db < create_fifo_system_tables.sql
*/
