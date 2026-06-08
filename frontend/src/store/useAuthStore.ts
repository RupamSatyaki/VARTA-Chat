import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface UserData {
  _id: string;
  name?: string;
  number: string;
  username?: string;
  profilePic?: string;
  [key: string]: any;
}

interface AuthState {
  userToken: string | null;
  userData: UserData | null;
  isLoading: boolean;
  setAuth: (token: string, data: UserData) => Promise<void>;
  updateUser: (data: Partial<UserData>) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

// Helper for cross-platform storage
const storage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      }
      return AsyncStorage ? await AsyncStorage.getItem(key) : null;
    } catch (e) {
      console.warn('Storage getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      if (AsyncStorage) await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }
      if (AsyncStorage) await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage removeItem error:', e);
    }
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  userToken: null,
  userData: null,
  isLoading: true,

  setAuth: async (token, data) => {
    try {
      // Use SecureStore for token (Safer & avoids AsyncStorage bugs)
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('userToken', token);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('userToken', token);
      }
      
      await storage.setItem('userData', JSON.stringify(data));
      set({ userToken: token, userData: data });
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  },

  updateUser: async (newData) => {
    try {
      const currentData = useAuthStore.getState().userData;
      if (!currentData) return;

      const updatedData = { ...currentData, ...newData };
      await storage.setItem('userData', JSON.stringify(updatedData));
      set({ userData: updatedData });
      console.log('🔄 User data synchronized');
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  },

  logout: async () => {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync('userToken');
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('userToken');
      }
      await storage.removeItem('userData');
      set({ userToken: null, userData: null });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },

  initializeAuth: async () => {
    try {
      let token = null;
      if (Platform.OS !== 'web') {
        token = await SecureStore.getItemAsync('userToken');
      } else if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('userToken');
      }

      const dataStr = await storage.getItem('userData');
      
      if (token && dataStr) {
        set({ userToken: token, userData: JSON.parse(dataStr), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },
}));
