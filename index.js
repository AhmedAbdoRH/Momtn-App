/**
 * @format
 */

import { AppRegistry, I18nManager } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import App from './App.tsx';
import { name as appName } from './app.json';

// Force LTR layout regardless of device language
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Create notification channel (needed for notifee)
async function createNotificationChannel() {
  await notifee.createChannel({
    id: 'momtn-notifications',
    name: 'إشعارات ممتن',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
}

// معالج الإشعارات في الخلفية لـ FCM
// This handles data-only messages when app is in background/quit state
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('--- Background Message Received (FCM) ---');
  console.log('Message data:', JSON.stringify(remoteMessage));

  const data = remoteMessage?.data || {};
  const notificationId = data.notification_id || data.notificationId;
  const messageId = data.messageId || data.message_id;
  const photoId = data.photo_id || data.photoId;
  const type = data.type;
  const groupId = data.group_id || data.groupId;
  const commentId = data.comment_id || data.commentId;
  const parentCommentId = data.parent_comment_id || data.parentCommentId;
  const dedupeKeyValue =
    data.dedupe_key ||
    data.dedupeKey ||
    messageId ||
    photoId ||
    notificationId;

  try {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;

    if (dedupeKeyValue) {
      const dedupeKey = `@push_dedupe_${type || 'unknown'}_${dedupeKeyValue}`;
      const alreadyShown = await AsyncStorage.getItem(dedupeKey);

      if (alreadyShown) {
        console.log(
          'Skipping duplicate background push notification:',
          dedupeKeyValue,
        );
        return;
      }

      await AsyncStorage.setItem(dedupeKey, '1');
    }

    if (groupId || photoId) {
      const pendingData = {
        group_id: groupId,
        type,
        notification_id: notificationId,
        messageId,
        photo_id: photoId,
        comment_id: commentId,
        parent_comment_id: parentCommentId,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        '@pending_notification_data',
        JSON.stringify(pendingData),
      );
      console.log('Saved pending notification for navigation:', pendingData);
    }

    if (remoteMessage?.notification) {
      return;
    }
  } catch (error) {
    console.error('Error in background de-duplication:', error);
  }

  const title =
    data.title || remoteMessage?.notification?.title || 'إشعار جديد';
  const body = data.body || remoteMessage?.notification?.body || '';

  try {
    await createNotificationChannel();

    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: 'momtn-notifications',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
        smallIcon: 'ic_launcher', // تأكد من أن هذا الرمز موجود
        color: '#ea384c', // اللون الأحمر للتطبيق
        style: {
          type: AndroidStyle.BIGTEXT,
          text: body
        },
        actions: [
          {
            title: 'فتح',
            pressAction: { id: 'open' },
          }
        ]
      },
    });

    console.log('Background notification displayed successfully');
  } catch (error) {
    console.error('Error in background handler:', error);
  }
});

// معالج أحداث Notifee في الخلفية (عند التفاعل مع الإشعار والتطبيق مغلق)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  console.log('Notifee background event:', type, detail);

  if (type === EventType.PRESS) {
    console.log('User pressed notification in background:', notification?.data);

    const data = notification?.data;
    if (data && (data.group_id || data.groupId || data.photo_id || data.photoId)) {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const messageId = data.messageId || data.message_id;
      const photoId = data.photo_id || data.photoId;
      const pendingData = {
        group_id: data.group_id || data.groupId,
        type: data.type,
        notification_id: data.notification_id || data.notificationId,
        messageId,
        photo_id: photoId,
        comment_id: data.comment_id,
        parent_comment_id: data.parent_comment_id,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('@pending_notification_data', JSON.stringify(pendingData));
      console.log('Saved pending notification for navigation:', pendingData);
    }
  }

  if (type === EventType.DISMISSED) {
    console.log('User dismissed notification');
  }
});

AppRegistry.registerComponent(appName, () => App);
