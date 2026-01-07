import messaging from '@react-native-firebase/messaging';
import { supabase } from '../services/supabase';
import { NotificationsService } from '../services/notifications';

/**
 * أداة اختبار الإشعارات
 * Test Notification Utility
 */
export class TestNotification {
  /**
   * اختبار 1: التحقق من FCM Token
   */
  static async checkFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('=== FCM Token ===');
      console.log(token);
      console.log('=================');
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * اختبار 2: التحقق من صلاحيات الإشعارات
   */
  static async checkPermissions(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('=== Notification Permissions ===');
      console.log('Status:', authStatus);
      console.log('Enabled:', enabled);
      console.log('================================');

      return enabled;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * اختبار 3: التحقق من وجود device token في قاعدة البيانات
   */
  static async checkDeviceTokenInDB(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', userId);

      console.log('=== Device Tokens in DB ===');
      console.log('User ID:', userId);
      console.log('Tokens found:', data?.length || 0);
      console.log('Data:', JSON.stringify(data, null, 2));
      if (error) console.log('Error:', error);
      console.log('===========================');

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking device token in DB:', error);
      return false;
    }
  }

  /**
   * اختبار 4: إرسال إشعار محلي (للتحقق من عمل Notifee)
   */
  static async sendLocalTestNotification(): Promise<void> {
    try {
      console.log('=== Sending Local Test Notification ===');
      await NotificationsService.showLocalNotification(
        'اختبار الإشعارات 🔔',
        'هذا إشعار تجريبي محلي - إذا ظهر فإن Notifee يعمل بشكل صحيح!',
        { test: true, timestamp: Date.now() }
      );
      console.log('Local notification sent successfully!');
      console.log('========================================');
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * اختبار 5: إنشاء إشعار في قاعدة البيانات (لتفعيل Webhook)
   */
  static async createTestNotificationInDB(userId: string): Promise<void> {
    try {
      console.log('=== Creating Test Notification in DB ===');

      const { data, error } = await (supabase as any)
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'new_message',
          title: 'اختبار Push Notification 🚀',
          body: 'هذا إشعار تجريبي من قاعدة البيانات - إذا ظهر فإن Webhook يعمل!',
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
      } else {
        console.log('Notification created successfully!');
        console.log('Notification ID:', data?.id);
      }
      console.log('=========================================');
    } catch (error) {
      console.error('Error:', error);
    }
  }

  /**
   * اختبار 6: إرسال إشعار مباشر عبر FCM (للتجاوز على Webhook)
   */
  static async sendDirectFCMTest(fcmToken: string): Promise<void> {
    console.log('=== Direct FCM Test ===');
    console.log('To test FCM directly, use this curl command:');
    console.log(`
curl -X POST https://fcm.googleapis.com/fcm/send \\
  -H "Authorization: key=YOUR_SERVER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "${fcmToken}",
    "data": {
      "title": "اختبار مباشر",
      "body": "هذا اختبار مباشر من FCM"
    },
    "priority": "high"
  }'
    `);
    console.log('=======================');
  }

  /**
   * تشغيل جميع الاختبارات
   */
  static async runAllTests(userId: string): Promise<void> {
    console.log('\n');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║    🔔 بدء اختبار نظام الإشعارات 🔔      ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('\n');

    // 1. التحقق من الصلاحيات
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      console.log('❌ الصلاحيات غير ممنوحة!');
      return;
    }
    console.log('✅ الصلاحيات ممنوحة\n');

    // 2. التحقق من FCM Token
    const token = await this.checkFCMToken();
    if (!token) {
      console.log('❌ لم يتم الحصول على FCM Token!');
      return;
    }
    console.log('✅ FCM Token موجود\n');

    // 3. التحقق من قاعدة البيانات
    const hasTokenInDB = await this.checkDeviceTokenInDB(userId);
    if (!hasTokenInDB) {
      console.log('❌ Token غير موجود في قاعدة البيانات!');
      console.log('💡 حاول تسجيل الخروج والدخول مرة أخرى\n');
    } else {
      console.log('✅ Token موجود في قاعدة البيانات\n');
    }

    // 4. إرسال إشعار محلي
    console.log('📱 إرسال إشعار محلي للاختبار...\n');
    await this.sendLocalTestNotification();

    // 5. إنشاء إشعار في قاعدة البيانات
    console.log('📤 إنشاء إشعار في قاعدة البيانات...\n');
    await this.createTestNotificationInDB(userId);

    // 6. عرض أمر الاختبار المباشر
    await this.sendDirectFCMTest(token);

    console.log('\n');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║      ✅ انتهى الاختبار - تحقق من:        ║');
    console.log('║  1. ظهور الإشعار المحلي                  ║');
    console.log('║  2. ظهور إشعار من قاعدة البيانات         ║');
    console.log('║  3. سجلات Supabase Edge Functions       ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('\n');
  }
}
