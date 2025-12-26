import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import PhotoCard, { Photo, Comment, User } from './PhotoCard';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../src/services/supabase';

interface PhotoGridProps {
  closeSidebar?: () => void;
  selectedGroupId?: string | null;
  onPhotoAdded?: () => void;
  currentUserId: string;
  currentUser?: User;
  embedded?: boolean;
  navigation?: any;
  initialHashtag?: string | null;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  selectedGroupId,
  currentUserId,
  currentUser,
  embedded = false,
  initialHashtag = null,
}) => {
  // Photo management state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPhotosLoadedOnce, setHasPhotosLoadedOnce] = useState(false);

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

  // User display name
  const userDisplayName =
    currentUser?.full_name ||
    currentUser?.email?.split('@')[0] ||
    'مستخدم';

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
  }, [currentUserId, selectedGroupId]);

  // Apply filters when photos or filter changes
  useEffect(() => {
    applyFilters();
  }, [photos, selectedHashtag, sortBy]);

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
  }, [hasPhotosLoadedOnce, photos.length]);

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

  const fetchPhotos = async (): Promise<void> => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      let query = supabase.from('photos').select('*');

      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId);
      } else {
        query = query.is('group_id', null).eq('user_id', currentUserId);
      }

      const { data: photosData, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) throw error;

      if (!photosData || photosData.length === 0) {
        setPhotos([]);
        setHasPhotosLoadedOnce(true);
        setLoading(false);
        return;
      }

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
          userEmail: userData?.email,
          userDisplayName: userData?.full_name,
          comments: commentsMap.get(p.id) || [],
          users: userData
            ? { email: userData.email, full_name: userData.full_name }
            : undefined,
        };
      });

      setPhotos(mappedPhotos);
      setHasPhotosLoadedOnce(true);
    } catch (error) {
      console.error('Error fetching photos:', error);
      Alert.alert('خطأ', 'لم نتمكن من تحميل الصور');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...photos];

    if (selectedHashtag) {
      filtered = filtered.filter((p) => p.hashtags?.includes(selectedHashtag));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (
            new Date(b.timestamp || '').getTime() -
            new Date(a.timestamp || '').getTime()
          );
        case 'oldest':
          return (
            new Date(a.timestamp || '').getTime() -
            new Date(b.timestamp || '').getTime()
          );
        case 'likes':
          return b.likes - a.likes;
        default:
          return 0;
      }
    });

    setFilteredPhotos(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPhotos();
  };

  const handleLike = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const newLikes = photo.likes + 1;

    // Optimistic update
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, likes: newLikes } : p))
    );

    try {
      await supabase.from('photos').update({ likes: newLikes }).eq('id', photoId);
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
          } catch (error) {
            Alert.alert('خطأ', 'حدث خطأ أثناء الحذف');
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
      Alert.alert('خطأ', 'حدث خطأ أثناء التحديث');
    }
  };

  const handleAddComment = async (photoId: string, content: string) => {
    if (!currentUserId || !content.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const tempComment: Comment = {
      id: tempId,
      photo_id: photoId,
      user_id: currentUserId,
      content: content.trim(),
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
          content: content.trim(),
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
    } catch (error) {
      // Revert on error
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, comments: (p.comments || []).filter((c) => c.id !== tempId) }
            : p
        )
      );
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة التعليق');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const { data: comment } = await supabase
        .from('comments')
        .select('likes, liked_by')
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
      Alert.alert('خطأ', 'حدث خطأ أثناء حذف التعليق');
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
            الكل ({photos.length})
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
        <ActivityIndicator size="large" color="#ea384c" />
        <Text style={styles.loadingText}>جاري تحميل الصور...</Text>
      </View>
    );
  }

  // Main render
  const renderPhotos = () => (
    <Animated.View style={[styles.photosContainer, { opacity: fadeAnim }]}>
      {filteredPhotos.map((photo) => (
        <PhotoCard
          key={photo.id}
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
        />
      ))}
    </Animated.View>
  );

  return (
    <>
      <View style={styles.container}>
        {photos.length > 0 && renderFilterBar()}

        {embedded ? (
          <View style={styles.contentContainer}>
            {filteredPhotos.length > 0 ? renderPhotos() : renderEmptyState()}
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#ea384c"
                colors={['#ea384c']}
              />
            }
          >
            {filteredPhotos.length > 0 ? renderPhotos() : renderEmptyState()}
          </ScrollView>
        )}
      </View>

      {renderSortDropdown()}
      {renderTutorialModal()}
    </>
  );
};


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
    paddingBottom: 20,
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
