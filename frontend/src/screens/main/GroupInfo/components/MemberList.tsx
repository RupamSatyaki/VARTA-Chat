import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../../../theme/colors';
import { User } from '../types';

interface MemberListProps {
  users: User[];
  adminId: string;
  currentUserId: string;
  isAdmin: boolean;
  onRemoveMember: (userId: string) => void;
}

const MemberList: React.FC<MemberListProps> = ({ users, adminId, currentUserId, isAdmin, onRemoveMember }) => {
  return (
    <View style={styles.container}>
      {users.map((user, index) => (
        <Animated.View 
          key={user._id} 
          entering={FadeInDown.delay(index * 50)} 
          style={styles.memberItem}
        >
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
              style={styles.avatar} 
            />
            {user._id === adminId && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={10} color={Colors.white} />
              </View>
            )}
          </View>
          
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {user.name || user.number} 
              {user._id === currentUserId && <Text style={styles.youText}> (You)</Text>}
            </Text>
            <Text style={styles.memberStatus} numberOfLines={1}>
              {user.status || "Hey there! I am using VARTA."}
            </Text>
          </View>

          {isAdmin && user._id !== currentUserId && (
            <TouchableOpacity onPress={() => onRemoveMember(user._id)} style={styles.removeBtn}>
              <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
            </TouchableOpacity>
          )}
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  adminBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E1E1E',
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
  youText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: 'normal',
  },
  memberStatus: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
});

export default MemberList;
