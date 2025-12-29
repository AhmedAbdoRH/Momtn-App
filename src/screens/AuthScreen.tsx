import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../components/auth/AuthProvider';
import HeartLogo from '../../components/HeartLogo';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
} from '../../theme';

const { width } = Dimensions.get('window');

const AuthScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const { signInWithGoogle, signIn, signUp } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message && error.message.includes('SIGN_IN_CANCELLED')) {
          return;
        }
        Alert.alert('خطأ', 'فشل تسجيل الدخول بجوجل: ' + error.message);
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء تسجيل الدخول بجوجل');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password || (!isLogin && !fullName)) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) Alert.alert('خطأ', error.message);
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          Alert.alert('خطأ', error.message);
        } else {
          Alert.alert('تم بنجاح', 'يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب');
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      Alert.alert('خطأ', 'حدث خطأ أثناء المصادقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[Colors.authGradientStart, Colors.authGradientMiddle, Colors.authGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <HeartLogo size="large" />
            </View>

            <View style={styles.authCard}>
              <Text style={styles.welcomeText}>{isLogin ? 'مرحباً بك مجدداً' : 'إنشاء حساب جديد'}</Text>
              <Text style={styles.instructionText}>
                {isLogin ? 'سجل دخولك للمتابعة' : 'انضم إلينا وابدأ رحلة الامتنان'}
              </Text>

              {!isLogin && (
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="الاسم الكامل"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="البريد الإلكتروني"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="كلمة المرور"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleEmailAuth}
                disabled={loading}
              >
                {loading && !isLogin ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading && isLogin && email === '' ? (
                  <ActivityIndicator color={Colors.googleBlue} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.googleButtonText}>
                      متابعة باستخدام جوجل
                    </Text>
                    <View style={styles.googleIconWrapper}>
                      <Image 
                        source={require('../../assets/google_logo.png')} 
                        style={styles.googleIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.toggleButton} 
                onPress={() => setIsLogin(!isLogin)}
              >
                <Text style={styles.toggleButtonText}>
                  {isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>بالمتابعة، أنت توافق على شروط الاستخدام</Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.huge,
  },
  authCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    opacity: 0.8,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingHorizontal: Spacing.lg,
    color: Colors.white,
    textAlign: 'right',
    fontSize: 16,
  },
  primaryButton: {
    width: '100%',
    height: 55,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: Spacing.md,
    fontSize: 12,
  },
  googleButton: {
    width: '100%',
    height: 55,
    backgroundColor: Colors.white,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  googleIconWrapper: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    color: '#444',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    marginTop: Spacing.xl,
    padding: Spacing.sm,
  },
  toggleButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    marginTop: Spacing.huge,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});

export default AuthScreen;


