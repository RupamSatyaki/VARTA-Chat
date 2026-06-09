import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, MediaStream } from '../api/WebRTCAdapter';
import { useSocket } from './SocketContext';
import { useAuthStore } from '../store/useAuthStore';
import { Alert, Platform } from 'react-native';

interface CallContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCalling: boolean;
  isReceivingCall: boolean;
  callAccepted: boolean;
  callerInfo: any;
  callType: 'video' | 'audio';
  initiateCall: (targetUserId: string, targetUserName: string, targetUserPic: string, type: 'video' | 'audio') => void;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { userData } = useAuthStore();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerInfo, setCallerInfo] = useState<any>(null);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const targetUserIdRef = useRef<string | null>(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      if (Platform.OS === 'web') {
        const url = (localStream as any).toURL?.() || (localStream as any)._url;
        if (url) delete (window as any)._webrtcStreams?.[url];
      }
      setLocalStream(null);
    }
    if (remoteStream && Platform.OS === 'web') {
      const url = (remoteStream as any).toURL?.() || (remoteStream as any)._url;
      if (url) delete (window as any)._webrtcStreams?.[url];
    }
    setRemoteStream(null);
    setIsCalling(false);
    setIsReceivingCall(false);
    setCallAccepted(false);
    setCallerInfo(null);
    targetUserIdRef.current = null;
    setIsMuted(false);
    setIsCameraOff(false);
  }, [localStream, remoteStream]);

  const setupPeerConnection = useCallback((targetId: string) => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event: any) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { to: targetId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        if (Platform.OS === 'web') {
          const url = Math.random().toString(36).substring(7);
          (stream as any).toURL = () => url;
          (stream as any)._url = url;
          if (!(window as any)._webrtcStreams) (window as any)._webrtcStreams = {};
          (window as any)._webrtcStreams[url] = stream;
        }
        setRemoteStream(stream);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket]);

  const initiateCall = async (targetUserId: string, targetUserName: string, targetUserPic: string, type: 'video' | 'audio' = 'video') => {
    try {
      setCallType(type);
      setIsCalling(true);
      targetUserIdRef.current = targetUserId;
      setCallerInfo({ name: targetUserName, profilePic: targetUserPic });

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      }) as MediaStream;

      if (Platform.OS === 'web') {
        const url = Math.random().toString(36).substring(7);
        (stream as any).toURL = () => url;
        (stream as any)._url = url;
        if (!(window as any)._webrtcStreams) (window as any)._webrtcStreams = {};
        (window as any)._webrtcStreams[url] = stream;
      }

      setLocalStream(stream);

      const pc = setupPeerConnection(targetUserId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket && userData) {
        socket.emit('call-user', {
          to: targetUserId,
          from: userData._id,
          signalData: offer,
          fromName: userData.name,
          fromPic: userData.profilePic,
          type
        });
      }
    } catch (err: any) {
      console.error('Failed to initiate call:', err);
      const errorMsg = err?.message || 'Unknown error';
      Alert.alert('Call Failed', `Could not start the call: ${errorMsg}\n\nMake sure camera/microphone permissions are granted and you are using a secure connection (HTTPS or localhost).`);
      cleanup();
    }
  };

  const answerCall = async () => {
    try {
      if (!callerInfo || !socket) return;

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      }) as MediaStream;

      if (Platform.OS === 'web') {
        const url = Math.random().toString(36).substring(7);
        (stream as any).toURL = () => url;
        (stream as any)._url = url;
        if (!(window as any)._webrtcStreams) (window as any)._webrtcStreams = {};
        (window as any)._webrtcStreams[url] = stream;
      }

      setLocalStream(stream);
      setCallAccepted(true);
      setIsReceivingCall(false);

      const pc = setupPeerConnection(callerInfo.from);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callerInfo.signalData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer-call', {
        to: callerInfo.from,
        signalData: answer
      });
    } catch (err) {
      console.error('Failed to answer call:', err);
      cleanup();
    }
  };

  const rejectCall = () => {
    if (socket && callerInfo) {
      socket.emit('reject-call', { to: callerInfo.from });
    }
    cleanup();
  };

  const endCall = () => {
    const targetId = targetUserIdRef.current || (callerInfo && callerInfo.from);
    if (socket && targetId) {
      socket.emit('end-call', { to: targetId });
    }
    cleanup();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const switchCamera = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        // @ts-ignore
        track._switchCamera();
      });
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data) => {
      console.log('Incoming call from:', data.fromName);
      setCallType(data.type);
      setCallerInfo(data);
      setIsReceivingCall(true);
    });

    socket.on('call-accepted', async (signal) => {
      console.log('Call accepted');
      setCallAccepted(true);
      setIsCalling(false);
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      }
    });

    socket.on('call-rejected', () => {
      console.log('Call rejected');
      cleanup();
      Alert.alert('Call Rejected', 'User declined your call request.');
    });

    socket.on('ice-candidate', async (candidate) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    socket.on('call-ended', () => {
      console.log('Call ended by peer');
      cleanup();
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('ice-candidate');
      socket.off('call-ended');
    };
  }, [socket, cleanup]);

  return (
    <CallContext.Provider value={{
      localStream,
      remoteStream,
      isCalling,
      isReceivingCall,
      callAccepted,
      callerInfo,
      callType,
      initiateCall,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      switchCamera,
      isMuted,
      isCameraOff
    }}>
      {children}
    </CallContext.Provider>
  );
};
