// Stock out screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../styles/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getProductById } from '../database/queries/products';
import { createStockTransaction } from '../database/queries/transactions';
import { createNotification, NotificationTypes } from '../database/queries/notifications';
import { getProductBatches } from '../database/batchTracking';
import { createCreditSale } from '../database/queries/creditSales';
import { getAllSettings } from '../database/queries/businessSettings';
import Toast from 'react-native-toast-message';

export default function StockOutScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('Terjual'); // Default reason
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountMode, setDiscountMode] = useState('rp'); // 'rp' or '%'
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [bizSettings, setBizSettings] = useState({ business_name: 'Toko Saya', currency: 'Rp' });

  const reasons = [
    { value: 'Terjual', label: 'Terjual', color: Colors.success },
    { value: 'Rusak', label: '💔 Rusak', color: Colors.warning },
    { value: 'Kadaluarsa', label: 'Kadaluarsa', color: Colors.danger },
    { value: 'Hilang', label: 'Hilang', color: Colors.textSecondary },
    { value: 'Lainnya', label: 'Lainnya', color: Colors.textSecondary },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProduct(); loadBizSettings(); }, []);

  const loadBizSettings = async () => {
    try { const s = await getAllSettings(); setBizSettings(s); } catch (e) {}
  };

  const getDiscountRp = () => {
    const qty = parseFloat(quantity) || 0;
    const price = product?.selling_price || 0;
    const total = qty * price;
    const d = parseFloat(discountAmount) || 0;
    if (discountMode === '%') return total * (d / 100);
    return Math.min(d, total);
  };

  const getFinalTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const price = product?.selling_price || 0;
    return Math.max(0, qty * price - getDiscountRp());
  };

  const shareReceipt = async (txId) => {
    const qty = parseFloat(quantity) || 0;
    const price = product?.selling_price || 0;
    const discRp = getDiscountRp();
    const total = getFinalTotal();
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const receipt = `=== STRUK PENJUALAN ===\n${bizSettings.business_name}\n${dateStr}\n----------------------\n${product.name}\nQty: ${qty} ${product.unit}\nHarga: ${bizSettings.currency} ${price.toLocaleString('id-ID')}\nDiskon: ${bizSettings.currency} ${Math.round(discRp).toLocaleString('id-ID')}\n----------------------\nTOTAL: ${bizSettings.currency} ${Math.round(total).toLocaleString('id-ID')}\n======================\nTerima kasih!`;
    try { await Share.share({ message: receipt }); } catch (e) {}
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await getProductById(productId);
      if (!data) {
        Alert.alert('Error', 'Produk tidak ditemukan');
        navigation.goBack();
        return;
      }
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!quantity || quantity.trim() === '') {
      Alert.alert('Error', 'Masukkan jumlah stok yang akan dikurangi');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Jumlah harus lebih besar dari 0');
      return;
    }

    if (qty > product.current_stock) {
      Alert.alert(
        'Error',
        `Stok tidak mencukupi!\n\nStok tersedia: ${product.current_stock} ${product.unit}\nYang akan dikurangi: ${qty} ${product.unit}`
      );
      return;
    }

    try {
      setSaving(true);

      const transactionNotes = `${reason}${notes ? ` - ${notes}` : ''}`;

      // FIFO: check if there are tracked batches for this product.
      // If so, deduct from oldest-expiry batches first; otherwise fall back
      // to a single un-batched OUT transaction.
      const batches = await getProductBatches(productId);

      if (batches && batches.length > 0) {
        // Deduct across batches ordered by expiry date ascending (oldest first)
        let remaining = qty;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, batch.current_quantity);
          remaining -= deduct;
          await createStockTransaction(
            productId,
            'OUT',
            deduct,
            transactionNotes,
            null,
            batch.batch_number,
            batch.batch_expiry_date
          );
        }
      } else {
        // No batch tracking — single OUT transaction
        await createStockTransaction(
          productId,
          'OUT',
          qty,
          transactionNotes,
          null
        );
      }

      // Create notification for stock out
      await createNotification(NotificationTypes.STOCK_OUT, {
        productId: productId,
        productName: product.name,
        quantity: qty,
        details: { unit: product.unit }
      });

      // Check if product is now low stock and create alert
      const newStock = product.current_stock - qty;
      if (product.min_stock_threshold > 0 && newStock <= product.min_stock_threshold) {
        await createNotification(NotificationTypes.LOW_STOCK, {
          productId: productId,
          productName: product.name,
          quantity: newStock,
          details: { unit: product.unit }
        });
      }

      // Create credit sale if toggled
      let lastTxId = null;
      // Get the last inserted transaction id (approximation — use last tx for this product)
      const { getProductTransactions } = require('../database/queries/transactions');
      const recentTxs = await getProductTransactions(productId, 1);
      if (recentTxs.length > 0) lastTxId = recentTxs[0].id;

      if (isCreditSale && buyerName.trim()) {
        await createCreditSale(lastTxId, buyerName.trim(), getFinalTotal(), dueDate || null, notes || null);
      }

      Toast.show({ type: 'success', text1: 'Berhasil', text2: `${product.name} -${qty} ${product.unit}` });

      // Offer receipt
      Alert.alert('Stok Keluar Berhasil', 'Bagikan struk ke pelanggan?', [
        { text: 'Tidak', onPress: () => navigation.goBack() },
        { text: 'Bagikan Struk', onPress: async () => { await shareReceipt(lastTxId); navigation.goBack(); } },
      ]);
    } catch (error) {
      console.error('Error saving stock out:', error);
      Alert.alert('Error', error.message || 'Gagal mengurangi stok');
    } finally {
      setSaving(false);
    }
  };

  const getNewStock = () => {
    if (!product || !quantity) return product?.current_stock || 0;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return product.current_stock;
    return Math.max(0, product.current_stock - qty);
  };

  const formatNumber = (value) => {
    if (!value) return '0';
    return parseFloat(value).toLocaleString('id-ID');
  };

  const isStockInsufficient = () => {
    if (!quantity || !product) return false;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return false;
    return qty > product.current_stock;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Produk tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showPreview =
    quantity && parseFloat(quantity) > 0 && !isNaN(parseFloat(quantity));
  const insufficient = isStockInsufficient();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={Colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.title}>Stok Keluar</Text>
            <Text style={styles.subtitle}>Kurangi stok produk</Text>
          </View>

          {/* Product Info Card */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Produk</Text>
            <View style={styles.productCard}>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.category_name && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>
                      {product.category_icon} {product.category_name}
                    </Text>
                  </View>
                )}
              </View>
              {product.sku && (
                <Text style={styles.productSku}>SKU: {product.sku}</Text>
              )}
              <View style={styles.stockInfoRow}>
                <View style={styles.stockInfo}>
                  <Text style={styles.stockLabel}>Stok Tersedia</Text>
                  <Text
                    style={[
                      styles.stockValue,
                      product.current_stock <= product.min_stock_threshold &&
                        styles.stockValueLow,
                    ]}
                  >
                    {formatNumber(product.current_stock)} {product.unit}
                  </Text>
                </View>
                {product.min_stock_threshold > 0 && (
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockLabel}>Min. Stok</Text>
                    <Text style={styles.stockValueSmall}>
                      {formatNumber(product.min_stock_threshold)} {product.unit}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Reason Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Alasan Stok Keluar</Text>
            <View style={styles.reasonGrid}>
              {reasons.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.reasonButton,
                    reason === item.value && styles.reasonButtonActive,
                    reason === item.value && { borderColor: item.color },
                  ]}
                  onPress={() => setReason(item.value)}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      reason === item.value && styles.reasonTextActive,
                      reason === item.value && { color: item.color },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>➖ Jumlah Stok Keluar</Text>
            <View
              style={[
                styles.inputContainer,
                insufficient && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.inputUnit}>{product.unit}</Text>
            </View>
            {insufficient ? (
              <Text style={styles.inputError}>
                Stok tidak mencukupi! Tersedia: {product.current_stock}{' '}
                {product.unit}
              </Text>
            ) : (
              <Text style={styles.inputHint}>
                Masukkan jumlah stok yang ingin dikurangi
              </Text>
            )}
          </View>

          {/* Stock Preview */}
          {showPreview && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Pratinjau</Text>
              <View
                style={[
                  styles.previewCard,
                  insufficient && styles.previewCardError,
                ]}
              >
                <View style={styles.previewRow}>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Stok Sebelum</Text>
                    <Text style={styles.previewValueBefore}>
                      {formatNumber(product.current_stock)}
                    </Text>
                    <Text style={styles.previewUnit}>{product.unit}</Text>
                  </View>

                  <View style={styles.previewArrow}>
                    <Text
                      style={[
                        styles.previewArrowText,
                        insufficient && styles.previewArrowTextError,
                      ]}
                    >
                      →
                    </Text>
                    <Text
                      style={[
                        styles.previewArrowLabel,
                        insufficient && styles.previewArrowLabelError,
                      ]}
                    >
                      -{formatNumber(parseFloat(quantity))}
                    </Text>
                  </View>

                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Stok Sesudah</Text>
                    <Text
                      style={[
                        styles.previewValueAfter,
                        insufficient && styles.previewValueAfterError,
                      ]}
                    >
                      {formatNumber(getNewStock())}
                    </Text>
                    <Text style={styles.previewUnit}>{product.unit}</Text>
                  </View>
                </View>

                {insufficient && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      Jumlah melebihi stok yang tersedia
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Catatan Tambahan (Opsional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Tambahkan catatan..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
            />
          </View>

          {/* Discount */}
          {reason === 'Terjual' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Diskon (Opsional)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.modeBtn, discountMode==='rp' && styles.modeBtnActive]} onPress={() => setDiscountMode('rp')}>
                  <Text style={[styles.modeBtnText, discountMode==='rp' && styles.modeBtnTextActive]}>Rp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn, discountMode==='%' && styles.modeBtnActive]} onPress={() => setDiscountMode('%')}>
                  <Text style={[styles.modeBtnText, discountMode==='%' && styles.modeBtnTextActive]}>%</Text>
                </TouchableOpacity>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <TextInput style={styles.input} value={discountAmount} onChangeText={setDiscountAmount} placeholder="0" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
                  <Text style={styles.inputUnit}>{discountMode}</Text>
                </View>
              </View>
              {parseFloat(discountAmount) > 0 && quantity && (
                <Text style={{ fontSize: 13, color: Colors.success, marginTop: 6, fontWeight: '600' }}>
                  Total: Rp {Math.round(getFinalTotal()).toLocaleString('id-ID')}
                </Text>
              )}
            </View>
          )}

          {/* Credit / Hutang */}
          {reason === 'Terjual' && (
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sectionLabel}>Catat sebagai Hutang</Text>
                <Switch value={isCreditSale} onValueChange={setIsCreditSale} trackColor={{ true: Colors.primary }} />
              </View>
              {isCreditSale && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} value={buyerName} onChangeText={setBuyerName} placeholder="Nama pembeli (wajib)" placeholderTextColor={Colors.textLight} />
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="Jatuh tempo (DD/MM/YYYY)" placeholderTextColor={Colors.textLight} />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (saving || !showPreview || insufficient) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || !showPreview || insufficient}
            >
              {saving ? (
                <ActivityIndicator color={Colors.textDark} />
              ) : (
                <Text style={styles.saveButtonText}>✓ Simpan Stok Keluar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingBottom: 40,
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
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
  },

  // Header
  header: {
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textLight,
  },

  // Section
  section: {
    padding: 20,
    backgroundColor: Colors.white,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },

  // Product Card
  productCard: {
    padding: 16,
    backgroundColor: Colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginRight: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  productSku: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 12,
  },
  stockInfoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stockInfo: {
    flex: 1,
  },
  stockLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textDark,
  },
  stockValueLow: {
    color: Colors.danger,
  },
  stockValueSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },

  // Reason Selector
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  reasonButtonActive: {
    backgroundColor: Colors.dangerBg,
    borderWidth: 2,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  reasonTextActive: {
    fontWeight: '700',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.danger,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingRight: 16,
  },
  inputContainerError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerBg,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    color: Colors.textDark,
    fontWeight: '600',
  },
  inputUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 12,
    height: 90,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  inputHint: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textLight,
  },
  inputError: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
  },

  // Preview
  previewCard: {
    padding: 20,
    backgroundColor: Colors.dangerBg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.danger,
  },
  previewCardError: {
    backgroundColor: '#FEE',
    borderColor: Colors.danger,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewItem: {
    alignItems: 'center',
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
    color: Colors.danger,
    marginBottom: 8,
    fontWeight: '600',
  },
  previewValueBefore: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textLight,
  },
  previewValueAfter: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.danger,
  },
  previewValueAfterError: {
    color: Colors.danger,
  },
  previewUnit: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  previewArrow: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  previewArrowText: {
    fontSize: 32,
    color: Colors.danger,
    fontWeight: '700',
  },
  previewArrowTextError: {
    color: Colors.danger,
  },
  previewArrowLabel: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
    marginTop: 4,
  },
  previewArrowLabelError: {
    color: Colors.danger,
  },
  warningBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.dangerLight,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Buttons
  buttonContainer: {
    padding: 20,
  },
  saveButton: {
    padding: 18,
    backgroundColor: Colors.danger,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  cancelButton: {
    padding: 18,
    backgroundColor: Colors.white,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },

  modeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.white },
});
