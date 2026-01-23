import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import HorizontalLoader from './ui/HorizontalLoader';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNotifications } from '../hooks/useNotifications';
import { AppNotification } from '../services/notifications';
import { BorderRadius, Spacing, ZIndex, Shadows } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NotificationsPopupProps {
  userId: string;
  onClose: () => void;
  onNotificationPress?: (notification: AppNotification) => void;
}

const NotificationsPopup: React.FC<NotificationsPopupProps> = ({ userId, onClose, onNotificationPress }) => {
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

  const renderNotification = (item: AppNotification) => {
    const icon = getNotificationIcon(item.type);
    
    return (
      <View key={item.id} style={[styles.notificationWrapper, !item.is_read && styles.unreadWrapper]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotification(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="trash-outline" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationItem}
          onPress={async () => {
            if (!item.is_read) await markAsRead(item.id);
            if (onNotificationPress) {
              onNotificationPress(item);
              // لا نستدعي onClose هنا لأن onNotificationPress سيتعامل مع الإغلاق
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
            <View style={styles.timeRow}>
              <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
              {item.sender_name && (
                <Text style={styles.senderName}>من: {item.sender_name}</Text>
              )}
            </View>
          </View>

          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
            <Icon name={icon.name} size={18} color={icon.color} />
          </View>
          
          {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Arrow pointer */}
      <View style={styles.arrow} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>الإشعارات</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Icon name="checkmark-done" size={18} color="#ea384c" />
          </TouchableOpacity>
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <HorizontalLoader color="#ea384c" width={100} />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="notifications-off-outline" size={50} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyText}>لا توجد إشعارات</Text>
          <Text style={styles.emptySubText}>ستظهر هنا الإشعارات الجديدة</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.slice(0, 15).map(renderNotification)}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 95,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(20, 20, 25, 0.98)',
    borderRadius: BorderRadius.lg,
    maxHeight: SCREEN_HEIGHT * 0.55,
    zIndex: ZIndex.modal + 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.xl,
    overflow: 'hidden',
  },
  arrow: {
    position: 'absolute',
    top: -8,
    left: 55,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(20, 20, 25, 0.98)',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#ea384c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  markAllButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.sm,
  },
  notificationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.md,
    paddingLeft: Spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unreadWrapper: {
    backgroundColor: 'rgba(234,56,76,0.08)',
    borderColor: 'rgba(234,56,76,0.15)',
  },
  deleteButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    flex: 1,
    flexDirection: 'row-reverse',
    padding: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
    marginBottom: 2,
  },
  notificationBody: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 4,
  },
  notificationTime: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  senderName: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea384c',
    position: 'absolute',
    top: 12,
    right: 8,
  },
  centerContainer: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    marginTop: 10,
    fontSize: 13,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubText: {
    color: 'rgba(255,255,255,0.25)',
    marginTop: 4,
    fontSize: 12,
  },
});

export default NotificationsPopup;
