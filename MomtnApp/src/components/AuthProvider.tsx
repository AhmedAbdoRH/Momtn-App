
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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

// Helper function to load user's background preference
const loadUserBackgroundPreference = async (userId: string) => {
  try {
    const savedGradient = localStorage.getItem(`user-background-${userId}`);
    const gradientId = savedGradient || 'default';

    console.log(`Loading background preference for user ${userId}:`, gradientId);

    // Dispatch event to apply the user's background
    window.dispatchEvent(new CustomEvent('apply-gradient', {
      detail: { gradientId, userId }
    }));
  } catch (error) {
    console.error('Error loading user background preference:', error);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("Setting up auth listener...");

    // Check if this is an OAuth callback
    const isOAuthCallback = window.location.hash.includes('access_token') ||
      window.location.search.includes('code');
    console.log("Initial OAuth callback check:", isOAuthCallback);

    // First set up the auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email);

        if (event === 'INITIAL_SESSION') {
          console.log("Initial session detected");
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user?.id) {
            await loadUserBackgroundPreference(newSession.user.id);
          }

          // For OAuth callback on initial session, redirect to home
          if (newSession && isOAuthCallback) {
            console.log("OAuth callback with session, redirecting to home");
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 100);
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log("User signed in or token refreshed");
          setSession(newSession);
          setUser(newSession?.user ?? null);

          // Load user's background preference when they sign in
          if (newSession?.user?.id) {
            await loadUserBackgroundPreference(newSession.user.id);
          }

          // For Google OAuth and new users, always redirect to home
          if (newSession) {
            // Check if this is coming from OAuth callback or if on auth page
            const currentIsOAuth = window.location.hash.includes('access_token') ||
              window.location.search.includes('code');
            const isOnAuthPage = location.pathname === '/auth';

            console.log("OAuth callback detected:", currentIsOAuth, "On auth page:", isOnAuthPage);

            if (currentIsOAuth || isOnAuthPage) {
              console.log("Redirecting to home after successful authentication");
              setTimeout(() => {
                navigate('/', { replace: true });
              }, 100);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out");
          setSession(null);
          setUser(null);

          // Apply default background when user signs out
          window.dispatchEvent(new CustomEvent('apply-gradient', {
            detail: { gradientId: 'default', userId: null }
          }));

          navigate('/auth');
        } else if (event === 'USER_UPDATED') {
          console.log("User updated");
          setSession(newSession);
          setUser(newSession?.user ?? null);
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log("Password recovery event detected");
          // The recovery token is already in the URL in hash parameters
          // ResetPasswordPage will handle this token
          navigate('/reset-password');
        }

        setLoading(false);
      }
    );

    // Then check for the current session
    const getSession = async () => {
      try {
        console.log("Getting current session...");
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          return;
        }

        console.log("Current session:", session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        // Load user's background preference if user is logged in
        if (session?.user?.id) {
          await loadUserBackgroundPreference(session.user.id);
        }

        // Redirect if needed - but only if user is logged in and on auth page
        if (location.pathname === '/auth' && session) {
          console.log("User already logged in, redirecting from auth page to home");
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const signUp = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign up:", email);
      const displayName = email.split('@')[0];

      // Sign up the user with display name in metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName
          }
        }
      });

      console.log("Sign up result:", error ? `Error: ${error.message}` : "Success", data);

      // Save user to public.users table
      if (data.user) {
        await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: displayName,
            created_at: new Date().toISOString()
          });
      }

      // Redirect to home page after successful signup
      if (!error && data.user) {
        setUser(data.user);
        setSession(data.session);

        // Load default background for new user
        if (data.user.id) {
          await loadUserBackgroundPreference(data.user.id);
        }

        navigate('/', { replace: true });
      }

      return { error };
    } catch (error: any) {
      console.error('Error during sign up:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in:", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      // Ensure user exists in public.users table
      if (data.user) {
        const displayName = data.user.user_metadata?.full_name || email.split('@')[0];

        await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: displayName,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
      }

      console.log("Sign in result:", error ? `Error: ${error.message}` : "Success", data);

      if (!error && data.user) {
        // Load user's background preference
        if (data.user.id) {
          await loadUserBackgroundPreference(data.user.id);
        }
        navigate('/', { replace: true });
      }
      return { error };
    } catch (error: any) {
      console.error('Error during sign in:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out...");
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    session,
    user,
    signUp,
    signIn,
    signOut,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
