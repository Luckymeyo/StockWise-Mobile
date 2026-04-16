// Home dashboard screen - Claude-Inspired Redesign
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, RefreshControl, Image, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../styles/colors';
import { getAllProducts, getLowStockProducts, getNearExpiryProducts } from '../database/queries/products';
import { getRecentTransactions, getTransactionStats } from '../database/queries/transactions';
import { countExpiringProducts } from '../database/batchTracking';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalProducts: 0, lowStockCount: 0, nearExpiryCount: 0, totalValue: 0, todayStockIn: 0, todayStockOut: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [lowStockEnabled, setLowStockEnabled] = useState(true);
  const [expiryEnabled, setExpiryEnabled] = useState(true);

  useFocusEffect(useCallback(() => { loadDashboardData(); loadSettings(); }, []));

  const loadSettings = async () => {
    try {
      const [s1, s2] = await Promise.all([AsyncStorage.getItem('lowStockEnabled'), AsyncStorage.getItem('expiryEnabled')]);
      setLowStockEnabled(s1 !== 'false');
      setExpiryEnabled(s2 !== 'false');
    } catch (e) { console.error('Error loading settings:', e); }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const allProducts = await getAllProducts();
      const lowStock = await getLowStockProducts();
      const expiring = await getNearExpiryProducts(30);
      let expiringBatchesCount = 0;
      try { expiringBatchesCount = await countExpiringProducts(30); } catch (e) { /* view may not exist on fresh install */ }
      const totalValue = allProducts.reduce((sum, p) => sum + p.selling_price * p.current_stock, 0);
      const transactionStats = await getTransactionStats();
      const recent = await getRecentTransactions(5);
      setStats({
        totalProducts: allProducts.length, lowStockCount: lowStock.length,
        nearExpiryCount: Math.max(expiring.length, expiringBatchesCount), totalValue,
        todayStockIn: transactionStats.todayIn, todayStockOut: transactionStats.todayOut,
      });
      setRecentTransactions(recent);
      setLowStockProducts(lowStock.slice(0, 3));
    } catch (error) { console.error('Error loading dashboard:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadDashboardData(); };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getTodayDate = () => {
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const formatValue = (val) => {
    if (val > 1000000) return `${(val/1000000).toFixed(1)}jt`;
    if (val > 1000) return `${(val/1000).toFixed(0)}rb`;
    return val;
  };

  if (loading && !refreshing) {
    return (<SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={Colors.white} /><View style={s.loadingContainer}><MaterialCommunityIcons name="loading" size={32} color={Colors.primary} /><Text style={s.loadingText}>Memuat Dashboard...</Text></View></SafeAreaView>);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={s.header}>
        <View><Text style={s.greeting}>Dashboard</Text><Text style={s.dateText}>{getTodayDate()}</Text></View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.textSecondary} />
            {(stats.lowStockCount > 0 || stats.nearExpiryCount > 0) && (
              <View style={s.badge}><Text style={s.badgeText}>{stats.lowStockCount + stats.nearExpiryCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={s.scrollView} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}>

        {/* Compact Summary Strip */}
        <View style={s.section}>
          <View style={s.summaryStrip}>
            <View style={s.summaryItem}>
              <MaterialCommunityIcons name="package-variant" size={16} color={Colors.primary} />
              <Text style={s.summaryValue}>{stats.totalProducts}</Text>
              <Text style={s.summaryLabel}>Produk</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <MaterialCommunityIcons name="cash-multiple" size={16} color={Colors.success} />
              <Text style={s.summaryValue}>{formatValue(stats.totalValue)}</Text>
              <Text style={s.summaryLabel}>Nilai Stok</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <MaterialCommunityIcons name="swap-vertical" size={16} color={Colors.textSecondary} />
              <Text style={s.summaryValue}>+{stats.todayStockIn} / -{stats.todayStockOut}</Text>
              <Text style={s.summaryLabel}>Hari Ini</Text>
            </View>
          </View>
        </View>

        {/* Alert Cards - Low Stock & Expiry */}
        {(lowStockEnabled && stats.lowStockCount > 0) || (expiryEnabled && stats.nearExpiryCount > 0) ? (
          <View style={s.section}>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Perlu Perhatian</Text></View>

            {/* Compact alert badges */}
            <View style={s.alertBadgeRow}>
              {lowStockEnabled && stats.lowStockCount > 0 && (
                <TouchableOpacity style={[s.alertBadge, { backgroundColor: Colors.warningLight }]} onPress={() => navigation.navigate('Inventory')} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.warning} />
                  <Text style={[s.alertBadgeText, { color: Colors.warning }]}>{stats.lowStockCount} Stok Rendah</Text>
                </TouchableOpacity>
              )}
              {expiryEnabled && stats.nearExpiryCount > 0 && (
                <TouchableOpacity style={[s.alertBadge, { backgroundColor: Colors.dangerLight }]} onPress={() => navigation.navigate('Inventory', {screen:'ExpiringBatches'})} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={16} color={Colors.danger} />
                  <Text style={[s.alertBadgeText, { color: Colors.danger }]}>{stats.nearExpiryCount} Kadaluarsa</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Low stock product list */}
            {lowStockEnabled && lowStockProducts.length > 0 && (
              <View style={s.card}>
                {lowStockProducts.map((product, i) => (
                  <View key={product.id}>
                    <TouchableOpacity style={s.alertItem} onPress={() => navigation.navigate('Inventory', {screen:'ItemDetail', params:{productId:product.id}})} activeOpacity={0.7}>
                      <View style={s.alertIcon}>{product.photo_uri ? <Image source={{uri:product.photo_uri}} style={s.alertImage} resizeMode="cover" /> : <MaterialCommunityIcons name="package-variant" size={20} color={Colors.warning} />}</View>
                      <View style={s.alertContent}><Text style={s.alertName} numberOfLines={1}>{product.name}</Text><Text style={s.alertDetail}>Stok: {product.current_stock} {product.unit} (Min: {product.min_stock_threshold})</Text></View>
                      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textLight} />
                    </TouchableOpacity>
                    {i < lowStockProducts.length - 1 && <View style={s.listDivider} />}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Recent Activity */}
        {recentTransactions.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Aktivitas Terkini</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Management')} activeOpacity={0.7}><Text style={s.seeAll}>Lihat Semua</Text></TouchableOpacity>
            </View>
            <View style={s.card}>
              {recentTransactions.map((t, i) => (
                <View key={t.id}>
                  <View style={s.activityItem}>
                    <View style={[s.activityIcon, {backgroundColor: t.type==='IN' ? Colors.successLight : Colors.dangerLight}]}>
                      <MaterialCommunityIcons name={t.type==='IN' ? 'arrow-down' : 'arrow-up'} size={18} color={t.type==='IN' ? Colors.success : Colors.danger} />
                    </View>
                    <View style={s.activityContent}><Text style={s.activityName} numberOfLines={1}>{t.product_name}</Text><Text style={s.activityDetail}>{t.type==='IN'?'+':'-'}{t.quantity} {t.unit}</Text></View>
                    <View style={s.activityRight}><Text style={s.activityDate}>{formatDate(t.transaction_date)}</Text>
                      <View style={[s.typeBadge, {backgroundColor: t.type==='IN' ? Colors.success : Colors.danger}]}><Text style={s.typeBadgeText}>{t.type==='IN'?'Masuk':'Keluar'}</Text></View>
                    </View>
                  </View>
                  {i < recentTransactions.length - 1 && <View style={s.listDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {stats.totalProducts === 0 && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="package-variant-plus" size={64} color={Colors.textLight} />
            <Text style={s.emptyTitle}>Belum Ada Produk</Text>
            <Text style={s.emptyText}>Mulai kelola inventori dengan menambahkan produk pertama Anda</Text>
            <TouchableOpacity style={s.emptyButton} onPress={() => navigation.navigate('Inventory',{screen:'AddItem'})} activeOpacity={0.8}>
              <MaterialCommunityIcons name="plus" size={20} color={Colors.white} /><Text style={s.emptyButtonText}>Tambah Produk</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{height:32}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.bg},
  loadingContainer:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:Colors.bg},
  loadingText:{marginTop:12,fontSize:14,color:Colors.textSecondary},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  greeting:{fontSize:24,fontWeight:'700',color:Colors.textDark,letterSpacing:-0.3},
  dateText:{fontSize:13,color:Colors.textSecondary,marginTop:2},
  headerActions:{flexDirection:'row',alignItems:'center',gap:8},
  headerBtn:{width:40,height:40,borderRadius:20,backgroundColor:Colors.bg,alignItems:'center',justifyContent:'center',position:'relative'},
  badge:{position:'absolute',top:2,right:2,backgroundColor:Colors.danger,borderRadius:8,minWidth:16,height:16,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderWidth:1.5,borderColor:Colors.white},
  badgeText:{color:Colors.white,fontSize:9,fontWeight:'700'},
  scrollView:{flex:1}, content:{paddingTop:16,paddingBottom:16}, section:{marginBottom:20,paddingHorizontal:20},
  sectionTitle:{fontSize:16,fontWeight:'600',color:Colors.textDark},
  sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  seeAll:{fontSize:13,fontWeight:'600',color:Colors.primary},

  // Compact Summary Strip
  summaryStrip:{
    flexDirection:'row',alignItems:'center',
    backgroundColor:Colors.surfaceWarm || Colors.white,
    borderRadius:14,padding:14,
    borderWidth:1,borderColor:Colors.cardBorder,
  },
  summaryItem:{flex:1,alignItems:'center',gap:2},
  summaryValue:{fontSize:18,fontWeight:'700',color:Colors.textDark},
  summaryLabel:{fontSize:11,color:Colors.textSecondary},
  summaryDivider:{width:1,height:32,backgroundColor:Colors.border},

  // Alert badges
  alertBadgeRow:{flexDirection:'row',gap:8,marginBottom:12},
  alertBadge:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:8,borderRadius:10},
  alertBadgeText:{fontSize:13,fontWeight:'600'},

  card:{backgroundColor:Colors.white,borderRadius:14,borderWidth:1,borderColor:Colors.cardBorder},
  alertItem:{flexDirection:'row',alignItems:'center',padding:14,gap:12},
  alertIcon:{width:40,height:40,borderRadius:12,backgroundColor:Colors.warningLight,alignItems:'center',justifyContent:'center'},
  alertImage:{width:40,height:40,borderRadius:12},
  alertContent:{flex:1},
  alertName:{fontSize:14,fontWeight:'600',color:Colors.textDark,marginBottom:2},
  alertDetail:{fontSize:12,color:Colors.textSecondary},
  activityItem:{flexDirection:'row',alignItems:'center',padding:14},
  activityIcon:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:12},
  activityContent:{flex:1},
  activityName:{fontSize:14,fontWeight:'600',color:Colors.textDark,marginBottom:2},
  activityDetail:{fontSize:12,color:Colors.textSecondary},
  activityRight:{alignItems:'flex-end',gap:6},
  activityDate:{fontSize:11,color:Colors.textLight},
  typeBadge:{paddingHorizontal:8,paddingVertical:3,borderRadius:6},
  typeBadgeText:{fontSize:10,fontWeight:'600',color:Colors.white},
  listDivider:{height:1,backgroundColor:Colors.divider,marginLeft:66},
  emptyState:{alignItems:'center',paddingVertical:40,paddingHorizontal:40},
  emptyTitle:{fontSize:18,fontWeight:'600',color:Colors.textDark,marginTop:16,marginBottom:8},
  emptyText:{fontSize:14,color:Colors.textSecondary,textAlign:'center',marginBottom:24,lineHeight:20},
  emptyButton:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:Colors.primary,paddingHorizontal:24,paddingVertical:14,borderRadius:12},
  emptyButtonText:{fontSize:15,fontWeight:'600',color:Colors.white},
});
