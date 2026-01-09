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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
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
  const flatListRef = useRef<FlatList>(null);
  const shouldScrollToEnd = useRef(true);
  const isFirstLoad = useRef(true);

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
    }
  }, [visible]);

  // التمرير للأسفل عند تغيير حجم المحتوى
  const handleContentSizeChange = () => {
    if (shouldScrollToEnd.current && messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: !isFirstLoad.current });
      isFirstLoad.current = false;
    }
  };

  // عند بداية السحب يدوياً، نوقف التمرير التلقائي مؤقتاً
  const handleScrollBeginDrag = () => {
    shouldScrollToEnd.current = false;
  };

  // عند وصول رسالة جديدة، نعيد تفعيل التمرير التلقائي
  useEffect(() => {
    if (messages.length > 0) {
      // لو الرسالة الأخيرة من المستخدم الحالي، نمرر للأسفل
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.user_id === currentUserId) {
        shouldScrollToEnd.current = true;
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }
  }, [messages.length, currentUserId]);

  const handleSend = async () => {
    if (sending) return;

    const textToSend = inputText.trim();
    if (!textToSend) {
      // إرسال قلب إذا كان الحقل فارغاً
      setSending(true);
      await sendMessage('❤️');
      setSending(false);
      return;
    }

    setSending(true);
    const success = await sendMessage(textToSend);
    if (success) {
      setInputText('');
    }
    setSending(false);
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

            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => toggleLike(item.id)}
              style={[
                styles.messageBubble,
                isMe ? styles.myBubble : styles.otherBubble
              ]}
            >
              <Text style={[
                styles.messageText,
                isMe ? styles.myMessageText : styles.otherMessageText,
                item.content === '❤️' && { fontSize: 45, lineHeight: 55, textAlign: 'center' }
              ]}>
                {item.content}
              </Text>

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
                contentContainerStyle={[
                  styles.listContent,
                  messages.length === 0 && styles.listContentEmpty
                ]}
                ListEmptyComponent={renderEmptyState}
                onEndReached={loadMoreMessages}
                onEndReachedThreshold={0.3}
                ListHeaderComponent={
                  hasMore && messages.length > 0 ? (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={loadMoreMessages}
                    >
                      <Text style={styles.loadMoreText}>تحميل رسائل أقدم</Text>
                    </TouchableOpacity>
                  ) : null
                }
                showsVerticalScrollIndicator={false}
                onContentSizeChange={handleContentSizeChange}
                onScrollBeginDrag={handleScrollBeginDrag}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                }}
              />
            )}

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Input Area */}
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
                    name={inputText.trim() ? "send" : "heart"}
                    size={inputText.trim() ? 20 : 24}
                    color={Colors.textPrimary}
                    style={!inputText.trim() && { transform: [{ scale: 1.1 }] }}
                  />
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="اكتب رسالتك..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={1000}
                textAlign="right"
                onSubmitEditing={handleSend}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
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
    flexDirection: 'row', // Keep avatar on left of my bubble if needed, but usually my messages don't have avatar
    justifyContent: 'flex-start', // Messages start from left for "Me" in RTL logic? Wait.
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
    maxWidth: '75%',
    position: 'relative',
  },
  myMessageWrapper: {
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignItems: 'flex-start',
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
    flexDirection: 'row', // تغيير الاتجاه ليكون الزر على اليسار
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
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
    marginLeft: Spacing.sm, // مسافة من الزر الذي على اليسار
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
