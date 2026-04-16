// Transaction database queries

import { getDatabase } from '../index';
import { getProductById, updateProductStock } from './products';

/**
 * Create stock transaction (IN/OUT/ADJUST) with optional batch tracking
 * @param {number} productId - Product ID
 * @param {string} type - Transaction type: 'IN', 'OUT', 'ADJUST'
 * @param {number} quantity - Quantity to add/remove
 * @param {string} notes - Optional notes
 * @param {string} referenceNo - Optional reference number
 * @param {string} batchNumber - Optional batch number for tracking
 * @param {string} batchExpiryDate - Optional batch expiry date (YYYY-MM-DD)
 * @returns {object} Transaction details
 */
export const createStockTransaction = async (
  productId,
  type,
  quantity,
  notes = '',
  referenceNo = null,
  batchNumber = null,
  batchExpiryDate = null
) => {
  try {
    const db = await getDatabase();

    // Get current product
    const product = await getProductById(productId);
    if (!product) {
      throw new Error('Produk tidak ditemukan');
    }

    // Calculate new stock based on transaction type
    let newStock = product.current_stock;
    if (type === 'IN') {
      newStock += quantity;
    } else if (type === 'OUT') {
      newStock -= quantity;
      // Prevent negative stock
      if (newStock < 0) {
        throw new Error(
          `Stok tidak mencukupi! Stok saat ini: ${product.current_stock} ${product.unit}`
        );
      }
    } else if (type === 'ADJUST') {
      newStock = quantity; // Direct set for adjustments
    }

    // Wrap INSERT + UPDATE in a single atomic transaction so a crash between
    // the two statements cannot leave stock in an inconsistent state.
    let insertId;
    await new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT INTO stock_transactions (
               product_id, type, quantity, unit, notes, reference_no, balance_after,
               batch_number, batch_expiry_date
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              productId,
              type,
              quantity,
              product.unit,
              notes,
              referenceNo,
              newStock,
              batchNumber,
              batchExpiryDate,
            ],
            (_, result) => { insertId = result.insertId; }
          );
          tx.executeSql(
            `UPDATE products SET current_stock = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
            [newStock, productId]
          );
        },
        (error) => reject(error),
        () => resolve()
      );
    });

    console.log(
      `✅ Transaction created: ${type} ${quantity} ${product.unit} for ${product.name}${
        batchNumber ? ` (Batch: ${batchNumber})` : ''
      }`
    );

    return {
      id: insertId,
      productId,
      type,
      quantity,
      unit: product.unit,
      oldStock: product.current_stock,
      newStock,
      notes,
      batchNumber,
      batchExpiryDate,
    };
  } catch (error) {
    console.error('❌ Error creating stock transaction:', error);
    throw error;
  }
};

/**
 * Get transactions for a specific product
 * @param {number} productId - Product ID
 * @param {number} limit - Number of transactions to return
 * @returns {array} List of transactions
 */
export const getProductTransactions = async (productId, limit = 50) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        st.*,
        p.name as product_name,
        p.photo_uri
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.id
      WHERE st.product_id = ?
      ORDER BY st.transaction_date DESC
      LIMIT ?
    `,
      [productId, limit]
    );

    const transactions = [];
    for (let i = 0; i < result.rows.length; i++) {
      transactions.push(result.rows.item(i));
    }

    return transactions;
  } catch (error) {
    console.error('❌ Error getting product transactions:', error);
    throw error;
  }
};

/**
 * Get all transactions with optional date filter
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @param {string} type - Filter by type: 'IN', 'OUT', 'ADJUST', or null for all
 * @returns {array} List of transactions
 */
