import React from 'react';
import { View, Text, StyleSheet, NativeModules, Platform } from 'react-native';

// Standard fallbacks
class MockClass {}
const MockMediaDevices = {
  getUserMedia: () => Promise.reject('WebRTC native module not found. Use a Development Build instead of Expo Go.'),
};

let WebRTC: any = {
  RTCPeerConnection: MockClass,
  RTCSessionDescription: MockClass,
  RTCIceCandidate: MockClass,
  mediaDevices: MockMediaDevices,
  MediaStream: MockClass,
  RTCView: () => (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
        Video Call requires a Development Build.{'\n'}Not supported in Expo Go.
      </Text>
    </View>
  ),
};

// Only try to load native module if we are not on web
if (Platform.OS !== 'web') {
  try {
    // Check if the native module is actually linked/present
    // react-native-webrtc internal check
    const WebRTCModule = NativeModules.WebRTCModule;
    
    if (WebRTCModule) {
      WebRTC = require('react-native-webrtc');
    } else {
      console.warn('WebRTC Native Module not found. Video calls will not work in Expo Go.');
    }
  } catch (e) {
    console.warn('Failed to load react-native-webrtc:', e);
  }
}

export const {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
  RTCView,
} = WebRTC;
