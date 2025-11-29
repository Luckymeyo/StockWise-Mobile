/**
 * App.js - StockWise Mobile Entry Point
 * Updated with Notification Integration and Bug Fixes
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState } from 'react';
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
  const navigationRef = useRef(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  // Initialize database and notifications
  useEffect(() => {
    initializeApp();
  }, []);

  // Setup notification handler after navigation is ready
  useEffect(() => {
    if (isNavigationReady && isDbReady && navigationRef.current) {
      setupNotificationHandler(navigationRef.current);
      console.log('✅ Notification handler setup');
    }
  }, [isNavigationReady, isDbReady]);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing StockWise Mobile...');

      // 1. Initialize database
      await initDatabase();
      console.log('✅ Database initialized');
      setIsDbReady(true);

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

      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing app:', error);
    }
  };

  const onNavigationReady = () => {
    setIsNavigationReady(true);
    console.log('✅ Navigation ready');
  };

  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={onNavigationReady}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <AppNavigator />
    </NavigationContainer>
  );
}
