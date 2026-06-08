import React from 'react';
import { StyleSheet, View, Text, Image, ImageBackground } from 'react-native';
import { Colors } from '../../../theme/colors';
import { useChatStore } from '../../../store/useChatStore';

interface SidebarProfileProps {
  user: any;
}

const SidebarProfile: React.FC<SidebarProfileProps> = ({ user }) => {
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const [imgError, setImgError] = React.useState(false);
  const isOnline = user?._id ? onlineUsers.has(user._id) : false;

  const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  const profilePicUri = (!user?.profilePic || imgError) ? DEFAULT_AVATAR : user.profilePic;

  // Default banner color/image
  const BANNER_IMAGE = 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500&auto=format&fit=crop';

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={{ uri: BANNER_IMAGE }} 
        style={styles.banner}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: profilePicUri }} 
              style={styles.avatar} 
              onError={() => setImgError(true)}
            />
            {isOnline && <View style={styles.onlineBadge} />}
          </View>
          
          <View style={styles.textInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || 'VARTA User'}
            </Text>
            <Text style={styles.number}>
              {user?.number || 'No number'}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    padding: 15,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  onlineBadge: {
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
  textInfo: {
    marginTop: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  number: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default SidebarProfile;
