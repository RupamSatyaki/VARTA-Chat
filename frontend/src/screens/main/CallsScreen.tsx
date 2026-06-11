import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useCall } from '../../context/CallContext';

// Dummy data for call logs since we don't have a backend model yet
const DUMMY_CALLS = [
  {
    id: '1',
    name: 'Aman Deep',
    type: 'video',
    status: 'incoming', // incoming, outgoing, missed
    time: 'Today, 2:30 PM',
    profilePic: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  },
  {
    id: '2',
    name: 'Vikram Singh',
    type: 'audio',
    status: 'missed',
    time: 'Today, 10:15 AM',
    profilePic: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  },
  {
    id: '3',
    name: 'Rahul Kumar',
    type: 'video',
    status: 'outgoing',
    time: 'Yesterday, 9:45 PM',
    profilePic: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  },
  {
    id: '4',
    name: 'Sonia Sharma',
    type: 'audio',
    status: 'incoming',
    time: 'June 10, 4:20 PM',
    profilePic: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  },
];

const CallsScreen: React.FC = () => {
  const { initiateCall } = useCall();
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');

  const filteredCalls = activeTab === 'all' 
    ? DUMMY_CALLS 
    : DUMMY_CALLS.filter(call => call.status === 'missed');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'incoming':
        return <MaterialCommunityIcons name="call-received" size={16} color="#4CAF50" />;
      case 'outgoing':
        return <MaterialCommunityIcons name="call-made" size={16} color={Colors.primary} />;
      case 'missed':
        return <MaterialCommunityIcons name="call-missed" size={16} color="#F44336" />;
      default:
        return null;
    }
  };

  const renderCallItem = ({ item }: { item: any }) => (
    <View style={styles.callItem}>
      <Image source={{ uri: item.profilePic }} style={styles.avatar} />
      <View style={styles.callInfo}>
        <Text style={[styles.name, item.status === 'missed' && { color: '#F44336' }]}>
          {item.name}
        </Text>
        <View style={styles.statusRow}>
          {getStatusIcon(item.status)}
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.callAction}
        onPress={() => initiateCall('dummy-id', item.name, item.profilePic, item.type as 'video' | 'audio')}
      >
        <Ionicons 
          name={item.type === 'video' ? 'videocam' : 'call'} 
          size={24} 
          color={Colors.primary} 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Sub-header for All/Missed filter */}
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
        keyExtractor={(item) => item.id}
        renderItem={renderCallItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={60} color={Colors.gray} />
            <Text style={styles.emptyText}>No call logs found</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
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
  callInfo: {
    flex: 1,
    marginLeft: 15,
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: 6,
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
