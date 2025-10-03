-- Tabela dla dokumentów przyjęć (PZ/PW)
CREATE TABLE IF NOT EXISTS warehouse_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('external', 'internal')), -- 'external' = PZ, 'internal' = PW
    source_invoice_id INTEGER NULL, -- dla PZ - odniesienie do faktury zakupu
    document_number TEXT NOT NULL UNIQUE,
    supplier_name TEXT NULL, -- dla PZ
    receipt_date TEXT NOT NULL,
    total_amount REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_invoice_id) REFERENCES purchase_invoices(id)
);

-- Tabela dla pozycji dokumentów przyjęć
CREATE TABLE IF NOT EXISTS warehouse_receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    total_price REAL DEFAULT 0,
    reason TEXT, -- dla PW - powód przyjęcia
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receipt_id) REFERENCES warehouse_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabela dla dokumentów wydań (RW)
CREATE TABLE IF NOT EXISTS warehouse_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'internal', -- 'internal' = RW
    document_number TEXT NOT NULL UNIQUE,
    issue_date TEXT NOT NULL,
    total_amount REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabela dla pozycji dokumentów wydań
CREATE TABLE IF NOT EXISTS warehouse_issue_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    total_price REAL DEFAULT 0,
    reason TEXT NOT NULL, -- powód wydania
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES warehouse_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabela dla sesji inwentaryzacji
CREATE TABLE IF NOT EXISTS inventory_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date TEXT NOT NULL,
    end_date TEXT NULL,
    category_id INTEGER NULL, -- opcjonalne ograniczenie do kategorii
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Tabela dla pozycji inwentaryzacji
CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    system_count REAL NOT NULL DEFAULT 0, -- stan systemowy
    actual_count REAL NULL, -- stan rzeczywisty
    difference REAL DEFAULT 0, -- różnica
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES inventory_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(session_id, product_id)
);

-- Tabela dla historii ruchów magazynowych (rozszerzona)
CREATE TABLE IF NOT EXISTS warehouse_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    operation_type TEXT NOT NULL, -- 'receipt_external', 'receipt_internal', 'issue_internal', 'inventory_increase', 'inventory_decrease', 'transfer_out', 'transfer_in', 'sale'
    quantity_change REAL NOT NULL, -- dodatnie dla przyjęć, ujemne dla wydań
    quantity_before REAL DEFAULT 0,
    quantity_after REAL DEFAULT 0,
    reason TEXT,
    document_number TEXT,
    reference_id INTEGER, -- ID dokumentu źródłowego
    created_at TEXT NOT NULL,
    created_by TEXT DEFAULT 'system',
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_type ON warehouse_receipts(type);
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_date ON warehouse_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_receipt_items_receipt ON warehouse_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_receipt_items_product ON warehouse_receipt_items(product_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_issues_type ON warehouse_issues(type);
CREATE INDEX IF NOT EXISTS idx_warehouse_issues_date ON warehouse_issues(issue_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_issue_items_issue ON warehouse_issue_items(issue_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_issue_items_product ON warehouse_issue_items(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_sessions_status ON inventory_sessions(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_session ON inventory_items(session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product ON inventory_items(product_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_history_product ON warehouse_history(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_history_operation ON warehouse_history(operation_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_history_date ON warehouse_history(created_at);
