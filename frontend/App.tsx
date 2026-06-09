import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { SocketProvider } from './src/context/SocketContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SocketProvider>
          <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
            <AppNavigator />
          </View>
          <StatusBar style="auto" />
        </SocketProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
