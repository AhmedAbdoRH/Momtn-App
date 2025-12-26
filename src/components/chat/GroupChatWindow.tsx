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
  
  const {
    messages,
    loading,
    error,
    sendMessage,
    loadMoreMessages,
    hasMore,
  } = useGroupChat(groupId, currentUserId);

  // التمرير للأسفل عند وصول رسائل جديدة
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    const success = await sendMessage(inputText);
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
    const showDate = index === 0 || 
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.otherMessage
        ]}>
          {!isMe && (
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getDisplayName(item).charAt(0)}
                </Text>
              </View>
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isMe ? styles.myMessageBubble : styles.otherMessageBubble
          ]}>
            {!isMe && (
              <Text style={styles.senderName}>{getDisplayName(item)}</Text>
            )}
            
            <Text style={[
              styles.messageText,
              isMe ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.content}
            </Text>
            
            <Text style={[
              styles.messageTime,
              isMe ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatTime(item.created_at)}
            </Text>
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
                style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={Colors.textPrimary} />
                ) : (
                  <Icon name="send" size={20} color={Colors.textPrimary} />
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
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.glassHeader,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLighter,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.caption.fontSize,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
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
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    maxWidth: '85%',
  },
  myMessage: {
    alignSelf: 'flex-start', // English alignment (left), but Arabic text will be inside
    flexDirection: 'row-reverse', // To put bubble on left but text inside correct
    marginLeft: 0,
    marginRight: 'auto', // Push to left
  },
  otherMessage: {
    alignSelf: 'flex-end', // Push to right
    marginLeft: 'auto',
    marginRight: 0,
  },
  
  avatarContainer: {
    marginLeft: Spacing.sm,
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatarText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  messageBubble: {
    padding: Spacing.md,
    maxWidth: '100%',
    ...Shadows.sm,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  otherMessageBubble: {
    backgroundColor: Colors.glassInput,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLighter,
  },

  // Message Text
  messageText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
  },
  myMessageText: {
    color: Colors.textPrimary,
    textAlign: 'left',
  },
  otherMessageText: {
    color: Colors.textPrimary,
    textAlign: 'right',
  },

  // Message Time
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'left',
  },
  otherMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'right',
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
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLighter,
    backgroundColor: Colors.glassHeader,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.glassInput,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    maxHeight: 100,
    marginLeft: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLighter,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.primary,
  },
  sendButtonDisabled: {
    opacity: 0.4,
    backgroundColor: 'rgba(234, 56, 76, 0.5)',
  },
});

export default GroupChatWindow;
