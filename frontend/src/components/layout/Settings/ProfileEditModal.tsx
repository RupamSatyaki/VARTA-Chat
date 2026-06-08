import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';
import { useAuthStore } from '../../../store/useAuthStore';
import apiClient from '../../../api/apiClient';

interface ProfileEditModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isVisible, onClose }) => {
  const { userData, updateUser } = useAuthStore();
  const [name, setName] = useState(userData?.name || '');
  const [username, setUsername] = useState(userData?.username || '');
  const [profilePic, setProfilePic] = useState(userData?.profilePic || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.put('/users/profile', {
        name,
        username,
        profilePic
      });

      if (response.data.success) {
        // Use the new updateUser action to sync store and storage
        await updateUser(response.data.data);
        Alert.alert('Success', 'Profile updated successfully');
        onClose();
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.modalText}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.avatarSection}>
              <Image 
                source={{ uri: profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                style={styles.avatar} 
              />
              <Text style={styles.avatarHint}>Enter image URL below</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile Picture URL</Text>
              <TextInput
                style={styles.input}
                value={profilePic}
                onChangeText={setProfilePic}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, loading && styles.disabledBtn]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalView: {
    width: '85%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    // Modern Box Shadow (SDK 56+)
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeBtn: {
    padding: 5,
  },
  form: {
    width: '100%',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarHint: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 5,
    marginLeft: 5,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileEditModal;
