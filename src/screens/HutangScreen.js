/**
 * Hutang / Credit Sales Screen
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import Colors from '../styles/colors';
import {
  getUnpaidCredits,
  getAllCredits,
  markCreditPaid,
  getTotalOutstanding,
  createCreditSale,
} from '../database/queries/creditSales';

export default function HutangScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' | 'all'
  const [credits, setCredits] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ buyer_name: '', total_amount: '', due_date: '', notes: '' });

  useFocusEffect(useCallback(() => { loadData(); }, [activeTab]));

  const loadData = async () => {
    try {
      const data = activeTab === 'unpaid' ? await getUnpaidCredits() : await getAllCredits();
      const total = await getTotalOutstanding();
      setCredits(data);
      setOutstanding(total);
    } catch (e) { console.error(e); }
  };

  const handleMarkPaid = (credit) => {
    Alert.alert('Tandai Lunas', `Tandai hutang ${credit.buyer_name} sebagai lunas?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Lunas', onPress: async () => {
        await markCreditPaid(credit.id);
        Toast.show({ type: 'success', text1: 'Hutang dilunasi' });
        loadData();
      }},
    ]);
  };

  const handleAdd = async () => {
    if (!form.buyer_name.trim() || !form.total_amount) {
      Alert.alert('Error', 'Nama pembeli dan total wajib diisi'); return;
    }
    await createCreditSale(null, form.buyer_name.trim(), parseFloat(form.total_amount), form.due_date || null, form.notes || null);
    Toast.show({ type: 'success', text1: 'Hutang ditambahkan' });
    setShowAdd(false);
    setForm({ buyer_name: '', total_amount: '', due_date: '', notes: '' });
    loadData();
  };

  const formatCurrency = (v) => `Rp ${Math.round(v || 0).toLocaleString('id-ID')}`;
  const formatDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const renderCredit = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.buyerName}>{item.buyer_name}</Text>
          <Text style={styles.dateText}>Jatuh tempo: {formatDate(item.due_date)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amountText}>{formatCurrency(item.total_amount - item.paid_amount)}</Text>
          {item.is_paid === 1 && <View style={styles.paidBadge}><Text style={styles.paidText}>Lunas</Text></View>}
        </View>
      </View>
      {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
      {item.is_paid === 0 && (
        <TouchableOpacity style={styles.lunasBtn} onPress={() => handleMarkPaid(item)}>
          <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.white} />
          <Text style={styles.lunasBtnText}>Tandai Lunas</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hutang Pelanggan</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Outstanding card */}
      <View style={styles.outstandingCard}>
        <Text style={styles.outstandingLabel}>Total Belum Lunas</Text>
        <Text style={styles.outstandingValue}>{formatCurrency(outstanding)}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[{ key: 'unpaid', label: 'Belum Lunas' }, { key: 'all', label: 'Semua' }].map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={credits}
        keyExtractor={item => String(item.id)}
        renderItem={renderCredit}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="check-all" size={52} color={Colors.success} />
            <Text style={styles.emptyText}>Tidak ada hutang {activeTab === 'unpaid' ? 'yang belum lunas' : ''}</Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Tambah Hutang</Text>
            <TextInput style={styles.modalInput} placeholder="Nama Pembeli" placeholderTextColor={Colors.textLight} value={form.buyer_name} onChangeText={v => setForm(p => ({ ...p, buyer_name: v }))} />
            <TextInput style={styles.modalInput} placeholder="Total Hutang (Rp)" placeholderTextColor={Colors.textLight} value={form.total_amount} onChangeText={v => setForm(p => ({ ...p, total_amount: v }))} keyboardType="numeric" />
            <TextInput style={styles.modalInput} placeholder="Jatuh Tempo (DD/MM/YYYY)" placeholderTextColor={Colors.textLight} value={form.due_date} onChangeText={v => setForm(p => ({ ...p, due_date: v }))} />
            <TextInput style={styles.modalInput} placeholder="Catatan (opsional)" placeholderTextColor={Colors.textLight} value={form.notes} onChangeText={v => setForm(p => ({ ...p, notes: v }))} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: Colors.bgSecondary }]} onPress={() => setShowAdd(false)}>
                <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: Colors.primary }]} onPress={handleAdd}>
                <Text style={{ color: Colors.white, fontWeight: '600' }}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.textDark },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  outstandingCard: { backgroundColor: Colors.primary, margin: 16, borderRadius: 14, padding: 20, alignItems: 'center' },
  outstandingLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  outstandingValue: { fontSize: 28, fontWeight: '800', color: Colors.white },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  buyerName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  dateText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  paidBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  paidText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  notesText: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  lunasBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, borderRadius: 8, paddingVertical: 8 },
  lunasBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 16 },
  modalInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textDark, marginBottom: 10 },
  modalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
