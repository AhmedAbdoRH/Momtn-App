import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Modal,
  Image,
  Easing,
} from 'react-native';
import PhotoCard, { Photo, Comment, User } from './PhotoCard';
import { useToast } from '../src/providers/ToastProvider';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../src/services/supabase';
import { NotificationsService } from '../src/services/notifications';
import HorizontalLoader from '../src/components/ui/HorizontalLoader';

interface PhotoGridProps {
  closeSidebar?: () => void;
  selectedGroupId?: string | null;
  onPhotoAdded?: () => void;
  currentUserId: string;
  currentUser?: User;
  embedded?: boolean;
  navigation?: any;
  initialHashtag?: string | null;
  initialPhotoId?: string | null;
  initialCommentId?: string | null;
  initialParentCommentId?: string | null;
  onScrollRequest?: (y: number) => void;
}

export interface PhotoGridHandle {
  loadMore: () => void;
  refresh: () => void;
}

const PhotoGrid = forwardRef<PhotoGridHandle, PhotoGridProps>((
  {
    selectedGroupId,
    currentUserId,
    currentUser,
    embedded = false,
    initialHashtag = null,
    initialPhotoId = null,
    initialCommentId = null,
    initialParentCommentId = null,
    onScrollRequest,
  },
  ref
) => {
  const { showToast } = useToast();
  const photoPositions = useRef<Record<string, number>>({});
  // Photo management state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPhotosLoadedOnce, setHasPhotosLoadedOnce] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const isFetchingMoreRef = useRef(false);
  const PAGE_SIZE = 10;

  // Filtering state
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(initialHashtag);

  // Update selectedHashtag when initialHashtag changes
  useEffect(() => {
    if (initialHashtag !== undefined) {
      setSelectedHashtag(initialHashtag);
    }
  }, [initialHashtag]);
  const [allHashtags, setAllHashtags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'likes'>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Tutorial state
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    loadMore: () => {
      fetchPhotos(true);
    },
    refresh: () => {
      handleRefresh();
    },
  }));

  // Scroll to initial photo
  useEffect(() => {
    if (initialPhotoId && filteredPhotos.length > 0 && onScrollRequest) {
      // Check if we have the position
      const checkPosition = () => {
        const y = photoPositions.current[initialPhotoId];
        if (y !== undefined) {
          console.log('Scrolling to photo:', initialPhotoId, 'at y:', y);
          onScrollRequest(y);
        } else {
          // Retry shortly if layout hasn't happened yet
          setTimeout(checkPosition, 100);
        }
      };
      // Wait a bit for layout
      setTimeout(checkPosition, 100);
    }
  }, [initialPhotoId, filteredPhotos, onScrollRequest]);

  // User display name
  const userDisplayName =
    currentUser?.full_name ||
    currentUser?.email?.split('@')[0] ||
    'مستخدم';

  const fetchPhotos = useCallback(async (loadMore = false): Promise<void> => {
    if (!currentUserId) return;

    if (loadMore) {
      if (!hasMoreRef.current || isFetchingMoreRef.current) return;
      setIsFetchingMore(true);
      isFetchingMoreRef.current = true;
    } else {
      setLoading(true);
      setPage(0);
      pageRef.current = 0;
      setHasMore(true);
      hasMoreRef.current = true;
    }

    try {
      const currentPage = loadMore ? pageRef.current + 1 : 0;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('photos').select('*', { count: 'exact' });

      // Filtering by group or user
      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId);
      } else {
        query = query.is('group_id', null).eq('user_id', currentUserId);
      }

      // Filtering by hashtag if selected
      if (selectedHashtag) {
        query = query.contains('hashtags', [selectedHashtag]);
      }

      // Sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'likes':
          query = query.order('likes', { ascending: false }).order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const { data: photosData, error, count } = await query.range(from, to);

      if (error) throw error;

      if (!photosData || photosData.length === 0) {
        if (!loadMore) {
          setPhotos([]);
          setHasPhotosLoadedOnce(true);
        }
        setHasMore(false);
        hasMoreRef.current = false;
        setLoading(false);
        setIsFetchingMore(false);
        isFetchingMoreRef.current = false;
        return;
      }

      // Check if there are more photos
      const more = count !== null ? from + photosData.length < count : photosData.length === PAGE_SIZE;
      setHasMore(more);
      hasMoreRef.current = more;
      if (count !== null) setTotalCount(count);

      // Fetch users
      const userIds = [...new Set(photosData.map((p) => p.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);

      const usersMap = new Map(usersData?.map((u) => [u.id, u]));

      // Fetch comments
      const photoIds = photosData.map((p) => p.id);
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .in('photo_id', photoIds)
        .order('created_at', { ascending: false });

      // Get comment users
      const commentUserIds = [
        ...new Set(commentsData?.map((c) => c.user_id) || []),
      ];
      const { data: commentUsersData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', commentUserIds);

      const commentUsersMap = new Map(
        commentUsersData?.map((u) => [u.id, u])
      );

      // Group comments by photo
      const commentsMap = new Map<string, Comment[]>();
      commentsData?.forEach((c) => {
        const userData = commentUsersMap.get(c.user_id);
        const comment: Comment = {
          id: c.id,
          photo_id: c.photo_id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || c.created_at || new Date().toISOString(),
          likes: c.likes || 0,
          liked_by: c.liked_by || '',
          user: {
            email: userData?.email || '',
            full_name: userData?.full_name ?? null,
          },
        };
        const existing = commentsMap.get(c.photo_id) || [];
        existing.push(comment);
        commentsMap.set(c.photo_id, existing);
      });

      // Map photos
      const mappedPhotos: Photo[] = photosData.map((p) => {
        const userData = usersMap.get(p.user_id);
        return {
          id: p.id,
          imageUrl: p.image_url,
          image_url: p.image_url,
          uri: p.image_url,
          content: p.caption,
          caption: p.caption,
          author: userData?.full_name || userData?.email?.split('@')[0],
          timestamp: p.created_at,
          likes: p.likes || 0,
          hashtags: p.hashtags || [],
          ownerId: p.user_id,
          photoOwnerId: p.user_id,
          user_id: p.user_id,
          group_id: p.group_id || null,
          userEmail: userData?.email,
          userDisplayName: userData?.full_name,
          comments: commentsMap.get(p.id) || [],
          users: userData
            ? { email: userData.email, full_name: userData.full_name }
            : undefined,
        };
      });

      if (loadMore) {
        setPhotos((prev) => [...prev, ...mappedPhotos]);
        setPage(currentPage);
        pageRef.current = currentPage;
      } else {
        setPhotos(mappedPhotos);
      }
      setHasPhotosLoadedOnce(true);
    } catch (error) {
      console.error('Error fetching photos:', error);
      showToast({ message: 'لم نتمكن من تحميل الصور، يرجى المحاولة لاحقاً', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
      isFetchingMoreRef.current = false;
    }
  }, [currentUserId, selectedGroupId, selectedHashtag, sortBy]);

  const applyFilters = useCallback(() => {
    setFilteredPhotos(photos);
  }, [photos]);

  // Check tutorial status
  const checkTutorialStatus = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('tutorial_dismissed')
        .eq('id', currentUserId)
        .single();
      setTutorialDismissed(data?.tutorial_dismissed || false);
    } catch (error) {
      console.error('Error checking tutorial:', error);
    }
  }, [currentUserId]);

  // Load photos
  useEffect(() => {
    if (currentUserId) {
      checkTutorialStatus();
      fetchPhotos();
    } else {
      setLoading(false);
    }
  }, [currentUserId, selectedGroupId, checkTutorialStatus, fetchPhotos]);

  // Apply filters when photos or filter changes
  useEffect(() => {
    applyFilters();
  }, [photos, selectedHashtag, sortBy, applyFilters]);

  // Extract hashtags
  useEffect(() => {
    const tags = new Set<string>();
    photos.forEach((photo) => {
      photo.hashtags?.forEach((tag) => {
        if (tag?.trim()) tags.add(tag.trim());
      });
    });
    setAllHashtags(tags);
  }, [photos]);

  // Animate when photos load
  useEffect(() => {
    if (hasPhotosLoadedOnce && photos.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [hasPhotosLoadedOnce, photos.length, fadeAnim]);

  // Show tutorial for first photo
  useEffect(() => {
    if (
      hasPhotosLoadedOnce &&
      photos.length === 1 &&
      !tutorialDismissed &&
      !selectedGroupId
    ) {
      setTimeout(() => setShowFirstTimeModal(true), 500);
    }
  }, [hasPhotosLoadedOnce, photos.length, tutorialDismissed, selectedGroupId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPhotos();
  };

  const handleLike = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const newLikes = photo.likes + 1;

    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, likes: newLikes } : p))
    );

    try {
      await supabase.from('photos').update({ likes: newLikes }).eq('id', photoId);
      try {
        const updatedPhoto = photos.find((p) => p.id === photoId);
        if (
          updatedPhoto &&
          updatedPhoto.user_id &&
          updatedPhoto.user_id !== currentUserId
        ) {
          const notificationData: any = {
            user_id: updatedPhoto.user_id,
            type: 'like' as const,
            title: 'إعجاب جديد',
            body: `أعجب ${userDisplayName} بصورتك`,
            sender_id: currentUserId,
            sender_name: userDisplayName,
            data: { photo_id: photoId },
          };

          if (updatedPhoto.group_id) {
            notificationData.group_id = updatedPhoto.group_id;
          }

          await NotificationsService.saveNotification(notificationData);
        }
      } catch (notifyError) {
        console.warn('Could not send like photo notification:', notifyError);
      }
    } catch (error) {
      console.error('Error liking:', error);
      fetchPhotos();
    }
  };

  const handleDelete = (photoId: string) => {
    Alert.alert('حذف الصورة', 'هل أنت متأكد من حذف هذه الصورة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('photos').delete().eq('id', photoId);
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            showToast({ message: 'تم حذف الصورة بنجاح', type: 'success' });
          } catch (error) {
            showToast({ message: 'حدث خطأ أثناء الحذف', type: 'error' });
          }
        },
      },
    ]);
  };

  const handleUpdateCaption = async (
    photoId: string,
    caption: string,
    hashtags: string[]
  ) => {
    try {
      await supabase
        .from('photos')
        .update({ caption, hashtags })
        .eq('id', photoId);

      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, caption, hashtags } : p))
      );
    } catch (error) {
      showToast({ message: 'حدث خطأ أثناء التحديث', type: 'error' });
    }
  };

  const handleAddComment = async (photoId: string, content: string) => {
    if (!currentUserId || !content.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const rawContent = content.trim();
    const tempComment: Comment = {
      id: tempId,
      photo_id: photoId,
      user_id: currentUserId,
      content: rawContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      likes: 0,
      liked_by: '',
      user: {
        email: currentUser?.email || '',
        full_name: userDisplayName,
      },
    };

    // Optimistic update
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? { ...p, comments: [tempComment, ...(p.comments || [])] }
          : p
      )
    );

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          photo_id: photoId,
          user_id: currentUserId,
          content: rawContent,
        })
        .select()
        .single();

      if (error) throw error;

      // Update with real comment
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? {
              ...p,
              comments: (p.comments || []).map((c) =>
                c.id === tempId ? { ...tempComment, id: data.id } : c
              ),
            }
            : p
        )
      );

      // إرسال إشعارات
      try {
        const photo = photos.find(p => p.id === photoId);
        if (photo && photo.group_id) {
          await NotificationsService.notifyGroupMembers(
            photo.group_id!,
            currentUserId,
            userDisplayName,
            'comment',
            'تعليق جديد',
            `علق ${userDisplayName} على صورة في المجموعة`,
            { photo_id: photoId, comment_id: data.id }
          );
        } else if (photo && photo.user_id && photo.user_id !== currentUserId) {
          await NotificationsService.saveNotification({
            user_id: photo.user_id,
            type: 'comment',
            title: 'تعليق جديد',
            body: `علق ${userDisplayName} على صورتك`,
            sender_id: currentUserId,
            sender_name: userDisplayName,
            data: { photo_id: photoId, comment_id: data.id }
          });
        }

        if (rawContent.startsWith('@reply|')) {
          const parts = rawContent.split('|');
          if (parts.length >= 4) {
            const parentCommentId = parts[1];
            try {
              const { data: parentComment } = await supabase
                .from('comments')
                .select('id, user_id, photo_id')
                .eq('id', parentCommentId)
                .single();

              if (
                parentComment &&
                parentComment.user_id &&
                parentComment.user_id !== currentUserId
              ) {
                await NotificationsService.saveNotification({
                  user_id: parentComment.user_id,
                  type: 'comment',
                  title: 'رد جديد على تعليقك',
                  body: `${userDisplayName} رد على تعليقك`,
                  sender_id: currentUserId,
                  sender_name: userDisplayName,
                  data: {
                    photo_id: photoId,
                    comment_id: data.id,
                    parent_comment_id: parentComment.id,
                  },
                });
              }
            } catch (replyNotifyError) {
              console.warn('Could not send reply notification:', replyNotifyError);
            }
          }
        }
      } catch (notifyError) {
        console.warn('Could not send comment notification:', notifyError);
      }
    } catch (error) {
      // Revert on error
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, comments: (p.comments || []).filter((c) => c.id !== tempId) }
            : p
        )
      );
      showToast({ message: 'حدث خطأ أثناء إضافة التعليق', type: 'error' });
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const { data: comment } = await supabase
        .from('comments')
        .select('likes, liked_by, user_id, content')
        .eq('id', commentId)
        .single();

      const likes = comment?.likes || 0;
      const likedBy = comment?.liked_by?.split(',').filter(Boolean) || [];
      const hasLiked = likedBy.includes(currentUserId);

      const newLikes = hasLiked ? Math.max(0, likes - 1) : likes + 1;
      const newLikedBy = hasLiked
        ? likedBy.filter((id) => id !== currentUserId).join(',')
        : [...likedBy, currentUserId].join(',');

      await supabase
        .from('comments')
        .update({ likes: newLikes, liked_by: newLikedBy })
        .eq('id', commentId);

      // إرسال إشعار لصاحب التعليق إذا لم يكن هو من قام بالإعجاب
      if (!hasLiked && comment && comment.user_id !== currentUserId) {
        try {
          await NotificationsService.saveNotification({
            user_id: comment.user_id,
            type: 'like',
            title: 'إعجاب جديد',
            body: `أعجب ${userDisplayName} بتعليقك: ${comment.content.substring(0, 30)}${comment.content.length > 30 ? '...' : ''}`,
            sender_id: currentUserId,
            sender_name: userDisplayName,
            data: { comment_id: commentId }
          });
        } catch (notifyError) {
          console.warn('Could not send like notification:', notifyError);
        }
      }

      // Update local state
      setPhotos((prev) =>
        prev.map((p) => ({
          ...p,
          comments: p.comments?.map((c) =>
            c.id === commentId
              ? { ...c, likes: newLikes, liked_by: newLikedBy }
              : c
          ),
        }))
      );
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await supabase.from('comments').delete().eq('id', commentId);
      setPhotos((prev) =>
        prev.map((p) => ({
          ...p,
          comments: p.comments?.filter((c) => c.id !== commentId),
        }))
      );
    } catch (error) {
      showToast({ message: 'حدث خطأ أثناء حذف التعليق', type: 'error' });
    }
  };

  const handleTutorialClose = async () => {
    setShowFirstTimeModal(false);
    if (dontShowAgain && currentUserId) {
      try {
        await supabase
          .from('users')
          .update({ tutorial_dismissed: true })
          .eq('id', currentUserId);
        setTutorialDismissed(true);
      } catch (error) {
        console.error('Error saving tutorial status:', error);
      }
    }
  };

  // Render filter bar
  const renderFilterBar = () => (
    <View style={styles.filterBarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBarContent}
      >
        {/* Sort Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowSortDropdown(true)}
        >
          <Icon name="funnel-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.filterButtonText}>
            {sortBy === 'newest' ? 'الأحدث' : sortBy === 'oldest' ? 'الأقدم' : 'الأكثر إعجاباً'}
          </Text>
          <Icon name="chevron-down" size={14} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        {/* All Button */}
        <TouchableOpacity
          style={[styles.filterButton, !selectedHashtag && styles.filterButtonActive]}
          onPress={() => setSelectedHashtag(null)}
        >
          <Text style={[styles.filterButtonText, !selectedHashtag && styles.filterButtonTextActive]}>
            الكل {totalCount !== null ? `(${totalCount})` : ''}
          </Text>
        </TouchableOpacity>

        {/* Hashtag Buttons */}
        {Array.from(allHashtags).map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.filterButton, selectedHashtag === tag && styles.filterButtonActive]}
            onPress={() => setSelectedHashtag(selectedHashtag === tag ? null : tag)}
          >
            <Text style={[styles.filterButtonText, selectedHashtag === tag && styles.filterButtonTextActive]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render sort dropdown
  const renderSortDropdown = () => (
    <Modal visible={showSortDropdown} transparent animationType="fade">
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowSortDropdown(false)}
      >
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownTitle}>ترتيب حسب</Text>
          {[
            { key: 'newest', label: 'الأحدث', icon: 'time-outline' },
            { key: 'oldest', label: 'الأقدم', icon: 'hourglass-outline' },
            { key: 'likes', label: 'الأكثر إعجاباً', icon: 'heart-outline' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.dropdownOption, sortBy === option.key && styles.dropdownOptionActive]}
              onPress={() => {
                setSortBy(option.key as any);
                setShowSortDropdown(false);
              }}
            >
              <Icon name={option.icon as any} size={18} color={sortBy === option.key ? '#ea384c' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.dropdownOptionText, sortBy === option.key && styles.dropdownOptionTextActive]}>
                {option.label}
              </Text>
              {sortBy === option.key && <Icon name="checkmark" size={18} color="#ea384c" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require('../assets/Logo.png')}
        style={styles.emptyStateImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyStateTitle}>
        {selectedHashtag ? `لا توجد صور في "${selectedHashtag}"` : 'لا توجد صور بعد'}
      </Text>
      <Text style={styles.emptyStateText}>
        {selectedHashtag
          ? 'جرب ألبوم آخر أو أزل التصفية'
          : 'ابدأ بإضافة أول لحظة امتنان لك'}
      </Text>
      {selectedHashtag && (
        <TouchableOpacity style={styles.clearFilterButton} onPress={() => setSelectedHashtag(null)}>
          <Text style={styles.clearFilterButtonText}>إزالة التصفية</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render tutorial modal
  const renderTutorialModal = () => (
    <Modal visible={showFirstTimeModal} transparent animationType="fade">
      <View style={styles.tutorialOverlay}>
        <LinearGradient
          colors={['rgba(45,31,61,0.95)', 'rgba(26,31,44,0.95)']}
          style={styles.tutorialContent}
        >
          <Text style={styles.tutorialEmoji}>🎉</Text>
          <Text style={styles.tutorialTitle}>مبروك!</Text>
          <Text style={styles.tutorialSubtitle}>لقد أضفت أول صورة لك بنجاح</Text>

          <View style={styles.tutorialTips}>
            <Text style={styles.tutorialTipsTitle}>يمكنك من خلال لمس الصورة:</Text>
            <View style={styles.tutorialTip}>
              <Icon name="heart-outline" size={20} color="#ea384c" />
              <Text style={styles.tutorialTipText}>الإعجاب بالصورة</Text>
            </View>
            <View style={styles.tutorialTip}>
              <Icon name="chatbubble-outline" size={20} color="#3b82f6" />
              <Text style={styles.tutorialTipText}>إضافة تعليق</Text>
            </View>
            <View style={styles.tutorialTip}>
              <Icon name="ellipsis-vertical" size={20} color="#fff" />
              <Text style={styles.tutorialTipText}>تعديل أو حذف الصورة</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.tutorialCheckbox}
            onPress={() => setDontShowAgain(!dontShowAgain)}
          >
            <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
              {dontShowAgain && <Icon name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.tutorialCheckboxText}>لا تظهر لي مرة أخرى</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tutorialButton} onPress={handleTutorialClose}>
            <Text style={styles.tutorialButtonText}>فهمت، شكراً لك</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <HorizontalLoader color="#ea384c" width={200} />
      </View>
    );
  }

  // Main render
  const renderItem = ({ item: photo }: { item: Photo }) => (
    <View
      onLayout={(event) => {
        photoPositions.current[photo.id] = event.nativeEvent.layout.y;
      }}
    >
      <PhotoCard
        photo={photo}
        onLike={() => handleLike(photo.id)}
        onDelete={() => handleDelete(photo.id)}
        onUpdateCaption={(caption, hashtags) =>
          handleUpdateCaption(photo.id, caption, hashtags)
        }
        onAddComment={(content) => handleAddComment(photo.id, content)}
        onLikeComment={handleLikeComment}
        onDeleteComment={handleDeleteComment}
        currentUserId={currentUserId}
        currentUser={currentUser}
        isGroupPhoto={!!selectedGroupId}
        selectedGroupId={selectedGroupId}
        autoOpenComments={initialPhotoId === photo.id && !!initialCommentId}
        initialCommentId={initialPhotoId === photo.id ? initialCommentId : null}
        initialParentCommentId={initialPhotoId === photo.id ? initialParentCommentId : null}
      />
    </View>
  );

  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <HorizontalLoader color="#ea384c" width={150} />
        </View>
      );
    }

    if (!hasMore && photos.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <Text style={styles.footerLoaderText}>لقد وصلت إلى نهاية المنشورات</Text>
        </View>
      );
    }

    return <View style={{ height: 40 }} />;
  };

  const renderHeader = () => (
    <View>
      {photos.length > 0 && renderFilterBar()}
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        {embedded ? (
          <View style={styles.contentContainer}>
            {renderHeader()}
            {filteredPhotos.length > 0 ? (
              <>
                <Animated.View style={[styles.photosContainer, { opacity: fadeAnim }]}>
                  {filteredPhotos.map((photo) => (
                    <View key={photo.id}>{renderItem({ item: photo })}</View>
                  ))}
                </Animated.View>
                {renderFooter()}
              </>
            ) : renderEmptyState()}
          </View>
        ) : (
          <FlatList
            data={filteredPhotos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            onEndReached={() => fetchPhotos(true)}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#ea384c"
                colors={['#ea384c']}
              />
            }
            contentContainerStyle={styles.flatListContent}
          />
        )}
      </View>

      {renderSortDropdown()}
      {renderTutorialModal()}
    </>
  );
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 12,
  },
  horizontalLoaderTrack: {
    width: 300,
    height: 3,
    backgroundColor: 'transparent',
    borderRadius: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  horizontalLoaderBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerLoaderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginLeft: 10,
  },
  // Filter Bar
  filterBarContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(234,56,76,0.2)',
    borderColor: '#ea384c',
  },
  filterButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  // Photos Container
  photosContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateImage: {
    width: 80,
    height: 80,
    opacity: 0.3,
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  clearFilterButton: {
    backgroundColor: '#ea384c',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  clearFilterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Sort Dropdown
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContent: {
    backgroundColor: 'rgba(30,20,25,0.98)',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdownTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  dropdownOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(234,56,76,0.15)',
  },
  dropdownOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
    marginRight: 12,
  },
  dropdownOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Tutorial Modal
  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tutorialContent: {
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tutorialEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  tutorialTitle: {
    color: '#4ade80',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  tutorialSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  tutorialTips: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  tutorialTipsTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 12,
  },
  tutorialTip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tutorialTipText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 12,
    flex: 1,
    textAlign: 'right',
  },
  tutorialCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ea384c',
    borderColor: '#ea384c',
  },
  tutorialCheckboxText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  tutorialButton: {
    backgroundColor: '#ea384c',
    borderRadius: 25,
    paddingHorizontal: 40,
    paddingVertical: 14,
    width: '100%',
  },
  tutorialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default PhotoGrid;
