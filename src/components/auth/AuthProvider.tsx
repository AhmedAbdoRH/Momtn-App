import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/auth';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import messaging from '@react-native-firebase/messaging';
import { NotificationsService } from '../../services/notifications';

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: any; user?: SupabaseUser | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: any; user?: SupabaseUser | null }>;
  signInWithGoogle: () => Promise<{ error: any; user?: SupabaseUser | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<SupabaseUser | null>(null);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Sync user data to database
  const syncUserToDatabase = useCallback(async (authUser: SupabaseUser, fullName?: string) => {
    try {
      const displayName =
        fullName ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'مستخدم';

      const email = authUser.email;
      if (!email) {
        console.error('User email is required');
        return;
      }

      const { error } = await supabase.from('users').upsert(
        {
          id: authUser.id,
          email: email,
          full_name: displayName,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        },
      );

      if (error) {
        console.error('Error syncing user to database:', error);
      } else {
        console.log('User synced to database successfully');
      }
    } catch (error) {
      console.error('Error in syncUserToDatabase:', error);
    }
  }, []);

  // Register device token for push notifications
  const registerDeviceToken = useCallback(async (userId: string) => {
    try {
      console.log('Registering device token for user:', userId);
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        console.log('Current FCM Token:', token);

        // Subscribe to general topic for testing
        await messaging().subscribeToTopic('all_users');

        const platform = Platform.OS;

        // Clean up old tokens for this user on this platform that are different from current
        const { error: deleteError } = await supabase
          .from('device_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('platform', platform)
          .neq('token', token);

        if (deleteError) console.error('Error cleaning old tokens:', deleteError);

        const { error } = await supabase.from('device_tokens').upsert(
          {
            user_id: userId,
            token,
            platform,
          },
          {
            onConflict: 'user_id, token',
          },
        );

        if (error) {
          console.error('Error saving device token to DB:', error);
        } else {
          console.log('Device token registered in DB successfully for user:', userId);
        }
      } else {
        console.warn('Notification permission NOT granted');
      }
    } catch (error) {
      console.error('Exception in registerDeviceToken:', error);
    }
  }, []);

  // Handle foreground messages and token refresh
  const setupForegroundMessageHandler = useCallback(() => {
    // 1. Listen for new messages
    const unsubscribeMessage = messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received:', remoteMessage);

      const data = remoteMessage.data || {};
      const notificationId = data.notification_id || data.notificationId;
      const messageId =
        (data.messageId as string) || (data.message_id as string);
      const photoId = (data.photo_id as string) || (data.photoId as string);
      const type = data.type as string | undefined;
      const dedupeKeyValue =
        (data.dedupe_key as string) ||
        (data.dedupeKey as string) ||
        messageId ||
        photoId ||
        (notificationId as string);

      if (dedupeKeyValue) {
        try {
          const dedupeKey = `@push_dedupe_${type || 'unknown'}_${dedupeKeyValue}`;
          const alreadyShown = await AsyncStorage.getItem(dedupeKey);

          if (alreadyShown) {
            console.log(
              'Skipping duplicate foreground push notification:',
              dedupeKeyValue,
            );
            return;
          }

          await AsyncStorage.setItem(dedupeKey, '1');
        } catch (error) {
          console.error('Error in foreground de-duplication:', error);
        }
      }

      const title =
        remoteMessage.notification?.title ||
        (data.title as string) ||
        'إشعار جديد';
      const body =
        remoteMessage.notification?.body || (data.body as string) || '';

      await NotificationsService.showLocalNotification(
        title,
        body,
        data,
      );
    });

    // 2. Listen for token refreshes
    const unsubscribeToken = messaging().onTokenRefresh(async newToken => {
      console.log('FCM Token refreshed:', newToken);
      const currentUserId = userRef.current?.id;
      if (currentUserId) {
        const platform = Platform.OS;
        const { error } = await supabase.from('device_tokens').upsert(
          {
            user_id: currentUserId,
            token: newToken,
            platform,
          },
          {
            onConflict: 'user_id, token',
          },
        );
        if (error) console.error('Error updating refreshed token:', error);
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeToken();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const [{ data: userData }, { data: sessionData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);

    setUser(userData.user ?? null);
    setSession(sessionData.session ?? null);
  }, []);

  // Initialize auth
  const initializeAuth = useCallback(async () => {
    try {
      console.log('Initializing auth...');

      // Ensure Google sign-in is configured
      AuthService.configureGoogleSignIn();

      // Get current session
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        syncUserToDatabase(currentSession.user);
        registerDeviceToken(currentSession.user.id);
      }

      // Initialize notifications
      await NotificationsService.initialize();
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  }, [syncUserToDatabase, registerDeviceToken]);

  useEffect(() => {
    initializeAuth();

    // Setup auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event);

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'SIGNED_IN' && currentSession?.user) {
        syncUserToDatabase(currentSession.user);
        registerDeviceToken(currentSession.user.id);
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      }
    });

    // Setup foreground message and token refresh handlers
    const unsubscribeMessaging = setupForegroundMessageHandler();

    return () => {
      subscription.unsubscribe();
      unsubscribeMessaging();
    };
  }, [
    initializeAuth,
    syncUserToDatabase,
    registerDeviceToken,
    setupForegroundMessageHandler,
  ]);

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
  ): Promise<{ error: any; user?: SupabaseUser | null }> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      });

      if (error) {
        return { error, user: null };
      }

      if (data.user) {
        syncUserToDatabase(data.user, fullName);
        registerDeviceToken(data.user.id);
      }

      return { error: null, user: data.user };
    } catch (error: any) {
      console.error('Error during sign up:', error);
      return { error, user: null };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: any; user?: SupabaseUser | null }> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error, user: null };
      }

      if (data.user) {
        syncUserToDatabase(data.user);
        registerDeviceToken(data.user.id);
      }

      return { error: null, user: data.user };
    } catch (error: any) {
      console.error('Error during sign in:', error);
      return { error, user: null };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<{ error: any; user?: SupabaseUser | null }> => {
    try {
      setLoading(true);
      await AuthService.signInWithGoogle();

      const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        syncUserToDatabase(newSession.user);
        registerDeviceToken(newSession.user.id);
        return { error: null, user: newSession.user };
      }

      return { error: new Error('User not found after Google Sign-In'), user: null };
    } catch (error: any) {
      console.error('Error during Google sign in:', error);
      return { error, user: null };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      // Remove device token before signing out
      if (user?.id) {
        try {
          const token = await messaging().getToken();
          await supabase
            .from('device_tokens')
            .delete()
            .eq('user_id', user.id)
            .eq('token', token);
        } catch (tokenError) {
          console.error('Error removing device token:', tokenError);
        }
      }

      await AuthService.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
