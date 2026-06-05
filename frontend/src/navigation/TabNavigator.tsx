import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/main/HomeScreen';
import { Colors } from '../theme/colors';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

// Placeholder screens for other tabs
const UpdatesScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Updates Screen</Text></View>
);
const ChannelsScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Channels Screen</Text></View>
);
const CallsScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Calls Screen</Text></View>
);

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: Colors.lightGray,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Chats') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          } else if (route.name === 'Updates') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Channels') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Calls') {
            iconName = focused ? 'call' : 'call-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Chats" component={HomeScreen} />
      <Tab.Screen name="Updates" component={UpdatesScreen} />
      <Tab.Screen name="Channels" component={ChannelsScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: Colors.text,
    fontSize: 18,
  },
});

export default TabNavigator;
