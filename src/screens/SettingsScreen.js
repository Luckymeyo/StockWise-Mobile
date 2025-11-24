/**
 * Settings Screen - StockWise Mobile
 * Business settings, notifications, app info, and reset functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../styles/colors';

// AsyncStorage Keys
const STORAGE_KEYS = {
  BUSINESS_NAME: 'businessName',
  LOW_STOCK_ENABLED: 'lowStockEnabled',
  EXPIRY_ENABLED: 'expiryEnabled',
};

// Default Values
const DEFAULTS = {
  BUSINESS_NAME: 'StockWise',
  LOW_STOCK_ENABLED: true,
  EXPIRY_ENABLED: true,
};

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Business Information
  const [businessName, setBusinessName] = useState(DEFAULTS.BUSINESS_NAME);
  const [businessNameInput, setBusinessNameInput] = useState(DEFAULTS.BUSINESS_NAME);
  
  // Notification Settings
  const [lowStockEnabled, setLowStockEnabled] = useState(DEFAULTS.LOW_STOCK_ENABLED);
  const [expiryEnabled, setExpiryEnabled] = useState(DEFAULTS.EXPIRY_ENABLED);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load all settings
      const [savedBusinessName, savedLowStock, savedExpiry] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BUSINESS_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.LOW_STOCK_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.EXPIRY_ENABLED),
      ]);

      // Set business name
      const name = savedBusinessName || DEFAULTS.BUSINESS_NAME;
      setBusinessName(name);
      setBusinessNameInput(name);

      // Set notification toggles (AsyncStorage stores strings)
      setLowStockEnabled(savedLowStock !== 'false');
      setExpiryEnabled(savedExpiry !== 'false');
      
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusinessName = async () => {
    try {
      // Validate
      const trimmedName = businessNameInput.trim();
      if (!trimmedName) {
        Alert.alert('Validasi', 'Nama usaha tidak boleh kosong');
        return;
      }

      if (trimmedName.length > 50) {
        Alert.alert('Validasi', 'Nama usaha maksimal 50 karakter');
        return;
      }

      setSaving(true);
      await AsyncStorage.setItem(STORAGE_KEYS.BUSINESS_NAME, trimmedName);
      setBusinessName(trimmedName);
      
      Alert.alert('Berhasil', 'Nama usaha berhasil disimpan');
    } catch (error) {
      console.error('Error saving business name:', error);
      Alert.alert('Error', 'Gagal menyimpan nama usaha');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLowStock = async (value) => {
    try {
      setLowStockEnabled(value);
      await AsyncStorage.setItem(STORAGE_KEYS.LOW_STOCK_ENABLED, value.toString());
    } catch (error) {
      console.error('Error saving low stock setting:', error);
      Alert.alert('Error', 'Gagal menyimpan pengaturan');
      // Revert on error
      setLowStockEnabled(!value);
    }
  };

  const handleToggleExpiry = async (value) => {
    try {
      setExpiryEnabled(value);
      await AsyncStorage.setItem(STORAGE_KEYS.EXPIRY_ENABLED, value.toString());
    } catch (error) {
      console.error('Error saving expiry setting:', error);
      Alert.alert('Error', 'Gagal menyimpan pengaturan');
      // Revert on error
      setExpiryEnabled(!value);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Pengaturan',
      'Kembalikan semua pengaturan ke default?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all settings
              await AsyncStorage.multiRemove([
                STORAGE_KEYS.BUSINESS_NAME,
                STORAGE_KEYS.LOW_STOCK_ENABLED,
                STORAGE_KEYS.EXPIRY_ENABLED,
              ]);

              // Reset to defaults
              setBusinessName(DEFAULTS.BUSINESS_NAME);
              setBusinessNameInput(DEFAULTS.BUSINESS_NAME);
              setLowStockEnabled(DEFAULTS.LOW_STOCK_ENABLED);
              setExpiryEnabled(DEFAULTS.EXPIRY_ENABLED);

              Alert.alert('Berhasil', 'Pengaturan berhasil direset');
            } catch (error) {
              console.error('Error resetting settings:', error);
              Alert.alert('Error', 'Gagal mereset pengaturan');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat Pengaturan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Business Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🏪</Text>
            <Text style={styles.sectionTitle}>Informasi Usaha</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nama Usaha</Text>
              <TextInput
                style={styles.input}
                value={businessNameInput}
                onChangeText={setBusinessNameInput}
                placeholder="Nama usaha Anda"
                placeholderTextColor={Colors.textLight}
                maxLength={50}
              />
              <Text style={styles.helperText}>
                Digunakan dalam laporan dan ekspor data
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveBusinessName}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔔</Text>
            <Text style={styles.sectionTitle}>Pengaturan Notifikasi</Text>
          </View>
          
          <View style={styles.card}>
            {/* Low Stock Alerts */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingTitle}>Notifikasi Stok Rendah</Text>
                <Text style={styles.settingDescription}>
                  Tampilkan peringatan untuk produk dengan stok di bawah minimum
                </Text>
              </View>
              <Switch
                value={lowStockEnabled}
                onValueChange={handleToggleLowStock}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.border}
              />
            </View>

            <View style={styles.divider} />

            {/* Expiry Alerts */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingTitle}>Notifikasi Kadaluarsa</Text>
                <Text style={styles.settingDescription}>
                  Tampilkan peringatan untuk produk yang akan kadaluarsa
                </Text>
              </View>
              <Switch
                value={expiryEnabled}
                onValueChange={handleToggleExpiry}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.border}
              />
            </View>
          </View>
        </View>

        {/* App Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>ℹ️</Text>
            <Text style={styles.sectionTitle}>Informasi Aplikasi</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Versi Aplikasi</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Developer</Text>
              <Text style={styles.infoValue}>StockWise Team</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Database</Text>
              <Text style={styles.infoValue}>SQLite (Offline-first)</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>⚠️</Text>
            <Text style={styles.sectionTitle}>Zona Berbahaya</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.dangerContainer}>
              <Text style={styles.dangerTitle}>Reset Pengaturan</Text>
              <Text style={styles.dangerDescription}>
                Kembalikan semua pengaturan ke nilai default
              </Text>
              
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleResetSettings}
                activeOpacity={0.7}
              >
                <Text style={styles.dangerButtonText}>Reset Semua Pengaturan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Business Information
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },

  // Settings Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Info Item
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 8,
  },

  // Danger Zone
  dangerContainer: {
    alignItems: 'center',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.danger,
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 40,
  },
});
