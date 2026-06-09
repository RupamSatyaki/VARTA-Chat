import React, { useEffect, useRef } from 'react';

export const RTCPeerConnection = (typeof window !== 'undefined' && (window as any).RTCPeerConnection) || class {};
export const RTCSessionDescription = (typeof window !== 'undefined' && (window as any).RTCSessionDescription) || class {};
export const RTCIceCandidate = (typeof window !== 'undefined' && (window as any).RTCIceCandidate) || class {};
export const mediaDevices = (typeof navigator !== 'undefined' && (navigator as any).mediaDevices) || {
  getUserMedia: () => Promise.reject('MediaDevices not supported'),
};
export const MediaStream = (typeof window !== 'undefined' && (window as any).MediaStream) || class {};

export const RTCView = ({ streamURL, style, objectFit }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && streamURL) {
      // Find the stream from the global registry
      const stream = (window as any)._webrtcStreams?.[streamURL];
      if (stream) {
        videoRef.current.srcObject = stream;
      } else if (typeof streamURL === 'string' && streamURL.startsWith('blob:')) {
        videoRef.current.src = streamURL;
      }
    }
  }, [streamURL]);

  return (
    <div style={{ ...style, overflow: 'hidden' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={style?.muted}
        style={{
          width: '100%',
          height: '100%',
          objectFit: objectFit || 'cover',
          transform: style?.transform ? 'scaleX(-1)' : 'none'
        }}
      />
    </div>
  );
};
