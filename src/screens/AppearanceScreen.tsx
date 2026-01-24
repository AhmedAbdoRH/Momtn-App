import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useBackground, gradientOptions, GradientOption } from '../providers/BackgroundProvider';
import { useAuth } from '../components/auth/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { Alert } from 'react-native';

const AppearanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedGradient: currentGradient, setGradient, isPremiumUser } = useBackground();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [darkMode, setDarkMode] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(currentGradient.id);

  const handleThemeChange = async (theme: GradientOption) => {
    if (theme.isPremium && !isPremiumUser) {
      Alert.alert(
        'ميزة ممتن بريميوم 👑',
        'هذه السمة مخصصة لمشتركي نسخة البريميوم. ستتوفر نسخة "ممتن بريميوم" قريباً!',
        [
          { text: 'حسناً', style: 'cancel' }
        ]
      );
      return;
    }

    setSelectedTheme(theme.id);
    try {
      await setGradient(theme.id);
      showToast({ message: 'تم تغيير المظهر بنجاح', type: 'success' });
    } catch (error) {
      console.error('Error changing theme:', error);
      showToast({ message: 'فشل تغيير المظهر', type: 'error' });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={currentGradient.colors} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>إعدادات المظهر</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Theme Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>السمة</Text>
              <View style={styles.themesGrid}>
                {gradientOptions.map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeCard,
                      selectedTheme === theme.id && styles.themeCardSelected,
                    ]}
                    onPress={() => handleThemeChange(theme)}
                  >
                    <LinearGradient colors={theme.colors} style={styles.themePreview}>
                      {theme.isPremium && !isPremiumUser && (
                        <View style={styles.lockOverlay}>
                          <MaterialCommunityIcons name="crown" size={24} color="#FFA000" />
                        </View>
                      )}
                    </LinearGradient>
                    <Text style={styles.themeName}>{theme.name}</Text>
                    {selectedTheme === theme.id && (
                      <View style={styles.checkmark}>
                        <Icon name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Display Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>خيارات العرض</Text>

              <View style={styles.optionItem}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>الوضع الداكن</Text>
                  <Text style={styles.optionDescription}>تفعيل المظهر الداكن للتطبيق</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={darkMode ? '#ea384c' : '#f4f3f4'}
                />
              </View>

              <View style={styles.optionItem}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>الرسوم المتحركة</Text>
                  <Text style={styles.optionDescription}>تفعيل حركات الانتقال والتأثيرات</Text>
                </View>
                <Switch
                  value={animations}
                  onValueChange={setAnimations}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={animations ? '#ea384c' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Icon name="information-circle" size={20} color="rgba(255,255,255,0.5)" />
              <Text style={styles.infoText}>
                بعض الإعدادات قد تتطلب إعادة تشغيل التطبيق لتطبيقها
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  placeholder: { width: 40 },
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'right',
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardSelected: {
    borderColor: '#ea384c',
  },
  themePreview: {
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
  themeName: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea384c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionInfo: { flex: 1, alignItems: 'flex-end', marginLeft: 15 },
  optionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  optionDescription: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  infoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginRight: 10,
    flex: 1,
    textAlign: 'right',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});

export default AppearanceScreen;
