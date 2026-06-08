import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

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
  const { userData } = useAuthStore();
  const { setOnlineUsers, updateUserStatus } = useChatStore();

  useEffect(() => {
    // If no user is logged in, disconnect existing socket and return
    if (!userData) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

    if (!socketRef.current) {
      console.log('📡 Initializing socket for user:', userData._id);
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
        newSocket.emit('setup', userData);
      });

      // Presence Listeners
      newSocket.on('get-online-users', (users: string[]) => {
        console.log('👥 Initial online users:', users);
        setOnlineUsers(users);
      });

      newSocket.on('user-status-changed', ({ userId, status, lastSeen }: any) => {
        console.log(`👤 User ${userId} is now ${status}`);
        updateUserStatus(userId, status, lastSeen);
      });

      // Global delivery confirmation listener
      newSocket.on('message-received', (newMessage: any) => {
        console.log('📩 Message received globally, sending delivery confirmation');
        newSocket.emit('message-delivered', {
          messageId: newMessage._id,
          senderId: newMessage.senderId
        });
      });

      newSocket.on('disconnect', () => {
        console.log('📡 Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('📡 Socket connection error:', error);
        setIsConnected(false);
      });
    } else if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }

    return () => {
      // Cleanup happens on userData change
    };
  }, [userData, setOnlineUsers, updateUserStatus]); 

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
