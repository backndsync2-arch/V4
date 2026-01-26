/**
 * Zones & Devices API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { Device, Zone } from '../types';
import { apiFetch, unwrapList, normalizeDevice } from './core';

export const zonesAPI = {
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
  deleteZone: async (id: string): Promise<void> => {
    return apiFetch(`/zones/zones/${id}/`, { method: 'DELETE' });
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

