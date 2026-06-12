import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Image, 
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RTCView } from '../../api/WebRTCAdapter';
import { useCall } from '../../context/CallContext';
import { Colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

const CallModal: React.FC = () => {
  const { 
    localStream, 
    remoteStream, 
    isCalling, 
    isReceivingCall, 
    callAccepted, 
    callerInfo, 
    callType,
    participants,
    currentCallId,
    answerCall, 
    rejectCall, 
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    isMuted,
    isCameraOff,
    isRemoteCameraOff
  } = useCall();

  const isVisible = isCalling || isReceivingCall || callAccepted;

  // Use a unique key for the Modal based on call state to force re-mount
  // This helps on some devices where the Modal might get stuck
  const modalKey = `${isVisible}-${currentCallId || 'no-call'}`;

  useEffect(() => {
    if (isVisible) {
      console.log('📞 CallModal is now VISIBLE. Type:', callType, 'Receiving:', isReceivingCall);
    }
  }, [isVisible, callType, isReceivingCall]);

  const showRemoteVideo = callAccepted && remoteStream && callType === 'video' && !isRemoteCameraOff;

  const renderParticipants = () => {
    if (!participants || participants.length === 0) return null;

    return (
      <View style={styles.participantsContainer}>
        {participants.map((p, index) => {
          const statusColor = p.status === 'joined' ? '#4CAF50' : p.status === 'declined' ? '#F44336' : '#FFC107';
          return (
            <View key={p.user?._id || index} style={styles.participantItem}>
              <View style={styles.participantAvatarWrapper}>
                <Image 
                  source={{ uri: p.user?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                  style={[styles.participantAvatar, { borderColor: statusColor }]} 
                />
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              </View>
              <Text style={styles.participantName} numberOfLines={1}>{p.user?.name || 'User'}</Text>
              <Text style={[styles.participantStatus, { color: statusColor }]}>
                {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const getStreamURL = (stream: any) => {
    if (!stream) return null;
    return typeof stream.toURL === 'function' ? stream.toURL() : stream._url;
  };

  return (
    <Modal 
      key={modalKey}
      visible={isVisible} 
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* Remote Stream (Full Screen) */}
        {showRemoteVideo ? (
          <RTCView
            streamURL={getStreamURL(remoteStream)}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Image 
              source={{ uri: callerInfo?.profilePic || callerInfo?.fromPic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
              style={styles.largeAvatar} 
            />
            <Text style={styles.name}>{callerInfo?.name || callerInfo?.fromName || 'User'}</Text>
            <Text style={styles.status}>
              {isCalling ? 'Calling...' : isReceivingCall ? 'Incoming Call...' : isRemoteCameraOff ? 'Camera is off' : 'Connected'}
            </Text>

            {/* Live Participants List for Group Calls */}
            {renderParticipants()}
          </View>
        )}

        {/* Local Stream (Small Window) */}
        {callAccepted && localStream && callType === 'video' ? (
          <View style={styles.localVideoContainer}>
            {!isCameraOff ? (
              <RTCView
                streamURL={getStreamURL(localStream)}
                style={styles.localVideo}
                objectFit="cover"
              />
            ) : (
              <View style={styles.localPlaceholder}>
                <Image 
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                  style={styles.smallAvatar} 
                />
              </View>
            )}
          </View>
        ) : null}

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          {isReceivingCall && !callAccepted ? (
            <View style={styles.incomingControls}>
              <TouchableOpacity 
                style={[styles.controlBtn, styles.declineBtn]} 
                onPress={rejectCall}
              >
                <Ionicons name="close" size={32} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.controlBtn, styles.acceptBtn]} 
                onPress={answerCall}
              >
                <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={32} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeControls}>
              <TouchableOpacity 
                style={[styles.controlBtn, isMuted && styles.activeControl]} 
                onPress={toggleMute}
              >
                <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color={Colors.white} />
              </TouchableOpacity>
              
              {callType === 'video' && (
                <>
                  <TouchableOpacity 
                    style={[styles.controlBtn, isCameraOff && styles.activeControl]} 
                    onPress={toggleCamera}
                  >
                    <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={24} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
                    <Ionicons name="camera-reverse" size={24} color={Colors.white} />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity 
                style={[styles.controlBtn, styles.endCallBtn]} 
                onPress={endCall}
              >
                <Ionicons name="call-outline" size={24} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  remoteVideo: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  participantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
    gap: 15,
  },
  participantItem: {
    alignItems: 'center',
    width: 80,
  },
  participantAvatarWrapper: {
    position: 'relative',
    marginBottom: 5,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  participantName: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  participantStatus: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 180,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#000',
  },
  localVideo: {
    flex: 1,
  },
  localPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 50,
  },
  activeControls: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  activeControl: {
    backgroundColor: Colors.primary,
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  declineBtn: {
    backgroundColor: '#F44336',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  endCallBtn: {
    backgroundColor: '#F44336',
  },
});

export default CallModal;
