import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { UserProfileResponse } from '../types/campaign';

interface AuthContextType {
  user: UserProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  googleClientId: string | null;
  devLoginEnabled: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  devLogin: (email?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [devLoginEnabled, setDevLoginEnabled] = useState<boolean>(false);

  const refreshUser = async () => {
    try {
      setError(null);
      const profile = await apiClient.getCurrentUser();
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setIsLoading(true);
      try {
        // 1. Fetch metadata for Google OAuth Client ID
        const meta = await apiClient.getMeta();
        if (mounted && meta && typeof meta === 'object') {
          const authMeta = (meta as Record<string, unknown>).auth as Record<string, unknown> | undefined;
          if (authMeta?.googleClientId && typeof authMeta.googleClientId === 'string') {
            setGoogleClientId(authMeta.googleClientId);
          }
          const isLocalDevHost =
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1' ||
              window.location.hostname.endsWith('.googlers.com'));

          if (authMeta && typeof authMeta.devLoginEnabled === 'boolean') {
            setDevLoginEnabled(authMeta.devLoginEnabled && isLocalDevHost);
          }
        }
      } catch (err) {
        console.warn('Failed to load service metadata:', err);
      }

      // 2. Check existing active session
      try {
        const profile = await apiClient.getCurrentUser();
        if (mounted) {
          setUser(profile);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await apiClient.loginWithGoogle(credential);
      setUser(profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const devLogin = async (email?: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await apiClient.devLogin(email, name);
      setUser(profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mock dev login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        googleClientId,
        devLoginEnabled,
        loginWithGoogle,
        devLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
