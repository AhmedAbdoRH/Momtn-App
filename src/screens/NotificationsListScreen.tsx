import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import HorizontalLoader from '../components/ui/HorizontalLoader';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useBackground } from '../providers/BackgroundProvider';
import { useAuth } from '../components/auth/AuthProvider';
import { useNotifications } from '../hooks/useNotifications';
import { AppNotification } from '../services/notifications';
import { NotificationNavigationService } from '../services/notificationNavigation';

const NotificationsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { selectedGradient } = useBackground();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(user?.id || null);

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'new_photo':
        return { name: 'image', color: '#4CAF50' };
      case 'new_message':
        return { name: 'chatbubble', color: '#2196F3' };
      case 'group_invite':
        return { name: 'people', color: '#9C27B0' };
      case 'like':
        return { name: 'heart', color: '#ea384c' };
      case 'comment':
        return { name: 'chatbubble-ellipses', color: '#FF9800' };
      case 'member_joined':
        return { name: 'person-add', color: '#00BCD4' };
      default:
        return { name: 'notifications', color: '#ea384c' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-EG');
  };

  const handleNotificationPress = useCallback(async (notification: AppNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    const data = notification.data || {};
    const photoId = (data as any).photo_id || (data as any).photoId;
    const commentId = (data as any).comment_id;
    const parentCommentId = (data as any).parent_comment_id;

    if (notification.group_id || photoId) {
      await NotificationNavigationService.savePendingNotification({
        group_id: notification.group_id,
        type: notification.type,
        notification_id: notification.id,
        photo_id: photoId,
        comment_id: commentId,
        parent_comment_id: parentCommentId,
      });

      navigation.navigate('Main');
    }
  }, [markAsRead, navigation]);

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
          <Icon name={icon.name} size={22} color={icon.color} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotification(item.id)}
        >
          <Icon name="close" size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="notifications-off-outline" size={60} color="rgba(255,255,255,0.3)" />
      <Text style={styles.emptyText}>لا توجد إشعارات</Text>
      <Text style={styles.emptySubtext}>ستظهر هنا الإشعارات الجديدة</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={selectedGradient.colors} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>الإشعارات</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            {unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                <Icon name="checkmark-done" size={22} color="#ea384c" />
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>

          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <View style={styles.loadingContainer}>
              <HorizontalLoader color="#ea384c" width={200} />
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmpty}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={refresh}
                  tintColor="#ea384c"
                  colors={['#ea384c']}
                />
              }
            />
          )}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  badge: {
    backgroundColor: '#ea384c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(234,56,76,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: { width: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15, flexGrow: 1 },
  notificationItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  unreadItem: {
    backgroundColor: 'rgba(234,56,76,0.08)',
    borderColor: 'rgba(234,56,76,0.15)',
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  contentContainer: { flex: 1, alignItems: 'flex-end' },
  notificationTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  notificationBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  notificationTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea384c',
    position: 'absolute',
    top: 15,
    left: 15,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 5,
  },
});

export default NotificationsListScreen;
