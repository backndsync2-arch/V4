/**
 * React Data Hooks - Unified Data Fetching
 * 
 * Custom hooks for fetching and managing data with automatic caching,
 * loading states, and error handling.
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import { useState, useEffect, useCallback } from 'react';
import * as services from '../services';
import type {
  User,
  Client,
  Device,
  Floor,
  Folder,
  MusicFile,
  AnnouncementScript,
  AnnouncementAudio,
  Schedule,
  ChannelPlaylist,
} from '../types';

// Generic hook state interface
interface UseDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Generic hook for data fetching
function useData<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = []
): UseDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err as Error);
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// AUTHENTICATION HOOKS
// ============================================================================

export function useCurrentUser() {
  return useData<User>(services.authService.getCurrentUser);
}

// ============================================================================
// MUSIC LIBRARY HOOKS
// ============================================================================

export function useMusicFolders() {
  return useData<Folder[]>(services.musicService.getFolders);
}

export function useMusicFiles(folderId?: string) {
  return useData<MusicFile[]>(
    () => services.musicService.getMusicFiles(folderId),
    [folderId]
  );
}

export function useSearchMusic(query: string) {
  const [results, setResults] = useState<MusicFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await services.musicService.searchMusic(query);
        setResults(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimer);
  }, [query]);

  return { results, loading, error };
}

// ============================================================================
// ANNOUNCEMENTS HOOKS
// ============================================================================

export function useAnnouncementScripts() {
  return useData<AnnouncementScript[]>(services.announcementsService.getScripts);
}

export function useAnnouncementAudio() {
  return useData<AnnouncementAudio[]>(services.announcementsService.getAudio);
}

// ============================================================================
// SCHEDULER HOOKS
// ============================================================================

export function useSchedules() {
  return useData<Schedule[]>(services.schedulerService.getSchedules);
}

// ============================================================================
// ZONES & DEVICES HOOKS
// ============================================================================

export function useFloors() {
  return useData<Floor[]>(services.zonesService.getFloors);
}

export function useDevices(floorId?: string) {
  return useData<Device[]>(
    () => services.zonesService.getDevices(floorId),
    [floorId]
  );
}

// ============================================================================
// CHANNEL PLAYLISTS HOOKS
// ============================================================================

export function useChannelPlaylists() {
  return useData<ChannelPlaylist[]>(services.channelPlaylistsService.getPlaylists);
}

// ============================================================================
// CLIENT HOOKS
// ============================================================================

export function useCurrentClient() {
  return useData<Client>(services.clientService.getCurrentClient);
}

export function useClients() {
  return useData<Client[]>(services.clientService.getClients);
}

// ============================================================================
// ADMIN HOOKS
// ============================================================================

export function useUsers() {
  return useData<User[]>(services.adminService.getUsers);
}

export function useAdminStats() {
  return useData<{
    total_clients: number;
    active_devices: number;
    total_music_files: number;
    total_announcements: number;
    storage_used: number;
  }>(services.adminService.getStats);
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<void>;
  data: TData | null;
  loading: boolean;
  error: Error | null;
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TVariables>
): UseMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      try {
        setLoading(true);
        setError(null);
        const result = await mutationFn(variables);
        setData(result);
        options?.onSuccess?.(result);
      } catch (err) {
        const error = err as Error;
        setError(error);
        options?.onError?.(error);
      } finally {
        setLoading(false);
      }
    },
    [mutationFn, options]
  );

  return { mutate, data, loading, error };
}

// ============================================================================
// UPLOAD HOOKS
// ============================================================================

interface UseUploadResult<T> {
  upload: (file: File, data?: any) => Promise<void>;
  progress: number;
  loading: boolean;
  error: Error | null;
  data: T | null;
}

export function useUpload<T>(
  uploadFn: (file: File, data: any, onProgress: (p: number) => void) => Promise<T>,
  options?: UseMutationOptions<T, { file: File; data?: any }>
): UseUploadResult<T> {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const upload = useCallback(
    async (file: File, data?: any) => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);
        const result = await uploadFn(file, data || {}, setProgress);
        setData(result);
        setProgress(100);
        options?.onSuccess?.(result);
      } catch (err) {
        const error = err as Error;
        setError(error);
        options?.onError?.(error);
      } finally {
        setLoading(false);
      }
    },
    [uploadFn, options]
  );

  return { upload, progress, loading, error, data };
}

// Music upload hook
export function useMusicUpload() {
  return useUpload(services.musicService.uploadMusicFile);
}

// Announcement upload hook
export function useAnnouncementUpload() {
  return useUpload(services.announcementsService.uploadAnnouncement);
}
