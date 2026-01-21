import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../components/auth/AuthProvider';
import { useToast } from '../providers/ToastProvider';

import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { TestNotification } from '../utils/testNotification';

type SettingsScreenRouteProp = RouteProp<
  {
    Settings: {
      context?: 'personal' | 'shared';
      groupId?: string;
      groupName?: string;
    };
  },
  'Settings'
>;

const SettingsScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const route = useRoute<SettingsScreenRouteProp>();

  const context = route.params?.context || 'personal';
  const groupId = route.params?.groupId;
  const groupName = route.params?.groupName;

  const [albums, setAlbums] = React.useState<
    { id: string; name: string; icon: string }[]
  >([]);
  const [loadingAlbums, setLoadingAlbums] = React.useState(true);

  const userDisplayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم';

  React.useEffect(() => {
    fetchActualAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, groupId]);

  const fetchActualAlbums = async () => {
    if (!user) return;
    setLoadingAlbums(true);
    try {
      let query = supabase.from('photos').select('hashtags');

      if (context === 'shared' && groupId) {
        query = query.eq('group_id', groupId);
      } else {
        query = query.is('group_id', null).eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tags = new Set<string>();
      data?.forEach(photo => {
        photo.hashtags?.forEach((tag: string) => {
          if (tag?.trim()) tags.add(tag.trim());
        });
      });

      const actualAlbums = Array.from(tags).map((tag, index) => ({
        id: `album-${index}`,
        name: tag,
        icon: 'folder-outline',
      }));

      setAlbums(actualAlbums);
    } catch (error) {
      console.error('Error fetching albums:', error);
    } finally {
      setLoadingAlbums(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من أنك تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleTestNotifications = async () => {
    if (!user?.id) {
      showToast({ message: 'يجب تسجيل الدخول أولاً', type: 'error' });
      return;
    }

    try {
      showToast({ message: 'جاري إرسال إشعار تجريبي...', type: 'info' });
      await TestNotification.sendTestNotification(user.id);
      showToast({ message: 'تم إرسال الإشعار بنجاح! تحقق من هاتفك.', type: 'success' });
    } catch (error: any) {
      console.error('Error testing notifications:', error);
      showToast({ message: 'فشل إرسال الإشعار: ' + (error.message || 'خطأ غير معروف'), type: 'error' });
    }
  };

  const settingsOptions = [
    {
      title: 'إعدادات عامة',
      description: 'إعدادات التطبيق',
      icon: 'person-outline',
      onPress: () => navigation.navigate('Profile' as never),
    },
    {
      title: '🔔 اختبار الإشعارات',
      description: 'تحقق من عمل نظام الإشعارات',
      icon: 'notifications-outline',
      onPress: handleTestNotifications,
    },
  ];

  const handleAlbumPress = (hashtag: string) => {
    (navigation.navigate as any)('Main', { selectedHashtag: hashtag });
  };

  const albumsTitle =
    context === 'personal'
      ? 'ألبوماتي الشخصية'
      : `ألبومات ${groupName || 'المساحة المشتركة'}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#14090e', '#4a1e34']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>القائمة الجانبية</Text>
          </View>

          {/* Close Button Under Header */}
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerClosePill}
            >
              <Icon name="close" size={20} color="#fff" />
              <Text style={styles.headerCloseText}>إغلاق القائمة</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* User Info Section */}
            <View style={styles.userSection}>
              <Text style={styles.userName}>{userDisplayName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            {/* Albums Section */}
            <View style={styles.albumsSection}>
              <Text style={styles.albumsSectionTitle}>{albumsTitle}</Text>
              {loadingAlbums ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>جاري جلب الألبومات...</Text>
                </View>
              ) : albums.length > 0 ? (
                <View style={styles.albumsBarsContainer}>
                  {albums.map(album => {
                    const barColor = '#ea384c'; // اللون الأحمر المميز الموحد
                    return (
                      <TouchableOpacity
                        key={album.id}
                        style={[
                          styles.albumBarItem,
                          { borderLeftColor: barColor },
                        ]}
                        onPress={() => handleAlbumPress(album.name)}
                      >
                        <View
                          style={[
                            styles.albumBarIndicator,
                            { backgroundColor: barColor },
                          ]}
                        />
                        <Text style={styles.albumBarTitle}>{album.name}</Text>
                        <Icon
                          name="chevron-back"
                          size={16}
                          color="rgba(255,255,255,0.3)"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyAlbumsContainer}>
                  <Text style={styles.emptyAlbumsText}>
                    لا توجد ألبومات حالياً
                  </Text>
                </View>
              )}
            </View>

            {/* Settings Options Section */}
            <View style={styles.settingsSection}>
              {settingsOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.settingItem}
                  onPress={option.onPress}
                >
                  <View style={styles.settingIconContainer}>
                    <Icon
                      name={option.icon}
                      size={22}
                      color="rgba(255,255,255,0.7)"
                    />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    <Text style={styles.settingDescription}>
                      {option.description}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-back-outline"
                    size={18}
                    color="rgba(255,255,255,0.3)"
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Icon
                name="exit-outline"
                size={22}
                color="#ea384c"
                style={styles.signOutIcon}
              />
              <Text style={styles.signOutText}>تسجيل الخروج</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.versionText}>الإصدار 1.1.2</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'flex-start', // ليكون على اليسار (RTL)
  },
  headerClosePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
  },
  headerCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerPlaceholder: {
    display: 'none',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  settingsSection: {
    marginTop: 30,
  },
  settingItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  settingContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  signOutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234, 56, 76, 0.1)',
    padding: 16,
    borderRadius: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(234, 56, 76, 0.2)',
  },
  signOutIcon: {
    marginLeft: 10,
  },
  signOutText: {
    color: '#ea384c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  versionText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  albumsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  albumsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 15,
    textAlign: 'right',
  },
  albumsBarsContainer: {
    width: '100%',
  },
  albumBarItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  albumBarIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginLeft: 15,
  },
  albumBarTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'right',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  emptyAlbumsContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
  },
  emptyAlbumsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});

export default SettingsScreen;
