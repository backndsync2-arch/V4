/**
 * Admin API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { Client, User } from '../types';
import { apiFetch, unwrapList, normalizeClient, normalizeUser } from './core';

export const adminAPI = {
  // Get all clients
  getClients: async (): Promise<Client[]> => {
    const res = await apiFetch('/admin/clients/');
    return unwrapList(res).map(normalizeClient);
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
    return unwrapList(res).map(normalizeUser);
  },

  // Create user (no password - uses invite token system)
  createUser: async (data: {
    email: string;
    name: string;
    role: string;
    client_id?: string;
    floor_id?: string;
  }): Promise<User> => {
    // Backend no longer accepts passwords - users are created inactive
    // and must set password via invite email
    const payload: any = {
      email: data.email,
      name: data.name,
      role: data.role,
    };
    
    // CRITICAL: For client role, client_id is REQUIRED by backend validation
    // Always include it if provided, and log if missing for client role
    if (data.role === 'client') {
      if (data.client_id !== undefined && data.client_id !== null && data.client_id !== '') {
        payload.client_id = String(data.client_id).trim();
        console.log('[API] ✓ Adding client_id to payload for client role:', payload.client_id);
      } else {
        // This should never happen if frontend validation worked
        console.error('[API] ❌ CRITICAL: client role but client_id is missing!', {
          client_id: data.client_id,
          client_id_type: typeof data.client_id,
          full_data: data
        });
        // Still try to send it - backend will give proper error
      }
    } else if (data.client_id !== undefined && data.client_id !== null && data.client_id !== '') {
      // For other roles, include if provided
      payload.client_id = String(data.client_id).trim();
      console.log('[API] Adding client_id to payload:', payload.client_id);
    }
    
    if (data.floor_id !== undefined && data.floor_id !== null && data.floor_id !== '') {
      payload.floor_id = String(data.floor_id).trim();
    }
    
    console.log('[API] Final payload being sent:', JSON.stringify(payload, null, 2));
    
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

