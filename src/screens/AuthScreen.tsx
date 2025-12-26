import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../components/auth/AuthProvider';
import HeartLogo from '../../components/HeartLogo';
import { 
  Colors, 
  Spacing, 
  BorderRadius, 
  Shadows, 
  Typography,
  ComponentSizes 
} from '../../theme';

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message && error.message.includes('SIGN_IN_CANCELLED')) {
          // تم إلغاء التسجيل من قبل المستخدم، لا نحتاج لإظهار خطأ
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

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !fullName)) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = isSignUp 
        ? await signUp(email, password, fullName)
        : await signIn(email, password);

      if (error) {
        let message = error.message;
        if (message.includes('Invalid login credentials')) {
          message = 'بيانات الدخول غير صحيحة';
        } else if (message.includes('User already registered')) {
          message = 'هذا البريد الإلكتروني مسجل بالفعل';
        }
        Alert.alert('خطأ', message);
      } else {
        if (isSignUp) {
          setIsSignUp(false);
        }
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient 
        colors={[Colors.authGradientStart, Colors.authGradientMiddle, Colors.authGradientEnd]} 
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.headerContainer}>
              <HeartLogo />
              <Text style={styles.appTitle}>تطبيق ممتن</Text>
              <Text style={styles.appSubtitle}>سجّل لحظاتك الجميلة وشاركها مع من تحب 💕</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.title}>
                {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
              </Text>

              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Icon name="person-outline" size={ComponentSizes.iconSm} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="الاسم الكامل"
                    placeholderTextColor={Colors.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Icon name="mail-outline" size={ComponentSizes.iconSm} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="البريد الإلكتروني"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Icon name="lock-closed-outline" size={ComponentSizes.iconSm} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="كلمة المرور"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Icon name="logo-google" size={ComponentSizes.iconSm} color={Colors.textPrimary} style={styles.googleIcon} />
                <Text style={styles.googleButtonText}>
                  تسجيل الدخول باستخدام جوجل
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.switchText}>
                  {isSignUp 
                    ? 'لديك حساب بالفعل؟ تسجيل الدخول' 
                    : 'ليس لديك حساب؟ إنشاء حساب جديد'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.huge,
  },
  appTitle: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  appSubtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  formContainer: {
    backgroundColor: Colors.glassCard,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.glassBorder, // More subtle border
    ...Shadows.lg,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: Typography.h2.fontWeight,
    color: Colors.textPrimary,
    marginBottom: Spacing.xxl,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassInput,
    borderRadius: BorderRadius.xl, // More rounded
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : 0,
    borderWidth: 1,
    borderColor: Colors.borderLighter,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: ComponentSizes.inputHeight,
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    textAlign: 'right',
  },
  button: {
    backgroundColor: Colors.primary,
    height: ComponentSizes.buttonHeightLg,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.lg,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  dividerText: {
    color: Colors.textMuted,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.bodySmall.fontSize,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: Colors.googleBlue,
    height: ComponentSizes.buttonHeightLg,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.google,
  },
  googleIcon: {
    marginRight: Spacing.sm,
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  switchButton: {
    marginTop: Spacing.xl,
    padding: Spacing.sm,
  },
  switchText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: Typography.bodySmall.fontSize,
  },
});

export default AuthScreen;
