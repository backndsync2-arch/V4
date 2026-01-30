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
    const res = await apiFetch('/schedules/schedules/');
    return unwrapList(res).map(normalizeSchedule);
  },

  // Create schedule
  createSchedule: async (data: {
    name: string;
    schedule_config: any;
    zones?: string[];
    devices?: string[];
    priority?: number;
    enabled?: boolean;
  }): Promise<Schedule> => {
    const res = await apiFetch('/schedules/schedules/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeSchedule(res);
  },

  // Update schedule
  updateSchedule: async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
    const res = await apiFetch(`/schedules/schedules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeSchedule(res);
  },

  // Delete schedule
  deleteSchedule: async (id: string): Promise<void> => {
    return apiFetch(`/schedules/schedules/${id}/`, { method: 'DELETE' });
  },

  // Toggle schedule active state
  toggleSchedule: async (id: string, active: boolean): Promise<Schedule> => {
    const res = await apiFetch(`/schedules/schedules/${id}/toggle/`, {
      method: 'POST',
      body: JSON.stringify({ enabled: active }),
    });
    return normalizeSchedule(res);
  },

  // Manually trigger schedule check (for testing without Celery)
  checkNow: async (): Promise<{ message: string }> => {
    return apiFetch('/schedules/schedules/check_now/', {
      method: 'POST',
    });
  },
};

