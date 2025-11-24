
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../styles/colors';

export default function StatCard({ value='0', label='Label', tint='blue', onPress }) {
  const bg = tint === 'blue' ? Colors.cardBlue : Colors.cardCyan;
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: bg }]} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>◴</Text>
      </View>
      <Text style={styles.valueText}>{value}</Text>
      <Text style={styles.labelText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 140,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconText: { color: Colors.white, fontSize: 15 },
  valueText: { color: Colors.white, fontSize: 28, fontWeight: '700', marginTop: 2 },
  labelText: { color: Colors.white, fontSize: 14, marginTop: 2, opacity: 0.95 },
});