export const getAllTransactions = async (
  dateFrom = null,
  dateTo = null,
  type = null,
  limit = 500,
  offset = 0
) => {
  try {
    const db = await getDatabase();
    let query = `
      SELECT
        st.*,
        p.name as product_name,
        p.photo_uri
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (dateFrom) {
      query += ' AND DATE(st.transaction_date) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND DATE(st.transaction_date) <= ?';
      params.push(dateTo);
    }

    if (type) {
      query += ' AND st.type = ?';
      params.push(type);
    }

    query += ' ORDER BY st.transaction_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [result] = await db.executeSql(query, params);

    const transactions = [];
    for (let i = 0; i < result.rows.length; i++) {
      transactions.push(result.rows.item(i));
    }

    return transactions;
  } catch (error) {
    console.error('❌ Error getting all transactions:', error);
    throw error;
  }
};

/**
 * Get transaction by ID
 * @param {number} id - Transaction ID
 * @returns {object} Transaction details
 */
export const getTransactionById = async (id) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        st.*,
        p.name as product_name,
        p.unit as product_unit,
        p.photo_uri
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.id
      WHERE st.id = ?
    `,
      [id]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0);
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting transaction by ID:', error);
    throw error;
  }
};

/**
 * Get transaction statistics
 * @returns {object} Transaction statistics
 */
export const getTransactionStats = async () => {
  try {
    const db = await getDatabase();

    // Count by type (all time)
    const [inResult] = await db.executeSql(
      "SELECT COUNT(*) as count FROM stock_transactions WHERE type = 'IN'"
    );
    const [outResult] = await db.executeSql(
      "SELECT COUNT(*) as count FROM stock_transactions WHERE type = 'OUT'"
    );

    // Today's transactions
    const [todayInResult] = await db.executeSql(
      `SELECT COUNT(*) as count 
       FROM stock_transactions 
       WHERE type = 'IN' 
       AND DATE(transaction_date) = DATE('now', 'localtime')`
    );
    const [todayOutResult] = await db.executeSql(
      `SELECT COUNT(*) as count 
       FROM stock_transactions 
       WHERE type = 'OUT' 
       AND DATE(transaction_date) = DATE('now', 'localtime')`
    );

    // Recent transactions (last 7 days)
    const [recentResult] = await db.executeSql(
      `SELECT COUNT(*) as count 
       FROM stock_transactions 
       WHERE DATE(transaction_date) >= DATE('now', '-7 days', 'localtime')`
    );

    return {
      totalIn: inResult.rows.item(0).count,
      totalOut: outResult.rows.item(0).count,
      todayIn: todayInResult.rows.item(0).count,
      todayOut: todayOutResult.rows.item(0).count,
      recentCount: recentResult.rows.item(0).count,
    };
  } catch (error) {
    console.error('❌ Error getting transaction stats:', error);
    throw error;
  }
};

/**
 * Get recent transactions (for dashboard)
 * @param {number} limit - Number of transactions to return
 * @returns {array} List of recent transactions
 */
export const getRecentTransactions = async (limit = 10) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        st.*,
        p.name as product_name
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.id
      ORDER BY st.transaction_date DESC
      LIMIT ?
    `,
      [limit]
    );

    const transactions = [];
    for (let i = 0; i < result.rows.length; i++) {
      transactions.push(result.rows.item(i));
    }

    return transactions;
  } catch (error) {
    console.error('❌ Error getting recent transactions:', error);
    throw error;
  }
};

/**
 * Get all transactions with pricing data for profit calculations
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @param {string} type - Filter by type: 'IN', 'OUT', 'ADJUST', or null for all
 * @returns {array} List of transactions with pricing info
 */
export const getAllTransactionsWithPricing = async (
  dateFrom = null,
  dateTo = null,
  type = null,
  limit = 500,
  offset = 0
) => {
  try {
    const db = await getDatabase();
    let query = `
      SELECT
        st.*,
        p.name as product_name,
        p.photo_uri,
        p.purchase_price,
        p.selling_price
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (dateFrom) {
      query += ' AND DATE(st.transaction_date) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND DATE(st.transaction_date) <= ?';
      params.push(dateTo);
    }

    if (type) {
      query += ' AND st.type = ?';
      params.push(type);
    }

    query += ' ORDER BY st.transaction_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [result] = await db.executeSql(query, params);

    const transactions = [];
    for (let i = 0; i < result.rows.length; i++) {
      transactions.push(result.rows.item(i));
    }

    return transactions;
  } catch (error) {
    console.error('❌ Error getting transactions with pricing:', error);
    throw error;
  }
};

