/**
 * Item Detail Screen
 * Shows complete product information with actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../styles/colors';
import { getProductById, deleteProduct } from '../database/queries/products';

export default function ItemDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, []);

  // Reload product when screen comes into focus (after Stock In/Out)
  useFocusEffect(
    React.useCallback(() => {
      loadProduct();
    }, [productId])
  );

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await getProductById(productId);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Gagal memuat detail produk');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditItem', { productId: product.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Produk',
      `Yakin ingin menghapus "${product.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(productId);
              Alert.alert('Berhasil', 'Produk berhasil dihapus', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus produk');
            }
          },
        },
      ]
    );
  };

  const handleStockIn = () => {
    // Navigate to Stock In screen
    navigation.navigate('StockIn', { productId: product.id });
  };

  const handleStockOut = () => {
    // Navigate to Stock Out screen
    navigation.navigate('StockOut', { productId: product.id });
  };

  const formatCurrency = (value) => {
    if (!value || value === 0) return '-';
    return `Rp ${parseFloat(value).toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStockStatus = () => {
    if (!product) return { text: '-', color: Colors.textLight };
    
    if (product.current_stock <= product.min_stock_threshold) {
      return { text: 'Stok Rendah', color: '#EF4444' };
    } else if (product.current_stock <= product.min_stock_threshold * 1.5) {
      return { text: 'Stok Menipis', color: '#F59E0B' };
    } else {
      return { text: 'Stok Aman', color: '#10B981' };
    }
  };

  const calculateMargin = () => {
    if (!product || !product.purchase_price || !product.selling_price) return '-';
    const margin = product.selling_price - product.purchase_price;
    const percentage = ((margin / product.purchase_price) * 100).toFixed(0);
    return `${formatCurrency(margin)} (${percentage}%)`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Memuat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Produk tidak ditemukan</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Produk</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Product Image & Name */}
          <View style={styles.topSection}>
            {product.photo_uri ? (
              <Image source={{ uri: product.photo_uri }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>📦</Text>
              </View>
            )}

            <Text style={styles.productName}>{product.name}</Text>
            {product.sku && <Text style={styles.productSku}>SKU: {product.sku}</Text>}
            {product.barcode && <Text style={styles.productBarcode}>{product.barcode}</Text>}
          </View>

          {/* Stock Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 INFORMASI STOK</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stok Saat Ini</Text>
              <Text style={[styles.infoValue, { color: stockStatus.color, fontWeight: '700' }]}>
                {product.current_stock} {product.unit}
                {product.current_stock <= product.min_stock_threshold && ' ⚠️'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Minimum Stok</Text>
              <Text style={styles.infoValue}>
                {product.min_stock_threshold || 0} {product.unit}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, { color: stockStatus.color, fontWeight: '600' }]}>
                {stockStatus.text}
              </Text>
            </View>
          </View>

          {/* Price Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 HARGA</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Harga Beli</Text>
              <Text style={styles.infoValue}>{formatCurrency(product.purchase_price)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Harga Jual</Text>
              <Text style={[styles.infoValue, { color: Colors.cardBlue, fontWeight: '600' }]}>
                {formatCurrency(product.selling_price)}
              </Text>
            </View>

            {product.purchase_price && product.selling_price && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Margin</Text>
                <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '600' }]}>
                  {calculateMargin()}
                </Text>
              </View>
            )}
          </View>

          {/* Expiry Information */}
          {product.expiry_date && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ KADALUARSA</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tanggal Kadaluarsa</Text>
                <Text style={styles.infoValue}>{formatDate(product.expiry_date)}</Text>
              </View>
            </View>
          )}

          {/* Other Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 LAINNYA</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kategori</Text>
              <Text style={styles.infoValue}>
                {product.category_name ? `${product.category_icon || ''} ${product.category_name}` : '-'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ditambahkan</Text>
              <Text style={styles.infoValue}>{formatDate(product.created_at)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Terakhir Update</Text>
              <Text style={styles.infoValue}>{formatDate(product.updated_at)}</Text>
            </View>

            {product.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.infoLabel}>Catatan</Text>
                <Text style={styles.descriptionText}>{product.description}</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AKSI CEPAT</Text>

            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleStockIn}>
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionText}>Stok Masuk</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleStockOut}>
                <Text style={styles.actionIcon}>📤</Text>
                <Text style={styles.actionText}>Stok Keluar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
                <Text style={styles.actionIcon}>✏️</Text>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={handleDelete}
              >
                <Text style={styles.actionIcon}>🗑️</Text>
                <Text style={styles.actionText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textDark,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: Colors.cardBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 36,
    color: Colors.textDark,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
  },
  scroll: {
    flex: 1,
  },
  topSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePlaceholderIcon: {
    fontSize: 48,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  productSku: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 14,
    color: Colors.textLight,
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 15,
    color: Colors.textLight,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.textDark,
    fontWeight: '500',
  },
  descriptionContainer: {
    marginTop: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.textDark,
    marginTop: 8,
    lineHeight: 22,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
});
