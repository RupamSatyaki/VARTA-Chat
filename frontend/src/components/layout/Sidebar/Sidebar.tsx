import React from 'react';
import { 
  StyleSheet, 
  View, 
  Dimensions, 
  Pressable,
  Platform,
  Text,
  Image,
  ImageBackground,
  ScrollView
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';
import { useAuthStore } from '../../../store/useAuthStore';
import { useChatStore } from '../../../store/useChatStore';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);
  const { userData } = useAuthStore();
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const isOnline = userData?._id ? onlineUsers.has(userData._id) : false;

  React.useEffect(() => {
    if (isOpen) {
      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      backdropOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    display: backdropOpacity.value === 0 ? 'none' : 'flex',
  }));

  const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  const BANNER_IMAGE = 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500&auto=format&fit=crop';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable 
          style={styles.flex1} 
          onPress={onClose}
          android_ripple={{ color: 'transparent' }}
        />
      </Animated.View>

      {/* Drawer Content */}
      <Animated.View style={[styles.drawer, animatedStyle]}>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {/* Profile Banner Section */}
          <ImageBackground 
            source={{ uri: BANNER_IMAGE }} 
            style={styles.banner}
          >
            <View style={styles.bannerOverlay}>
              {/* Back Button */}
              <View style={styles.headerTop}>
                <Pressable 
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.pressed
                  ]}
                >
                  <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </Pressable>
              </View>

              <View style={styles.profileContent}>
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: userData?.profilePic || DEFAULT_AVATAR }} 
                    style={styles.avatar} 
                  />
                  {isOnline && <View style={styles.onlineStatus} />}
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {userData?.name || 'VARTA User'}
                  </Text>
                  <Text style={styles.userNumber}>
                    {userData?.number || ''}
                  </Text>
                </View>
              </View>
            </View>
          </ImageBackground>

          {/* Any other content can go here */}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.surface,
    zIndex: 1000,
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 24,
      },
      web: {
        boxShadow: '5px 0 15px rgba(0,0,0,0.5)',
      },
    }),
  },
  banner: {
    width: '100%',
    height: 200, // Slightly increased height to accommodate back button
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'space-between', // Changed to space-between for top/bottom content
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16, // Extra padding for iOS status bar
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginLeft: -8, // Align icon with the edge
    borderRadius: 20,
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileContent: {
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  userInfo: {
    marginTop: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  userNumber: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default Sidebar;
