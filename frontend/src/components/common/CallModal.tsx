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
import { Ionicons } from '@expo/vector-icons';
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

  if (!isCalling && !isReceivingCall && !callAccepted) return null;

  const showRemoteVideo = callAccepted && remoteStream && callType === 'video' && !isRemoteCameraOff;

  return (
    <Modal visible={true} animationType="slide">
      <View style={styles.container}>
        {/* Remote Stream (Full Screen) */}
        {showRemoteVideo ? (
          <RTCView
            streamURL={remoteStream!.toURL()}
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
          </View>
        )}

        {/* Local Stream (Small Window) */}
        {callAccepted && localStream && callType === 'video' ? (
          <View style={styles.localVideoContainer}>
            {!isCameraOff ? (
              <RTCView
                streamURL={localStream.toURL()}
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
          {isReceivingCall ? (
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
                <Ionicons name="call" size={32} color={Colors.white} />
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
