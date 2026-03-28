/**
 * Stock Opname Screen
 * Physical inventory count reconciliation
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import Colors from '../styles/colors';
import { getAllProducts } from '../database/queries/products';
import { createStockTransaction } from '../database/queries/transactions';

export default function StockOpnameScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (e) {
      Alert.alert('Error', 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (id, val) => {
    setCounts(prev => ({ ...prev, [id]: val }));
  };

  const getDiff = (product) => {
    const counted = parseFloat(counts[product.id]);
    if (isNaN(counted)) return null;
    return counted - product.current_stock;
  };

  const handleFinish = () => {
    const changedProducts = products.filter(p => {
      const counted = parseFloat(counts[p.id]);
      return !isNaN(counted) && counted !== p.current_stock;
    });

    if (changedProducts.length === 0) {
      Alert.alert('Info', 'Tidak ada perbedaan stok yang ditemukan');
      return;
    }

    Alert.alert(
      'Selesaikan Opname?',
      `${changedProducts.length} produk akan disesuaikan. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Selesaikan', onPress: () => doFinish(changedProducts) },
      ]
    );
  };

  const doFinish = async (changedProducts) => {
    try {
      setSaving(true);
      const today = new Date().toLocaleDateString('id-ID');
      for (const product of changedProducts) {
        const counted = parseFloat(counts[product.id]);
        await createStockTransaction(
          product.id,
          'ADJUST',
          counted,
          `Stock Opname ${today}`,
          null,
          null,
          null
        );
      }
      Toast.show({ type: 'success', text1: 'Opname Selesai', text2: `${changedProducts.length} produk disesuaikan` });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Gagal menyimpan opname');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }) => {
    const diff = getDiff(item);
    const hasDiff = diff !== null && diff !== 0;
    return (
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowStock}>Tercatat: {item.current_stock} {item.unit}</Text>
        </View>
        <TextInput
          style={[styles.countInput, hasDiff && { borderColor: diff > 0 ? Colors.success : Colors.danger }]}
          placeholder={String(item.current_stock)}
          placeholderTextColor={Colors.textLight}
          value={counts[item.id] || ''}
          onChangeText={(v) => handleCountChange(item.id, v)}
          keyboardType="numeric"
        />
        {diff !== null && (
          <View style={[styles.diffBadge, { backgroundColor: diff >= 0 ? Colors.successLight : Colors.dangerLight }]}>
            <Text style={[styles.diffText, { color: diff >= 0 ? Colors.success : Colors.danger }]}>
              {diff > 0 ? `+${diff}` : diff}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stock Opname</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <Text style={styles.hint}>Masukkan jumlah fisik untuk produk yang berbeda dari stok tercatat</Text>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finishBtn, saving && { opacity: 0.6 }]}
          onPress={handleFinish}
          disabled={saving}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={Colors.white} />
          <Text style={styles.finishText}>{saving ? 'Menyimpan...' : 'Selesaikan Opname'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.textDark },
  hint: { fontSize: 13, color: Colors.textSecondary, marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  rowStock: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  countInput: { width: 72, height: 38, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, textAlign: 'center', fontSize: 14, fontWeight: '600', color: Colors.textDark, backgroundColor: Colors.white },
  diffBadge: { width: 44, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diffText: { fontSize: 12, fontWeight: '700' },
  separator: { height: 1, backgroundColor: Colors.divider },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14 },
  finishText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
