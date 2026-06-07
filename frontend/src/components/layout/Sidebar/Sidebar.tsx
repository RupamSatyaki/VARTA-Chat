import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Dimensions, 
  Pressable,
  Platform,
  Text
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { Colors } from '../../../theme/colors';
import { useAuthStore } from '../../../store/useAuthStore';

// Modular Components
import Header from './Header';
import Profile from './Profile';
import MenuItem from './MenuItem';
import Dropdown from './Dropdown';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);
  const { userData, logout } = useAuthStore();

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
      setIsDropdownVisible(false);
    }
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    display: backdropOpacity.value === 0 ? 'none' : 'flex',
  }));

  const handleLogout = async () => {
    setIsDropdownVisible(false);
    onClose();
    await logout();
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.flex1} onPress={onClose} />
      </Animated.View>

      {/* Drawer Content */}
      <Animated.View style={[styles.drawer, animatedStyle]}>
        <View style={{ zIndex: 10 }}>
          <Header 
            onClose={onClose} 
            onMorePress={() => setIsDropdownVisible(!isDropdownVisible)}
            onEditPress={() => console.log('Edit Profile')}
          />
          
          <Dropdown 
            isVisible={isDropdownVisible} 
            onLogout={handleLogout} 
          />
        </View>

        <Profile user={userData} />

        <View style={styles.menuList}>
          <MenuItem icon="person-outline" title="Account" />
          <MenuItem icon="notifications-outline" title="Notifications" />
          <MenuItem icon="lock-closed-outline" title="Privacy" />
          <MenuItem icon="color-palette-outline" title="Appearance" />
          <MenuItem icon="help-circle-outline" title="Help" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>VARTA v1.0.0</Text>
        </View>
      </Animated.View>
    </>
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.3, shadowRadius: 5 },
      android: { elevation: 16 },
      web: { boxShadow: '2px 0 10px rgba(0,0,0,0.3)' }
    }),
  },
  menuList: {
    flex: 1,
    paddingTop: 10,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.6,
  },
});

export default Sidebar;
