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
  FlatList,
  Linking,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSocket } from '../../context/SocketContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { Colors } from '../../theme/colors';
import { useCall } from '../../context/CallContext';

import { Swipeable, RectButton } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown, FadeOut, ScaleInCenter } from 'react-native-reanimated';

import apiClient from '../../api/apiClient';

interface Message {
  id: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'document';
  senderId: string;
  senderName?: string;
  receiverId?: string;
  timestamp: string;
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
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ClickableText = ({ text, style, disabled }: { text: string; style: any; disabled?: boolean }) => {
  const urlRegex = /(https?:\/\/[^\s]+)|(\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b(\/[^\s]*)?)/g;
  const parts = text.split(urlRegex);

  // Filter out undefined from regex groups
  const filteredParts = text.match(urlRegex) || [];
  
  // We need a more reliable way to split and keep matches
  const renderContent = () => {
    const elements = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex index
    urlRegex.lastIndex = 0;
    
    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        elements.push(
          <Text key={`text-${lastIndex}`} style={style}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }
      
      const url = match[0];
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      
      elements.push(
        <Text
          key={`link-${match.index}`}
          style={[style, { color: '#34B7F1', textDecorationLine: 'underline' }]}
          onPress={disabled ? undefined : () => Linking.openURL(fullUrl).catch(err => console.error("Couldn't load page", err))}
        >
          {url}
        </Text>
      );
      
      lastIndex = urlRegex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <Text key={`text-${lastIndex}`} style={style}>
          {text.substring(lastIndex)}
        </Text>
      );
    }
    
    return elements;
  };

  return <Text style={style}>{renderContent()}</Text>;
};

