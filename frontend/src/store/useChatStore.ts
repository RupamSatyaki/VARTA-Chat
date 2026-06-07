import { create } from 'zustand';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  timestamp: string;
  chatId?: string;
  status?: 'sent' | 'delivered' | 'seen';
}

interface Chat {
  _id: string;
  chatName?: string;
  isGroupChat: boolean;
  users: any[];
  unreadCount?: number;
  latestMessage?: any;
}

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>; // chatId -> messages[]
  setChats: (chats: Chat[]) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessageId: (chatId: string, tempId: string, realId: string) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: 'sent' | 'delivered' | 'seen') => void;
  markMessagesAsSeen: (chatId: string, senderId: string) => void;
  updateChatFromMessage: (messageData: any, isMe: boolean) => void;
  updateChatStatus: (chatId: string, messageId: string, status: string) => void;
  syncChatSeen: (chatId: string, receiverId: string, currentUserId: string) => void;
  clearChat: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  messages: {},

  setChats: (chats) => set({ chats }),

  setMessages: (chatId, messages) => 
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages }
    })),

  addMessage: (chatId, message) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      if (chatMessages.find(m => m.id === message.id)) return state;
      
      return {
        messages: {
          ...state.messages,
          [chatId]: [...chatMessages, message]
        }
      };
    }),

  updateMessageId: (chatId, tempId, realId) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map((m) =>
        m.id === tempId ? { ...m, id: realId } : m
      );
      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    }),

  updateMessageStatus: (chatId, messageId, status) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map((m) =>
        m.id === messageId ? { ...m, status } : m
      );
      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    }),

  markMessagesAsSeen: (chatId, senderId) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map((m) =>
        m.senderId === senderId && m.status !== 'seen' ? { ...m, status: 'seen' as const } : m
      );
      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    }),

  updateChatFromMessage: (messageData, isMe) =>
    set((state) => {
      const chatIndex = state.chats.findIndex(c => c._id === (messageData.chatId || messageData.chat));
      if (chatIndex === -1) return state; // Let the screen handle fetching new chats

      const updatedChats = [...state.chats];
      const targetChat = { ...updatedChats[chatIndex] };

      targetChat.latestMessage = {
        _id: messageData._id,
        content: messageData.content,
        status: messageData.status || 'sent',
        createdAt: messageData.createdAt || new Date().toISOString(),
        sender: {
          _id: messageData.senderId || messageData.sender,
        }
      };

      if (!isMe) {
        targetChat.unreadCount = (targetChat.unreadCount || 0) + 1;
      }

      updatedChats.splice(chatIndex, 1);
      return { chats: [targetChat, ...updatedChats] };
    }),

  updateChatStatus: (chatId, messageId, status) =>
    set((state) => ({
      chats: state.chats.map(chat => {
        if (chat._id === chatId && chat.latestMessage?._id === messageId) {
          return {
            ...chat,
            latestMessage: { ...chat.latestMessage, status }
          };
        }
        return chat;
      })
    })),

  syncChatSeen: (chatId, receiverId, currentUserId) =>
    set((state) => ({
      chats: state.chats.map(chat => {
        if (chat._id === chatId) {
          const isMeReceiver = receiverId === currentUserId;
          const isMeSender = chat.latestMessage && (
            (typeof chat.latestMessage.sender === 'string' && chat.latestMessage.sender === currentUserId) ||
            (typeof chat.latestMessage.sender === 'object' && chat.latestMessage.sender._id === currentUserId)
          );

          return {
            ...chat,
            unreadCount: isMeReceiver ? 0 : chat.unreadCount,
            latestMessage: (isMeSender && chat.latestMessage) 
              ? { ...chat.latestMessage, status: 'seen' } 
              : chat.latestMessage
          };
        }
        return chat;
      })
    })),

  clearChat: (chatId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[chatId];
      return { messages: newMessages };
    }),
}));
