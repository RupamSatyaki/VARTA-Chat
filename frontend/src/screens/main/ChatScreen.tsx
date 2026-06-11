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
  Alert,
  Modal,
  Pressable
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
  fullDate: string; // ISO string for day comparison
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
  callMeta?: {
    callType: 'audio' | 'video';
    status: 'completed' | 'missed' | 'rejected';
    duration: number;
  };
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
          style={[style, { color: '#34B7F1', textDecorationLine: 'underline', flexShrink: 1 }]}
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

  return <Text style={[style, { flexWrap: 'wrap', flexShrink: 1 }]}>{renderContent()}</Text>;
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
  REACTIONS,
  onCallBubblePress,
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
  onCallBubblePress: (msg: Message) => void;
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

          <View style={{ position: 'relative' }}>
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
              ) : item.type === 'call' && item.callMeta ? (() => {
                const { status, callType, duration } = item.callMeta;
                const missed  = status === 'missed';
                const rejected = status === 'rejected';
                const completed = status === 'completed';

                // Status-specific colors
                const statusColor = completed ? '#4ade80' : rejected ? '#f97316' : '#FF6B6B';
                const bgColor = completed
                  ? 'rgba(74,222,128,0.12)'
                  : rejected
                  ? 'rgba(249,115,22,0.12)'
                  : 'rgba(255,107,107,0.12)';

                // Main icon in circle — call type + direction
                const mainIcon: any = callType === 'video'
                  ? completed
                    ? 'videocam'
                    : rejected
                    ? 'videocam-off'
                    : 'videocam-off'
                  : completed
                    ? 'call'
                    : rejected
                    ? 'call'
                    : 'call';

                // Small badge icon on top-right of circle
                const badgeIcon: any = completed
                  ? (isMe ? 'arrow-up-circle' : 'arrow-down-circle')
                  : rejected
                  ? 'close-circle'
                  : 'alert-circle';

                const callLabel = callType === 'video' ? 'Video Call' : 'Voice Call';

                const formatDuration = (s: number) => {
                  if (s <= 0) return null;
                  const m = Math.floor(s / 60);
                  const sec = s % 60;
                  return m > 0 ? `${m} min ${sec > 0 ? `${sec} sec` : ''}` : `${sec} sec`;
                };

                const statusLabel = completed
                  ? formatDuration(duration) ?? 'Connected'
                  : rejected
                  ? 'Declined'
                  : 'Missed';

                const directionLabel = isMe
                  ? completed ? 'Outgoing' : 'Cancelled'
                  : completed ? 'Incoming' : missed ? 'Missed' : 'Declined';

                const joinedParticipants = item.callMeta.participants?.filter(p => p.status === 'joined') || [];

                return (
                  <TouchableOpacity activeOpacity={0.85} onPress={() => onCallBubblePress(item)} style={styles.callCard}>
                    {/* Icon circle + call info */}
                    <View style={styles.callCardTop}>
                      <View style={styles.callIconWrapper}>
                        <View style={[styles.callIconCircle, { backgroundColor: bgColor }]}>
                          <Ionicons name={mainIcon} size={22} color={statusColor} />
                        </View>
                        {/* Badge */}
                        <View style={[styles.callIconBadge, { backgroundColor: Colors.background }]}>
                          <Ionicons name={badgeIcon} size={14} color={statusColor} />
                        </View>
                      </View>
                      <View style={styles.callCardInfo}>
                        <Text style={styles.callCardLabel}>{callLabel}</Text>
                        <Text style={styles.callCardDirection}>{directionLabel}</Text>
                        
                        {/* Show joined participants for group calls */}
                        {chat.isGroupChat && joinedParticipants.length > 0 ? (
                          <View style={styles.joinedParticipantsContainer}>
                            <Text style={styles.joinedLabel}>Joined:</Text>
                            <Text style={styles.joinedNames} numberOfLines={1}>
                              {joinedParticipants.map(p => p.name).join(', ')}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.callCardStatusRow}>
                            <Ionicons
                              name={completed ? 'time-outline' : 'close-outline'}
                              size={11}
                              color={statusColor}
                            />
                            <Text style={[styles.callCardStatus, { color: statusColor }]}>
                              {statusLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.callCardDivider} />

                    {/* Call back row */}
                    <View style={styles.callCardFooter}>
                      <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={14} color={Colors.primary} />
                      <Text style={styles.callBackText}>
                        {callType === 'video' ? 'Video call back' : 'Call back'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })() : (
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
            </View>

            {item.reactions && item.reactions.length > 0 && !item.isDeleted && (
              <View style={[
                styles.messageReactions,
                isMe ? { right: 6 } : { left: 6 }
              ]}>
                {Array.from(new Set(item.reactions.map(r => r.emoji))).map((emoji, idx) => (
                  <Text key={idx} style={styles.appliedReaction}>{emoji}</Text>
                ))}
                {item.reactions.length > 1 && (
                  <Text style={styles.reactionCount}>{item.reactions.length}</Text>
                )}
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
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [callbackTarget, setCallbackTarget] = useState<Message | null>(null);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const { socket, isConnected } = useSocket();
  const { userData, userToken } = useAuthStore();
  const { initiateCall } = useCall();
  const { 
    messages, 
    setMessages, 
    appendMessages,
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

  const fetchMessages = useCallback(async (before?: string) => {
    if (!chat?._id) return;
    try {
      if (!before) setLoading(true);
      else setIsLoadingMore(true);

      const response = await apiClient.get(`/messages/${chat._id}`, {
        params: {
          limit: 20,
          before: before
        }
      });
      
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
          fullDate: m.createdAt,
          replyTo: m.replyTo,
          reactions: m.reactions,
          linkPreview: m.linkPreview,
          isEdited: m.isEdited,
          isDeleted: m.isDeleted,
          callMeta: m.callMeta,
          readBy: m.readBy,
          deliveredTo: m.deliveredTo,
        }));
        
        if (formattedMessages.length < 20) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        if (before) {
          appendMessages(chat._id, formattedMessages);
        } else {
          // Initial load: Find first unread message
          // A message is unread if I am NOT in the readBy array
          const firstUnread = [...formattedMessages].reverse().find((m: Message) => 
            m.senderId !== userData?._id && !m.readBy?.some(r => r.user === userData?._id)
          );
          if (firstUnread) {
            setFirstUnreadId(firstUnread.id);
          }
          setMessages(chat._id, formattedMessages);
        }
        
        // Mark as seen only on initial load or if we fetched unread ones
        if (!before && socket && userData) {
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
      setIsLoadingMore(false);
    }
  }, [chat._id, user._id, userData?._id, socket, setMessages, appendMessages, chat.isGroupChat]);

  const loadMoreMessages = () => {
    if (!hasMore || isLoadingMore || chatMessages.length === 0) return;
    const oldestMessage = chatMessages[chatMessages.length - 1];
    console.log('🔄 Loading more messages before:', oldestMessage.fullDate);
    fetchMessages(oldestMessage.fullDate);
  };

  useEffect(() => {
    fetchMessages();
  }, [chat._id]);

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
      quality: 0.5, // Lower quality = smaller upload, Cloudinary handles final quality
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPendingImage(result.assets[0].uri);
    }
  };

  const handleImageUpload = async (uri: string) => {
    try {
      setUploadingImage(true);
      console.log('📸 Starting upload for:', uri);

      const formData = new FormData();
      const filename = uri.split('/').pop()?.split('?')[0] || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        // On web, uri is a blob/data URL — fetch it, resize via canvas, then upload
        const res = await fetch(uri);
        const blob = await res.blob();

        // Resize via canvas to max 1280px
        const compressedBlob = await new Promise<Blob>((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            const MAX = 1280;
            let { width, height } = img;
            if (width > MAX || height > MAX) {
              if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
              else { width = Math.round((width * MAX) / height); height = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.75);
          };
          img.src = URL.createObjectURL(blob);
        });

        const file = new File([compressedBlob], filename.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        formData.append('image', file);
      } else {
        // Native: use the RN-specific object structure
        // @ts-ignore
        formData.append('image', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: filename,
          type,
        });
      }

      console.log('📤 Sending FormData to backend...');

      const response = await apiClient.post('/messages/upload', formData, {
        headers: { 'Accept': 'application/json' },
        transformRequest: (data, headers) => {
          delete headers['Content-Type']; // Let browser set boundary automatically
          return data;
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
      fullDate: new Date().toISOString(),
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
            fullDate: newMessage.createdAt || new Date().toISOString(),
            replyTo: newMessage.replyTo,
            reactions: newMessage.reactions || [],
            linkPreview: newMessage.linkPreview,
            isEdited: newMessage.isEdited,
            isDeleted: newMessage.isDeleted,
            callMeta: newMessage.callMeta,
            readBy: newMessage.readBy || [],
            deliveredTo: newMessage.deliveredTo || [],
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
  }, [chat._id, socket, userData?._id, addMessage, updateMessageStatus, updateMessageReactions, markMessagesAsSeen, updateMessageId, setTyping, chat.isGroupChat, updateMessage]);

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
    if (!userData || !socket) return;

    // If there's a pending image, upload and send it
    if (pendingImage) {
      handleImageUpload(pendingImage);
      setPendingImage(null);
      return;
    }

    if (message.trim().length === 0) return;
    
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
      fullDate: new Date().toISOString(),
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

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) return 'TODAY';
    if (messageDate.getTime() === yesterday.getTime()) return 'YESTERDAY';

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    }).toUpperCase();
  };

  const shouldShowDateDivider = (item: Message, index: number) => {
    // In inverted FlatList:
    // index 0 is newest
    // index length-1 is oldest
    
    if (index === chatMessages.length - 1) return true; // Oldest item always has divider
    const olderItem = chatMessages[index + 1];
    const olderDate = new Date(olderItem.fullDate).toDateString();
    const currentDate = new Date(item.fullDate).toDateString();
    return currentDate !== olderDate;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === userData?._id;
    const isFirstUnread = item.id === firstUnreadId;
    const showDateDivider = shouldShowDateDivider(item, index);
    
    return (
      <>
        {isFirstUnread && (
          <View style={styles.unreadDivider}>
            <View style={styles.unreadDividerLine} />
            <View style={styles.unreadDividerContent}>
              <Text style={styles.unreadDividerText}>UNREAD MESSAGES</Text>
            </View>
            <View style={styles.unreadDividerLine} />
          </View>
        )}
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
          onCallBubblePress={setCallbackTarget}
        />
        {showDateDivider && (
          <View style={styles.dateDivider}>
            <View style={styles.dateDividerContent}>
              <Text style={styles.dateDividerText}>{formatDateDivider(item.fullDate)}</Text>
            </View>
          </View>
        )}
      </>
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
              onPress={() => initiateCall(user._id, chat.isGroupChat ? chat.chatName : (user.name || user.number), chat.isGroupChat ? 'https://cdn-icons-png.flaticon.com/512/615/615075.png' : user.profilePic, 'video', chat._id)}
            >
              <Ionicons name="videocam" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btn} 
              onPress={() => initiateCall(user._id, chat.isGroupChat ? chat.chatName : (user.name || user.number), chat.isGroupChat ? 'https://cdn-icons-png.flaticon.com/512/615/615075.png' : user.profilePic, 'audio', chat._id)}
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
            inverted={true}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator style={{ marginVertical: 10 }} color={Colors.primary} />
              ) : null
            }
            onScroll={(e) => {
              const { contentOffset } = e.nativeEvent;
              setShowScrollDown(contentOffset.y > 300);
            }}
            scrollEventThrottle={100}
            showsVerticalScrollIndicator={true}
            style={{ flex: 1, height: '100%' }}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
          />
          {showScrollDown && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.scrollDownBtn}>
              <TouchableOpacity onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}>
                <Ionicons name="chevron-down" size={22} color={Colors.white} />
              </TouchableOpacity>
            </Animated.View>
          )}
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
              
              {pendingImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: pendingImage }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setPendingImage(null)}>
                    <Ionicons name="close-circle" size={18} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Message"
                  placeholderTextColor={Colors.textSecondary}
                  value={message}
                  onChangeText={handleTextChange}
                  multiline
                />
              )}

              <TouchableOpacity style={styles.btn} onPress={handleImagePick} disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="attach" size={24} color={pendingImage ? Colors.primary : Colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Ionicons name={message.trim() || pendingImage ? "send" : "mic"} size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Call back bottom sheet */}
      <Modal
        visible={!!callbackTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setCallbackTarget(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setCallbackTarget(null)}>
          <Animated.View entering={FadeInDown.duration(250)} style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Call back</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setCallbackTarget(null);
                initiateCall(user._id, user.name || user.number, user.profilePic, 'audio');
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: 'rgba(74,222,128,0.12)' }]}>
                <Ionicons name="call" size={22} color="#4ade80" />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>Voice Call</Text>
                <Text style={styles.sheetOptionSub}>Regular audio call</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setCallbackTarget(null);
                initiateCall(user._id, user.name || user.number, user.profilePic, 'video');
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: 'rgba(138,43,226,0.12)' }]}>
                <Ionicons name="videocam" size={22} color={Colors.primary} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>Video Call</Text>
                <Text style={styles.sheetOptionSub}>Face-to-face call</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancel} onPress={() => setCallbackTarget(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
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
    paddingVertical: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  messageWrapper: {
    marginVertical: 2,
    maxWidth: '82%',
    zIndex: 20,
    paddingBottom: 8,
    flexShrink: 1,
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageContainer: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 1,
    width: '100%',
    overflow: 'visible',
  },
  selectedMessageContainer: {
    backgroundColor: 'rgba(52, 183, 241, 0.12)',
  },
  messageBubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 60,
    flexShrink: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  activeBubble: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  otherBubble: {
    backgroundColor: '#1E1E2E',
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  messageText: {
    color: Colors.white,
    fontSize: 15,
    lineHeight: 21,
    flexShrink: 1,
    flexWrap: 'wrap',
    ...Platform.select({
      web: { wordBreak: 'break-all' },
      default: {},
    }),
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 2,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginRight: 2,
  },
  tickIcon: {
    marginLeft: 2,
  },
  replyContext: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 8,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    marginBottom: 7,
  },
  replySender: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  replyContent: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  callCard: {
    width: 210,
    borderRadius: 12,
    overflow: 'hidden',
  },
  callCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
  },
  callIconWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  callIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIconBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    borderRadius: 9,
    padding: 1,
  },
  callCardInfo: {
    flex: 1,
    gap: 2,
  },
  callCardLabel: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  callCardDirection: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
  },
  callCardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  callCardStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  joinedParticipantsContainer: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinedLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
  },
  joinedNames: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  callCardDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
  callCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
  callBackText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
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
    position: 'absolute',
    bottom: -12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.background,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
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
    borderRadius: 26,
    paddingHorizontal: 6,
    minHeight: 46,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  imagePreviewContainer: {
    flex: 1,
    height: 44,
    marginVertical: 4,
    marginHorizontal: 4,
    position: 'relative',
  },
  imagePreview: {
    width: 60,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    left: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
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
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  sheetOptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: {
    flex: 1,
    gap: 2,
  },
  sheetOptionTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  sheetOptionSub: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  sheetCancel: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  sheetCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  scrollDownBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  unreadDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  unreadDividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  unreadDividerContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unreadDividerText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dateDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  dateDividerContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  dateDividerText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default ChatScreen;