const MessageItem = React.memo(({ 
  item, 
  isMe, 
  chat, 
  userData, 
  handleReply, 
  selectedMessages,
  setSelectedMessages,
  handleReaction,
  REACTIONS 
}: { 
  item: Message; 
  isMe: boolean; 
  chat: any; 
  userData: any; 
  handleReply: (msg: Message) => void; 
  selectedMessages: string[];
  setSelectedMessages: React.Dispatch<React.SetStateAction<string[]>>;
  handleReaction: (msgId: string, emoji: string) => void;
  REACTIONS: string[];
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  const isSelected = selectedMessages.includes(item.id);

  const toggleSelection = () => {
    if (item.isDeleted) return;
    
    if (selectedMessages.length > 0) {
      if (isSelected) {
        setSelectedMessages(prev => prev.filter(id => id !== item.id));
      } else {
        setSelectedMessages(prev => [...prev, item.id]);
      }
    }
  };

  const onLongPress = () => {
    if (item.isDeleted) return;
    if (!isSelected) {
      setSelectedMessages(prev => [...prev, item.id]);
    }
  };

  const onSwipeOpen = () => {
    if (item.isDeleted || selectedMessages.length > 0) {
      swipeableRef.current?.close();
      return;
    }
    handleReply(item);
    setTimeout(() => {
      swipeableRef.current?.close();
    }, 100);
  };

  const handleLinkPress = () => {
    if (item.linkPreview?.url) {
      Linking.openURL(item.linkPreview.url).catch(err => console.error("Couldn't load page", err));
    }
  };

  const renderStatusIcon = () => {
    if (!isMe || chat.isGroupChat || item.isDeleted) return null;
    
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

  const renderActions = () => (
    <View style={styles.replyActionContainer}>
      <Ionicons name="arrow-undo" size={24} color={Colors.primary} />
    </View>
  );

  return (
    <View style={[
      styles.messageContainer, 
      isSelected && styles.selectedMessageContainer,
      isSelected && { zIndex: 9999, elevation: 11 }
    ]}>
      {isSelected && selectedMessages.length === 1 && (
        <Animated.View 
          entering={FadeInDown.duration(200)} 
          exiting={FadeOut.duration(150)}
          style={[
            styles.reactionContainer, 
            isMe ? { right: 15 } : { left: 15 }
          ]}
        >
          {REACTIONS.map((emoji) => (
            <TouchableOpacity 
              key={emoji} 
              onPress={() => handleReaction(item.id, emoji)}
              style={styles.reactionTouch}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={item.isDeleted ? undefined : renderActions}
        renderRightActions={item.isDeleted ? undefined : renderActions}
        onSwipeableOpen={onSwipeOpen}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        containerStyle={{ zIndex: isSelected ? 999 : 1 }}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={toggleSelection}
          onLongPress={onLongPress}
          style={[
            styles.messageWrapper, 
            isMe ? styles.myMessageWrapper : styles.otherMessageWrapper,
            isSelected && { zIndex: 1000, elevation: 10 }
          ]}
        >

          <View style={[
            styles.messageBubble, 
            isMe ? styles.myBubble : styles.otherBubble,
            isSelected && styles.activeBubble,
            item.isDeleted && styles.deletedBubble
          ]}>
            {!isMe && chat.isGroupChat && item.senderName && (
              <Text style={styles.senderName}>{item.senderName}</Text>
            )}
            
            {item.replyTo && !item.isDeleted && (
              <View style={styles.replyContext}>
                <Text style={styles.replySender}>{item.replyTo.sender?.name}</Text>
                <Text style={styles.replyContent} numberOfLines={1}>{item.replyTo.content}</Text>
              </View>
            )}

            {item.linkPreview && !item.isDeleted && (
              <TouchableOpacity 
                onPress={handleLinkPress}
                style={styles.linkPreviewContainer}
                disabled={selectedMessages.length > 0}
              >
                {item.linkPreview.image && (
                  <Image 
                    source={{ uri: item.linkPreview.image }} 
                    style={styles.linkImage} 
                    resizeMode="cover"
                  />
                )}
                <View style={styles.linkTextContainer}>
                  {item.linkPreview.siteName && (
                    <Text style={styles.linkSiteName}>{item.linkPreview.siteName}</Text>
                  )}
                  {item.linkPreview.title && (
                    <Text style={styles.linkTitle} numberOfLines={2}>{item.linkPreview.title}</Text>
                  )}
                  {item.linkPreview.description && (
                    <Text style={styles.linkDescription} numberOfLines={2}>{item.linkPreview.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {item.type === 'image' && !item.isDeleted ? (
              <View style={styles.messageImageContainer}>
                <Image 
                  source={{ uri: item.content }} 
                  style={styles.messageImage} 
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <ClickableText 
                  text={item.content} 
                  style={[
                    styles.messageText,
                    item.isDeleted && styles.deletedText
                  ]}
                  disabled={selectedMessages.length > 0}
                />
                {item.isEdited && !item.isDeleted && (
                  <Text style={styles.editedTag}> (edited)</Text>
                )}
              </View>
            )}
            
            <View style={styles.messageFooter}>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
              {renderStatusIcon()}
            </View>

            {item.reactions && item.reactions.length > 0 && !item.isDeleted && (
              <View style={styles.messageReactions}>
                {Array.from(new Set(item.reactions.map(r => r.emoji))).map((emoji, idx) => (
                  <Text key={idx} style={styles.appliedReaction}>{emoji}</Text>
                ))}
                <Text style={styles.reactionCount}>{item.reactions.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
});

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user, chat } = route.params;
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  
  const { socket, isConnected } = useSocket();
  const { userData, userToken } = useAuthStore();
  const { initiateCall } = useCall();
  const { 
    messages, 
    setMessages, 
    addMessage, 
    updateMessageStatus, 
    updateMessageReactions,
    markMessagesAsSeen, 
    updateMessageId,
    typingStatus,
    setTyping,
    userStatuses,
    updateMessage
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
          type: m.type || 'text',
          senderId: typeof m.sender === 'string' ? m.sender : m.sender._id,
          senderName: typeof m.sender === 'object' ? m.sender.name : null,
          receiverId: m.receiver,
          status: m.status,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          replyTo: m.replyTo,
          reactions: m.reactions,
          linkPreview: m.linkPreview,
          isEdited: m.isEdited,
          isDeleted: m.isDeleted,
        }));
        setMessages(chat._id, formattedMessages);
        
        // Mark these messages as seen in the backend
        if (socket && userData) {
          socket.emit('message-seen', {
            chatId: chat._id,
            senderId: chat.isGroupChat ? null : user._id, 
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

  const handleImagePick = async () => {
    // Safety check for native module availability
    if (!ImagePicker.launchImageLibraryAsync) {
      Alert.alert(
        'Build Required',
        'Image Picker requires a native build. Please run "npx expo run:android" in your terminal to install the full VARTA app on your phone.'
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7, // Slightly lower for faster uploads
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleImageUpload(result.assets[0].uri);
    }
  };

  const handleImageUpload = async (uri: string) => {
    try {
      setUploadingImage(true);
      console.log('📸 Starting upload for:', uri);

      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpg`;

      // @ts-ignore - FormData needs this specific structure in React Native
      formData.append('image', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: type,
      });

      console.log('📤 Sending FormData to backend...');

      // Note: We DON'T manually set 'Content-Type' to let Axios handle boundaries correctly
      const response = await apiClient.post('/messages/upload', formData, {
        headers: {
          'Accept': 'application/json',
        },
        transformRequest: (data, headers) => {
          return data; // Prevents Axios from stringifying FormData
        },
      });

      console.log('📥 Backend Response:', response.data);

      if (response.data.success) {
        sendImageMessage(response.data.url);
      }
    } catch (error: any) {
      console.error('❌ Upload error details:', error.response?.data || error.message);
      Alert.alert('Upload Failed', error.response?.data?.message || 'Server connection issue');
    } finally {
      setUploadingImage(false);
    }
  };

  const sendImageMessage = (imageUrl: string) => {
    if (!userData || !socket) return;

    const newMessage: any = {
      id: Date.now().toString(),
      content: imageUrl,
      type: 'image',
      senderId: userData._id,
      receiverId: chat.isGroupChat ? null : user._id,
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo ? {
        _id: replyingTo.id,
        content: replyingTo.content,
        sender: { name: replyingTo.senderName || 'User' }
      } : null
    };

    socket.emit('new-message', { 
      ...newMessage, 
      chatId: chat._id,
      replyTo: replyingTo?.id 
    });

    addMessage(chat._id, newMessage);
    setReplyingTo(null);
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
            type: newMessage.type || 'text',
            senderId: newMessage.senderId,
            senderName: newMessage.senderName,
            receiverId: newMessage.receiverId,
            status: chat.isGroupChat ? 'sent' : 'seen', 
            timestamp: newMessage.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            replyTo: newMessage.replyTo,
            reactions: newMessage.reactions || [],
            linkPreview: newMessage.linkPreview,
            isEdited: newMessage.isEdited,
            isDeleted: newMessage.isDeleted,
          };
          addMessage(chat._id, formattedMsg);

          socket.emit('message-seen', {
            chatId: chat._id,
            senderId: chat.isGroupChat ? null : newMessage.senderId,
            receiverId: userData?._id
          });
        }
      });

      socket.on('message-sent', ({ tempId, message: savedMsg }: any) => {
        updateMessageId(chat._id, tempId, savedMsg._id, {
          linkPreview: savedMsg.linkPreview,
          type: savedMsg.type
        });
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

      socket.on('message-reacted', ({ messageId, reactions, chatId }: any) => {
        if (chatId === chat._id) {
          updateMessageReactions(chatId, messageId, reactions);
        }
      });

      socket.on('message-updated', (updatedData: any) => {
        if (updatedData.chatId === chat._id) {
          updateMessage(chat._id, updatedData.messageId, {
            content: updatedData.content,
            isEdited: updatedData.isEdited,
            isDeleted: updatedData.isDeleted,
            type: updatedData.type,
            linkPreview: updatedData.linkPreview
          });
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
        socket.off('message-reacted');
        socket.off('message-updated');
        socket.off('typing');
        socket.off('stop-typing');
      }
    };
  }, [chat._id, socket, userData?._id, fetchMessages, addMessage, updateMessageStatus, updateMessageReactions, markMessagesAsSeen, updateMessageId, setTyping, chat.isGroupChat, updateMessage]);

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socket || !userData) return;
    socket.emit('add-reaction', {
      messageId,
      userId: userData._id,
      emoji,
      chatId: chat._id
    });
    setSelectedMessages([]);
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    setSelectedMessages([]);
  };

  const handleEdit = (msg: Message) => {
    setEditingMessage(msg);
    setMessage(msg.content);
    setSelectedMessages([]);
  };

  const handleDelete = (msgId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message for everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            if (socket) {
              socket.emit('delete-message', {
                messageId: msgId,
                chatId: chat._id
              });
            }
            setSelectedMessages([]);
          }
        }
      ]
    );
  };

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

    if (editingMessage) {
      socket.emit('edit-message', {
        messageId: editingMessage.id,
        newContent: message,
        chatId: chat._id
      });
      
      // Optimistic update
      updateMessage(chat._id, editingMessage.id, { 
        content: message,
        isEdited: true 
      });
      
      setMessage('');
      setEditingMessage(null);
      return;
    }

    const newMessage: any = {
      id: Date.now().toString(),
      content: message,
      senderId: userData._id,
      receiverId: chat.isGroupChat ? null : user._id,
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo ? {
        _id: replyingTo.id,
        content: replyingTo.content,
        sender: { name: replyingTo.senderName || 'User' }
      } : null
    };

    socket.emit('new-message', { 
      ...newMessage, 
      chatId: chat._id,
      replyTo: replyingTo?.id 
    });

    addMessage(chat._id, newMessage);
    setMessage('');
    setReplyingTo(null);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === userData?._id;
    
    return (
      <MessageItem
        item={item}
        isMe={isMe}
        chat={chat}
        userData={userData}
        handleReply={handleReply}
        selectedMessages={selectedMessages}
        setSelectedMessages={setSelectedMessages}
        handleReaction={handleReaction}
        REACTIONS={REACTIONS}
      />
    );
  };

  const handleHeaderPress = () => {
    if (chat.isGroupChat) {
      navigation.navigate('GroupInfo' as never, { chat } as never);
    } else {
      navigation.navigate('UserProfile' as never, { user, chat } as never);
    }
  };

  const getFirstSelectedMessage = () => {
    if (selectedMessages.length === 0) return null;
    return chatMessages.find(m => m.id === selectedMessages[0]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        {selectedMessages.length > 0 ? (
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setSelectedMessages([])} style={styles.btn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.name}>{selectedMessages.length} selected</Text>
            </View>
            
            {selectedMessages.length === 1 && (
              <TouchableOpacity 
                onPress={() => {
                  const msg = getFirstSelectedMessage();
                  if (msg) handleReply(msg);
                }} 
                style={styles.btn}
              >
                <Ionicons name="arrow-undo" size={22} color={Colors.text} />
              </TouchableOpacity>
            )}
            
            <View style={{ position: 'relative' }}>
              <TouchableOpacity onPress={() => setShowHeaderMenu(!showHeaderMenu)} style={styles.btn}>
                <Ionicons name="ellipsis-vertical" size={22} color={Colors.text} />
              </TouchableOpacity>
              
              {showHeaderMenu && (
                <View style={styles.headerMenu}>
                  {selectedMessages.length === 1 && (() => {
                    const selectedMsg = getFirstSelectedMessage();
                    if (selectedMsg && String(selectedMsg.senderId) === String(userData?._id) && !selectedMsg.isDeleted) {
                      return (
                        <>
                          <TouchableOpacity 
                            style={styles.menuItem} 
                            onPress={() => { handleEdit(selectedMsg); setShowHeaderMenu(false); }}
                          >
                            <Ionicons name="pencil" size={18} color={Colors.text} />
                            <Text style={styles.menuText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.menuItem} 
                            onPress={() => { handleDelete(selectedMsg.id); setShowHeaderMenu(false); }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                            <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete</Text>
                          </TouchableOpacity>
                        </>
                      );
                    }
                    return null;
                  })()}
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setSelectedMessages([]); setShowHeaderMenu(false); }}>
                    <Ionicons name="information-circle-outline" size={18} color={Colors.text} />
                    <Text style={styles.menuText}>Info</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : (
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

            <TouchableOpacity 
              style={styles.btn} 
              onPress={() => initiateCall(user._id, user.name || user.number, user.profilePic, 'video')}
            >
              <Ionicons name="videocam" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btn} 
              onPress={() => initiateCall(user._id, user.name || user.number, user.profilePic, 'audio')}
            >
              <Ionicons name="call" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn}><Ionicons name="ellipsis-vertical" size={20} color={Colors.text} /></TouchableOpacity>
          </View>
        )}
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
            onContentSizeChange={(w, h) => {
              // Only scroll to end when messages change, not on every layout change
              // Actually FlatList might need this for new messages
            }}
            onLayout={() => {
              // Initial scroll
              if (chatMessages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            showsVerticalScrollIndicator={true}
            style={{ flex: 1, height: '100%' }}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
          />
        </View>

        {/* 3. Footer Input */}
        <SafeAreaView style={styles.footerContainer} edges={['bottom']}>
          {replyingTo && (
            <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.replyPreview}>
              <View style={styles.replyBar} />
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replySender}>{replyingTo.senderName || 'User'}</Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.content}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.closeReply}>
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          )}
          {editingMessage && (
            <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.replyPreview}>
              <View style={[styles.replyBar, { backgroundColor: Colors.secondary }]} />
              <View style={styles.replyPreviewContent}>
                <Text style={[styles.replySender, { color: Colors.secondary }]}>Edit Message</Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>{editingMessage.content}</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setMessage(''); }} style={styles.closeReply}>
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          )}
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
              <TouchableOpacity style={styles.btn} onPress={handleImagePick} disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="attach" size={24} color={Colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
                )}
              </TouchableOpacity>
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
    zIndex: 1000,
    elevation: 10,
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
    paddingVertical: 10,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageWrapper: {
    marginVertical: 4,
    maxWidth: '85%',
    zIndex: 20, // Higher than the background overlay
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageContainer: {
    position: 'relative',
    paddingHorizontal: 15,
    width: '100%',
    overflow: 'visible',
  },
  selectedMessageContainer: {
    backgroundColor: 'rgba(52, 183, 241, 0.15)',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    minWidth: 60,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  activeBubble: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    color: Colors.secondary,
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
  replyContext: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    marginBottom: 6,
  },
  replySender: {
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyContent: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  messageImageContainer: {
    width: 240,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  messageImage: {
    width: '100%',
    height: '100%',
  },
  linkPreviewContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  linkImage: {
    width: '100%',
    height: 120,
  },
  linkTextContainer: {
    padding: 10,
  },
  linkSiteName: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  messageReactions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: -8,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  appliedReaction: {
    fontSize: 12,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  reactionContainer: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2C',
    padding: 8,
    borderRadius: 30,
    position: 'absolute',
    top: -52,
    zIndex: 10000,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  reactionTouch: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reactionEmoji: {
    fontSize: 26,
  },
  headerMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 8,
    width: 150,
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuText: {
    color: Colors.text,
    fontSize: 16,
    marginLeft: 12,
  },
  deletedBubble: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  deletedText: {
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    fontSize: 13,
  },
  editedTag: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  replyActionContainer: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.lightGray,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  replyBar: {
    width: 4,
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  replyPreviewContent: {
    flex: 1,
    marginLeft: 10,
  },
  replyPreviewText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  closeReply: {
    padding: 5,
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