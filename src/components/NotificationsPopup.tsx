import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNotifications } from '../hooks/useNotifications';
import { AppNotification } from '../services/notifications';
import { Colors, BorderRadius, Spacing, Typography, ZIndex, Shadows } from '../../theme';

interface NotificationsPopupProps {
  userId: string;
  onClose: () => void;
}

const NotificationsPopup: React.FC<NotificationsPopupProps> = ({ userId, onClose }) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(userId);

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

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const icon = getNotificationIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
        onPress={async () => {
          if (!item.is_read) await markAsRead(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
          <Icon name={icon.name} size={18} color={icon.color} />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإشعارات</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>قراءة الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#ea384c" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="notifications-off-outline" size={40} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>لا توجد إشعارات</Text>
        </View>
      ) : (
        <FlatList
          data={notifications.slice(0, 10)} // Show only latest 10 in popup
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {notifications.length > 0 && (
        <TouchableOpacity style={styles.footer} onPress={onClose}>
          <Text style={styles.footerText}>إغلاق</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    borderRadius: BorderRadius.lg,
    maxHeight: 400,
    zIndex: ZIndex.modal + 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Shadows.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  markAllButton: {
    padding: 4,
  },
  markAllText: {
    color: '#ea384c',
    fontSize: 12,
  },
  listContent: {
    padding: Spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row-reverse',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  unreadItem: {
    backgroundColor: 'rgba(234,56,76,0.05)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  notificationBody: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'right',
  },
  notificationTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 2,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ea384c',
    position: 'absolute',
    top: 10,
    left: 10,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    marginTop: 10,
    fontSize: 14,
  },
  footer: {
    padding: Spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});

export default NotificationsPopup;
