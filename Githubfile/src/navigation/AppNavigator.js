import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../styles/colors';
import { getUnreadCount } from '../database/queries/notifications';

// Existing screens
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ManagementScreen from '../screens/ManagementScreen';
import FinancialAnalysisScreen from '../screens/FinancialAnalysisScreen';

// Inventory screens
import InventoryScreenNew from '../screens/InventoryScreenNew';
import AddItemScreen from '../screens/AddItemScreen';
import EditItemScreen from '../screens/EditItemScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import StockInScreen from '../screens/StockInScreen';
import StockOutScreen from '../screens/StockOutScreen';
import ExpiringBatchesScreen from '../screens/ExpiringBatchesScreen';

// NEW: Barcode Label Screen
import BarcodeLabelScreen from '../screens/BarcodeLabelScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Home', headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}

// Inventory Stack
function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="InventoryMain" 
        component={InventoryScreenNew} 
        options={{ 
          title: 'Inventory',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ 
          title: 'Detail Produk',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="StockIn"
        component={StockInScreen}
        options={{ 
          title: 'Stok Masuk',
          headerShown: false,
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="StockOut"
        component={StockOutScreen}
        options={{ 
          title: 'Stok Keluar',
          headerShown: false,
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="ExpiringBatches"
        component={ExpiringBatchesScreen}
        options={{ 
          title: 'Batch Kadaluarsa',
          headerShown: false,
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="AddItem" 
        component={AddItemScreen}
        options={{ 
          title: 'Tambah Barang',
          headerShown: false,
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="EditItem" 
        component={EditItemScreen}
        options={{ 
          title: 'Edit Produk',
          headerShown: false,
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="BarcodeScanner" 
        component={BarcodeScannerScreen}
        options={{ 
          title: 'Scan Barcode',
          headerShown: false,
          presentation: 'fullScreenModal'
        }} 
      />
      {/* NEW: Barcode Label Screen */}
      <Stack.Screen 
        name="BarcodeLabel" 
        component={BarcodeLabelScreen}
        options={{ 
          title: 'Label Barcode',
          headerShown: false,
          presentation: 'card'
        }} 
      />
    </Stack.Navigator>
  );
}

// Management Stack
function ManagementStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ManagementMain" 
        component={ManagementScreen} 
        options={{ 
          title: 'Management',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="FinancialAnalysis"
        component={FinancialAnalysisScreen}
        options={{ 
          title: 'Analisis Keuangan',
          headerShown: false,
          presentation: 'card'
        }} 
      />
    </Stack.Navigator>
  );
}

// Modern Tab Icon Component
function TabIcon({ label, focused, badge }) {
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginTop: 4,
    }}>
      <View style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: focused ? Colors.primary : Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: focused ? Colors.primary : '#000',
        shadowOffset: { width: 0, height: focused ? 4 : 2 },
        shadowOpacity: focused ? 0.3 : 0.1,
        shadowRadius: focused ? 8 : 4,
        elevation: focused ? 6 : 2,
        transform: [{ scale: focused ? 1.05 : 1 }],
      }}>
        <Text style={{ 
          fontSize: 26,
          opacity: focused ? 1 : 0.7,
        }}>
          {label}
        </Text>
      </View>
      {badge > 0 && (
        <View style={{
          position: 'absolute',
          top: -2,
          right: -2,
          backgroundColor: Colors.danger,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 5,
          borderWidth: 2,
          borderColor: Colors.white,
          shadowColor: Colors.danger,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
          elevation: 4,
        }}>
          <Text style={{ 
            color: Colors.white, 
            fontSize: 11, 
            fontWeight: '700',
          }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
      {focused && (
        <View style={{
          position: 'absolute',
          bottom: -8,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: Colors.primary,
        }} />
      )}
    </View>
  );
}

// Home Tab Icon with notification badge
function HomeTabIcon({ focused }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return <TabIcon label="🏠" focused={focused} badge={unreadCount} />;
}

// Main App Navigator
export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: Colors.white,
          height: 76,
          paddingTop: 12,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarShowLabel: false,
      }}
      initialRouteName="HomeTab"
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => <HomeTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="🏬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Management"
        component={ManagementStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="📋" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
