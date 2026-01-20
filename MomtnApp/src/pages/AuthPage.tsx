
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AuthPage = () => {
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'resetPassword'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { toast: uiToast } = useToast();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      uiToast({
        variant: "destructive",
        title: "حقول مطلوبة",
        description: "يرجى إدخال البريد الإلكتروني",
      });
      return;
    }

    if (mode === 'resetPassword') {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          uiToast({
            variant: "destructive",
            title: "حدث خطأ",
            description: `خطأ في إعادة تعيين كلمة المرور: ${error.message}`,
          });
          toast.error(`خطأ في إعادة تعيين كلمة المرور: ${error.message}`);
        } else {
          uiToast({
            title: "تم إرسال رابط إعادة تعيين كلمة المرور",
            description: "تفقد بريدك الإلكتروني للحصول على تعليمات إعادة تعيين كلمة المرور",
          });
          toast.success("تم إرسال رابط إعادة تعيين كلمة المرور، تفقد بريدك الإلكتروني");
        }
      } catch (error) {
        console.error("Error in reset password:", error);
        uiToast({
          variant: "destructive",
          title: "حدث خطأ غير متوقع",
          description: "فشل في إرسال رابط إعادة تعيين كلمة المرور، يرجى المحاولة مرة أخرى",
        });
        toast.error("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى");
      } finally {
        setLoading(false);
        setMode('signIn'); // Return to sign in form after reset password request
      }
      return;
    }

    if (!password) {
      uiToast({
        variant: "destructive",
        title: "حقول مطلوبة",
        description: "يرجى إدخال كلمة المرور",
      });
      return;
    }

    setLoading(true);
    try {
      let error;

      if (mode === 'signIn') {
        const result = await signIn(email, password);
        error = result.error;

        if (error) {
          let errorMessage = "فشل في تسجيل الدخول";
          if (error.message === "Invalid login credentials") {
            errorMessage = "بيانات الدخول غير صحيحة";
          } else if (error.message?.includes("network")) {
            errorMessage = "خطأ في الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت";
          } else {
            console.error("Sign-in error details:", error);
            errorMessage = `خطأ: ${error.message || "حدث خطأ غير معروف"}`;
          }

          uiToast({
            variant: "destructive",
            title: "حدث خطأ",
            description: errorMessage,
          });

          // Also use the more visible Sonner toast
          toast.error(errorMessage);
        }
      } else {
        const result = await signUp(email, password);
        error = result.error;

        if (error) {
          let errorMessage = "فشل في إنشاء الحساب";
          if (error.message?.includes("already registered")) {
            errorMessage = "البريد الإلكتروني مسجل بالفعل";
          } else if (error.message?.includes("network")) {
            errorMessage = "خطأ في الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت";
          } else {
            console.error("Sign-up error details:", error);
            errorMessage = `خطأ: ${error.message || "حدث خطأ غير معروف"}`;
          }

          uiToast({
            variant: "destructive",
            title: "حدث خطأ",
            description: errorMessage,
          });

          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      uiToast({
        variant: "destructive",
        title: "حدث خطأ غير متوقع",
        description: "فشل في عملية التسجيل، يرجى المحاولة مرة أخرى",
      });

      toast.error("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log("Attempting to sign in with Google...");

      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error("Error signing in with Google:", error);
        let errorMessage = "فشل في تسجيل الدخول بواسطة جوجل";
        if (error.message?.includes("network")) {
          errorMessage = "خطأ في الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت";
        } else {
          errorMessage = `خطأ: ${error.message || "حدث خطأ غير معروف"}`;
        }

        uiToast({
          variant: "destructive",
          title: "حدث خطأ",
          description: errorMessage,
        });

        toast.error(errorMessage);
      } else {
        console.log("Google OAuth initiated:", data);
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      uiToast({
        variant: "destructive",
        title: "حدث خطأ",
        description: "فشل في تسجيل الدخول بواسطة جوجل: " + (error.message || "خطأ غير معروف"),
      });

      toast.error("فشل في تسجيل الدخول بواسطة جوجل");
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => {
    if (mode === 'resetPassword') {
      return (
        <div className="space-y-3 rounded-md shadow-sm">
          <div>
            <label htmlFor="email-address" className="sr-only">
              البريد الإلكتروني
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none bg-gray-800/50 backdrop-blur-sm relative block w-full px-3 py-3 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="البريد الإلكتروني"
              dir="rtl"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 rounded-md shadow-sm">
        <div>
          <label htmlFor="email-address" className="sr-only">
            البريد الإلكتروني
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none bg-gray-800/50 backdrop-blur-sm relative block w-full px-3 py-3 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="البريد الإلكتروني"
            dir="rtl"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none bg-gray-800/50 backdrop-blur-sm relative block w-full px-3 py-3 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="كلمة المرور"
            dir="rtl"
          />
          {mode === 'signIn' && (
            <div className="mt-1 text-right">
              <span
                className="text-sm text-indigo-300 hover:text-indigo-200 cursor-pointer"
                onClick={() => setMode('resetPassword')}
              >
                نسيت كلمة المرور؟
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2D1F3D] via-[#1A1F2C] to-[#3D1F2C] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="inline-block w-29 h-29">
            <img
              src="/lovable-uploads/2747e89b-5855-4294-9523-b5d3dd0527be.png"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-400 text-xs -mt-1 mb-4">Version 2.0</p>
          <h2 className="text-xl font-bold text-white mt-2">
            {mode === 'signIn'
              ? 'تسجيل الدخول'
              : mode === 'signUp'
                ? 'إنشاء حساب جديد'
                : 'استعادة كلمة المرور'}
          </h2>
        </div>
        <form className="mt-6 space-y-5" onSubmit={handleAuth}>
          {renderFormContent()}

          <div>
            <Button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري التحميل...
                </span>
              ) : (
                mode === 'signIn'
                  ? 'تسجيل الدخول'
                  : mode === 'signUp'
                    ? 'إنشاء حساب'
                    : 'إرسال رابط استعادة كلمة المرور'
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900/60 text-gray-400">
                أو
              </span>
            </div>
          </div>

          <div>
            <Button
              type="button"
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-gray-800 rounded-lg hover:bg-gray-100"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              التسجيل باستخدام جوجل
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              className="font-medium text-indigo-300 hover:text-indigo-200"
            >
              {mode === 'signIn'
                ? 'ليس لديك حساب؟ سجل الآن'
                : mode === 'signUp'
                  ? 'لديك حساب بالفعل؟ تسجيل الدخول'
                  : 'العودة إلى تسجيل الدخول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;