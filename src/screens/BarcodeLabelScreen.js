/**
 * Barcode Label Generator Screen
 * Generate printable barcode labels for products
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../styles/colors';
import { getProductById } from '../database/queries/products';
import Barcode from 'react-native-barcode-builder';
import ViewShot from 'react-native-view-shot';

export default function BarcodeLabelScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [labelSize, setLabelSize] = useState('medium'); // small, medium, large
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128'); // CODE128, EAN13
  const viewShotRef = useRef();

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    try {
      const data = await getProductById(productId);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Gagal memuat data produk');
      navigation.goBack();
    }
  };

  const formatCurrency = (value) => {
    if (!value || value === 0) return 'Rp 0';
    return `Rp ${parseFloat(value).toLocaleString('id-ID')}`;
  };

  const handleCaptureAndShare = async () => {
    try {
      if (!viewShotRef.current || !viewShotRef.current.capture) {
        Alert.alert('Error', 'Tidak dapat menangkap gambar label');
        return;
      }

      const uri = await viewShotRef.current.capture();
      
      await Share.share({
        url: uri,
        message: `Label Barcode - ${product.name}`,
      });
    } catch (error) {
      console.error('Error sharing label:', error);
      Alert.alert('Error', 'Gagal membagikan label');
    }
  };

  const handleGeneratePDF = () => {
    Alert.alert(
      'Coming Soon',
      'Fitur export PDF akan segera hadir. Untuk sementara gunakan opsi Bagikan untuk menyimpan sebagai gambar.'
    );
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Memuat produk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use barcode or SKU or product ID for barcode generation
  const barcodeValue = product.barcode || product.sku || String(product.id).padStart(8, '0');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Label Barcode</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Preview Section */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>👁️ Preview Label</Text>
          
          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
            <View style={[
              styles.labelContainer,
              labelSize === 'large' && styles.labelFull,
            ]}>
              <Text style={styles.labelProductName} numberOfLines={2}>
                {product.name}
              </Text>
              
              <View style={styles.labelPriceRow}>
                <Text style={styles.labelPrice}>
                  {formatCurrency(product.selling_price)}
                </Text>
                <Text style={styles.labelUnit}>/{product.unit}</Text>
              </View>

              {barcodeValue && (
                <View style={{ marginVertical: 12 }}>
                  <Barcode
                    value={barcodeValue}
                    format={barcodeFormat}
                    width={labelSize === 'small' ? 1.5 : labelSize === 'medium' ? 2 : 2.5}
                    height={labelSize === 'small' ? 40 : labelSize === 'medium' ? 50 : 60}
                    text={barcodeValue}
                    textStyle={{ fontSize: 10 }}
                  />
                </View>
              )}

              {product.sku && (
                <Text style={styles.labelSKU}>SKU: {product.sku}</Text>
              )}
            </View>
          </ViewShot>
        </View>

        {/* Label Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Ukuran Label</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.option, labelSize === 'small' && styles.optionActive]}
              onPress={() => setLabelSize('small')}
            >
              <Text style={[styles.optionText, labelSize === 'small' && styles.optionTextActive]}>
                Kecil
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, labelSize === 'medium' && styles.optionActive]}
              onPress={() => setLabelSize('medium')}
            >
              <Text style={[styles.optionText, labelSize === 'medium' && styles.optionTextActive]}>
                Sedang
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, labelSize === 'large' && styles.optionActive]}
              onPress={() => setLabelSize('large')}
            >
              <Text style={[styles.optionText, labelSize === 'large' && styles.optionTextActive]}>
                Besar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barcode Format */}
        {product.barcode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔢 Format Barcode</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.option, barcodeFormat === 'CODE128' && styles.optionActive]}
                onPress={() => setBarcodeFormat('CODE128')}
              >
                <Text style={[styles.optionText, barcodeFormat === 'CODE128' && styles.optionTextActive]}>
                  CODE128
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.option, barcodeFormat === 'EAN13' && styles.optionActive]}
                onPress={() => setBarcodeFormat('EAN13')}
              >
                <Text style={[styles.optionText, barcodeFormat === 'EAN13' && styles.optionTextActive]}>
                  EAN-13
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCaptureAndShare}
          >
            <Text style={styles.actionButtonText}>📤 Bagikan Label</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={handleGeneratePDF}
          >
            <Text style={styles.actionButtonTextSecondary}>📄 Export PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 14,
    color: Colors.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  previewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  labelContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  labelFull: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  labelProductName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  labelPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  labelPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  labelUnit: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 4,
  },
  barcodeText: {
    fontSize: 12,
    color: Colors.textDark,
    marginTop: 4,
  },
  labelSKU: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  optionTextActive: {
    color: Colors.white,
  },
  actionsSection: {
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});
