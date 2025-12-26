import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Linking,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const AboutScreen: React.FC = () => {
  const navigation = useNavigation();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const contributors = [
    { name: 'أحمد عبده', role: 'المطور الرئيسي', icon: '👨‍💻' },
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
            <Text style={styles.headerTitle}>حول التطبيق</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* App Logo & Info */}
            <View style={styles.appSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/Logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>ممتن</Text>
              <Text style={styles.appVersion}>الإصدار 1.0.0</Text>
              <Text style={styles.appDescription}>
                تطبيق لتوثيق لحظات الامتنان والنعم الجميلة في حياتك ومشاركتها مع من تحب
              </Text>
            </View>

            {/* Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ المميزات</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Icon name="heart" size={20} color="#ea384c" />
                  <Text style={styles.featureText}>توثيق لحظات الامتنان</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="people" size={20} color="#ea384c" />
                  <Text style={styles.featureText}>مساحات مشتركة مع العائلة والأصدقاء</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="chatbubbles" size={20} color="#ea384c" />
                  <Text style={styles.featureText}>دردشة جماعية</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="images" size={20} color="#ea384c" />
                  <Text style={styles.featureText}>مشاركة الصور والذكريات</Text>
                </View>
              </View>
            </View>

            {/* Contributors */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 فريق التطوير</Text>
              {contributors.map((contributor, index) => (
                <View key={index} style={styles.contributorCard}>
                  <Text style={styles.contributorIcon}>{contributor.icon}</Text>
                  <View style={styles.contributorInfo}>
                    <Text style={styles.contributorName}>{contributor.name}</Text>
                    <Text style={styles.contributorRole}>{contributor.role}</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Contributors' as never)}
              >
                <Text style={styles.viewAllButtonText}>عرض جميع المساهمين</Text>
                <Icon name="arrow-forward" size={18} color="#ea384c" />
              </TouchableOpacity>
            </View>

            {/* Links */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔗 روابط</Text>
              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => openLink('https://example.com/privacy')}
              >
                <Text style={styles.linkText}>سياسة الخصوصية</Text>
                <Icon name="open-outline" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => openLink('https://example.com/terms')}
              >
                <Text style={styles.linkText}>شروط الاستخدام</Text>
                <Icon name="open-outline" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>صُنع بـ ❤️ في مصر</Text>
              <Text style={styles.copyright}>© 2025 ممتن. جميع الحقوق محفوظة</Text>
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
  appSection: { alignItems: 'center', marginBottom: 30 },
  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  logo: { width: '100%', height: '100%' },
  appName: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 5 },
  appVersion: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 15 },
  appDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'right',
  },
  featuresList: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
  },
  featureItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 12,
    flex: 1,
    textAlign: 'right',
  },
  contributorCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  contributorIcon: { fontSize: 30, marginLeft: 12 },
  contributorInfo: { flex: 1, alignItems: 'flex-end' },
  contributorName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  contributorRole: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 },
  viewAllButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(234,56,76,0.1)',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(234,56,76,0.3)',
  },
  viewAllButtonText: {
    color: '#ea384c',
    fontSize: 15,
    fontWeight: '600',
  },
  linkItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  linkText: { color: '#fff', fontSize: 15 },
  footer: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 5 },
  copyright: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});

export default AboutScreen;
