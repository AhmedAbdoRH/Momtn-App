import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { NotificationsService, AppNotification } from '../services/notifications';

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useNotifications = (userId: string | null): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // تحميل الإشعارات
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await NotificationsService.getUserNotifications(userId);
      setNotifications(data);

      const count = data.filter(n => !n.is_read).length;
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'حدث خطأ في تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // تحديث الإشعارات
  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // تحديد إشعار كمقروء
  const markAsRead = useCallback(async (id: string) => {
    try {
      await NotificationsService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking as read:', err);
    }
  }, []);

  // تحديد الكل كمقروء
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await NotificationsService.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    }
  }, [userId]);

  // حذف إشعار
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const notification = notifications.find(n => n.id === id);
      await NotificationsService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // الاشتراك في Realtime للإشعارات الجديدة
  useEffect(() => {
    if (!userId) return;

    // تهيئة خدمة الإشعارات
    NotificationsService.initialize();

    // تحميل الإشعارات الأولية
    fetchNotifications();

    // إنشاء قناة Realtime
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const newNotification = payload.new as AppNotification;

          // إضافة الإشعار للقائمة
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updatedNotification = payload.new as AppNotification;
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setNotifications(prev => prev.filter(n => n.id !== deletedId));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};

export default useNotifications;
