/**
 * Inventory List Screen
 * Display all products with search, filter, and actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../styles/colors';
import {
  getAllProducts,
  searchProducts,
  getLowStockProducts,
  getNearExpiryProducts,
  deleteProduct,
} from '../database/queries/products';

export default function InventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'low', 'expiry'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load products when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  // Load products based on filter
  const loadProducts = async () => {
    setLoading(true);
    try {
      let data = [];
      
      switch (activeFilter) {
        case 'low':
          data = await getLowStockProducts();
          break;
        case 'expiry':
          data = await getNearExpiryProducts(30);
          break;
        default:
          data = await getAllProducts();
      }

      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  // Refresh products
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.barcode && product.barcode.includes(searchQuery))
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  // Handle filter change
  const changeFilter = (filter) => {
    setActiveFilter(filter);
    setSearchQuery('');
  };

  // Reload when filter changes
  useEffect(() => {
    loadProducts();
  }, [activeFilter]);

  // Navigate to Add Item
  const handleAddItem = () => {
    navigation.navigate('AddItem');
  };

  // Navigate to Item Detail
  const handleItemPress = (item) => {
    navigation.navigate('ItemDetail', { productId: item.id });
  };

  // Delete product with confirmation
  const handleDeleteItem = (item) => {
    Alert.alert(
      'Hapus Produk',
      `Yakin ingin menghapus "${item.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(item.id);
              Alert.alert('Berhasil', 'Produk berhasil dihapus');
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus produk');
            }
          },
        },
      ]
    );
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return 'Rp 0';
    return `Rp ${parseFloat(value).toLocaleString('id-ID')}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get stock status color
  const getStockColor = (product) => {
    if (product.is_low_stock) return '#EF4444';
    return '#10B981';
  };

  // Render product item
  const renderProduct = ({ item }) => {
    const isExpiring = item.is_near_expiry === 1;
    const isLowStock = item.is_low_stock === 1;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleDeleteItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          {item.photo_uri ? (
            <Image source={{ uri: item.photo_uri }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={styles.placeholderIcon}>📦</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          {item.sku && (
            <Text style={styles.productSku}>SKU: {item.sku}</Text>
          )}

          <View style={styles.productMeta}>
            <View style={styles.metaRow}>
              <Text style={[styles.stockText, { color: getStockColor(item) }]}>
                Stok: {item.current_stock} {item.unit}
              </Text>
              {isLowStock && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>⚠️ Low</Text>
                </View>
              )}
            </View>

            <Text style={styles.priceText}>
              {formatCurrency(item.selling_price)}
            </Text>

            {item.expiry_date && (
              <Text style={[styles.expiryText, isExpiring && styles.expiryWarning]}>
                Exp: {formatDate(item.expiry_date)}
                {isExpiring && ' ⏰'}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleItemPress(item)}
        >
          <Text style={styles.moreIcon}>›</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>Belum ada produk</Text>
      <Text style={styles.emptyText}>
        {activeFilter === 'all'
          ? 'Tambahkan produk pertama Anda'
          : activeFilter === 'low'
          ? 'Tidak ada produk dengan stok rendah'
          : 'Tidak ada produk yang akan kadaluarsa'}
      </Text>
      {activeFilter === 'all' && (
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddItem}>
          <Text style={styles.emptyButtonText}>+ Tambah Produk</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inventori</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk, SKU, atau barcode..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity
              style={styles.clearSearch}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'all' && styles.filterBtnActive]}
            onPress={() => changeFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              Semua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'low' && styles.filterBtnActive]}
            onPress={() => changeFilter('low')}
          >
            <Text style={[styles.filterText, activeFilter === 'low' && styles.filterTextActive]}>
              Stok Rendah
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'expiry' && styles.filterBtnActive]}
            onPress={() => changeFilter('expiry')}
          >
            <Text style={[styles.filterText, activeFilter === 'expiry' && styles.filterTextActive]}>
              Kadaluarsa
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product List */}
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* FAB - Floating Add Button */}
        {filteredProducts.length > 0 && (
          <TouchableOpacity style={styles.fab} onPress={handleAddItem}>
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textDark,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '300',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
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
  clearSearch: {
    padding: 4,
  },
  clearIcon: {
    color: Colors.textLight,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterBtnActive: {
    backgroundColor: Colors.cardBlue,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  filterTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  productImageContainer: {
    width: 70,
    height: 70,
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  productMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.cardBlue,
  },
  expiryText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  expiryWarning: {
    color: '#EF4444',
    fontWeight: '600',
  },
  moreButton: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    fontSize: 28,
    color: Colors.textLight,
    fontWeight: '300',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.cardBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.cardBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '300',
  },
});
