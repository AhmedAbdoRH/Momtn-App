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
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useBackground } from '../providers/BackgroundProvider';
import { useToast } from '../providers/ToastProvider';

const PrivacyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedGradient } = useBackground();
  const { showToast } = useToast();

  const [privateProfile, setPrivateProfile] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [allowInvites, setAllowInvites] = useState(true);

  const handleChangePassword = () => {
    Alert.alert(
      'تغيير كلمة المرور',
      'سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إرسال',
          onPress: () => {
            showToast({ message: 'تم إرسال الرابط لبريدك الإلكتروني', type: 'success' });
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ حذف الحساب',
      'هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع بياناتك.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف الحساب',
          style: 'destructive',
          onPress: () => {
            showToast({ message: 'تم تقديم طلب الحذف، سيتم التنفيذ خلال 30 يوم', type: 'info' });
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={selectedGradient.colors} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>الخصوصية والأمان</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Privacy Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>إعدادات الخصوصية</Text>

              <View style={styles.optionItem}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>حساب خاص</Text>
                  <Text style={styles.optionDescription}>فقط المتابعون يمكنهم رؤية صورك</Text>
                </View>
                <Switch
                  value={privateProfile}
                  onValueChange={setPrivateProfile}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={privateProfile ? '#ea384c' : '#f4f3f4'}
                />
              </View>

              <View style={styles.optionItem}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>إظهار البريد الإلكتروني</Text>
                  <Text style={styles.optionDescription}>السماح للآخرين برؤية بريدك</Text>
                </View>
                <Switch
                  value={showEmail}
                  onValueChange={setShowEmail}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={showEmail ? '#ea384c' : '#f4f3f4'}
                />
              </View>

              <View style={styles.optionItem}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>السماح بالدعوات</Text>
                  <Text style={styles.optionDescription}>السماح للآخرين بدعوتك للمجموعات</Text>
                </View>
                <Switch
                  value={allowInvites}
                  onValueChange={setAllowInvites}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={allowInvites ? '#ea384c' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Security Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الأمان</Text>

              <TouchableOpacity style={styles.actionItem} onPress={handleChangePassword}>
                <View style={styles.actionInfo}>
                  <Icon name="key-outline" size={22} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.actionTitle}>تغيير كلمة المرور</Text>
                </View>
                <Icon name="chevron-back" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>

            {/* Danger Zone */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#ea384c' }]}>منطقة الخطر</Text>

              <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
                <View style={styles.actionInfo}>
                  <Icon name="trash-outline" size={22} color="#ea384c" />
                  <Text style={[styles.actionTitle, { color: '#ea384c' }]}>حذف الحساب</Text>
                </View>
                <Icon name="chevron-back" size={18} color="#ea384c" />
              </TouchableOpacity>
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
  optionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionInfo: { flex: 1, alignItems: 'flex-end', marginLeft: 15 },
  optionTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  optionDescription: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  actionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  actionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 12,
  },
  dangerItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(234,56,76,0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234,56,76,0.2)',
  },
});

export default PrivacyScreen;
