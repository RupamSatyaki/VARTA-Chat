import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  StatusBar,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useCall } from '../../context/CallContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocket } from '../../context/SocketContext';
import apiClient from '../../api/apiClient';

const CallsScreen: React.FC = () => {
  const { initiateCall } = useCall();
  const { userData } = useAuthStore();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCallHistory = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await apiClient.get('/calls');
      if (response.data) {
        setCalls(response.data);
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCallHistory();
  }, [fetchCallHistory]);

  useEffect(() => {
    if (socket) {
      socket.on('call-log-updated', () => {
        console.log('📡 Call log updated, fetching fresh data...');
        fetchCallHistory(false);
      });

      return () => {
        socket.off('call-log-updated');
      };
    }
  }, [socket, fetchCallHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCallHistory(false);
  };

  const filteredCalls = activeTab === 'all' 
    ? calls 
    : calls.filter(call => call.status === 'missed' || (call.status === 'rejected' && call.receiver._id === userData?._id));

  const getStatusIcon = (call: any) => {
    const isCaller = call.caller?._id === userData?._id;
    
    if (call.status === 'completed') {
      return isCaller 
        ? <MaterialCommunityIcons name="call-made" size={16} color={Colors.primary} />
        : <MaterialCommunityIcons name="call-received" size={16} color="#4CAF50" />;
    } else if (call.status === 'missed') {
      return <MaterialCommunityIcons name="call-missed" size={18} color="#F44336" />;
    } else if (call.status === 'rejected') {
      return <MaterialCommunityIcons name="phone-cancel" size={16} color="#FF9800" />;
    } else if (call.status === 'ongoing') {
      return <MaterialCommunityIcons name="phone-in-talk" size={16} color="#2196F3" />;
    }
    return <MaterialCommunityIcons name="call-merge" size={16} color={Colors.textSecondary} />;
  };

  const getStatusText = (call: any) => {
    const isCaller = call.caller?._id === userData?._id;
    if (call.status === 'completed') return isCaller ? 'Outgoing' : 'Incoming';
    if (call.status === 'missed') return 'Missed';
    if (call.status === 'rejected') return 'Declined';
    if (call.status === 'ongoing') return 'Ongoing';
    return call.status;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const renderCallItem = ({ item }: { item: any }) => {
    const isCaller = item.caller?._id === userData?._id;
    const otherUser = isCaller ? item.receiver : item.caller;
    
    // Fallback info if user data is missing
    const displayName = otherUser?.name || otherUser?.number || 'Unknown User';
    const displayPic = otherUser?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    const otherUserId = otherUser?._id;

    const isMissed = item.status === 'missed' && !isCaller;
    const isRejected = item.status === 'rejected';

    return (
      <View style={styles.callItem}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: displayPic }} style={styles.avatar} />
          <View style={[styles.typeIndicator, { backgroundColor: item.type === 'video' ? Colors.primary : '#4CAF50' }]}>
            <Ionicons name={item.type === 'video' ? 'videocam' : 'call'} size={10} color={Colors.white} />
          </View>
        </View>
        
        <View style={styles.callInfo}>
          <Text 
            style={[
              styles.name, 
              isMissed && { color: '#F44336' }
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <View style={styles.statusRow}>
            {getStatusIcon(item)}
            <Text style={[styles.statusText, isMissed && { color: '#F44336' }]}>
              {getStatusText(item)} • {formatTime(item.startedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          {item.duration > 0 && (
            <Text style={styles.duration}>
              {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
            </Text>
          )}
          <TouchableOpacity 
            style={styles.callAction}
            onPress={() => otherUserId && initiateCall(otherUserId, displayName, displayPic, item.type)}
            disabled={!otherUserId}
          >
            <Ionicons 
              name={item.type === 'video' ? 'videocam-outline' : 'call-outline'} 
              size={24} 
              color={otherUserId ? Colors.primary : Colors.gray} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'missed' && styles.activeTab]}
          onPress={() => setActiveTab('missed')}
        >
          <Text style={[styles.tabText, activeTab === 'missed' && styles.activeTabText]}>Missed</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCalls}
        keyExtractor={(item) => item._id}
        renderItem={renderCallItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={60} color={Colors.gray} />
            <Text style={styles.emptyText}>No call logs found</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <MaterialCommunityIcons name="phone-plus" size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.lightGray,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: Colors.lightGray,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.lightGray,
  },
  avatarContainer: {
    position: 'relative',
  },
  typeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfo: {
    flex: 1,
    marginLeft: 15,
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: 6,
  },
  rightActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  time: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: 6,
  },
  duration: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  callAction: {
    padding: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
});

export default CallsScreen;
