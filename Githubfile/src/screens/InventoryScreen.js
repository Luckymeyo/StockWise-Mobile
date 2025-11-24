import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import Colors from '../styles/colors';

export default function InventoryScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.desc}>Placeholder — list items added via Management.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textDark },
  desc: { color: Colors.textLight, marginTop: 8 },
});
