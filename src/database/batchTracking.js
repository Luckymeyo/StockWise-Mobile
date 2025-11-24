/**
 * Database Migration Helper
 * Adds batch tracking support to existing database
 */

import { getDatabase } from './index';

/**
 * Add batch tracking columns to stock_transactions table
 * This is a migration that adds new columns without breaking existing data
 */
export const migrateToBatchTracking = async () => {
  try {
    const db = await getDatabase();

    console.log('🔄 Starting batch tracking migration...');

    // Check if columns already exist
    const [tableInfo] = await db.executeSql(
      "PRAGMA table_info(stock_transactions)"
    );

    const columns = [];
    for (let i = 0; i < tableInfo.rows.length; i++) {
      columns.push(tableInfo.rows.item(i).name);
    }

    // Add batch_number column if it doesn't exist
    if (!columns.includes('batch_number')) {
      await db.executeSql(
        'ALTER TABLE stock_transactions ADD COLUMN batch_number TEXT'
      );
      console.log('✅ Added batch_number column');
    }

    // Add batch_expiry_date column if it doesn't exist
    if (!columns.includes('batch_expiry_date')) {
      await db.executeSql(
        'ALTER TABLE stock_transactions ADD COLUMN batch_expiry_date TEXT'
      );
      console.log('✅ Added batch_expiry_date column');
    }

    // Create batches view for easy querying
    await db.executeSql(`
      CREATE VIEW IF NOT EXISTS product_batches AS
      SELECT 
        st.product_id,
        st.batch_number,
        st.batch_expiry_date,
        p.name as product_name,
        p.unit,
        SUM(CASE WHEN st.type = 'IN' THEN st.quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN st.type = 'OUT' THEN st.quantity ELSE 0 END) as total_out,
        (SUM(CASE WHEN st.type = 'IN' THEN st.quantity ELSE 0 END) - 
         SUM(CASE WHEN st.type = 'OUT' THEN st.quantity ELSE 0 END)) as current_quantity
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.id
      WHERE st.batch_number IS NOT NULL
      GROUP BY st.product_id, st.batch_number, st.batch_expiry_date
      HAVING current_quantity > 0
    `);
    console.log('✅ Created product_batches view');

    console.log('🎉 Batch tracking migration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error migrating to batch tracking:', error);
    throw error;
  }
};

/**
 * Get all active batches for a product
 */
export const getProductBatches = async (productId) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        batch_number,
        batch_expiry_date,
        product_name,
        unit,
        current_quantity,
        CAST(julianday(batch_expiry_date) - julianday('now') AS INTEGER) as days_until_expiry
      FROM product_batches
      WHERE product_id = ?
      ORDER BY batch_expiry_date ASC
    `,
      [productId]
    );

    const batches = [];
    for (let i = 0; i < result.rows.length; i++) {
      batches.push(result.rows.item(i));
    }

    return batches;
  } catch (error) {
    console.error('Error getting product batches:', error);
    throw error;
  }
};

/**
 * Get all batches expiring within X days
 */
export const getExpiringBatches = async (daysThreshold = 30) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        product_id,
        batch_number,
        batch_expiry_date,
        product_name,
        unit,
        current_quantity,
        CAST(julianday(batch_expiry_date) - julianday('now') AS INTEGER) as days_until_expiry
      FROM product_batches
      WHERE batch_expiry_date IS NOT NULL
        AND julianday(batch_expiry_date) - julianday('now') <= ?
        AND julianday(batch_expiry_date) - julianday('now') >= 0
      ORDER BY batch_expiry_date ASC
    `,
      [daysThreshold]
    );

    const batches = [];
    for (let i = 0; i < result.rows.length; i++) {
      batches.push(result.rows.item(i));
    }

    return batches;
  } catch (error) {
    console.error('Error getting expiring batches:', error);
    throw error;
  }
};

/**
 * Get oldest batch for a product (for FIFO stock out)
 */
export const getOldestBatch = async (productId) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        batch_number,
        batch_expiry_date,
        current_quantity,
        unit
      FROM product_batches
      WHERE product_id = ?
      ORDER BY batch_expiry_date ASC
      LIMIT 1
    `,
      [productId]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0);
    }
    return null;
  } catch (error) {
    console.error('Error getting oldest batch:', error);
    throw error;
  }
};

/**
 * Get total quantity across all batches for a product
 */
export const getTotalBatchQuantity = async (productId) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT SUM(current_quantity) as total
      FROM product_batches
      WHERE product_id = ?
    `,
      [productId]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0).total || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting total batch quantity:', error);
    throw error;
  }
};

/**
 * Count products with expiring batches
 */
export const countExpiringProducts = async (daysThreshold = 30) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT COUNT(DISTINCT product_id) as count
      FROM product_batches
      WHERE batch_expiry_date IS NOT NULL
        AND julianday(batch_expiry_date) - julianday('now') <= ?
        AND julianday(batch_expiry_date) - julianday('now') >= 0
    `,
      [daysThreshold]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0).count || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error counting expiring products:', error);
    return 0;
  }
};
