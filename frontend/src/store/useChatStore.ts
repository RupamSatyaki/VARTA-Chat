import { create } from 'zustand';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  timestamp: string;
  chatId?: string;
}

interface Chat {
  _id: string;
  chatName: string;
  isGroupChat: boolean;
  users: any[];
  latestMessage?: any;
}

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>; // chatId -> messages[]
  setChats: (chats: Chat[]) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
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
      // Prevent duplicates if needed (using id)
      if (chatMessages.find(m => m.id === message.id)) return state;
      
      return {
        messages: {
          ...state.messages,
          [chatId]: [...chatMessages, message]
        }
      };
    }),

  clearChat: (chatId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[chatId];
      return { messages: newMessages };
    }),
}));
