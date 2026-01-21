import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../components/auth/AuthProvider';

// Import screens
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationsListScreen from '../screens/NotificationsListScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import GroupsManagementScreen from '../screens/GroupsManagementScreen';
import AboutScreen from '../screens/AboutScreen';
import CreateNewScreen from '../screens/CreateNewScreen';
import ContributorsScreen from '../screens/ContributorsScreen';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#14090e'
      }}>
        <ActivityIndicator size="large" color="#ea384c" />
        <Text style={{
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: 20,
          fontSize: 12
        }}>V 1.1.2</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      {user ? (
        // المستخدم مسجل الدخول - عرض الشاشات الرئيسية
        <React.Fragment>
          <Stack.Screen
            name="Main"
            component={HomeScreen}
            options={{ title: 'الرئيسية' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'الإعدادات' }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'الملف الشخصي' }}
          />
          <Stack.Screen
            name="Appearance"
            component={AppearanceScreen}
            options={{ title: 'المظهر' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'الإشعارات' }}
          />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
            options={{ title: 'الخصوصية' }}
          />
          <Stack.Screen
            name="GroupsManagement"
            component={GroupsManagementScreen}
            options={{ title: 'المجموعات' }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{ title: 'حول التطبيق' }}
          />
          <Stack.Screen
            name="NotificationsList"
            component={NotificationsListScreen}
            options={{ title: 'الإشعارات' }}
          />
          <Stack.Screen
            name="CreateNew"
            component={CreateNewScreen}
            options={{
              title: 'إضافة امتنان',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="Contributors"
            component={ContributorsScreen}
            options={{ title: 'لائحة الشكر' }}
          />
        </React.Fragment>
      ) : (
        // المستخدم غير مسجل الدخول - عرض شاشة المصادقة
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ title: 'تسجيل الدخول' }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;