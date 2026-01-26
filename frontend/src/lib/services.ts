/**
 * Service Layer - Automatic Mock/Real Backend Switching
 * 
 * This layer provides a unified interface for data operations that automatically
 * switches between mock data (development) and real backend API calls (production).
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import * as api from './api';
import * as mockData from './mockData';
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
  PlayEvent,
  AuditLog,
} from './types';

// Environment configuration
// Default to REAL backend calls unless explicitly forced into mock mode.
// (We can't rely on VITE_API_BASE_URL existing because this repo may not ship a .env file.)
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const IS_DEVELOPMENT = import.meta.env.DEV;

// Helper to simulate API delays in mock mode
const mockDelay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to simulate errors for testing
const shouldSimulateError = () => IS_DEVELOPMENT && Math.random() < 0.05; // 5% error rate in dev

// ============================================================================
// AUTHENTICATION SERVICES
// ============================================================================

export const authService = {
  signIn: async (email: string, password: string): Promise<{ user: User; access: string; refresh: string }> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const user = mockData.mockUsers.find(u => u.email === email);
      if (!user || password !== 'demo') {
        throw new Error('Invalid credentials');
      }
      return {
        user,
        access: 'mock_access_token',
        refresh: 'mock_refresh_token',
      };
    }
    return api.authAPI.signIn(email, password);
  },

  signUp: async (data: {
    email: string;
    password: string;
    name: string;
    companyName: string;
  }): Promise<{ user: User; access: string; refresh: string }> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newUser: User = {
        id: `user${Date.now()}`,
        email: data.email,
        name: data.name,
        role: 'client',
        clientId: `client${Date.now()}`,
        createdAt: new Date(),
        lastSeen: new Date(),
      };
      return {
        user: newUser,
        access: 'mock_access_token',
        refresh: 'mock_refresh_token',
      };
    }
    return api.authAPI.signUp(data);
  },

  signOut: async (): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay(100);
      return;
    }
    return api.authAPI.signOut();
  },

  getCurrentUser: async (): Promise<User> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockUsers[1]; // Return default client user
    }
    return api.authAPI.getCurrentUser();
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return { ...mockData.mockUsers[1], ...data };
    }
    return api.authAPI.updateProfile(data);
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      if (oldPassword !== 'demo') {
        throw new Error('Invalid old password');
      }
      return;
    }
    return api.authAPI.changePassword(oldPassword, newPassword);
  },
};

// ============================================================================
// MUSIC LIBRARY SERVICES
// ============================================================================

export const musicService = {
  getFolders: async (): Promise<Folder[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockFolders.filter(f => f.type === 'music');
    }
    return api.musicAPI.getFolders();
  },

  createFolder: async (data: { name: string; description?: string }): Promise<Folder> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newFolder: Folder = {
        id: `folder${Date.now()}`,
        name: data.name,
        clientId: 'client1',
        type: 'music',
        createdAt: new Date(),
        createdBy: 'user2',
      };
      mockData.mockFolders.push(newFolder);
      return newFolder;
    }
    return api.musicAPI.createFolder(data);
  },

  updateFolder: async (id: string, data: Partial<Folder>): Promise<Folder> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const folder = mockData.mockFolders.find(f => f.id === id);
      if (!folder) throw new Error('Folder not found');
      Object.assign(folder, data);
      return folder;
    }
    return api.musicAPI.updateFolder(id, data);
  },

  deleteFolder: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockData.mockFolders.findIndex(f => f.id === id);
      if (index > -1) mockData.mockFolders.splice(index, 1);
      return;
    }
    return api.musicAPI.deleteFolder(id);
  },

  getMusicFiles: async (folderId?: string): Promise<MusicFile[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return folderId
        ? mockData.mockMusicFiles.filter(f => f.folderId === folderId)
        : mockData.mockMusicFiles;
    }
    return api.musicAPI.getMusicFiles(folderId);
  },

  uploadMusicFile: async (
    file: File,
    data: {
      folder_id?: string;
      title?: string;
      artist?: string;
      album?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<MusicFile> => {
    if (USE_MOCK_DATA) {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await mockDelay(100);
        onProgress?.(i);
      }
      const newFile: MusicFile = {
        id: `music${Date.now()}`,
        name: file.name,
        folderId: data.folder_id || '',
        clientId: 'client1',
        url: URL.createObjectURL(file),
        size: file.size,
        duration: 180, // Mock duration
        type: file.type,
        createdAt: new Date(),
        createdBy: 'user2',
      };
      mockData.mockMusicFiles.push(newFile);
      return newFile;
    }
    return api.musicAPI.uploadMusicFile(file, data, onProgress);
  },

  uploadMusicBatch: async (
    files: File[],
    folderId?: string,
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<MusicFile[]> => {
    if (USE_MOCK_DATA) {
      const results: MusicFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const result = await musicService.uploadMusicFile(
          files[i],
          { folder_id: folderId },
          (progress) => onProgress?.(i, progress)
        );
        results.push(result);
      }
      return results;
    }
    return api.musicAPI.uploadMusicBatch(files, folderId, onProgress);
  },

  updateMusicFile: async (id: string, data: Partial<MusicFile>): Promise<MusicFile> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const file = mockData.mockMusicFiles.find(f => f.id === id);
      if (!file) throw new Error('Music file not found');
      Object.assign(file, data);
      return file;
    }
    return api.musicAPI.updateMusicFile(id, data);
  },

  deleteMusicFile: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockData.mockMusicFiles.findIndex(f => f.id === id);
      if (index > -1) mockData.mockMusicFiles.splice(index, 1);
      return;
    }
    return api.musicAPI.deleteMusicFile(id);
  },

  searchMusic: async (query: string): Promise<MusicFile[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const lowerQuery = query.toLowerCase();
      return mockData.mockMusicFiles.filter(f =>
        f.name.toLowerCase().includes(lowerQuery)
      );
    }
    return api.musicAPI.searchMusic(query);
  },
};

// ============================================================================
// ANNOUNCEMENTS SERVICES
// ============================================================================

export const announcementsService = {
  getScripts: async (): Promise<AnnouncementScript[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockAnnouncementScripts;
    }
    // Note: API needs to be extended to support scripts separately
    return [];
  },

  getAudio: async (): Promise<AnnouncementAudio[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockAnnouncementAudio;
    }
    // Note: API needs to be extended to support audio separately
    return [];
  },

  createTTSAnnouncement: async (data: {
    title: string;
    text: string;
    voice?: string;
    folder_id?: string;
  }): Promise<AnnouncementAudio> => {
    if (USE_MOCK_DATA) {
      await mockDelay(1500); // Simulate TTS generation time
      const newScript: AnnouncementScript = {
        id: `script${Date.now()}`,
        title: data.title,
        text: data.text,
        clientId: 'client1',
        folderId: data.folder_id,
        enabled: true,
        createdAt: new Date(),
        createdBy: 'user2',
      };
      const newAudio: AnnouncementAudio = {
        id: `audio${Date.now()}`,
        title: data.title,
        scriptId: newScript.id,
        clientId: 'client1',
        folderId: data.folder_id,
        url: '#', // Mock URL
        duration: Math.ceil(data.text.length / 15), // Rough estimate
        type: 'tts',
        enabled: true,
        createdAt: new Date(),
        createdBy: 'user2',
      };
      mockData.mockAnnouncementScripts.push(newScript);
      mockData.mockAnnouncementAudio.push(newAudio);
      return newAudio;
    }
    return api.announcementsAPI.createTTSAnnouncement(data) as any;
  },

  uploadAnnouncement: async (
    file: File,
    data: { title: string; folder_id?: string },
    onProgress?: (progress: number) => void
  ): Promise<AnnouncementAudio> => {
    if (USE_MOCK_DATA) {
      for (let i = 0; i <= 100; i += 10) {
        await mockDelay(100);
        onProgress?.(i);
      }
      const newAudio: AnnouncementAudio = {
        id: `audio${Date.now()}`,
        title: data.title,
        clientId: 'client1',
        folderId: data.folder_id,
        url: URL.createObjectURL(file),
        duration: 15, // Mock duration
        type: 'uploaded',
        enabled: true,
        createdAt: new Date(),
        createdBy: 'user2',
      };
      mockData.mockAnnouncementAudio.push(newAudio);
      return newAudio;
    }
    return api.announcementsAPI.uploadAnnouncement(file, data, onProgress) as any;
  },

  recordAnnouncement: async (
    audioBlob: Blob,
    data: { title: string; folder_id?: string }
  ): Promise<AnnouncementAudio> => {
    if (USE_MOCK_DATA) {
      await mockDelay(500);
      const newAudio: AnnouncementAudio = {
        id: `audio${Date.now()}`,
        title: data.title,
        clientId: 'client1',
        folderId: data.folder_id,
        url: URL.createObjectURL(audioBlob),
        duration: 10, // Mock duration
        type: 'recorded',
        enabled: true,
        createdAt: new Date(),
        createdBy: 'user2',
      };
      mockData.mockAnnouncementAudio.push(newAudio);
      return newAudio;
    }
    return api.announcementsAPI.recordAnnouncement(audioBlob, data) as any;
  },

  updateAnnouncement: async (id: string, data: Partial<AnnouncementAudio>): Promise<AnnouncementAudio> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const announcement = mockData.mockAnnouncementAudio.find(a => a.id === id);
      if (!announcement) throw new Error('Announcement not found');
      Object.assign(announcement, data);
      return announcement;
    }
    return api.announcementsAPI.updateAnnouncement(id, data) as any;
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockData.mockAnnouncementAudio.findIndex(a => a.id === id);
      if (index > -1) mockData.mockAnnouncementAudio.splice(index, 1);
      return;
    }
    return api.announcementsAPI.deleteAnnouncement(id);
  },

  playInstant: async (id: string, zoneIds: string[]): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      console.log(`Playing announcement ${id} on zones:`, zoneIds);
      return;
    }
    return api.announcementsAPI.playInstantAnnouncement(id, zoneIds);
  },
};

// ============================================================================
// SCHEDULER SERVICES
// ============================================================================

export const schedulerService = {
  getSchedules: async (): Promise<Schedule[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockSchedules;
    }
    return api.schedulerAPI.getSchedules();
  },

  createSchedule: async (data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newSchedule: Schedule = {
        ...data,
        id: `schedule${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.mockSchedules.push(newSchedule);
      return newSchedule;
    }
    return api.schedulerAPI.createSchedule(data);
  },

  updateSchedule: async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const schedule = mockData.mockSchedules.find(s => s.id === id);
      if (!schedule) throw new Error('Schedule not found');
      Object.assign(schedule, data, { updatedAt: new Date() });
      return schedule;
    }
    return api.schedulerAPI.updateSchedule(id, data);
  },

  deleteSchedule: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockData.mockSchedules.findIndex(s => s.id === id);
      if (index > -1) mockData.mockSchedules.splice(index, 1);
      return;
    }
    return api.schedulerAPI.deleteSchedule(id);
  },

  toggleSchedule: async (id: string, active: boolean): Promise<Schedule> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const schedule = mockData.mockSchedules.find(s => s.id === id);
      if (!schedule) throw new Error('Schedule not found');
      schedule.enabled = active;
      return schedule;
    }
    return api.schedulerAPI.toggleSchedule(id, active);
  },
};

// ============================================================================
// ZONES & DEVICES SERVICES
// ============================================================================

export const zonesService = {
  getFloors: async (): Promise<Floor[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockFloors;
    }
    // Note: API needs to be extended to support floors
    return [];
  },

  createFloor: async (data: { name: string; description?: string }): Promise<Floor> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newFloor: Floor = {
        id: `floor${Date.now()}`,
        name: data.name,
        clientId: 'client1',
        description: data.description,
        deviceIds: [],
        isPremium: mockData.mockFloors.length > 0, // First floor is free
        createdAt: new Date(),
        createdBy: 'user2',
      };
      mockData.mockFloors.push(newFloor);
      return newFloor;
    }
    // API call would go here
    throw new Error('Not implemented');
  },

  updateFloor: async (id: string, data: Partial<Floor>): Promise<Floor> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const floor = mockData.mockFloors.find(f => f.id === id);
      if (!floor) throw new Error('Floor not found');
      Object.assign(floor, data);
      return floor;
    }
    throw new Error('Not implemented');
  },

  deleteFloor: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockData.mockFloors.findIndex(f => f.id === id);
      if (index > -1) mockData.mockFloors.splice(index, 1);
      return;
    }
    throw new Error('Not implemented');
  },

  getDevices: async (floorId?: string): Promise<Device[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      if (floorId) {
        const floor = mockData.mockFloors.find(f => f.id === floorId);
        if (!floor) return [];
        return mockData.mockDevices.filter(d => floor.deviceIds.includes(d.id));
      }
      return mockData.mockDevices;
    }
    return api.zonesAPI.getDevices(floorId);
  },

  registerDevice: async (data: {
    name: string;
    zone_id: string;
    device_type: string;
  }): Promise<Device> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newDevice: Device = {
        id: `device${Date.now()}`,
        name: data.name,
        clientId: 'client1',
        status: 'online',
        lastSeen: new Date(),
        zone: data.zone_id,
      };
      mockData.mockDevices.push(newDevice);
      return newDevice;
    }
    return api.zonesAPI.registerDevice(data);
  },

  updateDevice: async (id: string, data: Partial<Device>): Promise<Device> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const device = mockData.mockDevices.find(d => d.id === id);
      if (!device) throw new Error('Device not found');
      Object.assign(device, data);
      return device;
    }
    return api.zonesAPI.updateDevice(id, data);
  },

  deleteDevice: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockData.mockDevices.findIndex(d => d.id === id);
      if (index > -1) mockData.mockDevices.splice(index, 1);
      return;
    }
    return api.zonesAPI.deleteDevice(id);
  },
};

// ============================================================================
// CHANNEL PLAYLISTS SERVICES
// ============================================================================

export const channelPlaylistsService = {
  getPlaylists: async (): Promise<ChannelPlaylist[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockChannelPlaylists;
    }
    // API call would go here
    return [];
  },

  createPlaylist: async (data: Omit<ChannelPlaylist, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChannelPlaylist> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newPlaylist: ChannelPlaylist = {
        ...data,
        id: `playlist${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.mockChannelPlaylists.push(newPlaylist);
      return newPlaylist;
    }
    throw new Error('Not implemented');
  },

  updatePlaylist: async (id: string, data: Partial<ChannelPlaylist>): Promise<ChannelPlaylist> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const playlist = mockData.mockChannelPlaylists.find(p => p.id === id);
      if (!playlist) throw new Error('Playlist not found');
      Object.assign(playlist, data, { updatedAt: new Date() });
      return playlist;
    }
    throw new Error('Not implemented');
  },

  deletePlaylist: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockData.mockChannelPlaylists.findIndex(p => p.id === id);
      if (index > -1) mockData.mockChannelPlaylists.splice(index, 1);
      return;
    }
    throw new Error('Not implemented');
  },
};

// ============================================================================
// CLIENT SERVICES
// ============================================================================

export const clientService = {
  getClients: async (): Promise<Client[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockClients;
    }
    return api.adminAPI.getClients();
  },

  getCurrentClient: async (): Promise<Client> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockClients[0];
    }
    // API would return current user's client
    const clients = await api.adminAPI.getClients();
    return clients[0];
  },

  updateClient: async (id: string, data: Partial<Client>): Promise<Client> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const client = mockData.mockClients.find(c => c.id === id);
      if (!client) throw new Error('Client not found');
      Object.assign(client, data, { updatedAt: new Date() });
      return client;
    }
    return api.adminAPI.updateClient(id, data);
  },
};

// ============================================================================
// ADMIN SERVICES
// ============================================================================

export const adminService = {
  getUsers: async (): Promise<User[]> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockData.mockUsers;
    }
    return api.adminAPI.getUsers();
  },

  createUser: async (data: {
    email: string;
    password: string;
    name: string;
    role: string;
    client_id?: string;
  }): Promise<User> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newUser: User = {
        id: `user${Date.now()}`,
        email: data.email,
        name: data.name,
        role: data.role as any,
        clientId: data.client_id,
        createdAt: new Date(),
        lastSeen: new Date(),
      };
      mockData.mockUsers.push(newUser);
      return newUser;
    }
    return api.adminAPI.createUser(data);
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const user = mockData.mockUsers.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      Object.assign(user, data);
      return user;
    }
    return api.adminAPI.updateUser(id, data);
  },

  deleteUser: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockData.mockUsers.findIndex(u => u.id === id);
      if (index > -1) mockData.mockUsers.splice(index, 1);
      return;
    }
    return api.adminAPI.deleteUser(id);
  },

  getStats: async (): Promise<{
    total_clients: number;
    active_devices: number;
    total_music_files: number;
    total_announcements: number;
    storage_used: number;
  }> => {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return {
        total_clients: mockData.mockClients.length,
        active_devices: mockData.mockDevices.filter(d => d.status === 'online').length,
        total_music_files: mockData.mockMusicFiles.length,
        total_announcements: mockData.mockAnnouncementAudio.length,
        storage_used: mockData.mockMusicFiles.reduce((acc, f) => acc + f.size, 0),
      };
    }
    return api.adminAPI.getStats();
  },
};

// ============================================================================
// EXPORT ENVIRONMENT INFO
// ============================================================================

export const getEnvironmentInfo = () => ({
  useMockData: USE_MOCK_DATA,
  isDevelopment: IS_DEVELOPMENT,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL,
});
