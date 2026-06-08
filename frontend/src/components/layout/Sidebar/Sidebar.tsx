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
  ScrollView,
  Modal
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';
import { useAuthStore } from '../../../store/useAuthStore';
import { useChatStore } from '../../../store/useChatStore';

// Components
import MenuItem from '../Settings/MenuItem';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type RootStackParamList = {
  Settings: undefined;
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
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
  }));

  const handleNavigation = (screen: string) => {
    onClose();
    if (screen === 'Settings') {
      navigation.navigate('Settings');
    }
    // Add other screens here as they are implemented
  };

  const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  const BANNER_IMAGE = 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500&auto=format&fit=crop';

  return (
    <Modal
      transparent
      visible={isOpen}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable 
            style={styles.flex1} 
            onPress={onClose}
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

            {/* Menu Options */}
            <View style={styles.menuOptions}>
              <MenuItem 
                icon="person-outline" 
                title="Contacts" 
                onPress={() => handleNavigation('Contacts')} 
              />
              <MenuItem 
                icon="call-outline" 
                title="Calls" 
                onPress={() => handleNavigation('Calls')} 
              />
              <MenuItem 
                icon="bookmark-outline" 
                title="Saved Messages" 
                onPress={() => handleNavigation('Saved')} 
              />
              <MenuItem 
                icon="settings-outline" 
                title="Settings" 
                onPress={() => handleNavigation('Settings')} 
              />
              <View style={styles.divider} />
              <MenuItem 
                icon="person-add-outline" 
                title="Invite Friends" 
                onPress={() => handleNavigation('Invite')} 
              />
              <MenuItem 
                icon="help-circle-outline" 
                title="Help" 
                onPress={() => handleNavigation('Help')} 
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex1: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.surface,
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
    elevation: 24, // Keep elevation for Android
    // Modern Box Shadow (SDK 56+)
    boxShadow: '2px 0px 10px rgba(0, 0, 0, 0.5)',
  },
  banner: {
    width: '100%',
    height: 200,
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
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
    borderColor: Colors.surface,
  },
  userInfo: {
    marginTop: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    // Modern Text Shadow (SDK 56+)
    textShadow: '0px 1px 3px rgba(0, 0, 0, 0.4)',
  },
  userNumber: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    // Modern Text Shadow (SDK 56+)
    textShadow: '0px 1px 2px rgba(0, 0, 0, 0.4)',
  },
  menuOptions: {
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 10,
  },
});

export default Sidebar;
