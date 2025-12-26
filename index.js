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

  // For data-only messages, title and body come from the data payload
  const title =
    remoteMessage?.data?.title ||
    remoteMessage?.notification?.title ||
    'إشعار جديد';
  const body =
    remoteMessage?.data?.body || remoteMessage?.notification?.body || '';

  try {
    // Ensure channel exists
    await createNotificationChannel();

    // Display notification using notifee
    await notifee.displayNotification({
      title,
      body,
      data: remoteMessage?.data,
      android: {
        channelId: 'momtn-notifications',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
        smallIcon: 'ic_launcher', // Make sure this icon exists
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
    // Handle navigation or other actions based on notification data
  }

  if (type === EventType.DISMISSED) {
    console.log('User dismissed notification');
  }
});

AppRegistry.registerComponent(appName, () => App);
