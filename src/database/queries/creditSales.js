/**
 * Credit Sales (Hutang) Queries
 */
import { getDatabase } from '../index';

export const createCreditSale = async (transactionId, buyerName, totalAmount, dueDate, notes) => {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    `INSERT INTO credit_sales (transaction_id, buyer_name, total_amount, due_date, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [transactionId || null, buyerName, totalAmount, dueDate || null, notes || null]
  );
  return result.insertId;
};

export const getUnpaidCredits = async () => {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'SELECT * FROM credit_sales WHERE is_paid = 0 ORDER BY due_date ASC'
  );
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
  return rows;
};

export const getAllCredits = async () => {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'SELECT * FROM credit_sales ORDER BY created_at DESC'
  );
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
  return rows;
};

export const markCreditPaid = async (creditId) => {
  const db = await getDatabase();
  await db.executeSql(
    "UPDATE credit_sales SET is_paid = 1, paid_amount = total_amount, paid_at = datetime('now','localtime') WHERE id = ?",
    [creditId]
  );
};

export const getTotalOutstanding = async () => {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'SELECT SUM(total_amount - paid_amount) as total FROM credit_sales WHERE is_paid = 0'
  );
  return result.rows.item(0).total || 0;
};
