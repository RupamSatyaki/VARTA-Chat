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
import { useSocket } from '../../context/SocketContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { Colors } from '../../theme/colors';

import apiClient from '../../api/apiClient';

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
  const [loading, setLoading] = useState(false);
  
  const { socket, isConnected } = useSocket();
  const { userData } = useAuthStore();
  const { messages, setMessages, addMessage } = useChatStore();
  
  const chatMessages = messages[chat._id] || [];
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/messages/${userData?._id}/${user._id}`);
      const data = response.data;

      if (data.success) {
        const formattedMessages = data.data.map((m: any) => ({
          id: m._id,
          content: m.content,
          senderId: m.sender,
          receiverId: m.receiver,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(chat._id, formattedMessages);
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (socket) {
      socket.emit('join-chat', chat._id);

      socket.on('message-received', (newMessage: any) => {
        if (newMessage.chatId === chat._id) {
          const formattedMsg: Message = {
            id: newMessage._id || Date.now().toString(),
            content: newMessage.content,
            senderId: newMessage.senderId,
            receiverId: newMessage.receiverId,
            timestamp: newMessage.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addMessage(chat._id, formattedMsg);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('message-received');
      }
    };
  }, [chat._id, socket]);

  const handleSendMessage = () => {
    if (message.trim().length === 0 || !userData || !socket) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      senderId: userData._id,
      receiverId: user._id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    socket.emit('new-message', { ...newMessage, chatId: chat._id });
    addMessage(chat._id, newMessage);
    setMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === userData?._id;
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
            <Text style={styles.status}>{isConnected ? 'Online' : 'Connecting...'}</Text>
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
          data={chatMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => {
            if (chatMessages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onLayout={() => {
            if (chatMessages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
          overScrollMode="always"
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
