/**
 * Dead Stock / Aging Report Screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../styles/colors';
import { getDeadStockProducts } from '../database/queries/transactions';

const DAYS_OPTIONS = [30, 60, 90];

export default function DeadStockScreen({ navigation }) {
  const [selectedDays, setSelectedDays] = useState(30);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadData(); }, [selectedDays]));

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getDeadStockProducts(selectedDays);
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return 'Belum pernah';
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (v) => `Rp ${Math.round(v || 0).toLocaleString('id-ID')}`;

  const totalValue = products.reduce((s, p) => s + (p.current_stock || 0) * (p.purchase_price || 0), 0);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.stockValue}>{formatCurrency((item.current_stock || 0) * (item.purchase_price || 0))}</Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.meta}>
          <MaterialCommunityIcons name="clock-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>Terakhir: {formatDate(item.last_movement)}</Text>
        </View>
        <Text style={styles.stockText}>Stok: {item.current_stock} {item.unit}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stok Tidak Bergerak</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Day filter chips */}
      <View style={styles.chipRow}>
        {DAYS_OPTIONS.map(d => (
          <TouchableOpacity key={d}
            style={[styles.chip, selectedDays === d && styles.chipActive]}
            onPress={() => setSelectedDays(d)}>
            <Text style={[styles.chipText, selectedDays === d && styles.chipTextActive]}>{d} Hari</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="check-circle-outline" size={52} color={Colors.success} />
              <Text style={styles.emptyText}>Tidak ada stok yang tidak bergerak dalam {selectedDays} hari terakhir</Text>
            </View>
          }
          ListFooterComponent={
            products.length > 0 ? (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Nilai Stok Tidak Bergerak</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalValue)}</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.textDark },
  chipRow: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textDark, marginRight: 8 },
  stockValue: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  stockText: { fontSize: 12, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
  totalCard: { backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 16, marginTop: 8, alignItems: 'center' },
  totalLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  totalValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
});
