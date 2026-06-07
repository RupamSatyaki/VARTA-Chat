import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const initializeSocket = async () => {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) return;

      const parsedUser = JSON.parse(storedUserData);
      const socketUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

      if (!socketRef.current) {
        const newSocket = io(socketUrl, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on('connect', () => {
          console.log('📡 Socket connected:', newSocket.id);
          setIsConnected(true);
          newSocket.emit('setup', parsedUser);
        });

        newSocket.on('disconnect', () => {
          console.log('📡 Socket disconnected');
          setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
          console.error('📡 Socket connection error:', error);
          setIsConnected(false);
        });
      }
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
