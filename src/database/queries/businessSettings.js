/**
 * Business Settings Queries
 */
import { getDatabase } from '../index';

export const getSetting = async (key) => {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'SELECT value FROM business_settings WHERE key = ?', [key]
  );
  if (result.rows.length > 0) return result.rows.item(0).value;
  return null;
};

export const setSetting = async (key, value) => {
  const db = await getDatabase();
  await db.executeSql(
    'INSERT OR REPLACE INTO business_settings (key, value) VALUES (?, ?)',
    [key, String(value)]
  );
};

export const getAllSettings = async () => {
  const db = await getDatabase();
  const [result] = await db.executeSql('SELECT key, value FROM business_settings');
  const settings = {};
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    settings[row.key] = row.value;
  }
  return {
    business_name: settings.business_name || 'Toko Saya',
    currency: settings.currency || 'Rp',
    address: settings.address || '',
    phone: settings.phone || '',
    tax_rate: settings.tax_rate || '0',
  };
};
