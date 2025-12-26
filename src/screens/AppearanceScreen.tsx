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
import { useNavigation } from '@react-navigation/native';

const AppearanceScreen: React.FC = () => {
  const navigation = useNavigation();
  
  const [darkMode, setDarkMode] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('default');

  const themes = [
    { id: 'default', name: 'الافتراضي', colors: ['#14090e', '#4a1e34', '#9c3d1a'] },
    { id: 'ocean', name: 'المحيط', colors: ['#0a192f', '#172a45', '#1e3a5f'] },
    { id: 'forest', name: 'الغابة', colors: ['#0d1f0d', '#1a3a1a', '#2d5a2d'] },
    { id: 'sunset', name: 'الغروب', colors: ['#1a0a1a', '#3d1a3d', '#5a2d5a'] },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#14090e', '#4a1e34']} style={styles.gradient}>
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
                {themes.map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeCard,
                      selectedTheme === theme.id && styles.themeCardSelected,
                    ]}
                    onPress={() => setSelectedTheme(theme.id)}
                  >
                    <LinearGradient colors={theme.colors} style={styles.themePreview} />
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
});

export default AppearanceScreen;
