/**
 * Stock In Screen
 * Add stock to existing products
 */

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '../styles/colors';
import { getProductById } from '../database/queries/products';
import { createStockTransaction } from '../database/queries/transactions';
import { createNotification, NotificationTypes } from '../database/queries/notifications';

export default function StockInScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [enableBatchTracking, setEnableBatchTracking] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [batchExpiryDate, setBatchExpiryDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProduct();
  }, []);

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
      Alert.alert('Error', 'Masukkan jumlah stok yang akan ditambahkan');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Jumlah harus lebih besar dari 0');
      return;
    }

    // Validate batch fields if enabled
    if (enableBatchTracking) {
      if (!batchNumber || batchNumber.trim() === '') {
        Alert.alert('Error', 'Masukkan nomor batch');
        return;
      }
      if (!batchExpiryDate || batchExpiryDate.trim() === '') {
        Alert.alert('Error', 'Masukkan tanggal kadaluarsa batch');
        return;
      }
    }

    try {
      setSaving(true);

      await createStockTransaction(
        productId,
        'IN',
        qty,
        notes || 'Stok masuk',
        referenceNo || null,
        enableBatchTracking ? batchNumber : null,
        enableBatchTracking ? batchExpiryDate : null
      );

      // Create notification for stock in
      await createNotification(NotificationTypes.STOCK_IN, {
        productId: productId,
        productName: product.name,
        quantity: qty,
        details: { unit: product.unit }
      });

      const batchInfo = enableBatchTracking
        ? `\nBatch: ${batchNumber}\nKadaluarsa: ${formatDisplayDate(
            batchExpiryDate
          )}`
        : '';

      Alert.alert(
        'Berhasil',
        `Stok berhasil ditambahkan!\n\n${product.name}\n+${qty} ${product.unit}${batchInfo}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Go back and refresh the previous screen
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving stock in:', error);
      Alert.alert('Error', error.message || 'Gagal menambah stok');
    } finally {
      setSaving(false);
    }
  };

  const getNewStock = () => {
    if (!product || !quantity) return product?.current_stock || 0;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return product.current_stock;
    return product.current_stock + qty;
  };

  const formatNumber = (value) => {
    if (!value) return '0';
    return parseFloat(value).toLocaleString('id-ID');
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (date) {
      setSelectedDate(date);
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setBatchExpiryDate(formattedDate);
    }
  };

  const openDatePicker = () => {
    // If there's already a date set, use it, otherwise use today
    if (batchExpiryDate) {
      const [year, month, day] = batchExpiryDate.split('-');
      setSelectedDate(new Date(year, month - 1, day));
    }
    setShowDatePicker(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.cardBlue} />
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

  const showPreview = quantity && parseFloat(quantity) > 0 && !isNaN(parseFloat(quantity));

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
              <Text style={styles.backButtonText}>← Kembali</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Stok Masuk</Text>
            <Text style={styles.subtitle}>Tambah stok produk</Text>
          </View>

          {/* Product Info Card */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📦 Produk</Text>
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
                  <Text style={styles.stockLabel}>Stok Saat Ini</Text>
                  <Text style={styles.stockValue}>
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

          {/* Quantity Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>➕ Jumlah Stok Masuk</Text>
            <View style={styles.inputContainer}>
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
            <Text style={styles.inputHint}>
              Masukkan jumlah stok yang ingin ditambahkan
            </Text>
          </View>

          {/* Stock Preview */}
          {showPreview && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📊 Pratinjau</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Stok Sebelum</Text>
                    <Text style={styles.previewValueBefore}>
                      {formatNumber(product.current_stock)}
                    </Text>
                    <Text style={styles.previewUnit}>{product.unit}</Text>
                  </View>

                  <View style={styles.previewArrow}>
                    <Text style={styles.previewArrowText}>→</Text>
                    <Text style={styles.previewArrowLabel}>
                      +{formatNumber(parseFloat(quantity))}
                    </Text>
                  </View>

                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Stok Sesudah</Text>
                    <Text style={styles.previewValueAfter}>
                      {formatNumber(getNewStock())}
                    </Text>
                    <Text style={styles.previewUnit}>{product.unit}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Reference Number (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🔢 No. Referensi (Opsional)</Text>
            <TextInput
              style={styles.input}
              value={referenceNo}
              onChangeText={setReferenceNo}
              placeholder="Contoh: PO-2024-001"
              placeholderTextColor={Colors.textLight}
              returnKeyType="done"
            />
            <Text style={styles.inputHint}>
              No. PO, Invoice, atau referensi lainnya
            </Text>
          </View>

          {/* Batch Tracking */}
          <View style={styles.section}>
            <View style={styles.batchToggle}>
              <View style={styles.batchToggleLeft}>
                <Text style={styles.sectionLabel}>📦 Lacak Batch & Kadaluarsa</Text>
                <Text style={styles.batchToggleHint}>
                  Aktifkan untuk melacak tanggal kadaluarsa per batch
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  enableBatchTracking && styles.toggleActive,
                ]}
                onPress={() => setEnableBatchTracking(!enableBatchTracking)}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    enableBatchTracking && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {enableBatchTracking && (
              <View style={styles.batchFields}>
                {/* Batch Number */}
                <View style={styles.batchFieldRow}>
                  <Text style={styles.batchFieldLabel}>Nomor Batch</Text>
                  <TextInput
                    style={styles.input}
                    value={batchNumber}
                    onChangeText={setBatchNumber}
                    placeholder="Contoh: BATCH-001"
                    placeholderTextColor={Colors.textLight}
                    returnKeyType="done"
                  />
                </View>

                {/* Expiry Date */}
                <View style={styles.batchFieldRow}>
                  <Text style={styles.batchFieldLabel}>Tanggal Kadaluarsa</Text>
                  <TouchableOpacity
                    style={styles.batchDatePickerButton}
                    onPress={openDatePicker}
                    activeOpacity={0.7}
                  >
                    <View style={styles.datePickerContent}>
                      <Text style={styles.batchDatePickerIcon}>📅</Text>
                      <Text style={[styles.batchDatePickerText, batchExpiryDate && styles.batchDatePickerTextSelected]}>
                        {batchExpiryDate ? formatDisplayDate(batchExpiryDate) : 'Ketuk untuk pilih tanggal'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Date Picker Modal */}
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}

                {batchExpiryDate && (
                  <View style={styles.expiryPreview}>
                    <Text style={styles.expiryPreviewLabel}>
                      ✅ Dipilih: {formatDisplayDate(batchExpiryDate)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📝 Catatan (Opsional)</Text>
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

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (saving || !showPreview) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || !showPreview}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>✓ Simpan Stok Masuk</Text>
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
    color: Colors.cardBlue,
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
    borderRadius: 12,
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
  stockValueSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBlue,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingRight: 16,
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

  // Preview
  previewCard: {
    padding: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
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
    color: '#059669',
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
    color: '#10B981',
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
    color: '#10B981',
    fontWeight: '700',
  },
  previewArrowLabel: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },

  // Buttons
  buttonContainer: {
    padding: 20,
  },
  saveButton: {
    padding: 18,
    backgroundColor: Colors.cardBlue,
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

  // Batch Tracking
  batchToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  batchToggleLeft: {
    flex: 1,
    marginRight: 16,
  },
  batchToggleHint: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.divider,
    padding: 3,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.cardBlue,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  batchFields: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  batchFieldRow: {
    marginBottom: 16,
  },
  batchFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  expiryPreview: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  expiryPreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },

  // Batch Date Picker Button - Enhanced styling
  batchDatePickerButton: {
    backgroundColor: '#10B981', // Success green for Stock In
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchDatePickerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  batchDatePickerText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  batchDatePickerTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
});
