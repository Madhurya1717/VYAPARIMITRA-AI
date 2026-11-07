import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Business, SupportedLanguage } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  login: (phone_or_email: string, pass: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  quickDemoLogin: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [language, setLanguageState] = useState<SupportedLanguage>('te-IN');

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('vyapari_lang', lang);
  };

  const refreshProfile = async () => {
    try {
      if (api.getToken()) {
        const data = await api.getMe();
        setUser(data.user);
        setBusiness(data.business);
        if (data.business.preferred_language) {
          setLanguageState(data.business.preferred_language as SupportedLanguage);
        }
      }
    } catch (e) {
      console.warn('Session expired or invalid token:', e);
      api.setToken(null);
      setUser(null);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('vyapari_lang') as SupportedLanguage;
    if (savedLang) {
      setLanguageState(savedLang);
    }
    refreshProfile();
  }, []);

  const login = async (phone_or_email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(phone_or_email, pass);
      setUser(res.user);
      setBusiness(res.business);
      if (res.business.preferred_language) {
        setLanguageState(res.business.preferred_language as SupportedLanguage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.user);
      setBusiness(res.business);
      if (res.business.preferred_language) {
        setLanguageState(res.business.preferred_language as SupportedLanguage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = async () => {
    await login('demo@vyaparimitra.ai', 'Vyapari@123');
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setBusiness(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        isAuthenticated: !!user,
        isLoading,
        language,
        setLanguage,
        login,
        register,
        logout,
        quickDemoLogin,
        refreshProfile,
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

