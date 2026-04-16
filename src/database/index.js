// Database connection & initialization

import SQLite from 'react-native-sqlite-storage';
import { createTablesSQL, defaultCategories } from './schema';
import { migrateToBatchTracking } from './batchTracking';

SQLite.enablePromise(true);

let dbInstance = null;
// Single in-flight promise so concurrent callers share the same open attempt
// and we never open two connections simultaneously.
let dbOpenPromise = null;

// Get or create database
export const getDatabase = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbOpenPromise) {
    return dbOpenPromise;
  }

  dbOpenPromise = SQLite.openDatabase({
    name: 'stockwise.db',
    location: 'default',
  })
    .then((db) => {
      dbInstance = db;
      dbOpenPromise = null;
      console.log('✅ Database opened successfully');
      return db;
    })
    .catch((error) => {
      dbOpenPromise = null;
      console.error('❌ Error opening database:', error);
      throw error;
    });

  return dbOpenPromise;
};

// Initialize database tables
export const initDatabase = async () => {
  try {
    const db = await getDatabase();

    // Split and execute SQL statements
    const sqlStatements = createTablesSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of sqlStatements) {
      try {
        await db.executeSql(statement);
      } catch (err) {
        // Ignore table already exists errors
        if (!err.message.includes('already exists')) {
          console.error('Error executing SQL:', statement.substring(0, 100));
          throw err;
        }
      }
    }
    
    console.log('✅ Tables created successfully');

    // Insert default categories
    await insertDefaultCategories(db);

    // Run batch tracking migration
    await migrateToBatchTracking();

    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Insert default categories
const insertDefaultCategories = async (db) => {
  try {
    // Check if categories exist
    const [result] = await db.executeSql('SELECT COUNT(*) as count FROM categories');
    const count = result.rows.item(0).count;

    if (count === 0) {
      // Insert defaults
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

// Close database connection
export const closeDatabase = async () => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    dbOpenPromise = null;
    console.log('✅ Database closed');
  }
};

// Drop all tables (development only)
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

// Execute raw SQL query
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

// Execute transaction with multiple queries
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
