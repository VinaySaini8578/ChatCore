import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        withCredentials: true,
        forceNew: true, // Force a new connection
        timeout: 10000,
      });

      newSocket.on('connect', () => {
        console.log('Connected to server with socket ID:', newSocket.id);
        setIsConnected(true);
        // Join with a slight delay to ensure connection is stable
        setTimeout(() => {
          newSocket.emit('join', user._id);
        }, 100);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('online-users', (users) => {
        console.log('Initial online users received:', users);
        setOnlineUsers(users);
      });

      // FIXED: Handle all online users updates consistently
      newSocket.on('online-users-update', (users) => {
        console.log('Online users updated:', users);
        setOnlineUsers(users);
      });

      newSocket.on('user-online', ({ userId, user: onlineUser }) => {
        console.log('User came online:', { userId, user: onlineUser });
        
        const isMyself = userId === user._id || userId.toString() === user._id.toString();
        
        // Update the online users list
        setOnlineUsers(prev => {
          const filtered = prev.filter(u => u.userId !== userId);
          return [...filtered, { userId, user: onlineUser }];
        });
        
        // Show toast notification only if it's not yourself and user has a name
        // REMOVED custom position - will use global top-center setting
        if (onlineUser && onlineUser.fullname && !isMyself) {
          toast.success(`${onlineUser.fullname} is now online`, {
            duration: 3000,
          });
        }
      });

      newSocket.on('user-offline', ({ userId }) => {
        console.log('User went offline:', userId);
        setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
      });

      newSocket.on('receive-message', (data) => {
        console.log('New message received:', data);
      });

      newSocket.on('user-typing', ({ senderId, senderName }) => {
        console.log(`${senderName} is typing...`);
      });

      newSocket.on('user-stopped-typing', ({ senderId }) => {
        console.log('User stopped typing');
      });

      // Add error handling
      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        console.log('Cleaning up socket connection');
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      };
    }
  }, [user]);

  const sendMessage = (receiverId, message, messageData) => {
    if (socket) {
      socket.emit('send-message', {
        receiverId,
        message,
        messageData
      });
    }
  };

  const startTyping = (receiverId, senderName) => {
    if (socket) {
      socket.emit('typing-start', { receiverId, senderName });
    }
  };

  const stopTyping = (receiverId) => {
    if (socket) {
      socket.emit('typing-stop', { receiverId });
    }
  };

  const isUserOnline = (userId) => {
    const userIdStr = typeof userId === 'object' ? userId._id : userId;
    const isOnline = onlineUsers.some(user => {
      const onlineId = typeof user.userId === 'object' ? user.userId._id : user.userId;
      return onlineId === userIdStr;
    });
    return isOnline;
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    isUserOnline,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};