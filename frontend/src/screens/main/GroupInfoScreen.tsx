import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import apiClient from '../../api/apiClient';

const { width } = Dimensions.get('window');

const GroupInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { chat: initialChat } = route.params;
  const [chat, setChat] = useState(initialChat);
  const { userData, userToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const fetchChatDetails = async () => {
    try {
      const response = await apiClient.get('/chats');
      const updatedChat = response.data.find((c: any) => c._id === chat._id);
      if (updatedChat) setChat(updatedChat);
    } catch (error) {
      console.error(error);
    }
  };

  const isAdmin = chat.groupAdmin?._id === userData?._id || chat.groupAdmin === userData?._id;

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin) return;
    
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await apiClient.put('/chats/groupremove', {
                chatId: chat._id,
                userId
              });
              if (response.data) {
                Alert.alert("Success", "Member removed successfully");
                fetchChatDetails();
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to remove member");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderMemberItem = (member: any) => (
    <View key={member._id} style={styles.memberItem}>
      <Image 
        source={{ uri: member.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
        style={styles.memberAvatar} 
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name || member.number}</Text>
        <Text style={styles.memberStatus}>{member._id === chat.groupAdmin?._id ? 'Group Admin' : 'Member'}</Text>
      </View>
      {isAdmin && member._id !== userData?._id && (
        <TouchableOpacity onPress={() => handleRemoveMember(member._id)}>
          <Ionicons name="close-circle-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header with Image */}
        <View style={styles.imageHeader}>
          <Image 
            source={{ uri: chat.groupProfilePic || 'https://cdn-icons-png.flaticon.com/512/615/615075.png' }} 
            style={styles.profilePic} 
            resizeMode="cover"
          />
          <View style={styles.headerOverlay}>
            <SafeAreaView edges={['top']}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
            </SafeAreaView>
            
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{chat.chatName}</Text>
              <Text style={styles.userStatus}>{chat.users?.length} members</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.bioText}>
              {chat.description || "No description provided."}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Members List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Members</Text>
              {isAdmin && (
                <TouchableOpacity style={styles.addBtn}>
                  <Ionicons name="person-add-outline" size={20} color={Colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {chat.users?.map((user: any) => renderMemberItem(user))}
          </View>

          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="exit-outline" size={22} color={Colors.error} />
              <Text style={[styles.actionText, { color: Colors.error }]}>Exit Group</Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity style={styles.actionItem}>
                <Ionicons name="trash-outline" size={22} color={Colors.error} />
                <Text style={[styles.actionText, { color: Colors.error }]}>Delete Group</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  imageHeader: {
    width: width,
    height: width * 0.8,
    position: 'relative',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    paddingBottom: 20,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textShadow: '0px 2px 4px rgba(0,0,0,0.5)',
  },
  userStatus: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 30,
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bioText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginTop: 10,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  memberAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 15,
  },
  memberName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  memberStatus: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtnText: {
    color: Colors.primary,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 10,
    marginHorizontal: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 15,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default GroupInfoScreen;