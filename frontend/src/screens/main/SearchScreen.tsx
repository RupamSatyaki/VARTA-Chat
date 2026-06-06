import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/colors';

interface User {
  _id: string;
  name?: string;
  username?: string;
  number: string;
  profilePic?: string;
}

type RootStackParamList = {
  Search: undefined;
  Chat: { user: User; chat: any }; // Add chat parameter
};

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        setCurrentUser(JSON.parse(storedUserData));
      }

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
      Alert.alert('Connection Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (currentUser && user._id === currentUser._id) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      user.number.toLowerCase().includes(query) ||
      (user.name && user.name.toLowerCase().includes(query)) ||
      (user.username && user.username.toLowerCase().includes(query))
    );
  });

  const handleUserPress = async (user: User) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        // Handle case where token is not found, maybe navigate to Login
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user._id }),
      });

      const chat = await response.json();

      if (response.ok) {
        navigation.navigate('Chat', { user, chat }); // Pass both user and chat
      } else {
        Alert.alert('Error', chat.message || 'Failed to start chat');
      }
    } catch (error) {
      console.error('Start chat error:', error);
      Alert.alert('Connection Error', 'Could not connect to server');
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem} 
      activeOpacity={0.7}
      onPress={() => handleUserPress(item)}
    >
      <Image 
        source={{ uri: item.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name || `User ${item.number.slice(-4)}`}</Text>
        <Text style={styles.userEmail}>{item.number}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Search by phone or name..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Discover People</Text>
          {loading && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        {loading && users.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Fetching users...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            onRefresh={fetchUsers}
            refreshing={loading}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={60} color={Colors.gray} />
                <Text style={styles.emptyText}>
                  {searchQuery ? `No users found for "${searchQuery}"` : 'No other users found'}
                </Text>
              </View>
            }
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 45,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});

export default SearchScreen;
