/**
 * SQLite Database Schema for StockWise Mobile
 * Offline-first inventory management
 */

export const createTablesSQL = `
  -- Products/Items Table
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT,
    category_id INTEGER,
    description TEXT,
    photo_uri TEXT,
    
    -- Pricing
    purchase_price REAL DEFAULT 0,
    selling_price REAL DEFAULT 0,
    
    -- Stock
    current_stock REAL DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    min_stock_threshold REAL DEFAULT 0,
    
    -- Expiry
    expiry_date TEXT,
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    is_active INTEGER DEFAULT 1,
    
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  -- Categories Table
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  -- Stock Transactions Table
  CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'IN', 'OUT', 'ADJUST'
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    
    -- Additional info
    reference_no TEXT,
    notes TEXT,
    
    -- Who & When
    user_id INTEGER,
    transaction_date TEXT DEFAULT (datetime('now', 'localtime')),
    
    -- Balance after transaction
    balance_after REAL,
    
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Suppliers Table (for future use)
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  -- Low Stock Alerts Log
  CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    current_stock REAL,
    threshold REAL,
    alert_date TEXT DEFAULT (datetime('now', 'localtime')),
    is_resolved INTEGER DEFAULT 0,
    
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Expiry Alerts Log
  CREATE TABLE IF NOT EXISTS expiry_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    expiry_date TEXT,
    days_until_expiry INTEGER,
    alert_date TEXT DEFAULT (datetime('now', 'localtime')),
    is_resolved INTEGER DEFAULT 0,
    
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Notifications Table
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'LOW_STOCK', 'EXPIRING_SOON', 'STOCK_IN', 'STOCK_OUT', 'PRODUCT_ADDED', 'PRODUCT_EDITED'
    priority TEXT NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    product_id INTEGER,
    product_name TEXT,
    quantity REAL,
    icon TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_product ON stock_transactions(product_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON stock_transactions(transaction_date);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
  CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at);
  CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
`;

/**
 * Default categories for UMKM
 */
export const defaultCategories = [
  { name: 'Makanan & Minuman', icon: '🍽️' },
  { name: 'Bumbu & Penyedap', icon: '🧂' },
  { name: 'Kebutuhan Rumah Tangga', icon: '🏠' },
  { name: 'Sabun & Detergen', icon: '🧼' },
  { name: 'Rokok', icon: '🚬' },
  { name: 'Alat Tulis', icon: '✏️' },
  { name: 'Kesehatan', icon: '💊' },
  { name: 'Lain-lain', icon: '📦' },
];

/**
 * Unit options for Indonesian UMKM
 */
export const unitOptions = [
  { value: 'pcs', label: 'Pcs (Piece)' },
  { value: 'box', label: 'Box' },
  { value: 'karton', label: 'Karton' },
  { value: 'lusin', label: 'Lusin (12 pcs)' },
  { value: 'kodi', label: 'Kodi (20 pcs)' },
  { value: 'rim', label: 'Rim (500 lembar)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'ml', label: 'Mililiter (ml)' },
  { value: 'meter', label: 'Meter (m)' },
  { value: 'pack', label: 'Pack' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'botol', label: 'Botol' },
  { value: 'kaleng', label: 'Kaleng' },
  { value: 'bungkus', label: 'Bungkus' },
];
