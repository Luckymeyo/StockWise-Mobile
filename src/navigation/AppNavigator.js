import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import Colors from '../styles/colors';
import { getUnreadCount } from '../database/queries/notifications';

import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ManagementScreen from '../screens/ManagementScreen';
import FinancialAnalysisScreen from '../screens/FinancialAnalysisScreen';
import HelpScreen from '../screens/HelpScreen';
import InventoryScreenNew from '../screens/InventoryScreenNew';
import AddItemScreen from '../screens/AddItemScreen';
import EditItemScreen from '../screens/EditItemScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import StockInScreen from '../screens/StockInScreen';
import StockOutScreen from '../screens/StockOutScreen';
import ExpiringBatchesScreen from '../screens/ExpiringBatchesScreen';
import BarcodeLabelScreen from '../screens/BarcodeLabelScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
    </Stack.Navigator>
  );
}

function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InventoryMain" component={InventoryScreenNew} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="StockIn" component={StockInScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="StockOut" component={StockOutScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="ExpiringBatches" component={ExpiringBatchesScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="AddItem" component={AddItemScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="EditItem" component={EditItemScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="BarcodeLabel" component={BarcodeLabelScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}

function ManagementStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManagementMain" component={ManagementScreen} />
      <Stack.Screen name="FinancialAnalysis" component={FinancialAnalysisScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}

function HomeTabIcon({ focused }) {
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const load = async () => { try { setUnreadCount(await getUnreadCount()); } catch(e) {} };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ alignItems: 'center', position: 'relative' }}>
      <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? Colors.primary : Colors.tabInactive} />
      {unreadCount > 0 && (
        <View style={{ position: 'absolute', top: -4, right: -10, backgroundColor: Colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: Colors.white }}>
          <Text style={{ color: Colors.white, fontSize: 9, fontWeight: '700' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

function InventoryTabIcon({ focused }) {
  return <MaterialCommunityIcons name={focused ? 'package-variant' : 'package-variant-closed'} size={24} color={focused ? Colors.primary : Colors.tabInactive} />;
}

function ManagementTabIcon({ focused }) {
  return <MaterialCommunityIcons name={focused ? 'clipboard-text' : 'clipboard-text-outline'} size={24} color={focused ? Colors.primary : Colors.tabInactive} />;
}

export default function AppNavigator() {
  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.white,
            height: Platform.OS === 'android' ? 64 : 84,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'android' ? 10 : 28,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.tabInactive,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        }}
        initialRouteName="HomeTab"
      >
        <Tab.Screen name="HomeTab" component={HomeStack}
          options={{ tabBarLabel: 'Beranda', tabBarIcon: HomeTabIcon }} />
        <Tab.Screen name="Inventory" component={InventoryStack}
          options={{ tabBarLabel: 'Inventori', tabBarIcon: InventoryTabIcon }} />
        <Tab.Screen name="Management" component={ManagementStack}
          options={{ tabBarLabel: 'Riwayat', tabBarIcon: ManagementTabIcon }} />
      </Tab.Navigator>
      <Toast />
    </>
  );
}
