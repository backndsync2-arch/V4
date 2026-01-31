/**
 * Admin API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { Client, User } from '../types';
import { apiFetch, unwrapList } from './core';

export const adminAPI = {
  // Get all clients
  getClients: async (): Promise<Client[]> => {
    const res = await apiFetch('/admin/clients/');
    return unwrapList(res);
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
    const res = await apiFetch('/admin/users/');
    return unwrapList(res);
  },

  // Create user
  createUser: async (data: {
    email: string;
    password: string;
    name: string;
    role: string;
    client_id?: string;
    floor_id?: string;
    send_email?: boolean;
  }): Promise<User> => {
    // UserCreateSerializer requires password_confirm
    // Remove undefined/null values to avoid sending them
    const payload: any = {
      email: data.email,
      name: data.name,
      password: data.password,
      password_confirm: data.password, // Confirm password matches
      role: data.role,
    };
    
    // Only include client_id and floor_id if they are provided
    if (data.client_id) {
      payload.client_id = data.client_id;
    }
    if (data.floor_id) {
      payload.floor_id = data.floor_id;
    }
    // Include send_email flag if provided
    if (data.send_email !== undefined) {
      payload.send_email = data.send_email;
    }
    
    return apiFetch('/admin/users/', {
      method: 'POST',
      body: JSON.stringify(payload),
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

  // Get audit logs
  getAuditLogs: async (params?: {
    client?: string;
    floor?: string;
    role?: string;
    user?: string;
    resource_type?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<any[]> => {
    const queryParams = new URLSearchParams();
    if (params?.client) queryParams.append('client', params.client);
    if (params?.floor) queryParams.append('floor', params.floor);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.user) queryParams.append('user', params.user);
    if (params?.resource_type) queryParams.append('resource_type', params.resource_type);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    
    const query = queryParams.toString();
    const url = query ? `/admin/audit-logs/?${query}` : '/admin/audit-logs/';
    return apiFetch(url);
  },

  // Impersonate client (admin only)
  impersonateClient: async (clientId: string): Promise<{
    client_id: string;
    client_name: string;
    message: string;
    impersonation_active: boolean;
  }> => {
    return apiFetch(`/admin/clients/${clientId}/impersonate/`, {
      method: 'POST',
    });
  },

  // Stop impersonating client (admin only)
  stopImpersonate: async (): Promise<{
    message: string;
    impersonation_active: boolean;
  }> => {
    return apiFetch('/admin/clients/stop_impersonate/', {
      method: 'POST',
    });
  },
};

