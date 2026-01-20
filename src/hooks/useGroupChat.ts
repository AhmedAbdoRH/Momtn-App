import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { NotificationsService } from '../services/notifications';

export interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  user?: {
    email: string;
    full_name: string | null;
    avatar_url?: string | null;
  };
  likes?: string[];
  reply_to_message_id?: string | null;
  replied_message?: {
    id: string;
    content: string;
    user_id: string;
    user?: {
      full_name: string | null;
      email: string;
    };
  } | null;
}

interface UseGroupChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, image?: any, replyToMessageId?: string | null) => Promise<boolean>;
  toggleLike: (messageId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  hasMore: boolean;
}

const MESSAGES_PER_PAGE = 20;

export const useGroupChat = (groupId: string | null, userId: string): UseGroupChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<any>(null);

  // تحميل الرسائل الأولية
  const fetchMessages = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);
    setError(null);

    try {
      // جلب آخر 20 رسالة (ترتيب تنازلي أولاً للحصول على الأحدث)
      const { data: messagesData, error: messagesError } = await (supabase as any)
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (messagesError) throw messagesError;

      if (messagesData && messagesData.length > 0) {
        // نترك الرسائل بترتيب تنازلي (الأحدث أولاً) لتسهيل استخدام inverted FlatList
        const sortedMessages = messagesData;

        // جلب معلومات المستخدمين
        const userIds = [...new Set(sortedMessages.map((m: any) => m.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds as string[]);

        const usersMap = new Map((usersData as any)?.map((u: any) => [u.id, u]) || []);

        // جلب الرسائل المردود عليها
        const replyIds = sortedMessages
          .filter((m: any) => m.reply_to_message_id)
          .map((m: any) => m.reply_to_message_id);

        let repliedMessagesMap = new Map();
        if (replyIds.length > 0) {
          const { data: repliedMessages } = await (supabase as any)
            .from('group_messages')
            .select('id, content, user_id')
            .in('id', replyIds);

          if (repliedMessages) {
            // جلب معلومات مرسلي الرسائل المردود عليها
            const repliedUserIds = [...new Set(repliedMessages.map((m: any) => m.user_id))];
            const { data: repliedUsersData } = await supabase
              .from('users')
              .select('id, email, full_name')
              .in('id', repliedUserIds as string[]);

            const repliedUsersMap = new Map((repliedUsersData as any)?.map((u: any) => [u.id, u]) || []);

            repliedMessagesMap = new Map(repliedMessages.map((m: any) => [
              m.id,
              { ...m, user: repliedUsersMap.get(m.user_id) }
            ]));
          }
        }

        const messagesWithUsers: ChatMessage[] = sortedMessages.map((msg: any) => ({
          ...msg,
          user: usersMap.get(msg.user_id) || { email: '', full_name: null, avatar_url: null },
          likes: msg.likes || [],
          replied_message: msg.reply_to_message_id ? repliedMessagesMap.get(msg.reply_to_message_id) || null : null
        }));

        setMessages(messagesWithUsers);
        setHasMore(messagesData.length === MESSAGES_PER_PAGE);
      } else {
        setMessages([]);
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'حدث خطأ في تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // تحميل المزيد من الرسائل
  const loadMoreMessages = useCallback(async () => {
    if (!groupId || !hasMore || loading || messages.length === 0) return;

    // آخر رسالة في المصفوفة هي الأقدم حالياً
    const oldestMessage = messages[messages.length - 1];

    try {
      const { data: moreMessages, error: moreError } = await (supabase as any)
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (moreError) throw moreError;

      if (moreMessages && moreMessages.length > 0) {
        const userIds = [...new Set(moreMessages.map((m: any) => m.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds as string[]);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

        const messagesWithUsers: ChatMessage[] = moreMessages.map((msg: any) => ({
          ...msg,
          user: usersMap.get(msg.user_id) || { email: '', full_name: null, avatar_url: null },
          likes: msg.likes || []
        }));

        // إضافة الرسائل القديمة إلى نهاية المصفوفة
        setMessages(prev => [...prev, ...messagesWithUsers]);
        setHasMore(moreMessages.length === MESSAGES_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error loading more messages:', err);
    }
  }, [groupId, hasMore, loading, messages]);

  // إرسال رسالة جديدة
  const sendMessage = useCallback(async (content: string, image?: any, replyToMessageId?: string | null): Promise<boolean> => {
    if (!groupId || !userId || (!content.trim() && !image)) return false;

    try {
      let imageUrl = null;

      // رفع الصورة إذا وجدت
      if (image) {
        const fileExt = image.uri.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${groupId}/${userId}/${Date.now()}_${fileName}`;

        const formData = new FormData();
        formData.append('file', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: fileName,
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(filePath, formData);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const insertData: any = {
        group_id: groupId,
        user_id: userId,
        content: content.trim(),
        image_url: imageUrl
      };

      // إضافة معرف الرسالة المردود عليها إن وجد
      if (replyToMessageId) {
        insertData.reply_to_message_id = replyToMessageId;
      }

      const { data: messageData, error: sendError } = await (supabase as any)
        .from('group_messages')
        .insert(insertData)
        .select()
        .single();

      if (sendError) throw sendError;

      // إرسال إشعارات لأعضاء المجموعة
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      const senderName = (userData as any)?.full_name || (userData as any)?.email?.split('@')[0] || 'مستخدم';

      const { data: groupData } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();

      const groupName = (groupData as any)?.name || 'المجموعة';

      let notificationBody = `${senderName}: ${content.trim().substring(0, 50)}${content.length > 50 ? '...' : ''}`;
      if (imageUrl && !content.trim()) {
        notificationBody = `${senderName}: 📷 أرسل صورة`;
      } else if (imageUrl && content.trim()) {
        notificationBody = `${senderName}: 📷 ${content.trim().substring(0, 40)}...`;
      }

      await NotificationsService.notifyGroupMembers(
        groupId,
        userId,
        senderName,
        'new_message',
        `💬 رسالة جديدة في ${groupName}`,
        notificationBody,
        { messageId: messageData?.id }
      );

      return true;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'حدث خطأ في إرسال الرسالة');
      return false;
    }
  }, [groupId, userId]);

  // التفاعل مع الرسائل
  const toggleLike = useCallback(async (messageId: string) => {
    if (!userId) return;

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const currentLikes = message.likes || [];
      const hasLiked = currentLikes.includes(userId);
      const newLikes = hasLiked
        ? currentLikes.filter(id => id !== userId)
        : [...currentLikes, userId];

      const { error: updateError } = await (supabase as any)
        .from('group_messages')
        .update({ likes: newLikes })
        .eq('id', messageId);

      if (updateError) throw updateError;
    } catch (err: any) {
      console.error('Error toggling like:', err);
    }
  }, [userId, messages]);

  // الاشتراك في Realtime
  useEffect(() => {
    if (!groupId) return;

    fetchMessages();

    // إنشاء قناة Realtime
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // جلب معلومات المرسل
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, full_name, avatar_url')
            .eq('id', newMessage.user_id)
            .single();

          // جلب بيانات الرسالة المردود عليها إذا وجدت
          let repliedMessageData = null;
          if (newMessage.reply_to_message_id) {
            const { data: repliedMsg } = await (supabase as any)
              .from('group_messages')
              .select('id, content, user_id')
              .eq('id', newMessage.reply_to_message_id)
              .single();

            if (repliedMsg) {
              const { data: repliedUser } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('id', repliedMsg.user_id)
                .single();

              repliedMessageData = {
                ...repliedMsg,
                user: repliedUser
              };
            }
          }

          const messageWithUser: ChatMessage = {
            ...newMessage,
            user: userData || { email: '', full_name: null, avatar_url: null },
            likes: newMessage.likes || [],
            replied_message: repliedMessageData
          };

          // إضافة الرسالة الجديدة إلى بداية المصفوفة (لأننا نستخدم inverted FlatList)
          setMessages(prev => [messageWithUser, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => prev.map(m =>
            m.id === updatedMessage.id
              ? { ...m, likes: updatedMessage.likes || [] }
              : m
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages(prev => prev.filter(m => m.id !== deletedId));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [groupId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    toggleLike,
    loadMoreMessages,
    hasMore
  };
};

export default useGroupChat;
