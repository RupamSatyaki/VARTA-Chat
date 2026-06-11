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
  currentCallId: string | null;
  initiateCall: (targetUserId: string, targetUserName: string, targetUserPic: string, type: 'video' | 'audio', chatId?: string) => void;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
  isRemoteMuted: boolean;
  isRemoteCameraOff: boolean;
  renderTrigger: number;
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
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const targetUserIdRef = useRef<string | null>(null);
  const candidateQueue = useRef<any[]>([]);

  const getMediaStream = async (type: 'video' | 'audio') => {
    try {
      return await mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      }) as MediaStream;
    } catch (err) {
      console.warn('Initial getUserMedia failed, trying fallback...', err);
      try {
        return await mediaDevices.getUserMedia({
          audio: true,
          video: false,
        }) as MediaStream;
      } catch (err2) {
        try {
          return await mediaDevices.getUserMedia({
            audio: false,
            video: type === 'video',
          }) as MediaStream;
        } catch (err3) {
          return null;
        }
      }
    }
  };

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
    setCurrentCallId(null);
    targetUserIdRef.current = null;
    setIsMuted(false);
    setIsCameraOff(false);
    setIsRemoteMuted(false);
    setIsRemoteCameraOff(false);
    setRenderTrigger(0);
  }, [localStream, remoteStream]);

  const setupPeerConnection = useCallback((targetId: string) => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event: any) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { to: targetId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event: any) => {
      console.log('📡 Remote track received:', event.track.kind);
      // Construct stream if browser doesn't provide it
      const stream = (event.streams && event.streams.length > 0) ? event.streams[0] : new MediaStream([event.track]);
      
      if (Platform.OS === 'web') {
        // Generate a new URL for every new track to force RTCView to re-mount/update
        const url = Math.random().toString(36).substring(7);
        (stream as any).toURL = () => url;
        (stream as any)._url = url;
        if (!(window as any)._webrtcStreams) (window as any)._webrtcStreams = {};
        (window as any)._webrtcStreams[url] = stream;
      }
      
      setRemoteStream(stream);
      setRenderTrigger(prev => prev + 1); // Force React to re-render context consumers
    };

    pc.onconnectionstatechange = () => {
      console.log('📡 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected' && socket) {
        // Request remote media state once connected to ensure we are in sync
        socket.emit('request-media-state', { to: targetId });
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket]);

  const initiateCall = async (targetUserId: string, targetUserName: string, targetUserPic: string, type: 'video' | 'audio' = 'video', chatId?: string) => {
    try {
      setCallType(type);
      setIsCalling(true);
      targetUserIdRef.current = targetUserId;
      setCallerInfo({ name: targetUserName, profilePic: targetUserPic, from: targetUserId });

      const stream = await getMediaStream(type);

      if (stream && Platform.OS === 'web') {
        const url = Math.random().toString(36).substring(7);
        (stream as any).toURL = () => url;
        (stream as any)._url = url;
        if (!(window as any)._webrtcStreams) (window as any)._webrtcStreams = {};
        (window as any)._webrtcStreams[url] = stream;
      }

      setLocalStream(stream);

      const pc = setupPeerConnection(targetUserId);
      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket && userData) {
        socket.emit('call-user', {
          to: targetUserId,
          from: userData._id,
          signalData: offer,
          fromName: userData.name,
          fromPic: userData.profilePic,
          type,
          chatId: chatId // Group call support
        });

        // Also emit our current media state
        socket.emit('update-media-state', {
          to: targetUserId,
          isMuted,
          isCameraOff
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

      const stream = await getMediaStream(callType);
      
      if (stream) {
        // As requested: Default to muted and camera off when answering
        stream.getTracks().forEach(track => {
          track.enabled = false;
        });
        setIsMuted(true);
        setIsCameraOff(true);

        if (Platform.OS === 'web') {
          const url = Math.random().toString(36).substring(7);
          (stream as any).toURL = () => url;
          (stream as any)._url = url;
          if (!(window as any)._webrtcStreams) (window as any)._webrtcStreams = {};
          (window as any)._webrtcStreams[url] = stream;
        }
      }

      setLocalStream(stream);
      setCallAccepted(true);
      setIsReceivingCall(false);

      const pc = setupPeerConnection(callerInfo.from);
      
      // If we have a local stream, add its tracks to the peer connection
      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      await pc.setRemoteDescription(new RTCSessionDescription(callerInfo.signalData));
      
      // Process any queued candidates
      while (candidateQueue.current.length > 0) {
        const candidate = candidateQueue.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding queued ICE candidate', e);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer-call', {
        to: callerInfo.from,
        signalData: answer,
        callId: currentCallId
      });

      // Notify caller about our initial media state (muted/cam-off)
      socket.emit('update-media-state', {
        to: callerInfo.from,
        isMuted: true,
        isCameraOff: true
      });
    } catch (err) {
      console.error('Failed to answer call:', err);
      cleanup();
    }
  };

  const rejectCall = () => {
    if (socket && callerInfo) {
      socket.emit('reject-call', { to: callerInfo.from, callId: currentCallId });
    }
    cleanup();
  };

  const endCall = () => {
    const targetId = targetUserIdRef.current || (callerInfo && callerInfo.from);
    if (socket && targetId) {
      socket.emit('end-call', { to: targetId, callId: currentCallId });
    }
    cleanup();
  };

  const toggleMute = () => {
    if (localStream) {
      const newState = !isMuted;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newState;
      });
      setIsMuted(newState);
      
      const targetId = targetUserIdRef.current || (callerInfo && callerInfo.from);
      if (socket && targetId) {
        socket.emit('update-media-state', { to: targetId, isMuted: newState, isCameraOff });
      }
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === 'video') {
      const newState = !isCameraOff;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !newState;
      });
      setIsCameraOff(newState);

      const targetId = targetUserIdRef.current || (callerInfo && callerInfo.from);
      if (socket && targetId) {
        socket.emit('update-media-state', { to: targetId, isMuted, isCameraOff: newState });
      }
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
      setCurrentCallId(data.callId);
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
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Queue candidate if remote description isn't set yet
            candidateQueue.current.push(candidate);
          }
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    socket.on('call-ended', () => {
      console.log('Call ended by peer');
      cleanup();
    });

    socket.on('remote-media-state-updated', ({ isMuted, isCameraOff }) => {
      setIsRemoteMuted(isMuted);
      setIsRemoteCameraOff(isCameraOff);
    });

    socket.on('request-remote-media-state', () => {
      const targetId = targetUserIdRef.current || (callerInfo && callerInfo.from);
      if (socket && targetId) {
        socket.emit('update-media-state', { to: targetId, isMuted, isCameraOff });
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('ice-candidate');
      socket.off('call-ended');
      socket.off('remote-media-state-updated');
      socket.off('request-remote-media-state');
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
      currentCallId,
      initiateCall,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      switchCamera,
      isMuted,
      isCameraOff,
      isRemoteMuted,
      isRemoteCameraOff,
      renderTrigger
    }}>
      {children}
    </CallContext.Provider>
  );
};
