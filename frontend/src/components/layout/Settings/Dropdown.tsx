import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring 
} from 'react-native-reanimated';
import { Colors } from '../../../theme/colors';

interface DropdownProps {
  isVisible: boolean;
  onLogout: () => void;
}

const Dropdown: React.FC<DropdownProps> = ({ isVisible, onLogout }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    display: opacity.value === 0 && !isVisible ? 'none' : 'flex',
  }));

  if (!isVisible && opacity.value === 0) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.dropdown, animatedStyle]}>
        <TouchableOpacity style={styles.item} onPress={onLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.text}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 70,
    right: 15,
    zIndex: 2000,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    minWidth: 150,
    elevation: 8, // Keep elevation for Android
    // Modern Box Shadow (SDK 56+)
    boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.3)',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  text: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});

export default Dropdown;
