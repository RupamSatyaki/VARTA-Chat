import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
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
  latestMessage?: {
    content: string;
    sender: {
      name: string;
    };
  };
}

type RootStackParamList = {
  Home: undefined;
  Chat: { user: User; chat: Chat };
  Login: undefined;
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isFocused && currentUser) {
      fetchChats();
    }
  }, [isFocused, currentUser]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setChats(data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch chats');
      }
    } catch (error) {
      console.error('Fetch chats error:', error);
      Alert.alert('Connection Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.isGroupChat) {
      return chat.chatName;
    }
    const otherUser = chat.users.find(u => u._id !== currentUser?._id);
    return otherUser?.name || otherUser?.number || 'Unknown User';
  };

  const handleChatPress = (chat: Chat) => {
    const otherUser = chat.users.find(u => u._id !== currentUser?._id);
    if (otherUser) {
      navigation.navigate('Chat', { user: otherUser, chat });
    }
  };
  
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      navigation.replace('Login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      activeOpacity={0.7}
      onPress={() => handleChatPress(item)}
    >
      <Image 
        source={{ uri: item.users.find(u => u._id !== currentUser?._id)?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
        style={styles.avatar} 
      />
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{getChatDisplayName(item)}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.latestMessage 
            ? `${item.latestMessage.sender.name}: ${item.latestMessage.content}`
            : 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VARTA</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
  },
  chatName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  lastMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
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