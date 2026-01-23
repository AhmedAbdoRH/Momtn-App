import * as React from 'react'; // Import React
import { useState, useEffect } from "react"; // Import useState and useEffect hooks
import { Plus, Menu, LogOut, User, Settings, Users, X, Home } from "lucide-react"; // Removed Edit2 icon
import { useNavigate } from "react-router-dom";

// --- افتراضيات لمسارات الاستيراد ---
// --- Assumptions for import paths ---
// Please adjust these paths based on your actual project structure
// الرجاء تعديل هذه المسارات بناءً على هيكل مشروعك الفعلي
// Assuming components are in a 'components' directory relative to this file or aliased via '@'
// نفترض أن المكونات موجودة في مجلد 'components' بالنسبة لهذا الملف أو معرفة باستخدام '@'
import PhotoGrid from "@/components/PhotoGrid";
import { Button } from "@/components/ui/button";
import CreateNewDialog from "@/components/CreateNewDialog";
import { useAuth } from "@/components/AuthProvider";
import GroupsDropdown from "@/components/GroupsDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HeartSoundProvider } from "@/components/HeartSound";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// --- نهاية افتراضيات المسارات ---
// --- End of path assumptions ---


/**
 * Index Component - Main page displaying the photo grid and controls.
 * مكون Index - الصفحة الرئيسية التي تعرض شبكة الصور وعناصر التحكم.
 */
