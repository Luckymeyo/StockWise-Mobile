/**
 * DailyCheckService.js
 * Background service to check for low stock and expiring products
 * Location: src/services/DailyCheckService.js
 */

import BackgroundFetch from 'react-native-background-fetch';
import { getLowStockProducts, getNearExpiryProducts } from '../database/queries/products';
import { 
  sendGroupedLowStockAlert, 
  sendGroupedExpiringAlert,
  sendLowStockAlert,
  sendExpiringAlert,
  areNotificationsEnabled,
} from './NotificationService';

/**
 * Calculate days until expiry
 */
function getDaysUntilExpiry(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Perform daily checks for low stock and expiring products
 */
async function performDailyChecks() {
  try {
    console.log('🔔 [DailyCheck] Starting daily checks...');

    // Check if notifications are enabled
    const settings = await areNotificationsEnabled();
    if (!settings.permission) {
      console.log('⚠️ [DailyCheck] Notification permission not granted');
      return;
    }

    let alertsSent = 0;

    // Check for low stock products
    if (settings.lowStock) {
      const lowStockProducts = await getLowStockProducts();
      console.log(`📊 [DailyCheck] Found ${lowStockProducts.length} low stock products`);

      if (lowStockProducts.length > 0) {
        if (lowStockProducts.length === 1) {
          // Single product - send specific alert
          await sendLowStockAlert(lowStockProducts[0]);
          alertsSent++;
        } else if (lowStockProducts.length <= 3) {
          // 2-3 products - send individual alerts
          for (const product of lowStockProducts) {
            await sendLowStockAlert(product);
            alertsSent++;
          }
        } else {
          // 4+ products - send grouped alert
          await sendGroupedLowStockAlert(lowStockProducts.length);
          alertsSent++;
        }
      }
    }

    // Check for expiring products (within 7 days)
    if (settings.expiry) {
      const expiringProducts = await getNearExpiryProducts(7);
      console.log(`📊 [DailyCheck] Found ${expiringProducts.length} expiring products`);

      if (expiringProducts.length > 0) {
        // Filter products by urgency
        const criticalProducts = []; // 0-2 days
        const urgentProducts = [];   // 3-5 days
        const soonProducts = [];      // 6-7 days

        for (const product of expiringProducts) {
          const daysLeft = getDaysUntilExpiry(product.expiry_date);
          if (daysLeft <= 2) {
            criticalProducts.push(product);
          } else if (daysLeft <= 5) {
            urgentProducts.push(product);
          } else {
            soonProducts.push(product);
          }
        }

        // Send critical alerts (always individual)
        for (const product of criticalProducts) {
          const daysLeft = getDaysUntilExpiry(product.expiry_date);
          await sendExpiringAlert(product, daysLeft);
          alertsSent++;
        }

        // Send urgent alerts (grouped if more than 2)
        if (urgentProducts.length === 1) {
          const daysLeft = getDaysUntilExpiry(urgentProducts[0].expiry_date);
          await sendExpiringAlert(urgentProducts[0], daysLeft);
          alertsSent++;
        } else if (urgentProducts.length > 1) {
          await sendGroupedExpiringAlert(urgentProducts.length);
          alertsSent++;
        }

        // Only send soon alerts if no critical/urgent
        if (criticalProducts.length === 0 && urgentProducts.length === 0 && soonProducts.length > 0) {
          if (soonProducts.length <= 2) {
            for (const product of soonProducts) {
              const daysLeft = getDaysUntilExpiry(product.expiry_date);
              await sendExpiringAlert(product, daysLeft);
              alertsSent++;
            }
          } else {
            await sendGroupedExpiringAlert(soonProducts.length);
            alertsSent++;
          }
        }
      }
    }

    console.log(`✅ [DailyCheck] Completed. ${alertsSent} alerts sent.`);
    return { success: true, alertsSent };
  } catch (error) {
    console.error('❌ [DailyCheck] Error performing daily checks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup background fetch for daily checks
 * This will run even when the app is closed
 */
export async function setupDailyChecks() {
  try {
    // Configure background fetch
    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: 720, // Check every 12 hours (in minutes)
        stopOnTerminate: false,     // Continue after app is terminated
        startOnBoot: true,          // Start after device reboot
        enableHeadless: true,       // Allow headless execution
        requiresNetworkConnectivity: false, // Works offline
        requiresCharging: false,    // Works on battery
        requiresDeviceIdle: false,  // Works while device in use
        forceAlarmManager: false,   // Use JobScheduler (more reliable)
      },
      async (taskId) => {
        console.log('🔔 [BackgroundFetch] Task started:', taskId);
        
        // Perform the daily checks
        const result = await performDailyChecks();
        
        console.log('🔔 [BackgroundFetch] Task result:', result);
        
        // IMPORTANT: Signal completion
        BackgroundFetch.finish(taskId);
      },
      (taskId) => {
        // Task timeout (after 30 seconds)
        console.log('⏰ [BackgroundFetch] Task timeout:', taskId);
        BackgroundFetch.finish(taskId);
      }
    );

    console.log('✅ [BackgroundFetch] Configured with status:', status);
    
    // Schedule first task
    await BackgroundFetch.scheduleTask({
      taskId: 'com.stockwisemobile.dailycheck',
      delay: 0, // Run immediately first time
      periodic: true,
      forceAlarmManager: false,
    });

    console.log('✅ [BackgroundFetch] Task scheduled');
    
    return status;
  } catch (error) {
    console.error('❌ [BackgroundFetch] Configuration error:', error);
    return -1;
  }
}

/**
 * Stop background checks
 */
export async function stopDailyChecks() {
  try {
    await BackgroundFetch.stop();
    console.log('✅ [BackgroundFetch] Stopped');
  } catch (error) {
    console.error('❌ [BackgroundFetch] Error stopping:', error);
  }
}

/**
 * Check background fetch status
 */
export async function checkBackgroundFetchStatus() {
  try {
    const status = await BackgroundFetch.status();
    const statusMap = {
      0: 'RESTRICTED',    // Background updates unavailable
      1: 'DENIED',        // User explicitly disabled
      2: 'AVAILABLE',     // Background updates available
    };
    
    console.log('📊 [BackgroundFetch] Status:', statusMap[status] || 'UNKNOWN');
    return status;
  } catch (error) {
    console.error('❌ [BackgroundFetch] Error checking status:', error);
    return -1;
  }
}

/**
 * Trigger a manual check (for testing)
 */
export async function triggerManualCheck() {
  try {
    console.log('🔔 [ManualCheck] Triggering manual check...');
    const result = await performDailyChecks();
    return result;
  } catch (error) {
    console.error('❌ [ManualCheck] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Headless task for background execution
 * This runs even when app is completely closed
 */
export async function BackgroundFetchHeadlessTask({ taskId, timeout }) {
  console.log('🔔 [Headless] Task started:', taskId);
  
  if (timeout) {
    console.log('⏰ [Headless] Task timeout');
    BackgroundFetch.finish(taskId);
    return;
  }

  try {
    // Perform daily checks
    await performDailyChecks();
    
    console.log('✅ [Headless] Task completed');
  } catch (error) {
    console.error('❌ [Headless] Error:', error);
  }
  
  BackgroundFetch.finish(taskId);
}

export default {
  setupDailyChecks,
  stopDailyChecks,
  checkBackgroundFetchStatus,
  triggerManualCheck,
  performDailyChecks,
  BackgroundFetchHeadlessTask,
};
