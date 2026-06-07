import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to auto-attach token
apiClient.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().userToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle Unauthorized (e.g., logout user)
      console.log('Unauthorized request, logging out...');
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
