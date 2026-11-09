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
  login: (phone_or_email: string, pass: string) => Promise<any>;
  loginStep1: (phone_or_email: string, pass: string) => Promise<any>;
  verifyOtp: (session_token: string, otp: string) => Promise<void>;
  resendOtp: (session_token: string) => Promise<any>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  quickDemoLogin: () => Promise<any>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [language, setLanguageState] = useState<SupportedLanguage>('indic-auto');

  const setLanguage = (lang: SupportedLanguage) => {
    const validLang = (lang as string) === 'te-en' ? 'indic-auto' : lang;
    setLanguageState(validLang);
    localStorage.setItem('vyapari_lang', validLang);
  };

  const refreshProfile = async () => {
    try {
      if (api.getToken()) {
        const data = await api.getMe();
        setUser(data.user);
        setBusiness(data.business);
        if (data.business.preferred_language) {
          const pref = data.business.preferred_language as SupportedLanguage;
          setLanguageState((pref as string) === 'te-en' ? 'indic-auto' : pref);
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
      setLanguageState((savedLang as string) === 'te-en' ? 'indic-auto' : savedLang);
    }
    refreshProfile();
  }, []);

  const loginStep1 = async (phone_or_email: string, pass: string) => {
    setIsLoading(true);
    try {
      return await api.loginStep1(phone_or_email, pass);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (session_token: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await api.verifyOtp(session_token, otp);
      setUser(res.user);
      setBusiness(res.business);
      if (res.business.preferred_language) {
        setLanguageState(res.business.preferred_language as SupportedLanguage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (session_token: string) => {
    return await api.resendOtp(session_token);
  };

  const login = async (phone_or_email: string, pass: string) => {
    return await loginStep1(phone_or_email, pass);
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
    return await loginStep1('demo@vyaparimitra.ai', 'Vyapari@123');
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
        loginStep1,
        verifyOtp,
        resendOtp,
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