/**
 * Get financial statistics (revenue, profit, etc.)
 * @returns {object} Financial statistics
 */
export const getFinancialStats = async () => {
  try {
    const db = await getDatabase();

    // Total revenue and profit from all "Terjual" sales (OUT transactions)
    const [totalResult] = await db.executeSql(
      `SELECT 
        SUM(st.quantity * p.selling_price) as total_revenue,
        SUM(st.quantity * (p.selling_price - p.purchase_price)) as total_profit
       FROM stock_transactions st
       LEFT JOIN products p ON st.product_id = p.id
       WHERE st.type = 'OUT' 
       AND st.notes LIKE 'Terjual%'`
    );

    // Today's revenue and profit
    const [todayResult] = await db.executeSql(
      `SELECT 
        SUM(st.quantity * p.selling_price) as today_revenue,
        SUM(st.quantity * (p.selling_price - p.purchase_price)) as today_profit
       FROM stock_transactions st
       LEFT JOIN products p ON st.product_id = p.id
       WHERE st.type = 'OUT' 
       AND st.notes LIKE 'Terjual%'
       AND DATE(st.transaction_date) = DATE('now', 'localtime')`
    );

    return {
      totalRevenue: totalResult.rows.item(0).total_revenue || 0,
      totalProfit: totalResult.rows.item(0).total_profit || 0,
      todayRevenue: todayResult.rows.item(0).today_revenue || 0,
      todayProfit: todayResult.rows.item(0).today_profit || 0,
    };
  } catch (error) {
    console.error('❌ Error getting financial stats:', error);
    throw error;
  }
};

/**
 * Get financial statistics for a specific date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {object} Financial statistics for the range
 */
export const getFinancialStatsByDateRange = async (startDate, endDate) => {
  try {
    const db = await getDatabase();

    const [result] = await db.executeSql(
      `SELECT 
        SUM(st.quantity * p.selling_price) as total_revenue,
        SUM(st.quantity * (p.selling_price - p.purchase_price)) as total_profit,
        COUNT(*) as transaction_count
       FROM stock_transactions st
       LEFT JOIN products p ON st.product_id = p.id
       WHERE st.type = 'OUT' 
       AND st.notes LIKE 'Terjual%'
       AND DATE(st.transaction_date) >= DATE(?)
       AND DATE(st.transaction_date) <= DATE(?)`,
      [startDate, endDate]
    );

    return {
      totalRevenue: result.rows.item(0).total_revenue || 0,
      totalProfit: result.rows.item(0).total_profit || 0,
      transactionCount: result.rows.item(0).transaction_count || 0,
    };
  } catch (error) {
    console.error('❌ Error getting financial stats by date range:', error);
    throw error;
  }
};

/**
 * Get daily financial breakdown for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {array} Daily breakdown with revenue and profit
 */
export const getDailyFinancialBreakdown = async (startDate, endDate) => {
  try {
    const db = await getDatabase();

    const [result] = await db.executeSql(
      `SELECT 
        DATE(st.transaction_date) as date,
        SUM(st.quantity * p.selling_price) as revenue,
        SUM(st.quantity * (p.selling_price - p.purchase_price)) as profit,
        COUNT(*) as transaction_count
       FROM stock_transactions st
       LEFT JOIN products p ON st.product_id = p.id
       WHERE st.type = 'OUT' 
       AND st.notes LIKE 'Terjual%'
       AND DATE(st.transaction_date) >= DATE(?)
       AND DATE(st.transaction_date) <= DATE(?)
       GROUP BY DATE(st.transaction_date)
       ORDER BY DATE(st.transaction_date) ASC`,
      [startDate, endDate]
    );

    const dailyData = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      dailyData.push({
        date: row.date,
        revenue: row.revenue || 0,
        profit: row.profit || 0,
        transaction_count: row.transaction_count || 0,
      });
    }

    return dailyData;
  } catch (error) {
    console.error('❌ Error getting daily financial breakdown:', error);
    throw error;
  }
};

