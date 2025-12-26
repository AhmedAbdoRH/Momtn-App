
import React, { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { toast } from "../hooks/use-toast";
import { useAuth } from "./AuthProvider";

interface GradientOption {
  id: string;
  name: string;
  gradient: string;
  textColor?: string;
}

const gradientOptions: GradientOption[] = [
  {
    id: "default",
    name: "افتراضي",
    gradient: "bg-gradient-to-br from-[#2D1F3D] via-[#1A1F2C] to-[#3D1F2C]",
    textColor: "text-white"
  },
  {
    id: "spectrum-red",
    name: "الأحمر الهادئ",
    gradient: "bg-gradient-to-br from-[#3B0A0A] via-[#5C1A1A] to-[#3D1F2C]",
    textColor: "text-white"
  },
  {
    id: "velvet-rose-darker",
    name: "الورد المخملي الداكن",
    gradient: "bg-gradient-to-br from-[#14090e] via-[#4a1e34] to-[#9c3d1a]",
    textColor: "text-white"
  },
  {
    id: "olive-obsidian",
    name: "زيتون الأوبسيديان",
    gradient: "bg-gradient-to-br from-[#0A0E0A] via-[#1F2D24] to-[#3B4A36]",
    textColor: "text-white"
  }
];

const applyGradientToBody = (selected: GradientOption) => {
  // إزالة جميع الكلاسات السابقة
  gradientOptions.forEach(option => {
    option.gradient.split(' ').forEach(className => {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    });
  });

  // تطبيق الكلاسات الجديدة على body و html
  selected.gradient.split(' ').forEach(className => {
    document.body.classList.add(className);
    document.documentElement.classList.add(className);
  });

  // تطبيق الستايلات الإضافية بقوة أكبر
  const styleId = "gradient-full-height-style";
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = `
    html, body {
      height: 100% !important;
      min-height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      background-attachment: fixed !important;
    }
    #root {
      min-height: 100vh !important;
      background: transparent !important;
    }
    body {
      overflow-x: hidden !important;
    }
    /* Force background on all pages */
    .container, .min-h-screen, [style*="background"] {
      background: transparent !important;
    }
  `;

  console.log("Applied gradient to body:", selected.name, selected.gradient);
};

export const applyGradientById = (gradientId: string) => {
  const selected = gradientOptions.find(option => option.id === gradientId);
  if (selected) {
    console.log("Applying gradient by ID:", gradientId, selected.name);
    applyGradientToBody(selected);
  } else {
    console.warn("Gradient not found:", gradientId);
  }
};

// حفظ إعدادات الخلفية الخاصة بالمستخدم
const saveUserBackgroundPreference = async (userId: string, gradientId: string) => {
  try {
    // حفظ الإعدادات خاصة بالمستخدم فقط
    localStorage.setItem(`user-background-${userId}`, gradientId);
    console.log(`Saved background preference for user ${userId}:`, gradientId);
    return true;
  } catch (error) {
    console.error('Error saving background preference:', error);
    return false;
  }
};

// جلب إعدادات الخلفية الخاصة بالمستخدم
const getUserBackgroundPreference = async (userId: string): Promise<string | null> => {
  try {
    const saved = localStorage.getItem(`user-background-${userId}`);
    console.log(`Got background preference for user ${userId}:`, saved);
    return saved;
  } catch (error) {
    console.error('Error getting background preference:', error);
    return null;
  }
};

export const BackgroundSettings: React.FC = () => {
  const [selectedGradient, setSelectedGradient] = useState<string>("default");
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBackgroundPreference = async () => {
      if (!user) {
        // إذا لم يكن هناك مستخدم مسجل الدخول، استخدم الافتراضي
        console.log("No user logged in, using default gradient");
        setSelectedGradient('default');
        applyGradientById('default');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const savedGradientId = await getUserBackgroundPreference(user.id);
        const gradientId = savedGradientId || 'default';
        
        console.log("Loading background preference for user:", user.id, gradientId);
        setSelectedGradient(gradientId);
        applyGradientById(gradientId);
        
        // إرسال حدث لتطبيق الخلفية الخاصة بالمستخدم
        window.dispatchEvent(new CustomEvent('apply-gradient', { 
          detail: { gradientId, userId: user.id } 
        }));
      } catch (error) {
        console.error('Error loading background preference:', error);
        applyGradientById('default');
      } finally {
        setIsLoading(false);
      }
    };

    loadBackgroundPreference();
  }, [user]);

  const handleGradientSelect = async (gradientId: string) => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول لتغيير الخلفية",
        variant: "destructive"
      });
      return;
    }

    console.log("Selecting gradient for user:", user.id, gradientId);
    
    // تطبيق الخلفية فوراً
    setSelectedGradient(gradientId);
    applyGradientById(gradientId);
    
    try {
      const success = await saveUserBackgroundPreference(user.id, gradientId);
      if (success) {
        const selected = gradientOptions.find(option => option.id === gradientId);
        toast({
          title: "تم تغيير الخلفية",
          description: `تم تطبيق خلفية "${selected?.name}" بنجاح.`
        });
        
        // إرسال حدث لتطبيق الخلفية الخاصة بالمستخدم على جميع الصفحات
        console.log("Dispatching gradient change event for user:", user.id, gradientId);
        window.dispatchEvent(new CustomEvent('apply-gradient', { 
          detail: { gradientId, userId: user.id } 
        }));
        
        // إجبار إعادة تطبيق الخلفية بعد تأخير قصير
        setTimeout(() => {
          applyGradientById(gradientId);
        }, 200);
      } else {
        throw new Error('Failed to save preference');
      }
    } catch (error) {
      console.error('Error saving background preference:', error);
      toast({
        title: "تحذير",
        description: "تم تطبيق الخلفية ولكن لم يتم حفظها",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-black/60 p-6 rounded-lg shadow backdrop-blur-md border border-white/20">
      <h2 className="text-2xl font-semibold mb-6 text-white text-right">تغيير خلفية التطبيق</h2>

      <p className="text-right text-gray-300 mb-6">
        اختر إحدى الخلفيات المتاحة لتطبيقها على التطبيق. سيتم حفظ اختيارك مع حسابك الشخصي.
      </p>

      {!user && (
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-4 mb-6">
          <p className="text-yellow-200 text-right">
            يجب تسجيل الدخول لحفظ إعدادات الخلفية الخاصة بك.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {gradientOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleGradientSelect(option.id)}
              className={`${option.gradient} ${option.textColor || "text-white"} h-24 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg ${
                selectedGradient === option.id ? "ring-4 ring-white/50 ring-offset-2 ring-offset-transparent" : "border border-white/20"
              }`}
              aria-label={`تغيير الخلفية إلى ${option.name}`}
            >
              <span className="font-bold drop-shadow-md text-sm text-center px-2">{option.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
