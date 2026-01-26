import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from './types';
import { authAPI, setTokens, clearTokens, getAccessToken } from './api';
import { toast } from 'sonner';

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

  const getSecurityPolicy = () => {
    const sessionTimeoutMinutes = Number(localStorage.getItem('sync2gear_security_session_timeout_minutes') || 30);
    const loginAttemptLimit = Number(localStorage.getItem('sync2gear_security_login_attempt_limit') || 5);
    const lockoutMinutes = Number(localStorage.getItem('sync2gear_security_lockout_minutes') || 15);
    return {
      sessionTimeoutMinutes: Number.isFinite(sessionTimeoutMinutes) ? Math.max(1, sessionTimeoutMinutes) : 30,
      loginAttemptLimit: Number.isFinite(loginAttemptLimit) ? Math.max(1, loginAttemptLimit) : 5,
      lockoutMinutes: Number.isFinite(lockoutMinutes) ? Math.max(1, lockoutMinutes) : 15,
    };
  };

  const getLockState = () => {
    const attempts = Number(localStorage.getItem('sync2gear_login_attempts') || 0);
    const lockUntil = Number(localStorage.getItem('sync2gear_login_lock_until') || 0);
    return {
      attempts: Number.isFinite(attempts) ? Math.max(0, attempts) : 0,
      lockUntil: Number.isFinite(lockUntil) ? Math.max(0, lockUntil) : 0,
    };
  };

  useEffect(() => {
    // Check for stored user session and validate token
    const loadUser = async () => {
      const storedUser = localStorage.getItem('sync2gear_user');
      const storedImpersonation = localStorage.getItem('sync2gear_impersonating');
      const token = getAccessToken();
      const isDev = import.meta.env.DEV;

      if (storedUser && token) {
        try {
          // Validate token by fetching current user
          const currentUser = await authAPI.getCurrentUser();
          setUser(currentUser);
          if (storedImpersonation) {
            setImpersonatingClient(storedImpersonation);
          }
        } catch (error) {
          // Token invalid, clear everything
          clearTokens();
          localStorage.removeItem('sync2gear_user');
          localStorage.removeItem('sync2gear_impersonating');
          
          // In dev mode, try auto-login as admin
          if (isDev) {
            await autoLoginAsAdmin();
          }
        }
      } else if (storedUser) {
        // Legacy: user stored but no token, try to use stored user
        setUser(JSON.parse(storedUser));
        if (storedImpersonation) {
          setImpersonatingClient(storedImpersonation);
        }
      } else if (isDev) {
        // Dev mode: No user found, auto-login as admin
        await autoLoginAsAdmin();
      }
      
      setIsLoading(false);
    };

    const autoLoginAsAdmin = async () => {
      // Try to auto-login as admin in dev mode
      const adminEmail = 'admin@sync2gear.com';
      const adminPasswords = ['admin123', 'password123', 'dev123'];
      
      for (const password of adminPasswords) {
        try {
          const response = await authAPI.signIn(adminEmail, password);
          setTokens(response.access, response.refresh);
          setUser(response.user);
          localStorage.setItem('sync2gear_user', JSON.stringify(response.user));
          console.log('Dev mode: Auto-logged in as admin');
          return;
        } catch (error) {
          // Try next password
          continue;
        }
      }
      console.warn('Dev mode: Could not auto-login as admin. Please login manually.');
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Call real API
      const response = await authAPI.signIn(email, password);

      // Store tokens
      setTokens(response.access, response.refresh);

      // Store user
      setUser(response.user);
      localStorage.setItem('sync2gear_user', JSON.stringify(response.user));

      // Reset lockout counters on success
      localStorage.removeItem('sync2gear_login_attempts');
      localStorage.removeItem('sync2gear_login_lock_until');
      localStorage.setItem('sync2gear_last_activity', String(Date.now()));
    } catch (error: any) {
      // Clear tokens on error
      clearTokens();

      throw new Error(error?.message || 'Invalid credentials');
    }
  };

  const signOut = async () => {
    try {
      // Call API to logout (this will blacklist the token)
      await authAPI.signOut();
    } catch (error) {
      // Even if API call fails, clear local state
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      setUser(null);
      setImpersonatingClient(null);
      clearTokens();
      localStorage.removeItem('sync2gear_user');
      localStorage.removeItem('sync2gear_impersonating');
      localStorage.removeItem('sync2gear_last_activity');
    }
  };

  useEffect(() => {
    if (!user) return;

    const { sessionTimeoutMinutes } = getSecurityPolicy();
    const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return;

    const updateActivity = () => {
      localStorage.setItem('sync2gear_last_activity', String(Date.now()));
    };

    // Initialize
    updateActivity();

    // Update activity on user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for session timeout
    const checkTimeout = () => {
      const lastActivity = Number(localStorage.getItem('sync2gear_last_activity') || 0);
      const now = Date.now();
      if (now - lastActivity > timeoutMs) {
        // Session expired
        signOut();
        toast.error('Session expired. Please sign in again.');
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [user]);

  const impersonateClient = (clientId: string) => {
    setImpersonatingClient(clientId);
    localStorage.setItem('sync2gear_impersonating', clientId);
  };

  const stopImpersonating = () => {
    setImpersonatingClient(null);
    localStorage.removeItem('sync2gear_impersonating');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    impersonatingClient,
    signIn,
    signOut,
    impersonateClient,
    stopImpersonating,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}