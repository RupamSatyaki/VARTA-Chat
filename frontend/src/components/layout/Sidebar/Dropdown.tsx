import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ScaleInCenter, ScaleOutCenter } from 'react-native-reanimated';
import { Colors } from '../../../theme/colors';

interface DropdownProps {
  isVisible: boolean;
  onLogout: () => void;
}

const Dropdown: React.FC<DropdownProps> = ({ isVisible, onLogout }) => {
  if (!isVisible) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(150)}
      style={styles.overlay}
    >
      <Animated.View 
        entering={ScaleInCenter.duration(200)}
        exiting={ScaleOutCenter.duration(150)}
        style={styles.dropdown}
      >
        <TouchableOpacity style={styles.item} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.text}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
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
    padding: 8,
    minWidth: 140,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      }
    }),
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
