import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userToken: null,
  userData: null,
  isLoading: true,

  setAuth: async (token, data) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      set({ userToken: token, userData: data });
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      set({ userToken: null, userData: null });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },

  initializeAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const data = await AsyncStorage.getItem('userData');
      
      if (token && data) {
        set({ userToken: token, userData: JSON.parse(data), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },
}));
