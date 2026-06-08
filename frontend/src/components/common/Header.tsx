import React from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface HeaderProps {
  onSearchPress?: () => void;
  onMenuPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSearchPress, onMenuPress }) => {
  return (
    <View style={styles.container}>
      <Pressable 
        onPress={onMenuPress}
        style={({ pressed }) => [
          styles.menuButton,
          pressed && styles.iconButtonActive,
          Platform.OS === 'web' && { cursor: 'pointer' }
        ]}
      >
        <Ionicons name="menu" size={28} color={Colors.text} />
      </Pressable>

      <Pressable 
        onPress={onSearchPress}
        style={styles.searchContainer}
      >
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <View style={styles.searchPlaceholder}>
          <Text style={styles.searchText}>Search...</Text>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuButton: {
    padding: 6,
    borderRadius: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginLeft: 12,
    paddingHorizontal: 12,
    height: 38,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    justifyContent: 'center',
  },
  searchText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default Header;
