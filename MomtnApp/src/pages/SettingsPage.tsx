import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ContributorsList } from "../components/ContributorsList";
import { BackgroundSettings } from "../components/BackgroundSettings";
import { Button } from "../components/ui/button";
import { ArrowLeft, MessageSquare, User, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../components/AuthProvider";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../integrations/supabase/client";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Load saved greeting message and display name
  useEffect(() => {
    if (user) {
      const savedGreeting = localStorage.getItem(`userGreeting_${user.id}`) || 
                         'لحظاتك السعيدة، والنعم الجميلة في حياتك';
      setGreetingMessage(savedGreeting);
      
      // Load display name from database
      loadDisplayName();
    }
  }, [user]);

  const loadDisplayName = async () => {
    if (!user) return;
    
    try {
      // First try to get from user_metadata (from auth.users)
      if (user.user_metadata?.full_name) {
        setDisplayName(user.user_metadata.full_name);
        return;
      }
      
      // Fall back to public.users table
      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (error || !data?.full_name) {
        // If no record exists, use email prefix as default
        const emailPrefix = user.email?.split('@')[0] || '';
        setDisplayName(emailPrefix);
        // Save this as the display name
        await updateDisplayNameInDatabase(emailPrefix);
        return;
      }

      setDisplayName(data.full_name);
      // Also update auth.users to keep in sync
      await updateUserMetadata(data.full_name);
    } catch (err) {
      console.error('Exception loading display name:', err);
      const emailPrefix = user.email?.split('@')[0] || '';
      setDisplayName(emailPrefix);
    }
  };
  
  const updateUserMetadata = async (fullName: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      
      if (error) {
        console.error('Error updating user metadata:', error);
      }
    } catch (err) {
      console.error('Exception updating user metadata:', err);
    }
  };
  
  const updateDisplayNameInDatabase = async (fullName: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: fullName.trim()
        });
    } catch (err) {
      console.error('Error updating display name in database:', err);
    }
  };

  const handleGreetingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGreetingMessage(e.target.value);
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const saveGreeting = () => {
    if (user?.id) {
      localStorage.setItem(`userGreeting_${user.id}`, greetingMessage);
      // Notify other components about the greeting update
      window.dispatchEvent(new Event('greetingUpdated'));
      
      toast({
        title: "تم الحفظ",
        description: "تم تحديث رسالة الترحيب بنجاح"
      });
    }
  };

  const saveDisplayName = async () => {
    if (!user?.id) return;
    
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast({
        title: "خطأ",
        description: "يجب كتابة الاسم",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingName(true);
    try {
      // Update in auth.users metadata
      await updateUserMetadata(trimmedName);
      
      // Update in public.users table
      await updateDisplayNameInDatabase(trimmedName);

      // Update the user object in the current session
      const { data: { user: updatedUser }, error: updateError } = await supabase.auth.updateUser({
        data: { full_name: trimmedName }
      });

      if (updateError) throw updateError;

      // Update local state
      setDisplayName(trimmedName);
      
      // Notify other components about the name update
      window.dispatchEvent(new CustomEvent('displayNameUpdated', { 
        detail: { displayName: trimmedName } 
      }));
      
      toast({
        title: "تم التحديث",
        description: "تم تحديث اسمك الشخصي بنجاح"
      });
    } catch (err) {
      console.error('Exception updating display name:', err);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تحديث الاسم",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  useEffect(() => {
    const savedGradient = localStorage.getItem("app-background-gradient");
    if (savedGradient) {
      const event = new CustomEvent('apply-gradient', { detail: { gradientId: savedGradient } });
      window.dispatchEvent(event);
    }
  }, []);

  return (
    <div className="container mx-auto p-4 min-h-screen" style={{ background: 'transparent' }}>
      <div className="flex justify-between items-center mb-8">
        <Button
          onClick={() => navigate("/")}
          variant="glass"
          className="flex items-center gap-2 hover:bg-white/20 transition-all duration-300"
          size="lg"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>العودة للرئيسية</span>
        </Button>
        <h1 className="text-3xl font-bold text-gradient">الإعدادات</h1>
      </div>

      <div className="glass-effect p-8 rounded-2xl shadow-xl backdrop-blur-md bg-black/60 border border-white/10">
        <Tabs defaultValue="general" dir="rtl" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-8 bg-black/30 backdrop-blur-md p-1.5 rounded-lg">
            <TabsTrigger
              value="general"
              className="text-lg py-3 rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-300"
            >
              الإعدادات العامة
            </TabsTrigger>
            <TabsTrigger
              value="contributors"
              className="text-lg py-3 rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-300"
            >
              لائحة الشكر
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-8">
            {/* Display Name Section */}
            <section className="bg-gradient-to-br from-black/60 to-black/40 p-6 rounded-xl shadow-lg backdrop-blur-md border border-white/10">
              <h2 className="text-2xl font-semibold mb-6 text-white text-right flex items-center gap-2 justify-end">
                <User className="w-6 h-6" />
                اسمك الشخصي
              </h2>
              <div className="space-y-4">
                <div className="text-right">
                  <Label htmlFor="displayName" className="text-white text-sm mb-2 block">
                    الاسم الذي سيظهر في التعليقات والمجموعات
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={handleDisplayNameChange}
                    className="w-full bg-white/5 border-2 border-white/10 text-white text-lg p-4 hover:border-blue-400/50 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/30 transition-all duration-200 rounded-lg h-auto text-right"
                    placeholder="أدخل اسمك الشخصي..."
                    dir="rtl"
                  />
                  <p className="text-xs text-gray-400 text-right mt-2">
                    إذا تركت هذا الحقل فارغاً، سيتم استخدام "{user?.email?.split('@')[0]}" كاسم افتراضي
                  </p>
                </div>
                <Button 
                  onClick={saveDisplayName}
                  disabled={isUpdatingName}
                  className="w-full py-3 text-lg font-bold bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white shadow-lg hover:shadow-blue-500/30 transition-all duration-300 rounded-lg"
                >
                  {isUpdatingName ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري التحديث...
                    </div>
                  ) : (
                    'حفظ الاسم'
                  )}
                </Button>
              </div>
            </section>

            {/* Greeting Message Section */}
            <section className="bg-gradient-to-br from-black/60 to-black/40 p-6 rounded-xl shadow-lg backdrop-blur-md border border-white/10">
              <h2 className="text-2xl font-semibold mb-6 text-white text-right flex items-center gap-2 justify-end">
                <MessageSquare className="w-6 h-6" />
                رسالة الترحيب
              </h2>
              <div className="space-y-4">
                <div className="text-right">
                  <Label htmlFor="greeting" className="text-white text-sm mb-2 block">
                    الرسالة التي تظهر في الصفحة الرئيسية
                  </Label>
                  <Input
                    id="greeting"
                    value={greetingMessage}
                    onChange={handleGreetingChange}
                    className="w-full bg-white/5 border-2 border-white/10 text-white text-lg p-4 hover:border-blue-400/50 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/30 transition-all duration-200 rounded-lg h-auto text-right"
                    placeholder="اكتب رسالتك الترحيبية هنا..."
                    dir="rtl"
                  />
                </div>
                <Button 
                  onClick={saveGreeting}
                  className="w-full py-3 text-lg font-bold bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white shadow-lg hover:shadow-red-500/30 transition-all duration-300 rounded-lg"
                >
                  حفظ رسالة الترحيب
                </Button>
              </div>
            </section>

            <BackgroundSettings />
          </TabsContent>

          <TabsContent value="contributors">
            <ContributorsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
