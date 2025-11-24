/**
 * Notification Management Functions
 * Handles all notification CRUD operations
 */

import { getDatabase } from '../index';

/**
 * Notification Types
 */
export const NotificationTypes = {
  LOW_STOCK: 'LOW_STOCK',
  EXPIRING_SOON: 'EXPIRING_SOON',
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  PRODUCT_ADDED: 'PRODUCT_ADDED',
  PRODUCT_EDITED: 'PRODUCT_EDITED',
};

/**
 * Notification Priorities
 */
export const NotificationPriority = {
  HIGH: 'HIGH',     // Low stock, expiring items
  MEDIUM: 'MEDIUM', // Stock movements
  LOW: 'LOW',       // Product added/edited
};

/**
 * Create a notification
 */
export const createNotification = async (type, data) => {
  const { productId, productName, quantity, details } = data;
  
  // Determine priority and icon based on type
  let priority, title, message, icon;
  
  switch (type) {
    case NotificationTypes.LOW_STOCK:
      priority = NotificationPriority.HIGH;
      icon = '⚠️';
      title = 'Stok Hampir Habis!';
      message = `${productName} tinggal ${quantity || 0} ${details?.unit || 'pcs'}. Segera isi ulang!`;
      break;
      
    case NotificationTypes.EXPIRING_SOON:
      priority = NotificationPriority.HIGH;
      icon = '⏰';
      title = 'Produk Akan Kadaluarsa';
      message = `${productName} akan kadaluarsa dalam ${details?.daysLeft || 0} hari`;
      break;
      
    case NotificationTypes.STOCK_IN:
      priority = NotificationPriority.MEDIUM;
      icon = '📥';
      title = 'Stok Masuk';
      message = `${productName} +${quantity} ${details?.unit || 'pcs'}`;
      break;
      
    case NotificationTypes.STOCK_OUT:
      priority = NotificationPriority.MEDIUM;
      icon = '📤';
      title = 'Stok Keluar';
      message = `${productName} -${quantity} ${details?.unit || 'pcs'}`;
      break;
      
    case NotificationTypes.PRODUCT_ADDED:
      priority = NotificationPriority.LOW;
      icon = '✨';
      title = 'Produk Baru Ditambahkan';
      message = `${productName} berhasil ditambahkan ke inventori`;
      break;
      
    case NotificationTypes.PRODUCT_EDITED:
      priority = NotificationPriority.LOW;
      icon = '✏️';
      title = 'Produk Diperbarui';
      message = `${productName} berhasil diperbarui`;
      break;
      
    default:
      throw new Error('Invalid notification type');
  }
  
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO notifications (type, priority, title, message, product_id, product_name, quantity, icon, is_read)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [type, priority, title, message, productId, productName, quantity, icon],
          (_, result) => {
            console.log('✅ Notification created:', title);
            resolve(result.insertId);
          },
          (_, error) => {
            console.error('❌ Error creating notification:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

/**
 * Get all notifications (newest first)
 */
export const getAllNotifications = async (limit = 50) => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM notifications 
           ORDER BY created_at DESC 
           LIMIT ?`,
          [limit],
          (_, { rows }) => {
            const notifications = [];
            for (let i = 0; i < rows.length; i++) {
              notifications.push(rows.item(i));
            }
            resolve(notifications);
          },
          (_, error) => {
            console.error('❌ Error fetching notifications:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    return [];
  }
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async () => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`,
          [],
          (_, { rows }) => {
            resolve(rows.item(0).count);
          },
          (_, error) => {
            console.error('❌ Error getting unread count:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    return 0;
  }
};

/**
 * Get notifications by priority
 */
export const getNotificationsByPriority = async (priority) => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM notifications 
           WHERE priority = ?
           ORDER BY created_at DESC`,
          [priority],
          (_, { rows }) => {
            const notifications = [];
            for (let i = 0; i < rows.length; i++) {
              notifications.push(rows.item(i));
            }
            resolve(notifications);
          },
          (_, error) => {
            console.error('❌ Error fetching notifications by priority:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    return [];
  }
};

/**
 * Get unread notifications
 */
export const getUnreadNotifications = async () => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM notifications 
           WHERE is_read = 0
           ORDER BY 
             CASE priority 
               WHEN 'HIGH' THEN 1 
               WHEN 'MEDIUM' THEN 2 
               WHEN 'LOW' THEN 3 
             END,
             created_at DESC`,
          [],
          (_, { rows }) => {
            const notifications = [];
            for (let i = 0; i < rows.length; i++) {
              notifications.push(rows.item(i));
            }
            resolve(notifications);
          },
          (_, error) => {
            console.error('❌ Error fetching unread notifications:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `UPDATE notifications SET is_read = 1 WHERE id = ?`,
          [notificationId],
          (_, result) => {
            console.log('✅ Notification marked as read');
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Error marking notification as read:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `UPDATE notifications SET is_read = 1 WHERE is_read = 0`,
          [],
          (_, result) => {
            console.log('✅ All notifications marked as read');
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Error marking all as read:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `DELETE FROM notifications WHERE id = ?`,
          [notificationId],
          (_, result) => {
            console.log('✅ Notification deleted');
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Error deleting notification:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

/**
 * Clear all read notifications
 */
export const clearReadNotifications = async () => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `DELETE FROM notifications WHERE is_read = 1`,
          [],
          (_, result) => {
            console.log('✅ Read notifications cleared');
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Error clearing notifications:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `DELETE FROM notifications`,
          [],
          (_, result) => {
            console.log('✅ All notifications cleared');
            resolve(result);
          },
          (_, error) => {
            console.error('❌ Error clearing all notifications:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

/**
 * Check for low stock and create notifications if needed
 */
export const checkLowStockAlerts = async () => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        // Find products with low stock
        tx.executeSql(
          `SELECT id, name, current_stock, min_stock_threshold, unit 
           FROM products 
           WHERE is_active = 1 
           AND current_stock <= min_stock_threshold
           AND min_stock_threshold > 0`,
          [],
          async (_, { rows }) => {
            const lowStockProducts = [];
            for (let i = 0; i < rows.length; i++) {
              lowStockProducts.push(rows.item(i));
            }
            
            // Create notifications for each low stock product
            for (const product of lowStockProducts) {
              // Check if notification already exists (within last 24 hours)
              const existingNotif = await checkRecentNotification(
                NotificationTypes.LOW_STOCK, 
                product.id, 
                24
              );
              
              if (!existingNotif) {
                await createNotification(NotificationTypes.LOW_STOCK, {
                  productId: product.id,
                  productName: product.name,
                  quantity: product.current_stock,
                  details: { unit: product.unit }
                });
              }
            }
            
            resolve(lowStockProducts.length);
          },
          (_, error) => {
            console.error('❌ Error checking low stock:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    return 0;
  }
};

/**
 * Check for expiring products and create notifications
 */
export const checkExpiringAlerts = async () => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        // Find products expiring in next 30 days
        tx.executeSql(
          `SELECT id, name, expiry_date,
           CAST((julianday(expiry_date) - julianday('now', 'localtime')) AS INTEGER) as days_left
           FROM products 
           WHERE is_active = 1 
           AND expiry_date IS NOT NULL
           AND julianday(expiry_date) > julianday('now', 'localtime')
           AND julianday(expiry_date) <= julianday('now', 'localtime', '+30 days')`,
          [],
          async (_, { rows }) => {
            const expiringProducts = [];
            for (let i = 0; i < rows.length; i++) {
              expiringProducts.push(rows.item(i));
            }
            
            // Create notifications for expiring products
            for (const product of expiringProducts) {
              // Check if notification already exists (within last 24 hours)
              const existingNotif = await checkRecentNotification(
                NotificationTypes.EXPIRING_SOON, 
                product.id, 
                24
              );
              
              if (!existingNotif) {
                await createNotification(NotificationTypes.EXPIRING_SOON, {
                  productId: product.id,
                  productName: product.name,
                  details: { daysLeft: product.days_left }
                });
              }
            }
            
            resolve(expiringProducts.length);
          },
          (_, error) => {
            console.error('❌ Error checking expiring products:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    return 0;
  }
};

/**
 * Check if a recent notification exists (to prevent duplicates)
 */
const checkRecentNotification = async (type, productId, hoursAgo = 24) => {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT id FROM notifications 
           WHERE type = ? 
           AND product_id = ?
           AND datetime(created_at) >= datetime('now', 'localtime', '-${hoursAgo} hours')
           LIMIT 1`,
          [type, productId],
          (_, { rows }) => {
            resolve(rows.length > 0);
          },
          (_, error) => {
            console.error('❌ Error checking recent notification:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    return false;
  }
};
