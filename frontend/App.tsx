import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { SocketProvider } from './src/context/SocketContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <SocketProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SocketProvider>
    </SafeAreaProvider>
  );
}
