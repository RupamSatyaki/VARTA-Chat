import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  TextInput,
  Image
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
  FadeInDown,
  FadeOut
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../../theme/colors';
import { useAuthStore } from '../../../store/useAuthStore';
import apiClient from '../../../api/apiClient';

// Modular Components
import { SectionHeader, InfoCard, ActionButton, SettingItem } from './components/InfoComponents';
import MediaGallery from './components/MediaGallery';
import MemberList from './components/MemberList';
import { Chat, User } from './types';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = width * 0.8;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 110 : 90;
const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const GroupInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { chat: initialChat } = route.params;
  const [chat, setChat] = useState<Chat>(initialChat);
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);

  // Add Member States
  const [showAddModal, setShowAddModal] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingUsers, setFetchingUsers] = useState(false);

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const fetchChatDetails = async () => {
    try {
      const response = await apiClient.get('/chats');
      const updatedChat = response.data.find((c: any) => c._id === chat._id);
      if (updatedChat) setChat(updatedChat);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMediaCount = async () => {
    try {
      const response = await apiClient.get(`/messages/media/${chat._id}`);
      if (response.data.success) {
        const { media, links, docs } = response.data.data;
        setMediaCount(media.length + links.length + docs.length);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setFetchingUsers(true);
      const response = await apiClient.get('/users');
      if (response.data.success) {
        // Filter out users already in the group
        const existingUserIds = chat.users.map(u => u._id);
        const filtered = response.data.data.filter((u: User) => !existingUserIds.includes(u._id) && u._id !== userData?._id);
        setAllUsers(filtered);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setFetchingUsers(false);
    }
  };

  React.useEffect(() => {
    fetchMediaCount();
  }, [chat._id]);

  const adminId = typeof chat.groupAdmin === 'object' ? chat.groupAdmin._id : chat.groupAdmin;
  const isAdmin = adminId === userData?._id;

  const handleAddMember = async (userId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.put('/chats/groupadd', {
        chatId: chat._id,
        userId
      });
      if (response.data) {
        setShowAddModal(false);
        fetchChatDetails();
        Alert.alert("Success", "Member added successfully");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.response?.data?.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

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

  const filteredAvailableUsers = allUsers.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.number.includes(searchQuery)
  );

  // Header Animation Styles
  const headerStyle = useAnimatedStyle(() => {
    const headerHeight = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT], Extrapolate.CLAMP);
    return { height: headerHeight };
  });

  // Hero image fades out as we scroll
  const heroStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.6], [1, 0], Extrapolate.CLAMP);
    return { opacity };
  });

  // Compact bar fades in when nearly collapsed
  const compactBarStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [SCROLL_DISTANCE * 0.7, SCROLL_DISTANCE], [0, 1], Extrapolate.CLAMP);
    return { opacity };
  });

  const imageOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, SCROLL_DISTANCE / 2], [0.3, 0], Extrapolate.CLAMP);
    return { opacity };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        
        {/* Hero layer — full image with name at bottom (visible when expanded) */}
        <Animated.View style={[StyleSheet.absoluteFillObject, heroStyle]}>
          <Animated.Image 
            source={{ uri: chat.groupProfilePic || 'https://cdn-icons-png.flaticon.com/512/615/615075.png' }} 
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <Animated.View style={[styles.imageOverlay, imageOverlayStyle]} />
          <View style={styles.nameContainer}>
            <Text style={styles.userName} numberOfLines={1}>{chat.chatName}</Text>
            <Text style={styles.userStatus}>{chat.users?.length} members</Text>
          </View>
        </Animated.View>

        {/* Compact bar layer — avatar + name row (visible when collapsed) */}
        <Animated.View style={[styles.compactBar, compactBarStyle]} pointerEvents="none">
          <Animated.Image
            source={{ uri: chat.groupProfilePic || 'https://cdn-icons-png.flaticon.com/512/615/615075.png' }}
            style={styles.compactAvatar}
          />
          <Text style={styles.compactName} numberOfLines={1}>{chat.chatName}</Text>
        </Animated.View>

        {/* Back button — always on top */}
        <SafeAreaView style={styles.headerTop} edges={['top']}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
        </SafeAreaView>

      </Animated.View>

      <Animated.ScrollView 
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT }}
      >
        <View style={styles.content}>
          {/* Main Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <ActionButton icon="call-outline" label="Audio" />
            <ActionButton icon="videocam-outline" label="Video" />
            <ActionButton icon="search-outline" label="Search" />
            <ActionButton icon="notifications-outline" label="Mute" onPress={() => setIsMuted(!isMuted)} color={isMuted ? Colors.gray : Colors.primary} />
          </View>

          {/* Description */}
          <InfoCard>
            <Text style={styles.sectionTitleSmall}>Description</Text>
            <Text style={styles.bioText}>
              {chat.description || "Welcome to the group! Please respect each other and keep the conversation productive."}
            </Text>
          </InfoCard>

          {/* Shared Media Section */}
          <SectionHeader 
            title="Media, Links, and Docs" 
            count={mediaCount} 
            onPress={() => navigation.navigate('SharedMedia' as never, { chatId: chat._id, chatName: chat.chatName } as never)}
          />
          <MediaGallery chatId={chat._id} />

          {/* Settings Section */}
          <View style={styles.settingsGroup}>
            <SettingItem icon="notifications-outline" title="Mute Notifications" value={<Switch value={isMuted} onValueChange={setIsMuted} trackColor={{ false: '#333', true: Colors.primary }} />} />
            <SettingItem icon="lock-closed-outline" title="Encryption" subtitle="Messages are end-to-end encrypted." color={Colors.primary} />
          </View>

          {/* Members List */}
          <SectionHeader title="Members" count={chat.users?.length} />
          {isAdmin && (
            <TouchableOpacity 
              style={styles.addMemberRow} 
              onPress={() => {
                fetchAllUsers();
                setShowAddModal(true);
              }}
            >
              <View style={styles.addIconCircle}>
                <Ionicons name="person-add" size={20} color={Colors.white} />
              </View>
              <Text style={styles.addMemberText}>Add Members</Text>
            </TouchableOpacity>
          )}
          <MemberList 
            users={chat.users} 
            adminId={adminId} 
            currentUserId={userData?._id || ''} 
            isAdmin={isAdmin} 
            onRemoveMember={handleRemoveMember} 
          />

          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <TouchableOpacity style={styles.dangerItem}>
              <Ionicons name="exit-outline" size={22} color={Colors.error} />
              <Text style={styles.dangerText}>Exit Group</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity style={styles.dangerItem}>
                <Ionicons name="trash-outline" size={22} color={Colors.error} />
                <Text style={styles.dangerText}>Delete Group</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Spacer for bottom */}
          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {/* Add Member Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Member</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or number"
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {fetchingUsers ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
            ) : (
              <FlatList
                data={filteredAvailableUsers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.userItem} 
                    onPress={() => handleAddMember(item._id)}
                  >
                    <Image 
                      source={{ uri: item.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                      style={styles.userAvatar} 
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userNameText}>{item.name || "User"}</Text>
                      <Text style={styles.userNumberText}>{item.number}</Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No users found</Text>
                }
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    ...Platform.select({ web: { height: '100vh', maxHeight: '100vh', overflow: 'hidden' } })
  },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  headerTop: {
    paddingHorizontal: 16,
    zIndex: 110,
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  nameContainer: {
    position: 'absolute',
    bottom: 20, left: 20, right: 20,
    zIndex: 105,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.white,
    textShadow: '0px 2px 4px rgba(0,0,0,0.5)',
  },
  userStatus: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  compactBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 12,
    paddingLeft: 60,
    paddingRight: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  compactName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingTop: 20,
    minHeight: SCREEN_HEIGHT,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    marginTop: 10, // Added more space from the top
    marginBottom: 10,
  },
  sectionTitleSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  settingsGroup: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  addMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  addIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  addMemberText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.02)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.1)',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  dangerText: {
    flex: 1,
    fontSize: 16,
    color: Colors.error,
    marginLeft: 15,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: SCREEN_HEIGHT * 0.8,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    paddingHorizontal: 15,
    borderRadius: 15,
    height: 45,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    marginLeft: 10,
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userNameText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  userNumberText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 15,
  }
});

export default GroupInfoScreen;
