import { useState, useEffect } from "react"; // استيراد useState و useEffect لإدارة الحالة في المكون
import { GripVertical, Heart, MessageCircle, Trash2, MoreVertical, Plus, Edit3, X, Check, MoreHorizontal } from "lucide-react"; // استيراد أيقونات من مكتبة lucide-react
import { supabase } from "@/integrations/supabase/client"; // استيراد عميل supabase للتفاعل مع قاعدة البيانات
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"; // استيراد مكونات Dialog لعرض نافذة تحرير التعليق والهاشتاجات
import { toast } from "@/hooks/use-toast"; // استيراد دالة toast لعرض الإشعارات
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// تعريف واجهة (interface) لتحديد خصائص المكون PhotoCard
interface CommentUser {
  email: string;
  full_name: string | null;
}

interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  likes?: number;
  liked_by?: string;
  user: CommentUser;
}

interface PhotoCardProps {
  id: string; // معرف الصورة
  imageUrl: string; // رابط الصورة
  likes: number; // عدد الإعجابات الأولية
  caption?: string; // التعليق (اختياري)
  hashtags?: string[]; // الهاشتاجات (اختيارية)
  comments?: Comment[]; // التعليقات على الصورة
  onLike: () => void; // دالة للإعجاب بالصورة
  onDelete: () => void; // دالة لحذف الصورة
  onUpdateCaption: (caption: string, hashtags: string[]) => Promise<void>; // دالة لتحديث التعليق والهاشتاجات
  onAddComment: (content: string) => Promise<void>; // دالة لإضافة تعليق جديد
  onLikeComment: (commentId: string) => Promise<void>; // دالة للإعجاب بالتعليق
  currentUserId: string; // معرف المستخدم الحالي
  photoId: string; // معرف الصورة (مرادف لـ id للتوافق مع المكونات الأخرى)
  dragHandleProps?: any; // خصائص السحب والإفلات
  isGroupPhoto?: boolean; // هل الصورة في مجموعة
  selectedGroupId?: string | null; // معرف المجموعة المحددة
  userEmail?: string; // بريد المستخدم
  userDisplayName?: string | null; // اسم المستخدم المعروض
  photoOwnerId?: string; // معرف مالك الصورة
}

