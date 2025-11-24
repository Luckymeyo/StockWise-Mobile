/**
 * App.js - Updated with Notification Integration
 * This replaces your current App.js
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database';
import { 
  initializeNotifications, 
  requestNotificationPermission,
  setupNotificationHandler,
} from './src/services/NotificationService';
import { 
  setupDailyChecks,
  BackgroundFetchHeadlessTask,
} from './src/services/DailyCheckService';
import BackgroundFetch from 'react-native-background-fetch';

// Register headless task for background execution
BackgroundFetch.registerHeadlessTask(BackgroundFetchHeadlessTask);

export default function App() {
  const navigationRef = React.useRef();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing StockWise Mobile...');

      // 1. Initialize database
      await initDatabase();
      console.log('✅ Database initialized');

      // 2. Initialize notification channels
      await initializeNotifications();
      console.log('✅ Notification channels created');

      // 3. Request notification permission
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        console.log('✅ Notification permission granted');
        
        // 4. Setup daily background checks
        await setupDailyChecks();
        console.log('✅ Daily checks configured');
      } else {
        console.log('⚠️ Notification permission denied by user');
      }

      // 5. Setup notification press handler
      if (navigationRef.current) {
        setupNotificationHandler(navigationRef.current);
        console.log('✅ Notification handler setup');
      }

      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing app:', error);
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <AppNavigator />
    </NavigationContainer>
  );
}
