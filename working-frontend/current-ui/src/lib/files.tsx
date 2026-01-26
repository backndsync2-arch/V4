import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './auth';
import { musicAPI, announcementsAPI, zonesAPI, schedulerAPI } from './api';
import { Folder, MusicFile, Announcement, Zone, Device, Schedule, ChannelPlaylist } from './types';
import { toast } from 'sonner';
import { wsClient } from './api';

// Version: 1.0.0 - Centralized file state management
interface FilesContextType {
  // State
  folders: Folder[];
  musicFiles: MusicFile[];
  announcements: Announcement[];
  zones: Zone[];
  devices: Device[];
  schedules: Schedule[];
  channelPlaylists: ChannelPlaylist[];

  // Loading states
  isLoading: {
    folders: boolean;
    musicFiles: boolean;
    announcements: boolean;
    zones: boolean;
    devices: boolean;
    schedules: boolean;
    channelPlaylists: boolean;
  };

  // Actions
  refreshFolders: () => Promise<void>;
  refreshMusicFiles: () => Promise<void>;
  refreshAnnouncements: () => Promise<void>;
  refreshZones: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshSchedules: () => Promise<void>;
  refreshChannelPlaylists: () => Promise<void>;

  // File operations
  uploadMusicFile: (folderId: string | undefined, file: File, onProgress?: (progress: number) => void) => Promise<MusicFile>;
  uploadMusicBatch: (files: File[], folderId?: string, onProgress?: (progress: number) => void) => Promise<MusicFile[]>;
  deleteMusicFile: (fileId: string) => Promise<void>;
  updateMusicFile: (id: string, data: Partial<MusicFile>) => Promise<MusicFile>;

  // Folder operations
  createFolder: (name: string, type: 'music' | 'announcements', imageFile?: File) => Promise<Folder>;
  deleteFolder: (folderId: string) => Promise<void>;
  updateFolder: (id: string, data: Partial<Folder>) => Promise<Folder>;

  // Announcement operations
  createAnnouncement: (data: {
    title: string;
    content?: string;
    file?: File;
    folderId?: string;
    isTts?: boolean;
    voice?: string;
    tone?: string;
  }) => Promise<Announcement>;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => Promise<Announcement>;
  deleteAnnouncement: (announcementId: string) => Promise<void>;

  // Zone operations
  createZone: (data: { name: string; description?: string; imageFile?: File }) => Promise<Zone>;
  updateZone: (id: string, data: Partial<Zone> & { imageFile?: File }) => Promise<Zone>;
  deleteZone: (zoneId: string) => Promise<void>;

  // Refresh all data
  refreshAll: () => Promise<void>;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

export function FilesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const clientId = user?.role === 'admin' ? null : user?.clientId;

