/**
 * Product Database Queries
 * All CRUD operations for products/items
 */

import { getDatabase } from '../index';

/**
 * Get all products
 */
export const getAllProducts = async () => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(`
      SELECT 
        p.*,
        c.name as category_name,
        c.icon as category_icon,
        CASE 
          WHEN p.current_stock <= p.min_stock_threshold THEN 1 
          ELSE 0 
        END as is_low_stock,
        CASE 
          WHEN p.expiry_date IS NOT NULL AND 
               julianday(p.expiry_date) - julianday('now') <= 7 THEN 1
          ELSE 0
        END as is_near_expiry
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.updated_at DESC
    `);

    const products = [];
    for (let i = 0; i < result.rows.length; i++) {
      products.push(result.rows.item(i));
    }

    return products;
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
};

/**
 * Get product by ID
 */
export const getProductById = async (id) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        p.*,
        c.name as category_name,
        c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `,
      [id]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0);
    }
    return null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    throw error;
  }
};

/**
 * Search products by name or SKU
 */
export const searchProducts = async (searchTerm) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        p.*,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 
        AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
      ORDER BY p.name
    `,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );

    const products = [];
    for (let i = 0; i < result.rows.length; i++) {
      products.push(result.rows.item(i));
    }

    return products;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

/**
 * Get product by barcode
 */
export const getProductByBarcode = async (barcode) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM products WHERE barcode = ? AND is_active = 1',
      [barcode]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0);
    }
    return null;
  } catch (error) {
    console.error('Error getting product by barcode:', error);
    throw error;
  }
};

/**
 * Create new product
 */
export const createProduct = async (productData) => {
  try {
    const db = await getDatabase();

    const {
      name,
      sku,
      barcode,
      category_id,
      description,
      photo_uri,
      purchase_price,
      selling_price,
      current_stock,
      unit,
      min_stock_threshold,
      expiry_date,
    } = productData;

    const [result] = await db.executeSql(
      `
      INSERT INTO products (
        name, sku, barcode, category_id, description, photo_uri,
        purchase_price, selling_price, current_stock, unit,
        min_stock_threshold, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        name,
        sku || null,
        barcode || null,
        category_id || null,
        description || null,
        photo_uri || null,
        purchase_price || 0,
        selling_price || 0,
        current_stock || 0,
        unit || 'pcs',
        min_stock_threshold || 0,
        expiry_date || null,
      ]
    );

    // Create initial stock transaction
    if (current_stock > 0) {
      await db.executeSql(
        `
        INSERT INTO stock_transactions (
          product_id, type, quantity, unit, notes, balance_after
        ) VALUES (?, 'IN', ?, ?, 'Initial stock', ?)
      `,
        [result.insertId, current_stock, unit, current_stock]
      );
    }

    return { id: result.insertId, ...productData };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Update product
 */
export const updateProduct = async (id, productData) => {
  try {
    const db = await getDatabase();

    const {
      name,
      sku,
      barcode,
      category_id,
      description,
      photo_uri,
      purchase_price,
      selling_price,
      unit,
      min_stock_threshold,
      expiry_date,
    } = productData;

    await db.executeSql(
      `
      UPDATE products SET
        name = ?,
        sku = ?,
        barcode = ?,
        category_id = ?,
        description = ?,
        photo_uri = ?,
        purchase_price = ?,
        selling_price = ?,
        unit = ?,
        min_stock_threshold = ?,
        expiry_date = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `,
      [
        name,
        sku,
        barcode,
        category_id,
        description,
        photo_uri,
        purchase_price,
        selling_price,
        unit,
        min_stock_threshold,
        expiry_date,
        id,
      ]
    );

    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

/**
 * Delete product (soft delete)
 */
export const deleteProduct = async (id) => {
  try {
    const db = await getDatabase();
    await db.executeSql('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

/**
 * Get low stock products
 */
export const getLowStockProducts = async () => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(`
      SELECT 
        p.*,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 
        AND p.current_stock <= p.min_stock_threshold
      ORDER BY p.current_stock ASC
    `);

    const products = [];
    for (let i = 0; i < result.rows.length; i++) {
      products.push(result.rows.item(i));
    }

    return products;
  } catch (error) {
    console.error('Error getting low stock products:', error);
    throw error;
  }
};

/**
 * Get products near expiry (within 30 days)
 */
export const getNearExpiryProducts = async (daysThreshold = 30) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `
      SELECT 
        p.*,
        c.name as category_name,
        CAST(julianday(p.expiry_date) - julianday('now') AS INTEGER) as days_until_expiry
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 
        AND p.expiry_date IS NOT NULL
        AND julianday(p.expiry_date) - julianday('now') <= ?
        AND julianday(p.expiry_date) - julianday('now') >= 0
      ORDER BY p.expiry_date ASC
    `,
      [daysThreshold]
    );

    const products = [];
    for (let i = 0; i < result.rows.length; i++) {
      products.push(result.rows.item(i));
    }

    return products;
  } catch (error) {
    console.error('Error getting near expiry products:', error);
    throw error;
  }
};

/**
 * Update product stock
 */
export const updateProductStock = async (productId, newStock) => {
  try {
    const db = await getDatabase();
    await db.executeSql(
      `
      UPDATE products 
      SET current_stock = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `,
      [newStock, productId]
    );
    return true;
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
};

/**
 * Get all categories
 */
export const getAllCategories = async () => {
  try {
    const db = await getDatabase();
    const [results] = await db.executeSql(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    
    const categories = [];
    for (let i = 0; i < results.rows.length; i++) {
      categories.push(results.rows.item(i));
    }
    
    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};
