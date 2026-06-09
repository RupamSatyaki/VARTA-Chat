import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/useAuthStore';
import LoginScreen from '../screens/auth/LoginScreen';
import SearchScreen from '../screens/main/SearchScreen';
import ChatScreen from '../screens/main/ChatScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import UserProfileScreen from '../screens/main/UserProfileScreen';
import CreateGroupScreen from '../screens/main/CreateGroupScreen';
import GroupInfoScreen from '../screens/main/GroupInfoScreen';
import TabNavigator from './TabNavigator';
import { Colors } from '../theme/colors';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { userToken, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={userToken ? "Home" : "Login"}
        screenOptions={{
          headerShown: false,
        }}
      >
        {!userToken ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={TabNavigator} />
            <Stack.Screen 
              name="Search" 
              component={SearchScreen}
              options={{
                presentation: 'transparentModal',
                animationEnabled: true,
              }}
            />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
