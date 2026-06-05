import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import HomeScreen from '../screens/main/HomeScreen';
import Header from '../components/common/Header';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Placeholder screens for other tabs
const UpdatesScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Updates (Status) Screen</Text></View>
);
const BroadcastsScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Broadcasts Screen</Text></View>
);
const CallsScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Calls Screen</Text></View>
);

const TabNavigator = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Global Header visible on all tabs */}
      <Header 
        title="VARTA" 
        onSearchPress={() => console.log('Search')}
        onMenuPress={() => console.log('Menu')}
      />

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true, // Show text below icons
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 4,
          },
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopWidth: 1,
            borderTopColor: Colors.lightGray,
            height: 65, // Increased height for labels
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'Chats') {
              return <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={color} />;
            } else if (route.name === 'Updates') {
              // WhatsApp style status/updates icon
              return <MaterialCommunityIcons name={focused ? 'circle-slice-8' : 'circle-outline'} size={24} color={color} />;
            } else if (route.name === 'Broadcasts') {
              // Broadcast icon
              return <MaterialCommunityIcons name={focused ? 'bullhorn' : 'bullhorn-outline'} size={24} color={color} />;
            } else if (route.name === 'Calls') {
              return <Ionicons name={focused ? 'call' : 'call-outline'} size={24} color={color} />;
            }
          },
        })}
      >
        <Tab.Screen name="Chats" component={HomeScreen} />
        <Tab.Screen name="Updates" component={UpdatesScreen} />
        <Tab.Screen name="Broadcasts" component={BroadcastsScreen} />
        <Tab.Screen name="Calls" component={CallsScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
