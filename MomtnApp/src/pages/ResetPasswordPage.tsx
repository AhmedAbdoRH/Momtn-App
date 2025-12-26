
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();

  useEffect(() => {
    // Get the hash from the URL
    const hashFromUrl = window.location.hash.substring(1);
    if (hashFromUrl) {
      const params = new URLSearchParams(hashFromUrl);
      const accessToken = params.get('access_token');
      if (accessToken) {
        setHash(accessToken);
      }
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      uiToast({
        variant: "destructive",
        title: "حقول مطلوبة",
        description: "يرجى إدخال كلمة المرور وتأكيدها",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      uiToast({
        variant: "destructive",
        title: "خطأ في كلمة المرور",
        description: "كلمات المرور غير متطابقة",
      });
      return;
    }
    
    if (password.length < 6) {
      uiToast({
        variant: "destructive",
        title: "كلمة المرور قصيرة",
        description: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل",
      });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error("Error resetting password:", error);
        uiToast({
          variant: "destructive",
          title: "حدث خطأ",
          description: `فشل في تحديث كلمة المرور: ${error.message}`,
        });
        toast.error(`فشل في تحديث كلمة المرور: ${error.message}`);
      } else {
        uiToast({
          title: "تم تحديث كلمة المرور",
          description: "تم تحديث كلمة المرور بنجاح، سيتم توجيهك إلى صفحة تسجيل الدخول",
        });
        toast.success("تم تحديث كلمة المرور بنجاح");
        
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error) {
      console.error("Error in reset password:", error);
      uiToast({
        variant: "destructive",
        title: "حدث خطأ غير متوقع",
        description: "فشل في تحديث كلمة المرور، يرجى المحاولة مرة أخرى",
      });
      toast.error("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };
  
  if (!hash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D1F3D] via-[#1A1F2C] to-[#3D1F2C] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-gray-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl text-center">
          <div className="text-red-400">
            <h2 className="text-2xl font-bold">رابط غير صالح</h2>
            <p className="mt-2">رابط إعادة تعيين كلمة المرور غير صالح أو انتهت صلاحيته.</p>
            <Button 
              className="mt-4"
              onClick={() => navigate('/auth')}
            >
              العودة إلى صفحة تسجيل الدخول
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2D1F3D] via-[#1A1F2C] to-[#3D1F2C] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-gray-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="inline-block mb-6 w-32 h-32">
            <img
              src="/musin-logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-white">إعادة تعيين كلمة المرور</h2>
          <p className="mt-2 text-gray-400">
            أدخل كلمة المرور الجديدة
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="password" className="sr-only">
                كلمة المرور الجديدة
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none bg-gray-800/50 backdrop-blur-sm relative block w-full px-3 py-3 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="كلمة المرور الجديدة"
                dir="rtl"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                تأكيد كلمة المرور
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none bg-gray-800/50 backdrop-blur-sm relative block w-full px-3 py-3 border border-gray-700 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="تأكيد كلمة المرور"
                dir="rtl"
              />
            </div>
          </div>

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
                'تحديث كلمة المرور'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
