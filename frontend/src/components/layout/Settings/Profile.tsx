import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { Colors } from '../../../theme/colors';
import { useChatStore } from '../../../store/useChatStore';

interface ProfileProps {
  user: any;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const [imgError, setImgError] = React.useState(false);
  const isOnline = user?._id ? onlineUsers.has(user._id) : false;

  const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  const profilePicUri = (!user?.profilePic || imgError) ? DEFAULT_AVATAR : user.profilePic;

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <Image 
          source={{ uri: profilePicUri }} 
          style={styles.avatar} 
          onError={() => {
            console.log('Failed to load profile pic, falling back to default');
            setImgError(true);
          }}
        />
        {isOnline && <View style={styles.onlineBadge} />}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{user?.name || 'VARTA User'}</Text>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4ADE80',
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  info: {
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusContainer: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  onlineText: {
    color: '#4ADE80',
  },
  offlineText: {
    color: Colors.textSecondary,
  },
});

export default Profile;
