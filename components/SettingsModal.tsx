import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../src/components/auth/AuthProvider';
import { supabase } from '../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

import { ProfileService } from '../src/services/profile';

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [greetingMessage, setGreetingMessage] = useState('لحظاتك السعيدة، والنعم الجميلة في حياتك ✨');
  const [displayName, setDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadProfileData();
    }
  }, [visible, user]);

  const loadProfileData = async () => {
    if (!user?.id) return;
    try {
      const profile = await ProfileService.getProfile(user.id);
      if (profile) {
        if (profile.user_welcome_message) {
          setGreetingMessage(profile.user_welcome_message);
        }
        if (profile.full_name) {
          setDisplayName(profile.full_name);
        } else {
          setDisplayName(user.user_metadata?.full_name || '');
        }
      } else {
        setDisplayName(user.user_metadata?.full_name || '');
      }
    } catch (e) {
      console.warn('Could not load profile:', e);
    }
  };

  const handleSaveSettings = async () => {
    if (!displayName.trim()) {
      Alert.alert('خطأ', 'يجب كتابة الاسم');
      return;
    }

    setIsUpdating(true);
    try {
      // Update Profile table
      if (user?.id) {
        await ProfileService.updateProfile(user.id, {
          full_name: displayName.trim(),
          user_welcome_message: greetingMessage.trim()
        });

        // Also update Auth metadata for consistency
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          full_name: displayName.trim(),
          greeting_message: greetingMessage.trim()
        }
      });

      if (updateError) throw updateError;

      await AsyncStorage.setItem(`userGreeting_${user.id}`, greetingMessage.trim());
      
      // Refresh user data globally
      if (refreshUser) {
        await refreshUser();
      }
    }

    Alert.alert('تم التحديث', 'تم تحديث إعداداتك بنجاح');
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveGreeting = () => {
    handleSaveSettings();
  };

  const handleSaveDisplayName = () => {
    handleSaveSettings();
  };

  const contributors = [
    { name: 'Ahmed Radhi', role: 'المطور الأساسي' },
    { name: 'محمد أحمد', role: 'مصمم الواجهات' },
    { name: 'فاطمة علي', role: 'مطور المحتوى' },
  ];

  const backgroundOptions = [
    { id: 'velvet-rose', name: 'الوردة المخملية', colors: ['#14090e', '#4a1e34', '#9c3d1a'] },
    { id: 'ocean-sunset', name: 'غروب المحيط', colors: ['#1a1a2e', '#16213e', '#e94560'] },
    { id: 'forest-dawn', name: 'فجر الغابة', colors: ['#0f3460', '#16537e', '#533483'] },
    { id: 'golden-hour', name: 'الساعة الذهبية', colors: ['#3d2914', '#8b4513', '#daa520'] },
  ];

  const renderTabButton = (tabId: string, title: string) => (
    <TouchableOpacity
      key={tabId}
      style={[styles.tabButton, activeTab === tabId && styles.activeTab]}
      onPress={() => setActiveTab(tabId)}
    >
      <Text style={[styles.tabText, activeTab === tabId && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderGeneralSettings = () => (
    <View style={styles.tabContent}>
      {/* Display Name Section */}
      <View style={styles.settingSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>اسمك الشخصي</Text>
          <Text style={styles.userIcon}>👤</Text>
        </View>
        <Text style={styles.sectionDescription}>
          الاسم الذي سيظهر في التعليقات والمجموعات
        </Text>
        <TextInput
          style={styles.textInput}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="أدخل اسمك الشخصي..."
          placeholderTextColor={Colors.textMuted}
        />
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: Colors.info }]}
          onPress={handleSaveDisplayName}
          disabled={isUpdating}
        >
          <Text style={styles.saveButtonText}>
            {isUpdating ? 'جاري التحديث...' : 'حفظ الاسم'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Greeting Message Section */}
      <View style={styles.settingSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>رسالة الترحيب</Text>
          <Text style={styles.userIcon}>👋</Text>
        </View>
        <Text style={styles.sectionDescription}>
          الرسالة التي تظهر في أعلى الشاشة الرئيسية
        </Text>
        <TextInput
          style={styles.textInput}
          value={greetingMessage}
          onChangeText={setGreetingMessage}
          placeholder="أدخل رسالة الترحيب..."
          placeholderTextColor={Colors.textMuted}
        />
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveGreeting}
        >
          <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAppearanceSettings = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>اختر خلفية التطبيق</Text>
      <View style={styles.backgroundsGrid}>
        {backgroundOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.backgroundOption}
            onPress={() => Alert.alert('قريباً', 'سيتم تفعيل تغيير الخلفية في التحديث القادم')}
          >
            <View style={[styles.colorPreview, { backgroundColor: option.colors[1] }]} />
            <Text style={styles.backgroundName}>{option.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAboutSettings = () => (
    <View style={styles.tabContent}>
      <View style={styles.aboutHeader}>
        <Text style={styles.appName}>ممتن Momtn</Text>
        <Text style={styles.appVersion}>الإصدار 1.0.0</Text>
      </View>
      
      <Text style={styles.aboutDescription}>
        تطبيق ممتن هو مساحتك الخاصة لتوثيق اللحظات الجميلة والنعم التي تمر بها يومياً.
        هدفنا هو تعزيز الإيجابية والامتنان في حياتك اليومية.
      </Text>

      <Text style={styles.sectionTitle}>فريق العمل</Text>
      {contributors.map((contributor, index) => (
        <View key={index} style={styles.contributorItem}>
          <View style={styles.contributorAvatar}>
            <Text style={styles.avatarText}>{contributor.name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.contributorName}>{contributor.name}</Text>
            <Text style={styles.contributorRole}>{contributor.role}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={onClose}
      transparent={Platform.OS !== 'ios'}
    >
      <View style={Platform.OS === 'ios' ? styles.iosContainer : styles.androidOverlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>الإعدادات</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              {renderTabButton('general', 'عام')}
              {renderTabButton('appearance', 'المظهر')}
              {renderTabButton('about', 'عن التطبيق')}
            </ScrollView>
          </View>

          <ScrollView style={styles.contentScroll}>
            {activeTab === 'general' && renderGeneralSettings()}
            {activeTab === 'appearance' && renderAppearanceSettings()}
            {activeTab === 'about' && renderAboutSettings()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  iosContainer: {
    flex: 1,
    backgroundColor: Colors.authGradientMiddle,
  },
  androidOverlay: {
    flex: 1,
    backgroundColor: Colors.glassBlack,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.glassCard,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.glassHeader,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  closeButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
  },
  tabsContainer: {
    backgroundColor: Colors.glassLight,
    paddingVertical: Spacing.sm,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.md,
  },
  tabButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.textPrimary,
  },
  contentScroll: {
    flex: 1,
  },
  tabContent: {
    padding: Spacing.lg,
  },
  settingSection: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.glassInput,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLighter,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'right',
  },
  userIcon: {
    fontSize: 20,
  },
  sectionDescription: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: Colors.glassBlack,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: Typography.body.fontSize,
  },
  backgroundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  backgroundOption: {
    width: '48%',
    marginBottom: Spacing.md,
    backgroundColor: Colors.glassInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  colorPreview: {
    width: '100%',
    height: 80,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  backgroundName: {
    color: Colors.textPrimary,
    fontSize: Typography.caption.fontSize,
  },
  aboutHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  appName: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  appVersion: {
    color: Colors.textMuted,
    fontSize: Typography.caption.fontSize,
  },
  aboutDescription: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.glassInput,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassInput,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  contributorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: Typography.h4.fontSize,
  },
  contributorName: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: Typography.body.fontSize,
    textAlign: 'left',
  },
  contributorRole: {
    color: Colors.textMuted,
    fontSize: Typography.caption.fontSize,
    textAlign: 'left',
  },
});

export default SettingsModal;
