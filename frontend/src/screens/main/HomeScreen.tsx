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
    content: string;
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

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/chats');
      if (response.data) {
        setChats(response.data);
      }
    } catch (error: any) {
      console.error('Fetch chats error:', error);
      // Don't show alert every time to avoid annoying user during re-fetches
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused && userData) {
      fetchChats();
    }
  }, [isFocused, userData, fetchChats]);

  useEffect(() => {
    if (socket) {
      socket.on('message-received', (newMessage: any) => {
        setChats((prevChats) => {
          const chatIndex = prevChats.findIndex(c => c._id === newMessage.chatId);
          
          if (chatIndex === -1) {
            fetchChats();
            return prevChats;
          }

          const updatedChats = [...prevChats];
          const targetChat = { ...updatedChats[chatIndex] };

          targetChat.latestMessage = {
            content: newMessage.content,
            sender: {
              _id: newMessage.senderId,
              name: newMessage.senderName,
              number: newMessage.senderNumber
            }
          };

          // Increment unread count locally
          targetChat.unreadCount = (targetChat.unreadCount || 0) + 1;

          updatedChats.splice(chatIndex, 1);
          return [targetChat, ...updatedChats];
        });
      });

      return () => {
        socket.off('message-received');
      };
    }
  }, [socket, fetchChats]);

  const getChatDisplayName = (chat: Chat) => {
    if (chat.isGroupChat) {
      return chat.chatName;
    }
    const otherUser = chat.users.find(u => u._id !== userData?._id);
    return otherUser?.name || otherUser?.number || 'Unknown User';
  };

  const handleChatPress = (chat: Chat) => {
    const otherUser = chat.users.find(u => u._id !== userData?._id);
    if (otherUser) {
      setChats(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
      navigation.navigate('Chat', { user: otherUser, chat });
    }
  };
  
  const handleLogout = async () => {
    await logout();
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const isLatestMessageFromMe = item.latestMessage?.sender._id === userData?._id;
    const senderName = item.latestMessage?.sender.name || item.latestMessage?.sender.number;
    const hasUnread = (item.unreadCount || 0) > 0;

    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        activeOpacity={0.7}
        onPress={() => handleChatPress(item)}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: item.users.find(u => u._id !== userData?._id)?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
            style={styles.avatar} 
          />
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{getChatDisplayName(item)}</Text>
            <Text style={[styles.time, hasUnread && styles.unreadTime]}>
              {item.latestMessage ? 'Now' : ''} 
            </Text>
          </View>
          
          <View style={styles.chatFooter}>
            <Text 
              style={[styles.lastMessage, hasUnread && styles.unreadMessage]} 
              numberOfLines={1}
            >
              {item.latestMessage 
                ? `${isLatestMessageFromMe ? 'You' : senderName}: ${item.latestMessage.content}`
                : 'No messages yet'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
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
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && chats.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
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
              <Text style={styles.emptySubtitle}>Start a new conversation by searching for users.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  time: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  unreadTime: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  unreadMessage: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default HomeScreen;
