/**
 * Expiring Batches Screen
 * Shows all product batches that are expiring within 30 days
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../styles/colors';
import { getExpiringBatches } from '../database/batchTracking';

export default function ExpiringBatchesScreen({ navigation }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadExpiringBatches();
    }, [])
  );

  const loadExpiringBatches = async () => {
    try {
      setLoading(true);
      const expiringBatches = await getExpiringBatches(30);
      setBatches(expiringBatches);
    } catch (error) {
      console.error('Error loading expiring batches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExpiringBatches();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const getUrgencyColor = (days) => {
    if (days <= 7) return '#EF4444'; // Red - Very urgent
    if (days <= 14) return '#F59E0B'; // Orange - Urgent
    return '#10B981'; // Green - Soon
  };

  const getUrgencyLabel = (days) => {
    if (days <= 0) return 'KADALUARSA!';
    if (days === 1) return '1 hari lagi';
    if (days <= 7) return `${days} hari lagi`;
    if (days <= 14) return `${days} hari lagi`;
    return `${days} hari lagi`;
  };

  const handleBatchPress = (batch) => {
    // Navigate to product detail
    navigation.navigate('ItemDetail', { productId: batch.product_id });
  };

  const renderBatch = ({ item }) => {
    const urgencyColor = getUrgencyColor(item.days_until_expiry);
    const urgencyLabel = getUrgencyLabel(item.days_until_expiry);

    return (
      <TouchableOpacity
        style={styles.batchCard}
        onPress={() => handleBatchPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.batchHeader}>
          <View style={styles.batchInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.product_name}
            </Text>
            <Text style={styles.batchNumber}>Batch: {item.batch_number}</Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
            <Text style={styles.urgencyBadgeText}>{urgencyLabel}</Text>
          </View>
        </View>

        <View style={styles.batchDetails}>
          <View style={styles.batchDetailRow}>
            <Text style={styles.batchDetailLabel}>Jumlah:</Text>
            <Text style={styles.batchDetailValue}>
              {item.current_quantity} {item.unit}
            </Text>
          </View>
          <View style={styles.batchDetailRow}>
            <Text style={styles.batchDetailLabel}>Kadaluarsa:</Text>
            <Text style={[styles.batchDetailValue, { color: urgencyColor }]}>
              {formatDate(item.batch_expiry_date)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Batch Kadaluarsa</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.cardBlue} />
          <Text style={styles.loadingText}>Memuat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Batch Kadaluarsa</Text>
        <Text style={styles.subtitle}>
          {batches.length} batch dalam 30 hari
        </Text>
      </View>

      {batches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Tidak Ada Batch Kadaluarsa</Text>
          <Text style={styles.emptyText}>
            Semua batch aman dalam 30 hari ke depan
          </Text>
        </View>
      ) : (
        <FlatList
          data={batches}
          renderItem={renderBatch}
          keyExtractor={(item) => `${item.product_id}-${item.batch_number}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
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

  // Header
  header: {
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    fontSize: 16,
    color: Colors.cardBlue,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textLight,
    marginTop: 4,
  },

  // List
  listContent: {
    padding: 16,
  },

  // Batch Card
  batchCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  batchInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  batchNumber: {
    fontSize: 13,
    color: Colors.textLight,
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  urgencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  batchDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  batchDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  batchDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  batchDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
