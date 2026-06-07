import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { Colors } from '../../../theme/colors';

interface ProfileProps {
  user: any;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <Image 
          source={{ uri: user?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
          style={styles.avatar} 
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{user?.name || 'VARTA User'}</Text>
        <Text style={styles.number}>{user?.number}</Text>
        {user?.username && <Text style={styles.username}>@{user.username}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  info: {
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  number: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  username: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 2,
  },
});

export default Profile;
