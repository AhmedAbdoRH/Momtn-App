import { useState, useEffect, useRef, FC } from "react";
import { createPortal } from "react-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import PhotoCard from "./PhotoCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { PostgrestError } from "@supabase/supabase-js";

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

interface PhotoUser {
  id?: string;
  email: string;
  full_name: string | null;
}

interface Photo {
  id: string;
  image_url: string;
  likes: number;
  caption?: string | null;
  hashtags?: string[] | null;
  comments?: Comment[];
  created_at: string;
  order?: number | null;
  user_id?: string;
  group_id?: string | null;
  users?: PhotoUser;
}

interface PhotoGridProps {
  closeSidebar: () => void;
  selectedGroupId: string | null;
}

declare global {
  interface Window {
    addPhoto: (params: { imageUrl: string; groupId?: string | null }) => Promise<boolean>;
  }
}

const PhotoGrid: FC<PhotoGridProps> = ({ closeSidebar, selectedGroupId }): JSX.Element => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { toast } = useToast();
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [allHashtags, setAllHashtags] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم';
  const [loadingInitialPhotos, setLoadingInitialPhotos] = useState(true);
  const [hasPhotosLoadedOnce, setHasPhotosLoadedOnce] = useState(false);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Check if user has disabled the tutorial
  const [tutorialDismissed, setTutorialDismissed] = useState<boolean>(false);

  const checkTutorialStatus = async (userId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('tutorial_dismissed')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching tutorial status:', error);
        return false;
      }

      return userData?.tutorial_dismissed || false;
    } catch (error) {
      console.error('Error checking tutorial status:', error);
      return false;
    }
  };

  // Load tutorial status when user changes
  useEffect(() => {
    const loadTutorialStatus = async () => {
      if (user?.id) {
        const dismissed = await checkTutorialStatus(user.id);
        setTutorialDismissed(dismissed);
        console.log('Tutorial status loaded:', dismissed, 'for user:', user.id);
      }
    };
    
    loadTutorialStatus();
  }, [user?.id]);

  useEffect(() => {
    const initialize = async () => {
      if (user) {
        try {
          await fetchPhotos();
        } catch (error) {
          console.error('Error initializing photos:', error);
          setLoadingInitialPhotos(false);
        }
      } else {
        setLoadingInitialPhotos(false);
      }
    };
    
    initialize();
  }, [user, selectedGroupId]);

  useEffect(() => {
    const handlePhotoAdded = async () => {
      await fetchPhotos();
    };
    
    const handleDisplayNameUpdated = async () => {
      await fetchPhotos();
    };
    
    window.addEventListener('photo-added', handlePhotoAdded);
    window.addEventListener('displayNameUpdated', handleDisplayNameUpdated);
    return () => {
      window.removeEventListener('photo-added', handlePhotoAdded);
      window.removeEventListener('displayNameUpdated', handleDisplayNameUpdated);
    };
  }, [selectedGroupId]); // Add selectedGroupId dependency to ensure it uses current value

  useEffect(() => {
    const tags = new Set<string>();
    photos.forEach(photo => {
      if (photo.hashtags && Array.isArray(photo.hashtags)) {
        photo.hashtags.forEach(tag => {
          if (tag && tag.trim()) {
            tags.add(tag.trim());
          }
        });
      }
    });
    setAllHashtags(tags);
  }, [photos]);

  const renderHashtags = () => {
    const hashtagsContainer = document.getElementById('hashtags-container');
    if (!hashtagsContainer) return null;

    return createPortal(
      <>
        <button
          onClick={() => {
            setSelectedHashtag(null);
            closeSidebar();
          }}
          className="block w-full text-right px-3 py-2 mb-4 rounded-lg transition-colors bg-white/10 text-white hover:bg-white/20"
        >
          إظهار الكل
        </button>
        <div className="flex flex-col space-y-2 items-end w-full">
          {Array.from(allHashtags).map(tag => (
            <button
              key={tag}
              onClick={() => handleHashtagClick(tag)}
              className={`px-3 py-2 rounded-lg transition-colors w-full text-right ${
                tag === selectedHashtag
                  ? 'bg-[#ea384c]/20 text-pink-200'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </>,
      hashtagsContainer
    );
  };

  const handleHashtagClick = (hashtag: string): void => {
    setSelectedHashtag(selectedHashtag === hashtag ? null : hashtag);
  };

  const fetchPhotos = async (): Promise<Photo[]> => {
    if (!user) {
      setLoadingInitialPhotos(false);
      return [];
    }
    
    setLoadingInitialPhotos(true);
    
    try {
      // Build the base query
      let query = supabase
        .from('photos')
        .select('*');

      // Apply group filter
      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId);
      } else {
        // For personal space, only show current user's photos
        query = query.is('group_id', null).eq('user_id', user.id);
      }

      // Execute the query - order by created_at first (newest first), then by order
      const { data: photosData, error: photosError } = await query
        .order('created_at', { ascending: false })
        .order('order', { ascending: true });

      if (photosError) throw photosError;
      if (!photosData || photosData.length === 0) {
        setPhotos([]);
        setHasPhotosLoadedOnce(true);
        return [];
      }

      const photoIds = photosData.map(p => p.id);
      let likesMap = new Map<string, number>();
      if (photoIds.length > 0) {
        const { data: likesRows } = await supabase
          .from('photo_likes')
          .select('photo_id')
          .in('photo_id', photoIds);
        if (likesRows) {
          for (const row of likesRows as any[]) {
            const pid = row.photo_id as string;
            likesMap.set(pid, (likesMap.get(pid) || 0) + 1);
          }
        }
      }

      // Get unique user IDs from photos
      const userIds = [...new Set(photosData.map(photo => photo.user_id).filter(Boolean))] as string[];
      
      let usersMap = new Map<string, { id: string; email: string; full_name: string | null }>();
      
      if (userIds.length > 0) {
        // Fetch user data in a single query only if we have user IDs
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else if (usersData) {
          usersMap = new Map(usersData.map(user => [user.id, user]));
        }
      }

      // Combine photos with user data
      const photosWithUsers: Photo[] = photosData.map(photo => ({
        ...photo,
        likes: likesMap.get(photo.id) ?? (photo as any).likes_count ?? photo.likes ?? 0,
        users: usersMap.get(photo.user_id || '') || { 
          email: 'unknown@example.com', 
          full_name: null 
        }
      }));

      setPhotos(photosWithUsers);
      setHasPhotosLoadedOnce(true);
      
      // Fetch comments for each photo
      await Promise.all(photosWithUsers.map(photo => fetchComments(photo.id)));
      
      return photosWithUsers;
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب الصور',
        variant: 'destructive',
      });
    } finally {
      setLoadingInitialPhotos(false);
    }
  };

  const handleUpdateCaption = async (photoId: string, caption: string, hashtags: string[]): Promise<void> => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ caption, hashtags })
        .eq('id', photoId);

      if (error) throw error;

      // تحديث الحالة المحلية
      setPhotos(prev => prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, caption, hashtags } 
          : photo
      ));

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث التعليق والهاشتاجات بنجاح',
      });
    } catch (error) {
      console.error('Error updating caption:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث التعليق',
        variant: 'destructive',
      });
    }
  };

  const handleAddComment = async (photoId: string, content: string): Promise<void> => {
    if (!user?.id) {
      console.error('No user ID available');
      throw new Error('يجب تسجيل الدخول لإضافة تعليق');
    }

    console.log('Starting to add comment...');
    console.log('User ID:', user.id);
    console.log('Photo ID:', photoId);
    console.log('Content:', content);
    
    const tempId = `temp-${Date.now()}`;
    
    // Create temporary comment for optimistic update
    const tempComment: Comment = {
      id: tempId,
      photo_id: photoId,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        email: user.email || '',
        full_name: userDisplayName
      }
    };

    // Update local state first for optimistic UI
    setPhotos(prev => {
      const updated = prev.map(photo => ({
        ...photo,
        comments: photo.id === photoId 
          ? [tempComment, ...(photo.comments || [])]
          : photo.comments
      }));
      console.log('Optimistic UI update completed');
      return updated;
    });

    try {
      console.log('Checking if user exists in public.users...');
      
      // Check if user exists in public.users
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking user:', userCheckError);
        throw userCheckError;
      }

      // If user doesn't exist, create them
      if (!existingUser) {
        console.log('User not found in public.users, creating...');
        const { error: userUpsertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            full_name: userDisplayName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (userUpsertError) {
          console.error('Error creating user:', userUpsertError);
          throw userUpsertError;
        }
        console.log('User created successfully');
      } else {
        console.log('User exists in public.users');
      }

      // Insert the comment
      console.log('Inserting comment...');
      const { data: savedComment, error: insertError } = await supabase
        .from('comments')
        .insert({
          photo_id: photoId,
          content,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting comment:', insertError);
        throw insertError;
      }

      console.log('Comment inserted successfully:', savedComment);

      // Fetch the comment with user data
      console.log('Fetching comment with user data...');
      const { data: fullComment, error: fetchError } = await supabase
        .from('comments')
        .select(`
          *,
          user:user_id (id, email, full_name)
        `)
        .eq('id', savedComment.id)
        .single();

      if (fetchError) {
        console.error('Error fetching comment with user data:', fetchError);
        throw fetchError;
      }

      console.log('Fetched comment with user data:', fullComment);

      // Update with the real comment from server
      setPhotos(prev => {
        const updated = prev.map(photo => ({
          ...photo,
          comments: photo.id === photoId
            ? (photo.comments || []).map(c => 
                c.id === tempId 
                  ? {
                      ...fullComment,
                      user: fullComment.user || tempComment.user
                    }
                  : c
              )
            : photo.comments
        }));
        console.log('UI updated with server response');
        return updated;
      });

      toast({
        title: 'تمت الإضافة',
        description: 'تم إضافة تعليقك بنجاح',
      });

    } catch (error) {
      console.error('Error in handleAddComment:', error);
      
      // Remove the temporary comment on error
      setPhotos(prev => {
        const updated = prev.map(photo => ({
          ...photo,
          comments: photo.id === photoId
            ? (photo.comments || []).filter(c => c.id !== tempId)
            : photo.comments
        }));
        console.log('Reverted optimistic update due to error');
        return updated;
      });
      
      // Show error message to user
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة التعليق. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
      
      throw error;
    }
  };

  // معالجة الإعجاب بالتعليقات
  const handleLikeComment = async (commentId: string): Promise<void> => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('comment_likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
      }

      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);

      const updatedCount = count || 0;
      setPhotos(prev => 
        prev.map(photo => ({
          ...photo,
          comments: photo.comments?.map(comment => 
            comment.id === commentId 
              ? { ...comment, likes: updatedCount }
              : comment
          )
        }))
      );

    } catch (error) {
      console.error('Error in handleLikeComment:', error);
    }
  };

  const handleLike = async (photoId: string): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const { data: existing } = await supabase
        .from('photo_likes')
        .select('id')
        .eq('photo_id', photoId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('photo_likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('photo_likes').insert({ photo_id: photoId, user_id: user.id });
      }

      const { count } = await supabase
        .from('photo_likes')
        .select('*', { count: 'exact', head: true })
        .eq('photo_id', photoId);

      const updatedCount = count || 0;
      setPhotos(prev => 
        prev.map(photo => 
          photo.id === photoId 
            ? { ...photo, likes: updatedCount } 
            : photo
        )
      );

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة الإعجاب',
      });
    } catch (error) {
      console.error('Error liking photo:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الإعجاب بالصورة',
        variant: 'destructive',
      });
    }
  };

  const fetchComments = async (photoId: string): Promise<Comment[]> => {
    try {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('photo_id', photoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      // Get user data for comments
      const userIds = [...new Set(comments.map(comment => comment.user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);

      const usersMap = new Map(users?.map(u => [u.id, u]));

      const commentIds = comments.map(c => c.id);
      let commentLikesMap = new Map<string, number>();
      if (commentIds.length > 0) {
        const { data: likesRows } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .in('comment_id', commentIds);
        if (likesRows) {
          for (const row of likesRows as any[]) {
            const cid = row.comment_id as string;
            commentLikesMap.set(cid, (commentLikesMap.get(cid) || 0) + 1);
          }
        }
      }

      const commentsWithUsers: Comment[] = comments.map(comment => ({
        ...comment,
        likes: commentLikesMap.get(comment.id) ?? (comment as any).likes_count ?? (comment as any).likes ?? 0,
        user: {
          email: usersMap.get(comment.user_id)?.email || 'unknown@example.com',
          full_name: usersMap.get(comment.user_id)?.full_name || null
        }
      }));

      // Update local state
      setPhotos(prev => 
        prev.map(photo => ({
          ...photo,
          comments: photo.id === photoId ? commentsWithUsers : photo.comments
        }))
      );

      return commentsWithUsers;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    const items = Array.from(photos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((photo, index) => ({
      ...photo,
      order: index
    }));
    setPhotos(updatedItems);

    try {
      const currentTime = new Date().toISOString();
      for (let i = 0; i < updatedItems.length; i++) {
        const { error } = await supabase
          .from('photos')
          .update({ 
            order: i,
            created_at: i === 0 ? currentTime : updatedItems[i].created_at // Update created_at for the first item
          })
          .eq('id', updatedItems[i].id);
        if (error) {
          toast({
            title: "خطأ في تحديث الترتيب",
            description: `لم نتمكن من تحديث ترتيب الصورة: ${error.message}`,
            variant: "destructive",
          });
        }
      }

      toast({ title: "تم الترتيب", description: "تم حفظ ترتيب الصور بنجاح" });
    } catch {
      toast({
        title: "خطأ في الترتيب",
        description: "حدث خطأ أثناء حفظ الترتيب الجديد",
        variant: "destructive",
      });
    }
  };

  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoHashtags, setPhotoHashtags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleCaptionSubmit = async () => {
    if (!newPhotoUrl || !photoCaption.trim()) return;
    
    setIsUploading(true);
    try {
      await addPhoto({
        imageUrl: newPhotoUrl,
        caption: photoCaption.trim(),
        hashtags: photoHashtags,
        groupId: selectedGroupId || undefined
      });
      
      setPhotoCaption('');
      setPhotoHashtags([]);
      setNewPhotoUrl(null);
      setShowCaptionInput(false);
    } catch (error) {
      console.error('Error adding photo with caption:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الصورة مع الوصف",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const addPhoto = async (params: { 
    imageUrl: string; 
    caption?: string; 
    hashtags?: string[];
    groupId?: string | null 
  }): Promise<boolean> => {
    console.log('addPhoto called with params:', params);
    if (!user) {
      toast({ title: "لم تسجل الدخول", description: "يجب تسجيل الدخول لإضافة صور", variant: "destructive" });
      return false;
    }
    try {
      const isFirstPhoto = photos.length === 0;
      console.log('isFirstPhoto:', isFirstPhoto, 'photos.length:', photos.length);
      
      // Extract hashtags from caption if any
      const captionText = params.caption || '';
      const captionHashtags = captionText.match(/#\w+/g) || [];
      const allHashtags = [...new Set([...(params.hashtags || []), ...captionHashtags])];
      
      if (params.groupId || selectedGroupId) {
        const gid = params.groupId || selectedGroupId || null;
        if (gid) {
          const { data: membership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', gid)
            .eq('user_id', user.id)
            .maybeSingle();
          if (!membership) {
            toast({ title: "غير مسموح", description: "يجب أن تكون عضواً في المجموعة", variant: "destructive" });
            return false;
          }
        }
      }
      
      const { data, error } = await supabase
        .from('photos')
        .insert({
          image_url: params.imageUrl,
          caption: captionText,
          hashtags: allHashtags,
          user_id: user.id,
          order: 0,
          group_id: params.groupId || selectedGroupId || null
        })
        .select('*');

      if (error) {
        toast({ title: "خطأ في الإضافة", description: "لم نتمكن من إضافة الصورة", variant: "destructive" });
        return false;
      }

      if (data && data.length > 0) {
        // Get user data for the new photo
        const { data: userData } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('id', user.id)
          .single();

        const photoWithUser = {
          ...data[0],
          likes: 0,
          users: userData || null
        };

        setPhotos(prev => [photoWithUser, ...prev]);
        setHasPhotosLoadedOnce(true);
        
        // Show first-time modal only if it's the first photo and user hasn't dismissed tutorial
        if (!selectedGroupId && isFirstPhoto && !tutorialDismissed) {
          console.log('Showing first time modal after adding first photo');
          setShowFirstTimeModal(true);
        }
        
        toast({ 
          title: "✨ تمت الإضافة بنجاح", 
          description: isFirstPhoto ? "تهانينا! لقد أضفت صورتك الأولى" : "تمت إضافة صورتك بنجاح",
          className: "animate-pulse border-2 border-green-400/50 bg-green-900/80 backdrop-blur-sm"
        });
      }

      return true;
    } catch (error) {
      console.error('Error in addPhoto:', error);
      toast({ 
        title: "خطأ غير متوقع", 
        description: "حدث خطأ أثناء إضافة الصورة", 
        variant: "destructive" 
      });
      return false;
    }
  };

  useEffect(() => {
    window.addPhoto = async (params) => {
      setNewPhotoUrl(params.imageUrl);
      setShowCaptionInput(true);
      return true;
    };
    return () => {
      // @ts-ignore
      delete window.addPhoto;
    };
  }, [user, photos, selectedGroupId]);

  const handleDelete = async (id: string, imageUrl: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) {
        toast({ title: "خطأ في الحذف", description: "لم نتمكن من حذف الصورة", variant: "destructive" });
        return;
      }

      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('photos').remove([fileName]);
      }

      setPhotos(prev => prev.filter(photo => photo.id !== id));
      if (photos.length === 1) {
        setHasPhotosLoadedOnce(false);
      }

      toast({ title: "تم الحذف بنجاح", description: "تم حذف الصورة" });
    } catch {
      console.error('Exception deleting photo');
    }
  };

  const handleTutorialClose = async (): Promise<void> => {
    setShowFirstTimeModal(false);
    
    if (dontShowAgain && user?.id) {
      try {
        // Save to database
        const { error } = await supabase
          .from('users')
          .update({ tutorial_dismissed: true })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating tutorial dismissed status:', error);
        } else {
          setTutorialDismissed(true);
        }
        
        // Also save to localStorage as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem(`dontShowTutorial_${user.id}`, 'true');
        }
      } catch (error) {
        console.error('Error in handleTutorialClose:', error);
      }
    }
  };

  const filteredPhotos = selectedHashtag
    ? photos.filter(photo =>
        photo.hashtags?.some(tag => tag.trim() === selectedHashtag.trim())
      )
    : photos;

  return (
    <div className="w-full" data-testid="photo-grid">
      {selectedHashtag && (
        <h2 className="text-2xl font-semibold text-white/90 text-center mb-8 bg-white/5 backdrop-blur-sm py-3 rounded-lg">
          {selectedHashtag}
        </h2>
      )}

      {renderHashtags()}

      {/* Caption Input Modal */}
      <Dialog open={showCaptionInput} onOpenChange={setShowCaptionInput}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-[#2D1F3D] to-[#1A1F2C] border border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-right text-xl font-bold mb-4">إضافة وصف للصورة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {newPhotoUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={newPhotoUrl} 
                  alt="معاينة الصورة" 
                  className="max-h-48 rounded-lg object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="photoCaption" className="block text-sm font-medium text-right">
                اكتب وصفاً للصورة (اختياري)
              </label>
              <textarea
                id="photoCaption"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/5 border border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-gray-400"
                rows={3}
                placeholder="اكتب وصفاً للصورة..."
                dir="rtl"
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                يمكنك استخدام # لإنشاء هاشتاجات (مثال: #مناسبه #ذكريات)
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowCaptionInput(false);
                setPhotoCaption('');
                setNewPhotoUrl(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              disabled={isUploading}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleCaptionSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري الحفظ...
                </>
              ) : 'حفظ الصورة'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {loadingInitialPhotos ? (
        <div className="flex justify-center items-center h-48">
          <p className="text-gray-300">جارٍ التحميل...</p>
        </div>
      ) : !hasPhotosLoadedOnce || photos.length === 0 ? (
        <div className="flex justify-center items-center h-50 mt-10">
          <img src="/EmptyCard.gif" alt="لا توجد صور" className="max-w-full max-h-full opacity-80" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="photos">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4"
              >
                {filteredPhotos.map((photo, index) => (
                  <Draggable key={photo.id} draggableId={photo.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="relative group"
                      >
                        <PhotoCard
                          key={photo.id}
                          id={photo.id}
                          photoId={photo.id}
                          imageUrl={photo.image_url}
                          likes={photo.likes}
                          caption={photo.caption || ''}
                          hashtags={photo.hashtags || []}
                          comments={photo.comments || []}
                          onLike={() => handleLike(photo.id)}
                          onDelete={() => handleDelete(photo.id, photo.image_url)}
                          dragHandleProps={provided.dragHandleProps}
                          onUpdateCaption={(caption, hashtags) => 
                            handleUpdateCaption(photo.id, caption, hashtags)
                          }
                          onAddComment={(content) => handleAddComment(photo.id, content)}
                          onLikeComment={(commentId) => handleLikeComment(commentId)}
                          isGroupPhoto={!!selectedGroupId}
                          userEmail={photo.users?.email || user?.email || ''}
                          userDisplayName={photo.users?.full_name || userDisplayName}
                          selectedGroupId={selectedGroupId}
                          currentUserId={user?.id || ''}
                          photoOwnerId={photo.user_id}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* First Time User Modal */}
      <Dialog open={showFirstTimeModal} onOpenChange={setShowFirstTimeModal}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-green-900/40 to-blue-900/40 backdrop-blur-lg border border-white/20 shadow-2xl shadow-black/50 text-white">
          <DialogHeader>
            <DialogTitle className="sr-only">دليل المستخدم الجديد</DialogTitle>
            <div className="space-y-6 text-right">
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-green-400 mb-2">🎉 مبروك! 🎉</p>
                <p className="text-base text-white/90">لقد أضفت أول صورة لك بنجاح</p>
              </div>
              <DialogDescription className="text-gray-200">
                <p className="text-lg font-bold text-center text-white/90 mb-4 border-b border-white/20 pb-3">
                  يمكنك إجراء التعديلات من خلال لمس الصورة
                </p>
                <ul className="space-y-4 pr-0">
                  <li className="flex justify-end items-center gap-2">
                    <span>إضافة تعليق / اضافتها للألبوم</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </li>
                  <li className="flex justify-end items-center gap-2">
                    <span>سحب الصورة وتحريكها</span>
                    <span className="text-2xl text-white -mt-1">⋮⋮</span>
                  </li>
                  <li className="flex justify-end items-center gap-2">
                    <span>حذف الصورة</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </li>
                </ul>
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-center mt-6">
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="checkbox"
                  id="dontShowAgain"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="dontShowAgain" className="text-sm text-gray-300 hover:cursor-pointer">
                  لا تظهر لي مرة أخرى
                </label>
              </div>
              <Button 
                type="button" 
                onClick={handleTutorialClose}
                className="bg-red-800 hover:bg-red-900 text-white px-8 py-2 text-lg transition-colors w-full max-w-xs"
              >
                فهمت، شكراً لك
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoGrid;
