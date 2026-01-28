/**
 * Core API utilities - shared across all API modules
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type {
  User,
  MusicFile,
  Folder,
  AnnouncementAudio,
  Schedule,
  Device,
} from '../types';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

// Token management - use consistent keys
export const TOKEN_KEYS = {
  ACCESS: 'sync2gear_access_token',
  REFRESH: 'sync2gear_refresh_token',
};

// Initialize tokens from localStorage on module load
let accessToken: string | null = localStorage.getItem(TOKEN_KEYS.ACCESS);
let refreshToken: string | null = localStorage.getItem(TOKEN_KEYS.REFRESH);

// Also check for legacy keys and migrate them
if (!accessToken) {
  const legacyAccess = localStorage.getItem('access_token');
  if (legacyAccess) {
    accessToken = legacyAccess;
    localStorage.setItem(TOKEN_KEYS.ACCESS, legacyAccess);
    localStorage.removeItem('access_token');
  }
}
if (!refreshToken) {
  const legacyRefresh = localStorage.getItem('refresh_token');
  if (legacyRefresh) {
    refreshToken = legacyRefresh;
    localStorage.setItem(TOKEN_KEYS.REFRESH, legacyRefresh);
    localStorage.removeItem('refresh_token');
  }
}

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem(TOKEN_KEYS.ACCESS, access);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
  // Also clear legacy keys if they exist
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const getAccessToken = () => {
  // Always check localStorage first to get the most up-to-date token
  const tokenFromStorage = localStorage.getItem(TOKEN_KEYS.ACCESS);
  if (tokenFromStorage) {
    accessToken = tokenFromStorage;
  }
  return accessToken || tokenFromStorage;
};

// ----------------------------------------------------------------------------
// Normalizers: backend -> frontend types
// ----------------------------------------------------------------------------
const toDate = (value: any): Date => {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

export const unwrapList = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
};

export const normalizeUser = (raw: any): User => {
  return {
    id: String(raw?.id ?? ''),
    email: String(raw?.email ?? ''),
    name: String(raw?.name ?? ''),
    role: raw?.role,
    clientId: raw?.client?.id ?? raw?.client_id ?? raw?.clientId,
    floorId: raw?.floor?.id ?? raw?.floor_id ?? raw?.floorId,
    createdAt: toDate(raw?.created_at ?? raw?.createdAt),
    lastSeen: toDate(raw?.last_seen ?? raw?.lastSeen ?? raw?.updated_at),
  };
};

export const normalizeFolder = (raw: any): Folder => {
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    clientId: raw?.client_id ?? raw?.clientId ?? '',
    parentId: raw?.parent_id ?? raw?.parentId ?? undefined,
    type: raw?.type,
    coverImageUrl: String(raw?.cover_image_url ?? raw?.coverImageUrl ?? ''),
    musicFilesCount: typeof raw?.music_files_count === 'number' ? raw.music_files_count : undefined,
    createdAt: toDate(raw?.created_at ?? raw?.createdAt),
    createdBy: String(raw?.created_by_name ?? raw?.createdBy ?? ''),
  };
};

export const normalizeMusicFile = (raw: any): MusicFile => {
  // Try multiple possible duration field names
  const duration = raw?.duration ?? raw?.duration_seconds ?? raw?.durationSeconds ?? raw?.length ?? 0;
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.title ?? raw?.name ?? raw?.filename ?? ''),
    folderId: String(raw?.folder_id ?? raw?.folderId ?? ''),
    clientId: String(raw?.client_id ?? raw?.clientId ?? ''),
    url: String(raw?.file_url ?? raw?.url ?? ''),
    size: Number(raw?.file_size ?? raw?.size ?? 0),
    duration: Number(duration),
    type: String(raw?.type ?? 'audio/mpeg'),
    createdAt: toDate(raw?.created_at ?? raw?.createdAt),
    createdBy: String(raw?.uploaded_by_name ?? raw?.createdBy ?? ''),
  };
};

export const normalizeAnnouncement = (raw: any): AnnouncementAudio => {
  return {
    id: String(raw?.id ?? ''),
    title: String(raw?.title ?? ''),
    clientId: String(raw?.client_id ?? raw?.clientId ?? ''),
    folderId: raw?.folder_id ?? raw?.folderId ?? undefined,
    zoneId: raw?.zone_id ?? raw?.zoneId ?? undefined,
    zone: raw?.zone_name ?? raw?.zone?.name ?? raw?.zone ?? undefined,
    url: String(raw?.file_url ?? raw?.url ?? ''),
    duration: Number(raw?.duration ?? 0),
    type: raw?.type ?? (raw?.is_tts ? 'tts' : raw?.is_recording ? 'recorded' : 'uploaded'),
    enabled: Boolean(raw?.enabled ?? true),
    category: raw?.category ?? undefined,
    createdAt: toDate(raw?.created_at ?? raw?.createdAt),
    createdBy: String(raw?.created_by_name ?? raw?.createdBy ?? ''),
    scriptId: undefined,
    ttsText: raw?.tts_text ?? raw?.ttsText ?? undefined,
  };
};

export const normalizeDevice = (raw: any): Device => {
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? raw?.device_id ?? ''),
    clientId: String(raw?.client_id ?? raw?.clientId ?? raw?.client?.id ?? ''),
    status: (raw?.status ?? (raw?.is_online ? 'online' : 'offline')) as any,
    lastSeen: toDate(raw?.last_seen ?? raw?.lastSeen ?? raw?.updated_at ?? raw?.created_at),
    zone: String(raw?.zone_name ?? raw?.zone?.name ?? raw?.zone ?? raw?.floor_name ?? ''),
    ...(raw?.zone_id ? { zoneId: String(raw.zone_id) } : {}),
  } as any;
};

export const normalizeSchedule = (raw: any): Schedule => {
  const schedule = raw?.schedule ?? raw?.schedule_config ?? raw?.scheduleConfig ?? {};
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    clientId: String(raw?.client_id ?? raw?.clientId ?? ''),
    deviceIds: Array.isArray(raw?.devices)
      ? raw.devices.map((d: any) => String(d))
      : Array.isArray(raw?.device_ids)
        ? raw.device_ids.map((d: any) => String(d))
        : [],
    enabled: Boolean(raw?.enabled ?? true),
    schedule: schedule as any,
    createdAt: toDate(raw?.created_at ?? raw?.createdAt),
    createdBy: String(raw?.created_by_name ?? raw?.createdBy ?? ''),
    updatedAt: toDate(raw?.updated_at ?? raw?.updatedAt),
  };
};

// API Error Handler
export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Fetch wrapper with auth and refresh token logic
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Always get fresh token from localStorage
  const token = getAccessToken();
  // Add Authorization header for all endpoints except login/signup/refresh
  if (token && !endpoint.includes('/auth/login/') && !endpoint.includes('/auth/signup/') && !endpoint.includes('/auth/refresh/')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle token refresh on 401 (but not for auth endpoints like login, signup, refresh)
  const currentRefreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH);
  if (response.status === 401 && currentRefreshToken && 
      !endpoint.includes('/auth/login/') && 
      !endpoint.includes('/auth/signup/') && 
      !endpoint.includes('/auth/refresh/')) {
    try {
      // Update in-memory refreshToken
      refreshToken = currentRefreshToken;
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: currentRefreshToken }),
      });

      if (refreshResponse.ok) {
        const { access } = await refreshResponse.json();
        setTokens(access, currentRefreshToken);
        headers['Authorization'] = `Bearer ${access}`;

        // Retry original request
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        // Refresh failed, logout user and redirect to login
        clearTokens();
        // Redirect to login page - force navigation
        if (window.location.hash !== '#login') {
          window.location.hash = 'login';
          // Force reload if hash change doesn't work immediately
          setTimeout(() => {
            if (window.location.hash !== '#login') {
              window.location.href = window.location.origin + window.location.pathname + '#login';
            }
          }, 50);
        }
        throw new APIError(401, 'Session expired. Please log in again.');
      }
    } catch (error: any) {
      if (error instanceof APIError) throw error;
      clearTokens();
      if (window.location.hash !== '#login') {
        window.location.hash = 'login';
      }
      throw new APIError(401, 'Authentication failed. Please log in again.');
    }
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      // ignore parse error
    }

    // Redirect to login on 401 (but not for auth endpoints like login, signup, refresh)
    if (response.status === 401 && 
        !endpoint.includes('/auth/login/') && 
        !endpoint.includes('/auth/signup/') && 
        !endpoint.includes('/auth/refresh/')) {
      clearTokens();
      if (window.location.hash !== '#login') {
        window.location.hash = 'login';
      }
    }

    throw new APIError(
      response.status,
      errorData?.message || errorData?.error || `Request failed with status ${response.status}`,
      errorData
    );
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
}

// File upload helper
export async function uploadFile(
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>,
  onProgress?: (progress: number) => void,
  fileFieldName: string = 'file'
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append(fileFieldName, file);
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      });
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        // Try to parse error response for better error messages
        let errorData: any = {};
        let errorMessage = 'Upload failed';
        try {
          errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.detail || errorData.message || errorData.name?.[0] || errorData.non_field_errors?.[0] || errorMessage;
        } catch {
          // If not JSON, use response text
          errorMessage = xhr.responseText || errorMessage;
        }
        reject(new APIError(xhr.status, errorMessage, errorData));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new APIError(0, 'Network error'));
    });

    xhr.open('POST', `${API_BASE_URL}${endpoint}`);
    const token = getAccessToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

// Multiple files upload helper
export async function uploadMultipleFiles(
  endpoint: string,
  files: File[],
  fileFieldName: string,
  additionalData?: Record<string, any>
): Promise<any> {
  const formData = new FormData();
  for (const file of files) {
    formData.append(fileFieldName, file);
  }
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
  }

  const headers: HeadersInit = {};
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers, body: formData });
  const data = response.status !== 204 ? await response.json() : null;
  if (!response.ok) {
    throw new APIError(response.status, data?.message || 'Upload failed', data);
  }
  return data;
}

