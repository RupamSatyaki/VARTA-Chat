import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/main/HomeScreen';
import Header from '../components/common/Header';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Placeholder screens for other tabs
const UpdatesScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Updates (Status) Screen</Text></View>
);
const CommunitiesScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Communities Screen</Text></View>
);
const CallsScreen = () => (
  <View style={styles.placeholder}><Text style={styles.text}>Calls Screen</Text></View>
);

const TabNavigator = () => {
  const navigation = useNavigation<any>();
  const [searchValue, setSearchValue] = React.useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Global Header with Search Tab */}
      <Header 
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onMenuPress={() => console.log('Menu')}
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
        <Tab.Screen name="Updates" component={UpdatesScreen} />
        <Tab.Screen name="Communities" component={CommunitiesScreen} />
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
