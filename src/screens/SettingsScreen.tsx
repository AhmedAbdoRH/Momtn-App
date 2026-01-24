import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import {
  launchImageLibrary,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../components/auth/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { supabase } from '../services/supabase';
import { ProfileService } from '../services/profile';
import { TestNotification } from '../utils/testNotification';
import { useBackground, gradientOptions, GradientOption } from '../providers/BackgroundProvider';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import HorizontalLoader from '../components/ui/HorizontalLoader';



const SettingsScreen: React.FC = () => {
  const { user, refreshUser, signOut } = useAuth();
  const { showToast } = useToast();
  const { selectedGradient, setGradient, isPremiumUser } = useBackground();
  const navigation = useNavigation();

  const [displayName, setDisplayName] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedGradientLocal, setSelectedGradientLocal] = useState('default');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStates, setSaveStates] = useState({
    name: 'idle', // 'idle' | 'loading' | 'success' | 'error'
    greeting: 'idle'
  });

  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const profile = await ProfileService.getProfile(user.id);
      if (profile) {
        setDisplayName(profile.full_name || user.user_metadata?.full_name || '');
        setGreetingMessage(profile.user_welcome_message || 'لحظاتك السعيدة، والنعم الجميلة في حياتك ✨');
        setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || null);
        setSelectedGradientLocal(selectedGradient.id);
      }
    } catch (e) {
      console.warn('Could not load profile:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedGradient]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleUpdateAvatar = async () => {
    if (!user?.id) return;

    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
    };

    try {
      const result = await launchImageLibrary(options);

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) return;

      setIsUploadingImage(true);
      showToast({ message: 'جاري رفع الصورة...', type: 'info' });

      const fileExt = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;

      let arrayBuffer;
      if (asset.base64) {
        arrayBuffer = decode(asset.base64);
      } else {
        const base64 = await RNFS.readFile(asset.uri, 'base64');
        arrayBuffer = decode(base64);
      }

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: asset.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      await ProfileService.updateProfile(user.id, {
        avatar_url: publicUrl,
      });

      setAvatarUrl(publicUrl);
      if (refreshUser) await refreshUser();
      showToast({ message: 'تم تحديث الصورة الشخصية بنجاح', type: 'success' });
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      showToast({ message: 'فشل تحديث الصورة الشخصية', type: 'error' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      showToast({ message: 'يجب كتابة الاسم', type: 'warning' });
      return;
    }

    setSaveStates(prev => ({ ...prev, name: 'loading' }));
    try {
      await ProfileService.updateProfile(user!.id, {
        full_name: displayName.trim(),
      });

      setSaveStates(prev => ({ ...prev, name: 'success' }));
      showToast({ message: 'تم تحديث الاسم بنجاح', type: 'success' });

      // إخفاء حالة النجاح بعد ثانيتين
      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, name: 'idle' }));
      }, 2000);
    } catch (error: any) {
      setSaveStates(prev => ({ ...prev, name: 'error' }));
      showToast({ message: error.message || 'حدث خطأ أثناء الحفظ', type: 'error' });
      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, name: 'idle' }));
      }, 2000);
    }
  };

  const handleSaveGreeting = async () => {
    setSaveStates(prev => ({ ...prev, greeting: 'loading' }));
    try {
      await ProfileService.updateProfile(user!.id, {
        user_welcome_message: greetingMessage.trim(),
      });

      setSaveStates(prev => ({ ...prev, greeting: 'success' }));
      showToast({ message: 'تم تحديث رسالة الترحيب بنجاح', type: 'success' });

      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, greeting: 'idle' }));
      }, 2000);
    } catch (error: any) {
      setSaveStates(prev => ({ ...prev, greeting: 'error' }));
      showToast({ message: error.message || 'حدث خطأ أثناء الحفظ', type: 'error' });
      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, greeting: 'idle' }));
      }, 2000);
    }
  };

  const handleSelectGradient = async (gradientId: string) => {
    const selectedOption = gradientOptions.find(g => g.id === gradientId);

    // Check premium status
    if (selectedOption?.isPremium && !isPremiumUser) {
      Alert.alert(
        'ميزة ممتن بريميوم 👑',
        'هذه السمة مخصصة لمشتركي نسخة البريميوم. ستتوفر نسخة "ممتن بريميوم" قريباً!',
        [
          { text: 'حسناً', style: 'cancel' }
        ]
      );
      return;
    }

    // Update specific local state first to ensure UI feedback
    setSelectedGradientLocal(gradientId);

    try {
      await setGradient(gradientId);
      if (refreshUser) await refreshUser();
      showToast({ message: 'تم تغيير الخلفية بنجاح', type: 'success' });
    } catch (error: any) {
      console.error('Error setting gradient:', error);
      showToast({ message: 'فشل تغيير الخلفية', type: 'error' });
      // Revert local state on error
      const current = gradientOptions.find(g => g.id === selectedGradient.id)?.id;
      if (current) setSelectedGradientLocal(current);
    }
  };



  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <HorizontalLoader color="#ea384c" width={200} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={selectedGradient.colors} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>الإعدادات العامة</Text>
          </View>

          <View style={styles.closeButtonContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerClosePill}>
              <Icon name="close" size={20} color="#fff" />
              <Text style={styles.headerCloseText}>إغلاق</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile Photo Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="camera-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cardTitle}>صورة الملف الشخصي</Text>
              </View>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <Icon name="person" size={40} color="rgba(255,255,255,0.3)" />
                  )}
                  {isUploadingImage && (
                    <View style={styles.avatarLoadingOverlay}>
                      <HorizontalLoader color="#fff" width={60} />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.changeAvatarButton}
                  onPress={handleUpdateAvatar}
                  disabled={isUploadingImage}
                >
                  <Icon name="cloud-upload-outline" size={16} color="#fff" style={{ marginLeft: 5 }} />
                  <Text style={styles.changeAvatarButtonText}>تغيير الصورة</Text>
                </TouchableOpacity>
                <Text style={styles.avatarHint}>الحد الأقصى للحجم: 5 ميجابايت</Text>
              </View>
            </View>

            {/* Name Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="person-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cardTitle}>اسمك الشخصي</Text>
              </View>
              <Text style={styles.inputLabel}>الاسم الذي سيظهر في التعليقات والمجموعات</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="أدخل اسمك"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saveStates.name === 'loading' && styles.saveButtonLoading,
                ]}
                onPress={handleSaveName}
                disabled={saveStates.name !== 'idle'}
              >
                {saveStates.name === 'loading' ? (
                  <HorizontalLoader color="#fff" width={100} />
                ) : saveStates.name === 'success' ? (
                  <View style={styles.buttonContent}>
                    <Icon name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>تم الحفظ بنجاح</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>حفظ الاسم</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Greeting Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="chatbubble-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cardTitle}>رسالة الترحيب</Text>
              </View>
              <Text style={styles.inputLabel}>الرسالة التي تظهر في الصفحة الرئيسية</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={greetingMessage}
                onChangeText={setGreetingMessage}
                placeholder="أدخل رسالة الترحيب"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saveStates.greeting === 'loading' && styles.saveButtonLoading,
                ]}
                onPress={handleSaveGreeting}
                disabled={saveStates.greeting !== 'idle'}
              >
                {saveStates.greeting === 'loading' ? (
                  <HorizontalLoader color="#fff" width={100} />
                ) : saveStates.greeting === 'success' ? (
                  <View style={styles.buttonContent}>
                    <Icon name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>تم الحفظ بنجاح</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>حفظ رسالة الترحيب</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Background Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="color-palette-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cardTitle}>تغيير خلفية التطبيق</Text>
              </View>
              <Text style={styles.inputLabel}>اختر إحدى الخلفيات المتاحة لتطبيقها على التطبيق. سيتم حفظ اختيارك مع حسابك الشخصي.</Text>
              <View style={styles.gradientGrid}>
                {gradientOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.gradientItem,
                      selectedGradientLocal === option.id && styles.selectedGradientItem
                    ]}
                    onPress={() => handleSelectGradient(option.id)}
                  >
                    <LinearGradient colors={option.colors} style={styles.gradientPreview}>
                      {option.isPremium && !isPremiumUser && (
                        <View style={styles.lockOverlay}>
                          <MaterialCommunityIcons name="crown" size={24} color="#FFA000" />
                        </View>
                      )}
                    </LinearGradient>
                    <Text style={styles.gradientName}>{option.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>



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
  container: { flex: 1, backgroundColor: '#14090e' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeButtonContainer: { padding: 15 },
  headerClosePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  headerCloseText: { color: '#fff', fontSize: 14, marginRight: 6 },
  content: { flex: 1, paddingHorizontal: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 10 },
  avatarContainer: { alignItems: 'center' },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ea384c',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  changeAvatarButton: {
    flexDirection: 'row-reverse',
    backgroundColor: '#ea384c',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  changeAvatarButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatarHint: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  inputLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'right', marginBottom: 10 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    textAlign: 'right',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    backgroundColor: '#ea384c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonLoading: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginRight: 8 },
  gradientGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  gradientItem: { width: '48%', marginBottom: 15, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  selectedGradientItem: { borderColor: '#fff' },
  gradientPreview: { height: 60, width: '100%' },
  gradientName: {
    color: '#fff',
    fontSize: 12, // Reduced font size
    textAlign: 'center',
    marginTop: 4,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  notificationItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 30,
  },
  notificationIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  notificationContent: { flex: 1, alignItems: 'flex-end' },
  notificationTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  notificationDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  footer: { alignItems: 'center', marginBottom: 30 },
  versionText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});

export default SettingsScreen;
