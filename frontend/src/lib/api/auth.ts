/**
 * Authentication API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { User } from '../types';
import { apiFetch, normalizeUser, clearTokens } from './core';

export const authAPI = {
  // Sign up new user
  signUp: async (data: {
    email: string;
    password: string;
    name: string;
    companyName: string;
  }): Promise<{ user: User; access: string; refresh: string }> => {
    const res = await apiFetch('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { ...res, user: normalizeUser(res.user) };
  },

  // Sign in
  signIn: async (email: string, password: string): Promise<{ user: User; access: string; refresh: string }> => {
    const res = await apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return { ...res, user: normalizeUser(res.user) };
  },

  // Sign out
  signOut: async (): Promise<void> => {
    await apiFetch('/auth/logout/', { method: 'POST' });
    clearTokens();
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    try {
      const res = await apiFetch('/auth/me/');
      return normalizeUser(res);
    } catch (error: any) {
      // Re-throw but don't log 401 as error (expected when not logged in)
      if (error?.status !== 401) {
        console.error('Failed to get current user:', error);
      }
      throw error;
    }
  },

  // Update profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await apiFetch('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeUser(res);
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    return apiFetch('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<void> => {
    return apiFetch('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password with token
  resetPassword: async (token: string, password: string): Promise<void> => {
    return apiFetch('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
};

