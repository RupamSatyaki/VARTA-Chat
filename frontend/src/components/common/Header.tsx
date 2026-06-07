import React from 'react';
import { StyleSheet, View, TextInput, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface HeaderProps {
  title?: string;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onMenuPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ searchValue, onSearchChange, onMenuPress }) => {
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

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={Colors.textSecondary}
          value={searchValue}
          onChangeText={onSearchChange}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 25,
    marginLeft: 10,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    height: '100%',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default Header;
