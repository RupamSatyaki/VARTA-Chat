import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/main/HomeScreen';
import Header from '../components/common/Header';
import Sidebar from '../components/layout/Sidebar/Sidebar';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// ... rest ...

const TabNavigator = () => {
  const navigation = useNavigation<any>();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Global Header: Click menu to open Floating Sidebar */}
      <Header 
        onSearchPress={() => navigation.navigate('Search')}
        onMenuPress={() => setIsDrawerOpen(true)}
      />

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 4,
          },
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopWidth: 1,
            borderTopColor: Colors.lightGray,
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'Chats') {
              return <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={color} />;
            } else if (route.name === 'Updates') {
              return <MaterialCommunityIcons name={focused ? 'circle-slice-8' : 'circle-outline'} size={24} color={color} />;
            } else if (route.name === 'Communities') {
              return <MaterialIcons name={focused ? 'groups' : 'groups-3'} size={26} color={color} />;
            } else if (route.name === 'Calls') {
              return <Ionicons name={focused ? 'call' : 'call-outline'} size={24} color={color} />;
            }
          },
        })}
      >
        <Tab.Screen name="Chats" component={HomeScreen} />
        <Tab.Screen name="Updates" component={HomeScreen} />
        <Tab.Screen name="Communities" component={HomeScreen} />
        <Tab.Screen name="Calls" component={HomeScreen} />
      </Tab.Navigator>

      {/* Floating Sidebar (Modular) */}
      <Sidebar 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
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
