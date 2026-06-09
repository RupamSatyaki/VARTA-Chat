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
import ShimmerLoader from '../../components/common/ShimmerLoader';

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

const UserSkeleton = () => (
  <View style={styles.userItem}>
    <ShimmerLoader width={50} height={50} borderRadius={25} />
    <View style={styles.userInfo}>
      <ShimmerLoader width="50%" height={16} borderRadius={4} />
      <ShimmerLoader width="30%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  </View>
);

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
      Alert.alert('Connection Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (userData && user._id === userData._id) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      user.number.toLowerCase().includes(query) ||
      (user.name && user.name.toLowerCase().includes(query)) ||
      (user.username && user.username.toLowerCase().includes(query))
    );
  });

  const handleUserPress = async (user: User) => {
    console.log("handleUserPress called with user:", user);
    try {
      if (!userToken) {
        console.log("Token not found");
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ userId: user._id }),
      });

      const chat = await response.json();

      if (response.ok) {
        navigation.navigate('Chat', { user, chat });
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
          <View style={styles.listContent}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <UserSkeleton key={i} />)}
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            style={{ flex: 1 }}
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
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
      },
      default: {
        flex: 1,
      }
    })
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 6,
    marginRight: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 38,
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
    flexGrow: 1,
    minHeight: '100%',
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
