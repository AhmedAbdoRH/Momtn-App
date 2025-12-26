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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../components/auth/AuthProvider';
import HeartLogo from '../../components/HeartLogo';
import {
  Colors,
  Spacing,
  Shadows,
} from '../../theme';

const { width } = Dimensions.get('window');

const AuthScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[Colors.authGradientStart, Colors.authGradientMiddle, Colors.authGradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <HeartLogo size="large" />
          </View>

          <View style={styles.authCard}>
            <Text style={styles.welcomeText}>مرحباً بك</Text>
            <Text style={styles.instructionText}>سجل دخولك بضغطة واحدة لتبدأ رحلتك</Text>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.googleButtonText}>
                    الدخول عبر جوجل
                  </Text>
                  <Icon name="logo-google" size={20} color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>بالمتابعة، أنت توافق على شروط الاستخدام</Text>
          </View>
        </View>
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
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.huge * 1.5,
    marginTop: Spacing.huge,
  },
  authCard: {
    padding: Spacing.xxl,
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  instructionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: Spacing.huge,
    opacity: 0.8,
  },
  googleButton: {
    width: '100%',
    height: 80,
    backgroundColor: 'white',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  googleButtonText: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '900',
    marginRight: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.massive * 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});

export default AuthScreen;

