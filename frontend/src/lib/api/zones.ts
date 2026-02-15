/**
 * Zones & Devices API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { Device, Zone } from '../types';
import { apiFetch, unwrapList, normalizeDevice } from './core';

export const zonesAPI = {
  // Get all floors
  getFloors: async (): Promise<any[]> => {
    const res = await apiFetch('/zones/floors/');
    return unwrapList(res);
  },

  // Get all zones
  getZones: async (): Promise<Zone[]> => {
    const res = await apiFetch('/zones/zones/');
    return unwrapList(res);
  },

  // Create zone
  createZone: async (data: { name: string; description?: string }): Promise<Zone> => {
    return apiFetch('/zones/zones/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update zone
  updateZone: async (id: string, data: Partial<Zone>): Promise<Zone> => {
    return apiFetch(`/zones/zones/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete zone
  deleteZone: async (id: string) => {
    // Ensure no trailing slash for delete requests to avoid 404s with some server configurations
    const response = await fetch(`${API_BASE_URL}/zones/zones/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
         // Try with trailing slash as fallback
         const responseWithSlash = await fetch(`${API_BASE_URL}/zones/zones/${id}/`, {
            method: 'DELETE',
            headers: await getAuthHeaders(),
         });
         if (responseWithSlash.ok) return true;
         throw new Error('Zone not found');
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || 'Failed to delete zone');
    }
    
    return true;
  },

  // Get devices in zone
  getDevices: async (zoneId?: string): Promise<Device[]> => {
    const query = zoneId ? `?zone=${zoneId}` : '';
    const res = await apiFetch(`/zones/devices/${query}`);
    return unwrapList(res).map(normalizeDevice);
  },

  // Register new device
  registerDevice: async (data: {
    name: string;
    zone_id: string;
    device_type: string;
  }): Promise<Device> => {
    const res = await apiFetch('/zones/devices/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeDevice(res);
  },

  // Update device
  updateDevice: async (id: string, data: Partial<Device>): Promise<Device> => {
    const res = await apiFetch(`/zones/devices/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeDevice(res);
  },

  // Delete device
  deleteDevice: async (id: string): Promise<void> => {
    return apiFetch(`/zones/devices/${id}/`, { method: 'DELETE' });
  },

  // Set device volume
  setDeviceVolume: async (id: string, volume: number): Promise<void> => {
    return apiFetch(`/zones/devices/${id}/volume/`, {
      method: 'POST',
      body: JSON.stringify({ volume }),
    });
  },
};

