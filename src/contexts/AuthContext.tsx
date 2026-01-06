'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, authApi, userApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id?: string;
  _id?: string;
  phone_number: string;
  username: string;
  avatar?: string;
  qr_code?: string;
  bio?: string;
  email?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phoneNumber: string, password: string) => Promise<void>;
  register: (phoneNumber: string, username?: string, password?: string) => Promise<void>;
  loginWithCode: (phoneNumber: string, code: string) => Promise<void>;
  registerWithCode: (data: {
    phoneNumber: string;
    code: string;
    username?: string;
    userType: 'normal' | 'company';
    companyName?: string;
    companyCategory?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      api.setToken(token);
      try {
        const userData = await userApi.getMe();
        setUser(userData as User);
      } catch (error) {
        console.error('Auth check failed:', error);
        api.clearToken();
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const login = async (phoneNumber: string, password: string) => {
    try {
      const response: any = await authApi.login({ phone_number: phoneNumber, password });
      api.setToken(response.token);
      setUser(response.user);
      router.push('/chat');
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (phoneNumber: string, username?: string, password?: string) => {
    try {
      const response: any = await authApi.register({
        phone_number: phoneNumber,
        username,
        password,
      });
      api.setToken(response.token);
      setUser(response.user);
      router.push('/chat');
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const loginWithCode = async (phoneNumber: string, code: string) => {
    try {
      const response: any = await authApi.verifyCode(phoneNumber, code);
      api.setToken(response.token);
      setUser(response.user);
      router.push('/chat');
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const registerWithCode = async (data: {
    phoneNumber: string;
    code: string;
    username?: string;
    userType: 'normal' | 'company';
    companyName?: string;
    companyCategory?: string;
  }) => {
    try {
      const response: any = await authApi.registerWithCode({
        phone_number: data.phoneNumber,
        code: data.code,
        username: data.username,
        user_type: data.userType,
        company_name: data.companyName,
        company_category: data.companyCategory,
      });
      api.setToken(response.token);
      setUser(response.user);
      router.push('/chat');
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    router.push('/login');
  };

  const updateUser = async (data: Partial<User>) => {
    try {
      await userApi.updateMe(data);
      setUser((prev) => (prev ? { ...prev, ...data } : null));
    } catch (error: any) {
      throw new Error(error.message || 'Update failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithCode, registerWithCode, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


