import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import apiClient from '../../api/apiClient';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = width * 0.8;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 110 : 90;
const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const GroupInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { chat: initialChat } = route.params;
  const [chat, setChat] = useState(initialChat);
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(false);

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

  // Animated Styles
  const headerStyle = useAnimatedStyle(() => {
    const headerHeight = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      Extrapolate.CLAMP
    );
    const backgroundColor = interpolate(
      scrollY.value,
      [SCROLL_DISTANCE - 20, SCROLL_DISTANCE],
      [0, 1]
    );
    const borderBottomWidth = interpolate(
      scrollY.value,
      [SCROLL_DISTANCE - 10, SCROLL_DISTANCE],
      [0, 0.5]
    );
    return {
      height: headerHeight,
      backgroundColor: `rgba(30, 30, 30, ${backgroundColor})`,
      borderBottomWidth,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    };
  });

  const profilePicStyle = useAnimatedStyle(() => {
    const size = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [width, 38],
      Extrapolate.CLAMP
    );
    const left = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [0, 56], // Directly after back button (16 padding + 40 backBtn width)
      Extrapolate.CLAMP
    );
    const top = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [0, Platform.OS === 'ios' ? 56 : 36],
      Extrapolate.CLAMP
    );
    const borderRadius = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [0, 19],
      Extrapolate.CLAMP
    );

    return {
      width: size,
      height: size,
      left,
      top,
      position: 'absolute',
      borderRadius,
    };
  });

  const nameTranslateX = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [0, 80], // 20 initial left + 80 = 100. (56 left + 38 size + 6 gap = 100)
      Extrapolate.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [0, -(HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) + (Platform.OS === 'ios' ? 22 : 12)],
      Extrapolate.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [1, 0.9],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX },
        { translateY },
        { scale }
      ],
      maxWidth: width - 150,
    };
  });

  const imageOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE / 2],
      [0.3, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const renderMemberItem = (member: any) => (
    <View key={member._id} style={styles.memberItem}>
      <Image 
        source={{ uri: member.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
        style={styles.memberAvatar} 
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name || member.number}</Text>
        <Text style={styles.memberStatus}>{member._id === (chat.groupAdmin?._id || chat.groupAdmin) ? 'Group Admin' : 'Member'}</Text>
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
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <Animated.Image 
          source={{ uri: chat.groupProfilePic || 'https://cdn-icons-png.flaticon.com/512/615/615075.png' }} 
          style={profilePicStyle}
        />
        
        <Animated.View style={[styles.imageOverlay, imageOverlayStyle]} />

        <SafeAreaView style={styles.headerTop} edges={['top']}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
        </SafeAreaView>

        <Animated.View style={[styles.nameContainer, nameTranslateX]}>
          <Text style={styles.userName} numberOfLines={1}>{chat.chatName}</Text>
          <Text style={styles.userStatus}>{chat.users?.length} members</Text>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView 
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT }}
      >
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
      </Animated.ScrollView>

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
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
      }
    })
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  headerTop: {
    paddingHorizontal: 16,
    zIndex: 110,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
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
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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
  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 30,
    paddingBottom: SCREEN_HEIGHT * 0.5, // Added extra padding at bottom to force scroll
    minHeight: SCREEN_HEIGHT,
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
    zIndex: 1000,
  }
});

export default GroupInfoScreen;