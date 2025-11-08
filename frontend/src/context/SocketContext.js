import React, { createContext, useContext, useEffect } from 'react';
import socket from '../utils/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  const value = {
    socket,
    joinProduct: (productId) => socket.emit('join-product', productId),
    leaveProduct: (productId) => socket.emit('leave-product', productId),
    joinProducts: () => socket.emit('join-products'),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};