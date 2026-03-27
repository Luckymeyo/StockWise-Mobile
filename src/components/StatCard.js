
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../styles/colors';

export default function StatCard({ value='0', label='Label', onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
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
    backgroundColor: Colors.primaryLight,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconText: { color: Colors.primary, fontSize: 15 },
  valueText: { color: Colors.textDark, fontSize: 28, fontWeight: '700', marginTop: 2 },
  labelText: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
});
