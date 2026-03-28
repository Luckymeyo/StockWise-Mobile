// Management screen (transaction history) - Claude-Inspired Redesign

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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../styles/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import {
  getAllTransactions,
  getTransactionStats,
  getAllTransactionsWithPricing,
  voidTransaction,
} from '../database/queries/transactions';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ManagementScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, todayIn: 0, todayOut: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [showVoided, setShowVoided] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // useFocusEffect covers initial mount + returning to screen.
  // The standalone useEffect is removed to prevent double-load on mount.
  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useCallback(() => { loadData(); }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [allTransactions, transactionStats] = await Promise.all([
        getAllTransactionsWithPricing(null, null, null, true), // include voided so we can show them
        getTransactionStats(),
      ]);
      setTransactions(allTransactions);
      setStats(transactionStats);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Filter transactions
  const filteredTransactions = transactions
    .filter((t) => {
      const matchesFilter = filter === 'ALL' || t.type === filter;
      const matchesSearch = searchQuery.trim() === '' ||
        (t.product_name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      let matchesDate = true;
      if (dateFilter !== 'ALL') {
        const transactionDate = new Date(t.transaction_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
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
      const dateA = new Date(a.transaction_date);
      const dateB = new Date(b.transaction_date);
      return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [filter, dateFilter, sortOrder, searchQuery]);

  // Format helpers
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

  const formatNumber = (value) => parseFloat(value).toLocaleString('id-ID');

  const formatCurrency = (value) => `Rp ${parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const parseReason = (notes, type) => {
    if (type !== 'OUT') return null;
    if (!notes) return { reason: 'Lainnya', icon: 'note-text-outline', color: Colors.textSecondary };
    const reasonMap = {
      'Terjual': { icon: 'cash-register', color: Colors.success },
      'Rusak': { icon: 'heart-broken', color: Colors.warning },
      'Kadaluarsa': { icon: 'clock-alert-outline', color: Colors.danger },
      'Hilang': { icon: 'help-circle-outline', color: Colors.textSecondary },
      'Lainnya': { icon: 'note-text-outline', color: Colors.textSecondary },
    };
    const reasonMatch = notes.match(/^(Terjual|Rusak|Kadaluarsa|Hilang|Lainnya)/);
    const reasonKey = reasonMatch ? reasonMatch[1] : 'Lainnya';
    return {
      reason: reasonKey,
      ...reasonMap[reasonKey],
      additionalNotes: notes.replace(/^(Terjual|Rusak|Kadaluarsa|Hilang|Lainnya)\s*-?\s*/, ''),
    };
  };

  const calculateProfit = (transaction) => {
    if (transaction.type !== 'OUT' || !transaction.notes || !transaction.notes.startsWith('Terjual')) return null;
    const revenue = transaction.quantity * (transaction.selling_price || 0);
    const cost = transaction.quantity * (transaction.purchase_price || 0);
    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
    return { revenue, cost, profit, profitMargin, isProfitable: profit >= 0 };
  };

  const goToPage = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  const getPageNumbers = () => {
    const pages = [];
    const max = 5;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleVoid = (transaction) => {
    let reason = '';
    Alert.prompt(
      'Batalkan Transaksi',
      'Masukkan alasan pembatalan (wajib):',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Batalkan',
          onPress: async (r) => {
            if (!r || r.trim() === '') {
              Alert.alert('Error', 'Alasan pembatalan wajib diisi');
              return;
            }
            try {
              await voidTransaction(transaction.id, r.trim());
              Toast.show({ type: 'success', text1: 'Transaksi Dibatalkan' });
              loadData();
            } catch (e) {
              Alert.alert('Error', e.message || 'Gagal membatalkan transaksi');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // Render compact transaction row
  const renderTransaction = (transaction, index) => {
    const isStockIn = transaction.type === 'IN';
    const isExpanded = expandedId === (transaction.id || index);
    const isVoided = transaction.is_voided === 1;
    const reasonInfo = parseReason(transaction.notes, transaction.type);
    const profitInfo = calculateProfit(transaction);

    return (
      <TouchableOpacity
        key={transaction.id || index}
        style={[styles.transactionRow, isVoided && styles.transactionVoided]}
        onPress={() => toggleExpand(transaction.id || index)}
        activeOpacity={0.7}
      >
        {/* Compact Row */}
        <View style={styles.rowCompact}>
          <View style={[styles.directionIcon, isStockIn ? styles.directionIn : styles.directionOut, isVoided && { opacity: 0.4 }]}>
            <MaterialCommunityIcons
              name={isStockIn ? 'arrow-down' : 'arrow-up'}
              size={18}
              color={isStockIn ? Colors.success : Colors.danger}
            />
          </View>
          <View style={styles.rowContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.rowProductName, isVoided && { textDecorationLine: 'line-through', color: Colors.textLight }]} numberOfLines={1}>{transaction.product_name}</Text>
              {isVoided && <View style={styles.voidedBadge}><Text style={styles.voidedText}>Dibatalkan</Text></View>}
            </View>
            <Text style={styles.rowDate}>{formatDate(transaction.transaction_date)}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.rowQuantity, isStockIn ? styles.textSuccess : styles.textDanger]}>
              {isStockIn ? '+' : '-'}{formatNumber(transaction.quantity)} {transaction.unit}
            </Text>
            <Text style={styles.rowBalance}>Saldo: {formatNumber(transaction.balance_after)}</Text>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.textLight}
            style={{ marginLeft: 4 }}
          />
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            {/* Reason (for Stock OUT) */}
            {reasonInfo && (
              <View style={styles.detailRow}>
                <View style={[styles.reasonBadge, { backgroundColor: reasonInfo.color + '18' }]}>
                  <MaterialCommunityIcons name={reasonInfo.icon} size={14} color={reasonInfo.color} />
                  <Text style={[styles.reasonText, { color: reasonInfo.color }]}>{reasonInfo.reason}</Text>
                </View>
                {reasonInfo.additionalNotes ? (
                  <Text style={styles.additionalNotes}>{reasonInfo.additionalNotes}</Text>
                ) : null}
              </View>
            )}

            {/* Profit Info */}
            {profitInfo && (
              <View style={styles.profitContainer}>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Pendapatan</Text>
                  <Text style={styles.profitRevenue}>{formatCurrency(profitInfo.revenue)}</Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Modal</Text>
                  <Text style={styles.profitCost}>{formatCurrency(profitInfo.cost)}</Text>
                </View>
                <View style={[styles.profitRow, styles.profitRowTotal]}>
                  <Text style={styles.profitLabelBold}>Untung</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.profitValue, profitInfo.isProfitable ? styles.textSuccess : styles.textDanger]}>
                      {formatCurrency(profitInfo.profit)}
                    </Text>
                    <View style={[styles.marginBadge, profitInfo.isProfitable ? styles.marginPositive : styles.marginNegative]}>
                      <Text style={styles.marginText}>{profitInfo.profitMargin}%</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Batch Info */}
            {transaction.batch_number && (
              <View style={styles.batchInfo}>
                <Text style={styles.batchLabel}>
                  Batch: <Text style={styles.batchValue}>{transaction.batch_number}</Text>
                </Text>
                {transaction.batch_expiry_date && (
                  <Text style={styles.batchLabel}>
                    Exp: <Text style={styles.batchValue}>{formatDate(transaction.batch_expiry_date).split(' ')[0]}</Text>
                  </Text>
                )}
              </View>
            )}

            {/* Reference Number */}
            {transaction.reference_no && (
              <Text style={styles.refText}>Ref: {transaction.reference_no}</Text>
            )}

            {/* Notes (for Stock IN) */}
            {isStockIn && transaction.notes && transaction.notes !== 'Stok masuk' && (
              <Text style={styles.noteText}>{transaction.notes}</Text>
            )}

            {/* Void reason */}
            {isVoided && transaction.void_reason && (
              <Text style={styles.noteText}>Alasan: {transaction.void_reason}</Text>
            )}

            {/* Void button */}
            {!isVoided && (
              <TouchableOpacity style={styles.voidBtn} onPress={() => handleVoid(transaction)}>
                <MaterialCommunityIcons name="cancel" size={14} color={Colors.danger} />
                <Text style={styles.voidBtnText}>Batalkan Transaksi</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Transaksi</Text>
            <Text style={styles.headerSubtitle}>Riwayat stok masuk & keluar</Text>
          </View>
        </View>

        {/* Compact Summary Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="arrow-down" size={14} color={Colors.success} />
            <Text style={styles.summaryLabel}>Masuk</Text>
            <Text style={[styles.summaryValue, styles.textSuccess]}>{stats.totalIn}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="arrow-up" size={14} color={Colors.danger} />
            <Text style={styles.summaryLabel}>Keluar</Text>
            <Text style={[styles.summaryValue, styles.textDanger]}>{stats.totalOut}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="calendar-today" size={14} color={Colors.textSecondary} />
            <Text style={styles.summaryLabel}>Hari Ini</Text>
            <Text style={styles.summaryValue}>+{stats.todayIn} / -{stats.todayOut}</Text>
          </View>
        </View>

        {/* Search Bar with Sort */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          )}
          <View style={styles.searchDivider} />
          <TouchableOpacity
            onPress={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
            style={styles.sortBtn}
          >
            <MaterialCommunityIcons
              name={sortOrder === 'DESC' ? 'sort-descending' : 'sort-ascending'}
              size={20}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Unified Filter Row */}
        <View style={styles.filterRow}>
          {/* Type filters */}
          {[
            { key: 'ALL', label: `Semua (${filteredTransactions.length})` },
            { key: 'IN', label: 'Masuk' },
            { key: 'OUT', label: 'Keluar' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.chipDivider} />

          {/* Date filters */}
          {[
            { key: 'ALL', label: 'Semua' },
            { key: 'TODAY', label: 'Hari Ini' },
            { key: 'WEEK', label: '7 Hari' },
            { key: 'MONTH', label: '30 Hari' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, dateFilter === f.key && styles.chipActive]}
              onPress={() => setDateFilter(f.key)}
            >
              <Text style={[styles.chipText, dateFilter === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction List */}
        {paginatedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="inbox-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Tidak Ada Transaksi</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? `Tidak ditemukan transaksi "${searchQuery}"`
                : 'Belum ada transaksi tercatat.\nMulai dengan menambah stok masuk!'}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {paginatedTransactions.map((t, i) => renderTransaction(t, i))}
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>‹</Text>
            </TouchableOpacity>

            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return <View key={`e-${index}`} style={styles.ellipsis}><Text style={styles.ellipsisText}>...</Text></View>;
              }
              return (
                <TouchableOpacity
                  key={`p-${page}`}
                  style={[styles.pageBtn, currentPage === page && styles.pageBtnActive]}
                  onPress={() => goToPage(page)}
                >
                  <Text style={[styles.pageBtnText, currentPage === page && styles.pageBtnTextActive]}>{page}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {totalPages > 0 && (
          <Text style={styles.pageInfo}>
            Halaman {currentPage} dari {totalPages} • {filteredTransactions.length} transaksi
          </Text>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textLight },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textDark, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // Summary Bar
  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: Colors.surfaceWarm || Colors.white,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary },
  summaryValue: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  summaryDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark, marginLeft: 8 },
  searchDivider: { width: 1, height: 20, backgroundColor: Colors.border, marginHorizontal: 8 },
  sortBtn: { padding: 4 },

  // Filters
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, marginTop: 12, gap: 6,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  chipDivider: { width: 1, height: 28, backgroundColor: Colors.border, alignSelf: 'center', marginHorizontal: 2 },

  // Transaction List
  listContainer: { paddingHorizontal: 16, marginTop: 16 },
  transactionRow: {
    backgroundColor: Colors.white, borderRadius: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  rowCompact: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  directionIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  directionIn: { backgroundColor: Colors.successLight },
  directionOut: { backgroundColor: Colors.dangerLight },
  rowContent: { flex: 1 },
  rowProductName: { fontSize: 14, fontWeight: '600', color: Colors.textDark, marginBottom: 2 },
  rowDate: { fontSize: 11, color: Colors.textLight },
  rowRight: { alignItems: 'flex-end' },
  rowQuantity: { fontSize: 14, fontWeight: '700' },
  rowBalance: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  textSuccess: { color: Colors.success },
  textDanger: { color: Colors.danger },

  // Expanded
  expandedContainer: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  detailRow: { marginTop: 10 },
  reasonBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    alignSelf: 'flex-start',
  },
  reasonText: { fontSize: 13, fontWeight: '600' },
  additionalNotes: { fontSize: 12, color: Colors.textLight, marginTop: 4 },

  profitContainer: {
    marginTop: 10, backgroundColor: Colors.surfaceWarm || Colors.bg,
    borderRadius: 10, padding: 12,
  },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  profitRowTotal: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.divider, marginBottom: 0 },
  profitLabel: { fontSize: 13, color: Colors.textLight },
  profitLabelBold: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  profitRevenue: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  profitCost: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  profitValue: { fontSize: 15, fontWeight: '700' },
  marginBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  marginPositive: { backgroundColor: Colors.successLight },
  marginNegative: { backgroundColor: Colors.dangerLight },
  marginText: { fontSize: 11, fontWeight: '700', color: Colors.textDark },

  batchInfo: { marginTop: 10, flexDirection: 'row', gap: 16 },
  batchLabel: { fontSize: 12, color: Colors.textLight },
  batchValue: { fontWeight: '600', color: Colors.textDark },
  refText: { fontSize: 12, color: Colors.textLight, marginTop: 6, fontStyle: 'italic' },
  noteText: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, fontStyle: 'italic' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginTop: 12, marginBottom: 6 },
  emptyText: { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },

  // Pagination
  paginationContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 6,
  },
  pageBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  pageBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  pageBtnTextActive: { color: Colors.white },
  pageBtnTextDisabled: { color: Colors.textLight },
  ellipsis: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  ellipsisText: { fontSize: 16, color: Colors.textLight, fontWeight: '700' },
  pageInfo: { textAlign: 'center', fontSize: 12, color: Colors.textLight, paddingBottom: 8 },

  // Void styles
  transactionVoided: { opacity: 0.7, backgroundColor: Colors.bgSecondary },
  voidedBadge: { backgroundColor: Colors.dangerLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  voidedText: { fontSize: 10, fontWeight: '700', color: Colors.danger },
  voidBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, padding: 8, backgroundColor: Colors.dangerLight, borderRadius: 8, alignSelf: 'flex-start' },
  voidBtnText: { fontSize: 12, fontWeight: '600', color: Colors.danger },
});
