import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  StatusBar,
  Image
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { useAuthStore } from '../../store/useAuthStore';
import apiClient from '../../api/apiClient';
import { Colors } from '../../theme/colors';

interface User {
  _id: string;
  name?: string;
  number: string;
  profilePic?: string;
}

interface Chat {
  _id: string;
  chatName?: string;
  isGroupChat: boolean;
  users: User[];
  unreadCount?: number;
  latestMessage?: {
    _id: string;
    content: string;
    status: 'sent' | 'delivered' | 'seen';
    createdAt: string;
    sender: {
      _id: string;
      name?: string;
      number?: string;
    };
  };
}

type RootStackParamList = {
  Home: undefined;
  Chat: { user: User; chat: Chat };
  Login: undefined;
  Search: undefined;
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { socket } = useSocket();
  const { userData, logout } = useAuthStore();

  const fetchChats = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await apiClient.get('/chats');
      if (response.data) {
        setChats(response.data);
      }
    } catch (error: any) {
      console.error('Fetch chats error:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused && userData) {
      fetchChats();
    }
  }, [isFocused, userData, fetchChats]);

  useEffect(() => {
    if (socket && userData) {
      const handleMessageReceived = (newMessage: any) => {
        setChats((prevChats) => {
          const chatIndex = prevChats.findIndex(c => c._id === newMessage.chatId);
          
          if (chatIndex === -1) {
            fetchChats(false);
            return prevChats;
          }

          const updatedChats = [...prevChats];
          const targetChat = { ...updatedChats[chatIndex] };

          targetChat.latestMessage = {
            _id: newMessage._id,
            content: newMessage.content,
            status: newMessage.status || 'sent',
            createdAt: new Date().toISOString(),
            sender: {
              _id: newMessage.senderId,
              name: newMessage.senderName,
              number: newMessage.senderNumber
            }
          };

          if (newMessage.senderId !== userData._id) {
            targetChat.unreadCount = (targetChat.unreadCount || 0) + 1;
          }

          updatedChats.splice(chatIndex, 1);
          return [targetChat, ...updatedChats];
        });
      };

      const handleMessageSent = ({ message: savedMsg }: any) => {
        setChats((prevChats) => {
          const chatIndex = prevChats.findIndex(c => c._id === savedMsg.chat);
          if (chatIndex === -1) {
            fetchChats(false);
            return prevChats;
          }

          const updatedChats = [...prevChats];
          const targetChat = { ...updatedChats[chatIndex] };

          targetChat.latestMessage = {
            _id: savedMsg._id,
            content: savedMsg.content,
            status: savedMsg.status,
            createdAt: savedMsg.createdAt,
            sender: {
              _id: savedMsg.sender,
            }
          };

          updatedChats.splice(chatIndex, 1);
          return [targetChat, ...updatedChats];
        });
      };

      const handleStatusUpdated = ({ messageId, chatId, status }: any) => {
        setChats(prev => prev.map(chat => {
          if (chat._id === chatId && chat.latestMessage && chat.latestMessage._id === messageId) {
            return {
              ...chat,
              latestMessage: { 
                ...chat.latestMessage, 
                status: status as 'sent' | 'delivered' | 'seen' 
              }
            };
          }
          return chat;
        }));
      };

      const handleMessagesSeen = ({ chatId, receiverId }: any) => {
        setChats(prev => prev.map(chat => {
          if (chat._id === chatId) {
            const isMeReceiver = receiverId === userData?._id;
            const latestMsg = chat.latestMessage;
            const isMeSender = latestMsg && (
              (typeof latestMsg.sender === 'string' && latestMsg.sender === userData?._id) ||
              (typeof latestMsg.sender === 'object' && latestMsg.sender._id === userData?._id)
            );

            return {
              ...chat,
              unreadCount: isMeReceiver ? 0 : chat.unreadCount,
              latestMessage: (isMeSender && latestMsg) 
                ? { ...latestMsg, status: 'seen' as const } 
                : latestMsg
            };
          }
          return chat;
        }));
      };

      socket.on('message-received', handleMessageReceived);
      socket.on('message-sent', handleMessageSent);
      socket.on('message-status-updated', handleStatusUpdated);
      socket.on('messages-seen', handleMessagesSeen);

      return () => {
        socket.off('message-received', handleMessageReceived);
        socket.off('message-sent', handleMessageSent);
        socket.off('message-status-updated', handleStatusUpdated);
        socket.off('messages-seen', handleMessagesSeen);
      };
    }
  }, [socket, userData?._id, fetchChats]);

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diff / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const isToday = now.toDateString() === date.toDateString();
      if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (yesterday.toDateString() === date.toDateString()) return 'Yesterday';

      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      }
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.isGroupChat) return chat.chatName;
    const otherUser = chat.users.find(u => u._id !== userData?._id);
    return otherUser?.name || otherUser?.number || 'Unknown';
  };

  const handleChatPress = (chat: Chat) => {
    const otherUser = chat.users.find(u => u._id !== userData?._id);
    if (otherUser) {
      setChats(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
      navigation.navigate('Chat', { user: otherUser, chat });
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const latestMsg = item.latestMessage;
    const isLatestMessageFromMe = latestMsg && (
      (typeof latestMsg.sender === 'string' && latestMsg.sender === userData?._id) ||
      (typeof latestMsg.sender === 'object' && latestMsg.sender._id === userData?._id)
    );
    const hasUnread = (item.unreadCount || 0) > 0;

    const renderStatusIcon = () => {
      if (!isLatestMessageFromMe || !latestMsg) return null;
      switch (latestMsg.status) {
        case 'seen': return <Ionicons name="checkmark-done" size={16} color="#34B7F1" style={{ marginRight: 4 }} />;
        case 'delivered': return <Ionicons name="checkmark-done" size={16} color={Colors.textSecondary} style={{ marginRight: 4 }} />;
        case 'sent': return <Ionicons name="checkmark" size={16} color={Colors.textSecondary} style={{ marginRight: 4 }} />;
        default: return <Ionicons name="time-outline" size={14} color={Colors.textSecondary} style={{ marginRight: 4 }} />;
      }
    };

    return (
      <TouchableOpacity style={styles.chatItem} activeOpacity={0.7} onPress={() => handleChatPress(item)}>
        <Image 
          source={{ uri: item.users.find(u => u._id !== userData?._id)?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
          style={styles.avatar} 
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{getChatDisplayName(item)}</Text>
            <Text style={[styles.time, hasUnread && styles.unreadTime]}>
              {latestMsg ? formatTime(latestMsg.createdAt) : ''}
            </Text>
          </View>
          <View style={styles.chatFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {renderStatusIcon()}
              <Text style={[styles.lastMessage, hasUnread && styles.unreadMessage]} numberOfLines={1}>
                {latestMsg ? latestMsg.content : 'No messages yet'}
              </Text>
            </View>
            {hasUnread && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VARTA</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && chats.length === 0 ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={Colors.gray} />
              <Text style={styles.emptyText}>No chats yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: Colors.lightGray },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.primary, letterSpacing: 1 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  avatar: { width: 55, height: 55, borderRadius: 27.5 },
  chatInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { color: Colors.text, fontSize: 17, fontWeight: '600', flex: 1, marginRight: 10 },
  time: { color: Colors.textSecondary, fontSize: 12 },
  unreadTime: { color: Colors.primary, fontWeight: 'bold' },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { color: Colors.textSecondary, fontSize: 14, flex: 1, marginRight: 10 },
  unreadMessage: { color: Colors.white, fontWeight: 'bold' },
  unreadBadge: { backgroundColor: Colors.primary, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: Colors.text, fontSize: 18, fontWeight: '600', marginTop: 15 },
});

export default HomeScreen;