// تعريف المكون PhotoCard مع خصائصه
const PhotoCard: React.FC<PhotoCardProps> = ({
  id,
  imageUrl,
  likes: initialLikes,
  caption: initialCaption = '',
  hashtags: initialHashtags = [],
  comments: initialComments = [],
  onLike,
  onDelete,
  onUpdateCaption,
  onAddComment,
  onLikeComment,
  currentUserId,
  photoId: propPhotoId,
  dragHandleProps,
  isGroupPhoto = false,
  selectedGroupId = null,
  userEmail = '',
  userDisplayName = null,
  photoOwnerId = '',
}) => {
  const photoId = id || propPhotoId; // استخدام id أو photoId أيهما متاح

  // تعريف الحالات باستخدام useState
  const [isLoved, setIsLoved] = useState(false); // حالة لتتبع ما إذا تم الإعجاب بالصورة
  const [likes, setLikes] = useState(initialLikes); // حالة لتتبع عدد الإعجابات
  const [isEditing, setIsEditing] = useState(false); // حالة لتتبع ما إذا كان وضع التحرير مفعلاً
  const [caption, setCaption] = useState(initialCaption); // حالة لتتبع التعليق الحالي
  const [hashtags, setHashtags] = useState(initialHashtags); // حالة لتتبع الهاشتاجات الحالية
  const [isControlsVisible, setIsControlsVisible] = useState(false); // حالة لإظهار/إخفاء الأزرار (مثل الحذف والتحرير)
  const [isHeartAnimating, setIsHeartAnimating] = useState(false); // حالة لتتبع تشغيل أنيميشن القلب
  const [newComment, setNewComment] = useState(''); // حالة لتتبع نص التعليق الجديد
  const [isCommenting, setIsCommenting] = useState(false); // حالة لتتبع ما إذا كان حقل التعليق مفتوحاً
  const [comments, setComments] = useState<Comment[]>(initialComments); // حالة لتخزين التعليقات

  // تحديث التعليقات عندما تتغير في المكون الأب
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);
  const [showComments, setShowComments] = useState(false); // حالة لإظهار/إخفاء التعليقات
  const [isCommentLoading, setIsCommentLoading] = useState(false); // حالة لتحميل التعليقات


  // دالة لمعالجة الإعجاب بالصورة
  const handleLike = async () => {
    setIsHeartAnimating(true); // تفعيل أنيميشن القلب
    const newLikeCount = likes + 1; // زيادة عدد الإعجابات بـ 1
    setLikes(newLikeCount); // تحديث عدد الإعجابات في الحالة
    setIsLoved(true); // تعيين حالة الإعجاب إلى صحيح

    // تحديث عدد الإعجابات في قاعدة البيانات باستخدام supabase
    const { error } = await supabase
      .from('photos') // الجدول في قاعدة البيانات
      .update({ likes: newLikeCount }) // تحديث حقل الإعجابات
      .eq('image_url', imageUrl); // شرط لتحديد الصورة بناءً على رابطها

    if (error) { // في حالة حدوث خطأ
      console.error('Error updating likes:', error); // تسجيل الخطأ في وحدة التحكم
      setLikes(likes); // إعادة عدد الإعجابات إلى القيمة السابقة
    }

    // إيقاف الأنيميشن بعد ثانية واحدة (1000 مللي ثانية)
    setTimeout(() => {
      setIsHeartAnimating(false); // إيقاف أنيميشن القلب
      setIsLoved(false); // إعادة حالة الإعجاب إلى خطأ
    }, 1000);
  };

  // دالة لتقديم التعليق والهاشتاجات بعد التحرير
  const handleCaptionSubmit = async () => {
    if (onUpdateCaption) { // إذا كانت دالة التحديث موجودة
      await onUpdateCaption(caption, hashtags); // استدعاء الدالة لتحديث التعليق والهاشتاجات
    }
    setIsEditing(false); // إغلاق وضع التحرير
  };

  // دالة لمعالجة تغيير الهاشتاجات
  const handleHashtagsChange = (value: string) => {
    const tags = value.split(' '); // Treat space-separated words as album name
    setHashtags(tags); // تحديث حالة الهاشتاجات
  };

  // دالة لتبديل إظهار/إخفاء الأزرار
  const toggleControls = () => {
    setIsControlsVisible(!isControlsVisible); // تغيير الحالة بين الإظهار والإخفاء
  };

  // الحصول على الاسم المعروض
  const getDisplayName = (userId: string, userEmail?: string, userFullName?: string | null) => {
    // إذا كان هناك اسم كامل، نستخدمه
    if (userFullName && userFullName.trim()) {
      return userFullName.trim();
    }
    // إذا كان هناك إيميل، نستخدم الجزء الأول منه
    if (userEmail) {
      return userEmail.split('@')[0];
    }
    // إذا لم يكن هناك اسم أو إيميل، نستخدم معرف المستخدم
    return `User ${userId ? userId.substring(0, 6) : 'unknown'}`;
  };
  
  // الحصول على اسم مالك الصورة
  const getPhotoOwnerName = () => {
    if (userDisplayName) return userDisplayName;
    if (userEmail) return userEmail.split('@')[0];
    if (photoOwnerId) return `User ${photoOwnerId.substring(0, 6)}`;
    return 'مستخدم';
  };

  // حالة لحفظ قائمة الألبومات
  const [albums, setAlbums] = useState<string[]>([]);
  const [showAlbumDialog, setShowAlbumDialog] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [showNewAlbumInput, setShowNewAlbumInput] = useState(false);

  // جلب الألبومات
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        let query = supabase
          .from('photos')
          .select('hashtags')
          .not('hashtags', 'is', null);

        // إذا كنا في مجموعة محددة، نجلب ألبومات المجموعة
        if (selectedGroupId) {
          query = query.eq('group_id', selectedGroupId);
        }
        // إذا كنا في المساحة الشخصية، نجلب الألبومات الشخصية
        else if (!isGroupPhoto) {
          query = query.is('group_id', null);
        }
        // إذا كنا في المساحة المشتركة، نجلب جميع الألبومات المشتركة
        else {
          query = query.not('group_id', 'is', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        const allAlbums = data
          .flatMap(photo => photo.hashtags || [])
          .filter((album): album is string => Boolean(album));
        
        const uniqueAlbums = [...new Set(allAlbums)];
        setAlbums(uniqueAlbums);
      } catch (error) {
        console.error('Error fetching albums:', error);
      }
    };

    if (showAlbumDialog) {
      fetchAlbums();
    }
  }, [showAlbumDialog]);

  // معالجة إضافة صورة إلى ألبوم
  const handleAddToAlbum = async () => {
    if (!selectedAlbum) return;
    
    try {
      if (onUpdateCaption) {
        await onUpdateCaption(caption, [selectedAlbum]);
      }
      setShowAlbumDialog(false);
    } catch (error) {
      console.error('Error adding to album:', error);
    }
  };

  // معالجة إنشاء ألبوم جديد
  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;
    
    try {
      setAlbums(prev => [...prev, newAlbumName]);
      setSelectedAlbum(newAlbumName);
      setNewAlbumName('');
      setShowNewAlbumInput(false);
    } catch (error) {
      console.error('Error creating album:', error);
    }
  };

  // إظهار/إخفاء حقل الإدخال للألبوم الجديد
  const toggleNewAlbumInput = () => {
    setShowNewAlbumInput(!showNewAlbumInput);
    if (!showNewAlbumInput) {
      setSelectedAlbum(null);
      setTimeout(() => document.getElementById('newAlbumInput')?.focus(), 100);
    }
  };

  // تنسيق تاريخ التعليق بتنسيق رقمي
  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // No duplicate state declarations here - they've been moved to the top of the component

  // حالة التعديل على التعليق
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentContent, setEditedCommentContent] = useState('');

  // بدء تعديل تعليق
  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditedCommentContent(comment.content);
  };

  // إلغاء التعديل
  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditedCommentContent('');
  };

  // حفظ التعديلات على التعليق
  const saveEditedComment = async (commentId: string) => {
    if (!editedCommentContent.trim()) return;

    try {
      setIsCommentLoading(true);
      
      // تحديث التعليق محلياً أولاً
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, content: editedCommentContent, updated_at: new Date().toISOString() }
            : comment
        )
      );

      // تحديث التعليق في قاعدة البيانات
      const { error } = await supabase
        .from('comments')
        .update({ 
          content: editedCommentContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      // إغلاق وضع التعديل
      setEditingCommentId(null);
      setEditedCommentContent('');
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث التعليق بنجاح',
      });
      
    } catch (error) {
      console.error('Error updating comment:', error);
      
      // إعادة تحميل التعليقات من الخادم في حالة الخطأ
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث التعليق. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsCommentLoading(false);
    }
  };

  // حذف تعليق
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    
    // التحقق من أن المعرف ليس مؤقتاً
    const isTemporaryId = commentId.startsWith('temp-');
    
    // حفظ نسخة من التعليق المحذوف للتراجع في حالة الخطأ
    const deletedComment = comments.find(c => c.id === commentId);
    
    try {
      setIsCommentLoading(true);
      
      // حذف التعليق محلياً أولاً
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      // حذف التعليق من قاعدة البيانات فقط إذا لم يكن مؤقتاً
      if (!isTemporaryId) {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);

        if (error) throw error;
      }
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف التعليق بنجاح',
      });
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      
      // إعادة إضافة التعليق في حالة الخطأ
      if (deletedComment) {
        setComments(prev => [...prev, deletedComment].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف التعليق. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsCommentLoading(false);
    }
  };

  // معالجة إضافة تعليق جديد
  const handleAddComment = async (content: string) => {
    if (!content.trim() || !onAddComment) return;
    
    setIsCommentLoading(true);
    
    try {
      setNewComment('');
      
      // إرسال التعليق للخادم من خلال الدالة الأب
      // PhotoGrid سيتولى التحديث المؤقت بالبيانات الصحيحة
      await onAddComment(content);
      
    } catch (error) {
      console.error('Error adding comment:', error);
      
      // إظهار رسالة خطأ للمستخدم
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة التعليق. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsCommentLoading(false);
    }
  };

  // العرض (render) للمكون
  return (
    <>
      {/* الحاوية الرئيسية للبطاقة */}
      <div 
        className="relative group overflow-hidden rounded-xl shadow-xl transition-all duration-300"
        onClick={toggleControls} // تبديل إظهار الأزرار عند النقر
      >
        {/* حاوية الصورة */}
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={imageUrl} // رابط الصورة
            alt="Gallery" // نص بديل للصورة
            className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105" // تنسيق الصورة مع تأثير تكبير عند التمرير
            loading="lazy" // تحميل كسول للصورة لتحسين الأداء
          />
          {/* تدرج شفاف فوق الصورة يظهر عند إظهار الأزرار */}
          <div className={`absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 transition-opacity duration-300 ${
            isControlsVisible ? 'opacity-100' : 'opacity-0'
          }`} />
        </div>
        
        {/* زر السحب (drag handle) - موحد لجميع الصور */}
        <div 
          {...dragHandleProps} // خصائص السحب والإفلات
          className={`absolute top-2 right-2 p-2 rounded-full bg-black/20 backdrop-blur-sm transition-opacity duration-300 cursor-move ${
            isControlsVisible ? 'opacity-50' : 'opacity-0' // يظهر عند تفعيل الأزرار
          }`}
        >
          <GripVertical className="w-4 h-4 text-white" /> {/* أيقونة السحب */}
        </div>

        {/* زر الخيارات - موحد لجميع الصور - يظهر فقط لمالك الصورة */}
        {currentUserId === photoOwnerId && (
          <div className={`absolute top-2 left-2 transition-opacity duration-300 ${
            isControlsVisible ? 'opacity-100' : 'opacity-0'
          }`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-black/90 backdrop-blur-xl border border-white/20">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAlbumDialog(true);
                  }}
                  className="text-white hover:bg-white/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  <span>إضافة إلى ألبوم</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="text-white hover:bg-white/20 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 ml-2" />
                  <span>إضافة/تعديل الوصف</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  className="text-red-400 hover:bg-red-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  <span>حذف</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* زر عرض/إخفاء التعليقات مع العداد */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
                if (!showComments) {
                  setIsCommenting(false);
                }
              }}
              className={`p-2 rounded-full bg-black/20 backdrop-blur-sm transition-all duration-300 ${
                isControlsVisible ? 'opacity-100' : 'opacity-0'
              } hover:bg-blue-500/50 hover:opacity-100`}
            >
              <MessageCircle className={`w-4 h-4 ${showComments ? 'text-blue-400' : 'text-white'}`} />
              {comments.length > 0 && (
                <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center transition-opacity duration-300 ${
                  isControlsVisible ? 'opacity-100' : 'opacity-0'
                }`}>
                  {comments.length > 9 ? '9+' : comments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* قسم الإعجابات - في الموضع القديم */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation(); // منع النقر من التأثير على الحاوية الرئيسية
              handleLike(); // استدعاء دالة الإعجاب
            }}
            className="relative group flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2"
          >
            <div className="relative">
              <Heart
                className={`w-6 h-6 transition-all duration-300 transform ${
                  isLoved ? "fill-[#ea384c] text-[#ea384c] scale-125" : "hover:scale-110" // تغيير شكل القلب عند الإعجاب
                }`}
              />
              {isHeartAnimating && ( // عرض الأنيميشن عند تفعيله
                <div className="absolute inset-0 animate-ping">
                  <Heart className="w-6 h-6 text-[#ea384c]/30" /> {/* أنيميشن ping للقلب */}
                </div>
              )}
            </div>
          </button>
          {/* عرض عدد الإعجابات */}
          <span className="text-sm font-medium bg-black/10 backdrop-blur-sm px-2 py-1 rounded-md text-white/90">
            {likes}
          </span>
        </div>

        {/* عرض الكابشن والهاشتاجات */}
        {(caption || hashtags.length > 0) && (
          <div className={`absolute left-2 right-2 bottom-14 transition-all duration-300 ${
            isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <div className="bg-black/50 backdrop-blur-md rounded-lg p-2">
              {caption && (
                <div className="mb-1 text-right">
                  <div className="text-right mb-1">
                    <span className="text-yellow-100 text-[11px] font-medium opacity-80 bg-black/20 px-2 py-0.5 rounded">
                      {getPhotoOwnerName()}
                    </span>
                  </div>
                  <p className="text-white text-sm pr-1 text-right" dir="auto" style={{ unicodeBidi: 'plaintext' }}>
                    {caption}
                  </p>
                </div>
              )}
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-end">
                  {hashtags.map((tag) => (
                    <span key={tag} className="text-xs text-white/60" dir="rtl">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* قسم التعليقات الخارجي - يظهر أسفل الكارت */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
        showComments ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'
      }`}>
        <div className="bg-white/5 backdrop-blur-md rounded-xl px-1.5 py-1 space-y-1 border border-white/10">
          {/* قسم إضافة تعليق جديد */}
          <div>
            <div className="flex-1">
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddComment(newComment)}
                  disabled={!newComment.trim() || isCommentLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full aspect-square flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                  title="إرسال التعليق"
                >
                  {isCommentLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  )}
                </button>
                <input
                  type="text"
                  dir="rtl"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="اكتب تعليقاً..."
                  className="flex-1 bg-white/5 border border-white/20 text-white placeholder-white/50 text-sm rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-right transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment(newComment);
                    }
                  }}
                  style={{ direction: 'rtl' }}
                />
              </div>
            </div>
          </div>

          {/* عرض التعليقات */}
          {comments.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 -mr-2">
              {comments.map((comment) => (
                <div key={comment.id} className="group hover:bg-white/5 rounded-lg px-1 py-0.5 transition-all -mx-1">
                  <div className="flex-1 min-w-0">
                    {editingCommentId === comment.id ? (
                      /* وضع التعديل */
                      <div className="space-y-3">
                        <div className="bg-white/5 rounded-lg p-3 border border-white/20">
                          <textarea
                            value={editedCommentContent}
                            onChange={(e) => setEditedCommentContent(e.target.value)}
                            className="w-full bg-transparent border-none text-white text-sm focus:outline-none resize-none text-right"
                            dir="rtl"
                            rows={3}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                saveEditedComment(comment.id);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            style={{ direction: 'rtl' }}
                          />
                        </div>
                        <div className="flex justify-start gap-2">
                          <button
                            onClick={() => saveEditedComment(comment.id)}
                            disabled={!editedCommentContent.trim()}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50 text-white font-medium"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => cancelEditing()}
                            className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* عرض التعليق العادي */
                      <div className="bg-white/5 rounded-2xl p-2 relative">
                        {/* زر القائمة المنسدلة للتعليق - يظهر فقط لمالك التعليق */}
                        {comment.user_id === currentUserId && (
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button 
                                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-4 h-4 text-white/60" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="bg-gray-800/95 backdrop-blur-xl border-gray-700">
                                <DropdownMenuItem 
                                  className="cursor-pointer text-sm p-3 hover:bg-gray-700/50 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingComment(comment);
                                  }}
                                >
                                  <Edit3 className="w-4 h-4 ml-2" />
                                  <span>تعديل</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="cursor-pointer text-sm p-3 text-red-400 hover:bg-red-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteComment(comment.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 ml-2" />
                                  <span>حذف</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        
                        <div className="w-full">
                          <div className="flex justify-end mb-1">
                            <span className="text-blue-300 text-xs font-medium bg-black/10 px-1.5 py-0.5 rounded-md">
                              {getDisplayName(comment.user_id, comment.user?.email, comment.user?.full_name)}
                            </span>
                          </div>
                           <p className="text-white text-sm leading-tight whitespace-pre-line text-right -mb-0.5 mt-0.5" dir="auto">
                             {comment.content}
                           </p>
                           <div className="flex justify-between items-center -mt-0.5 mb-0">
                             <div className="flex items-center gap-2">
                               {/* زر الإعجاب بالتعليق */}
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onLikeComment(comment.id);
                                 }}
                                 className="flex items-center gap-1 text-white/60 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-white/10"
                               >
                                 <Heart 
                                   className={`w-3 h-3 transition-all ${
                                     comment.liked_by?.split(',').includes(currentUserId) 
                                       ? 'fill-red-400 text-red-400' 
                                       : 'hover:scale-110'
                                   }`} 
                                 />
                                 {(comment.likes || 0) > 0 && (
                                   <span className="text-xs">{comment.likes}</span>
                                 )}
                               </button>
                             </div>
                             <span className="text-white/30 text-[10px]">
                               {formatCommentDate(comment.updated_at)}
                             </span>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* رسالة عدم وجود تعليقات */}
          {comments.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">لا توجد تعليقات بعد</p>
              <p className="text-white/30 text-xs mt-1">كن أول من يعلق على هذه الصورة</p>
            </div>
          )}
        </div>
      </div>

      {/* نافذة التحرير (Dialog) */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="bg-gray-900/60 backdrop-blur-xl text-white border-0">
          <DialogHeader>
            <DialogTitle className="text-right text-xl">
              أضف تعليقا
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* حقل التعليق */}
            <div>
              <label className="block text-sm font-medium mb-2"></label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm rounded-sm text-white text-right"
                rows={3}
                placeholder="أضف تعليقاً..."
                dir="auto"
                style={{ 
                  textAlign: 'right',
                  unicodeBidi: 'plaintext',
                  direction: 'rtl'
                }}
              />
            </div>
            {/* أزرار الإلغاء والحفظ */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)} // إغلاق النافذة بدون حفظ
                className="px-4 py-2 rounded-md bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleCaptionSubmit} // حفظ التغييرات
                className="px-4 py-2 rounded-md bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              >
                حفظ
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة اختيار الألبوم المشترك */}
      <Dialog open={showAlbumDialog} onOpenChange={(open) => {
        setShowAlbumDialog(open);
        if (!open) {
          setShowNewAlbumInput(false);
          setNewAlbumName('');
        }
      }}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl text-white border-0 max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-right text-xl">
              {selectedGroupId ? 'اختر ألبوم المجموعة' : (isGroupPhoto ? 'اختر ألبوم مشترك' : 'اختر ألبوماً شخصياً')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* إشعار للمستخدم */}
            <div className={`${selectedGroupId ? 'bg-purple-500/10 border-purple-500/30' : (isGroupPhoto ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/10 border-green-500/30')} border rounded-lg p-3 text-center`}>
              <p className={`${selectedGroupId ? 'text-purple-300' : (isGroupPhoto ? 'text-blue-300' : 'text-green-300')} text-sm`}>
                {selectedGroupId 
                  ? 'هذه الألبومات خاصة بهذه المجموعة فقط'
                  : (isGroupPhoto 
                    ? 'هذه الألبومات خاصة بالمساحة المشتركة فقط'
                    : 'هذه الألبومات خاصة بمساحتك الشخصية فقط'
                  )
                }
              </p>
            </div>
            
            {/* قائمة الألبومات */}
            <div className="max-h-96 overflow-y-auto p-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* New Album Card */}
                <div 
                  onClick={toggleNewAlbumInput}
                  className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all h-20 ${
                    showNewAlbumInput 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : 'border-emerald-500/50 hover:bg-emerald-500/10'
                  }`}
                >
                  <Plus className={`w-5 h-5 mb-1 ${showNewAlbumInput ? 'text-emerald-400' : 'text-emerald-400'}`} />
                  <span className={`text-sm font-medium ${showNewAlbumInput ? 'text-emerald-300' : 'text-emerald-400'}`}>
                    {showNewAlbumInput ? 'إلغاء' : 'ألبوم جديد'}
                  </span>
                </div>
                
                {/* Existing Albums */}
                {albums.map((album) => (
                  <div 
                    key={album}
                    onClick={() => {
                      setSelectedAlbum(album);
                      setShowNewAlbumInput(false);
                    }}
                    className="relative p-0 overflow-hidden group h-20 flex items-center"
                  >
                    <div className={`absolute inset-0 bg-black/60 ${selectedAlbum === album ? 'opacity-100' : 'opacity-70'} transition-opacity`}></div>
                    <p className="relative z-10 text-right font-medium text-white text-sm flex-1 line-clamp-2 p-3 w-full">{album}</p>
                    {selectedAlbum === album && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex-shrink-0 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
                
                {albums.length === 0 && !showNewAlbumInput && (
                  <div className="col-span-3 py-8 text-center">
                    <p className="text-white/50">
                      {selectedGroupId 
                        ? 'لا توجد ألبومات متاحة لهذه المجموعة'
                        : (isGroupPhoto 
                          ? 'لا توجد ألبومات مشتركة متاحة'
                          : 'لا توجد ألبومات شخصية متاحة'
                        )
                      }
                    </p>
                    <p className="text-white/30 text-sm mt-2">
                      {selectedGroupId
                        ? 'يمكنك إنشاء ألبوم جديد لهذه المجموعة'
                        : (isGroupPhoto
                          ? 'يمكنك إنشاء ألبوم جديد للمساحة المشتركة'
                          : 'يمكنك إنشاء ألبوم جديد لمساحتك الشخصية'
                        )
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* New Album Input - Only shown when showNewAlbumInput is true */}
            {showNewAlbumInput && (
              <div className="pt-4 border-t border-white/10 animate-fadeIn">
                <div className="flex gap-2">
                  <input
                    id="newAlbumInput"
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && newAlbumName.trim() && handleCreateAlbum()}
                    placeholder={selectedGroupId 
                      ? "اكتب اسم ألبوم المجموعة الجديد"
                      : (isGroupPhoto 
                        ? "اكتب اسم الألبوم المشترك الجديد"
                        : "اكتب اسم الألبوم الشخصي الجديد"
                      )
                    }
                    className="flex-1 px-3 py-2 bg-white/5 border border-emerald-500/30 rounded-lg text-white text-right focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    dir="rtl"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateAlbum}
                    disabled={!newAlbumName.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                  >
                    <span>إضافة</span>
                  </button>
                </div>
              </div>
            )}

            {/* أزرار الإجراءات */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowAlbumDialog(false)}
                className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddToAlbum}
                disabled={!selectedAlbum}
                className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                تأكيد
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// تصدير المكون لاستخدامه في مكان آخر
export default PhotoCard;
