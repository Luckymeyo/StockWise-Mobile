/**
 * Management Screen (Transaction History)
 * Complete transaction log with filters and details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../styles/colors';
import {
  getAllTransactions,
  getTransactionStats,
  getAllTransactionsWithPricing,
  getFinancialStats,
} from '../database/queries/transactions';

export default function ManagementScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, todayIn: 0, todayOut: 0 });
  const [financialStats, setFinancialStats] = useState({ 
    totalRevenue: 0, 
    totalProfit: 0, 
    todayRevenue: 0, 
    todayProfit: 0 
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, IN, OUT
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH
  const [sortOrder, setSortOrder] = useState('DESC'); // DESC (newest first), ASC (oldest first)
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  // Export & Backup modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Load data on mount and when screen comes into focus
  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [allTransactions, transactionStats, financial] = await Promise.all([
        getAllTransactionsWithPricing(),
        getTransactionStats(),
        getFinancialStats(),
      ]);

      setTransactions(allTransactions);
      setStats(transactionStats);
      setFinancialStats(financial);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter transactions based on selected filter, date range, and search query
  const filteredTransactions = transactions
    .filter((t) => {
      // Filter by type
      const matchesFilter = filter === 'ALL' || t.type === filter;
      
      // Filter by search query (product name)
      const matchesSearch = searchQuery.trim() === '' || 
        t.product_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by date range
      let matchesDate = true;
      if (dateFilter !== 'ALL') {
        const transactionDate = new Date(t.transaction_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        if (dateFilter === 'TODAY') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          matchesDate = transactionDate >= today && transactionDate < tomorrow;
        } else if (dateFilter === 'WEEK') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = transactionDate >= weekAgo;
        } else if (dateFilter === 'MONTH') {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          matchesDate = transactionDate >= monthAgo;
        }
      }
      
      return matchesFilter && matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      // Sort by transaction date
      const dateA = new Date(a.transaction_date);
      const dateB = new Date(b.transaction_date);
      
      if (sortOrder === 'DESC') {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filter, date filter, sort order, or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, dateFilter, sortOrder, searchQuery]);

  // Format date to Indonesian
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `Hari ini, ${hours}:${minutes}`;
    }

    // Check if yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `Kemarin, ${hours}:${minutes}`;
    }

    // Other dates
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Format number with thousand separator
  const formatNumber = (value) => {
    return parseFloat(value).toLocaleString('id-ID');
  };

  // Format currency in Indonesian Rupiah
  const formatCurrency = (value) => {
    return `Rp ${parseFloat(value).toLocaleString('id-ID', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    })}`;
  };

  // Get reason from notes (Stock OUT transactions have reason in notes)
  const parseReason = (notes, type) => {
    if (type !== 'OUT') return null;

    if (!notes) return { reason: 'Lainnya', icon: '📝', color: '#6B7280' };

    const reasonMap = {
      'Terjual': { icon: '💰', color: '#10B981' },
      'Rusak': { icon: '💔', color: '#F59E0B' },
      'Kadaluarsa': { icon: '⏰', color: '#EF4444' },
      'Hilang': { icon: '❓', color: '#6B7280' },
      'Lainnya': { icon: '📝', color: '#6B7280' },
    };

    // Extract reason from notes (format: "Reason - additional notes")
    const reasonMatch = notes.match(/^(Terjual|Rusak|Kadaluarsa|Hilang|Lainnya)/);
    const reasonKey = reasonMatch ? reasonMatch[1] : 'Lainnya';
    
    return {
      reason: reasonKey,
      ...reasonMap[reasonKey],
      additionalNotes: notes.replace(/^(Terjual|Rusak|Kadaluarsa|Hilang|Lainnya)\s*-?\s*/, ''),
    };
  };

  // Calculate profit for sale transactions
  const calculateProfit = (transaction) => {
    // Only calculate profit for "Terjual" (sold) transactions
    if (transaction.type !== 'OUT' || !transaction.notes || !transaction.notes.startsWith('Terjual')) {
      return null;
    }

    const revenue = transaction.quantity * (transaction.selling_price || 0);
    const cost = transaction.quantity * (transaction.purchase_price || 0);
    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

    return {
      revenue,
      cost,
      profit,
      profitMargin,
      isProfitable: profit >= 0,
    };
  };

  // Pagination helpers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      if (currentPage <= 3) {
        // Near start: 1 2 3 4 ... last
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end: 1 ... last-3 last-2 last-1 last
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Middle: 1 ... current-1 current current+1 ... last
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  // Export handlers
  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      
      // Load business name from settings
      const businessName = await AsyncStorage.getItem('businessName') || 'StockWise';
      
      const RNFS = require('react-native-fs');
      
      // Generate Excel file content (CSV format for simplicity)
      let csvContent = 'Tanggal,Produk,Tipe,Jumlah,Unit,Saldo,Catatan\n';
      
      transactions.forEach(t => {
        const date = formatDate(t.transaction_date);
        const type = t.type === 'IN' ? 'MASUK' : 'KELUAR';
        const notes = (t.notes || '').replace(/,/g, ';'); // Replace commas
        csvContent += `${date},${t.product_name},${type},${t.quantity},${t.unit},${t.balance_after},"${notes}"\n`;
      });
      
      // Save to internal storage
      const fileName = `${businessName}_Transaksi_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      
      console.log('💾 Saving CSV to:', filePath);
      
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      
      Alert.alert(
        '✅ Export CSV Berhasil!',
        `File berhasil disimpan:\n${fileName}\n\n` +
        `📁 Lokasi:\nAndroid/data/com.stockwisemobile/files\n\n` +
        `Buka dengan File Manager untuk melihat file.`,
        [{ text: 'OK' }]
      );
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        '❌ Gagal Export', 
        `Error: ${error.message}`
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      
      // Load business name from settings
      const businessName = await AsyncStorage.getItem('businessName') || 'StockWise';
      
      const RNFS = require('react-native-fs');
      
      // Create professional HTML report
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} Laporan</title>
  <style>
    @media print { 
      @page { 
        margin: 1.5cm; 
        size: A4;
      }
      .no-print { 
        display: none !important; 
      }
    }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      padding: 20px; 
      max-width: 900px; 
      margin: 0 auto;
      background: white;
    }
    h1 { 
      color: #2563EB; 
      text-align: center; 
      margin-bottom: 5px; 
      font-size: 28px;
    }
    .subtitle { 
      text-align: center; 
      color: #6B7280; 
      margin-bottom: 30px; 
      font-size: 14px; 
    }
    .stats { 
      display: flex; 
      justify-content: space-around; 
      margin: 20px 0;
      gap: 15px;
    }
    .stat-box { 
      text-align: center; 
      padding: 15px; 
      background: #F3F4F6; 
      border-radius: 8px; 
      flex: 1;
    }
    .stat-label { 
      font-size: 12px; 
      color: #6B7280; 
      margin-bottom: 8px; 
    }
    .stat-value { 
      font-size: 24px; 
      font-weight: bold; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th { 
      background: #2563EB; 
      color: white; 
      padding: 12px 8px; 
      text-align: left; 
      font-size: 11px;
      font-weight: 600;
    }
    td { 
      padding: 10px 8px; 
      border-bottom: 1px solid #E5E7EB; 
      font-size: 10px; 
    }
    tr:hover {
      background: #F9FAFB;
    }
    .stock-in { 
      color: #10B981; 
      font-weight: bold; 
    }
    .stock-out { 
      color: #EF4444; 
      font-weight: bold; 
    }
    .footer { 
      margin-top: 30px; 
      text-align: center; 
      color: #6B7280; 
      font-size: 10px; 
      border-top: 1px solid #E5E7EB; 
      padding-top: 20px; 
    }
    .no-print { 
      text-align: center; 
      margin: 30px 0;
      padding: 20px; 
      background: #FEF3C7; 
      border-radius: 8px;
      border: 2px dashed #F59E0B;
    }
    .no-print h2 {
      color: #D97706;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .no-print ol {
      text-align: left;
      max-width: 500px;
      margin: 0 auto;
      line-height: 1.8;
    }
    .no-print strong {
      color: #92400E;
    }
    .no-print p {
      margin-top: 10px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <h1>📊 ${businessName} - Laporan Transaksi</h1>
  <div class="subtitle">Riwayat Stok Masuk & Keluar</div>
  
  <div class="stats">
    <div class="stat-box">
      <div class="stat-label">Total Stok Masuk</div>
      <div class="stat-value" style="color: #10B981;">${stats.totalIn}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Total Stok Keluar</div>
      <div class="stat-value" style="color: #EF4444;">${stats.totalOut}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Tanggal</th>
        <th style="width: 25%;">Produk</th>
        <th style="width: 10%;">Tipe</th>
        <th style="width: 12%;">Jumlah</th>
        <th style="width: 12%;">Saldo</th>
        <th style="width: 26%;">Catatan</th>
      </tr>
    </thead>
    <tbody>
${transactions.map(t => {
  const date = formatDate(t.transaction_date).substring(0, 16);
  const type = t.type === 'IN' ? 'MASUK' : 'KELUAR';
  const typeClass = t.type === 'IN' ? 'stock-in' : 'stock-out';
  const notes = (t.notes || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 50);
  return `      <tr>
        <td>${date}</td>
        <td><strong>${t.product_name}</strong></td>
        <td class="${typeClass}">${type}</td>
        <td class="${typeClass}">${t.quantity} ${t.unit}</td>
        <td>${t.balance_after} ${t.unit}</td>
        <td>${notes}</td>
      </tr>`;
}).join('\n')}
    </tbody>
  </table>
  
  <div class="footer">
    <p><strong>Generated by ${businessName}</strong></p>
    <p>${new Date().toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
    <p>Total Transaksi: ${transactions.length}</p>
  </div>
  
  <div class="no-print">
    <h2>💡 Cara Convert ke PDF:</h2>
    <ol>
      <li>Buka <strong>File Manager</strong> di HP Anda</li>
      <li>Masuk ke folder: <strong>Android/data/com.stockwisemobile/files</strong></li>
      <li>Cari file <strong>${`${businessName}_Laporan_${new Date().toISOString().split('T')[0]}.html`}</strong></li>
      <li>Tap file → Pilih <strong>Browser</strong> untuk membuka</li>
      <li>Di browser, tap <strong>⋮</strong> (menu) → <strong>Print</strong></li>
      <li>Pilih <strong>"Save as PDF"</strong></li>
      <li>Tap <strong>Save</strong> - Selesai! 🎉</li>
    </ol>
    <p><strong>Tip:</strong> File HTML ini sudah siap untuk di-print dari browser apapun!</p>
  </div>
</body>
</html>`;
      
      const fileName = `${businessName}_Laporan_${new Date().toISOString().split('T')[0]}.html`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      
      await RNFS.writeFile(filePath, html, 'utf8');
      
      console.log('📄 HTML Report saved to:', filePath);
      
      Alert.alert(
        '✅ Laporan HTML Berhasil Dibuat!',
        `File berhasil disimpan:\n${fileName}\n\n` +
        `📁 Cara membuka:\n` +
        `1. Buka File Manager\n` +
        `2. Masuk ke: Android/data/com.stockwisemobile/files\n` +
        `3. Tap file ${fileName}\n` +
        `4. Pilih browser untuk membuka\n` +
        `5. Di browser: Menu → Print → Save as PDF\n\n` +
        `File siap di-convert ke PDF! 📄`,
        [{ text: 'OK' }]
      );
      
      setShowExportModal(false);
    } catch (error) {
      console.error('HTML Export error:', error);
      Alert.alert(
        '❌ Gagal Export Laporan',
        `Error: ${error.message}`
      );
    } finally {
      setExportLoading(false);
    }
  };

  // Backup handlers
  const handleBackupDatabase = async () => {
    try {
      const RNFS = require('react-native-fs');
      
      // Try multiple possible database paths
      const possiblePaths = [
        `${RNFS.DocumentDirectoryPath}/SQLite/stockwise.db`,
        `${RNFS.DocumentDirectoryPath}/stockwise.db`,
        `${RNFS.DocumentDirectoryPath}/../databases/stockwise.db`,
        `${RNFS.LibraryDirectoryPath}/LocalDatabase/stockwise.db`,
      ];
      
      const backupFileName = `StockWise_Backup_${new Date().toISOString().split('T')[0]}.db`;
      const backupPath = `${RNFS.DocumentDirectoryPath}/${backupFileName}`;
      
      console.log('🔍 Searching for database...');
      
      // Try to find the database
      let foundPath = null;
      for (const path of possiblePaths) {
        console.log('Checking:', path);
        const exists = await RNFS.exists(path);
        if (exists) {
          foundPath = path;
          console.log('✅ Found database at:', path);
          break;
        }
      }
      
      if (!foundPath) {
        Alert.alert(
          '❌ Database Tidak Ditemukan',
          `Tidak dapat menemukan database.\n\nCoba tambahkan beberapa transaksi terlebih dahulu.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Copy database to backup location
      await RNFS.copyFile(foundPath, backupPath);
      
      Alert.alert(
        '✅ Backup Berhasil!',
        `Database berhasil di-backup:\n${backupFileName}\n\n` +
        `📁 Lokasi:\nAndroid/data/com.stockwisemobile/files\n\n` +
        `Buka dengan File Manager untuk mengakses file backup.`,
        [{ text: 'OK' }]
      );
      
      setShowBackupModal(false);
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert(
        '❌ Gagal Backup',
        `Error: ${error.message}`
      );
    }
  };

  const handleRestoreDatabase = async () => {
    try {
      const RNFS = require('react-native-fs');
      
      // Get list of all .db files in the directory
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      const backupFiles = files.filter(file => 
        file.name.endsWith('.db') && file.name.includes('Backup')
      );
      
      if (backupFiles.length === 0) {
        Alert.alert(
          '📁 Tidak Ada Backup',
          'Belum ada file backup yang tersedia.\n\nSilakan buat backup terlebih dahulu.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Sort by date (newest first)
      backupFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Create selection options
      const options = backupFiles.map(file => {
        const date = new Date(file.mtime);
        const dateStr = date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return {
          text: `${file.name}\n${dateStr}`,
          onPress: () => performRestore(file.path, file.name)
        };
      });
      
      options.push({ text: 'Batal', style: 'cancel' });
      
      Alert.alert(
        '♻️ Pilih Backup untuk Restore',
        `${backupFiles.length} file backup ditemukan.\n\n⚠️ PERINGATAN: Data saat ini akan diganti!`,
        options,
        { cancelable: true }
      );
      
    } catch (error) {
      console.error('List backup error:', error);
      Alert.alert(
        '❌ Gagal Membaca Backup',
        `Error: ${error.message}`
      );
    }
  };

  const performRestore = async (backupPath, backupName) => {
    Alert.alert(
      '⚠️ Konfirmasi Restore',
      `Restore dari:\n${backupName}\n\n🚨 SEMUA DATA SAAT INI AKAN HILANG!\n\nAnda yakin ingin melanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              const RNFS = require('react-native-fs');
              const SQLite = require('react-native-sqlite-storage');
              
              // Close current database connection
              const db = await SQLite.openDatabase({ name: 'stockwise.db', location: 'default' });
              await db.close();
              
              // Find current database path
              const possiblePaths = [
                `${RNFS.DocumentDirectoryPath}/SQLite/stockwise.db`,
                `${RNFS.DocumentDirectoryPath}/stockwise.db`,
                `${RNFS.DocumentDirectoryPath}/../databases/stockwise.db`,
              ];
              
              let currentDbPath = null;
              for (const path of possiblePaths) {
                const exists = await RNFS.exists(path);
                if (exists) {
                  currentDbPath = path;
                  break;
                }
              }
              
              if (!currentDbPath) {
                Alert.alert('❌ Error', 'Database saat ini tidak ditemukan');
                return;
              }
              
              // Copy backup over current database
              await RNFS.copyFile(backupPath, currentDbPath);
              
              Alert.alert(
                '✅ Restore Berhasil!',
                `Database berhasil di-restore dari:\n${backupName}\n\n🔄 Aplikasi akan restart untuk memuat data baru.`,
                [
                  {
                    text: 'Restart Sekarang',
                    onPress: () => {
                      // Reload data and navigate to home
                      setShowBackupModal(false);
                      loadData();
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                      });
                    }
                  }
                ]
              );
              
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert(
                '❌ Gagal Restore',
                `Error: ${error.message}\n\nSilakan coba lagi atau hubungi support.`
              );
            }
          }
        }
      ]
    );
  };

  // Render transaction card
  const renderTransaction = (transaction, index) => {
    const isStockIn = transaction.type === 'IN';
    const reasonInfo = parseReason(transaction.notes, transaction.type);
    const profitInfo = calculateProfit(transaction);

    return (
      <View
        key={transaction.id || index}
        style={[
          styles.transactionCard,
          isStockIn ? styles.cardStockIn : styles.cardStockOut,
        ]}
      >
        {/* Header */}
        <View style={styles.transactionHeader}>
          <View style={styles.transactionHeaderLeft}>
            <View
              style={[
                styles.typeBadge,
                isStockIn ? styles.typeBadgeIn : styles.typeBadgeOut,
              ]}
            >
              <Text style={styles.typeBadgeText}>
                {isStockIn ? '📥 STOK MASUK' : '📤 STOK KELUAR'}
              </Text>
            </View>
          </View>
          <Text style={styles.transactionDate}>{formatDate(transaction.transaction_date)}</Text>
        </View>

        {/* Product Info */}
        <Text style={styles.productName}>{transaction.product_name}</Text>

        {/* Quantity & Unit */}
        <View style={styles.quantityRow}>
          <Text
            style={[
              styles.quantityText,
              isStockIn ? styles.quantityIn : styles.quantityOut,
            ]}
          >
            {isStockIn ? '+' : '-'}{formatNumber(transaction.quantity)} {transaction.unit}
          </Text>
          <Text style={styles.balanceText}>
            Saldo: {formatNumber(transaction.balance_after)} {transaction.unit}
          </Text>
        </View>

        {/* Reason (for Stock OUT) */}
        {reasonInfo && (
          <View style={styles.reasonContainer}>
            <View style={[styles.reasonBadge, { backgroundColor: reasonInfo.color + '20' }]}>
              <Text style={styles.reasonIcon}>{reasonInfo.icon}</Text>
              <Text style={[styles.reasonText, { color: reasonInfo.color }]}>
                {reasonInfo.reason}
              </Text>
            </View>
            {reasonInfo.additionalNotes && (
              <Text style={styles.additionalNotes}>{reasonInfo.additionalNotes}</Text>
            )}
          </View>
        )}

        {/* Profit Info (for Terjual transactions) */}
        {profitInfo && (
          <View style={styles.profitContainer}>
            <View style={styles.profitRow}>
              <Text style={styles.profitLabel}>Pendapatan:</Text>
              <Text style={styles.profitRevenue}>{formatCurrency(profitInfo.revenue)}</Text>
            </View>
            <View style={styles.profitRow}>
              <Text style={styles.profitLabel}>Modal:</Text>
              <Text style={styles.profitCost}>{formatCurrency(profitInfo.cost)}</Text>
            </View>
            <View style={[styles.profitRow, styles.profitRowTotal]}>
              <Text style={styles.profitLabelBold}>Untung:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[
                  styles.profitValue, 
                  profitInfo.isProfitable ? styles.profitPositive : styles.profitNegative
                ]}>
                  {formatCurrency(profitInfo.profit)}
                </Text>
                <View style={[
                  styles.marginBadge,
                  profitInfo.isProfitable ? styles.marginBadgePositive : styles.marginBadgeNegative
                ]}>
                  <Text style={styles.marginText}>{profitInfo.profitMargin}%</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Batch Info (if available) */}
        {transaction.batch_number && (
          <View style={styles.batchInfo}>
            <Text style={styles.batchLabel}>
              📦 Batch: <Text style={styles.batchValue}>{transaction.batch_number}</Text>
            </Text>
            {transaction.batch_expiry_date && (
              <Text style={styles.batchLabel}>
                ⏰ Exp: <Text style={styles.batchValue}>{formatDate(transaction.batch_expiry_date).split(' ')[0]}</Text>
              </Text>
            )}
          </View>
        )}

        {/* Reference Number (if available) */}
        {transaction.reference_no && (
          <Text style={styles.referenceNo}>Ref: {transaction.reference_no}</Text>
        )}

        {/* Notes (for Stock IN) */}
        {isStockIn && transaction.notes && transaction.notes !== 'Stok masuk' && (
          <Text style={styles.notes}>💬 {transaction.notes}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.cardBlue} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Manajemen Transaksi</Text>
          <Text style={styles.headerSubtitle}>Riwayat stok masuk & keluar</Text>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowExportModal(true)}
            >
              <Text style={styles.actionButtonIcon}>📊</Text>
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowBackupModal(true)}
            >
              <Text style={styles.actionButtonIcon}>💾</Text>
              <Text style={styles.actionButtonText}>Backup</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statIcon}>📥</Text>
            <Text style={styles.statLabel}>Total Stok Masuk</Text>
            <Text style={styles.statValue}>{stats.totalIn}</Text>
          </View>

          <View style={[styles.statCard, styles.statCardRed]}>
            <Text style={styles.statIcon}>📤</Text>
            <Text style={styles.statLabel}>Total Stok Keluar</Text>
            <Text style={styles.statValue}>{stats.totalOut}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardCyan]}>
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statLabel}>Hari Ini Masuk</Text>
            <Text style={styles.statValue}>{stats.todayIn}</Text>
          </View>

          <View style={[styles.statCard, styles.statCardOrange]}>
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statLabel}>Hari Ini Keluar</Text>
            <Text style={styles.statValue}>{stats.todayOut}</Text>
          </View>
        </View>

        {/* Financial Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💰 Analisis Keuangan</Text>
          <Text style={styles.sectionSubtitle}>Ketuk untuk lihat analisis detail</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPurple]}>
            <Text style={styles.statIcon}>💵</Text>
            <Text style={styles.statLabel}>Total Pendapatan</Text>
            <Text style={styles.statValueCurrency}>{formatCurrency(financialStats.totalRevenue)}</Text>
          </View>

          <View style={[styles.statCard, styles.statCardTeal]}>
            <Text style={styles.statIcon}>💎</Text>
            <Text style={styles.statLabel}>Total Untung</Text>
            <Text style={styles.statValueCurrency}>{formatCurrency(financialStats.totalProfit)}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardBlue, styles.statCardClickable]}
            onPress={() => navigation.navigate('FinancialAnalysis', { initialType: 'revenue' })}
            activeOpacity={0.7}
          >
            <Text style={styles.statIcon}>📈</Text>
            <Text style={styles.statLabel}>Analisis Pendapatan</Text>
            <Text style={styles.statValueSmall}>{formatCurrency(financialStats.todayRevenue)}</Text>
            <Text style={styles.statCaption}>Hari ini</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, styles.statCardGreen, styles.statCardClickable]}
            onPress={() => navigation.navigate('FinancialAnalysis', { initialType: 'profit' })}
            activeOpacity={0.7}
          >
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statLabel}>Analisis Untung</Text>
            <Text style={styles.statValueSmall}>{formatCurrency(financialStats.todayProfit)}</Text>
            <Text style={styles.statCaption}>Hari ini</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 Daftar Transaksi</Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
            activeOpacity={0.7}
          >
            <Text style={styles.sortButtonText}>
              📅 {sortOrder === 'DESC' ? 'Terbaru ↓' : 'Terlama ↑'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'ALL' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('ALL')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'ALL' && styles.filterButtonTextActive,
              ]}
            >
              Semua ({filteredTransactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              styles.filterButtonIn,
              filter === 'IN' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('IN')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'IN' && styles.filterButtonTextActive,
              ]}
            >
              📥 Masuk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              styles.filterButtonOut,
              filter === 'OUT' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('OUT')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'OUT' && styles.filterButtonTextActive,
              ]}
            >
              📤 Keluar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter Buttons */}
        <View style={styles.dateFilterContainer}>
          <TouchableOpacity
            style={[
              styles.dateFilterButton,
              dateFilter === 'TODAY' && styles.dateFilterButtonActive,
            ]}
            onPress={() => setDateFilter('TODAY')}
          >
            <Text
              style={[
                styles.dateFilterText,
                dateFilter === 'TODAY' && styles.dateFilterTextActive,
              ]}
            >
              Hari Ini
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateFilterButton,
              dateFilter === 'WEEK' && styles.dateFilterButtonActive,
            ]}
            onPress={() => setDateFilter('WEEK')}
          >
            <Text
              style={[
                styles.dateFilterText,
                dateFilter === 'WEEK' && styles.dateFilterTextActive,
              ]}
            >
              7 Hari
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateFilterButton,
              dateFilter === 'MONTH' && styles.dateFilterButtonActive,
            ]}
            onPress={() => setDateFilter('MONTH')}
          >
            <Text
              style={[
                styles.dateFilterText,
                dateFilter === 'MONTH' && styles.dateFilterTextActive,
              ]}
            >
              30 Hari
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateFilterButton,
              dateFilter === 'ALL' && styles.dateFilterButtonActive,
            ]}
            onPress={() => setDateFilter('ALL')}
          >
            <Text
              style={[
                styles.dateFilterText,
                dateFilter === 'ALL' && styles.dateFilterTextActive,
              ]}
            >
              Semua
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Transaction List */}
        {paginatedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Tidak Ada Transaksi</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? `Tidak ada transaksi dengan kata kunci "${searchQuery}"`
                : 'Belum ada transaksi tercatat.\nMulai dengan menambah stok masuk!'}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {paginatedTransactions.map((transaction, index) =>
              renderTransaction(transaction, index)
            )}
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            {/* Previous Button */}
            <TouchableOpacity
              style={[
                styles.pageButton,
                currentPage === 1 && styles.pageButtonDisabled,
              ]}
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Text
                style={[
                  styles.pageButtonText,
                  currentPage === 1 && styles.pageButtonTextDisabled,
                ]}
              >
                ‹
              </Text>
            </TouchableOpacity>

            {/* Page Numbers */}
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <View key={`ellipsis-${index}`} style={styles.ellipsisContainer}>
                    <Text style={styles.ellipsisText}>...</Text>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={`page-${page}`}
                  style={[
                    styles.pageButton,
                    currentPage === page && styles.pageButtonActive,
                  ]}
                  onPress={() => goToPage(page)}
                >
                  <Text
                    style={[
                      styles.pageButtonText,
                      currentPage === page && styles.pageButtonTextActive,
                    ]}
                  >
                    {page}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Next Button */}
            <TouchableOpacity
              style={[
                styles.pageButton,
                currentPage === totalPages && styles.pageButtonDisabled,
              ]}
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Text
                style={[
                  styles.pageButtonText,
                  currentPage === totalPages && styles.pageButtonTextDisabled,
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Page Info */}
        {totalPages > 0 && (
          <Text style={styles.pageInfo}>
            Halaman {currentPage} dari {totalPages} • {filteredTransactions.length} transaksi
          </Text>
        )}
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowExportModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>📊 Export Data</Text>
              <Text style={styles.modalSubtitle}>Pilih format export yang diinginkan</Text>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleExportExcel}
                disabled={exportLoading}
              >
                <Text style={styles.modalButtonIcon}>📗</Text>
                <View style={styles.modalButtonTextContainer}>
                  <Text style={styles.modalButtonTitle}>Export ke CSV</Text>
                  <Text style={styles.modalButtonSubtitle}>
                    File CSV bisa dibuka di Excel
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleExportPDF}
                disabled={exportLoading}
              >
                <Text style={styles.modalButtonIcon}>📄</Text>
                <View style={styles.modalButtonTextContainer}>
                  <Text style={styles.modalButtonTitle}>Export ke PDF</Text>
                  <Text style={styles.modalButtonSubtitle}>
                    File HTML → Print to PDF di browser
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowExportModal(false)}
                disabled={exportLoading}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Backup Modal */}
      <Modal
        visible={showBackupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackupModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowBackupModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>💾 Backup & Restore</Text>
              <Text style={styles.modalSubtitle}>Kelola data database Anda</Text>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleBackupDatabase}
              >
                <Text style={styles.modalButtonIcon}>💾</Text>
                <View style={styles.modalButtonTextContainer}>
                  <Text style={styles.modalButtonTitle}>Backup Database</Text>
                  <Text style={styles.modalButtonSubtitle}>
                    Simpan salinan database
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleRestoreDatabase}
              >
                <Text style={styles.modalButtonIcon}>♻️</Text>
                <View style={styles.modalButtonTextContainer}>
                  <Text style={styles.modalButtonTitle}>Restore Database</Text>
                  <Text style={styles.modalButtonSubtitle}>
                    Kembalikan dari backup
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowBackupModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },

  // Header
  header: {
    backgroundColor: Colors.cardBlue,
    padding: 20,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  statCardRed: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  statCardCyan: {
    borderLeftWidth: 4,
    borderLeftColor: '#06B6D4',
  },
  statCardOrange: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  statCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  statCardTeal: {
    borderLeftWidth: 4,
    borderLeftColor: '#14B8A6',
  },
  statCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  statCardClickable: {
    opacity: 1,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textDark,
  },
  statValueCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 4,
  },
  statCaption: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Filters
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.divider,
    alignItems: 'center',
  },
  filterButtonIn: {
    borderColor: '#10B98140',
  },
  filterButtonOut: {
    borderColor: '#EF444440',
  },
  filterButtonActive: {
    backgroundColor: Colors.cardBlue,
    borderColor: Colors.cardBlue,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },
  filterButtonTextActive: {
    color: Colors.white,
  },

  // Date Filters
  dateFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  dateFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    alignItems: 'center',
  },
  dateFilterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dateFilterTextActive: {
    color: Colors.white,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textDark,
  },
  clearIcon: {
    fontSize: 18,
    color: Colors.textLight,
    paddingHorizontal: 8,
  },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  pageButtonActive: {
    backgroundColor: Colors.cardBlue,
    borderColor: Colors.cardBlue,
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  pageButtonTextDisabled: {
    color: Colors.textLight,
  },
  pageButtonTextActive: {
    color: Colors.white,
  },
  ellipsisContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ellipsisText: {
    fontSize: 18,
    color: Colors.textLight,
    fontWeight: '700',
  },
  pageInfo: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textLight,
    paddingBottom: 24,
  },

  // Transaction List
  listContainer: {
    paddingHorizontal: 16,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardStockIn: {
    borderLeftColor: '#10B981',
  },
  cardStockOut: {
    borderLeftColor: '#EF4444',
  },

  // Transaction Header
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionHeaderLeft: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeBadgeIn: {
    backgroundColor: '#10B98120',
  },
  typeBadgeOut: {
    backgroundColor: '#EF444420',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textLight,
  },

  // Product & Quantity
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityText: {
    fontSize: 20,
    fontWeight: '700',
  },
  quantityIn: {
    color: '#10B981',
  },
  quantityOut: {
    color: '#EF4444',
  },
  balanceText: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // Reason
  reasonContainer: {
    marginTop: 8,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  reasonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  additionalNotes: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },

  // Profit Info
  profitContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  profitRowTotal: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  profitLabel: {
    fontSize: 13,
    color: Colors.textLight,
  },
  profitLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  profitRevenue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  profitCost: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  profitValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  profitPositive: {
    color: '#10B981',
  },
  profitNegative: {
    color: '#EF4444',
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marginBadgePositive: {
    backgroundColor: '#10B98120',
  },
  marginBadgeNegative: {
    backgroundColor: '#EF444420',
  },
  marginText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // Batch & Reference
  batchInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  batchLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  batchValue: {
    fontWeight: '600',
    color: Colors.textDark,
  },
  referenceNo: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  notes: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  modalButtonIcon: {
    fontSize: 32,
  },
  modalButtonTextContainer: {
    flex: 1,
  },
  modalButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  modalButtonSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
  },
  modalCancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
});