/**
 * Get financial breakdown by category
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {array} Category breakdown with revenue and profit
 */
export const getCategoryFinancialBreakdown = async (startDate, endDate) => {
  try {
    const db = await getDatabase();

    const [result] = await db.executeSql(
      `SELECT 
        c.name as category_name,
        c.icon as category_icon,
        SUM(st.quantity * p.selling_price) as revenue,
        SUM(st.quantity * (p.selling_price - p.purchase_price)) as profit,
        COUNT(DISTINCT st.product_id) as product_count,
        COUNT(*) as transaction_count
       FROM stock_transactions st
       LEFT JOIN products p ON st.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE st.type = 'OUT' 
       AND st.notes LIKE 'Terjual%'
       AND DATE(st.transaction_date) >= DATE(?)
       AND DATE(st.transaction_date) <= DATE(?)
       GROUP BY c.id, c.name, c.icon
       ORDER BY revenue DESC`,
      [startDate, endDate]
    );

    const categoryData = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      categoryData.push({
        category: row.category_name || 'Tanpa Kategori',
        icon: row.category_icon || '📦',
        revenue: row.revenue || 0,
        profit: row.profit || 0,
        productCount: row.product_count || 0,
        transactionCount: row.transaction_count || 0,
      });
    }

    return categoryData;
  } catch (error) {
    console.error('❌ Error getting category financial breakdown:', error);
    throw error;
  }
};

/**
 * Delete transaction (for corrections - use with caution)
 * This should also revert the stock change
 * @param {number} id - Transaction ID
 */
export const deleteTransaction = async (id) => {
  try {
    const db = await getDatabase();

    // Get transaction details first
    const transaction = await getTransactionById(id);
    if (!transaction) {
      throw new Error('Transaksi tidak ditemukan');
    }

    // Get current product
    const product = await getProductById(transaction.product_id);
    if (!product) {
      throw new Error('Produk tidak ditemukan');
    }

    // Calculate reverted stock
    let revertedStock = product.current_stock;
    if (transaction.type === 'IN') {
      revertedStock -= transaction.quantity; // Remove what was added
    } else if (transaction.type === 'OUT') {
      revertedStock += transaction.quantity; // Add back what was removed
    } else if (transaction.type === 'ADJUST') {
      // Restore the balance that existed just before this ADJUST by reading
      // the balance_after of the transaction that preceded it.
      const [prevResult] = await db.executeSql(
        `SELECT balance_after FROM stock_transactions
         WHERE product_id = ? AND id < ?
         ORDER BY id DESC LIMIT 1`,
        [transaction.product_id, id]
      );
      revertedStock = prevResult.rows.length > 0
        ? prevResult.rows.item(0).balance_after
        : 0;
    }

    // Prevent negative stock
    if (revertedStock < 0) {
      throw new Error('Tidak dapat menghapus transaksi: stok akan menjadi negatif');
    }

    // Delete and revert stock atomically
    await new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql('DELETE FROM stock_transactions WHERE id = ?', [id]);
          tx.executeSql(
            `UPDATE products SET current_stock = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
            [revertedStock, transaction.product_id]
          );
        },
        (error) => reject(error),
        () => resolve()
      );
    });

    console.log(`✅ Transaction deleted and stock reverted`);

    return true;
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    throw error;
  }
};