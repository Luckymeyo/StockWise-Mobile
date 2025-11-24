import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../styles/colors';
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearReadNotifications,
  deleteNotification,
  NotificationPriority,
  checkLowStockAlerts,
  checkExpiringAlerts,
} from '../database/queries/notifications';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, ALERTS, ACTIVITY
  
  // Settings state
  const [lowStockEnabled, setLowStockEnabled] = useState(true);
  const [expiryEnabled, setExpiryEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
    loadNotifications();
    checkAlerts(); // Check for new alerts on mount
  }, []);

  // Reload on screen focus
  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      loadNotifications();
      return () => {};
    }, [])
  );

  const loadSettings = async () => {
    try {
      const [savedLowStock, savedExpiry] = await Promise.all([
        AsyncStorage.getItem('lowStockEnabled'),
        AsyncStorage.getItem('expiryEnabled'),
      ]);
      
      // AsyncStorage stores strings, default to true if not set
      setLowStockEnabled(savedLowStock !== 'false');
      setExpiryEnabled(savedExpiry !== 'false');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await getAllNotifications();
      setNotifications(data);
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const checkAlerts = async () => {
    try {
      await checkLowStockAlerts();
      await checkExpiringAlerts();
      await loadNotifications(); // Reload to show new alerts
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkAlerts(); // Check for new alerts
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
      loadNotifications();
    }

    // Navigate to product detail if available
    if (notification.product_id) {
      navigation.navigate('Inventory', {
        screen: 'ItemDetail',
        params: { productId: notification.product_id },
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    
    Alert.alert(
      'Tandai Semua Dibaca',
      'Tandai semua notifikasi sebagai sudah dibaca?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tandai',
          onPress: async () => {
            await markAllAsRead();
            loadNotifications();
          },
        },
      ]
    );
  };

  const handleClearRead = async () => {
    const readCount = notifications.filter(n => n.is_read).length;
    if (readCount === 0) {
      Alert.alert('Info', 'Tidak ada notifikasi yang sudah dibaca');
      return;
    }

    Alert.alert(
      'Hapus Notifikasi',
      `Hapus ${readCount} notifikasi yang sudah dibaca?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await clearReadNotifications();
            loadNotifications();
          },
        },
      ]
    );
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    // Filter by category (ALL, ALERTS, ACTIVITY)
    if (filter === 'ALERTS') {
      filtered = filtered.filter(n => n.priority === NotificationPriority.HIGH);
    } else if (filter === 'ACTIVITY') {
      filtered = filtered.filter(
        n => n.priority === NotificationPriority.MEDIUM || n.priority === NotificationPriority.LOW
      );
    }
    
    // Filter based on settings
    filtered = filtered.filter(notification => {
      // Filter out LOW_STOCK notifications if disabled
      if (notification.type === 'LOW_STOCK' && !lowStockEnabled) {
        return false;
      }
      // Filter out EXPIRING_SOON notifications if disabled
      if (notification.type === 'EXPIRING_SOON' && !expiryEnabled) {
        return false;
      }
      return true;
    });
    
    return filtered;
  };

  const groupNotificationsByDate = (notifs) => {
    const groups = {};
    
    notifs.forEach(notification => {
      const dateKey = getDateLabel(notification.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    });

    return groups;
  };

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Hari Ini';
    if (isYesterday) return 'Kemarin';
    
    // This week
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo) {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[date.getDay()];
    }

    // Older
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const getTimeString = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case NotificationPriority.HIGH:
        return Colors.danger;
      case NotificationPriority.MEDIUM:
        return Colors.cardCyan;
      case NotificationPriority.LOW:
        return Colors.textLight;
      default:
        return Colors.textLight;
    }
  };

  const renderNotification = ({ item }) => {
    const priorityColor = getPriorityColor(item.priority);
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread && styles.unreadCard,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: priorityColor + '20' }]}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, isUnread && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.time}>{getTimeString(item.created_at)}</Text>
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>

          {item.priority === NotificationPriority.HIGH && (
            <View style={[styles.badge, { backgroundColor: priorityColor }]}>
              <Text style={styles.badgeText}>PENTING</Text>
            </View>
          )}
        </View>

        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderGroupedList = () => {
    const filtered = getFilteredNotifications();
    const grouped = groupNotificationsByDate(filtered);
    const sections = Object.keys(grouped);

    if (sections.length === 0) {
      // Check if both notification types are disabled
      const bothDisabled = !lowStockEnabled && !expiryEnabled;
      
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Tidak Ada Notifikasi</Text>
          <Text style={styles.emptyText}>
            {bothDisabled
              ? 'Notifikasi dinonaktifkan di Pengaturan'
              : filter === 'ALERTS'
              ? 'Tidak ada peringatan saat ini'
              : filter === 'ACTIVITY'
              ? 'Tidak ada aktivitas'
              : 'Notifikasi akan muncul di sini'}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={sections}
        keyExtractor={(item) => item}
        renderItem={({ item: dateLabel }) => (
          <View>
            <View style={styles.dateHeader}>
              <Text style={styles.dateLabel}>{dateLabel}</Text>
            </View>
            {grouped[dateLabel].map(notification => (
              <View key={notification.id}>
                {renderNotification({ item: notification })}
              </View>
            ))}
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.cardBlue]}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    );
  };

  const alertCount = notifications.filter(n => n.priority === NotificationPriority.HIGH).length;
  const activityCount = notifications.filter(
    n => n.priority === NotificationPriority.MEDIUM || n.priority === NotificationPriority.LOW
  ).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleMarkAllRead}
            >
              <Text style={styles.headerButtonText}>Tandai Dibaca</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClearRead}
          >
            <Text style={styles.headerButtonText}>Bersihkan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            {unreadCount} notifikasi belum dibaca
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.activeTab]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterText, filter === 'ALL' && styles.activeFilterText]}>
            Semua ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALERTS' && styles.activeTab]}
          onPress={() => setFilter('ALERTS')}
        >
          <Text style={[styles.filterText, filter === 'ALERTS' && styles.activeFilterText]}>
            Peringatan ({alertCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'ACTIVITY' && styles.activeTab]}
          onPress={() => setFilter('ACTIVITY')}
        >
          <Text style={[styles.filterText, filter === 'ACTIVITY' && styles.activeFilterText]}>
            Aktivitas ({activityCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      {renderGroupedList()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textDark,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    color: Colors.cardBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  unreadBanner: {
    backgroundColor: Colors.cardBlue + '15',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  unreadBannerText: {
    color: Colors.cardBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.bg,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.cardBlue,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeFilterText: {
    color: Colors.white,
  },
  listContent: {
    flexGrow: 1,
  },
  dateHeader: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  notificationCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  unreadCard: {
    borderColor: Colors.cardBlue,
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: Colors.textLight,
  },
  message: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.cardBlue,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
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
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
