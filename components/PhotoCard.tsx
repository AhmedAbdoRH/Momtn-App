import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../src/services/supabase';
import { Spacing, BorderRadius } from '../theme';
import { useToast } from '../src/providers/ToastProvider';

const { width: screenWidth } = Dimensions.get('window');

// Interfaces
export interface CommentUser {
  email: string;
  full_name: string | null;
}

export interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  likes?: number;
  liked_by?: string;
  user: CommentUser;
  isReply?: boolean;
  parentCommentId?: string;
  replyAuthorName?: string | null;
}

export interface Photo {
  id: string;
  imageUrl?: string;
  uri?: string;
  image_url?: string;
  content?: string | null;
  caption?: string | null;
  author?: string;
  timestamp?: string;
  likes: number;
  hashtags?: string[];
  ownerId?: string;
  photoOwnerId?: string;
  user_id?: string;
  group_id?: string | null;
  userEmail?: string;
  userDisplayName?: string | null;
  comments?: Comment[];
  users?: {
    email: string;
    full_name: string | null;
  };
}

export interface User {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
}

interface PhotoCardProps {
  photo: Photo;
  onLike: () => void;
  onDelete: () => void;
  onUpdateCaption?: (caption: string, hashtags: string[]) => Promise<void>;
  onAddComment?: (content: string) => Promise<void>;
  onLikeComment?: (commentId: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  currentUserId: string;
  currentUser?: User;
  isGroupPhoto?: boolean;
  selectedGroupId?: string | null;
  dragHandleProps?: any;
  onPress?: () => void;
  autoOpenComments?: boolean;
  initialCommentId?: string | null;
  initialParentCommentId?: string | null;
}

const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  onLike,
  onDelete,
  onUpdateCaption,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  currentUserId,
  autoOpenComments,
  initialCommentId,
  initialParentCommentId,
}) => {
  const { showToast } = useToast();
  // States
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(photo.likes || 0);
  const [showControls, setShowControls] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditingAlbumsOnly, setIsEditingAlbumsOnly] = useState(false);
  const [caption, setCaption] = useState(photo.caption || photo.content || '');
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set(photo.hashtags || []));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAlbumInput, setShowAlbumInput] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const hashtags = photo.hashtags || [];
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>(photo.comments || []);
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToAuthorName, setReplyToAuthorName] = useState<string | null>(null);
  const [imageHeight, setImageHeight] = useState(200);
  const commentsScrollRef = useRef<ScrollView | null>(null);
  const editModalScrollRef = useRef<ScrollView | null>(null);
  const albumSectionY = useRef<number>(0);
  const commentLayoutPositions = useRef<Record<string, number>>({});
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [highlightedReplyId, setHighlightedReplyId] = useState<string | null>(null);
  
  // Animations
  const heartScale = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(0))[0];

  // Get image source
  const imageSource = photo.imageUrl || photo.uri || photo.image_url;
  
  // Get owner info
  const photoOwnerId = photo.photoOwnerId || photo.ownerId || photo.user_id || '';
  const ownerName = photo.userDisplayName || photo.users?.full_name || 
                    photo.users?.email?.split('@')[0] || photo.author || 'مستخدم';

  // Update comments when prop changes
  useEffect(() => {
    setComments(photo.comments || []);
  }, [photo.comments]);

  // Calculate image height based on aspect ratio
  useEffect(() => {
    if (imageSource) {
      Image.getSize(
        imageSource,
        (width, height) => {
          const aspectRatio = height / width;
          const calculatedHeight = (screenWidth - 32) * aspectRatio;
          setImageHeight(Math.min(calculatedHeight, 500));
        },
        () => setImageHeight(200)
      );
    }
  }, [imageSource]);

  useEffect(() => {
    if (autoOpenComments && comments.length > 0) {
      setShowComments(true);
    }
  }, [autoOpenComments, comments.length]);

  // Fetch album suggestions
  const fetchAlbumSuggestions = async () => {
    if (!currentUserId) return;

    try {
      let query = supabase.from('photos').select('hashtags');

      if (photo.group_id) {
        query = query.eq('group_id', photo.group_id);
      } else {
        query = query.eq('user_id', currentUserId).is('group_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tags = new Set<string>();
      data?.forEach((p: any) => {
        if (p.hashtags && Array.isArray(p.hashtags)) {
          p.hashtags.forEach((tag: string) => {
            if (tag?.trim()) tags.add(tag.trim());
          });
        }
      });

      setSuggestions(Array.from(tags).sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  useEffect(() => {
    if (showEditModal) {
      setCaption(photo.caption || photo.content || '');
      setSelectedAlbums(new Set(photo.hashtags || []));
      fetchAlbumSuggestions();
      
      // If we are specifically editing albums, scroll to that section
      if (isEditingAlbumsOnly) {
        setTimeout(() => {
          if (editModalScrollRef.current && albumSectionY.current > 0) {
            editModalScrollRef.current.scrollTo({
              y: albumSectionY.current,
              animated: true
            });
          }
        }, 500); // Small delay to allow layout
      }
    } else {
      // Reset flags when modal closes
      setIsEditingAlbumsOnly(false);
    }
  }, [showEditModal]);

  // Album selection helpers
  const toggleAlbum = (album: string) => {
    setSelectedAlbums((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(album)) {
        newSet.delete(album);
      } else {
        newSet.add(album);
      }
      return newSet;
    });
  };

  const addNewAlbum = () => {
    const name = newAlbumName.trim();
    if (!name) {
      showToast({ message: 'يرجى إدخال اسم الألبوم', type: 'error' });
      return;
    }

    setSelectedAlbums((prev) => new Set(prev).add(name));
    if (!suggestions.includes(name)) {
      setSuggestions((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
    }
    setNewAlbumName('');
    setShowAlbumInput(false);
  };

  // Handle like with animation
  const handleLike = () => {
    setIsLiked(true);
    setLikes(prev => prev + 1);
    
    // Heart beat animation
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.4,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse ring animation
    pulseAnim.setValue(0);
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    onLike();
    
    setTimeout(() => setIsLiked(false), 1000);
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !onAddComment) return;
    
    setIsCommentLoading(true);
    try {
      let content = newComment.trim();
      if (replyToCommentId && replyToAuthorName) {
        content = `@reply|${replyToCommentId}|${replyToAuthorName}|${content}`;
      }
      await onAddComment(content);
      setNewComment('');
      setReplyToCommentId(null);
      setReplyToAuthorName(null);
      showToast({ message: 'تم إضافة تعليقك بنجاح', type: 'success' });
    } catch (error: any) {
      showToast({ message: 'فشل إضافة التعليق: ' + error.message, type: 'error' });
    } finally {
      setIsCommentLoading(false);
    }
  };

  // Handle delete comment
  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'حذف التعليق',
      'هل أنت متأكد من حذف هذا التعليق؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            if (onDeleteComment) {
              await onDeleteComment(commentId);
              setComments(prev => prev.filter(c => c.id !== commentId));
            }
          },
        },
      ]
    );
  };

  // Handle update caption
  const handleUpdateCaption = async () => {
    try {
      await onUpdateCaption?.(caption, Array.from(selectedAlbums));
      setShowEditModal(false);
      showToast({ message: 'تم التحديث بنجاح', type: 'success' });
    } catch (error: any) {
      showToast({ message: 'فشل التحديث: ' + error.message, type: 'error' });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} د`;
    if (hours < 24) return `منذ ${hours} س`;
    if (days < 7) return `منذ ${days} ي`;
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Get display name for comment user
  const getDisplayName = (comment: Comment) => {
    return comment.user?.full_name || comment.user?.email?.split('@')[0] || 'مستخدم';
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  const parsedComments: Comment[] = comments.map((comment) => {
    if (comment.content.startsWith('@reply|')) {
      const parts = comment.content.split('|');
      if (parts.length >= 4) {
        const [, parentId, authorName, ...bodyParts] = parts;
        const body = bodyParts.join('|');
        return {
          ...comment,
          isReply: true,
          parentCommentId: parentId,
          replyAuthorName: authorName,
          content: body,
        };
      }
    }
    return {
      ...comment,
      isReply: false,
      parentCommentId: undefined,
      replyAuthorName: undefined,
    };
  });

  const repliesByParent = new Map<string, Comment[]>();
  parsedComments.forEach((comment) => {
    if (comment.isReply && comment.parentCommentId) {
      const list = repliesByParent.get(comment.parentCommentId) || [];
      list.push(comment);
      repliesByParent.set(comment.parentCommentId, list);
    }
  });

  const parentComments = parsedComments.filter(
    (comment) => !comment.isReply || !comment.parentCommentId
  );

  useEffect(() => {
    if (!autoOpenComments) {
      return;
    }

    const targetId = initialCommentId;
    if (!targetId) {
      return;
    }

    const targetComment = parsedComments.find(c => c.id === targetId);
    if (!targetComment) {
      return;
    }

    const parentId = initialParentCommentId || (targetComment.isReply && targetComment.parentCommentId ? targetComment.parentCommentId : targetComment.id);

    setHighlightedCommentId(parentId);
    if (targetComment.isReply && targetComment.id !== parentId) {
      setHighlightedReplyId(targetComment.id);
    } else {
      setHighlightedReplyId(null);
    }

    const timeout = setTimeout(() => {
      const y = commentLayoutPositions.current[parentId];
      if (commentsScrollRef.current && typeof y === 'number') {
        commentsScrollRef.current.scrollTo({ y: Math.max(0, y - 16), animated: true });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [autoOpenComments, initialCommentId, initialParentCommentId, parsedComments]);

  return (
    <View style={styles.container}>
      {/* Main Card */}
      <TouchableOpacity 
        activeOpacity={0.95}
        onPress={() => {
          setShowControls(!showControls);
        }}
        style={styles.card}
      >
        {/* Image / Text Content */}
        <View style={[styles.imageContainer, { height: imageHeight }]}>
          {imageSource && imageSource.trim() !== '' ? (
            <Image
              source={{ uri: imageSource }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
              style={styles.textPostBackground}
            >
              {/* تم إزالة الدائرة الجمالية من اليسار (glassShine) */}
              
              {/* اسم الألبوم والناشر في الأعلى - يظهر عند الضغط فقط */}
              <View style={styles.textPostHeaderInside}>
                 {showControls && hashtags && hashtags.length > 0 && (
                    <View style={[styles.albumBadge, { position: 'absolute', right: 0 }]}>
                       <Text style={styles.albumBadgeText}>{hashtags[0]}</Text>
                    </View>
                 )}
                 
                 {/* اسم الكاتب في المنتصف - يظهر عند الضغط فقط وفقط إذا كان في المساحة المشتركة (group_id موجود) */}
                 {showControls && photo.group_id ? (
                    <View style={styles.authorBadgeCenter}>
                       <Text style={styles.authorNameCenter}>{ownerName}</Text>
                    </View>
                 ) : null}
              </View>

              <Text style={styles.textPostContent} numberOfLines={5}>
                {caption || photo.content}
              </Text>

              {/* الوقت في الأسفل - يظهر فقط عند اللمس */}
              {showControls && (
                <View style={styles.textPostFooter}>
                  <Text style={styles.timestampText}>
                    {photo.timestamp ? formatDate(photo.timestamp) : ''}
                  </Text>
                </View>
              )}
            </LinearGradient>
          )}
          
          {/* Gradient Overlay for images only */}
          {showControls && imageSource && imageSource.trim() !== '' && (
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
              style={styles.gradientOverlay}
            />
          )}
        </View>

        {/* Options Menu Button - Only for owner */}
        {currentUserId === photoOwnerId && showControls && (
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => setShowOptionsMenu(true)}
          >
            <Icon name="ellipsis-vertical" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Like Button - Visible on tap for both images and text posts */}
        {showControls && (
          <View style={styles.likeContainer}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLike}
              activeOpacity={0.8}
            >
              {/* Pulse Ring */}
              {isLiked && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: pulseScale }],
                      opacity: pulseOpacity,
                    },
                  ]}
                />
              )}
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Icon
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isLiked ? '#ea384c' : '#fff'}
                />
              </Animated.View>
            </TouchableOpacity>
            <Text style={styles.likeCount}>{likes}</Text>
          </View>
        )}

        {/* Comments Button - Visible on tap for both images and text posts */}
        {showControls && (
          <TouchableOpacity
            style={styles.commentsButton}
            onPress={() => setShowComments(!showComments)}
          >
            <Icon 
              name={showComments ? 'chatbubble' : 'chatbubble-outline'} 
              size={20} 
              color={showComments ? '#3b82f6' : '#fff'} 
            />
            {comments.length > 0 && (
              <View style={styles.commentsBadge}>
                <Text style={styles.commentsBadgeText}>
                  {comments.length > 9 ? '9+' : comments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Caption & Owner Info - Only for images (text posts show it inside) */}
        {imageSource && imageSource.trim() !== '' && showControls && (
          <View style={styles.captionContainer}>
            <View style={styles.captionInner}>
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerName}>{ownerName}</Text>
              </View>
              {(caption || photo.content) && (
                <Text style={styles.captionText} numberOfLines={3}>
                  {caption || photo.content}
                </Text>
              )}
              {hashtags.length > 0 && (
                <View style={styles.hashtagsContainer}>
                  {hashtags.map((tag, index) => (
                    <Text key={index} style={styles.hashtag}>#{tag}</Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Comments Section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {replyToAuthorName && (
            <View style={styles.replyInfoContainer}>
              <Text style={styles.replyInfoText}>الرد على {replyToAuthorName}</Text>
              <TouchableOpacity
                style={styles.replyCancelButton}
                onPress={() => {
                  setReplyToCommentId(null);
                  setReplyToAuthorName(null);
                }}
              >
                <Icon name="close" size={14} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.addCommentContainer}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || isCommentLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || isCommentLoading}
            >
              {isCommentLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.commentInput}
              placeholder="اكتب تعليقاً..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={newComment}
              onChangeText={setNewComment}
              textAlign="right"
              multiline
            />
          </View>

          {parentComments.length > 0 ? (
            <ScrollView
              style={styles.commentsList}
              nestedScrollEnabled
              ref={commentsScrollRef}
            >
              {parentComments.map((comment) => {
                const replies = repliesByParent.get(comment.id) || [];
                const isHighlightedParent = highlightedCommentId === comment.id;
                return (
                <View
                  key={comment.id}
                  style={[
                    styles.commentItem,
                    isHighlightedParent && styles.highlightedCommentItem,
                  ]}
                  onLayout={event => {
                    commentLayoutPositions.current[comment.id] = event.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>
                        {getDisplayName(comment)}
                      </Text>
                      <Text style={styles.commentTime}>
                        {formatDate(comment.updated_at || comment.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    
                    {/* Comment Actions */}
                    <View style={styles.commentActions}>
                      <TouchableOpacity
                        style={styles.commentLikeButton}
                        onPress={() => onLikeComment?.(comment.id)}
                      >
                        <Icon
                          name={comment.liked_by?.includes(currentUserId) ? 'heart' : 'heart-outline'}
                          size={14}
                          color={comment.liked_by?.includes(currentUserId) ? '#ea384c' : 'rgba(255,255,255,0.5)'}
                        />
                        {(comment.likes || 0) > 0 && (
                          <Text style={styles.commentLikeCount}>{comment.likes}</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.commentReplyButton}
                        onPress={() => {
                          const name = getDisplayName(comment);
                          setReplyToCommentId(comment.id);
                          setReplyToAuthorName(name);
                        }}
                      >
                        <Icon
                          name="return-up-back-outline"
                          size={14}
                          color="rgba(255,255,255,0.6)"
                        />
                        <Text style={styles.commentReplyText}>رد</Text>
                      </TouchableOpacity>
                      
                      {comment.user_id === currentUserId && (
                        <TouchableOpacity
                          style={styles.commentDeleteButton}
                          onPress={() => handleDeleteComment(comment.id)}
                        >
                          <Icon name="trash-outline" size={14} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                      )}
                    </View>
                    {replies.length > 0 && (
                      <View style={styles.repliesContainer}>
                        {replies.map((reply) => (
                          <View
                            key={reply.id}
                            style={[
                              styles.replyItem,
                              highlightedReplyId === reply.id && styles.highlightedReplyItem,
                            ]}
                          >
                            <View style={styles.replyHeader}>
                              <Text style={styles.replyAuthor}>
                                {getDisplayName(reply)}
                              </Text>
                              <Text style={styles.replyTime}>
                                {formatDate(reply.updated_at || reply.created_at)}
                              </Text>
                            </View>
                            <Text style={styles.replyText}>{reply.content}</Text>
                            <View style={styles.replyActions}>
                              <TouchableOpacity
                                style={styles.commentLikeButton}
                                onPress={() => onLikeComment?.(reply.id)}
                              >
                                <Icon
                                  name={reply.liked_by?.includes(currentUserId) ? 'heart' : 'heart-outline'}
                                  size={14}
                                  color={reply.liked_by?.includes(currentUserId) ? '#ea384c' : 'rgba(255,255,255,0.5)'}
                                />
                                {(reply.likes || 0) > 0 && (
                                  <Text style={styles.commentLikeCount}>{reply.likes}</Text>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.commentReplyButton}
                                onPress={() => {
                                  const name = getDisplayName(reply);
                                  setReplyToCommentId(reply.id);
                                  setReplyToAuthorName(name);
                                }}
                              >
                                <Icon
                                  name="return-up-back-outline"
                                  size={14}
                                  color="rgba(255,255,255,0.6)"
                                />
                                <Text style={styles.commentReplyText}>رد</Text>
                              </TouchableOpacity>
                              {reply.user_id === currentUserId && (
                                <TouchableOpacity
                                  style={styles.commentDeleteButton}
                                  onPress={() => handleDeleteComment(reply.id)}
                                >
                                  <Icon name="trash-outline" size={14} color="rgba(255,255,255,0.4)" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ); })}
            </ScrollView>
          ) : (
            <View style={styles.noCommentsContainer}>
              <Icon name="chatbubble-outline" size={40} color="rgba(255,255,255,0.2)" />
              <Text style={styles.noCommentsText}>لا توجد تعليقات بعد</Text>
              <Text style={styles.noCommentsSubtext}>كن أول من يعلق</Text>
            </View>
          )}
        </View>
      )}

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenuContainer}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowEditModal(true);
              }}
            >
              <Icon name="create-outline" size={20} color="#fff" />
              <Text style={styles.optionText}>تعديل المنشور</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, styles.deleteOption]}
              onPress={() => {
                setShowOptionsMenu(false);
                Alert.alert(
                  'حذف الصورة',
                  'هل أنت متأكد من حذف هذه الصورة؟',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'حذف', style: 'destructive', onPress: onDelete },
                  ]
                );
              }}
            >
              <Icon name="trash-outline" size={20} color="#ea384c" />
              <Text style={[styles.optionText, { color: '#ea384c' }]}>حذف</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Caption Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>تعديل المنشور</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              ref={editModalScrollRef}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.inputLabel}>الوصف</Text>
              <TextInput
                style={styles.editCaptionInput}
                placeholder="أضف وصفاً..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={caption}
                onChangeText={setCaption}
                textAlign="right"
                multiline
                numberOfLines={4}
              />
              
              <View 
                style={styles.editAlbumsSection}
                onLayout={(event) => {
                  albumSectionY.current = event.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.sectionTitle}>الألبومات</Text>
                
                <View style={styles.albumChips}>
                  {suggestions.map((album) => (
                    <TouchableOpacity
                      key={album}
                      style={[
                        styles.albumChip,
                        selectedAlbums.has(album) && styles.albumChipSelected,
                      ]}
                      onPress={() => toggleAlbum(album)}
                    >
                      <Text style={[
                        styles.albumChipText,
                        selectedAlbums.has(album) && styles.albumChipTextSelected
                      ]}>
                        {album}
                      </Text>
                      {selectedAlbums.has(album) && (
                        <Icon name="checkmark-circle" size={14} color="#818cf8" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  ))}
                  
                  {!showAlbumInput ? (
                    <TouchableOpacity
                      style={styles.addAlbumButton}
                      onPress={() => setShowAlbumInput(true)}
                    >
                      <Icon name="add-circle-outline" size={18} color="#ea384c" />
                      <Text style={styles.addAlbumButtonText}>ألبوم جديد</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.newAlbumInputContainer}>
                      <TextInput
                        style={styles.newAlbumInput}
                        placeholder="اسم الألبوم..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={newAlbumName}
                        onChangeText={setNewAlbumName}
                        autoFocus
                        textAlign="right"
                      />
                      <TouchableOpacity
                        style={styles.confirmAlbumButton}
                        onPress={addNewAlbum}
                      >
                        <Icon name="checkmark" size={20} color="#66bb6a" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelAlbumButton}
                        onPress={() => {
                          setShowAlbumInput(false);
                          setNewAlbumName('');
                        }}
                      >
                        <Icon name="close" size={20} color="rgba(255,255,255,0.4)" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateCaption}
              >
                <Text style={styles.saveButtonText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  textPostBackground: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    minHeight: 200,
  },
  /* glassShine: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 100,
    transform: [{ rotate: '45deg' }],
  }, */
  textPostHeaderInside: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  textPostContent: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
  },
  textPostFooter: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorBadgeCenter: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  authorNameCenter: {
    color: '#fef08a',
    fontSize: 12,
    fontWeight: '700',
  },
  albumBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  albumBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  editButtonSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerBadgeText: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ownerNameText: {
    color: '#fef08a',
    fontSize: 12,
    fontWeight: '600',
  },
  timestampText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  optionsButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ea384c',
  },
  likeCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commentsButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ea384c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  commentsBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 60,
    left: 10,
    right: 10,
  },
  captionInner: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  ownerBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  ownerName: {
    color: '#fef08a',
    fontSize: 11,
    fontWeight: '600',
  },
  captionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 20,
  },
  hashtagsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  hashtag: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 6,
  },
  // Comments Section
  commentsSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    marginTop: 4,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    maxHeight: 250,
  },
  commentItem: {
    marginBottom: Spacing.sm,
  },
  highlightedCommentItem: {
    backgroundColor: 'rgba(234, 56, 76, 0.15)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(234, 56, 76, 0.3)',
    padding: 2,
  },
  commentContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600',
  },
  commentTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  commentReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    marginLeft: 8,
  },
  commentReplyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginLeft: 4,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  commentLikeCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 4,
  },
  commentDeleteButton: {
    padding: 4,
    marginLeft: 12,
  },
  repliesContainer: {
    marginTop: 8,
    marginRight: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  replyItem: {
    marginBottom: 6,
    paddingLeft: 8,
  },
  highlightedReplyItem: {
    backgroundColor: 'rgba(234, 56, 76, 0.2)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(234, 56, 76, 0.4)',
    padding: 2,
  },
  replyHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyAuthor: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '600',
  },
  replyTime: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
  },
  replyText: {
    color: '#e5e7eb',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  replyInfoContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  replyInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginLeft: 8,
  },
  replyCancelButton: {
    padding: 4,
  },
  noCommentsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noCommentsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 8,
  },
  noCommentsSubtext: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    marginTop: 2,
  },
  // Options Menu Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenuContainer: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    width: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    marginRight: 12,
  },
  deleteOption: {
    marginTop: 4,
  },
  // Edit Modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  editModalContent: {
    backgroundColor: 'rgba(40,20,30,0.95)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editModalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  editModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  editCaptionInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: Spacing.lg,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: '#ea384c',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'right',
  },
  editAlbumsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'right',
  },
  albumChips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  albumChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  albumChipSelected: {
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    borderColor: '#818cf8',
  },
  albumChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  albumChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  addAlbumButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 56, 76, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ea384c',
  },
  addAlbumButtonText: {
    color: '#ea384c',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  newAlbumInputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 36,
  },
  newAlbumInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    paddingVertical: 0,
    height: '100%',
  },
  confirmAlbumButton: {
    padding: 6,
  },
  cancelAlbumButton: {
    padding: 6,
  },
});

export default PhotoCard;
