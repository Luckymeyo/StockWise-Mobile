/**
 * Price History Queries
 */
import { getDatabase } from '../index';

export const recordPriceChange = async (productId, oldPurchase, newPurchase, oldSelling, newSelling) => {
  try {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT INTO price_history (product_id, old_purchase_price, new_purchase_price, old_selling_price, new_selling_price)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, oldPurchase, newPurchase, oldSelling, newSelling]
    );
  } catch (error) {
    console.error('Error recording price change:', error);
  }
};

export const getPriceHistory = async (productId) => {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM price_history WHERE product_id = ? ORDER BY changed_at DESC',
      [productId]
    );
    const rows = [];
    for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
    return rows;
  } catch (error) {
    console.error('Error getting price history:', error);
    return [];
  }
};
