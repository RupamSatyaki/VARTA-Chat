import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInLeft, Layout } from 'react-native-reanimated';
import { Colors } from '../../theme/colors';

interface HeaderProps {
  title: string;
  onSearchPress?: () => void;
  onMenuPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onSearchPress, onMenuPress }) => {
  return (
    <View style={styles.container}>
      <Animated.View 
        entering={FadeInLeft.duration(800).springify()} 
        layout={Layout.springify()}
        style={styles.leftSection}
      >
        <Text style={styles.title}>{title}</Text>
      </Animated.View>

      <View style={styles.rightSection}>
        <Pressable 
          onPress={onSearchPress}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonActive,
            // @ts-ignore - hover state for web
            Platform.OS === 'web' && { cursor: 'pointer' }
          ]}
        >
          <Ionicons name="search" size={24} color={Colors.text} />
        </Pressable>

        <Pressable 
          onPress={onMenuPress}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonActive,
            // @ts-ignore - hover state for web
            Platform.OS === 'web' && { cursor: 'pointer' }
          ]}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.text} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  leftSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: 'transparent', // Default transparent
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Visible on press/select
  },
});

export default Header;
