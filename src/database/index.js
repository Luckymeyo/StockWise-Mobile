/**
 * Database Connection & Initialization
 * Uses react-native-sqlite-storage
 */

import SQLite from 'react-native-sqlite-storage';
import { createTablesSQL, defaultCategories } from './schema';
import { migrateToBatchTracking } from './batchTracking';

// Enable promise API for cleaner async/await syntax
SQLite.enablePromise(true);

let dbInstance = null;

/**
 * Get or create database instance
 */
export const getDatabase = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await SQLite.openDatabase({
      name: 'stockwise.db',
      location: 'default',
    });

    console.log('✅ Database opened successfully');
    return dbInstance;
  } catch (error) {
    console.error('❌ Error opening database:', error);
    throw error;
  }
};

/**
 * Initialize database tables
 */
export const initDatabase = async () => {
  try {
    const db = await getDatabase();

    // Split SQL statements and execute one by one
    const sqlStatements = createTablesSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement
    for (const statement of sqlStatements) {
      try {
        await db.executeSql(statement);
      } catch (err) {
        // Ignore "table already exists" errors
        if (!err.message.includes('already exists')) {
          console.error('Error executing SQL:', statement.substring(0, 100));
          throw err;
        }
      }
    }
    
    console.log('✅ Tables created successfully');

    // Insert default categories if not exists
    await insertDefaultCategories(db);

    // Run batch tracking migration
    await migrateToBatchTracking();

    // Run Phase 1 migrations
    await runPhase1Migrations(db);

    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

/**
 * Phase 1 migrations — add new columns and tables
 */
const runPhase1Migrations = async (db) => {
  const safeAlter = async (sql) => {
    try { await db.executeSql(sql); } catch (e) {
      if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
    }
  };

  // products: new columns
  await safeAlter("ALTER TABLE products ADD COLUMN storage_location TEXT");
  await safeAlter("ALTER TABLE products ADD COLUMN internal_notes TEXT");
  await safeAlter("ALTER TABLE products ADD COLUMN discount_rate REAL DEFAULT 0");

  // stock_transactions: new columns
  await safeAlter("ALTER TABLE stock_transactions ADD COLUMN discount_amount REAL DEFAULT 0");
  await safeAlter("ALTER TABLE stock_transactions ADD COLUMN is_voided INTEGER DEFAULT 0");
  await safeAlter("ALTER TABLE stock_transactions ADD COLUMN voided_at TEXT");
  await safeAlter("ALTER TABLE stock_transactions ADD COLUMN void_reason TEXT");

  // price_history table
  await db.executeSql(`CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    old_purchase_price REAL,
    new_purchase_price REAL,
    old_selling_price REAL,
    new_selling_price REAL,
    changed_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  // credit_sales table
  await db.executeSql(`CREATE TABLE IF NOT EXISTS credit_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER,
    buyer_name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    due_date TEXT,
    is_paid INTEGER DEFAULT 0,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (transaction_id) REFERENCES stock_transactions(id)
  )`);

  // business_settings table
  await db.executeSql(`CREATE TABLE IF NOT EXISTS business_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Insert defaults (INSERT OR IGNORE)
  const defaults = [
    ['business_name', 'Toko Saya'],
    ['currency', 'Rp'],
    ['address', ''],
    ['phone', ''],
    ['tax_rate', '0'],
  ];
  for (const [key, value] of defaults) {
    await db.executeSql('INSERT OR IGNORE INTO business_settings (key,value) VALUES (?,?)', [key, value]);
  }

  console.log('✅ Phase 1 migrations done');
};

/**
 * Insert default categories
 */
const insertDefaultCategories = async (db) => {
  try {
    // Check if categories already exist
    const [result] = await db.executeSql('SELECT COUNT(*) as count FROM categories');
    const count = result.rows.item(0).count;

    if (count === 0) {
      // Insert default categories
      for (const category of defaultCategories) {
        await db.executeSql(
          'INSERT INTO categories (name, icon) VALUES (?, ?)',
          [category.name, category.icon]
        );
      }
      console.log('✅ Default categories inserted');
    }
  } catch (error) {
    console.error('❌ Error inserting default categories:', error);
  }
};

/**
 * Close database connection
 */
export const closeDatabase = async () => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    console.log('✅ Database closed');
  }
};

/**
 * Drop all tables (use with caution - for development only)
 */
export const dropAllTables = async () => {
  const db = await getDatabase();
  const tables = [
    'products',
    'categories',
    'stock_transactions',
    'suppliers',
    'low_stock_alerts',
    'expiry_alerts',
  ];

  for (const table of tables) {
    await db.executeSql(`DROP TABLE IF EXISTS ${table}`);
  }

  console.log('⚠️ All tables dropped');
};

/**
 * Execute raw SQL query
 */
export const executeQuery = async (sql, params = []) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(sql, params);
    return result;
  } catch (error) {
    console.error('❌ Query execution error:', error);
    throw error;
  }
};

/**
 * Execute transaction with multiple queries
 */
export const executeTransaction = async (callback) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => callback(tx),
      (error) => reject(error),
      () => resolve()
    );
  });
};

export default {
  getDatabase,
  initDatabase,
  closeDatabase,
  dropAllTables,
  executeQuery,
  executeTransaction,
};
