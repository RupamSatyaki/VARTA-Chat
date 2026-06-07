import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  StatusBar,
  Image
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import apiClient from '../../api/apiClient';
import { Colors } from '../../theme/colors';

type RootStackParamList = {
  Home: undefined;
  Chat: { user: any; chat: any };
  Login: undefined;
  Search: undefined;
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  
  const { socket } = useSocket();
  const { userData, logout } = useAuthStore();
  const { 
    chats, 
    setChats, 
    updateChatFromMessage, 
    updateChatStatus, 
    syncChatSeen 
  } = useChatStore();

  const isMe = useCallback((sender: any) => {
    if (!sender || !userData) return false;
    const senderId = typeof sender === 'object' ? sender._id : sender;
    return senderId === userData._id;
  }, [userData]);

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
  }, [setChats]);

  useEffect(() => {
    if (isFocused && userData) {
      fetchChats();
    }
  }, [isFocused, userData, fetchChats]);

  useEffect(() => {
    if (socket && userData) {
      const handleMessageReceived = (newMessage: any) => {
        const chatExists = chats.some(c => c._id === newMessage.chatId);
        if (!chatExists) {
          fetchChats(false);
        } else {
          updateChatFromMessage(newMessage, isMe(newMessage.senderId));
        }
      };

      const handleMessageSent = ({ message: savedMsg }: any) => {
        const chatExists = chats.some(c => c._id === savedMsg.chat);
        if (!chatExists) {
          fetchChats(false);
        } else {
          updateChatFromMessage(savedMsg, true);
        }
      };

      const handleStatusUpdated = ({ messageId, chatId, status }: any) => {
        updateChatStatus(chatId, messageId, status);
      };

      const handleMessagesSeen = ({ chatId, receiverId }: any) => {
        syncChatSeen(chatId, receiverId, userData._id);
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
  }, [socket, userData, chats, fetchChats, updateChatFromMessage, updateChatStatus, syncChatSeen, isMe]);

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

  const getChatDisplayName = (chat: any) => {
    if (chat.isGroupChat) return chat.chatName;
    const otherUser = chat.users.find((u: any) => u._id !== userData?._id);
    return otherUser?.name || otherUser?.number || 'Unknown';
  };

  const handleChatPress = (chat: any) => {
    const otherUser = chat.users.find((u: any) => u._id !== userData?._id);
    if (otherUser) {
      // Optmistic reset unread count
      syncChatSeen(chat._id, userData?._id || '', userData?._id || '');
      navigation.navigate('Chat', { user: otherUser, chat });
    }
  };

  const renderChatItem = ({ item }: { item: any }) => {
    const latestMsg = item.latestMessage;
    const isLatestFromMe = latestMsg && isMe(latestMsg.sender);
    const hasUnread = (item.unreadCount || 0) > 0;

    const renderStatusIcon = () => {
      if (!isLatestFromMe || !latestMsg) return null;
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
          source={{ uri: item.users.find((u: any) => u._id !== userData?._id)?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
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
