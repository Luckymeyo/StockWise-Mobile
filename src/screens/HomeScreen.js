/**
 * Home Dashboard Screen - MODERNIZED
 * Contemporary design with smooth gradients and modern aesthetics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../styles/colors';
import {
  getAllProducts,
  getLowStockProducts,
  getNearExpiryProducts,
  getInventoryHealthStats,
} from '../database/queries/products';
import {
  getRecentTransactions,
  getTransactionStats,
  getTopProducts,
  getDailyStatsForSparkline,
} from '../database/queries/transactions';
import { countExpiringProducts } from '../database/batchTracking';
import { getAllSettings } from '../database/queries/businessSettings';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    nearExpiryCount: 0,
    totalValue: 0,
    totalStockIn: 0,
    totalStockOut: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [healthStats, setHealthStats] = useState({ total: 0, healthy: 0, low_stock: 0, out_of_stock: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [sparklineData, setSparklineData] = useState([]);
  const [businessName, setBusinessName] = useState('Dashboard');

  // Settings state
  const [lowStockEnabled, setLowStockEnabled] = useState(true);
  const [expiryEnabled, setExpiryEnabled] = useState(true);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const [savedLowStock, savedExpiry] = await Promise.all([
        AsyncStorage.getItem('lowStockEnabled'),
        AsyncStorage.getItem('expiryEnabled'),
      ]);
      
      // AsyncStorage stores strings, default to true if not set
      setLowStockEnabled(savedLowStock !== 'false');
      setExpiryEnabled(savedExpiry !== 'false');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get all products
      const allProducts = await getAllProducts();

      // Get low stock products
      const lowStock = await getLowStockProducts();

      // Get near expiry products (within 30 days)
      const expiring = await getNearExpiryProducts(30);

      // Get expiring batches count (more accurate for batch tracking)
      const expiringBatchesCount = await countExpiringProducts(30);

      // Calculate total inventory value
      const totalValue = allProducts.reduce((sum, product) => {
        return sum + product.selling_price * product.current_stock;
      }, 0);

      // Get transaction statistics
      const transactionStats = await getTransactionStats();

      // Get recent transactions
      const recent = await getRecentTransactions(5);

      // New dashboard data
      const health = await getInventoryHealthStats();
      const top3 = await getTopProducts(3, 7);
      const sparkline = await getDailyStatsForSparkline(7);
      const bizSettings = await getAllSettings();

      setHealthStats(health);
      setTopProducts(top3);
      setSparklineData(sparkline);
      setBusinessName(bizSettings.business_name || 'Dashboard');

      // Update state
      setStats({
        totalProducts: allProducts.length,
        lowStockCount: lowStock.length,
        nearExpiryCount: Math.max(expiring.length, expiringBatchesCount),
        totalValue: totalValue,
        totalStockIn: transactionStats.totalIn,
        totalStockOut: transactionStats.totalOut,
      });

      setRecentTransactions(recent);
      setLowStockProducts(lowStock.slice(0, 3)); // Top 3 low stock items
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatCurrency = (value) => {
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const getTodayDate = () => {
    const days = [
      'Minggu',
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
    ];
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    return `${dayName}, ${day} ${month} ${year}`;
  };

  const handleNavigateToInventory = () => {
    navigation.navigate('Inventory');
  };

  const handleNavigateToLowStock = () => {
    navigation.navigate('Inventory');
  };

  const handleNavigateToExpiring = () => {
    navigation.navigate('Inventory', {
      screen: 'ExpiringBatches',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with gradient background */}
      <View style={styles.headerGradient}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{businessName}</Text>
              <Text style={styles.dateText}>{getTodayDate()}</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigation.navigate('BusinessSettings')}
                activeOpacity={0.7}
              >
                <View style={[styles.notificationIcon]}>
                  <MaterialCommunityIcons name="cog-outline" size={22} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <View style={styles.notificationIcon}>
                  <Text style={styles.bellIcon}>🔔</Text>
                  {(stats.lowStockCount > 0 || stats.nearExpiryCount > 0) && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {stats.lowStockCount + stats.nearExpiryCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[Colors.primary]} 
          />
        }
      >
        {/* Stats Grid - Modern Cards */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            {/* Total Products Card */}
            <TouchableOpacity
              style={[styles.statCard, styles.statCardPrimary]}
              onPress={handleNavigateToInventory}
              activeOpacity={0.8}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statIconContainer}>
                  <View style={styles.statIconCircle}>
                    <Text style={styles.statEmoji}>📦</Text>
                  </View>
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statLabel}>Total Produk</Text>
                  <Text style={styles.statValue}>{stats.totalProducts}</Text>
                </View>
              </View>
              <View style={styles.statCardGlow} />
            </TouchableOpacity>

            {/* Stock Value Card */}
            <TouchableOpacity
              style={[styles.statCard, styles.statCardSuccess]}
              onPress={handleNavigateToInventory}
              activeOpacity={0.8}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statIconContainer}>
                  <View style={styles.statIconCircle}>
                    <Text style={styles.statEmoji}>💰</Text>
                  </View>
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statLabel}>Nilai Stok</Text>
                  <Text style={styles.statValue}>
                    {stats.totalValue > 1000000
                      ? `${(stats.totalValue / 1000000).toFixed(1)}jt`
                      : stats.totalValue > 1000
                      ? `${(stats.totalValue / 1000).toFixed(0)}rb`
                      : stats.totalValue}
                  </Text>
                </View>
              </View>
              <View style={styles.statCardGlow} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            {/* Low Stock Card - Only show if enabled */}
            {lowStockEnabled && (
              <TouchableOpacity
                style={[styles.statCard, styles.statCardWarning]}
                onPress={handleNavigateToLowStock}
                activeOpacity={0.8}
              >
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <View style={styles.statIconCircle}>
                      <Text style={styles.statEmoji}>⚠️</Text>
                    </View>
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>Stok Rendah</Text>
                    <Text style={styles.statValue}>{stats.lowStockCount}</Text>
                  </View>
                </View>
                <View style={styles.statCardGlow} />
              </TouchableOpacity>
            )}

            {/* Expiring Card - Only show if enabled */}
            {expiryEnabled && (
              <TouchableOpacity
                style={[styles.statCard, styles.statCardDanger]}
                onPress={handleNavigateToExpiring}
                activeOpacity={0.8}
              >
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <View style={styles.statIconCircle}>
                      <Text style={styles.statEmoji}>⏰</Text>
                    </View>
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>Kadaluarsa</Text>
                    <Text style={styles.statValue}>{stats.nearExpiryCount}</Text>
                  </View>
                </View>
                <View style={styles.statCardGlow} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Transaction Stats - Glass Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaksi Hari Ini</Text>
          <View style={styles.glassCard}>
            <View style={styles.transactionRow}>
              <View style={styles.transactionItem}>
                <View style={[styles.transactionDot, styles.transactionDotIn]} />
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionLabel}>Stok Masuk</Text>
                  <Text style={styles.transactionValue}>{stats.totalStockIn}</Text>
                </View>
              </View>
              <View style={styles.transactionDivider} />
              <View style={styles.transactionItem}>
                <View style={[styles.transactionDot, styles.transactionDotOut]} />
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionLabel}>Stok Keluar</Text>
                  <Text style={styles.transactionValue}>{stats.totalStockOut}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* === Quick Action Row === */}
        <View style={[styles.section, { marginBottom: 20 }]}>
          <View style={styles.quickRowGrid}>
            {[
              { label: 'Stok Masuk', icon: 'arrow-down-circle-outline', nav: () => navigation.navigate('Inventory', { screen: 'StockIn', params: { productId: null } }) },
              { label: 'Stok Keluar', icon: 'arrow-up-circle-outline', nav: () => navigation.navigate('Inventory') },
              { label: 'Scan', icon: 'barcode-scan', nav: () => navigation.navigate('Inventory', { screen: 'BarcodeScanner' }) },
              { label: 'Laporan', icon: 'chart-bar', nav: () => navigation.navigate('Management', { screen: 'FinancialAnalysis' }) },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={styles.quickRowBtn} onPress={item.nav} activeOpacity={0.75}>
                <View style={styles.quickRowIconBg}>
                  <MaterialCommunityIcons name={item.icon} size={22} color={Colors.primary} />
                </View>
                <Text style={styles.quickRowLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* === 7-Day Sparkline === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pergerakan 7 Hari</Text>
          <View style={styles.glassCard}>
            <SparklineChart data={sparklineData} />
            <View style={styles.sparklineLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.success }]} /><Text style={styles.legendText}>Masuk</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.danger }]} /><Text style={styles.legendText}>Keluar</Text></View>
            </View>
          </View>
        </View>

        {/* === Inventory Health Widget === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kesehatan Stok</Text>
          <View style={styles.glassCard}>
            <HealthBar stats={healthStats} />
            <View style={styles.healthLabelRow}>
              <Text style={[styles.healthLabel, { color: Colors.success }]}>Aman {healthStats.healthy}</Text>
              <Text style={[styles.healthLabel, { color: Colors.warning }]}>Rendah {healthStats.low_stock}</Text>
              <Text style={[styles.healthLabel, { color: Colors.danger }]}>Habis {healthStats.out_of_stock}</Text>
            </View>
          </View>
        </View>

        {/* === Top 3 Active Products === */}
        {topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Produk Teraktif</Text>
            <View style={styles.activityContainer}>
              {topProducts.map((p, idx) => (
                <TouchableOpacity key={p.id} style={styles.topProductRow}
                  onPress={() => navigation.navigate('Inventory', { screen: 'ItemDetail', params: { productId: p.id } })}
                  activeOpacity={0.7}>
                  <View style={styles.topRankBadge}><Text style={styles.topRankText}>{idx + 1}</Text></View>
                  <Text style={styles.topProductName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.topProductCount}>{p.tx_count}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Low Stock Alert - Modern Alert Card - Only show if enabled */}
        {lowStockEnabled && lowStockProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Perlu Perhatian</Text>
              <TouchableOpacity onPress={handleNavigateToLowStock} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Lihat Semua →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.alertContainer}>
              {lowStockProducts.map((product, index) => (
                <View key={product.id}>
                  <TouchableOpacity
                    style={styles.alertItem}
                    onPress={() =>
                      navigation.navigate('Inventory', {
                        screen: 'ItemDetail',
                        params: { productId: product.id },
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.alertIconWrapper}>
                      <View style={styles.alertIconBg}>
                        {product.photo_uri ? (
                          <Image 
                            source={{ uri: product.photo_uri }} 
                            style={styles.alertProductImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.alertEmoji}>📦</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertProductName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.alertProductDetail}>
                        Stok: {product.current_stock} {product.unit} (Min: {product.min_stock_threshold})
                      </Text>
                    </View>
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>Rendah</Text>
                    </View>
                  </TouchableOpacity>
                  {index < lowStockProducts.length - 1 && (
                    <View style={styles.alertDivider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Activity - Modern Card */}
        {recentTransactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Aktivitas Terkini</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Management')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>Lihat Semua →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityContainer}>
              {recentTransactions.map((transaction, index) => (
                <View key={transaction.id}>
                  <View style={styles.activityItem}>
                    <View
                      style={[
                        styles.activityIconWrapper,
                        transaction.type === 'IN'
                          ? styles.activityIconIn
                          : styles.activityIconOut,
                      ]}
                    >
                      <Text style={styles.activityEmoji}>
                        {transaction.type === 'IN' ? '📥' : '📤'}
                      </Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityProductName} numberOfLines={1}>
                        {transaction.product_name}
                      </Text>
                      <Text style={styles.activityDetail}>
                        {transaction.type === 'IN' ? '+' : '-'}
                        {transaction.quantity} {transaction.unit}
                      </Text>
                    </View>
                    <View style={styles.activityRight}>
                      <Text style={styles.activityDate}>
                        {formatDate(transaction.transaction_date)}
                      </Text>
                      <View
                        style={[
                          styles.activityBadge,
                          transaction.type === 'IN'
                            ? styles.activityBadgeIn
                            : styles.activityBadgeOut,
                        ]}
                      >
                        <Text style={[
                          styles.activityBadgeText,
                          transaction.type === 'IN'
                            ? styles.activityBadgeTextIn
                            : styles.activityBadgeTextOut,
                        ]}>
                          {transaction.type === 'IN' ? 'Masuk' : 'Keluar'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < recentTransactions.length - 1 && (
                    <View style={styles.activityDivider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions - Modern Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() =>
                navigation.navigate('Inventory', {
                  screen: 'AddItem',
                })
              }
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, styles.quickActionIconPrimary]}>
                <Text style={styles.quickActionEmoji}>➕</Text>
              </View>
              <Text style={styles.quickActionText}>Tambah Produk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Inventory')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, styles.quickActionIconSuccess]}>
                <Text style={styles.quickActionEmoji}>📦</Text>
              </View>
              <Text style={styles.quickActionText}>Lihat Stok</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleNavigateToLowStock}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, styles.quickActionIconWarning]}>
                <Text style={styles.quickActionEmoji}>⚠️</Text>
              </View>
              <Text style={styles.quickActionText}>Stok Rendah</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleNavigateToExpiring}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, styles.quickActionIconDanger]}>
                <Text style={styles.quickActionEmoji}>⏰</Text>
              </View>
              <Text style={styles.quickActionText}>Kadaluarsa</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty State */}
        {stats.totalProducts === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Belum Ada Produk</Text>
            <Text style={styles.emptyText}>
              Mulai kelola inventori dengan menambahkan produk pertama Anda
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() =>
                navigation.navigate('Inventory', {
                  screen: 'AddItem',
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Tambah Produk</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sparkline Chart Component ──────────────────────────────────────────────
function SparklineChart({ data }) {
  const W = 280, H = 60;
  if (!data || data.length === 0) {
    return (
      <Svg width={W} height={H}>
        <Line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke={Colors.border} strokeWidth={1.5} />
      </Svg>
    );
  }

  const maxIn = Math.max(...data.map(d => d.stock_in_count || 0), 1);
  const maxOut = Math.max(...data.map(d => d.stock_out_count || 0), 1);
  const maxVal = Math.max(maxIn, maxOut, 1);

  const toPoints = (key) =>
    data.map((d, i) => {
      const x = data.length === 1 ? W / 2 : (i / (data.length - 1)) * W;
      const y = H - ((d[key] || 0) / maxVal) * (H - 8) - 4;
      return `${x},${y}`;
    }).join(' ');

  return (
    <Svg width={W} height={H}>
      <Polyline points={toPoints('stock_in_count')} fill="none" stroke={Colors.success} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Polyline points={toPoints('stock_out_count')} fill="none" stroke={Colors.danger} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Health Bar Component ────────────────────────────────────────────────────
function HealthBar({ stats }) {
  const total = stats.total || 1;
  const hPct = (stats.healthy / total) * 100;
  const lPct = (stats.low_stock / total) * 100;
  const oPct = (stats.out_of_stock / total) * 100;
  return (
    <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.border }}>
      <View style={{ flex: hPct, backgroundColor: Colors.success }} />
      <View style={{ flex: lPct, backgroundColor: Colors.warning }} />
      <View style={{ flex: oPct, backgroundColor: Colors.danger }} />
    </View>
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
    backgroundColor: Colors.bg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Header with Gradient
  headerGradient: {
    backgroundColor: Colors.white,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    paddingTop: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textDark,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    position: 'relative',
  },
  settingsIcon: {
    fontSize: 22,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bgSecondary,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 48,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Stats Grid - Modern Cards
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    minHeight: 130,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  statCardPrimary: {
    backgroundColor: Colors.primary,
  },
  statCardSuccess: {
    backgroundColor: Colors.success,
  },
  statCardWarning: {
    backgroundColor: Colors.warning,
  },
  statCardDanger: {
    backgroundColor: Colors.danger,
  },
  statCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statCardGlow: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.glassWhite,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statEmoji: {
    fontSize: 24,
  },
  statInfo: {
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },

  // Glass Card - Transaction Stats
  glassCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  transactionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  transactionDotIn: {
    backgroundColor: Colors.success,
  },
  transactionDotOut: {
    backgroundColor: Colors.danger,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  transactionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textDark,
    letterSpacing: -0.5,
  },
  transactionDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },

  // Alert Container
  alertContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
    overflow: 'hidden',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  alertIconWrapper: {
    position: 'relative',
  },
  alertIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertEmoji: {
    fontSize: 22,
  },
  alertProductImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  alertContent: {
    flex: 1,
  },
  alertProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  alertProductDetail: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.danger,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  alertDivider: {
    height: 1,
    backgroundColor: Colors.dangerLight,
    marginLeft: 76,
  },

  // Activity Container
  activityContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activityIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityIconIn: {
    backgroundColor: Colors.successLight,
  },
  activityIconOut: {
    backgroundColor: Colors.dangerLight,
  },
  activityEmoji: {
    fontSize: 22,
  },
  activityContent: {
    flex: 1,
  },
  activityProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  activityDetail: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  activityDate: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activityBadgeIn: {
    backgroundColor: Colors.success,
  },
  activityBadgeOut: {
    backgroundColor: Colors.danger,
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  activityBadgeTextIn: {
    color: Colors.white,
  },
  activityBadgeTextOut: {
    color: Colors.white,
  },
  activityDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 76,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconPrimary: {
    backgroundColor: Colors.primaryLight,
  },
  quickActionIconSuccess: {
    backgroundColor: Colors.successBg,
  },
  quickActionIconDanger: {
    backgroundColor: Colors.dangerBg,
  },
  quickActionIconWarning: {
    backgroundColor: Colors.warningBg,
  },
  quickActionEmoji: {
    fontSize: 26,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },

  // Quick Row
  quickRowGrid: { flexDirection: 'row', gap: 8 },
  quickRowBtn: {
    flex: 1, alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border,
  },
  quickRowIconBg: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  quickRowLabel: { fontSize: 11, fontWeight: '600', color: Colors.textDark, textAlign: 'center' },

  // Sparkline
  sparklineLegend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: Colors.textSecondary },

  // Health
  healthLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  healthLabel: { fontSize: 12, fontWeight: '600' },

  // Top Products
  topProductRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  topRankBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  topRankText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  topProductName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textDark },
  topProductCount: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
});