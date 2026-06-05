import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import CustomButton from '../../components/common/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Home Screen</Text>
        <Text style={styles.subtitle}>Welcome to the main application!</Text>
        
        <CustomButton
          title="Logout"
          onPress={() => navigation.navigate('Login')}
        />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.black,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray,
    marginTop: 8,
    marginBottom: 32,
  },
});

export default HomeScreen;
