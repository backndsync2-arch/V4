import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from './types';
import { authAPI, setTokens, clearTokens, getAccessToken } from './api';

// Auth Context Version 1.0.2
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  impersonatingClient: string | null; // Client ID being impersonated
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  impersonateClient: (clientId: string) => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonatingClient, setImpersonatingClient] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Always check localStorage directly for token (not just in-memory variable)
        const tokenFromStorage = localStorage.getItem('sync2gear_access_token');
        const storedUser = localStorage.getItem('sync2gear_user');
        const storedImpersonation = localStorage.getItem('sync2gear_impersonating');

        // If we have a token, try to load the user
        if (tokenFromStorage) {
          try {
            // getAccessToken() will automatically sync from localStorage
            const currentUser = await authAPI.getCurrentUser();
            setUser(currentUser);
            // Update stored user with fresh data
            localStorage.setItem('sync2gear_user', JSON.stringify(currentUser));
            if (storedImpersonation) setImpersonatingClient(storedImpersonation);
          } catch (error: any) {
            // Token invalid or expired -> clear everything
            console.warn('Failed to load user from token:', error);
            clearTokens();
            localStorage.removeItem('sync2gear_user');
            localStorage.removeItem('sync2gear_impersonating');
            setUser(null);
            
            // Don't redirect here - let App.tsx handle it based on user state
            // This prevents race conditions
          }
        } else if (storedUser) {
          // User stored but no token - clear it and require login
          console.warn('User stored but no token found, clearing...');
          localStorage.removeItem('sync2gear_user');
          localStorage.removeItem('sync2gear_impersonating');
          clearTokens();
          setUser(null);
        } else {
          // No token and no stored user - ensure user is null
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authAPI.signIn(email, password);
      setTokens(response.access, response.refresh);
      setUser(response.user);
      localStorage.setItem('sync2gear_user', JSON.stringify(response.user));
    } catch (error: any) {
      clearTokens();
      throw new Error(error?.message || 'Invalid credentials');
    }
  };

  const signOut = async () => {
    try {
      await authAPI.signOut();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setImpersonatingClient(null);
      clearTokens();
      localStorage.removeItem('sync2gear_user');
      localStorage.removeItem('sync2gear_impersonating');
    }
  };

  const impersonateClient = async (clientId: string, clientName?: string) => {
    if (user?.role === 'admin') {
      try {
        // Call backend endpoint to start impersonation
        const { adminAPI } = await import('./api');
        await adminAPI.impersonateClient(clientId);
        
        setImpersonatingClient(clientId);
        localStorage.setItem('sync2gear_impersonating', clientId);
      } catch (error: any) {
        console.error('Failed to start impersonation:', error);
        throw new Error(error?.message || 'Failed to start impersonation');
      }
    }
  };

  const stopImpersonating = async () => {
    try {
      // Call backend endpoint to stop impersonation
      const { adminAPI } = await import('./api');
      await adminAPI.stopImpersonate();
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
      // Continue anyway to clear frontend state
    } finally {
      setImpersonatingClient(null);
      localStorage.removeItem('sync2gear_impersonating');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      impersonatingClient, 
      signIn, 
      signOut, 
      impersonateClient, 
      stopImpersonating 
    }}>
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