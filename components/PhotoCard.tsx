import React, { useState, useEffect } from 'react';
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
import { Spacing, BorderRadius } from '../theme';

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
}) => {
  // States
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(photo.likes || 0);
  const [showControls, setShowControls] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [caption, setCaption] = useState(photo.caption || photo.content || '');
  const hashtags = photo.hashtags || [];
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>(photo.comments || []);
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [imageHeight, setImageHeight] = useState(200);
  
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
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة التعليق');
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

  // Handle save caption
  const handleSaveCaption = async () => {
    if (onUpdateCaption) {
      await onUpdateCaption(caption, hashtags);
    }
    setShowEditModal(false);
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

  return (
    <View style={styles.container}>
      {/* Main Card */}
      <TouchableOpacity 
        activeOpacity={0.95}
        onPress={() => setShowControls(!showControls)}
        style={styles.card}
      >
        {/* Image */}
        <View style={[styles.imageContainer, { height: imageHeight }]}>
          {imageSource ? (
            <Image
              source={{ uri: imageSource }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Icon name="image-outline" size={50} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          
          {/* Gradient Overlay */}
          {showControls && (
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

        {/* Like Button */}
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

        {/* Comments Button */}
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

        {/* Caption & Owner Info */}
        {(caption || photo.content) && showControls && (
          <View style={styles.captionContainer}>
            <View style={styles.captionInner}>
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerName}>{ownerName}</Text>
              </View>
              <Text style={styles.captionText} numberOfLines={3}>
                {caption || photo.content}
              </Text>
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
          {/* Add Comment Input */}
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

          {/* Comments List */}
          {comments.length > 0 ? (
            <ScrollView style={styles.commentsList} nestedScrollEnabled>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
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
                      
                      {comment.user_id === currentUserId && (
                        <TouchableOpacity
                          style={styles.commentDeleteButton}
                          onPress={() => handleDeleteComment(comment.id)}
                        >
                          <Icon name="trash-outline" size={14} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
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
              <Text style={styles.optionText}>تعديل الوصف</Text>
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
              <Text style={styles.editModalTitle}>تعديل الوصف</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
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
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCaption}
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
});

export default PhotoCard;
