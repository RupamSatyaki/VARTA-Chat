import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Platform,
  StatusBar,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  status?: 'sent' | 'delivered' | 'seen';
}

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user, chat } = route.params;
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { socket, isConnected } = useSocket();
  const { userData, userToken } = useAuthStore();
  const { 
    messages, 
    setMessages, 
    addMessage, 
    updateMessageStatus, 
    markMessagesAsSeen, 
    updateMessageId,
    typingStatus,
    setTyping,
    userStatuses
  } = useChatStore();
  
  const chatMessages = messages[chat._id] || [];
  const isOtherUserTyping = typingStatus[chat._id] || false;
  const otherUserStatus = userStatuses[user._id];

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getStatusText = () => {
    if (isOtherUserTyping) return 'typing...';
    
    if (otherUserStatus?.status === 'online') return 'Online';
    
    if (otherUserStatus?.lastSeen || user.lastSeen) {
      const lastSeen = otherUserStatus?.lastSeen || user.lastSeen;
      const date = new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'last seen just now';
      if (diffMins < 60) return `last seen ${diffMins}m ago`;
      if (diffHours < 24) return `last seen ${diffHours}h ago`;
      
      return `last seen ${date.toLocaleDateString()}`;
    }
    
    return isConnected ? 'Offline' : 'Connecting...';
  };

  const fetchMessages = useCallback(async () => {
    if (!chat?._id) return;
    try {
      setLoading(true);
      const response = await apiClient.get(`/messages/${chat._id}`);
      const data = response.data;

      if (data.success) {
        const formattedMessages = data.data.map((m: any) => ({
          id: m._id,
          content: m.content,
          senderId: typeof m.sender === 'string' ? m.sender : m.sender._id,
          senderName: typeof m.sender === 'object' ? m.sender.name : null,
          receiverId: m.receiver,
          status: m.status,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(chat._id, formattedMessages);
        
        // Mark these messages as seen in the backend
        if (socket && userData && !chat.isGroupChat) {
          socket.emit('message-seen', {
            chatId: chat._id,
            senderId: user._id, 
            receiverId: userData._id
          });
        }
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  }, [chat._id, user._id, userData?._id, socket, setMessages, chat.isGroupChat]);

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
            senderName: newMessage.senderName,
            receiverId: newMessage.receiverId,
            status: chat.isGroupChat ? 'sent' : 'seen', 
            timestamp: newMessage.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addMessage(chat._id, formattedMsg);

          if (!chat.isGroupChat) {
            socket.emit('message-seen', {
              chatId: chat._id,
              senderId: newMessage.senderId,
              receiverId: userData?._id
            });
          }
        }
      });

      socket.on('message-sent', ({ tempId, message: savedMsg }: any) => {
        updateMessageId(chat._id, tempId, savedMsg._id);
      });

      socket.on('message-status-updated', ({ messageId, chatId, status }: any) => {
        if (chatId === chat._id) {
          updateMessageStatus(chatId, messageId, status);
        }
      });

      socket.on('messages-seen', ({ chatId, receiverId }: any) => {
        if (chatId === chat._id) {
          markMessagesAsSeen(chatId, userData?._id || '');
        }
      });

      socket.on('typing', ({ chatId, userId }: any) => {
        if (chatId === chat._id) setTyping(chatId, true);
      });

      socket.on('stop-typing', ({ chatId, userId }: any) => {
        if (chatId === chat._id) setTyping(chatId, false);
      });
    }

    return () => {
      if (socket) {
        socket.off('message-received');
        socket.off('message-status-updated');
        socket.off('messages-seen');
        socket.off('message-sent');
        socket.off('typing');
        socket.off('stop-typing');
      }
    };
  }, [chat._id, socket, userData?._id, fetchMessages, addMessage, updateMessageStatus, markMessagesAsSeen, updateMessageId, setTyping, chat.isGroupChat]);

  const handleTextChange = (text: string) => {
    setMessage(text);
    if (!socket || !isConnected) return;

    socket.emit('typing', { 
      chatId: chat._id, 
      receiverId: chat.isGroupChat ? null : user._id 
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { 
        chatId: chat._id, 
        receiverId: chat.isGroupChat ? null : user._id 
      });
    }, 2000);
  };

  const handleSendMessage = () => {
    if (message.trim().length === 0 || !userData || !socket) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('stop-typing', { 
        chatId: chat._id, 
        receiverId: chat.isGroupChat ? null : user._id 
      });
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      senderId: userData._id,
      receiverId: chat.isGroupChat ? null : user._id,
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    socket.emit('new-message', { ...newMessage, chatId: chat._id });
    addMessage(chat._id, newMessage);
    setMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === userData?._id;
    
    const renderStatusIcon = () => {
      if (!isMe || chat.isGroupChat) return null;
      
      switch (item.status) {
        case 'seen':
          return <Ionicons name="checkmark-done" size={16} color="#34B7F1" style={styles.tickIcon} />;
        case 'delivered':
          return <Ionicons name="checkmark-done" size={16} color="rgba(255,255,255,0.6)" style={styles.tickIcon} />;
        case 'sent':
          return <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.6)" style={styles.tickIcon} />;
        default:
          return <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" style={styles.tickIcon} />;
      }
    };

    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {!isMe && chat.isGroupChat && item.senderName && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <Text style={styles.messageText}>{item.content}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            {renderStatusIcon()}
          </View>
        </View>
      </View>
    );
  };

  const handleHeaderPress = () => {
    if (chat.isGroupChat) {
      navigation.navigate('GroupInfo' as never, { chat } as never);
    } else {
      navigation.navigate('UserProfile' as never, { user } as never);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.userInfoWrapper} 
            onPress={handleHeaderPress}
            activeOpacity={0.7}
          >
            <Image 
              source={{ uri: chat.isGroupChat ? 'https://cdn-icons-png.flaticon.com/512/615/615075.png' : (user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png') }} 
              style={styles.avatar} 
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{chat.isGroupChat ? chat.chatName : (user.name || user.number)}</Text>
              <Text style={[
                styles.status, 
                (isOtherUserTyping || (otherUserStatus?.status === 'online')) && { color: Colors.primary, fontWeight: 'bold' }
              ]}>
                {chat.isGroupChat ? `${chat.users?.length || 0} members` : getStatusText()}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn}><Ionicons name="videocam" size={22} color={Colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.btn}><Ionicons name="call" size={20} color={Colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.btn}><Ionicons name="ellipsis-vertical" size={20} color={Colors.text} /></TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 2. Main Content Area (Chat + Input) wrapped in KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.mainContent}
      >
        <View style={styles.chatArea}>
          {loading && chatMessages.length === 0 && <ActivityIndicator style={styles.loader} color={Colors.primary} />}
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => chatMessages.length > 0 && flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => chatMessages.length > 0 && flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={true}
            style={{ flex: 1, height: '100%' }}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
          />
        </View>

        {/* 3. Footer Input */}
        <SafeAreaView style={styles.footerContainer} edges={['bottom']}>
          <View style={styles.footer}>
            <View style={styles.inputBox}>
              <TouchableOpacity style={styles.btn}><Ionicons name="happy-outline" size={24} color={Colors.textSecondary} /></TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Message"
                placeholderTextColor={Colors.textSecondary}
                value={message}
                onChangeText={handleTextChange}
                multiline
              />
              <TouchableOpacity style={styles.btn}><Ionicons name="attach" size={24} color={Colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Ionicons name={message.trim() ? "send" : "mic"} size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
      },
      default: {
        flex: 1,
      }
    })
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  userInfoWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  status: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  mainContent: {
    flex: 1,
    overflow: 'hidden', // Add this to constrain the chatArea + footer
  },
  chatArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
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
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginRight: 4,
  },
  tickIcon: {
    marginLeft: 2,
  },
  footerContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.lightGray,
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
