import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState } from '../types';
import { authService } from '../services';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('cybershield_token');
    const userStr = localStorage.getItem('cybershield_user');
    if (token && userStr) {
      try {
        const cachedUser = JSON.parse(userStr) as User;
        // Verify token with backend
        authService.getMe()
          .then((res) => {
            if (res.data?.success && res.data?.data?.user) {
              const freshUser = res.data.data.user;
              localStorage.setItem('cybershield_user', JSON.stringify(freshUser));
              setState({ user: freshUser, token, isAuthenticated: true, isLoading: false });
            } else {
              throw new Error('Invalid auth check response');
            }
          })
          .catch(() => {
            // Token is invalid/expired — clear state cleanly
            localStorage.removeItem('cybershield_token');
            localStorage.removeItem('cybershield_user');
            setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
          });
      } catch {
        localStorage.removeItem('cybershield_token');
        localStorage.removeItem('cybershield_user');
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      localStorage.removeItem('cybershield_token');
      localStorage.removeItem('cybershield_user');
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    const { user, token } = res.data.data;
    localStorage.setItem('cybershield_token', token);
    localStorage.setItem('cybershield_user', JSON.stringify(user));
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role?: string) => {
    const res = await authService.register(name, email, password, role);
    const { user, token } = res.data.data;
    localStorage.setItem('cybershield_token', token);
    localStorage.setItem('cybershield_user', JSON.stringify(user));
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cybershield_token');
    localStorage.removeItem('cybershield_user');
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
