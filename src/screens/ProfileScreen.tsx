import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../services/supabase';
import { ProfileService } from '../services/profile';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
    if (user?.id) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id) return;
    try {
      const profile = await ProfileService.getProfile(user.id);
      if (profile) {
        if (profile.user_welcome_message) {
          setGreetingMessage(profile.user_welcome_message);
        }
        if (profile.full_name) {
          setFullName(profile.full_name);
        }
      }
    } catch (e) {
      console.warn('Could not load profile:', e);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم');
      return;
    }

    setLoading(true);
    try {
      // Update Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          full_name: fullName.trim(),
          greeting_message: greetingMessage.trim()
        }
      });

      if (authError) throw authError;

      // Update Profile table
      if (user?.id) {
        await ProfileService.updateProfile(user.id, {
          full_name: fullName.trim(),
          user_welcome_message: greetingMessage.trim()
        });
        
        // Save to AsyncStorage as backup
        try {
          await AsyncStorage.setItem(`userGreeting_${user.id}`, greetingMessage.trim());
        } catch (e) {
          console.warn('Could not save greeting to local storage:', e);
        }

        // Refresh user data globally
        if (refreshUser) {
          await refreshUser();
        }
      }

      Alert.alert('تم الحفظ', 'تم تحديث الملف الشخصي بنجاح');
      setHasChanges(false);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.headerTitle}>الملف الشخصي</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <LinearGradient colors={['#ea384c', '#9c3d1a']} style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>
                    {(fullName || user?.email || 'م').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الاسم الكامل</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    setHasChanges(true);
                  }}
                  placeholder="أدخل اسمك الكامل"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>رسالة الترحيب</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={greetingMessage}
                  onChangeText={(text) => {
                    setGreetingMessage(text);
                    setHasChanges(true);
                  }}
                  placeholder="اكتب رسالة الترحيب التي تظهر في الصفحة الرئيسية"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  textAlign="right"
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.hint}>هذه الرسالة ستظهر في الصفحة الرئيسية</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledText}>{user?.email}</Text>
                  <Icon name="lock-closed" size={16} color="rgba(255,255,255,0.3)" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>تاريخ الانضمام</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledText}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ar-EG') : '-'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Save Button */}
            {hasChanges && (
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: { width: 40 },
  content: { flex: 1, padding: 20 },
  avatarSection: { alignItems: 'center', marginVertical: 30 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#ea384c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  formSection: { marginTop: 20 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    textAlign: 'right',
  },
  disabledInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  disabledText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  saveButton: {
    backgroundColor: '#ea384c',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default ProfileScreen;
