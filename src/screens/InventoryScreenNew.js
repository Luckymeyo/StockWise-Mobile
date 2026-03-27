// Inventory list screen - Claude-Inspired Redesign
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, Image, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../styles/colors';
import { getAllProducts, getLowStockProducts, getNearExpiryProducts, deleteProduct } from '../database/queries/products';

export default function InventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // loadProducts is defined before the hooks that reference it so the
  // useCallback/useEffect dependency arrays can capture the stable reference.
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      let data = [];
      switch (activeFilter) { case 'low': data = await getLowStockProducts(); break; case 'expiry': data = await getNearExpiryProducts(30); break; default: data = await getAllProducts(); }
      setProducts(data); setFilteredProducts(data);
    } catch (error) { console.error('Error loading products:', error); Alert.alert('Error', 'Gagal memuat data produk'); }
    finally { setLoading(false); }
  }, [activeFilter]);

  // Reload when filter changes or screen comes back into focus (e.g. after add/edit).
  useEffect(() => { loadProducts(); }, [loadProducts]);
  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const onRefresh = async () => { setRefreshing(true); await loadProducts(); setRefreshing(false); };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedQuery(searchQuery); }, 250);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim() === '') { setFilteredProducts(products); }
    else { setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(debouncedQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(debouncedQuery.toLowerCase())) || (p.barcode && p.barcode.includes(debouncedQuery)))); }
  }, [debouncedQuery, products]);

  const handleAddItem = () => navigation.navigate('AddItem');
  const handleItemPress = (item) => navigation.navigate('ItemDetail', { productId: item.id });
  const handleDeleteItem = (item) => { Alert.alert('Hapus Produk', `Yakin ingin menghapus "${item.name}"?`, [{ text: 'Batal', style: 'cancel' }, { text: 'Hapus', style: 'destructive', onPress: async () => { try { await deleteProduct(item.id); loadProducts(); } catch (e) { Alert.alert('Error', 'Gagal menghapus produk'); } } }]); };
  const formatCurrency = (v) => !v ? 'Rp 0' : `Rp ${parseFloat(v).toLocaleString('id-ID')}`;
  const formatDate = (d) => { if(!d) return '-'; const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`; };

  const renderProduct = ({ item }) => {
    const isExpiring = item.is_near_expiry === 1;
    const isLowStock = item.is_low_stock === 1;
    return (
      <TouchableOpacity style={st.productCard} onPress={() => handleItemPress(item)} onLongPress={() => handleDeleteItem(item)} activeOpacity={0.7}>
        <View style={st.productImageContainer}>
          {item.photo_uri ? <Image source={{uri:item.photo_uri}} style={st.productImage} /> :
           <View style={st.productImagePlaceholder}><MaterialCommunityIcons name="package-variant" size={28} color={Colors.textLight} /></View>}
        </View>
        <View style={st.productInfo}>
          <Text style={st.productName} numberOfLines={2}>{item.name}</Text>
          {item.sku && <Text style={st.productSku}>SKU: {item.sku}</Text>}
          <View style={{gap:2}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Text style={[st.stockText, {color: isLowStock ? Colors.danger : Colors.success}]}>Stok: {item.current_stock} {item.unit}</Text>
              {isLowStock && <View style={st.lowBadge}><MaterialCommunityIcons name="alert-circle" size={12} color={Colors.warning} /><Text style={st.lowBadgeText}>Low</Text></View>}
            </View>
            <Text style={st.priceText}>{formatCurrency(item.selling_price)}</Text>
            {item.expiry_date && <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={isExpiring ? Colors.danger : Colors.textLight} />
              <Text style={[st.expiryText, isExpiring && {color:Colors.danger,fontWeight:'600'}]}>Exp: {formatDate(item.expiry_date)}</Text>
            </View>}
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textLight} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={st.emptyContainer}>
      <MaterialCommunityIcons name={activeFilter==='low'?'alert-circle-outline':activeFilter==='expiry'?'clock-alert-outline':'package-variant-plus'} size={56} color={Colors.textLight} />
      <Text style={st.emptyTitle}>{activeFilter==='all'?'Belum ada produk':activeFilter==='low'?'Stok aman semua':'Tidak ada yang kadaluarsa'}</Text>
      <Text style={st.emptyText}>{activeFilter==='all'?'Tambahkan produk pertama Anda':activeFilter==='low'?'Tidak ada produk dengan stok rendah':'Tidak ada produk yang akan kadaluarsa'}</Text>
      {activeFilter==='all' && <TouchableOpacity style={st.emptyButton} onPress={handleAddItem}><MaterialCommunityIcons name="plus" size={18} color={Colors.white} /><Text style={st.emptyButtonText}>Tambah Produk</Text></TouchableOpacity>}
    </View>
  );

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={st.container}>
        <View style={st.header}><Text style={st.headerTitle}>Inventori</Text>
          <TouchableOpacity style={st.addButton} onPress={handleAddItem} activeOpacity={0.7}><MaterialCommunityIcons name="plus" size={22} color={Colors.white} /></TouchableOpacity>
        </View>
        <View style={st.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.textLight} />
          <TextInput style={st.searchInput} placeholder="Cari produk, SKU, atau barcode..." placeholderTextColor={Colors.textLight} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><MaterialCommunityIcons name="close-circle" size={18} color={Colors.textLight} /></TouchableOpacity>}
        </View>
        <View style={st.filterContainer}>
          {['all','low','expiry'].map(f => (
            <TouchableOpacity key={f} style={[st.filterBtn, activeFilter===f && st.filterBtnActive]} onPress={() => {setActiveFilter(f);setSearchQuery('');}} activeOpacity={0.7}>
              <Text style={[st.filterText, activeFilter===f && st.filterTextActive]}>{f==='all'?'Semua':f==='low'?'Stok Rendah':'Kadaluarsa'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading && !refreshing && (
          <View style={st.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
        <FlatList data={filteredProducts} renderItem={renderProduct} keyExtractor={item => item.id.toString()} contentContainerStyle={st.listContent} ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />} showsVerticalScrollIndicator={false} />
        {filteredProducts.length > 0 && <TouchableOpacity style={st.fab} onPress={handleAddItem} activeOpacity={0.8}><MaterialCommunityIcons name="plus" size={28} color={Colors.white} /></TouchableOpacity>}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.bg}, container:{flex:1},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  headerTitle:{fontSize:24,fontWeight:'700',color:Colors.textDark},
  addButton:{width:36,height:36,borderRadius:12,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  searchContainer:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.white,marginHorizontal:20,marginTop:12,paddingHorizontal:14,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:Colors.cardBorder},
  searchInput:{flex:1,fontSize:14,color:Colors.textDark,marginLeft:8,paddingVertical:0},
  filterContainer:{flexDirection:'row',paddingHorizontal:20,paddingVertical:12,gap:8},
  filterBtn:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.cardBorder},
  filterBtnActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  filterText:{fontSize:13,fontWeight:'600',color:Colors.textSecondary}, filterTextActive:{color:Colors.white},
  listContent:{padding:20,paddingBottom:100},
  productCard:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.white,borderRadius:14,padding:12,marginBottom:10,borderWidth:1,borderColor:Colors.cardBorder},
  productImageContainer:{width:64,height:64,marginRight:12}, productImage:{width:'100%',height:'100%',borderRadius:10},
  productImagePlaceholder:{width:'100%',height:'100%',borderRadius:12,backgroundColor:Colors.cream || Colors.bgSecondary,alignItems:'center',justifyContent:'center'},
  productInfo:{flex:1,justifyContent:'space-between'},
  productName:{fontSize:15,fontWeight:'600',color:Colors.textDark,marginBottom:2}, productSku:{fontSize:11,color:Colors.textLight,marginBottom:6},
  stockText:{fontSize:13,fontWeight:'600'}, priceText:{fontSize:13,fontWeight:'600',color:Colors.primary},
  lowBadge:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:Colors.warningBg,paddingHorizontal:6,paddingVertical:2,borderRadius:6},
  lowBadgeText:{fontSize:10,fontWeight:'700',color:Colors.warning},
  expiryText:{fontSize:11,color:Colors.textLight},
  emptyContainer:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:60},
  emptyTitle:{fontSize:18,fontWeight:'600',color:Colors.textDark,marginTop:16,marginBottom:6},
  emptyText:{fontSize:13,color:Colors.textSecondary,textAlign:'center',marginBottom:20},
  emptyButton:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:Colors.primary,paddingHorizontal:20,paddingVertical:12,borderRadius:12},
  emptyButtonText:{color:Colors.white,fontSize:14,fontWeight:'600'},
  fab:{position:'absolute',bottom:24,right:24,width:52,height:52,borderRadius:16,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center',shadowColor:Colors.primary,shadowOpacity:0.3,shadowOffset:{width:0,height:4},shadowRadius:12,elevation:6},
  loadingOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'center',alignItems:'center',zIndex:10},
});
