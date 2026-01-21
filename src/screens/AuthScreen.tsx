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
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../components/auth/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import HeartLogo from '../../components/HeartLogo';
import {
  Colors,
  Spacing,
  Shadows,
} from '../../theme';

const AuthScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const { showToast } = useToast();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message && error.message.includes('SIGN_IN_CANCELLED')) {
          return;
        }
        showToast({
          message: 'فشل تسجيل الدخول بجوجل: ' + error.message,
          type: 'error'
        });
      }
    } catch (error) {
      showToast({
        message: 'حدث خطأ أثناء تسجيل الدخول بجوجل',
        type: 'error'
      });
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
              <Text style={styles.welcomeText}>مرحباً بك في ممتن</Text>
              <Text style={styles.instructionText}>
                يمكنك الدخول باستخدام حسابك في جوجل
              </Text>

              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.googleBlue} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.googleButtonText}>
                      متابعة باستخدام جوجل
                    </Text>
                    <View style={styles.googleIconWrapper}>
                      <Image
                        source={require('../../assets/Logo.png')}
                        style={styles.googleIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>بالمتابعة، أنت توافق على شروط الاستخدام</Text>
              <Text style={[styles.footerText, { marginTop: 8, opacity: 0.6 }]}>V 1.1.2</Text>
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


