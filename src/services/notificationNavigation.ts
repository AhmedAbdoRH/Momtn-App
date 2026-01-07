/**
 * خدمة التنقل من الإشعارات
 * تدير تخزين واسترجاع بيانات الإشعار للتنقل عند فتح التطبيق
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_NOTIFICATION_KEY = '@pending_notification_data';

export interface PendingNotificationData {
    group_id?: string;
    type?: string;
    notification_id?: string;
    messageId?: string;
    message_id?: string;
    photo_id?: string;
    photoId?: string;
    comment_id?: string;
    parent_comment_id?: string;
    timestamp?: number;
}

export class NotificationNavigationService {
    /**
     * حفظ بيانات الإشعار المضغوط عليه لمعالجتها لاحقًا
     */
    static async savePendingNotification(data: PendingNotificationData): Promise<void> {
        try {
            const dataWithTimestamp = {
                ...data,
                timestamp: Date.now(),
            };
            await AsyncStorage.setItem(PENDING_NOTIFICATION_KEY, JSON.stringify(dataWithTimestamp));
            console.log('Saved pending notification data:', dataWithTimestamp);
        } catch (error) {
            console.error('Error saving pending notification:', error);
        }
    }

    /**
     * استرجاع بيانات الإشعار المحفوظة
     */
    static async getPendingNotification(): Promise<PendingNotificationData | null> {
        try {
            const data = await AsyncStorage.getItem(PENDING_NOTIFICATION_KEY);
            if (data) {
                const parsed = JSON.parse(data) as PendingNotificationData;

                // تجاهل الإشعارات القديمة (أكثر من 5 دقائق)
                const fiveMinutes = 5 * 60 * 1000;
                if (parsed.timestamp && Date.now() - parsed.timestamp > fiveMinutes) {
                    await this.clearPendingNotification();
                    return null;
                }

                console.log('Retrieved pending notification data:', parsed);
                return parsed;
            }
            return null;
        } catch (error) {
            console.error('Error getting pending notification:', error);
            return null;
        }
    }

    /**
     * مسح بيانات الإشعار المحفوظة بعد معالجتها
     */
    static async clearPendingNotification(): Promise<void> {
        try {
            await AsyncStorage.removeItem(PENDING_NOTIFICATION_KEY);
            console.log('Cleared pending notification data');
        } catch (error) {
            console.error('Error clearing pending notification:', error);
        }
    }
}

export default NotificationNavigationService;
