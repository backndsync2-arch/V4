/**
 * Admin API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { Client, User } from '../types';
import { apiFetch } from './core';

export const adminAPI = {
  // Get all clients
  getClients: async (): Promise<Client[]> => {
    return apiFetch('/admin/clients/');
  },

  // Create client
  createClient: async (data: {
    name: string;
    email: string;
    subscription_tier: string;
  }): Promise<Client> => {
    return apiFetch('/admin/clients/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update client
  updateClient: async (id: string, data: Partial<Client>): Promise<Client> => {
    return apiFetch(`/admin/clients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete client
  deleteClient: async (id: string): Promise<void> => {
    return apiFetch(`/admin/clients/${id}/`, { method: 'DELETE' });
  },

  // Get all users
  getUsers: async (): Promise<User[]> => {
    return apiFetch('/admin/users/');
  },

  // Create user
  createUser: async (data: {
    email: string;
    password: string;
    name: string;
    role: string;
    client_id?: string;
  }): Promise<User> => {
    return apiFetch('/admin/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update user
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    return apiFetch(`/admin/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete user
  deleteUser: async (id: string): Promise<void> => {
    return apiFetch(`/admin/users/${id}/`, { method: 'DELETE' });
  },

  // Get system stats
  getStats: async (): Promise<{
    total_clients: number;
    active_devices: number;
    total_music_files: number;
    total_announcements: number;
    storage_used: number;
  }> => {
    return apiFetch('/admin/stats/');
  },
};