  // State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [channelPlaylists, setChannelPlaylists] = useState<ChannelPlaylist[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState({
    folders: false,
    musicFiles: false,
    announcements: false,
    zones: false,
    devices: false,
    schedules: false,
    channelPlaylists: false,
  });

  // Helper to update loading state
  const setLoading = (key: keyof typeof isLoading, value: boolean) => {
    setIsLoading(prev => ({ ...prev, [key]: value }));
  };

  // Load data functions
  const loadFolders = useCallback(async () => {
    if (!user) return;
    setLoading('folders', true);
    try {
      const data = await musicAPI.getFolders().catch(() => []);
      setFolders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load folders:', error);
      toast.error('Failed to load folders', { description: error?.message || 'Please try again' });
    } finally {
      setLoading('folders', false);
    }
  }, [user]);

  const loadMusicFiles = useCallback(async () => {
    if (!user) return;
    setLoading('musicFiles', true);
    try {
      const data = await musicAPI.getMusicFiles().catch(() => []);
      setMusicFiles(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load music files:', error);
      toast.error('Failed to load music files', { description: error?.message || 'Please try again' });
    } finally {
      setLoading('musicFiles', false);
    }
  }, [user]);

  const loadAnnouncements = useCallback(async () => {
    if (!user) return;
    setLoading('announcements', true);
    try {
      const data = await announcementsAPI.getAnnouncements().catch(() => []);
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load announcements:', error);
      toast.error('Failed to load announcements', { description: error?.message || 'Please try again' });
    } finally {
      setLoading('announcements', false);
    }
  }, [user]);

  const loadZones = useCallback(async () => {
    if (!user) return;
    setLoading('zones', true);
    try {
      const data = await zonesAPI.getZones().catch(() => []);
      setZones(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load zones:', error);
      toast.error('Failed to load zones', { description: error?.message || 'Please try again' });
    } finally {
      setLoading('zones', false);
    }
  }, [user]);

  const loadDevices = useCallback(async () => {
    if (!user) return;
    setLoading('devices', true);
    try {
      const data = await zonesAPI.getDevices().catch(() => []);
      setDevices(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load devices:', error);
      toast.error('Failed to load devices', { description: error?.message || 'Please try again' });
    } finally {
      setLoading('devices', false);
    }
  }, [user]);

  const loadSchedules = useCallback(async () => {
    if (!user) return;
    setLoading('schedules', true);
    try {
      const data = await schedulerAPI.getSchedules().catch(() => []);
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load schedules:', error);
      toast.error('Failed to load schedules', { description: error?.message || 'Please try again' });
    } finally {
      setLoading('schedules', false);
    }
  }, [user]);

  const loadChannelPlaylists = useCallback(async () => {
    if (!user) return;
    setLoading('channelPlaylists', true);
    try {
      const data = await schedulerAPI.getChannelPlaylists().catch(() => []);
      setChannelPlaylists(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load channel playlists:', error);
      toast.error('Failed to load channel playlists', { description: error?.message || 'Please try again' });
    } finally {
      setLoading('channelPlaylists', false);
    }
  }, [user]);

  // File operations
  const uploadMusicFile = useCallback(async (
    folderId: string | undefined,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<MusicFile> => {
    try {
      const newFile = await musicAPI.uploadMusicFile(folderId, file, onProgress);
      setMusicFiles(prev => [...prev, newFile]);
      toast.success('Music file uploaded successfully');
      return newFile;
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload music file');
      throw error;
    }
  }, []);

  const uploadMusicBatch = useCallback(async (
    files: File[],
    folderId?: string,
    onProgress?: (progress: number) => void
  ): Promise<MusicFile[]> => {
    try {
      const newFiles = await musicAPI.uploadMusicBatch(files, folderId, onProgress);
      setMusicFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} music files uploaded successfully`);
      return newFiles;
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload music files');
      throw error;
    }
  }, []);

  const deleteMusicFile = useCallback(async (fileId: string) => {
    try {
      await musicAPI.deleteMusicFile(fileId);
      setMusicFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('Music file deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete music file');
      throw error;
    }
  }, []);

  const updateMusicFile = useCallback(async (id: string, data: Partial<MusicFile>) => {
    try {
      const updated = await musicAPI.updateMusicFile(id, data);
      setMusicFiles(prev => prev.map(f => f.id === id ? updated : f));
      toast.success('Music file updated successfully');
      return updated;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update music file');
      throw error;
    }
  }, []);

  // Folder operations
  const createFolder = useCallback(async (name: string, type: 'music' | 'announcements', imageFile?: File) => {
    try {
      const newFolder = await musicAPI.createFolder({ name, type, imageFile });
      setFolders(prev => [...prev, newFolder]);
      toast.success('Folder created successfully');
      return newFolder;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
      throw error;
    }
  }, []);

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      await musicAPI.deleteFolder(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      toast.success('Folder deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete folder');
      throw error;
    }
  }, []);

  const updateFolder = useCallback(async (id: string, data: Partial<Folder>) => {
    try {
      const updated = await musicAPI.updateFolder(id, data);
      setFolders(prev => prev.map(f => f.id === id ? updated : f));
      toast.success('Folder updated successfully');
      return updated;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update folder');
      throw error;
    }
  }, []);

  // Announcement operations
  const createAnnouncement = useCallback(async (data: {
    title: string;
    content?: string;
    file?: File;
    folderId?: string;
    isTts?: boolean;
    voice?: string;
    tone?: string;
  }) => {
    try {
      const newAnnouncement = await announcementsAPI.createAnnouncement(data);
      setAnnouncements(prev => [...prev, newAnnouncement]);
      toast.success('Announcement created successfully');
      return newAnnouncement;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create announcement');
      throw error;
    }
  }, []);

  const updateAnnouncement = useCallback(async (id: string, data: Partial<Announcement>) => {
    try {
      const updated = await announcementsAPI.updateAnnouncement(id, data);
      setAnnouncements(prev => prev.map(a => a.id === id ? updated : a));
      toast.success('Announcement updated successfully');
      return updated;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update announcement');
      throw error;
    }
  }, []);

  const deleteAnnouncement = useCallback(async (announcementId: string) => {
    try {
      await announcementsAPI.deleteAnnouncement(announcementId);
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      toast.success('Announcement deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement');
      throw error;
    }
  }, []);

  // Zone operations
  const createZone = useCallback(async (data: { name: string; description?: string; imageFile?: File }) => {
    try {
      const newZone = await zonesAPI.createZone(data);
      setZones(prev => [...prev, newZone]);
      toast.success('Zone created successfully');
      return newZone;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create zone');
      throw error;
    }
  }, []);

  const updateZone = useCallback(async (id: string, data: Partial<Zone> & { imageFile?: File }) => {
    try {
      const updated = await zonesAPI.updateZone(id, data);
      setZones(prev => prev.map(z => z.id === id ? updated : z));
      toast.success('Zone updated successfully');
      return updated;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update zone');
      throw error;
    }
  }, []);

  const deleteZone = useCallback(async (zoneId: string) => {
    try {
      await zonesAPI.deleteZone(zoneId);
      setZones(prev => prev.filter(z => z.id !== zoneId));
      toast.success('Zone deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete zone');
      throw error;
    }
  }, []);

  // Refresh functions
  const refreshFolders = useCallback(async () => {
    await loadFolders();
  }, [loadFolders]);

  const refreshMusicFiles = useCallback(async () => {
    await loadMusicFiles();
  }, [loadMusicFiles]);

  const refreshAnnouncements = useCallback(async () => {
    await loadAnnouncements();
  }, [loadAnnouncements]);

  const refreshZones = useCallback(async () => {
    await loadZones();
  }, [loadZones]);

  const refreshDevices = useCallback(async () => {
    await loadDevices();
  }, [loadDevices]);

  const refreshSchedules = useCallback(async () => {
    await loadSchedules();
  }, [loadSchedules]);

  const refreshChannelPlaylists = useCallback(async () => {
    await loadChannelPlaylists();
  }, [loadChannelPlaylists]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadFolders(),
      loadMusicFiles(),
      loadAnnouncements(),
      loadZones(),
      loadDevices(),
      loadSchedules(),
      loadChannelPlaylists(),
    ]);
  }, [loadFolders, loadMusicFiles, loadAnnouncements, loadZones, loadDevices, loadSchedules, loadChannelPlaylists]);

  // Load initial data
  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user, refreshAll]);

  // WebSocket real-time updates
  useEffect(() => {
    const handleFileUpdate = (data: any) => {
      if (data.type === 'file_created' && data.file) {
        if (data.file.type === 'music') {
          setMusicFiles(prev => [...prev.filter(f => f.id !== data.file.id), data.file]);
        } else if (data.file.type === 'announcement') {
          setAnnouncements(prev => [...prev.filter(a => a.id !== data.file.id), data.file]);
        }
      } else if (data.type === 'file_deleted') {
        if (data.fileType === 'music') {
          setMusicFiles(prev => prev.filter(f => f.id !== data.fileId));
        } else if (data.fileType === 'announcement') {
          setAnnouncements(prev => prev.filter(a => a.id !== data.fileId));
        }
      } else if (data.type === 'folder_created') {
        setFolders(prev => [...prev.filter(f => f.id !== data.folder.id), data.folder]);
      } else if (data.type === 'folder_deleted') {
        setFolders(prev => prev.filter(f => f.id !== data.folderId));
      }
    };

    wsClient.on('file_update', handleFileUpdate);

    return () => {
      wsClient.off('file_update', handleFileUpdate);
    };
  }, []);

  const contextValue: FilesContextType = {
    // State
    folders,
    musicFiles,
    announcements,
    zones,
    devices,
    schedules,
    channelPlaylists,

    // Loading states
    isLoading,

    // Actions
    refreshFolders,
    refreshMusicFiles,
    refreshAnnouncements,
    refreshZones,
    refreshDevices,
    refreshSchedules,
    refreshChannelPlaylists,

    // File operations
    uploadMusicFile,
    uploadMusicBatch,
    deleteMusicFile,
    updateMusicFile,

    // Folder operations
    createFolder,
    deleteFolder,
    updateFolder,

    // Announcement operations
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,

    // Zone operations
    createZone,
    updateZone,
    deleteZone,

    // Refresh all
    refreshAll,
  };

  return (
    <FilesContext.Provider value={contextValue}>
      {children}
    </FilesContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FilesContext);
  if (!context) {
    throw new Error('useFiles must be used within FilesProvider');
  }
  return context;
}