import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { SocketProvider } from './src/context/SocketContext';

export default function App() {
  return (
    <SocketProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </SocketProvider>
  );
}
