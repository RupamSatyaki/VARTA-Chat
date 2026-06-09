import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../theme/colors';

interface User {
  _id: string;
  name?: string;
  username?: string;
  number: string;
  profilePic?: string;
}

type RootStackParamList = {
  Home: undefined;
  Chat: { user: any; chat: any };
};

const CreateGroupScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { userData, userToken } = useAuthStore();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (userData && user._id === userData._id) return false;
    const query = searchQuery.toLowerCase();
    return (
      user.number.toLowerCase().includes(query) ||
      (user.name && user.name.toLowerCase().includes(query))
    );
  });

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      return Alert.alert('Error', 'Please enter a group name');
    }
    if (selectedUsers.length < 2) {
      return Alert.alert('Error', 'Please select at least 2 users');
    }

    try {
      setCreating(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/chats/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: groupName,
          description: description,
          users: JSON.stringify(selectedUsers.map(u => u._id)),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate to the new group chat
        // For groups, the "user" object can be a dummy or the group itself
        navigation.navigate('Chat', { 
          user: { name: data.chatName, isGroup: true, profilePic: null, _id: data._id }, 
          chat: data 
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to create group');
      }
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.find(u => u._id === item._id);
    return (
      <TouchableOpacity 
        style={styles.userItem} 
        activeOpacity={0.7}
        onPress={() => toggleUserSelection(item)}
      >
        <View style={styles.avatarWrapper}>
          <Image 
            source={{ uri: item.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
            style={styles.avatar} 
          />
          {isSelected && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={12} color={Colors.white} />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || `User ${item.number.slice(-4)}`}</Text>
          <Text style={styles.userEmail}>{item.number}</Text>
        </View>
        <Ionicons 
          name={isSelected ? "checkbox" : "square-outline"} 
          size={24} 
          color={isSelected ? Colors.primary : Colors.gray} 
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <TouchableOpacity 
          onPress={handleCreateGroup} 
          disabled={creating || selectedUsers.length < 2 || !groupName.trim()}
          style={[styles.createButton, (creating || selectedUsers.length < 2 || !groupName.trim()) && { opacity: 0.5 }]}
        >
          {creating ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.groupInfoContainer}>
        <View style={styles.groupIconPlaceholder}>
          <Ionicons name="camera" size={30} color={Colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Enter group name"
            placeholderTextColor={Colors.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
          />
          <TextInput
            style={styles.descriptionInput}
            placeholder="Add description (optional)"
            placeholderTextColor={Colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            maxLength={200}
          />
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Add people"
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedUsers.length > 0 && (
        <View style={styles.selectedUsersList}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={selectedUsers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.selectedUserItem}
                onPress={() => toggleUserSelection(item)}
              >
                <Image source={{ uri: item.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} style={styles.selectedAvatar} />
                <Text style={styles.selectedName} numberOfLines={1}>{item.name?.split(' ')[0]}</Text>
                <View style={styles.removeBadge}>
                  <Ionicons name="close" size={10} color={Colors.white} />
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  groupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupIconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupNameInput: {
    color: Colors.text,
    fontSize: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
    marginBottom: 8,
  },
  descriptionInput: {
    color: Colors.textSecondary,
    fontSize: 14,
    paddingVertical: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    paddingHorizontal: 15,
    borderRadius: 20,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  selectedUsersList: {
    height: 90,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 10,
  },
  selectedUserItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 60,
  },
  selectedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  selectedName: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  removeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.gray,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
});

export default CreateGroupScreen;