/**
 * Business Settings & Backup/Restore Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import Colors from '../styles/colors';
import { getAllSettings, setSetting } from '../database/queries/businessSettings';

let RNFS = null;
let DocumentPicker = null;
try { RNFS = require('react-native-fs'); } catch (e) {}
try { DocumentPicker = require('react-native-document-picker').default; } catch (e) {}

export default function BusinessSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    business_name: '', currency: 'Rp', address: '', phone: '', tax_rate: '0',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const s = await getAllSettings();
      setSettings(s);
    } catch (e) {
      Alert.alert('Error', 'Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      for (const [key, value] of Object.entries(settings)) {
        await setSetting(key, value);
      }
      Toast.show({ type: 'success', text1: 'Pengaturan disimpan' });
    } catch (e) {
      Alert.alert('Error', 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!RNFS) {
      Alert.alert('Info', 'react-native-fs belum terpasang. Silakan install terlebih dahulu.');
      return;
    }
    try {
      const dbPath = RNFS.DocumentDirectoryPath + '/stockwise.db';
      const today = new Date().toISOString().slice(0, 10);
      const destPath = RNFS.DownloadDirectoryPath + `/StockWise_Backup_${today}.db`;
      const exists = await RNFS.exists(dbPath);
      if (!exists) { Alert.alert('Error', 'File database tidak ditemukan'); return; }
      await RNFS.copyFile(dbPath, destPath);
      Toast.show({ type: 'success', text1: 'Backup disimpan', text2: destPath });
      await Share.share({ message: `Backup StockWise: ${destPath}`, url: `file://${destPath}` });
    } catch (e) {
      Alert.alert('Error', e.message || 'Gagal backup database');
    }
  };

  const handleRestore = async () => {
    if (!RNFS || !DocumentPicker) {
      Alert.alert('Info', 'Fitur ini membutuhkan react-native-fs dan react-native-document-picker.');
      return;
    }
    Alert.alert(
      'Pulihkan Data',
      'Semua data saat ini akan DIGANTIKAN oleh file backup. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Pulihkan', style: 'destructive', onPress: async () => {
          try {
            const result = await DocumentPicker.pickSingle({ type: DocumentPicker.types.allFiles });
            const dbPath = RNFS.DocumentDirectoryPath + '/stockwise.db';
            await RNFS.copyFile(result.uri, dbPath);
            Toast.show({ type: 'success', text1: 'Data dipulihkan', text2: 'Restart aplikasi untuk memuat ulang' });
          } catch (e) {
            if (!DocumentPicker.isCancel(e)) Alert.alert('Error', e.message);
          }
        }},
      ]
    );
  };

  const Field = ({ label, field, placeholder, keyboardType, icon }) => (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <MaterialCommunityIcons name={icon || 'pencil-outline'} size={16} color={Colors.textSecondary} />
        <Text style={styles.labelText}>{label}</Text>
      </View>
      <TextInput
        style={styles.input}
        value={settings[field]}
        onChangeText={v => setSettings(prev => ({ ...prev, [field]: v }))}
        placeholder={placeholder || label}
        placeholderTextColor={Colors.textLight}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );

  if (loading) return (
    <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} /></SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Usaha</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informasi Usaha</Text>
          <Field label="Nama Usaha" field="business_name" placeholder="Toko Saya" icon="store-outline" />
          <Field label="Alamat" field="address" placeholder="Alamat toko" icon="map-marker-outline" />
          <Field label="No. Telepon" field="phone" placeholder="08xx" keyboardType="phone-pad" icon="phone-outline" />
          <Field label="Mata Uang" field="currency" placeholder="Rp" icon="currency-usd" />
          <Field label="Tarif Pajak %" field="tax_rate" placeholder="0" keyboardType="numeric" icon="percent" />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <MaterialCommunityIcons name="content-save-outline" size={20} color={Colors.white} />
          <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</Text>
        </TouchableOpacity>

        {/* Backup & Restore */}
        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.cardTitle}>Backup & Pulihkan</Text>

          <TouchableOpacity style={styles.backupBtn} onPress={handleBackup}>
            <MaterialCommunityIcons name="cloud-download-outline" size={22} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.backupBtnTitle}>Backup Data</Text>
              <Text style={styles.backupBtnSub}>Simpan database ke folder Downloads</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.backupBtn} onPress={handleRestore}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={22} color={Colors.warning} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.backupBtnTitle}>Pulihkan Data</Text>
              <Text style={styles.backupBtnSub}>Ganti database dari file backup</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.textDark },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 16 },
  field: { marginBottom: 14 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  labelText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textDark, backgroundColor: Colors.bg },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  backupBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backupBtnTitle: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  backupBtnSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 4 },
});
