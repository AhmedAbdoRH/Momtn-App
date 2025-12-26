import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'new_photo' | 'new_message' | 'group_invite' | 'like' | 'comment' | 'member_joined';
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  group_id?: string;
  sender_id?: string;
  sender_name?: string;
}

export class NotificationsService {
  private static channelId = 'momtn-notifications';
  private static isInitialized = false;

  // تهيئة قناة الإشعارات
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // إنشاء قناة الإشعارات لأندرويد
      await notifee.createChannel({
        id: this.channelId,
        name: 'إشعارات ممتن',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // طلب الصلاحيات لنظام أندرويد 13 فما فوق
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await notifee.requestPermission();
      }

      this.isInitialized = true;
      console.log('Notifications initialized successfully');
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  // عرض إشعار محلي
  static async showLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      await this.initialize();

      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: this.channelId,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          style: { type: AndroidStyle.BIGTEXT, text: body },
          smallIcon: 'logo',
        },
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // حفظ إشعار في قاعدة البيانات
  static async saveNotification(notification: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .insert({
          ...notification,
          is_read: false,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  // إرسال إشعار لأعضاء المجموعة (عند إضافة صورة جديدة)
  static async notifyGroupMembers(
    groupId: string,
    senderId: string,
    senderName: string,
    type: AppNotification['type'],
    title: string,
    body: string,
    extraData?: Record<string, any>
  ): Promise<void> {
    try {
      // جلب أعضاء المجموعة (ما عدا المرسل)
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .neq('user_id', senderId);

      if (membersError) throw membersError;

      if (!members || members.length === 0) return;

      // إنشاء إشعارات لكل عضو
      const notifications = members.map(member => ({
        user_id: member.user_id,
        type,
        title,
        body,
        group_id: groupId,
        sender_id: senderId,
        sender_name: senderName,
        data: extraData,
        is_read: false,
      }));

      // حفظ الإشعارات في قاعدة البيانات
      const { error: insertError } = await (supabase as any)
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error notifying group members:', error);
    }
  }

  // جلب إشعارات المستخدم
  static async getUserNotifications(userId: string, limit: number = 50): Promise<AppNotification[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // جلب عدد الإشعارات غير المقروءة
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await (supabase as any)
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // تحديد إشعار كمقروء
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // تحديد جميع الإشعارات كمقروءة
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // حذف إشعار
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }
}
