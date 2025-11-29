/**
 * NotificationService.js
 * Handles all notification operations for StockWise Mobile
 * Location: src/services/NotificationService.js
 */

import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createNotification, 
  NotificationTypes 
} from '../database/queries/notifications';

/**
 * Initialize notification channels (Android 8+)
 * Call this once when app starts
 */
export async function initializeNotifications() {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'stockwise-alerts',
      name: 'Peringatan StockWise',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      badge: true,
    });

    await notifee.createChannel({
      id: 'stockwise-activity',
      name: 'Aktivitas StockWise',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
    });

    console.log('✅ Notification channels created');
  }
}

/**
 * Request notification permission
 * Returns true if granted, false otherwise
 */
export async function requestNotificationPermission() {
  try {
    const settings = await notifee.requestPermission();
    
    if (settings.authorizationStatus >= 1) {
      console.log('✅ Notification permission granted');
      await AsyncStorage.setItem('notificationPermission', 'granted');
      return true;
    } else {
      console.log('❌ Notification permission denied');
      await AsyncStorage.setItem('notificationPermission', 'denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Check if notifications are enabled in settings
 */
export async function areNotificationsEnabled() {
  try {
    const permission = await AsyncStorage.getItem('notificationPermission');
    const lowStockEnabled = await AsyncStorage.getItem('lowStockEnabled');
    const expiryEnabled = await AsyncStorage.getItem('expiryEnabled');
    
    return {
      permission: permission === 'granted',
      lowStock: lowStockEnabled !== 'false',
      expiry: expiryEnabled !== 'false',
    };
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return { permission: false, lowStock: true, expiry: true };
  }
}

/**
 * Send a local notification
 * @param {Object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {string} notification.type - Notification type (LOW_STOCK, EXPIRING_SOON, etc.)
 * @param {Object} notification.data - Additional data
 */
export async function sendLocalNotification(notification) {
  try {
    const { title, body, type, data } = notification;
    
    // Check if notifications are enabled
    const settings = await areNotificationsEnabled();
    if (!settings.permission) {
      console.log('⚠️ Notification permission not granted');
      return null;
    }

    // Check type-specific settings
    if (type === NotificationTypes.LOW_STOCK && !settings.lowStock) {
      console.log('⚠️ Low stock notifications disabled in settings');
      return null;
    }
    if (type === NotificationTypes.EXPIRING_SOON && !settings.expiry) {
      console.log('⚠️ Expiry notifications disabled in settings');
      return null;
    }

    // Determine channel and priority based on type
    const isHighPriority = 
      type === NotificationTypes.LOW_STOCK || 
      type === NotificationTypes.EXPIRING_SOON;
    
    const channelId = isHighPriority ? 'stockwise-alerts' : 'stockwise-activity';

    // Convert all data values to strings (FIXED!)
    const stringifiedData = {};
    if (data) {
      Object.keys(data).forEach(key => {
        stringifiedData[key] = String(data[key]);
      });
    }

    // Display notification
    const notificationId = await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        // FIXED: Remove smallIcon if it doesn't exist, or use 'ic_launcher'
        // smallIcon: 'ic_notification', // Only if you have this icon
        color: '#6366F1', // Primary blue color
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        showTimestamp: true,
        timestamp: Date.now(),
        badge: 1,
      },
      ios: {
        sound: 'default',
        badge: 1,
      },
      data: {
        type: String(type), // FIXED: Convert to string
        ...stringifiedData, // FIXED: All data as strings
      },
    });

    console.log('✅ Notification sent:', notificationId);
    
    // Also save to database for in-app display
    // Fixed: Added null check for data object
    if (data && data.productId && data.productName) {
      await createNotification(type, {
        productId: data.productId,
        productName: data.productName,
        quantity: data.quantity,
        details: data,
      });
    }

    return notificationId;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
}

/**
 * Send low stock alert notification
 */
export async function sendLowStockAlert(product) {
  return await sendLocalNotification({
    title: '⚠️ Stok Hampir Habis!',
    body: `${product.name} tinggal ${product.current_stock} ${product.unit}. Segera isi ulang!`,
    type: NotificationTypes.LOW_STOCK,
    data: {
      productId: product.id,
      productName: product.name,
      quantity: product.current_stock,
      unit: product.unit,
      minStock: product.min_stock, // Will be converted to string automatically
    },
  });
}

/**
 * Send expiring product alert notification
 */
export async function sendExpiringAlert(product, daysLeft) {
  return await sendLocalNotification({
    title: '⏰ Produk Akan Kadaluarsa!',
    body: `${product.name} akan kadaluarsa dalam ${daysLeft} hari`,
    type: NotificationTypes.EXPIRING_SOON,
    data: {
      productId: product.id,
      productName: product.name,
      daysLeft: daysLeft,
      expiryDate: product.expiry_date,
    },
  });
}

/**
 * Send stock in notification
 */
export async function sendStockInNotification(product, quantity) {
  return await sendLocalNotification({
    title: '📥 Stok Masuk',
    body: `${product.name} +${quantity} ${product.unit}`,
    type: NotificationTypes.STOCK_IN,
    data: {
      productId: product.id,
      productName: product.name,
      quantity: quantity,
      unit: product.unit,
    },
  });
}

/**
 * Send stock out notification
 */
export async function sendStockOutNotification(product, quantity) {
  return await sendLocalNotification({
    title: '📤 Stok Keluar',
    body: `${product.name} -${quantity} ${product.unit}`,
    type: NotificationTypes.STOCK_OUT,
    data: {
      productId: product.id,
      productName: product.name,
      quantity: quantity,
      unit: product.unit,
    },
  });
}

/**
 * Send grouped low stock notification
 */
export async function sendGroupedLowStockAlert(count) {
  return await sendLocalNotification({
    title: '⚠️ Perhatian: Stok Rendah!',
    body: `${count} produk stoknya hampir habis. Tap untuk melihat detail.`,
    type: NotificationTypes.LOW_STOCK,
    data: {
      count: count,
      grouped: true,
    },
  });
}

/**
 * Send grouped expiring notification
 */
export async function sendGroupedExpiringAlert(count) {
  return await sendLocalNotification({
    title: '⏰ Peringatan: Akan Kadaluarsa!',
    body: `${count} produk akan segera kadaluarsa. Tap untuk melihat detail.`,
    type: NotificationTypes.EXPIRING_SOON,
    data: {
      count: count,
      grouped: true,
    },
  });
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications() {
  try {
    await notifee.cancelAllNotifications();
    console.log('✅ All notifications cancelled');
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
}

/**
 * Cancel notification by ID
 */
export async function cancelNotification(notificationId) {
  try {
    await notifee.cancelNotification(notificationId);
    console.log('✅ Notification cancelled:', notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

/**
 * Get notification badge count
 */
export async function getBadgeCount() {
  try {
    if (Platform.OS === 'android') {
      const notifications = await notifee.getDisplayedNotifications();
      return notifications.length;
    }
    return 0;
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}

/**
 * Clear badge count
 */
export async function clearBadgeCount() {
  try {
    await notifee.setBadgeCount(0);
    console.log('✅ Badge count cleared');
  } catch (error) {
    console.error('Error clearing badge count:', error);
  }
}

/**
 * Handle notification press
 * Call this in App.js to handle when user taps notification
 */
export function setupNotificationHandler(navigation) {
  // Handle notification press when app is in foreground or background
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === 1) { // Notification pressed
      console.log('Notification pressed:', detail);
      
      const { data } = detail.notification;
      
      // Navigate based on notification type
      if (data?.productId) {
        navigation.navigate('Inventory', {
          screen: 'ItemDetail',
          params: { productId: data.productId },
        });
      } else if (data?.grouped) {
        navigation.navigate('Notifications');
      }
    }
  });

  // Handle notification press when app was killed
  notifee.getInitialNotification().then((notification) => {
    if (notification) {
      console.log('App opened from notification:', notification);
      
      const { data } = notification.notification;
      
      if (data?.productId) {
        navigation.navigate('Inventory', {
          screen: 'ItemDetail',
          params: { productId: data.productId },
        });
      }
    }
  });
}

export default {
  initializeNotifications,
  requestNotificationPermission,
  areNotificationsEnabled,
  sendLocalNotification,
  sendLowStockAlert,
  sendExpiringAlert,
  sendStockInNotification,
  sendStockOutNotification,
  sendGroupedLowStockAlert,
  sendGroupedExpiringAlert,
  cancelAllNotifications,
  cancelNotification,
  getBadgeCount,
  clearBadgeCount,
  setupNotificationHandler,
};