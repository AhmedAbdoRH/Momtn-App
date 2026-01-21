import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../../theme';
import { useGroupChat, ChatMessage } from '../../hooks/useGroupChat';

interface GroupChatWindowProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  currentUserId: string;
}

const GroupChatWindow: React.FC<GroupChatWindowProps> = ({
  visible,
  onClose,
  groupId,
  groupName,
  currentUserId,
}) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const shouldScrollToEnd = useRef(true);
  const isFirstLoad = useRef(true);
  const inputRef = useRef<TextInput>(null);

  const {
    messages,
    loading,
    error,
    sendMessage,
    toggleLike,
    loadMoreMessages,
    hasMore,
  } = useGroupChat(groupId, currentUserId);

  // إعادة تعيين الحالة عند فتح/إغلاق الشات
  useEffect(() => {
    if (visible) {
      shouldScrollToEnd.current = true;
      isFirstLoad.current = true;
      setReplyingTo(null);
    }
  }, [visible]);

  // التمرير للأسفل عند تغيير حجم المحتوى
  const handleContentSizeChange = () => {
    // في حالة inverted، الأسفل هو البداية (0)
  };

  // عند وصول رسالة جديدة، التمرير التلقائي يعمل طبيعياً في inverted
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[0]; // الرسالة الأحدث هي الأولى في المصفوفة
      if (lastMessage.user_id === currentUserId) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    }
  }, [messages.length, currentUserId]);

  // اختيار رسالة للرد عليها
  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  // إلغاء الرد
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // الحصول على اسم المرسل للرسالة المردود عليها
  const getReplyDisplayName = (message: ChatMessage) => {
    if (message.user_id === currentUserId) return 'أنت';
    if (message.user?.full_name) return message.user.full_name;
    if (message.user?.email) return message.user.email.split('@')[0];
    return 'مستخدم';
  };

  // اختيار صورة
  const handlePickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.4, // جودة منخفضة للدردشة لتقليل الحجم جداً (من 0.5 إلى 0.4)
      maxWidth: 800, // تقليل العرض الأقصى لصور الدردشة (من 1024 إلى 800)
      maxHeight: 800, // تقليل الارتفاع الأقصى لصور الدردشة
      includeBase64: true,
    });

    if (result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
    }
  };

  // إرسال الرسالة
  const handleSend = async () => {
    // إذا كان الحقل فارغاً ولا توجد صورة، نرسل قلباً
    const messageToSend = inputText.trim() || (selectedImage ? '' : '❤️');
    
    if (!messageToSend && !selectedImage && !sending) return;

    setSending(true);
    try {
      const success = await sendMessage(
        messageToSend,
        selectedImage,
        replyingTo?.id
      );

      if (success) {
        setInputText('');
        setSelectedImage(null);
        setReplyingTo(null);
        shouldScrollToEnd.current = true;
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return date.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const getDisplayName = (message: ChatMessage) => {
    if (message.user?.full_name) return message.user.full_name;
    if (message.user?.email) return message.user.email.split('@')[0];
    return 'مستخدم';
  };

  // وظيفة تحميل الصورة
  const handleDownloadImage = async (imageUrl: string) => {
    if (downloading) return;

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'صلاحية التخزين',
            message: 'نحتاج لصلاحية التخزين لتحميل الصورة على هاتفك',
            buttonNeutral: 'اسألني لاحقاً',
            buttonNegative: 'إلغاء',
            buttonPositive: 'موافق',
          }
        );
        // في أندرويد 10 وما فوق، لا نحتاج دائماً لهذه الصلاحية للتحميل في المجلدات العامة
        // ولكن للتبسيط سنكتفي بالتحقق أو المتابعة
      }

      setDownloading(true);
      const fileName = `Momtn_${Date.now()}.jpg`;
      const downloadPath = Platform.OS === 'ios' 
        ? `${RNFS.DocumentDirectoryPath}/${fileName}`
        : `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: downloadPath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        // إخبار النظام بوجود ملف جديد ليظهر في المعرض (أندرويد فقط)
        if (Platform.OS === 'android') {
          await RNFS.scanFile(downloadPath);
        }
        Alert.alert('تم التحميل', `تم حفظ الصورة في مجلد التحميلات`);
      } else {
        throw new Error('فشل التحميل من السيرفر');
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('خطأ', 'فشل تحميل الصورة، يرجى المحاولة مرة أخرى');
    } finally {
      setDownloading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.user_id === currentUserId;
    const hasLiked = item.likes?.includes(currentUserId) || false;
    const showDate = index === 0 ||
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

    return (
      <View key={item.id}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}

        <View style={[
          styles.messageRow,
          isMe ? styles.myMessageRow : styles.otherMessageRow
        ]}>
          {!isMe && (
            <View style={styles.avatarContainer}>
              {item.user?.avatar_url ? (
                <Image
                  source={{ uri: item.user.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {getDisplayName(item).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={[
            styles.messageBubbleWrapper,
            isMe ? styles.myMessageWrapper : styles.otherMessageWrapper
          ]}>
            {!isMe && (
              <Text style={styles.senderName}>{getDisplayName(item)}</Text>
            )}

            <Swipeable
              ref={(ref) => {
                if (ref && !(item as any).swipeableRef) {
                  (item as any).swipeableRef = ref;
                }
              }}
              friction={2}
              rightThreshold={40}
              leftThreshold={40}
              renderLeftActions={!isMe ? (progress, dragX) => {
                return (
                  <View style={styles.swipeActionContainer}>
                    <Icon name="arrow-undo" size={20} color={Colors.primary} />
                  </View>
                );
              } : undefined}
              renderRightActions={isMe ? (progress, dragX) => {
                return (
                  <View style={styles.swipeActionContainer}>
                    <Icon name="arrow-undo" size={20} color={Colors.primary} />
                  </View>
                );
              } : undefined}
              onSwipeableWillOpen={() => {
                handleReply(item);
                // إغلاق السحب فوراً بعد تفعيل الرد
                setTimeout(() => {
                  (item as any).swipeableRef?.close();
                }, 100);
              }}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={() => toggleLike(item.id)}
                style={[
                  styles.messageBubble,
                  isMe ? styles.myBubble : styles.otherBubble
                ]}
              >
                {/* عرض الرسالة المردود عليها داخل الفقاعة */}
                {item.replied_message && (
                  <View style={[
                    styles.repliedMessageContainer,
                    isMe ? styles.myRepliedContainer : styles.otherRepliedContainer
                  ]}>
                    <View style={isMe ? styles.myRepliedIndicator : styles.otherRepliedIndicator} />
                    <View style={styles.repliedContent}>
                      <Text style={styles.repliedSender} numberOfLines={1}>
                        {getReplyDisplayName(item.replied_message as any)}
                      </Text>
                      <Text style={styles.repliedText} numberOfLines={1}>
                        {item.replied_message.content}
                      </Text>
                    </View>
                  </View>
                )}

                {/* عرض الصورة إذا وجدت */}
                {item.image_url ? (
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => {
                      if (item.image_url) {
                        setViewingImage(item.image_url);
                      }
                    }}
                    style={styles.imageContainer}
                  >
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.messageImage}
                      resizeMode="cover"
                      onLoad={() => console.log('Image loaded successfully:', item.image_url)}
                      onError={(e) => console.log('Image load error:', e.nativeEvent.error, item.image_url)}
                    />
                  </TouchableOpacity>
                ) : null}

                {item.content ? (
                  <Text style={[
                    styles.messageText,
                    isMe ? styles.myMessageText : styles.otherMessageText,
                    item.content === '❤️' && { fontSize: 45, lineHeight: 55, textAlign: 'center' }
                  ]}>
                    {item.content}
                  </Text>
                ) : null}

                <View style={styles.messageFooter}>
                  <Text style={[
                    styles.messageTime,
                    isMe ? styles.myMessageTime : styles.otherMessageTime
                  ]}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>

                {/* زر التفاعل بالقلب - دائماً على اليسار */}
                <TouchableOpacity
                  style={[
                    styles.heartBadge,
                    (!hasLiked && (!item.likes || item.likes.length === 0)) && styles.heartBadgeInactive
                  ]}
                  onPress={() => toggleLike(item.id)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={hasLiked ? "heart" : "heart-outline"}
                    size={14}
                    color={hasLiked ? "#ea384c" : "rgba(255,255,255,0.2)"}
                  />
                  {(item.likes && item.likes.length > 0) && (
                    <Text style={styles.likeCount}>{item.likes.length}</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </Swipeable>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : (
        <>
          <Icon name="chatbubbles-outline" size={60} color={Colors.textMuted} />
          <Text style={styles.emptyStateText}>
            لا توجد رسائل بعد.. ابدأ المحادثة!
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMiddle, Colors.gradientEnd]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>{groupName}</Text>
                <Text style={styles.headerSubtitle}>محادثة المجموعة</Text>
              </View>

              <View style={{ width: 40 }} />
            </View>

            {/* Messages List */}
            {loading && messages.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                inverted={true}
                contentContainerStyle={[
                  styles.listContent,
                  messages.length === 0 && styles.listContentEmpty
                ]}
                ListEmptyComponent={renderEmptyState}
                onEndReached={loadMoreMessages}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loading && messages.length > 0 ? (
                    <View style={{ paddingVertical: 10 }}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : (hasMore && messages.length > 0 ? (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={loadMoreMessages}
                    >
                      <Text style={styles.loadMoreText}>تحميل رسائل أقدم</Text>
                    </TouchableOpacity>
                  ) : null)
                }
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Input Area */}
            <View style={styles.bottomSection}>
              {/* معاينة الصورة المختارة */}
              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Icon name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              )}

              {/* شريط الرد المفعّل */}
              {replyingTo && (
                <View style={styles.replyBar}>
                  <View style={styles.replyBarIndicator} />
                  <View style={styles.replyBarContent}>
                    <Text style={styles.replyBarSender}>
                      الرد على {getReplyDisplayName(replyingTo)}
                    </Text>
                    <Text style={styles.replyBarText} numberOfLines={1}>
                      {replyingTo.content}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={cancelReply} style={styles.cancelReplyButton}>
                    <Icon name="close-circle" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={Colors.textPrimary} />
                  ) : (
                    <Icon
                      name={inputText.trim() || selectedImage ? "send" : "heart"}
                      size={inputText.trim() || selectedImage ? 20 : 24}
                      color={Colors.textPrimary}
                      style={!(inputText.trim() || selectedImage) && { transform: [{ scale: 1.1 }] }}
                    />
                  )}
                </TouchableOpacity>

                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="اكتب رسالتك..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  maxLength={1000}
                  textAlign="right"
                />

                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickImage}
                  disabled={sending}
                >
                  <Icon name="image" size={26} color="#00E676" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>

      {/* مودال عرض الصورة بملء الشاشة */}
      <Modal
        visible={!!viewingImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity 
            style={styles.fullScreenClose} 
            onPress={() => setViewingImage(null)}
          >
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {viewingImage && (
            <Image 
              source={{ uri: viewingImage }} 
              style={styles.fullScreenImage} 
              resizeMode="contain"
            />
          )}

          <TouchableOpacity 
            style={styles.downloadButton} 
            onPress={() => viewingImage && handleDownloadImage(viewingImage)}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="download-outline" size={24} color="#fff" />
                <Text style={styles.downloadButtonText}>تحميل</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },

  // List
  listContent: {
    paddingVertical: Spacing.xl,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  imageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePickerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    zIndex: 999,
  },
  imagePreviewContainer: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyStateText: {
    color: Colors.textMuted,
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    textAlign: 'center',
  },

  // Date Separator
  dateSeparator: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dateText: {
    color: Colors.textMuted,
    fontSize: Typography.tiny.fontSize,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },

  // Messages
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    width: '100%',
  },
  myMessageRow: {
    justifyContent: 'flex-start',
    // In Arabic: My messages are usually on the RIGHT.
    flexDirection: 'row-reverse',
  },
  otherMessageRow: {
    flexDirection: 'row',
  },

  avatarContainer: {
    marginRight: Spacing.sm,
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  messageBubbleWrapper: {
    maxWidth: '80%',
    position: 'relative',
  },
  myMessageWrapper: {
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignItems: 'flex-start',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  downloadButton: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  downloadButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },

  senderName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    marginHorizontal: 8,
    fontWeight: '600',
  },

  messageBubble: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg, // زيادة المسافة السفلية للقلب
    borderRadius: 20,
    minWidth: 70, // زيادة العرض الأدنى قليلاً
    ...Shadows.md,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 20,
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Replied Message inside bubble
  repliedMessageContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    minWidth: 120,
  },
  myRepliedContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  otherRepliedContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  myRepliedIndicator: {
    width: 4,
    backgroundColor: '#fff',
  },
  otherRepliedIndicator: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  repliedContent: {
    padding: 6,
    flex: 1,
  },
  repliedSender: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'right',
  },
  repliedText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },

  swipeActionContainer: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom Section & Reply Bar
  bottomSection: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 0,
  },
  replyBarIndicator: {
    width: 4,
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  replyBarContent: {
    flex: 1,
    paddingHorizontal: 15,
  },
  replyBarSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'right',
  },
  replyBarText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  cancelReplyButton: {
    padding: 5,
  },

  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
    textAlign: 'right',
  },
  otherMessageText: {
    color: '#fff',
    textAlign: 'right',
  },

  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.6,
  },
  myMessageTime: {
    color: '#fff',
  },
  otherMessageTime: {
    color: '#fff',
  },

  // Likes
  heartBadge: {
    position: 'absolute',
    bottom: 4,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 24,
    justifyContent: 'center',
  },
  heartBadgeInactive: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  likeCount: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
    fontWeight: 'bold',
  },

  // Load More
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  loadMoreText: {
    color: Colors.textIndigo,
    fontSize: Typography.bodySmall.fontSize,
  },

  // Error
  errorContainer: {
    backgroundColor: Colors.errorBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: Colors.textPrimary,
    fontSize: Typography.bodySmall.fontSize,
    textAlign: 'center',
  },

  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    minHeight: 60,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: '#fff',
    fontSize: 16,
    maxHeight: 120,
    marginHorizontal: Spacing.sm,
    textAlign: 'right',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#666',
  },
});

export default GroupChatWindow;
