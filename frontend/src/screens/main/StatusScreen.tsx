import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import apiClient from '../../api/apiClient';

const { width, height } = Dimensions.get('window');

const StatusScreen = () => {
  const { userData } = useAuthStore();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserStatus, setSelectedUserStatus] = useState<any | null>(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/status');
      if (response.data.success) {
        setStatuses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handlePickStatus = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadStatus(result.assets[0].uri);
    }
  };

  const uploadStatus = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      const filename = uri.split('/').pop()?.split('?')[0] || 'status.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        const file = new File([blob], filename, { type });
        formData.append('image', file);
      } else {
        // @ts-ignore
        formData.append('image', { 
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri, 
          name: filename, 
          type 
        });
      }

      const uploadRes = await apiClient.post('/messages/upload', formData, {
        headers: { 'Accept': 'application/json' },
        transformRequest: (data, headers) => {
          delete headers['Content-Type']; // Let browser set boundary automatically
          return data;
        },
      });

      if (uploadRes.data.success) {
        await apiClient.post('/status', {
          mediaUrl: uploadRes.data.url,
          type: 'image',
          caption: '',
        });
        fetchStatuses();
      }
    } catch (error) {
      console.error('Error uploading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusItem = ({ item }: { item: any }) => {
    const isMyStatus = item.user._id === userData?._id;
    return (
      <TouchableOpacity 
        style={styles.statusItem} 
        onPress={() => {
          setSelectedUserStatus(item);
          setCurrentStatusIndex(0);
        }}
      >
        <View style={styles.statusCircle}>
          <Image 
            source={{ uri: item.user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
            style={styles.statusAvatar} 
          />
        </View>
        <View style={styles.statusInfo}>
          <Text style={styles.statusName}>{isMyStatus ? 'My Status' : item.user.name}</Text>
          <Text style={styles.statusTime}>
            {new Date(item.statuses[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading && !statuses.length ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={statuses}
          keyExtractor={(item) => item.user._id}
          renderItem={renderStatusItem}
          ListHeaderComponent={() => (
            <View>
              <TouchableOpacity style={styles.myStatusContainer} onPress={handlePickStatus}>
                <View style={styles.myStatusCircle}>
                  <Image 
                    source={{ uri: userData?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                    style={styles.myStatusAvatar} 
                  />
                  <View style={styles.addStatusBtn}>
                    <Ionicons name="add" size={16} color={Colors.white} />
                  </View>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusName}>My Status</Text>
                  <Text style={styles.statusTime}>Tap to add status update</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.sectionHeader}>Recent updates</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Status Viewer Modal */}
      <Modal
        visible={!!selectedUserStatus}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setSelectedUserStatus(null)}
      >
        {selectedUserStatus && (
          <View style={styles.viewerContainer}>
            <Image 
              source={{ uri: selectedUserStatus.statuses[currentStatusIndex].mediaUrl }} 
              style={styles.viewerImage} 
              resizeMode="contain"
            />
            
            {/* Progress Bars */}
            <View style={styles.progressBarContainer}>
              {selectedUserStatus.statuses.map((_: any, i: number) => (
                <View 
                  key={i} 
                  style={[
                    styles.progressBar, 
                    { flex: 1, backgroundColor: i <= currentStatusIndex ? Colors.white : 'rgba(255,255,255,0.3)' }
                  ]} 
                />
              ))}
            </View>

            <View style={styles.viewerHeader}>
              <TouchableOpacity onPress={() => setSelectedUserStatus(null)}>
                <Ionicons name="arrow-back" size={28} color={Colors.white} />
              </TouchableOpacity>
              <Image 
                source={{ uri: selectedUserStatus.user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                style={styles.viewerAvatar} 
              />
              <View>
                <Text style={styles.viewerName}>{selectedUserStatus.user.name}</Text>
                <Text style={styles.viewerTime}>
                  {new Date(selectedUserStatus.statuses[currentStatusIndex].createdAt).toLocaleTimeString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.viewerTouchLeft} 
              onPress={() => {
                if (currentStatusIndex > 0) setCurrentStatusIndex(currentStatusIndex - 1);
              }} 
            />
            <TouchableOpacity 
              style={styles.viewerTouchRight} 
              onPress={() => {
                if (currentStatusIndex < selectedUserStatus.statuses.length - 1) {
                  setCurrentStatusIndex(currentStatusIndex + 1);
                } else {
                  setSelectedUserStatus(null);
                }
              }} 
            />
          </View>
        )}
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={handlePickStatus}>
        <Ionicons name="camera" size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  myStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  myStatusCircle: {
    position: 'relative',
  },
  myStatusAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
  },
  addStatusBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  statusCircle: {
    padding: 2,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  statusAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  statusInfo: {
    marginLeft: 15,
    flex: 1,
  },
  statusName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusTime: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 15,
    marginVertical: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerImage: {
    width: width,
    height: height,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 5,
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
  },
  viewerHeader: {
    position: 'absolute',
    top: 55,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  viewerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewerTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  viewerTouchLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: width * 0.3,
  },
  viewerTouchRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: width * 0.7,
  },
});

export default StatusScreen;
