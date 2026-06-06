import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  KeyboardAvoidingView, 
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { Colors } from '../../theme/colors';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  timestamp: string;
}

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user, chat } = route.params; // The other user we are chatting with and the chat object
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const socket = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    console.log("ChatScreen loaded with user:", user, "and chat:", chat);
    const initializeChat = async () => {
      // 1. Get current user
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUser = JSON.parse(storedUserData);
        setCurrentUser(parsedUser);

        // 2. Initialize Socket
        const socketUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
        socket.current = io(socketUrl);

        socket.current.emit('setup', parsedUser);
        
        socket.current.on('connected', () => {
          setSocketConnected(true);
          console.log('📡 Socket Connected');
        });

        // 3. Join unique chat room
        socket.current.emit('join-chat', chat._id);

        // 4. Listen for incoming messages
        socket.current.on('message-received', (newMessage: Message) => {
          setMessages((prev) => [...prev, newMessage]);
        });
      }
    };

    initializeChat();

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [chat._id]);

  const handleSendMessage = () => {
    if (message.trim().length === 0 || !currentUser) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      senderId: currentUser._id,
      receiverId: user._id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    // Emit message to backend
    socket.current.emit('new-message', {
      ...newMessage,
      chatId: chat._id
    });

    setMessages((prev) => [...prev, newMessage]);
    setMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUser?._id;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Custom Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Image 
          source={{ uri: user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
          style={styles.avatar} 
        />
        
        <View style={styles.headerInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user.name || `User ${user.number.slice(-4)}`}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: socketConnected ? '#4CAF50' : Colors.gray }]} />
            <Text style={styles.userStatus}>{socketConnected ? 'Online' : 'Connecting...'}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionIcon}>
            <Ionicons name="videocam" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <Ionicons name="call" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.inputIcon}>
              <Ionicons name="happy-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor={Colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            
            <TouchableOpacity style={styles.inputIcon}>
              <Ionicons name="attach" size={24} color={Colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSendMessage}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={message.length > 0 ? "send" : "mic"} 
              size={24} 
              color={Colors.white} 
              style={message.length > 0 ? { marginLeft: 3 } : {}}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    padding: 5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  userStatus: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    padding: 8,
    marginLeft: 5,
  },
  messageList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginVertical: 4,
    width: '100%',
  },
  myMessageWrapper: {
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    color: Colors.white,
    fontSize: 15,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 25,
    paddingHorizontal: 10,
    minHeight: 48,
    maxHeight: 120,
  },
  inputIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 8,
    marginHorizontal: 5,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default ChatScreen;
