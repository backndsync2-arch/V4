/**
 * API Service Layer - Django Backend Integration
 *
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type {
  User,
  MusicFile,
  Folder,
  Announcement,
  Schedule,
  ChannelPlaylist,
  ChannelPlaylistItem,
  Zone,
  Device,
  Client,
  PlaybackState
} from './types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

// Token management
let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function getAccessToken(): string | null {
  return accessToken;
}

function appendFormValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  formData.append(key, String(value));
}

// Upload file with progress
async function uploadFile(
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>,
  onProgress?: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', file);
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        appendFormValue(formData, key, value);
      });
    }

    xhr.open('POST', `${API_BASE_URL}${endpoint}`);
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;
        if (xhr.responseText) {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            const detail = errorResponse.detail || errorResponse.message;
            if (detail) {
              errorMessage = `Upload failed: ${detail}`;
            } else {
              errorMessage = `Upload failed: ${xhr.responseText}`;
            }
          } catch (e) {
            errorMessage = `Upload failed: ${xhr.responseText}`;
          }
        }
        reject(new Error(errorMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };

    xhr.send(formData);
  });
}

// Upload multiple files with progress
async function uploadFiles(
  endpoint: string,
  files: File[],
  additionalData?: Record<string, any>,
  onProgress?: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        appendFormValue(formData, key, value);
      });
    }

    xhr.open('POST', `${API_BASE_URL}${endpoint}`);
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;
        if (xhr.responseText) {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            const detail = errorResponse.detail || errorResponse.message;
            if (detail) {
              errorMessage = `Upload failed: ${detail}`;
            } else {
              errorMessage = `Upload failed: ${xhr.responseText}`;
            }
          } catch (e) {
            errorMessage = `Upload failed: ${xhr.responseText}`;
          }
        }
        reject(new Error(errorMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };

    xhr.send(formData);
  });
}

const extractList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers ? Object.fromEntries(new Headers(options.headers).entries()) : {}),
  };

  if (accessToken && !endpoint.includes('/auth/')) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle token refresh on 401
  if (response.status === 401 && refreshToken && !endpoint.includes('/auth/')) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshResponse.ok) {
        const { access } = await refreshResponse.json();
        setTokens(access, refreshToken);
        headers['Authorization'] = `Bearer ${access}`;

        // Retry original request
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        // Refresh failed, logout user
        clearTokens();
        window.location.href = '/';
        throw new APIError(401, 'Session expired');
      }
    } catch (error) {
      clearTokens();
      window.location.href = '/';
      throw error;
    }
  }

  let data = null;
  if (response.status !== 204) {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new APIError(response.status, text || 'Request failed', { raw: text });
        }
      }
    } catch (error: any) {
      if (error instanceof APIError) throw error;
      const text = await response.text().catch(() => 'Unknown error');
      throw new APIError(response.status, `Failed to parse response: ${text}`, { raw: text });
    }
  }

  if (!response.ok) {
    throw new APIError(response.status, data?.message || data?.error || 'Request failed', data);
  }

  return data;
}

class APIError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'APIError';
  }
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const authAPI = {
  // Sign up
  signUp: async (data: {
    email: string;
    password: string;
    name: string;
    companyName: string;
    phone?: string;
  }): Promise<{ user: User; access: string; refresh: string }> => {
    const payload = {
      email: data.email,
      password: data.password,
      name: data.name,
      company_name: data.companyName,
      telephone: data.phone,
    };
    const response = await apiFetch('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { ...response, user: mapUser(response.user) };
  },

  // Sign in
  signIn: async (email: string, password: string): Promise<{ user: User; access: string; refresh: string }> => {
    const response = await apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return { ...response, user: mapUser(response.user) };
  },

  // Sign out
  signOut: async (): Promise<void> => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      await apiFetch('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
    }
    clearTokens();
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await apiFetch('/auth/me/');
    return mapUser(response);
  },

  // Update profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.timezone) payload.timezone = data.timezone;
    if (data.avatar) payload.avatar = data.avatar;

    const response = await apiFetch('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapUser(response);
  },

  // Update user settings
  updateSettings: async (settings: Record<string, any>): Promise<User> => {
    const response = await apiFetch('/auth/me/settings/', {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    });
    return mapUser(response);
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiFetch('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPassword,
      }),
    });
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<void> => {
    await apiFetch('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password with token
  resetPassword: async (token: string, password: string, uid?: string): Promise<void> => {
    const payload: any = { token, password };
    if (uid) payload.uid = uid;

    await apiFetch('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ============================================================================
// MUSIC API
// ============================================================================

export const musicAPI = {
  // Get folders
  getFolders: async (): Promise<Folder[]> => {
    const data = await apiFetch('/music/folders/');
    return extractList(data).map(mapFolder);
  },

  // Create folder
  createFolder: async (data: {
    name: string;
    description?: string;
    type?: string;
  }): Promise<Folder> => {
    const payload = {
      name: data.name,
      description: data.description || '',
      type: data.type || 'music',
    };
    const response = await apiFetch('/music/folders/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapFolder(response);
  },

  // Update folder
  updateFolder: async (id: string, data: Partial<Folder>): Promise<Folder> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;

    const response = await apiFetch(`/music/folders/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapFolder(response);
  },

  // Delete folder
  deleteFolder: async (id: string): Promise<void> => {
    return apiFetch(`/music/folders/${id}/`, { method: 'DELETE' });
  },

  // Get music files
  getMusicFiles: async (folderId?: string): Promise<MusicFile[]> => {
    const query = folderId ? `?folder=${folderId}` : '';
    const data = await apiFetch(`/music/files/${query}`);
    return extractList(data).map(mapMusicFile);
  },

  // Upload music file
  uploadMusicFile: async (
    folderId: string | undefined,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<MusicFile> => {
    const additionalData = folderId ? { folder_id: folderId } : undefined;
    const response = await uploadFile('/music/files/', file, additionalData, onProgress);
    return mapMusicFile(response);
  },

  // Upload multiple music files (batch)
  uploadMusicBatch: async (
    files: File[],
    folderId?: string,
    onProgress?: (progress: number) => void
  ): Promise<MusicFile[]> => {
    const additionalData = folderId ? { folder_id: folderId } : undefined;
    const response = await uploadFiles('/music/files/batch_upload/', files, additionalData, onProgress);
    const uploaded = response?.uploaded ?? [];
    return Array.isArray(uploaded) ? uploaded.map(mapMusicFile) : [];
  },

  // Update music file
  updateMusicFile: async (id: string, data: Partial<MusicFile>): Promise<MusicFile> => {
    const payload: any = {};
    if (data.title) payload.title = data.title;
    if (data.artist) payload.artist = data.artist;
    if (data.album) payload.album = data.album;
    if (data.genre) payload.genre = data.genre;
    if (data.year !== undefined) payload.year = data.year;

    const response = await apiFetch(`/music/files/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapMusicFile(response);
  },

  // Upload cover art
  uploadCoverArt: async (musicId: string, file: File): Promise<MusicFile> => {
    const formData = new FormData();
    formData.append('cover_art', file);

    const response = await fetch(`${API_BASE_URL}/music/files/${musicId}/cover/`, {
      method: 'POST',
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Cover art upload failed');
    }

    const data = await response.json();
    return mapMusicFile(data);
  },

  // Delete music file
  deleteMusicFile: async (id: string): Promise<void> => {
    return apiFetch(`/music/files/${id}/`, { method: 'DELETE' });
  },

  // Search music
  searchMusic: async (query: string): Promise<MusicFile[]> => {
    const data = await apiFetch(`/music/files/?search=${encodeURIComponent(query)}`);
    return extractList(data).map(mapMusicFile);
  },

  // Reorder tracks
  reorderTracks: async (folderId: string, trackIds: string[]): Promise<void> => {
    await apiFetch('/music/files/reorder/', {
      method: 'POST',
      body: JSON.stringify({
        folder_id: folderId,
        track_ids: trackIds,
      }),
    });
  },
};

// ============================================================================
// ANNOUNCEMENTS API
// ============================================================================

export const announcementsAPI = {
  // Get announcements
  getAnnouncements: async (): Promise<Announcement[]> => {
    const data = await apiFetch('/announcements/');
    return extractList(data).map(mapAnnouncement);
  },

  // Create TTS announcement
  createTTSAnnouncement: async (data: {
    title: string;
    text: string;
    folder_id?: string;
  }): Promise<Announcement> => {
    const payload = {
      title: data.title,
      text: data.text,
      folder_id: data.folder_id,
    };
    const response = await apiFetch('/announcements/tts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapAnnouncement(response);
  },

  // Upload announcement
  uploadAnnouncement: async (
    data: {
      title: string;
      folder_id?: string;
      category?: string;
    },
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Announcement> => {
    const additionalData = {
      title: data.title,
      folder_id: data.folder_id,
      category: data.category,
    };
    const response = await uploadFile('/announcements/upload/', file, additionalData, onProgress);
    return mapAnnouncement(response);
  },

  // Record announcement
  recordAnnouncement: async (
    data: {
      title: string;
      folder_id?: string;
      category?: string;
    },
    blob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<Announcement> => {
    const file = new File([blob], 'recording.wav', { type: 'audio/wav' });
    return announcementsAPI.uploadAnnouncement(data, file, onProgress);
  },

  // Update announcement
  updateAnnouncement: async (id: string, data: Partial<Announcement>): Promise<Announcement> => {
    const payload: any = {};
    if (data.title) payload.title = data.title;
    if (data.enabled !== undefined) payload.enabled = data.enabled;
    if (data.category) payload.category = data.category;

    const response = await apiFetch(`/announcements/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapAnnouncement(response);
  },

  // Delete announcement
  deleteAnnouncement: async (id: string): Promise<void> => {
    return apiFetch(`/announcements/${id}/`, { method: 'DELETE' });
  },

  // Play instant announcement
  playInstantAnnouncement: async (id: string, zoneIds: string[]): Promise<void> => {
    return apiFetch(`/announcements/${id}/play-instant/`, {
      method: 'POST',
      body: JSON.stringify({ zone_ids: zoneIds }),
    });
  },
};

// ============================================================================
// SCHEDULER API
// ============================================================================

export const schedulerAPI = {
  // Get all schedules
  getSchedules: async (): Promise<Schedule[]> => {
    const data = await apiFetch('/schedules/schedules/');
    return extractList(data).map(mapSchedule);
  },

  // Create schedule
  createSchedule: async (data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> => {
    const payload = {
      name: data.name,
      schedule_config: data.schedule,
      zones: data.zoneIds,
      devices: data.deviceIds,
      priority: data.priority,
      enabled: data.enabled,
    };
    const response = await apiFetch('/schedules/schedules/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapSchedule(response);
  },

  // Update schedule
  updateSchedule: async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.schedule) payload.schedule_config = data.schedule;
    if (data.zoneIds) payload.zones = data.zoneIds;
    if (data.deviceIds) payload.devices = data.deviceIds;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.enabled !== undefined) payload.enabled = data.enabled;

    const response = await apiFetch(`/schedules/schedules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapSchedule(response);
  },

  // Delete schedule
  deleteSchedule: async (id: string): Promise<void> => {
    return apiFetch(`/schedules/schedules/${id}/`, { method: 'DELETE' });
  },

  // Toggle schedule active state
  toggleSchedule: async (id: string, _active?: boolean): Promise<{ id: string; enabled: boolean }> => {
    return apiFetch(`/schedules/schedules/${id}/toggle/`, { method: 'POST' });
  },

  // Get channel playlists
  getChannelPlaylists: async (): Promise<any[]> => {
    const data = await apiFetch('/schedules/playlists/');
    const playlists = extractList(data);

    // Load items for each playlist
    const playlistsWithItems = await Promise.all(
      playlists.map(async (playlist) => {
        const items = await apiFetch(`/schedules/playlists/${playlist.id}/items/`).catch(() => []);
        return mapChannelPlaylist({ ...playlist, items });
      })
    );

    return playlistsWithItems;
  },

  // Create channel playlist
  createChannelPlaylist: async (data: {
    name: string;
    description?: string;
    zones?: string[];
    floors?: string[];
    default_music_interval?: number;
    default_announcement_interval?: number;
    shuffle_music?: boolean;
    shuffle_announcements?: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    enabled?: boolean;
    items?: any[];
  }): Promise<any> => {
    const { items = [], ...payload } = data;
    const playlist = await apiFetch('/schedules/playlists/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (items.length > 0) {
      await Promise.all(
        items.map((item) =>
          apiFetch(`/schedules/playlists/${playlist.id}/items/`, {
            method: 'POST',
            body: JSON.stringify(item),
          })
        )
      );
    }
    const playlistItems = items.length
      ? await apiFetch(`/schedules/playlists/${playlist.id}/items/`).catch(() => [])
      : [];
    return mapChannelPlaylist({ ...playlist, items: playlistItems });
  },

  // Update channel playlist
  updateChannelPlaylist: async (id: string, data: Partial<any>): Promise<any> => {
    const { items = [], ...payload } = data;
    const updated = await apiFetch(`/schedules/playlists/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (Array.isArray(items)) {
      const existingItems = await apiFetch(`/schedules/playlists/${id}/items/`).catch(() => []);
      if (Array.isArray(existingItems) && existingItems.length > 0) {
        await Promise.all(
          existingItems.map((item: any) =>
            apiFetch(`/schedules/playlists/${id}/items/`, {
              method: 'DELETE',
              body: JSON.stringify({ item_id: item.id }),
            })
          )
        );
      }
      if (items.length > 0) {
        await Promise.all(
          items.map((item) =>
            apiFetch(`/schedules/playlists/${id}/items/`, {
              method: 'POST',
              body: JSON.stringify(item),
            })
          )
        );
      }
    }
    const playlistItems = await apiFetch(`/schedules/playlists/${id}/items/`).catch(() => []);
    return mapChannelPlaylist({ ...updated, items: playlistItems });
  },

  // Delete channel playlist
  deleteChannelPlaylist: async (id: string): Promise<void> => {
    return apiFetch(`/schedules/playlists/${id}/`, { method: 'DELETE' });
  },
};

// ============================================================================
// ZONES & DEVICES API
// ============================================================================

export const zonesAPI = {
  // Get all zones
  getZones: async (): Promise<Zone[]> => {
    const data = await apiFetch('/zones/zones/');
    return extractList(data).map(mapZone);
  },

  // Create zone
  createZone: async (data: { name: string; description?: string; imageFile?: File }): Promise<Zone> => {
    if (data.imageFile) {
      const formData = new FormData();
      appendFormValue(formData, 'name', data.name);
      appendFormValue(formData, 'description', data.description ?? '');
      formData.append('image', data.imageFile);
      const response = await apiFetch('/zones/zones/', {
        method: 'POST',
        body: formData,
      });
      return mapZone(response);
    }

    const response = await apiFetch('/zones/zones/', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description ?? '',
      }),
    });
    return mapZone(response);
  },

  // Update zone
  updateZone: async (id: string, data: Partial<Zone> & { imageFile?: File }): Promise<Zone> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.floorId) payload.floor_id = data.floorId;
    if (data.defaultVolume !== undefined) payload.default_volume = data.defaultVolume;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    if (data.imageFile) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => appendFormValue(formData, key, value));
      formData.append('image', data.imageFile);
      const response = await apiFetch(`/zones/zones/${id}/`, {
        method: 'PATCH',
        body: formData,
      });
      return mapZone(response);
    }

    const response = await apiFetch(`/zones/zones/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapZone(response);
  },

  // Delete zone
  deleteZone: async (id: string): Promise<void> => {
    return apiFetch(`/zones/zones/${id}/`, { method: 'DELETE' });
  },

  // Get devices in zone
  getDevices: async (zoneId?: string): Promise<Device[]> => {
    const query = zoneId ? `?zone=${zoneId}` : '';
    const data = await apiFetch(`/zones/devices/${query}`);
    return extractList(data).map(mapDevice);
  },

  // Register new device
  registerDevice: async (data: {
    name: string;
    zone_id: string;
    device_type?: string;
  }): Promise<Device> => {
    const payload = {
      name: data.name,
      zone_id: data.zone_id,
      device_type: data.device_type || 'speaker',
    };
    const response = await apiFetch('/zones/devices/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapDevice(response);
  },

  // Update device
  updateDevice: async (id: string, data: Partial<Device>): Promise<Device> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.zoneId) payload.zone_id = data.zoneId;
    if (data.deviceId) payload.device_id = data.deviceId;
    if (data.volume !== undefined) payload.volume = data.volume;

    const response = await apiFetch(`/zones/devices/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapDevice(response);
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

  // Ping device with test tone
  pingDevice: async (id: string, options?: {
    tone_type?: 'ping' | 'test_tone' | 'beep';
    duration?: number;
    volume?: number;
  }): Promise<{
    message: string;
    device_id: string;
    device_name: string;
    tone_type: string;
    duration: number;
    volume: number;
    timestamp: string;
  }> => {
    const payload: any = {};
    if (options?.tone_type) payload.tone_type = options.tone_type;
    if (options?.duration) payload.duration = options.duration;
    if (options?.volume) payload.volume = options.volume;

    return apiFetch(`/zones/devices/${id}/ping/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Send schedule to device
  sendScheduleToDevice: async (deviceId: string, schedule: any): Promise<{
    message: string;
    device_id: string;
    device_name: string;
    schedule_data: any;
    timestamp: string;
  }> => {
    return apiFetch(`/zones/devices/${deviceId}/send_schedule/`, {
      method: 'POST',
      body: JSON.stringify({ schedule }),
    });
  },
};

// ============================================================================
// PLAYBACK CONTROL API
// ============================================================================

export const playbackAPI = {
  // Get current playback state for zone
  getPlaybackState: async (zoneId: string): Promise<PlaybackState> => {
    return apiFetch(`/playback/state/by_zone/?zone_id=${zoneId}`);
  },

  // Play music in zone
  play: async (zoneId: string, playlistIds: string[], shuffle: boolean = false): Promise<void> => {
    return apiFetch('/playback/control/play/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId, playlist_ids: playlistIds, shuffle }),
    });
  },

  // Pause playback in zone
  pause: async (zoneId: string): Promise<void> => {
    return apiFetch('/playback/control/pause/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    });
  },

  // Resume playback in zone
  resume: async (zoneId: string): Promise<void> => {
    return apiFetch('/playback/control/resume/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    });
  },

  // Skip to next track
  next: async (zoneId: string): Promise<void> => {
    return apiFetch('/playback/control/next/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    });
  },

  // Skip to previous track
  previous: async (zoneId: string): Promise<void> => {
    return apiFetch('/playback/control/previous/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    });
  },

  // Set volume for zone
  setVolume: async (zoneId: string, volume: number): Promise<void> => {
    return apiFetch('/playback/control/volume/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId, volume }),
    });
  },

  // Seek to position
  seek: async (zoneId: string, position: number): Promise<void> => {
    return apiFetch('/playback/control/seek/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId, position }),
    });
  },
};

// ============================================================================
// ADMIN API
// ============================================================================

export const adminAPI = {
  // Get clients
  getClients: async (): Promise<Client[]> => {
    const data = await apiFetch('/admin/clients/');
    return extractList(data).map(mapClient);
  },

  // Create client
  createClient: async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
    const payload = {
      name: data.name,
      business_name: data.businessName,
      email: data.email,
      telephone: data.telephone,
      description: data.description,
      subscription_tier: data.subscriptionTier,
      subscription_status: data.subscriptionStatus,
      subscription_price: data.subscriptionPrice,
      trial_days: data.trialDays,
      premium_features: data.premiumFeatures,
      max_devices: data.maxDevices,
      max_storage_gb: data.maxStorageGb,
      max_floors: data.maxFloors,
      is_active: data.isActive,
    };
    const response = await apiFetch('/admin/clients/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapClient(response);
  },

  // Update client
  updateClient: async (id: string, data: Partial<Client>): Promise<Client> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.businessName) payload.business_name = data.businessName;
    if (data.email) payload.email = data.email;
    if (data.telephone !== undefined) payload.telephone = data.telephone;
    if (data.description !== undefined) payload.description = data.description;
    if (data.subscriptionTier) payload.subscription_tier = data.subscriptionTier;
    if (data.subscriptionStatus) payload.subscription_status = data.subscriptionStatus;
    if (data.subscriptionPrice !== undefined) payload.subscription_price = data.subscriptionPrice;
    if (data.trialDays !== undefined) payload.trial_days = data.trialDays;
    if (data.premiumFeatures) payload.premium_features = data.premiumFeatures;
    if (data.maxDevices !== undefined) payload.max_devices = data.maxDevices;
    if (data.maxStorageGb !== undefined) payload.max_storage_gb = data.maxStorageGb;
    if (data.maxFloors !== undefined) payload.max_floors = data.maxFloors;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    const response = await apiFetch(`/admin/clients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapClient(response);
  },

  // Delete client
  deleteClient: async (id: string): Promise<void> => {
    return apiFetch(`/admin/clients/${id}/`, { method: 'DELETE' });
  },

  // Get users
  getUsers: async (clientId?: string): Promise<User[]> => {
    const query = clientId ? `?client=${clientId}` : '';
    const data = await apiFetch(`/admin/users/${query}`);
    return extractList(data).map(mapUser);
  },

  // Create user
  createUser: async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
    const payload = {
      email: data.email,
      name: data.name,
      role: data.role,
      client_id: data.clientId,
      floor_id: data.floorId,
      phone: data.phone,
      timezone: data.timezone,
    };
    const response = await apiFetch('/admin/users/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapUser(response);
  },

  // Update user
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const payload: any = {};
    if (data.email) payload.email = data.email;
    if (data.name) payload.name = data.name;
    if (data.role) payload.role = data.role;
    if (data.clientId) payload.client_id = data.clientId;
    if (data.floorId !== undefined) payload.floor_id = data.floorId;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.timezone) payload.timezone = data.timezone;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    const response = await apiFetch(`/admin/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapUser(response);
  },

  // Delete user
  deleteUser: async (id: string): Promise<void> => {
    return apiFetch(`/admin/users/${id}/`, { method: 'DELETE' });
  },

  // Get stats
  getStats: async (): Promise<{
    clients: { total: number; active: number; trial: number; active_subscriptions: number };
    users: { total: number; active: number; by_role: Record<string, number> };
    storage: { total_music_files: number; total_announcements: number };
    devices: { total: number; online: number };
  }> => {
    return apiFetch('/admin/stats/overview/');
  },

  // Get AI providers
  getAIProviders: async (): Promise<any[]> => {
    const data = await apiFetch('/admin/ai-providers/');
    return Array.isArray(data) ? data : [];
  },

  // Create AI provider
  createAIProvider: async (data: any): Promise<any> => {
    return apiFetch('/admin/ai-providers/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update AI provider
  updateAIProvider: async (id: string, data: any): Promise<any> => {
    return apiFetch(`/admin/ai-providers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete AI provider
  deleteAIProvider: async (id: string): Promise<void> => {
    return apiFetch(`/admin/ai-providers/${id}/`, { method: 'DELETE' });
  },

  // Test AI provider
  testAIProvider: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    return apiFetch(`/admin/ai-providers/${id}/test/`, { method: 'POST' });
  },
};

// ============================================================================
// WEBSOCKET CLIENT
// ============================================================================

export { wsClient } from './websocket';

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================

const parseDate = (date: string | Date | undefined): Date | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return date;
  return new Date(date);
};

const mapClient = (data: any): Client => {
  if (!data) return data;
  return {
    ...data,
    id: data.id,
    name: data.name || '',
    businessName: data.business_name || '',
    email: data.email || '',
    telephone: data.telephone || '',
    description: data.description || '',
    subscriptionTier: data.subscription_tier || 'basic',
    subscriptionStatus: data.subscription_status || 'trial',
    subscriptionPrice: data.subscription_price || 0,
    subscriptionStart: parseDate(data.subscription_start),
    subscriptionEnd: parseDate(data.subscription_end),
    trialDays: data.trial_days || 14,
    trialEndsAt: parseDate(data.trial_ends_at),
    premiumFeatures: data.premium_features || {},
    maxDevices: data.max_devices || 5,
    maxStorageGb: data.max_storage_gb || 10,
    maxFloors: data.max_floors || 1,
    isActive: data.is_active ?? true,
    createdAt: parseDate(data.created_at) || new Date(),
    updatedAt: parseDate(data.updated_at) || new Date(),
  };
};

const mapUser = (data: any): User => {
  if (!data) return data;
  return {
    ...data,
    id: data.id,
    email: data.email || '',
    name: data.name || '',
    client: data.client ? mapClient(data.client) : undefined,
    clientId: data.client_id ?? data.clientId ?? '',
    floorId: data.floor_id ?? data.floorId ?? null,
    role: data.role || 'client',
    avatar: data.avatar || null,
    phone: data.phone || '',
    timezone: data.timezone || 'UTC',
    isActive: data.is_active ?? true,
    lastSeen: parseDate(data.last_seen) || new Date(),
    createdAt: parseDate(data.created_at) || new Date(),
    updatedAt: parseDate(data.updated_at) || new Date(),
  };
};

const mapFolder = (data: any): Folder => {
  if (!data) return data;
  return {
    ...data,
    id: data.id,
    name: data.name || '',
    description: data.description || '',
    type: data.type || 'music',
    clientId: data.client_id ?? data.clientId ?? '',
    parentId: data.parent_id ?? data.parentId ?? null,
    isSystem: data.is_system ?? data.isSystem ?? false,
    createdBy: data.created_by_name ?? data.createdBy ?? '',
    createdAt: parseDate(data.created_at) || new Date(),
    updatedAt: parseDate(data.updated_at) || new Date(),
  };
};

const mapMusicFile = (data: any): MusicFile => {
  if (!data) return data;
  const filename = data.filename ?? data.name ?? '';
  const title = data.title ?? filename ?? '';
  return {
    ...data,
    id: data.id,
    name: data.name ?? filename ?? title ?? '',
    title,
    artist: data.artist || '',
    album: data.album || '',
    genre: data.genre || '',
    year: data.year || null,
    duration: data.duration || 0,
    size: data.file_size ?? data.fileSize ?? data.size ?? 0,
    url: data.file_url ?? data.url ?? null,
    fileUrl: data.file_url ?? data.fileUrl ?? null,
    fileSize: data.file_size ?? data.fileSize ?? 0,
    coverArt: data.cover_art_url ?? data.coverArt ?? null,
    folderId: data.folder_id ?? data.folderId ?? null,
    clientId: data.client_id ?? data.clientId ?? '',
    createdBy: data.uploaded_by_name ?? data.uploadedBy ?? '',
    order: data.order ?? 0,
    createdAt: parseDate(data.created_at) || new Date(),
    updatedAt: parseDate(data.updated_at) || new Date(),
  };
};

const mapAnnouncement = (data: any): Announcement => {
  if (!data) return data;
  return {
    ...data,
    id: data.id,
    title: data.title ?? '',
    clientId: data.client_id ?? data.clientId ?? '',
    folderId: data.folder_id ?? data.folderId ?? null,
    folderName: data.folder_name ?? data.folderName ?? '',
    url: data.file_url ?? data.url ?? null,
    fileUrl: data.file_url ?? data.fileUrl ?? null,
    duration: data.duration ?? 0,
    fileSize: data.file_size ?? data.fileSize ?? 0,
    enabled: data.enabled ?? true,
    category: data.category ?? null,
    isTts: data.is_tts ?? data.isTts ?? false,
    ttsText: data.tts_text ?? data.ttsText ?? '',
    ttsVoice: data.tts_voice ?? data.ttsVoice ?? '',
    ttsProvider: data.tts_provider ?? data.ttsProvider ?? '',
    isRecording: data.is_recording ?? data.isRecording ?? false,
    type: data.type ?? 'uploaded',
    createdAt: parseDate(data.created_at) ?? new Date(),
    updatedAt: parseDate(data.updated_at) ?? new Date(),
  };
};

const mapDevice = (data: any): Device => {
  if (!data) return data;
  const isOnline = data.is_online ?? data.isOnline ?? data.status === 'online';
  return {
    ...data,
    id: data.id,
    name: data.name ?? '',
    clientId: data.client_id ?? data.clientId ?? '',
    status: isOnline ? 'online' : 'offline',
    lastSeen: parseDate(data.last_seen) ?? data.lastSeen ?? new Date(),
    zone: data.zone_name ?? data.zone ?? undefined,
    zoneId: data.zone_id ?? data.zoneId ?? undefined,
    deviceId: data.device_id ?? data.deviceId ?? undefined,
    volume: data.volume ?? undefined,
  };
};

const mapZone = (data: any): Zone => {
  if (!data) return data;
  return {
    ...data,
    id: data.id,
    name: data.name ?? '',
    description: data.description ?? '',
    floorId: data.floor_id ?? data.floorId,
    floorName: data.floor_name ?? data.floorName,
    clientId: data.client_id ?? data.clientId,
    imageUrl: data.image_url ?? data.imageUrl ?? null,
    defaultVolume: data.default_volume ?? data.defaultVolume,
    isActive: data.is_active ?? data.isActive,
    devicesCount: data.devices_count ?? data.devicesCount,
    isPlaying: data.is_playing ?? data.isPlaying,
    createdAt: parseDate(data.created_at) ?? data.createdAt,
    updatedAt: parseDate(data.updated_at) ?? data.updatedAt,
  };
};

const mapSchedule = (data: any): Schedule => {
  if (!data) return data;
  const scheduleConfig = data.schedule_config ?? data.schedule ?? {
    type: data.schedule_type ?? 'interval',
  };
  const deviceIds = Array.isArray(data.devices)
    ? data.devices.map((device: any) => (typeof device === 'string' ? device : device.id))
    : data.deviceIds ?? [];
  const zoneIds = Array.isArray(data.zones)
    ? data.zones.map((zone: any) => (typeof zone === 'string' ? zone : zone.id))
    : data.zoneIds ?? [];

  return {
    ...data,
    id: data.id,
    name: data.name ?? '',
    clientId: data.client_id ?? data.clientId ?? '',
    deviceIds,
    zoneIds,
    priority: data.priority ?? 0,
    enabled: data.enabled ?? true,
    schedule: scheduleConfig,
    createdAt: parseDate(data.created_at) || new Date(),
    createdBy: data.created_by_name ?? data.createdBy ?? '',
    updatedAt: parseDate(data.updated_at) || new Date(),
  };
};

const mapChannelPlaylistItem = (data: any): ChannelPlaylistItem => {
  if (!data) return data;
  return {
    ...data,
    id: data.id,
    type: data.item_type ?? data.type,
    contentId: data.content_id ?? data.contentId,
    intervalMinutes: data.interval_minutes ?? data.intervalMinutes,
    fixedTimes: data.fixed_times ?? data.fixedTimes,
    order: data.order ?? undefined,
  };
};

const mapChannelPlaylist = (data: any): ChannelPlaylist => {
  if (!data) return data;
  const zonesData = Array.isArray(data.zones_data) ? data.zones_data : [];
  const floorsData = Array.isArray(data.floors_data) ? data.floors_data : [];
  const zoneNames = zonesData.map((zone: any) => zone.name).filter(Boolean);
  const floorNames = floorsData.map((floor: any) => floor.name).filter(Boolean);
  const assigned = zoneNames.length ? zoneNames : floorNames.length ? floorNames : data.zones ?? data.floors ?? [];
  const zoneIds = Array.isArray(data.zones)
    ? data.zones.map((zone: any) => (typeof zone === 'string' ? zone : zone.id))
    : undefined;

  return {
    ...data,
    id: data.id,
    name: data.name ?? '',
    description: data.description ?? '',
    clientId: data.client_id ?? data.clientId ?? '',
    floorIds: assigned,
    zoneIds,
    items: Array.isArray(data.items) ? data.items.map(mapChannelPlaylistItem) : [],
    defaultMusicInterval: data.default_music_interval ?? data.defaultMusicInterval ?? 0,
    defaultAnnouncementInterval: data.default_announcement_interval ?? data.defaultAnnouncementInterval ?? 0,
    shuffleMusic: data.shuffle_music ?? data.shuffleMusic ?? false,
    shuffleAnnouncements: data.shuffle_announcements ?? data.shuffleAnnouncements ?? false,
    quietHoursStart: data.quiet_hours_start ?? data.quietHoursStart ?? undefined,
    quietHoursEnd: data.quiet_hours_end ?? data.quietHoursEnd ?? undefined,
    enabled: data.enabled ?? true,
    createdAt: parseDate(data.created_at) ?? data.createdAt ?? new Date(),
    createdBy: data.created_by_name ?? data.createdBy ?? '',
    updatedAt: parseDate(data.updated_at) ?? data.updatedAt ?? new Date(),
  };
};