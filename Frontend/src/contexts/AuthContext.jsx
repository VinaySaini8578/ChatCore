import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authStep, setAuthStep] = useState('email');

  useEffect(() => {
    checkAuthStatus();
    const onFocus = () => checkAuthStatus();
    window.addEventListener('focus', onFocus);

    // listen to profile updates to refresh UI immediately
    const onUserUpdated = (e) => setUser(e.detail);
    window.addEventListener('auth:user-updated', onUserUpdated);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('auth:user-updated', onUserUpdated);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.success) {
        setUser(response.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkEmail = async (email) => {
    try {
      setLoading(true);
      const response = await authAPI.checkEmail(email);
      if (response.userExists && response.needsPassword) {
        setAuthStep('password');
      } else {
        setAuthStep('verification');
      }
      return response;
    } catch (error) {
      setAuthStep('email');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (userId, code) => {
    try {
      setLoading(true);
      const response = await authAPI.verifyOtp(userId, code);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyAndRegister = async (userId, code, fullname, username, gender, password) => {
    try {
      setLoading(true);
      const response = await authAPI.verifyAndRegister({
        userId, code, fullname, username, gender, password
      });
      if (response.success) {
        setUser(response.user);
        setAuthStep('email');
      }
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPassword = async (userId, password) => {
    try {
      setLoading(true);
      const response = await authAPI.loginWithPassword(userId, password);
      if (response.success) {
        setUser(response.user);
        setAuthStep('email');
      }
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setAuthStep('email');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const resetAuthFlow = () => setAuthStep('email');

  const value = { 
    user, 
    setUser, 
    loading, 
    authStep, 
    setAuthStep, 
    checkEmail, 
    verifyOtp,
    verifyAndRegister, 
    loginWithPassword, 
    logout, 
    resetAuthFlow 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};