import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../../components/common/CustomInput';
import CustomButton from '../../components/common/CustomButton';
import { Colors } from '../../theme/colors';

import apiClient from '../../api/apiClient';

const LoginScreen: React.FC = () => {
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!number) {
      setError('Please enter your phone number');
      return;
    }
    if (number.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { number });
      const { token, data } = response.data;

      // Use Zustand to store auth data
      await setAuth(token, data);
      console.log('Login successful, token stored');
    } catch (err: any) {
      console.error('API Error:', err);
      const message = err.response?.data?.message || 'Could not connect to server';
      setError(message);
      Alert.alert(err.response ? 'Error' : 'Connection Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubble-ellipses" size={60} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>VARTA</Text>
            <Text style={styles.subtitle}>Enter your phone number to continue</Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Phone Number"
              placeholder="+91 00000 00000"
              value={number}
              onChangeText={(text) => {
                setNumber(text);
                if (error) setError('');
              }}
              keyboardType="phone-pad"
              error={error}
            />
            
            <CustomButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.2)',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
});

export default LoginScreen;
