import { create } from 'zustand';

interface Message {
  id: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'document';
  senderId: string;
  senderName?: string;
  receiverId?: string;
  timestamp: string;
  chatId?: string;
  status?: 'sent' | 'delivered' | 'seen';
  replyTo?: {
    _id: string;
    content: string;
    sender: { _id: string; name: string };
  };
  reactions?: { user: string; emoji: string }[];
  linkPreview?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    siteName?: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  readBy?: { user: string; name: string; seenAt: string }[];
  deliveredTo?: { user: string; name: string; deliveredAt: string }[];
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
  typingStatus: Record<string, boolean>; // chatId -> isTyping
  onlineUsers: Set<string>; // Set of userIds
  userStatuses: Record<string, { status: 'online' | 'offline', lastSeen?: string }>; // userId -> status data
  setChats: (chats: Chat[]) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  appendMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  updateMessageId: (chatId: string, tempId: string, realId: string, newData?: Partial<Message>) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: 'sent' | 'delivered' | 'seen') => void;
  updateMessageReactions: (chatId: string, messageId: string, reactions: { user: string; emoji: string }[]) => void;
  markMessagesAsSeen: (chatId: string, senderId: string) => void;
  updateChatFromMessage: (messageData: any, isMe: boolean) => void;
  updateChatStatus: (chatId: string, messageId: string, status: string) => void;
  syncChatSeen: (chatId: string, receiverId: string, currentUserId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  setOnlineUsers: (users: string[]) => void;
  updateUserStatus: (userId: string, status: 'online' | 'offline', lastSeen?: string) => void;
  clearChat: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  messages: {},
  typingStatus: {},
  onlineUsers: new Set(),
  userStatuses: {},

  setChats: (chats) => set({ chats }),
  
  setTyping: (chatId, isTyping) =>
    set((state) => ({
      typingStatus: { ...state.typingStatus, [chatId]: isTyping }
    })),

  setOnlineUsers: (users) =>
    set((state) => {
      const newStatuses = { ...state.userStatuses };
      users.forEach(id => {
        newStatuses[id] = { status: 'online' };
      });
      return { 
        onlineUsers: new Set(users),
        userStatuses: newStatuses
      };
    }),

  updateUserStatus: (userId, status, lastSeen) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      const newStatuses = { ...state.userStatuses };
      
      if (status === 'online') {
        newOnlineUsers.add(userId);
        newStatuses[userId] = { status: 'online' };
      } else {
        newOnlineUsers.delete(userId);
        newStatuses[userId] = { status: 'offline', lastSeen };
      }
      return { 
        onlineUsers: newOnlineUsers,
        userStatuses: newStatuses
      };
    }),

  setMessages: (chatId, messages) => 
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages }
    })),

  appendMessages: (chatId, newMessages) =>
    set((state) => {
      const existingMessages = state.messages[chatId] || [];
      // Filter out duplicates just in case
      const filteredNew = newMessages.filter(
        (nm) => !existingMessages.find((em) => em.id === nm.id)
      );
      return {
        messages: {
          ...state.messages,
          [chatId]: [...existingMessages, ...filteredNew]
        }
      };
    }),

  addMessage: (chatId, message) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      if (chatMessages.find(m => m.id === message.id)) return state;
      
      return {
        messages: {
          ...state.messages,
          [chatId]: [message, ...chatMessages] // Prepend for latest-first order
        }
      };
    }),

  updateMessage: (chatId, messageId, updates) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      );
      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    }),

  updateMessageId: (chatId, tempId, realId, newData) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map((m) =>
        m.id === tempId ? { ...m, id: realId, ...newData } : m
      );
      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    }),

  updateMessageStatus: (chatId: string, messageId: string, status: 'sent' | 'delivered' | 'seen', deliveredAt?: string, receiverId?: string, receiverName?: string) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map((m) => {
        if (m.id === messageId) {
          const updates: Partial<Message> = { status };
          if (status === 'delivered' && receiverId && receiverName) {
            const alreadyDelivered = m.deliveredTo?.some(d => d.user === receiverId);
            if (!alreadyDelivered) {
              updates.deliveredTo = [...(m.deliveredTo || []), { 
                user: receiverId, 
                name: receiverName, 
                deliveredAt: deliveredAt || new Date().toISOString() 
              }];
            }
          }
          return { ...m, ...updates };
        }
        return m;
      });
      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    }),

  updateMessageReactions: (chatId, messageId, reactions) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      );
      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    }),

  markMessagesAsSeen: (chatId, currentUserId) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map((m) => {
        // If I am NOT the sender and I am NOT in the readBy array, add me
        const alreadyRead = m.readBy?.some(r => r.user === currentUserId);
        if (m.senderId !== currentUserId && !alreadyRead) {
          return { 
            ...m, 
            status: 'seen' as const,
            readBy: [...(m.readBy || []), { user: currentUserId, name: 'You', seenAt: new Date().toISOString() }]
          };
        }
        return m;
      });
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
        type: messageData.type || 'text',
        status: messageData.status || 'sent',
        createdAt: messageData.createdAt || new Date().toISOString(),
        sender: {
          _id: messageData.senderId || messageData.sender,
        },
        readBy: messageData.readBy || []
      };

      if (!isMe) {
        // Check if I'm already in readBy (just in case)
        const alreadyRead = messageData.readBy?.some((r: any) => r.user === (state as any).currentUserId);
        if (!alreadyRead) {
          targetChat.unreadCount = (targetChat.unreadCount || 0) + 1;
        }
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

  syncChatSeen: (chatId: string, viewerId: string, currentUserId: string, name?: string, seenAt?: string) =>
    set((state) => {
      const isMeViewer = viewerId === currentUserId;
      
      const newChats = state.chats.map(chat => {
        if (chat._id === chatId) {
          const isMeSender = chat.latestMessage && (
            (typeof chat.latestMessage.sender === 'string' && chat.latestMessage.sender === currentUserId) ||
            (typeof chat.latestMessage.sender === 'object' && chat.latestMessage.sender._id === currentUserId)
          );

          return {
            ...chat,
            unreadCount: isMeViewer ? 0 : chat.unreadCount,
            latestMessage: (isMeSender && chat.latestMessage) 
              ? { ...chat.latestMessage, status: 'seen' } 
              : chat.latestMessage
          };
        }
        return chat;
      });

      // Also update messages in this chat locally
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = chatMessages.map(m => {
        if (m.senderId !== viewerId && !m.readBy?.some(r => r.user === viewerId)) {
          return {
            ...m,
            status: m.senderId === currentUserId ? 'seen' as const : m.status,
            readBy: [...(m.readBy || []), { 
              user: viewerId, 
              name: name || (isMeViewer ? 'You' : 'User'), 
              seenAt: seenAt || new Date().toISOString() 
            }]
          };
        }
        return m;
      });

      return { 
        chats: newChats,
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    }),

  clearChat: (chatId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[chatId];
      return { messages: newMessages };
    }),
}));
