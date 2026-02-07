/**
 * Music Library API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { MusicFile, Folder } from '../types';
import { apiFetch, uploadFile, uploadMultipleFiles, unwrapList, normalizeFolder, normalizeMusicFile, API_BASE_URL, getAccessToken, APIError } from './core';

export const musicAPI = {
  // Get all folders (optionally filtered by zone and type)
  getFolders: async (type?: 'music' | 'announcements', zoneId?: string): Promise<Folder[]> => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (zoneId) params.append('zone', zoneId);
    const query = params.toString();
    const res = await apiFetch(`/music/folders/${query ? `?${query}` : ''}`);
    return unwrapList(res).map(normalizeFolder);
  },

  // Create folder
  createFolder: async (data: {
    name: string;
    description?: string;
    type?: 'music' | 'announcements';
    cover_image?: File;
    zone_id?: string;
    client_id?: string;
  }): Promise<Folder> => {
    // Backend requires multipart/form-data (MultiPartParser), so always use FormData
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.type) {
      formData.append('type', data.type);
    }
    if (data.zone_id) {
      formData.append('zone_id', data.zone_id);
    }
    if (data.client_id) {
      formData.append('client_id', data.client_id);
    }
    if (data.cover_image) {
      formData.append('cover_image', data.cover_image);
    }
    
    // Send FormData directly using XMLHttpRequest (similar to uploadFile but without requiring a file)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(normalizeFolder(response));
          } catch (error) {
            reject(new APIError(xhr.status, 'Failed to parse response', xhr.responseText));
          }
        } else {
          // Try to parse error response for better error messages
          let errorData: any = {};
          let errorMessage = 'Upload failed';
          try {
            errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.detail || errorData.message || errorData.name?.[0] || errorData.non_field_errors?.[0] || errorMessage;
          } catch {
            errorMessage = xhr.responseText || errorMessage;
          }
          reject(new APIError(xhr.status, errorMessage, errorData));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new APIError(0, 'Network error'));
      });
      
      xhr.open('POST', `${API_BASE_URL}/music/folders/`);
      const token = getAccessToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      xhr.send(formData);
    });
  },

  // Update folder
  updateFolder: async (id: string, data: Partial<Folder & { cover_image?: File }>): Promise<Folder> => {
    // If we have a cover_image file, use multipart upload
    if (data.cover_image) {
      const { cover_image, ...rest } = data;
      const formData = new FormData();
      formData.append('cover_image', cover_image);
      if (rest.name) formData.append('name', rest.name);
      
      const headers: HeadersInit = {};
      const token = getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/music/folders/${id}/`, {
        method: 'PATCH',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(response.status, errorData?.message || 'Update failed', errorData);
      }
      
      const res = await response.json();
      return normalizeFolder(res);
    }
    
    // No file upload, use JSON
    const { cover_image: _unused, ...rest } = data;
    const res = await apiFetch(`/music/folders/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(rest),
    });
    return normalizeFolder(res);
  },

  // Delete folder
  deleteFolder: async (id: string): Promise<void> => {
    return apiFetch(`/music/folders/${id}/`, { method: 'DELETE' });
  },

  // Get music files (optionally filtered by folder and zone)
  getMusicFiles: async (folderId?: string, zoneId?: string): Promise<MusicFile[]> => {
    const params = new URLSearchParams();
    if (folderId) params.append('folder', folderId);
    if (zoneId) params.append('zone', zoneId);
    const query = params.toString();
    const res = await apiFetch(`/music/files/${query ? `?${query}` : ''}`);
    return unwrapList(res).map(normalizeMusicFile);
  },

  // Upload music file
  uploadMusicFile: async (
    file: File,
    data: {
      folder_id?: string;
      zone_id?: string;
      title?: string;
      artist?: string;
      album?: string;
      cover_art?: File;
      client_id?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<MusicFile> => {
    // Backend expects POST /music/files/ with multipart field "file" and optional "cover_art"
    // If cover_art is provided, we need to upload it as a separate file field
    if (data.cover_art) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cover_art', data.cover_art);
      if (data.folder_id) formData.append('folder_id', data.folder_id);
      if (data.zone_id) formData.append('zone_id', data.zone_id);
      if (data.title) formData.append('title', data.title);
      if (data.artist) formData.append('artist', data.artist);
      if (data.album) formData.append('album', data.album);
      if (data.client_id) formData.append('client_id', data.client_id);
      
      const headers: HeadersInit = {};
      const token = getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress((e.loaded / e.total) * 100);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(normalizeMusicFile(JSON.parse(xhr.responseText)));
          } else {
            let errorData: any = {};
            try {
              errorData = JSON.parse(xhr.responseText);
            } catch {
              // ignore parse error
            }
            reject(new APIError(xhr.status, errorData?.message || 'Upload failed', errorData));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new APIError(0, 'Network error'));
        });
        
        xhr.open('POST', `${API_BASE_URL}/music/files/`);
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        xhr.send(formData);
      });
    }
    
    // No cover art, use existing uploadFile function
    const { cover_art: _unused, ...rest } = data;
    // uploadFile expects formData fields, so we need to handle zone_id
    const formData = new FormData();
    formData.append('file', file);
    if (data.folder_id) formData.append('folder_id', data.folder_id);
    if (data.zone_id) formData.append('zone_id', data.zone_id);
    if (data.title) formData.append('title', data.title);
    if (data.artist) formData.append('artist', data.artist);
    if (data.album) formData.append('album', data.album);
    if (data.client_id) formData.append('client_id', data.client_id);
    
    const headers: HeadersInit = {};
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(normalizeMusicFile(JSON.parse(xhr.responseText)));
        } else {
          let errorData: any = {};
          try {
            errorData = JSON.parse(xhr.responseText);
          } catch {
            // ignore parse error
          }
          reject(new APIError(xhr.status, errorData?.message || 'Upload failed', errorData));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new APIError(0, 'Network error'));
      });
      
      xhr.open('POST', `${API_BASE_URL}/music/files/`);
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      xhr.send(formData);
    });
  },

  // Batch upload music files
  uploadMusicBatch: async (
    files: File[],
    folderId?: string,
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<MusicFile[]> => {
    // Use backend batch endpoint: /music/files/batch_upload/ with multipart field "files"
    // (No per-file progress here; callers can show indeterminate or per-file fallback.)
    if (onProgress) {
      onProgress(0, 0);
    }
    const res = await uploadMultipleFiles('/music/files/batch_upload/', files, 'files', { folder_id: folderId });
    const uploaded = Array.isArray(res?.uploaded) ? res.uploaded : [];
    if (onProgress) {
      onProgress(files.length - 1, 100);
    }
    return uploaded.map(normalizeMusicFile);
  },

  // Update music file metadata
  updateMusicFile: async (id: string, data: Partial<MusicFile>): Promise<MusicFile> => {
    const res = await apiFetch(`/music/files/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeMusicFile(res);
  },

  // Upload cover art
  uploadCoverArt: async (musicId: string, file: File): Promise<MusicFile> => {
    // Backend expects /music/files/{id}/upload_cover_art/ with multipart field "cover_art"
    const res = await uploadFile(`/music/files/${musicId}/upload_cover_art/`, file, undefined, undefined, 'cover_art');
    return normalizeMusicFile(res);
  },

  // Delete music file
  deleteMusicFile: async (id: string): Promise<void> => {
    return apiFetch(`/music/files/${id}/`, { method: 'DELETE' });
  },

  // Search music
  searchMusic: async (query: string): Promise<MusicFile[]> => {
    const res = await apiFetch(`/music/files/?search=${encodeURIComponent(query)}`);
    return unwrapList(res).map(normalizeMusicFile);
  },

  // Reorder tracks in folder
  reorderTracks: async (folderId: string, trackIds: string[]): Promise<void> => {
    return apiFetch(`/music/files/reorder/`, {
      method: 'POST',
      body: JSON.stringify({ folder_id: folderId, track_ids: trackIds }),
    });
  },
};

