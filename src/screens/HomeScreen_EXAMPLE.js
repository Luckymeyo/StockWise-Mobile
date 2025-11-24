/**
 * POLISHED HOME SCREEN - Complete Example
 * Shows how to use new design system
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Colors, { shadows, radius, spacing, typography } from '../styles/colors';
import { Card, StatCard, Button, Badge, EmptyState } from '../components/CommonComponents';

// Import database functions (keep existing imports)
import { getAllProducts, getLowStockProducts } from '../database/queries/products';
import { getTransactionStats, getRecentTransactions } from '../database/queries/transactions';
import { getUnreadCount } from '../database/queries/notifications';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0,
    expiring: 0,
    stockIn: 0,
    stockOut: 0,
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
      return () => {};
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      // Load all data (keep existing logic)
      const products = await getAllProducts();
      const lowStock = await getLowStockProducts();
      const transactionStats = await getTransactionStats();
      const recent = await getRecentTransactions(5);
      const unread = await getUnreadCount();

      // Calculate stats (keep existing logic)
      const totalValue = products.reduce((sum, p) => 
        sum + (p.current_stock * p.selling_price), 0
      );

      setStats({
        totalProducts: products.length,
        totalValue: totalValue,
        lowStock: lowStock.length,
        expiring: 0, // Calculate from products
        stockIn: transactionStats?.total_in || 0,
        stockOut: transactionStats?.total_out || 0,
      });

      setLowStockItems(lowStock.slice(0, 3));
      setRecentTransactions(recent);
      setUnreadNotifications(unread);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `Rp ${(value / 1000000).toFixed(1)}jt`;
    } else if (value >= 1000) {
      return `Rp ${(value / 1000).toFixed(0)}rb`;
    }
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hari ini';
    if (diffDays === 2) return 'Kemarin';
    if (diffDays <= 7) return `${diffDays} hari lalu`;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Selamat Datang! 👋</Text>
          <Text style={styles.subtitle}>StockWise Dashboard</Text>
        </View>
        
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Stats Grid */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <StatCard
              icon="📦"
              title="Total Produk"
              value={stats.totalProducts.toString()}
              color={Colors.primary}
              onPress={() => navigation.navigate('Inventory')}
            />
            
            <StatCard
              icon="💰"
              title="Nilai Stok"
              value={formatCurrency(stats.totalValue)}
              subtitle="Total inventory"
              color={Colors.success}
              onPress={() => navigation.navigate('Management')}
            />
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon="⚠️"
              title="Stok Rendah"
              value={stats.lowStock.toString()}
              subtitle={`${stats.lowStock} items`}
              color={Colors.danger}
              onPress={() => navigation.navigate('Inventory')}
            />
            
            <StatCard
              icon="⏰"
              title="Kadaluarsa"
              value={stats.expiring.toString()}
              subtitle="Will expire soon"
              color={Colors.warning}
              onPress={() => navigation.navigate('Inventory', { 
                screen: 'ExpiringBatches' 
              })}
            />
          </View>
        </View>

        {/* Transaction Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Summary</Text>
          <Card elevated={true}>
            <View style={styles.transactionSummary}>
              <View style={styles.transactionItem}>
                <View style={[styles.transactionDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.transactionLabel}>Stock In</Text>
                <Text style={[styles.transactionValue, { color: Colors.success }]}>
                  {stats.stockIn}
                </Text>
              </View>
              
              <View style={styles.transactionDivider} />
              
              <View style={styles.transactionItem}>
                <View style={[styles.transactionDot, { backgroundColor: Colors.danger }]} />
                <Text style={styles.transactionLabel}>Stock Out</Text>
                <Text style={[styles.transactionValue, { color: Colors.danger }]}>
                  {stats.stockOut}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {lowStockItems.map((item) => (
              <Card
                key={item.id}
                onPress={() => navigation.navigate('Inventory', {
                  screen: 'ItemDetail',
                  params: { productId: item.id }
                })}
                style={styles.alertCard}
              >
                <View style={styles.alertHeader}>
                  <Text style={styles.alertProductName}>{item.name}</Text>
                  <Badge text="LOW" variant="danger" size="small" />
                </View>
                
                <View style={styles.alertDetails}>
                  <Text style={styles.alertText}>
                    Current: <Text style={styles.alertValue}>{item.current_stock} {item.unit}</Text>
                  </Text>
                  <Text style={styles.alertSeparator}>•</Text>
                  <Text style={styles.alertText}>
                    Min: <Text style={styles.alertValue}>{item.min_stock_threshold} {item.unit}</Text>
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Management')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <Card key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === 'IN' 
                      ? Colors.successBg 
                      : Colors.dangerBg 
                    }
                  ]}>
                    <Text style={styles.transactionIconText}>
                      {transaction.type === 'IN' ? '📥' : '📤'}
                    </Text>
                  </View>
                  
                  <View style={styles.transactionContent}>
                    <Text style={styles.transactionProductName}>
                      {transaction.product_name}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.transaction_date)}
                    </Text>
                  </View>
                  
                  <Text style={[
                    styles.transactionQuantity,
                    { color: transaction.type === 'IN' ? Colors.success : Colors.danger }
                  ]}>
                    {transaction.type === 'IN' ? '+' : '-'}{transaction.quantity}
                  </Text>
                </View>
              </Card>
            ))
          ) : (
            <EmptyState
              icon="📋"
              title="No Recent Activity"
              message="Your transactions will appear here"
            />
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <Button
              title="Add Product"
              icon="✨"
              variant="primary"
              onPress={() => navigation.navigate('Inventory', { screen: 'AddItem' })}
              style={styles.quickActionButton}
            />
            
            <Button
              title="View Stock"
              icon="🏬"
              variant="secondary"
              onPress={() => navigation.navigate('Inventory')}
              style={styles.quickActionButton}
            />
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: Colors.surface,
    ...shadows.small,
  },
  
  greeting: {
    ...typography.h4,
    color: Colors.textPrimary,
  },
  
  subtitle: {
    ...typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: radius.medium,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  
  notificationIcon: {
    fontSize: 24,
  },
  
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.danger,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  
  notificationBadgeText: {
    ...typography.tinySemibold,
    color: Colors.white,
    fontSize: 10,
  },
  
  scrollView: {
    flex: 1,
  },
  
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  
  sectionTitle: {
    ...typography.h5,
    color: Colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  sectionLink: {
    ...typography.smallSemibold,
    color: Colors.primary,
  },
  
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  
  transactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  transactionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  transactionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  
  transactionLabel: {
    ...typography.small,
    color: Colors.textSecondary,
    flex: 1,
  },
  
  transactionValue: {
    ...typography.h5,
  },
  
  transactionDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.divider,
    marginHorizontal: spacing.md,
  },
  
  alertCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  alertProductName: {
    ...typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },
  
  alertDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  alertText: {
    ...typography.small,
    color: Colors.textSecondary,
  },
  
  alertValue: {
    ...typography.smallSemibold,
    color: Colors.textPrimary,
  },
  
  alertSeparator: {
    ...typography.small,
    color: Colors.textTertiary,
    marginHorizontal: spacing.sm,
  },
  
  transactionCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  transactionIconText: {
    fontSize: 20,
  },
  
  transactionContent: {
    flex: 1,
  },
  
  transactionProductName: {
    ...typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  
  transactionDate: {
    ...typography.tiny,
    color: Colors.textSecondary,
  },
  
  transactionQuantity: {
    ...typography.h6,
  },
  
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  
  quickActionButton: {
    flex: 1,
  },
});
