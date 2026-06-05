import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../../components/common/CustomButton';
import Header from '../../components/common/Header';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleSearch = () => console.log('Search pressed');
  const handleMenu = () => console.log('Menu pressed');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <Header 
        title="VARTA" 
        onSearchPress={handleSearch}
        onMenuPress={handleMenu}
      />

      <View style={styles.content}>
        <Ionicons name="chatbubbles-outline" size={100} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>Welcome to VARTA</Text>
        <Text style={styles.subtitle}>Your conversations will appear here.</Text>
        
        <View style={styles.buttonContainer}>
          <CustomButton
            title="Start Chatting"
            onPress={() => {}}
          />
          <View style={styles.spacer} />
          <CustomButton
            title="Sign Out"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
    opacity: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  spacer: {
    height: 16,
  },
});

export default HomeScreen;
