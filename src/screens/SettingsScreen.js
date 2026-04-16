// Settings screen - Claude-Inspired with Data Management
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Switch, Alert, ActivityIndicator, StatusBar, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../styles/colors';
import {
  getAllTransactionsWithPricing,
  getTransactionStats,
} from '../database/queries/transactions';
import Toast from 'react-native-toast-message';

const STORAGE_KEYS = { BUSINESS_NAME: 'businessName', LOW_STOCK_ENABLED: 'lowStockEnabled', EXPIRY_ENABLED: 'expiryEnabled' };
const DEFAULTS = { BUSINESS_NAME: 'StockWise', LOW_STOCK_ENABLED: true, EXPIRY_ENABLED: true };

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState(DEFAULTS.BUSINESS_NAME);
  const [businessNameInput, setBusinessNameInput] = useState(DEFAULTS.BUSINESS_NAME);
  const [lowStockEnabled, setLowStockEnabled] = useState(DEFAULTS.LOW_STOCK_ENABLED);
  const [expiryEnabled, setExpiryEnabled] = useState(DEFAULTS.EXPIRY_ENABLED);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [savedName, savedLow, savedExp] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BUSINESS_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.LOW_STOCK_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.EXPIRY_ENABLED),
      ]);
      const name = savedName || DEFAULTS.BUSINESS_NAME;
      setBusinessName(name); setBusinessNameInput(name);
      setLowStockEnabled(savedLow !== 'false');
      setExpiryEnabled(savedExp !== 'false');
    } catch (e) { Alert.alert('Error', 'Gagal memuat pengaturan'); }
    finally { setLoading(false); }
  };

  const handleSaveBusinessName = async () => {
    const trimmed = businessNameInput.trim();
    if (!trimmed) { Alert.alert('Validasi', 'Nama usaha tidak boleh kosong'); return; }
    if (trimmed.length > 50) { Alert.alert('Validasi', 'Nama usaha maksimal 50 karakter'); return; }
    try {
      setSaving(true);
      await AsyncStorage.setItem(STORAGE_KEYS.BUSINESS_NAME, trimmed);
      setBusinessName(trimmed);
      Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Nama usaha berhasil disimpan' });
    } catch (e) { Alert.alert('Error', 'Gagal menyimpan nama usaha'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (key, value, setter) => {
    try { setter(value); await AsyncStorage.setItem(key, value.toString()); }
    catch (e) { Alert.alert('Error', 'Gagal menyimpan pengaturan'); setter(!value); }
  };

  const handleResetSettings = () => {
    Alert.alert('Reset Pengaturan', 'Kembalikan semua pengaturan ke default?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        try {
          await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
          setBusinessName(DEFAULTS.BUSINESS_NAME); setBusinessNameInput(DEFAULTS.BUSINESS_NAME);
          setLowStockEnabled(DEFAULTS.LOW_STOCK_ENABLED); setExpiryEnabled(DEFAULTS.EXPIRY_ENABLED);
          Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Pengaturan berhasil direset' });
        } catch (e) { Alert.alert('Error', 'Gagal mereset pengaturan'); }
      }},
    ]);
  };

  // ── Format helpers (moved from ManagementScreen) ──
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return `Hari ini, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Kemarin, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // ── Export handlers (moved from ManagementScreen) ──
  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const bName = await AsyncStorage.getItem('businessName') || 'StockWise';
      const RNFS = require('react-native-fs');
      const transactions = await getAllTransactionsWithPricing();
      const stats = await getTransactionStats();

      let csvContent = 'Tanggal,Produk,Tipe,Jumlah,Unit,Saldo,Catatan\n';
      transactions.forEach(t => {
        const date = formatDate(t.transaction_date);
        const type = t.type === 'IN' ? 'MASUK' : 'KELUAR';
        const notes = (t.notes || '').replace(/,/g, ';');
        csvContent += `${date},${t.product_name},${type},${t.quantity},${t.unit},${t.balance_after},"${notes}"\n`;
      });

      const fileName = `${bName}_Transaksi_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, csvContent, 'utf8');

      Alert.alert(
        'Export CSV Berhasil!',
        `File berhasil disimpan:\n${fileName}\n\n📁 Lokasi:\nAndroid/data/com.stockwisemobile/files\n\nBuka dengan File Manager untuk melihat file.`,
        [{ text: 'OK' }]
      );
      setShowExportModal(false);
    } catch (error) {
      Alert.alert('Gagal Export', `Error: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const bName = await AsyncStorage.getItem('businessName') || 'StockWise';
      const RNFS = require('react-native-fs');
      const transactions = await getAllTransactionsWithPricing();
      const stats = await getTransactionStats();

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bName} Laporan</title>
  <style>
    @media print { @page { margin: 1.5cm; size: A4; } .no-print { display: none !important; } }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; background: white; }
    h1 { color: #DA7756; text-align: center; margin-bottom: 5px; font-size: 28px; }
    .subtitle { text-align: center; color: #807A6E; margin-bottom: 30px; font-size: 14px; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; gap: 15px; }
    .stat-box { text-align: center; padding: 15px; background: #FAF7F2; border-radius: 8px; flex: 1; border: 1px solid #E8E2D9; }
    .stat-label { font-size: 12px; color: #807A6E; margin-bottom: 8px; }
    .stat-value { font-size: 24px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #DA7756; color: white; padding: 12px 8px; text-align: left; font-size: 11px; font-weight: 600; }
    td { padding: 10px 8px; border-bottom: 1px solid #E8E2D9; font-size: 10px; }
    tr:hover { background: #FAF9F7; }
    .stock-in { color: #5D9E6F; font-weight: bold; }
    .stock-out { color: #C4534A; font-weight: bold; }
    .footer { margin-top: 30px; text-align: center; color: #807A6E; font-size: 10px; border-top: 1px solid #E8E2D9; padding-top: 20px; }
    .no-print { text-align: center; margin: 30px 0; padding: 20px; background: #FBF0DD; border-radius: 8px; border: 2px dashed #C4873B; }
    .no-print h2 { color: #C4873B; margin-bottom: 15px; font-size: 18px; }
    .no-print ol { text-align: left; max-width: 500px; margin: 0 auto; line-height: 1.8; }
    .no-print strong { color: #92400E; }
    .no-print p { margin-top: 10px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>${bName} - Laporan Transaksi</h1>
  <div class="subtitle">Riwayat Stok Masuk & Keluar</div>
  <div class="stats">
    <div class="stat-box"><div class="stat-label">Total Stok Masuk</div><div class="stat-value" style="color: #5D9E6F;">${stats.totalIn}</div></div>
    <div class="stat-box"><div class="stat-label">Total Stok Keluar</div><div class="stat-value" style="color: #C4534A;">${stats.totalOut}</div></div>
  </div>
  <table>
    <thead><tr>
      <th style="width: 15%;">Tanggal</th><th style="width: 25%;">Produk</th><th style="width: 10%;">Tipe</th>
      <th style="width: 12%;">Jumlah</th><th style="width: 12%;">Saldo</th><th style="width: 26%;">Catatan</th>
    </tr></thead>
    <tbody>
${transactions.map(t => {
  const date = formatDate(t.transaction_date).substring(0, 16);
  const type = t.type === 'IN' ? 'MASUK' : 'KELUAR';
  const typeClass = t.type === 'IN' ? 'stock-in' : 'stock-out';
  const notes = (t.notes || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 50);
  return `      <tr><td>${date}</td><td><strong>${t.product_name}</strong></td><td class="${typeClass}">${type}</td><td class="${typeClass}">${t.quantity} ${t.unit}</td><td>${t.balance_after} ${t.unit}</td><td>${notes}</td></tr>`;
}).join('\n')}
    </tbody>
  </table>
  <div class="footer">
    <p><strong>Generated by ${bName}</strong></p>
    <p>${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <p>Total Transaksi: ${transactions.length}</p>
  </div>
  <div class="no-print">
    <h2>Cara Convert ke PDF:</h2>
    <ol>
      <li>Buka <strong>File Manager</strong> di HP Anda</li>
      <li>Masuk ke folder: <strong>Android/data/com.stockwisemobile/files</strong></li>
      <li>Cari file <strong>${`${bName}_Laporan_${new Date().toISOString().split('T')[0]}.html`}</strong></li>
      <li>Tap file → Pilih <strong>Browser</strong> untuk membuka</li>
      <li>Di browser, tap <strong>⋮</strong> (menu) → <strong>Print</strong></li>
      <li>Pilih <strong>"Save as PDF"</strong></li>
      <li>Tap <strong>Save</strong> - Selesai!</li>
    </ol>
    <p><strong>Tip:</strong> File HTML ini sudah siap untuk di-print dari browser apapun!</p>
  </div>
</body>
</html>`;

      const fileName = `${bName}_Laporan_${new Date().toISOString().split('T')[0]}.html`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, html, 'utf8');

      Alert.alert(
        'Laporan HTML Berhasil Dibuat!',
        `File berhasil disimpan:\n${fileName}\n\n📁 Cara membuka:\n1. Buka File Manager\n2. Masuk ke: Android/data/com.stockwisemobile/files\n3. Tap file ${fileName}\n4. Pilih browser untuk membuka\n5. Di browser: Menu → Print → Save as PDF\n\nFile siap di-convert ke PDF!`,
        [{ text: 'OK' }]
      );
      setShowExportModal(false);
    } catch (error) {
      Alert.alert('Gagal Export Laporan', `Error: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // ── Backup handlers (moved from ManagementScreen) ──
  const handleBackupDatabase = async () => {
    try {
      const RNFS = require('react-native-fs');
      const possiblePaths = [
        `${RNFS.DocumentDirectoryPath}/SQLite/stockwise.db`,
        `${RNFS.DocumentDirectoryPath}/stockwise.db`,
        `${RNFS.DocumentDirectoryPath}/../databases/stockwise.db`,
        `${RNFS.LibraryDirectoryPath}/LocalDatabase/stockwise.db`,
      ];
      const backupFileName = `StockWise_Backup_${new Date().toISOString().split('T')[0]}.db`;
      const backupPath = `${RNFS.DocumentDirectoryPath}/${backupFileName}`;

      let foundPath = null;
      for (const path of possiblePaths) {
        const exists = await RNFS.exists(path);
        if (exists) { foundPath = path; break; }
      }

      if (!foundPath) {
        Alert.alert('Database Tidak Ditemukan', 'Tidak dapat menemukan database.\n\nCoba tambahkan beberapa transaksi terlebih dahulu.', [{ text: 'OK' }]);
        return;
      }

      await RNFS.copyFile(foundPath, backupPath);
      Alert.alert(
        'Backup Berhasil!',
        `Database berhasil di-backup:\n${backupFileName}\n\n📁 Lokasi:\nAndroid/data/com.stockwisemobile/files\n\nBuka dengan File Manager untuk mengakses file backup.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Gagal Backup', `Error: ${error.message}`);
    }
  };

  const handleRestoreDatabase = async () => {
    try {
      const RNFS = require('react-native-fs');
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      const backupFiles = files.filter(file => file.name.endsWith('.db') && file.name.includes('Backup'));

      if (backupFiles.length === 0) {
        Alert.alert('Tidak Ada Backup', 'Belum ada file backup yang tersedia.\n\nSilakan buat backup terlebih dahulu.', [{ text: 'OK' }]);
        return;
      }

      backupFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      const options = backupFiles.map(file => {
        const date = new Date(file.mtime);
        const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return { text: `${file.name}\n${dateStr}`, onPress: () => performRestore(file.path, file.name) };
      });
      options.push({ text: 'Batal', style: 'cancel' });

      Alert.alert('Pilih Backup untuk Restore', `${backupFiles.length} file backup ditemukan.\n\nPERINGATAN: Data saat ini akan diganti!`, options, { cancelable: true });
    } catch (error) {
      Alert.alert('Gagal Membaca Backup', `Error: ${error.message}`);
    }
  };

  const performRestore = async (backupPath, backupName) => {
    Alert.alert(
      'Konfirmasi Restore',
      `Restore dari:\n${backupName}\n\nSEMUA DATA SAAT INI AKAN HILANG!\n\nAnda yakin ingin melanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Restore', style: 'destructive',
          onPress: async () => {
            try {
              const RNFS = require('react-native-fs');
              const SQLite = require('react-native-sqlite-storage');
              const db = await SQLite.openDatabase({ name: 'stockwise.db', location: 'default' });
              await db.close();

              const possiblePaths = [
                `${RNFS.DocumentDirectoryPath}/SQLite/stockwise.db`,
                `${RNFS.DocumentDirectoryPath}/stockwise.db`,
                `${RNFS.DocumentDirectoryPath}/../databases/stockwise.db`,
              ];
              let currentDbPath = null;
              for (const path of possiblePaths) {
                const exists = await RNFS.exists(path);
                if (exists) { currentDbPath = path; break; }
              }
              if (!currentDbPath) { Alert.alert('Error', 'Database saat ini tidak ditemukan'); return; }

              await RNFS.copyFile(backupPath, currentDbPath);
              Alert.alert(
                'Restore Berhasil!',
                `Database berhasil di-restore dari:\n${backupName}\n\n🔄 Aplikasi akan restart untuk memuat data baru.`,
                [{ text: 'Restart Sekarang', onPress: () => {
                  navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                }}]
              );
            } catch (error) {
              Alert.alert('Gagal Restore', `Error: ${error.message}\n\nSilakan coba lagi atau hubungi support.`);
            }
          }
        }
      ]
    );
  };

  if (loading) return (
    <SafeAreaView style={s.safe}><View style={s.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={s.loadingText}>Memuat Pengaturan...</Text>
    </View></SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pengaturan</Text>
        <View style={{width:40}} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Business Info */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="store-outline" size={18} color={Colors.textSecondary} />
            <Text style={s.sectionLabel}>Informasi Usaha</Text>
          </View>
          <View style={s.card}>
            <Text style={s.inputLabel}>Nama Usaha</Text>
            <TextInput style={s.input} value={businessNameInput} onChangeText={setBusinessNameInput}
              placeholder="Nama usaha Anda" placeholderTextColor={Colors.textLight} maxLength={50} />
            <Text style={s.helper}>Digunakan dalam laporan dan ekspor data</Text>
            <TouchableOpacity style={[s.saveBtn, saving && {opacity:0.6}]} onPress={handleSaveBusinessName} disabled={saving} activeOpacity={0.7}>
              {saving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={s.saveBtnText}>Simpan</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="bell-outline" size={18} color={Colors.textSecondary} />
            <Text style={s.sectionLabel}>Notifikasi</Text>
          </View>
          <View style={s.card}>
            <View style={s.toggleRow}>
              <View style={{flex:1,marginRight:16}}>
                <Text style={s.toggleTitle}>Notifikasi Stok Rendah</Text>
                <Text style={s.toggleDesc}>Peringatan untuk produk di bawah minimum</Text>
              </View>
              <Switch value={lowStockEnabled} onValueChange={v => handleToggle(STORAGE_KEYS.LOW_STOCK_ENABLED, v, setLowStockEnabled)}
                trackColor={{false:Colors.border, true:Colors.primary}} thumbColor={Colors.white} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <View style={{flex:1,marginRight:16}}>
                <Text style={s.toggleTitle}>Notifikasi Kadaluarsa</Text>
                <Text style={s.toggleDesc}>Peringatan untuk produk akan kadaluarsa</Text>
              </View>
              <Switch value={expiryEnabled} onValueChange={v => handleToggle(STORAGE_KEYS.EXPIRY_ENABLED, v, setExpiryEnabled)}
                trackColor={{false:Colors.border, true:Colors.primary}} thumbColor={Colors.white} />
            </View>
          </View>
        </View>

        {/* Data Management - NEW */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="database-cog-outline" size={18} color={Colors.primary} />
            <Text style={[s.sectionLabel, { color: Colors.primary }]}>Data Management</Text>
          </View>
          <View style={s.card}>
            {/* Export */}
            <TouchableOpacity style={s.dataRow} onPress={() => setShowExportModal(true)} activeOpacity={0.7}>
              <View style={[s.dataIcon, { backgroundColor: Colors.primaryLight }]}>
                <MaterialCommunityIcons name="file-export-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{flex:1}}>
                <Text style={s.toggleTitle}>Export Data</Text>
                <Text style={s.toggleDesc}>Download transaksi (CSV / Laporan HTML)</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <View style={s.divider} />

            {/* Backup */}
            <TouchableOpacity style={s.dataRow} onPress={handleBackupDatabase} activeOpacity={0.7}>
              <View style={[s.dataIcon, { backgroundColor: Colors.successLight }]}>
                <MaterialCommunityIcons name="content-save-outline" size={20} color={Colors.success} />
              </View>
              <View style={{flex:1}}>
                <Text style={s.toggleTitle}>Backup Database</Text>
                <Text style={s.toggleDesc}>Simpan salinan database saat ini</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <View style={s.divider} />

            {/* Restore */}
            <TouchableOpacity style={s.dataRow} onPress={handleRestoreDatabase} activeOpacity={0.7}>
              <View style={[s.dataIcon, { backgroundColor: Colors.warningLight }]}>
                <MaterialCommunityIcons name="backup-restore" size={20} color={Colors.warning} />
              </View>
              <View style={{flex:1}}>
                <Text style={s.toggleTitle}>Restore Database</Text>
                <Text style={s.toggleDesc}>Pulihkan dari file backup sebelumnya</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="information-outline" size={18} color={Colors.textSecondary} />
            <Text style={s.sectionLabel}>Informasi Aplikasi</Text>
          </View>
          <View style={s.card}>
            {[['Versi Aplikasi','1.0.0'],['Developer','StockWise Team'],['Database','SQLite (Offline-first)']].map(([label,value], i) => (
              <View key={label}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.infoRow}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue}>{value}</Text></View>
              </View>
            ))}
          </View>
        </View>

        {/* Help */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="help-circle-outline" size={18} color={Colors.textSecondary} />
            <Text style={s.sectionLabel}>Bantuan</Text>
          </View>
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Help')} activeOpacity={0.7}>
            <View style={s.helpRow}>
              <View style={s.helpIcon}><MaterialCommunityIcons name="book-open-variant" size={22} color={Colors.primary} /></View>
              <View style={{flex:1}}><Text style={s.toggleTitle}>Bantuan & FAQ</Text><Text style={s.toggleDesc}>Panduan lengkap dan pertanyaan umum</Text></View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="alert-outline" size={18} color={Colors.danger} />
            <Text style={[s.sectionLabel, {color:Colors.danger}]}>Zona Berbahaya</Text>
          </View>
          <View style={s.card}>
            <View style={{alignItems:'center'}}>
              <Text style={{fontSize:14,fontWeight:'600',color:Colors.danger,marginBottom:6}}>Reset Pengaturan</Text>
              <Text style={{fontSize:13,color:Colors.textSecondary,textAlign:'center',marginBottom:16}}>Kembalikan semua pengaturan ke default</Text>
              <TouchableOpacity style={s.dangerBtn} onPress={handleResetSettings} activeOpacity={0.7}>
                <MaterialCommunityIcons name="refresh" size={16} color={Colors.white} />
                <Text style={s.dangerBtnText}>Reset Semua</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={{height:40}} />
      </ScrollView>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowExportModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Export Data</Text>
              <Text style={s.modalSubtitle}>Pilih format export yang diinginkan</Text>

              <TouchableOpacity style={s.modalButton} onPress={handleExportExcel} disabled={exportLoading} activeOpacity={0.7}>
                <View style={[s.modalBtnIcon, { backgroundColor: Colors.successLight }]}>
                  <MaterialCommunityIcons name="file-delimited-outline" size={22} color={Colors.success} />
                </View>
                <View style={{flex:1}}>
                  <Text style={s.modalBtnTitle}>Export ke CSV</Text>
                  <Text style={s.modalBtnSub}>File CSV bisa dibuka di Excel</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={s.modalButton} onPress={handleExportPDF} disabled={exportLoading} activeOpacity={0.7}>
                <View style={[s.modalBtnIcon, { backgroundColor: Colors.primaryLight }]}>
                  <MaterialCommunityIcons name="file-document-outline" size={22} color={Colors.primary} />
                </View>
                <View style={{flex:1}}>
                  <Text style={s.modalBtnTitle}>Export ke Laporan HTML</Text>
                  <Text style={s.modalBtnSub}>File HTML → Print to PDF di browser</Text>
                </View>
              </TouchableOpacity>

              {exportLoading && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 6 }}>Mengexport data...</Text>
                </View>
              )}

              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowExportModal(false)} disabled={exportLoading}>
                <Text style={s.modalCancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.bg},
  loadingContainer:{flex:1,justifyContent:'center',alignItems:'center'},
  loadingText:{marginTop:16,fontSize:14,color:Colors.textSecondary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:Colors.bg,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontSize:18,fontWeight:'700',color:Colors.textDark},
  scroll:{flex:1}, content:{padding:20},
  section:{marginBottom:20},
  sectionHead:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:10,paddingHorizontal:4},
  sectionLabel:{fontSize:13,fontWeight:'600',color:Colors.textSecondary,textTransform:'uppercase',letterSpacing:0.5},
  card:{backgroundColor:Colors.white,borderRadius:14,padding:16,borderWidth:1,borderColor:Colors.cardBorder},
  inputLabel:{fontSize:13,fontWeight:'600',color:Colors.textDark,marginBottom:8},
  input:{backgroundColor:Colors.inputBg,borderRadius:10,padding:12,fontSize:15,color:Colors.textDark,borderWidth:1,borderColor:Colors.inputBorder},
  helper:{fontSize:11,color:Colors.textLight,marginTop:6,marginBottom:14},
  saveBtn:{backgroundColor:Colors.primary,borderRadius:10,padding:14,alignItems:'center'},
  saveBtnText:{fontSize:15,fontWeight:'600',color:Colors.white},
  toggleRow:{flexDirection:'row',alignItems:'center',paddingVertical:8},
  toggleTitle:{fontSize:15,fontWeight:'600',color:Colors.textDark,marginBottom:2},
  toggleDesc:{fontSize:12,color:Colors.textSecondary,lineHeight:17},
  divider:{height:1,backgroundColor:Colors.divider,marginVertical:10},
  infoRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10},
  infoLabel:{fontSize:14,color:Colors.textSecondary}, infoValue:{fontSize:14,fontWeight:'600',color:Colors.textDark},
  helpRow:{flexDirection:'row',alignItems:'center',gap:12},
  helpIcon:{width:44,height:44,borderRadius:12,backgroundColor:Colors.primaryLight,alignItems:'center',justifyContent:'center'},
  dangerBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:Colors.danger,borderRadius:10,paddingVertical:12,paddingHorizontal:20},
  dangerBtnText:{fontSize:14,fontWeight:'600',color:Colors.white},

  // Data Management
  dataRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:8},
  dataIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},

  // Export Modal
  modalOverlay:{flex:1,backgroundColor:'rgba(45, 43, 40, 0.5)',justifyContent:'center',alignItems:'center',padding:20},
  modalContent:{backgroundColor:Colors.white,borderRadius:18,padding:24,width:'100%',maxWidth:400},
  modalTitle:{fontSize:20,fontWeight:'700',color:Colors.textDark,marginBottom:4},
  modalSubtitle:{fontSize:13,color:Colors.textLight,marginBottom:20},
  modalButton:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.bg,borderRadius:14,padding:16,marginBottom:10,gap:14,borderWidth:1,borderColor:Colors.cardBorder},
  modalBtnIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},
  modalBtnTitle:{fontSize:15,fontWeight:'600',color:Colors.textDark,marginBottom:2},
  modalBtnSub:{fontSize:12,color:Colors.textLight},
  modalCancelBtn:{marginTop:8,paddingVertical:14,alignItems:'center'},
  modalCancelText:{fontSize:15,fontWeight:'600',color:Colors.textLight},
});
