/**
 * CSV Export Utility
 * Exports inventory and transaction data as CSV files
 */

import { Share } from 'react-native';

let RNFS = null;
try { RNFS = require('react-native-fs'); } catch (e) {}

import { getDb } from '../database/index';

const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCSV = (headers, rows) => {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
};

const writeAndShare = async (filename, content, mimeType = 'text/csv') => {
  if (!RNFS) {
    // Fallback: share as plain text
    await Share.share({ message: content, title: filename });
    return;
  }
  const path = RNFS.DocumentDirectoryPath + '/' + filename;
  await RNFS.writeFile(path, content, 'utf8');
  await Share.share({ message: `Export StockWise: ${filename}`, url: `file://${path}`, title: filename });
  return path;
};

/**
 * Export all products/inventory as CSV
 */
export const exportInventoryCSV = async () => {
  const db = await getDb();
  const [result] = await db.executeSql(
    `SELECT id, name, sku, barcode, category, unit,
            purchase_price, selling_price, current_stock, min_stock,
            storage_location, internal_notes, is_active, created_at
     FROM products
     ORDER BY name ASC`
  );

  const headers = [
    'ID', 'Nama Produk', 'SKU', 'Barcode', 'Kategori', 'Satuan',
    'Harga Beli', 'Harga Jual', 'Stok Saat Ini', 'Stok Minimum',
    'Lokasi Penyimpanan', 'Catatan Internal', 'Aktif', 'Tanggal Dibuat',
  ];

  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    const r = result.rows.item(i);
    rows.push([
      r.id, r.name, r.sku, r.barcode, r.category, r.unit,
      r.purchase_price, r.selling_price, r.current_stock, r.min_stock,
      r.storage_location, r.internal_notes,
      r.is_active === 1 ? 'Ya' : 'Tidak',
      r.created_at,
    ]);
  }

  const csv = buildCSV(headers, rows);
  const today = new Date().toISOString().slice(0, 10);
  await writeAndShare(`StockWise_Inventori_${today}.csv`, csv);
};

/**
 * Export transactions as CSV within a date range
 * @param {string|null} fromDate - ISO date string e.g. "2024-01-01" (optional)
 * @param {string|null} toDate   - ISO date string e.g. "2024-01-31" (optional)
 */
export const exportTransactionsCSV = async (fromDate = null, toDate = null) => {
  const db = await getDb();

  let whereClauses = ['t.is_voided = 0'];
  const params = [];

  if (fromDate) {
    whereClauses.push("DATE(t.transaction_date) >= DATE(?)");
    params.push(fromDate);
  }
  if (toDate) {
    whereClauses.push("DATE(t.transaction_date) <= DATE(?)");
    params.push(toDate);
  }

  const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const [result] = await db.executeSql(
    `SELECT t.id, t.transaction_type, p.name AS product_name, p.sku,
            t.quantity, t.price_per_unit, t.total_price,
            t.discount_amount, t.notes, t.transaction_date
     FROM stock_transactions t
     LEFT JOIN products p ON t.product_id = p.id
     ${where}
     ORDER BY t.transaction_date DESC`,
    params
  );

  const headers = [
    'ID', 'Tipe', 'Nama Produk', 'SKU',
    'Qty', 'Harga Satuan', 'Total', 'Diskon',
    'Catatan', 'Tanggal',
  ];

  const typeLabel = { IN: 'Masuk', OUT: 'Keluar', ADJUST: 'Penyesuaian' };

  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    const r = result.rows.item(i);
    rows.push([
      r.id, typeLabel[r.transaction_type] || r.transaction_type,
      r.product_name, r.sku,
      r.quantity, r.price_per_unit, r.total_price,
      r.discount_amount || 0, r.notes,
      r.transaction_date,
    ]);
  }

  const csv = buildCSV(headers, rows);
  const today = new Date().toISOString().slice(0, 10);
  const suffix = fromDate && toDate ? `_${fromDate}_sd_${toDate}` : `_${today}`;
  await writeAndShare(`StockWise_Transaksi${suffix}.csv`, csv);
};
