/**
 * Scheduler API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { Schedule } from '../types';
import { apiFetch, unwrapList, normalizeSchedule } from './core';

export const schedulerAPI = {
  // Get all schedules
  getSchedules: async (): Promise<Schedule[]> => {
    const res = await apiFetch('/schedules/');
    return unwrapList(res).map(normalizeSchedule);
  },

  // Create schedule
  createSchedule: async (data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> => {
    const res = await apiFetch('/schedules/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeSchedule(res);
  },

  // Update schedule
  updateSchedule: async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
    const res = await apiFetch(`/schedules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeSchedule(res);
  },

  // Delete schedule
  deleteSchedule: async (id: string): Promise<void> => {
    return apiFetch(`/schedules/${id}/`, { method: 'DELETE' });
  },

  // Toggle schedule active state
  toggleSchedule: async (id: string, active: boolean): Promise<Schedule> => {
    const res = await apiFetch(`/schedules/${id}/toggle/`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    });
    return normalizeSchedule(res);
  },
};

