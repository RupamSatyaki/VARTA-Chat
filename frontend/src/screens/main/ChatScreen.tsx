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
  const { user, chat } = route.params;
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const socket = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async (userId: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${apiUrl}/messages/${userId}/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const formattedMessages = data.data.map((m: any) => ({
          id: m._id,
          content: m.content,
          senderId: m.sender,
          receiverId: m.receiver,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUser = JSON.parse(storedUserData);
        setCurrentUser(parsedUser);
        await fetchMessages(parsedUser._id);

        const socketUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
        socket.current = io(socketUrl);
        socket.current.emit('setup', parsedUser);
        
        socket.current.on('connected', () => setSocketConnected(true));
        socket.current.emit('join-chat', chat._id);

        socket.current.on('message-received', (newMessage: any) => {
          if (newMessage.chatId === chat._id) {
            const formattedMsg: Message = {
              id: newMessage._id || Date.now().toString(),
              content: newMessage.content,
              senderId: newMessage.senderId,
              receiverId: newMessage.receiverId,
              timestamp: newMessage.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, formattedMsg]);
          }
        });
      }
    };
    initializeChat();
    return () => {
      if (socket.current) socket.current.disconnect();
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
    socket.current.emit('new-message', { ...newMessage, chatId: chat._id });
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Header (Fixed) */}
      <View style={styles.header}>
        <SafeAreaView />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Image source={{ uri: user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{user.name || user.number}</Text>
            <Text style={styles.status}>{socketConnected ? 'Online' : 'Connecting...'}</Text>
          </View>
          <TouchableOpacity style={styles.btn}><Ionicons name="videocam" size={22} color={Colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.btn}><Ionicons name="call" size={20} color={Colors.primary} /></TouchableOpacity>
        </View>
      </View>

      {/* 2. Chat Area (Scrollable) */}
      <View style={styles.chatArea}>
        {loading && <ActivityIndicator style={styles.loader} color={Colors.primary} />}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={true}
          style={styles.flatList}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        />
      </View>

      {/* 3. Footer Area (Pinned at bottom using KeyboardAvoidingView) */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.footerWrapper}
      >
        <View style={styles.footerContainer}>
          <View style={styles.footer}>
            <View style={styles.inputBox}>
              <TouchableOpacity style={styles.btn}><Ionicons name="happy-outline" size={24} color={Colors.textSecondary} /></TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Message"
                placeholderTextColor={Colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
              />
              <TouchableOpacity style={styles.btn}><Ionicons name="attach" size={24} color={Colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Ionicons name={message.trim() ? "send" : "mic"} size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <SafeAreaView edges={['bottom']} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    // Ensure container doesn't grow on web
    height: Platform.OS === 'web' ? '100vh' : '100%',
    maxHeight: Platform.OS === 'web' ? '100vh' : '100%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.lightGray,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 5 : 5,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginHorizontal: 10,
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  chatArea: {
    flex: 1, // Take all available space
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    padding: 15,
    paddingBottom: 20, // Space for the last message
    flexGrow: 1,
  },
  messageWrapper: {
    marginVertical: 4,
    maxWidth: '85%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: Colors.white,
    fontSize: 15,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  footerWrapper: {
    width: '100%',
    zIndex: 200, // Keep in front
  },
  footerContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.lightGray,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 25,
    paddingHorizontal: 5,
    minHeight: 45,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  btn: {
    padding: 8,
  },
  sendBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  loader: {
    paddingVertical: 20,
  }
});

export default ChatScreen;
