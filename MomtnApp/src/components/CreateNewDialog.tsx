import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { ImagePlus, Type, Image, Crop, RotateCw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";
import { TextToImageGenerator } from "./TextToImageGenerator";

interface CreateNewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoAdded: () => void;
  selectedGroupId?: string | null;
}

const CreateNewDialog = ({ open, onOpenChange, onPhotoAdded, selectedGroupId }: CreateNewDialogProps) => {
  const [contentType, setContentType] = useState<"image" | "text">("image");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [albumName, setAlbumName] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAlbumInput, setShowAlbumInput] = useState(false);
  // State for managing album selection and visibility
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [caption, setCaption] = useState('');
  const [rotation, setRotation] = useState(0); // حالة لتتبع دوران الصورة
  const [isCropMode, setIsCropMode] = useState(false); // حالة لوضع القص
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 }); // منطقة القص
  const [isDragging, setIsDragging] = useState(false); // حالة السحب
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // نقطة بداية السحب
  const [activeHandle, setActiveHandle] = useState<string | null>(null); // المقبض النشط
  const { toast } = useToast();
  const { user } = useAuth();
  // مرجع لعنصر label الخاص برفع الصور
  const imageLabelRef = useRef<HTMLLabelElement>(null);

  // إعادة تعيين الحالة وتنشيط التركيز عند فتح الـ Dialog
  useEffect(() => {
    if (open) {
      resetFormState();
      fetchAlbumSuggestions();
      // تنشيط التركيز على label رفع الصور
      if (imageLabelRef.current) {
        imageLabelRef.current.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchAlbumSuggestions = async () => {
    if (!user) return;
    try {
      // If it's a group, only show albums from this group
      if (selectedGroupId) {
        const { data: groupPhotos, error: groupError } = await supabase
          .from('photos')
          .select('hashtags')
          .eq('group_id', selectedGroupId);

        if (groupError) throw groupError;

        const groupTags = new Set<string>();
        groupPhotos.forEach(photo => {
          if (photo.hashtags && Array.isArray(photo.hashtags)) {
            photo.hashtags.forEach((tag: string) => {
              if (tag && typeof tag === 'string') {
                groupTags.add(tag);
              }
            });
          }
        });
        setSuggestions(Array.from(groupTags));
      } else {
        // For personal photos, only show personal albums (photos without group_id)
        const { data: personalPhotos, error: personalError } = await supabase
          .from('photos')
          .select('hashtags')
          .eq('user_id', user.id)
          .is('group_id', null);

        if (personalError) throw personalError;

        const personalTags = new Set<string>();
        personalPhotos.forEach(photo => {
          if (photo.hashtags && Array.isArray(photo.hashtags)) {
            photo.hashtags.forEach((tag: string) => {
              if (tag && typeof tag === 'string') {
                personalTags.add(tag);
              }
            });
          }
        });
        setSuggestions(Array.from(personalTags));
      }
    } catch (error) {
      console.error('Error fetching album suggestions:', error);
      // Fallback to empty array if there's an error
      setSuggestions([]);
    }
  };

  const resetFormState = () => {
    setContentType("image");
    setImage(null);
    setPreviewUrl("");
    setAlbumName("");
    setCaption("");
    setSelectedAlbums(new Set());
    setShowAlbumInput(false);
    setIsSubmitting(false);
    setIsGeneratingText(false);
    setRotation(0);
    setIsCropMode(false);
  };

  // دالة لتدوير الصورة
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // دالة لتبديل وضع القص
  const handleCropToggle = () => {
    if (!isCropMode) {
      // تفعيل وضع القص ووضع منطقة افتراضية
      setIsCropMode(true);
      setCropArea({ x: 20, y: 20, width: 120, height: 80 });
    } else {
      // إلغاء وضع القص
      setIsCropMode(false);
      setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  // دالة لتطبيق القص
  const handleApplyCrop = () => {
    console.log('handleApplyCrop called');
    console.log('Current crop area:', cropArea);
    
    // التأكد من وجود منطقة قص صحيحة
    if (cropArea.width <= 0 || cropArea.height <= 0) {
      console.log('Invalid crop area - showing error toast');
      toast({
        title: "خطأ في القص",
        description: "يرجى تحديد منطقة قص صحيحة",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Applying crop...');
    applyCrop();
    
    // إعادة تعيين وضع القص فوراً
    setIsCropMode(false);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
  };

  // دالة لتطبيق القص فعلياً
  const applyCrop = async () => {
    if (!previewUrl || !image) return;

    try {
      // إنشاء كانفاس للقص
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // تحميل الصورة
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // الحصول على الحاوية والصورة
          const imgElement = document.querySelector('img[alt="Preview"], img[alt="Generated gratitude"]') as HTMLImageElement;
          if (!imgElement) {
            throw new Error('Image element not found');
          }

          const containerElement = imgElement.parentElement;
          if (!containerElement) {
            throw new Error('Container not found');
          }

          // حساب أبعاد الصورة الأصلية والمعروضة
          const originalWidth = img.width;
          const originalHeight = img.height;
          const containerWidth = containerElement.clientWidth;
          const containerHeight = containerElement.clientHeight;

          // حساب نسبة العرض إلى الارتفاع
          const originalAspectRatio = originalWidth / originalHeight;
          const containerAspectRatio = containerWidth / containerHeight;

          // حساب الأبعاد الفعلية للصورة المعروضة مع object-contain
          let displayWidth, displayHeight, offsetX, offsetY;
          
          if (originalAspectRatio > containerAspectRatio) {
            // الصورة أعرض، تحديد العرض بحجم الحاوية
            displayWidth = containerWidth;
            displayHeight = containerWidth / originalAspectRatio;
            offsetX = 0;
            offsetY = (containerHeight - displayHeight) / 2;
          } else {
            // الصورة أطول، تحديد الارتفاع بحجم الحاوية
            displayWidth = containerHeight * originalAspectRatio;
            displayHeight = containerHeight;
            offsetX = (containerWidth - displayWidth) / 2;
            offsetY = 0;
          }

          // حساب نسب التحويل
          const scaleX = originalWidth / displayWidth;
          const scaleY = originalHeight / displayHeight;

          // تحويل منطقة القص إلى إحداثيات الصورة الأصلية
          const cropX = Math.round((cropArea.x - offsetX) * scaleX);
          const cropY = Math.round((cropArea.y - offsetY) * scaleY);
          const cropWidth = Math.round(cropArea.width * scaleX);
          const cropHeight = Math.round(cropArea.height * scaleY);

          // التأكد من أن القيم صحيحة
          if (cropWidth <= 0 || cropHeight <= 0 || cropX < 0 || cropY < 0) {
            throw new Error('Invalid crop dimensions');
          }

          // التأكد من أن القص لا يتجاوز حدود الصورة
          const finalCropX = Math.max(0, Math.min(cropX, img.width - cropWidth));
          const finalCropY = Math.max(0, Math.min(cropY, img.height - cropHeight));
          const finalCropWidth = Math.min(cropWidth, img.width - finalCropX);
          const finalCropHeight = Math.min(cropHeight, img.height - finalCropY);

          // تعيين أبعاد الكانفاس
          canvas.width = finalCropWidth;
          canvas.height = finalCropHeight;

          // رسم الجزء المقطوع
          ctx.drawImage(
            img,
            finalCropX, finalCropY, finalCropWidth, finalCropHeight,
            0, 0, canvas.width, canvas.height
          );

          // تحويل إلى blob
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `cropped_${Date.now()}.jpeg`, { type: 'image/jpeg' });
              setImage(file);
              const newUrl = URL.createObjectURL(blob);
              setPreviewUrl(newUrl);
              
              // إعادة تعيين القص
              setIsCropMode(false);
              setCropArea({ x: 0, y: 0, width: 0, height: 0 });
              setRotation(0);
              
              toast({
                title: "تم القص بنجاح",
                description: "تم تطبيق القص على الصورة بدقة عالية",
              });
            } else {
              throw new Error('Failed to create blob');
            }
          }, 'image/jpeg', 0.95);
        } catch (error) {
          console.error('Error in crop processing:', error);
          toast({
            title: "خطأ في القص",
            description: "حدث خطأ أثناء معالجة القص",
            variant: "destructive",
          });
        }
      };
      
      img.onerror = () => {
        console.error('Error loading image for crop');
        toast({
          title: "خطأ في تحميل الصورة",
          description: "فشل في تحميل الصورة للقص",
          variant: "destructive",
        });
      };
      
      img.src = previewUrl;
    } catch (error) {
      console.error('Error in crop:', error);
      toast({
        title: "خطأ في القص",
        description: "حدث خطأ أثناء تطبيق القص",
        variant: "destructive",
      });
    }
  };

  // دالة للحصول على المقبض تحت المؤشر
  const getHandleUnderCursor = (x: number, y: number) => {
    const handles = {
      'nw': { x: cropArea.x, y: cropArea.y },
      'ne': { x: cropArea.x + cropArea.width, y: cropArea.y },
      'se': { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
      'sw': { x: cropArea.x, y: cropArea.y + cropArea.height },
      'n': { x: cropArea.x + cropArea.width / 2, y: cropArea.y },
      'e': { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height / 2 },
      's': { x: cropArea.x + cropArea.width / 2, y: cropArea.y + cropArea.height },
      'w': { x: cropArea.x, y: cropArea.y + cropArea.height / 2 }
    };

    const handleSize = 20;
    for (const [key, handle] of Object.entries(handles)) {
      if (x >= handle.x - handleSize/2 && x <= handle.x + handleSize/2 && 
          y >= handle.y - handleSize/2 && y <= handle.y + handleSize/2) {
        return key;
      }
    }
    return null;
  };

  // دالة لمعالجة بداية السحب
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCropMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const handle = getHandleUnderCursor(x, y);
    if (handle) {
      setActiveHandle(handle);
      setIsDragging(true);
      setDragStart({ x, y });
    } else if (x >= cropArea.x && x <= cropArea.x + cropArea.width && 
               y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      // سحب منطقة القص كاملة
      setActiveHandle('move');
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
  };

  // دالة لمعالجة حركة الماوس
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isCropMode) return;
    
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // استخدام requestAnimationFrame لضمان التحديث السلس
    requestAnimationFrame(() => {
      setCropArea(prev => {
      let newArea = { ...prev };
      const minSize = 30;
      const maxWidth = rect.width;
      const maxHeight = rect.height;

      switch (activeHandle) {
        case 'nw':
          newArea.x = Math.max(0, Math.min(x, prev.x + prev.width - minSize));
          newArea.y = Math.max(0, Math.min(y, prev.y + prev.height - minSize));
          newArea.width = prev.x + prev.width - newArea.x;
          newArea.height = prev.y + prev.height - newArea.y;
          break;
        case 'ne':
          newArea.y = Math.max(0, Math.min(y, prev.y + prev.height - minSize));
          newArea.width = Math.max(minSize, Math.min(x - prev.x, maxWidth - prev.x));
          newArea.height = prev.y + prev.height - newArea.y;
          break;
        case 'se':
          newArea.width = Math.max(minSize, Math.min(x - prev.x, maxWidth - prev.x));
          newArea.height = Math.max(minSize, Math.min(y - prev.y, maxHeight - prev.y));
          break;
        case 'sw':
          newArea.x = Math.max(0, Math.min(x, prev.x + prev.width - minSize));
          newArea.width = prev.x + prev.width - newArea.x;
          newArea.height = Math.max(minSize, Math.min(y - prev.y, maxHeight - prev.y));
          break;
        case 'n':
          newArea.y = Math.max(0, Math.min(y, prev.y + prev.height - minSize));
          newArea.height = prev.y + prev.height - newArea.y;
          break;
        case 'e':
          newArea.width = Math.max(minSize, Math.min(x - prev.x, maxWidth - prev.x));
          break;
        case 's':
          newArea.height = Math.max(minSize, Math.min(y - prev.y, maxHeight - prev.y));
          break;
        case 'w':
          newArea.x = Math.max(0, Math.min(x, prev.x + prev.width - minSize));
          newArea.width = prev.x + prev.width - newArea.x;
          break;
        case 'move':
          const newX = x - dragStart.x;
          const newY = y - dragStart.y;
          newArea.x = Math.max(0, Math.min(newX, maxWidth - newArea.width));
          newArea.y = Math.max(0, Math.min(newY, maxHeight - newArea.height));
          break;
      }

      // التأكد من أن المقابض لا تخرج خارج الصورة
      newArea.x = Math.max(0, Math.min(newArea.x, maxWidth - newArea.width));
      newArea.y = Math.max(0, Math.min(newArea.y, maxHeight - newArea.height));
      newArea.width = Math.max(minSize, Math.min(newArea.width, maxWidth - newArea.x));
      newArea.height = Math.max(minSize, Math.min(newArea.height, maxHeight - newArea.y));

        return newArea;
      });
    });
  };

  // دالة لمعالجة انتهاء السحب
  const handleMouseUp = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
    setIsDragging(false);
    setActiveHandle(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const newUrl = URL.createObjectURL(file);
      setPreviewUrl(newUrl);
      // Always show suggestions when an image is selected
      setShowSuggestions(true);
    } else {
      setImage(null);
      setPreviewUrl("");
      setShowSuggestions(false);
    }
  };

  const handleAlbumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAlbumName(value);
    // Keep suggestions visible while typing
    setShowSuggestions(true);
  };

  // Function to add a new album
  const addNewAlbum = () => {
    const newAlbumName = albumName.trim();
    if (!validateAlbumName(newAlbumName)) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم ألبوم صالح',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Update the UI immediately for better UX
      setSelectedAlbums(prev => {
        const newSet = new Set(prev);
        newSet.add(newAlbumName);
        return newSet;
      });
      
      // Add to suggestions if not already present
      if (!suggestions.includes(newAlbumName)) {
        setSuggestions(prev => [...prev, newAlbumName]);
      }
      
      setAlbumName('');
      setShowAlbumInput(false);
      
    } catch (error) {
      console.error('Error adding album:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة الألبوم',
        variant: 'destructive',
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Don't update albumName to prevent filtering the suggestions
    // Just update the selected albums
    setSelectedAlbums(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestion)) {
        newSet.delete(suggestion);
      } else {
        newSet.add(suggestion);
      }
      return newSet;
    });
  };

  // Function to validate album name (no longer needs to check database)
  const validateAlbumName = (name: string): boolean => {
    return name.trim().length > 0;
  };

  const handleTextImageGenerated = (imageUrl: string) => {
    setPreviewUrl(imageUrl);
    // Convert data URL to File object for upload
    fetch(imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `gratitude_${Date.now()}.jpeg`, { type: 'image/jpeg' });
        setImage(file);
        setShowSuggestions(true);
      });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || isSubmitting || !user) return;
    
    setIsSubmitting(true);

    try {
      const fileExt = image.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/photo_${Date.now()}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("photos")
        .upload(fileName, image, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        toast({
          title: "خطأ في الرفع",
          description: `فشل رفع الملف: ${uploadError.message}`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const filePath = uploadData?.path;
      if (!filePath) throw new Error("File path not returned after upload.");

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        await supabase.storage.from("photos").remove([filePath]);
        throw new Error("لم يتم العثور على الرابط العام للصورة بعد الرفع.");
      }

      // Convert Set to array of album names
      const selectedAlbumsArray = Array.from(selectedAlbums);
      
      // Add any new albums to suggestions
      const newAlbums = selectedAlbumsArray.filter(album => 
        album && typeof album === 'string' && !suggestions.includes(album)
      );
      
      if (newAlbums.length > 0) {
        setSuggestions(prev => [...new Set([...prev, ...newAlbums])]);
      }

      // For group photos, ensure the user is a member of the group
      if (selectedGroupId) {
        const { data: membership, error: membershipError } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', selectedGroupId)
          .eq('user_id', user.id)
          .single();

        if (membershipError || !membership) {
          throw new Error('ليس لديك صلاحية لإضافة صور إلى هذه المجموعة');
        }
      }

      const { data: insertData, error: insertError } = await supabase
        .from("photos")
        .insert({
          image_url: publicUrl,
          caption: caption.trim(),
          hashtags: selectedAlbumsArray,
          user_id: user.id,
          group_id: selectedGroupId || null, // Will be null for personal albums
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from("photos").remove([filePath]);
        throw insertError;
      }

      const isFirstPhoto = !selectedGroupId; // Only show tutorial for personal photos
      
      toast({ 
        title: "🎉 تمت الإضافة بنجاح 🎉", 
        description: isFirstPhoto 
          ? "تهانينا! الصورة الأولى في ألبومك.\n\nإلمس الصورة لإضافة تعليق, التحريك أو الإزالة"
          : selectedGroupId 
            ? "تم إضافة الصورة إلى المجموعة بنجاح"
            : "تم إضافة الصورة بنجاح"
      });
      onPhotoAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "لم نتمكن من إضافة الصورة.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show all suggestions when needed, sorted alphabetically
  const filteredSuggestions = showSuggestions 
    ? [...suggestions].sort((a, b) => a.localeCompare(b))
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetFormState();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="top-[45%] sm:max-w-[350px] max-h-[85vh] overflow-y-auto bg-gray-900/80 backdrop-blur-lg text-white border border-gray-700 shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-right text-white">
            {selectedGroupId ? "إضافة امتنان للمجموعة" : "إضافة امتنان جديد"}
          </DialogTitle>
          <DialogDescription className="text-right text-gray-300">
            {selectedGroupId 
              ? "اختر بين رفع صورة أو كتابة امتنان نصي وأضفه إلى المجموعة."
              : "اختر بين رفع صورة أو كتابة امتنان نصي."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Content Type Selection */}
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setContentType("image")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
                contentType === "image"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
              }`}
            >
              <Image size={18} />
              <span>رفع صورة</span>
            </button>
            <button
              type="button"
              onClick={() => setContentType("text")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
                contentType === "text"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
              }`}
            >
              <Type size={18} />
              <span>امتنان كتابي</span>
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            {contentType === "image" ? (
              <>
                <label
                  htmlFor="imageUpload"
                  ref={imageLabelRef} // إضافة المرجع
                  tabIndex={0} // جعل label قابلة للتركيز
                  className="w-full h-40 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none relative"
                  style={{ pointerEvents: 'auto' }}
                >
                  {previewUrl ? (
                    <div 
                      className="w-full h-full relative"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleMouseDown}
                      onTouchMove={handleMouseMove}
                      onTouchEnd={handleMouseUp}
                      style={{ pointerEvents: isCropMode ? 'auto' : 'none' }}
                    >
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-contain rounded-lg p-1" 
                        style={{ transform: `rotate(${rotation}deg)` }}
                      />
                      
                      {/* منطقة القص */}
                      {isCropMode && (
                        <>
                          {/* خلفية شفافة */}
                          <div className="absolute inset-0 bg-black/30" />
                          
                           {/* منطقة القص المحددة */}
                           <div 
                             className="cropping-overlay absolute border-2 border-white border-dashed bg-transparent"
                             style={{
                               left: cropArea.x,
                               top: cropArea.y,
                               width: cropArea.width,
                               height: cropArea.height,
                               pointerEvents: 'auto',
                               touchAction: 'none',
                             }}
                            >
                             {/* المقابض */}
                            {['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'].map((handle) => (
                              <div
                                key={handle}
                                className={`absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer z-10 ${
                                  activeHandle === handle ? 'bg-blue-500 scale-110' : 'hover:scale-110'
                                } transition-transform duration-150`}
                                style={{
                                  left: handle.includes('w') ? -6 : handle.includes('e') ? cropArea.width - 6 : cropArea.width / 2 - 6,
                                  top: handle.includes('n') ? -6 : handle.includes('s') ? cropArea.height - 6 : cropArea.height / 2 - 6,
                                }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      
                      {/* أزرار التعديل العادية */}
                      <div 
                        className="absolute top-2 right-2 flex gap-2"
                        style={{ pointerEvents: 'auto' }}
                      >
                        {!isCropMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRotate();
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRotate();
                            }}
                            className="bg-black/70 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/90 transition-all duration-200 shadow-lg"
                            title="تدوير الصورة"
                            style={{ touchAction: 'manipulation' }}
                          >
                            <RotateCw size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            handleCropToggle();
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCropToggle();
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-all duration-200 shadow-lg"
                          title="إلغاء القص"
                          style={{ touchAction: 'manipulation' }}
                        >
                          <Crop size={16} />
                        </button>
                          {isCropMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                                handleApplyCrop();
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleApplyCrop();
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-all duration-200 shadow-lg"
                              title="تطبيق القص"
                              style={{ touchAction: 'manipulation' }}
                            >
                              <Check size={16} />
                            </button>
                          )}
                        </div>
                    </div>
                  ) : (
                    <div className="text-center pointer-events-none">
                      <ImagePlus className="w-10 h-10 text-gray-400 mx-auto" />
                      <p className="mt-2 text-sm text-gray-400">اضغط لاختيار صورة</p>
                    </div>
                  )}
                </label>
                <input
                  id="imageUpload"
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </>
            ) : (
              <div className="w-full">
                {previewUrl ? (
                  <div 
                    className="w-full relative"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                    style={{ 
                      pointerEvents: isCropMode ? 'auto' : 'none',
                      touchAction: isCropMode ? 'none' : 'auto'
                    }}
                  >
                    <img 
                      src={previewUrl} 
                      alt="Generated gratitude" 
                      className="w-full h-40 object-contain rounded-lg border border-gray-600" 
                      style={{ transform: `rotate(${rotation}deg)` }}
                    />
                    
                    {/* منطقة القص للصورة المولدة */}
                    {isCropMode && (
                      <div 
                        className="absolute inset-0 cursor-crosshair select-none"
                        style={{ 
                          pointerEvents: 'auto',
                          zIndex: 10
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onTouchStart={handleMouseDown}
                        onTouchMove={handleMouseMove}
                        onTouchEnd={handleMouseUp}
                      >
                        {/* خلفية شفافة */}
                        <div 
                          className="absolute inset-0 bg-black/30"
                          style={{ pointerEvents: 'none' }}
                        />
                        
                        {/* منطقة القص المحددة */}
                        <div 
                          className="cropping-overlay absolute border-2 border-white border-dashed bg-transparent"
                          style={{
                            left: cropArea.x,
                            top: cropArea.y,
                            width: cropArea.width,
                            height: cropArea.height,
                            pointerEvents: 'none',
                          }}
                        >
                          {/* خطوط الشبكة */}
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                            {Array.from({ length: 9 }).map((_, i) => (
                              <div key={i} className="border border-white/30" />
                            ))}
                          </div>
                        </div>

                        {/* مقابض تغيير الحجم */}
                        {[
                          { key: 'nw', x: cropArea.x, y: cropArea.y, cursor: 'nw-resize' },
                          { key: 'ne', x: cropArea.x + cropArea.width, y: cropArea.y, cursor: 'ne-resize' },
                          { key: 'se', x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height, cursor: 'se-resize' },
                          { key: 'sw', x: cropArea.x, y: cropArea.y + cropArea.height, cursor: 'sw-resize' },
                          { key: 'n', x: cropArea.x + cropArea.width / 2, y: cropArea.y, cursor: 'n-resize' },
                          { key: 'e', x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height / 2, cursor: 'e-resize' },
                          { key: 's', x: cropArea.x + cropArea.width / 2, y: cropArea.y + cropArea.height, cursor: 's-resize' },
                          { key: 'w', x: cropArea.x, y: cropArea.y + cropArea.height / 2, cursor: 'w-resize' }
                        ].map(handle => (
                          <div
                            key={handle.key}
                            className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 hover:bg-blue-100 transition-colors"
                            style={{
                              left: `${handle.x}px`,
                              top: `${handle.y}px`,
                              cursor: handle.cursor,
                              pointerEvents: 'auto',
                              zIndex: 15
                            }}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* أزرار التعديل للصورة المولدة */}
                    <div className="absolute top-2 right-2 flex gap-2 z-20">
                      {!isCropMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRotate();
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRotate();
                          }}
                          className="bg-black/70 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/90 transition-all duration-200 shadow-lg"
                          title="تدوير الصورة"
                          style={{ 
                            touchAction: 'manipulation',
                            pointerEvents: 'auto'
                          }}
                        >
                          <RotateCw size={16} />
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCropToggle();
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCropToggle();
                        }}
                        className={`backdrop-blur-sm text-white p-2 rounded-full transition-all duration-200 shadow-lg ${
                          isCropMode 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-black/70 hover:bg-black/90'
                        }`}
                        title={isCropMode ? "إلغاء القص" : "قص الصورة"}
                        style={{ 
                          touchAction: 'manipulation',
                          pointerEvents: 'auto'
                        }}
                      >
                        <Crop size={16} />
                      </button>
                      
                      {isCropMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            console.log('=== CROP APPLY BUTTON CLICKED ===');
                            e.preventDefault();
                            e.stopPropagation();
                            handleApplyCrop();
                          }}
                          className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white p-3 rounded-full transition-all duration-200 shadow-lg border-2 border-white cursor-pointer"
                          title="تطبيق القص"
                          style={{ 
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            zIndex: 10000,
                            pointerEvents: 'auto',
                            touchAction: 'manipulation',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                            minWidth: '44px',
                            minHeight: '44px'
                          }}
                        >
                          <Check size={18} />
                        </button>
                      )}
                      
                      {(rotation > 0 || isCropMode) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setRotation(0);
                            setIsCropMode(false);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setRotation(0);
                            setIsCropMode(false);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full transition-all duration-200 shadow-lg"
                          title="إعادة تعيين"
                          style={{ 
                            touchAction: 'manipulation',
                            pointerEvents: 'auto'
                          }}
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <TextToImageGenerator
                    onImageGenerated={handleTextImageGenerated}
                    isGenerating={isGeneratingText}
                    setIsGenerating={setIsGeneratingText}
                  />
                )}
              </div>
            )}

            {/* Caption Input - only show for image uploads, not text-generated images */}
            {image && contentType === "image" && (
              <div className="w-full space-y-2">
                <label htmlFor="photoCaption" className="block text-sm font-medium text-gray-300 text-right">
                  اكتب تعليقاً للصورة (اختياري)
                </label>
                <textarea
                  id="photoCaption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-800/90 border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-gray-400 text-right"
                  rows={2}
                  placeholder="اكتب تعليقاً يصف الصورة..."
                  dir="rtl"
                />
                <p className="text-xs text-gray-400 text-right">
                  يمكنك استخدام # لإنشاء هاشتاجات (مثال: #مناسبه #ذكريات)
                </p>
              </div>
            )}

            <div className="w-full relative">
              {showAlbumInput && (
                <div className="w-full mb-2">
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        id="albumName"
                        type="text"
                        value={albumName}
                        onChange={handleAlbumChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addNewAlbum();
                          }
                        }}
                        placeholder="اكتب اسم الألبوم الجديد"
                        className="w-full px-4 py-3 text-right text-white bg-gray-800/90 border border-gray-700 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addNewAlbum();
                        }}
                        disabled={!albumName.trim()}
                        className={`flex-1 py-2 rounded-lg transition-colors text-sm ${
                          albumName.trim()
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        إضافة
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAlbumInput(false)}
                        className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {image && (
                <div className="mt-3">
                  <p className="text-sm text-gray-300 mb-2">اختر ألبوماً لإضافته للصورة:</p>
                  <div className="flex flex-wrap gap-2 justify-end mb-3">
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors border shadow-sm ${
                          selectedAlbums.has(suggestion)
                            ? 'bg-green-600/80 border-green-500 text-white'
                            : 'bg-gray-700/70 hover:bg-gray-600/80 border-gray-600 text-white'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSuggestionClick(suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-transparent hover:bg-gray-800/30 rounded-lg text-indigo-300 hover:text-white font-medium text-sm flex items-center gap-1 transition-all border border-indigo-700/50 hover:border-indigo-500/70"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowAlbumInput(true);
                        setAlbumName('');
                        setTimeout(() => {
                          const input = document.getElementById('albumName');
                          input?.focus();
                        }, 100);
                      }}
                    >
                      <span>ألبوم جديد</span>
                      <span className="text-base">+</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-start gap-3 pt-4">
            <Button
              type="submit"
              disabled={!image || isSubmitting || isGeneratingText}
              className="bg-[#ea384c] hover:bg-[#d93042] text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-[#ea384c]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>جاري الحفظ...</span>
                </div>
              ) : (
                "حفظ الصورة"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700/50 focus:ring-gray-500"
            >
              إغلاق
            </Button>
          </div>
        </form>
      </DialogContent>
      
    </Dialog>
  );
};

export default CreateNewDialog;