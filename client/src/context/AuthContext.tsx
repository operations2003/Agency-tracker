import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isOwner: boolean;
  isManager: boolean;
  isRecruiter: boolean;
  isFinance: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      setUser(null);
      api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('agency_tracker_token');
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = (token: string, userData: User) => {
    api.setToken(token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    } finally {
      api.clearToken();
      setUser(null);
    }
  };

  const isOwner = user?.role === 'OWNER';
  const isManager = user?.role === 'MANAGER';
  const isRecruiter = user?.role === 'RECRUITER';
  const isFinance = user?.role === 'FINANCE';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isOwner,
        isManager,
        isRecruiter,
        isFinance
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