const Index = () => {
  // State for controlling the 'Create New' dialog visibility
  // حالة للتحكم في ظهور مربع حوار "إنشاء جديد"
  const [dialogOpen, setDialogOpen] = useState(false);

  // State for controlling the sidebar visibility
  // حالة للتحكم في ظهور الشريط الجانبي
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State for button click animation
  // حالة لتحريك النقر على الزر
  const [btnAnimation, setBtnAnimation] = useState(false);

  // State for selected group
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');

  // State for shared spaces dropdown
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);

  // State for bottom navigation
  const [activeTab, setActiveTab] = useState<'personal' | 'groups'>('personal');

  // Authentication context hook
  // خطاف سياق المصادقة
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for greeting message with default value
  const [greetingMessage, setGreetingMessage] = useState(
    'لحظاتك السعيدة، والنعم الجميلة في حياتك'
  );
  
  // Load greeting message from user metadata when user changes
  useEffect(() => {
    if (user) {
      const metadataGreeting = user.user_metadata?.greeting_message || 
                             'لحظاتك السعيدة، والنعم الجميلة في حياتك';
      setGreetingMessage(metadataGreeting);
      
      // Listen for greeting updates from settings
      const handleGreetingUpdate = () => {
        // We can either fetch the user again or rely on the event.
        // Since updateUser updates the local session in Supabase client,
        // we might need to get the latest user object.
        supabase.auth.getUser().then(({ data: { user: latestUser } }) => {
          if (latestUser) {
            setGreetingMessage(latestUser.user_metadata?.greeting_message || 'لحظاتك السعيدة، والنعم الجميلة في حياتك');
          }
        });
      };
      
      window.addEventListener('greetingUpdated', handleGreetingUpdate);
      
      // Cleanup
      return () => {
        window.removeEventListener('greetingUpdated', handleGreetingUpdate);
      };
    }
  }, [user]);

  // Update selected group when switching tabs (only if user manually switches)
  // Don't auto-reset when activeTab changes programmatically
  // useEffect(() => {
  //   if (activeTab === 'personal') {
  //     setSelectedGroupId(null);
  //     setSelectedGroupName('');
  //   }
  // }, [activeTab]);

  // Fetch group name when selectedGroupId changes
  useEffect(() => {
    const fetchGroupName = async () => {
      if (selectedGroupId && user) {
        try {
          const { data, error } = await supabase
            .from('groups')
            .select('name')
            .eq('id', selectedGroupId)
            .single();

          if (error) {
            console.error('Error fetching group name:', error);
            return;
          }

          setSelectedGroupName(data?.name || '');
        } catch (err) {
          console.error('Exception fetching group name:', err);
        }
      }
    };

    fetchGroupName();
  }, [selectedGroupId, user]);

  /**
   * Handles opening the 'Create New' dialog and triggering button animation.
   * يعالج فتح مربع حوار "إنشاء جديد" وتشغيل تحريك الزر.
   */
  const handleCreateNew = () => {
    setBtnAnimation(true);
    setTimeout(() => setBtnAnimation(false), 300); // Reset animation after 300ms
    setDialogOpen(true); // Open the dialog
  };

  /**
   * Toggles the sidebar visibility.
   * يبدل ظهور الشريط الجانبي.
   */
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  /**
   * Handle group change
   */
  const handleGroupChange = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setShowGroupsDropdown(false);
    if (groupId) {
      setActiveTab('groups');
    } else {
      setActiveTab('personal');
    }
  };

  /**
   * Handle tab change from bottom navigation
   */
  const handleTabChange = (tab: 'personal' | 'groups') => {
    setActiveTab(tab);
    if (tab === 'personal') {
      setSelectedGroupId(null);
      setSelectedGroupName('');
      setShowGroupsDropdown(false);
    } else {
      setShowGroupsDropdown(true);
    }
  };

  /**
   * Effect to add/remove Escape key listener for closing the sidebar.
   * تأثير لإضافة/إزالة مستمع مفتاح Escape لإغلاق الشريط الجانبي.
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        setShowGroupsDropdown(false);
      }
    };
    // Add listener only if sidebar is open and document is available (client-side)
    // إضافة المستمع فقط إذا كان الشريط الجانبي مفتوحًا والمستند متاحًا (جانب العميل)
    if ((sidebarOpen || showGroupsDropdown) && typeof document !== 'undefined') {
      document.addEventListener('keydown', handleEscape);
    }
    // Cleanup function to remove the listener when the component unmounts or sidebar closes
    // دالة تنظيف لإزالة المستمع عند إلغاء تحميل المكون أو إغلاق الشريط الجانبي
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleEscape);
      }
    };
  }, [sidebarOpen, showGroupsDropdown]); // Dependency array: re-run effect only if sidebarOpen or showGroupsDropdown changes

  return (
    // Provides heart sound context to children
    // يوفر سياق صوت القلب للأبناء
    <HeartSoundProvider>
      {/* Main container with background and text color */}
      {/* الحاوية الرئيسية مع لون الخلفية والنص */}
      <div className="min-h-screen bg-background text-foreground pb-16">

        {/* Sidebar Toggle Button (Top Right) */}
        {/* زر تبديل الشريط الجانبي (أعلى اليمين) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar" // Accessibility label / تسمية الوصولية
          className="fixed top-4 right-4 z-50 glass-effect" // Styling and positioning / تنسيق وتحديد الموضع
        >
          <Menu className="h-5 w-5 text-gray-300 hover:text-white" />
        </Button>

        {/* User Menu Dropdown (Top Left) */}
        {/* قائمة المستخدم المنسدلة (أعلى اليسار) */}
        <div className="fixed top-4 left-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User Menu" className="glass-effect">
                <User className="h-5 w-5 text-gray-300 hover:text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 glass-effect text-gray-700 border border-border">
              {/* Display user info */}
              {/* عرض معلومات المستخدم */}
              <div className="px-2 py-1.5">
                {user?.user_metadata?.full_name && (
                  <div className="text-base font-medium text-gray-700">
                    {user.user_metadata.full_name}
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  {user?.email || 'مستخدم'}
                </div>
              </div>
              
              {/* Settings option */}
              <DropdownMenuItem
                onClick={() => navigate("/settings")}
                className="cursor-pointer text-gray-600 focus:text-gray-800 focus:bg-gray-100"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>الإعدادات</span>
              </DropdownMenuItem>
              
              {/* Logout Button */}
              {/* زر تسجيل الخروج */}
              <DropdownMenuItem
                onClick={() => signOut?.()} // Call signOut from auth context
                className="text-red-500 focus:text-red-500 cursor-pointer focus:bg-gray-100"
              >
                <LogOut className="ml-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Groups Dropdown - positioned from bottom navigation */}
        {showGroupsDropdown && (
          <>
            {/* Overlay لإغلاق القائمة المنسدلة عند النقر خارجها */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowGroupsDropdown(false)}
            />
            
            {/* قائمة المساحات المشتركة المنسدلة من الأسفل */}
            <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 w-80 bg-black/90 backdrop-blur-xl rounded-lg border border-white/20 shadow-xl z-50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">المساحات المشتركة</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGroupsDropdown(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <GroupsDropdown 
                selectedGroupId={selectedGroupId}
                onGroupChange={handleGroupChange}
              />
            </div>
          </>
        )}

        {/* Sidebar Panel */}
        {/* لوحة الشريط الجانبي */}
        <aside
          className={`fixed top-0 right-0 h-full bg-black/40 backdrop-blur-md border-l border-gray-800 w-72 transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${
            sidebarOpen ? "translate-x-0" : "translate-x-full" // Conditional class for sliding animation / فئة شرطية لتحريك الانزلاق
          }`}
            aria-hidden={!sidebarOpen} // Accessibility: hide when closed / الوصولية: إخفاء عند الإغلاق
            role="complementary" // Accessibility role / دور الوصولية
        >
          {/* Sidebar content */}
          {/* محتوى الشريط الجانبي */}
          <div className="flex-1 p-6 pt-20 overflow-y-auto">
            <h3 className="text-gray-300 font-semibold mb-4 text-right">الألبومات</h3>
            {/* Container where PhotoGrid might inject album/hashtag buttons */}
            {/* الحاوية حيث قد يقوم PhotoGrid بإدخال أزرار الألبومات/الهاشتاجات */}
            <div id="hashtags-container" className="flex flex-col space-y-3 items-end">
              {/* PhotoGrid injects buttons here */}
            </div>
          </div>
        </aside>

        {/* Sidebar Overlay (dims the background when sidebar is open) */}
        {/* تراكب الشريط الجانبي (يعتم الخلفية عند فتح الشريط الجانبي) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)} // Close sidebar on overlay click / إغلاق الشريط الجانبي عند النقر على التراكب
            aria-hidden="true" // Accessibility: purely decorative / الوصولية: زخرفي بحت
          />
        )}

        {/* Main Content Area */}
        {/* منطقة المحتوى الرئيسي */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-20">
          <div className="text-center mb-8">
            <div className="inline-block mb-6 w-40 h-40 sm:w-48 sm:h-48">
              <img
                src="/lovable-uploads/2747e89b-5855-4294-9523-b5d3dd0527be.png"
                alt="Logo"
                className="w-full h-full object-contain animate-float"
                onError={(e) => {
                  if (e.currentTarget instanceof HTMLImageElement) {
                    e.currentTarget.src = 'https://placehold.co/192x192/f1f5f9/94a3b8?text=Logo';
                  }
                }}
              />
            </div>

            {/* Group Name Display */}
            {selectedGroupId && selectedGroupName && (
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-amber-100 flex items-center justify-center gap-2">
                  {selectedGroupName}
                  <Users className="w-6 h-6" />
                </h2>
              </div>
            )}

            {/* Greeting Message */}
            <p className="text-2xl text-white font-medium mb-6 max-w-2xl mx-auto text-center">
              {selectedGroupId ? 'لحظاتنا السعيدة، والنعم الجميلة في حياتنا' : greetingMessage}
            </p>
            {/* Main 'Add New' Button */}
            {/* زر "إضافة جديد" الرئيسي */}
            <div className="relative inline-block">
              <Button
                onClick={handleCreateNew}
                className={`relative px-5 py-3 bg-[#d94550] hover:bg-[#d94550]/90 text-white shadow-lg rounded-lg mx-auto transition-all duration-300 overflow-hidden ${
                  btnAnimation ? "scale-95 shadow-inner" : "hover:scale-105"
                }`}
              >
                <span className="relative z-10 flex items-center">
                  <Plus
                    className={`w-5 h-5 ml-2 transition-transform duration-300 ${
                      btnAnimation ? "rotate-180" : "" // Conditional class for icon animation / فئة شرطية لتحريك الأيقونة
                    }`}
                  />
                  {selectedGroupId ? "إضافة امتنان للمجموعة" : "إضافة امتنان جديد"}
                </span>
              </Button>
            </div>
          </div>

          {/* Photo Grid Component */}
          {/* مكون شبكة الصور */}
          <PhotoGrid
            closeSidebar={() => setSidebarOpen(false)} // Prop to allow PhotoGrid to close the sidebar / خاصية للسماح لـ PhotoGrid بإغلاق الشريط الجانبي
            selectedGroupId={selectedGroupId}
            // Removed onStatusChange prop as it's not defined in PhotoGridProps
          />

          {/* Create New Dialog Component */}
          {/* مكون مربع حوار إنشاء جديد */}
          <CreateNewDialog
            open={dialogOpen} // Controls dialog visibility / يتحكم في ظهور مربع الحوار
            onOpenChange={setDialogOpen} // Function to update dialog visibility state / دالة لتحديث حالة ظهور مربع الحوار
            selectedGroupId={selectedGroupId} // Pass selected group ID
            onPhotoAdded={() => { // Callback triggered after a photo is successfully added in the dialog / دالة رد نداء تُشغل بعد إضافة صورة بنجاح في مربع الحوار
              // 1. Dispatch an event that PhotoGrid might listen to, to trigger a refresh
              // 1. إرسال حدث قد يستمع إليه PhotoGrid لتشغيل تحديث
              console.log("Index: Dispatching photo-added event..."); // للمعاينة
              if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent("photo-added"));
              }
            }}
          />

          {/* Floating Action Button (Bottom Left) */}
          {/* زر الإجراء العائم (أسفل اليسار) */}
          <div className="fixed bottom-20 left-6 z-20">
            {/* Pulse animation effect */}
            {/* تأثير تحريك النبض */}
            <div className="absolute inset-[-4px] rounded-full bg-pink-500/10 animate-pulse-slow"></div>
            {/* The actual button */}
            {/* الزر الفعلي */}
            <Button
              onClick={handleCreateNew} // Opens the 'Create New' dialog / يفتح مربع حوار "إنشاء جديد"
              variant="glass" // Custom variant (assuming defined elsewhere) / متغير مخصص (نفترض أنه معرف في مكان آخر)
              size="circle" // Circular button / زر دائري
              aria-label="إضافة امتنان جديد" // Accessibility label / تسمية الوصولية
              className="w-14 h-14 shadow-lg relative rounded-full" // Styling / تنسيق
            >
              <Plus className="w-7 h-7 text-white/70" />
            </Button>
          </div>
        </main>

        {/* Bottom Navigation Bar - Reduced height */}
        {/* شريط التنقل السفلي - ارتفاع مقلل */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/20 z-30">
          <div className="flex items-center justify-around py-2 px-4">
            {/* Personal Space Tab */}
            <button
              onClick={() => handleTabChange('personal')}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all duration-200 ${
                activeTab === 'personal'
                  ? 'bg-[#ea384c]/20 text-pink-200'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">المساحة الشخصية</span>
            </button>

            {/* Shared Spaces Tab */}
            <button
              onClick={() => handleTabChange('groups')}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all duration-200 ${
                activeTab === 'groups'
                  ? 'bg-[#ea384c]/20 text-pink-200'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-xs font-medium">المساحات المشتركة</span>
            </button>
          </div>
        </div>
      </div>
    </HeartSoundProvider>
  );
};

// Export the component for use in other parts of the application
// تصدير المكون للاستخدام في أجزاء أخرى من التطبيق
export default Index;
