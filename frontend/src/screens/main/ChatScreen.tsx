import React, { useState } from 'react';
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
  StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
}

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = route.params; // Get user details passed from SearchScreen
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hey! How are you?', senderId: 'other', timestamp: '10:00 AM' },
    { id: '2', text: 'I am good, thanks! How about you?', senderId: 'me', timestamp: '10:01 AM' },
    { id: '3', text: 'Doing great. Working on the VARTA app!', senderId: 'other', timestamp: '10:02 AM' },
  ]);

  const handleSendMessage = () => {
    if (message.trim().length === 0) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      senderId: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setMessages([...messages, newMessage]);
    setMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === 'me';
    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
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
          <Text style={styles.userStatus}>Online</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionIcon}>
            <Ionicons name="videocam" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <Ionicons name="call" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Message List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
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
            
            {message.length === 0 && (
              <TouchableOpacity style={styles.inputIcon}>
                <Ionicons name="camera" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
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
  userStatus: {
    color: Colors.primary,
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
