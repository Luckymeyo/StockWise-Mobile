/**
 * Edit Item Screen
 * Complete form for editing existing products with photo support
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '../styles/colors';
import { unitOptions } from '../database/schema';
import { getProductById, updateProduct, getAllCategories } from '../database/queries/products';
import PickerModal from '../components/PickerModal';
import { createNotification, NotificationTypes } from '../database/queries/notifications';
import { showImagePickerOptions } from '../services/ImagePickerService';

export default function EditItemScreen({ route, navigation }) {
  const { productId } = route.params;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: null,
    description: '',
    photo_uri: null,
    purchase_price: '',
    selling_price: '',
    current_stock: '',
    unit: 'pcs',
    min_stock_threshold: '',
    expiry_date: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Picker states
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [categories, setCategories] = useState([]);

  // Load product data on mount
  useEffect(() => {
    loadProductData();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const allCategories = await getAllCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProductData = async () => {
    try {
      setLoading(true);
      const product = await getProductById(productId);
      
      if (!product) {
        Alert.alert('Error', 'Produk tidak ditemukan');
        navigation.goBack();
        return;
      }

      // Pre-fill form with product data
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category_id: product.category_id || null,
        description: product.description || '',
        photo_uri: product.photo_uri || null,
        purchase_price: product.purchase_price ? String(product.purchase_price) : '',
        selling_price: product.selling_price ? String(product.selling_price) : '',
        current_stock: product.current_stock ? String(product.current_stock) : '',
        unit: product.unit || 'pcs',
        min_stock_threshold: product.min_stock_threshold ? String(product.min_stock_threshold) : '',
        expiry_date: product.expiry_date || '',
      });
      
      // Set date picker date if expiry exists
      if (product.expiry_date) {
        const [year, month, day] = product.expiry_date.split('-');
        setSelectedDate(new Date(year, month - 1, day));
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Gagal memuat data produk');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama produk wajib diisi';
    }

    // Validate purchase price is not negative
    if (formData.purchase_price && parseFloat(formData.purchase_price) < 0) {
      newErrors.purchase_price = 'Harga beli tidak boleh negatif';
    }

    // Validate selling price is not negative
    if (formData.selling_price && parseFloat(formData.selling_price) < 0) {
      newErrors.selling_price = 'Harga jual tidak boleh negatif';
    }

    // Validate selling price is not lower than purchase price
    if (formData.selling_price && parseFloat(formData.selling_price) < parseFloat(formData.purchase_price)) {
      newErrors.selling_price = 'Harga jual tidak boleh lebih rendah dari harga beli';
    }

    // Validate current stock is not negative
    if (formData.current_stock && parseFloat(formData.current_stock) < 0) {
      newErrors.current_stock = 'Stok tidak boleh negatif';
    }

    // Validate minimum stock threshold is not negative
    if (formData.min_stock_threshold && parseFloat(formData.min_stock_threshold) < 0) {
      newErrors.min_stock_threshold = 'Minimum stok tidak boleh negatif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save product
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Mohon lengkapi form dengan benar');
      return;
    }

    setSaving(true);

    try {
      const productData = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        current_stock: parseFloat(formData.current_stock) || 0,
        min_stock_threshold: parseFloat(formData.min_stock_threshold) || 0,
      };

      await updateProduct(productId, productData);

      await createNotification(NotificationTypes.PRODUCT_EDITED, {
        productId: productId,
        productName: productData.name,
      });

      Alert.alert('Berhasil', 'Produk berhasil diperbarui', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Gagal memperbarui produk: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Open barcode scanner
  const openBarcodeScanner = () => {
    navigation.navigate('BarcodeScanner', {
      onScan: (barcode) => {
        handleChange('barcode', barcode);
      },
    });
  };

  // Open camera for photo - NOW FUNCTIONAL!
  const openCamera = () => {
    showImagePickerOptions((photoUri) => {
      handleChange('photo_uri', photoUri);
    });
  };

  // Remove photo
  const removePhoto = () => {
    handleChange('photo_uri', null);
  };

  // Format date display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Handle date change
  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (date) {
      setSelectedDate(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      handleChange('expiry_date', formattedDate);
    }
  };

  // Open date picker
  const openDatePicker = () => {
    if (formData.expiry_date) {
      const [year, month, day] = formData.expiry_date.split('-');
      setSelectedDate(new Date(year, month - 1, day));
    }
    setShowDatePicker(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat data produk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Produk</Text>
          </View>

          {/* Photo Preview Section */}
          {formData.photo_uri && (
            <View style={styles.photoSection}>
              <Image 
                source={{ uri: formData.photo_uri }} 
                style={styles.photoPreview}
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.removePhotoBtn}
                onPress={removePhoto}
              >
                <Text style={styles.removePhotoText}>❌ Hapus Foto</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Photo & Barcode Section */}
          <View style={styles.section}>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtn} onPress={openCamera}>
                <Text style={styles.actionIcon}>📷</Text>
                <Text style={styles.actionLabel}>
                  {formData.photo_uri ? 'Ganti Foto' : 'Tambah Foto'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={openBarcodeScanner}>
                <Text style={styles.actionIcon}>📱</Text>
                <Text style={styles.actionLabel}>Scan Barcode</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Produk */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 INFO PRODUK</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nama Produk <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Contoh: Indomie Goreng"
                placeholderTextColor="#9CA3AF"
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SKU</Text>
              <TextInput
                style={styles.input}
                placeholder="Stock Keeping Unit (opsional)"
                placeholderTextColor="#9CA3AF"
                value={formData.sku}
                onChangeText={(text) => handleChange('sku', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Barcode</Text>
              <View style={styles.barcodeInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Scan atau input manual"
                  placeholderTextColor="#9CA3AF"
                  value={formData.barcode}
                  onChangeText={(text) => handleChange('barcode', text)}
                  keyboardType="numeric"
                />
                {formData.barcode ? (
                  <TouchableOpacity 
                    style={styles.clearBtn}
                    onPress={() => handleChange('barcode', '')}
                  >
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kategori</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={styles.pickerText}>
                  {formData.category_id 
                    ? categories.find(c => c.id === formData.category_id)?.icon + ' ' + categories.find(c => c.id === formData.category_id)?.name
                    : 'Pilih Kategori'}
                </Text>
                <Text style={styles.pickerIcon}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Harga & Stok */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 HARGA & STOK</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Harga Beli</Text>
              <View style={styles.priceInput}>
                <Text style={styles.currencyLabel}>Rp</Text>
                <TextInput
                  style={[
                    styles.input, 
                    styles.priceInputField,
                    errors.purchase_price && styles.inputError
                  ]}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={formData.purchase_price}
                  onChangeText={(text) => handleChange('purchase_price', text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
              {errors.purchase_price && (
                <Text style={styles.errorText}>{errors.purchase_price}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Harga Jual</Text>
              <View style={styles.priceInput}>
                <Text style={styles.currencyLabel}>Rp</Text>
                <TextInput
                  style={[
                    styles.input, 
                    styles.priceInputField,
                    errors.selling_price && styles.inputError
                  ]}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={formData.selling_price}
                  onChangeText={(text) => handleChange('selling_price', text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
              {errors.selling_price && (
                <Text style={styles.errorText}>{errors.selling_price}</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Stok Saat Ini</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={formData.current_stock}
                  onChangeText={(text) => handleChange('current_stock', text.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                  editable={false}
                />
                <Text style={styles.hint}>
                  Gunakan Stok Masuk/Keluar untuk mengubah stok
                </Text>
              </View>

              <View style={{ width: 12 }} />

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Satuan</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowUnitPicker(true)}
                >
                  <Text style={styles.pickerText}>
                    {unitOptions.find(u => u.value === formData.unit)?.label || 'Pcs'}
                  </Text>
                  <Text style={styles.pickerIcon}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Peringatan */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ PERINGATAN</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minimum Stok (Alert)</Text>
              <TextInput
                style={[styles.input, errors.min_stock_threshold && styles.inputError]}
                placeholder="Contoh: 10"
                placeholderTextColor="#9CA3AF"
                value={formData.min_stock_threshold}
                onChangeText={(text) => handleChange('min_stock_threshold', text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
              {errors.min_stock_threshold && (
                <Text style={styles.errorText}>{errors.min_stock_threshold}</Text>
              )}
              <Text style={styles.hint}>
                Anda akan mendapat notifikasi jika stok mencapai angka ini
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tanggal Kadaluarsa</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={openDatePicker}
                activeOpacity={0.7}
              >
                <View style={styles.datePickerContent}>
                  <Text style={styles.datePickerIcon}>📅</Text>
                  <Text style={[styles.datePickerText, formData.expiry_date && styles.datePickerTextSelected]}>
                    {formData.expiry_date ? formatDisplayDate(formData.expiry_date) : 'Ketuk untuk pilih tanggal'}
                  </Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.hint}>Opsional - untuk produk yang memiliki kadaluarsa</Text>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Catatan */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 CATATAN</Text>

            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Catatan tambahan (opsional)"
                placeholderTextColor="#9CA3AF"
                value={formData.description}
                onChangeText={(text) => handleChange('description', text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelText}>Batal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <PickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={(category) => handleChange('category_id', category.id)}
        options={categories}
        selectedValue={formData.category_id}
        title="Pilih Kategori"
        showIcon={true}
      />

      {/* Unit Picker Modal */}
      <PickerModal
        visible={showUnitPicker}
        onClose={() => setShowUnitPicker(false)}
        onSelect={(unit) => handleChange('unit', unit.value)}
        options={unitOptions}
        selectedValue={formData.unit}
        title="Pilih Satuan"
        showIcon={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
  },
  photoSection: {
    backgroundColor: Colors.white,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removePhotoBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removePhotoText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.cardBlue,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textDark,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: Colors.textLight,
    fontSize: 12,
    marginTop: 4,
  },
  barcodeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  clearIcon: {
    fontSize: 18,
    color: Colors.textLight,
  },
  pickerButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 15,
    color: Colors.textDark,
  },
  pickerIcon: {
    fontSize: 12,
    color: Colors.textLight,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyLabel: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
  },
  priceInputField: {
    paddingLeft: 42,
  },
  row: {
    flexDirection: 'row',
  },
  datePickerButton: {
    backgroundColor: Colors.cardBlue,
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
  datePickerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  datePickerTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.cardBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
