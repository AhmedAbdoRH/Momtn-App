
import { Plus, Menu, LogOut, User } from "lucide-react";
import PhotoGrid from "@/components/PhotoGrid";
import { Button } from "@/components/ui/button";
import CreateNewDialog from "@/components/CreateNewDialog";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HeartSoundProvider } from "@/components/HeartSound";

const Index = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [btnAnimation, setBtnAnimation] = useState(false);
  const { signOut, user } = useAuth();

  const handleCreateNew = () => {
    setBtnAnimation(true);
    setTimeout(() => setBtnAnimation(false), 300);
    setDialogOpen(true);
  };

  return (
    <HeartSoundProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 right-4 z-50 glass-effect text-gray-700"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="fixed top-4 left-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="glass-effect text-gray-700">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 glass-effect text-gray-700 border border-border">
              <div className="px-2 py-1.5 text-sm font-medium text-gray-600 truncate">
                {user?.email}
              </div>
              <DropdownMenuItem 
                onClick={signOut}
                className="text-red-500 focus:text-red-500 cursor-pointer focus:bg-gray-100"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div
          className={`fixed top-0 right-0 h-full glass-effect w-72 transform transition-transform duration-300 ease-in-out z-40 flex flex-col
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex-1 p-6 pt-20">
            <h3 className="text-gray-700 font-semibold mb-4 text-right">الهاشتاجات</h3>
            <div className="flex flex-col space-y-3 items-end" id="hashtags-container">
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="inline-block mb-6 w-40 h-40 sm:w-48 sm:h-48">
              <img 
                src="/musin-logo.png"
                alt="Logo"
                className="w-full h-full object-contain animate-float"
              />
            </div>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
              ﴾ يَا أَيُّهَا النَّاسُ اذْكُرُوا نِعْمَتَ اللَّهِ عَلَيْكُمْ ﴿ 
            </p>
            
            <Button
              onClick={handleCreateNew}
              className={`px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-lg mx-auto transition-all duration-300 ${
                btnAnimation ? 'scale-95 shadow-inner' : 'hover:scale-105'
              }`}
            >
              <Plus className={`w-5 h-5 mr-2 transition-transform duration-300 ${btnAnimation ? 'rotate-180' : ''}`} />
              إضافة امتنان جديد
            </Button>
          </div>

          <PhotoGrid 
            closeSidebar={() => setSidebarOpen(false)} 
            selectedGroupId={null}
          />
          <CreateNewDialog 
            open={dialogOpen} 
            onOpenChange={setDialogOpen}
            onPhotoAdded={() => {
              // إعادة تحميل البيانات عند إضافة صورة جديدة
              window.dispatchEvent(new CustomEvent('photo-added'));
            }}
          />

          <Button
            onClick={handleCreateNew}
            className="fixed bottom-6 left-6 w-14 h-14 rounded-full glass-effect text-pink-500 shadow-lg transition-all duration-300"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </main>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </HeartSoundProvider>
  );
};

export default Index;
