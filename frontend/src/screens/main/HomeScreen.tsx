import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../../components/common/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="home" size={80} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>Welcome to VARTA</Text>
        <Text style={styles.subtitle}>Start a conversation now!</Text>
        
        <CustomButton
          title="Sign Out"
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
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 40,
  },
});

export default HomeScreen;
