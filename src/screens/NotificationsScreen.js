// Notifications screen - Clean & Minimal
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../styles/colors';
import { getAllNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, getUnreadCount } from '../database/queries/notifications';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(useCallback(() => { loadNotifications(); }, []));

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [all, count] = await Promise.all([getAllNotifications(), getUnreadCount()]);
      setNotifications(all); setUnreadCount(count);
    } catch (e) { console.error('Error loading notifications:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadNotifications(); };

  const handleRead = async (id) => {
    try { await markAsRead(id); loadNotifications(); } catch(e) {}
  };

  const handleMarkAllRead = async () => {
    try { await markAllAsRead(); loadNotifications(); } catch(e) {}
  };

  const handleDelete = (id) => {
    Alert.alert('Hapus', 'Hapus notifikasi ini?', [
      {text:'Batal',style:'cancel'},
      {text:'Hapus',style:'destructive',onPress: async()=>{try{await deleteNotification(id);loadNotifications();}catch(e){}}},
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Hapus Semua', 'Hapus semua notifikasi?', [
      {text:'Batal',style:'cancel'},
      {text:'Hapus',style:'destructive',onPress: async()=>{try{await deleteAllNotifications();loadNotifications();}catch(e){}}},
    ]);
  };

  const getIcon = (type) => {
    switch(type) {
      case 'LOW_STOCK': return { name:'alert-circle-outline', color:Colors.warning, bg:Colors.warningBg };
      case 'EXPIRY_WARNING': return { name:'clock-alert-outline', color:Colors.danger, bg:Colors.dangerBg };
      case 'STOCK_IN': return { name:'arrow-down', color:Colors.success, bg:Colors.successBg };
      case 'STOCK_OUT': return { name:'arrow-up', color:Colors.danger, bg:Colors.dangerBg };
      case 'PRODUCT_ADDED': return { name:'plus-circle-outline', color:Colors.primary, bg:Colors.primaryLight };
      default: return { name:'bell-outline', color:Colors.primary, bg:Colors.primaryLight };
    }
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Baru saja';
    if (diff < 60) return `${diff} menit lalu`;
    if (diff < 1440) return `${Math.floor(diff/60)} jam lalu`;
    if (diff < 2880) return 'Kemarin';
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  };

  const renderItem = ({item}) => {
    const icon = getIcon(item.type);
    return (
      <TouchableOpacity style={[s.notifCard, !item.is_read && s.unread]} onPress={() => handleRead(item.id)} onLongPress={() => handleDelete(item.id)} activeOpacity={0.7}>
        <View style={[s.notifIcon, {backgroundColor:icon.bg}]}>
          <MaterialCommunityIcons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={s.notifContent}>
          <Text style={s.notifTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.notifMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={s.notifTime}>{formatTime(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={s.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={s.emptyContainer}>
      <MaterialCommunityIcons name="bell-off-outline" size={56} color={Colors.textLight} />
      <Text style={s.emptyTitle}>Belum Ada Notifikasi</Text>
      <Text style={s.emptyText}>Notifikasi akan muncul saat ada stok rendah atau produk kadaluarsa</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifikasi</Text>
        <View style={s.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7} style={s.headerAction}>
              <MaterialCommunityIcons name="check-all" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7} style={s.headerAction}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {unreadCount > 0 && (
        <View style={s.unreadBanner}>
          <Text style={s.unreadBannerText}>{unreadCount} notifikasi belum dibaca</Text>
        </View>
      )}

      <FlatList data={notifications} renderItem={renderItem} keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list} ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.bg},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:Colors.bg,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontSize:18,fontWeight:'700',color:Colors.textDark},
  headerActions:{flexDirection:'row',gap:4}, headerAction:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  unreadBanner:{backgroundColor:Colors.primaryLight,paddingVertical:8,paddingHorizontal:20},
  unreadBannerText:{fontSize:12,fontWeight:'600',color:Colors.primary,textAlign:'center'},
  list:{padding:16,paddingBottom:40},
  notifCard:{flexDirection:'row',alignItems:'flex-start',backgroundColor:Colors.white,borderRadius:14,padding:14,marginBottom:8,borderWidth:1,borderColor:Colors.cardBorder},
  unread:{backgroundColor:Colors.primaryLight,borderColor:Colors.primarySoft},
  notifIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',marginRight:12},
  notifContent:{flex:1},
  notifTitle:{fontSize:14,fontWeight:'600',color:Colors.textDark,marginBottom:2},
  notifMessage:{fontSize:13,color:Colors.textSecondary,lineHeight:18,marginBottom:4},
  notifTime:{fontSize:11,color:Colors.textLight},
  unreadDot:{width:8,height:8,borderRadius:4,backgroundColor:Colors.primary,marginTop:6,marginLeft:8},
  emptyContainer:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:80},
  emptyTitle:{fontSize:18,fontWeight:'600',color:Colors.textDark,marginTop:16,marginBottom:6},
  emptyText:{fontSize:13,color:Colors.textSecondary,textAlign:'center',paddingHorizontal:40},
});
