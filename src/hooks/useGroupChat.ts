import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { NotificationsService } from '../services/notifications';

export interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    email: string;
    full_name: string | null;
  };
}

interface UseGroupChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<boolean>;
  loadMoreMessages: () => Promise<void>;
  hasMore: boolean;
}

const MESSAGES_PER_PAGE = 50;

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
      const { data: messagesData, error: messagesError } = await (supabase as any)
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(MESSAGES_PER_PAGE);

      if (messagesError) throw messagesError;

      if (messagesData && messagesData.length > 0) {
        // جلب معلومات المستخدمين
        const userIds = [...new Set(messagesData.map((m: any) => m.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', userIds as string[]);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

        const messagesWithUsers: ChatMessage[] = messagesData.map((msg: any) => ({
          ...msg,
          user: usersMap.get(msg.user_id) || { email: '', full_name: null }
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

    const oldestMessage = messages[0];
    
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
          .select('id, email, full_name')
          .in('id', userIds as string[]);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

        const messagesWithUsers: ChatMessage[] = moreMessages.map((msg: any) => ({
          ...msg,
          user: usersMap.get(msg.user_id) || { email: '', full_name: null }
        }));

        setMessages(prev => [...messagesWithUsers.reverse(), ...prev]);
        setHasMore(moreMessages.length === MESSAGES_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error loading more messages:', err);
    }
  }, [groupId, hasMore, loading, messages]);

  // إرسال رسالة جديدة
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!groupId || !userId || !content.trim()) return false;

    try {
      const { data: messageData, error: sendError } = await (supabase as any)
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: userId,
          content: content.trim()
        })
        .select()
        .single();

      if (sendError) throw sendError;

      // إرسال إشعارات لأعضاء المجموعة
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      const senderName = userData?.full_name || userData?.email?.split('@')[0] || 'مستخدم';

      const { data: groupData } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();

      const groupName = groupData?.name || 'المجموعة';

      await NotificationsService.notifyGroupMembers(
        groupId,
        userId,
        senderName,
        'new_message',
        `💬 رسالة جديدة في ${groupName}`,
        `${senderName}: ${content.trim().substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        { messageId: messageData?.id }
      );

      return true;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'حدث خطأ في إرسال الرسالة');
      return false;
    }
  }, [groupId, userId]);

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
          const newMessage = payload.new as ChatMessage;
          
          // جلب معلومات المرسل
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('id', newMessage.user_id)
            .single();

          const messageWithUser: ChatMessage = {
            ...newMessage,
            user: userData || { email: '', full_name: null }
          };

          setMessages(prev => [...prev, messageWithUser]);
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
    loadMoreMessages,
    hasMore
  };
};

export default useGroupChat;
