import { User, Client, Device, Folder, MusicFile, AnnouncementScript, AnnouncementAudio, Schedule, PlayEvent, AuditLog, ChannelPlaylist, Floor } from './types';

// Mock data for development - CLEARED FOR PRODUCTION
// All mock data has been removed. Application now requires backend connection.
export const mockUsers: User[] = [];
export const mockClients: Client[] = [];
export const mockDevices: Device[] = [];
export const mockFloors: Floor[] = [];
export const mockFolders: Folder[] = [];
export const mockMusicFiles: MusicFile[] = [];
export const mockMusicQueue: any[] = [];
export const mockAnnouncementScripts: AnnouncementScript[] = [];
export const mockAnnouncementAudio: AnnouncementAudio[] = [];

// Pre-made announcement templates by sync2gear
export interface AnnouncementTemplate {
  id: string;
  title: string;
  description: string;
  category: 'retail' | 'restaurant' | 'office' | 'healthcare' | 'gym' | 'general';
  image: string;
  script: string;
  duration: number;
  voiceType: 'professional' | 'friendly' | 'energetic' | 'calm';
  availableFor: 'all' | string[]; // 'all' or array of client IDs
  createdBy: string; // sync2gear admin ID
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

// Templates are system-provided and can remain for UI reference
export const mockAnnouncementTemplates: AnnouncementTemplate[] = [];

export interface MusicTemplate {
  id: string;
  title: string;
  description: string;
  category: 'ambient' | 'upbeat' | 'jazz' | 'classical' | 'corporate' | 'workout' | 'chill';
  image: string;
  tracks: {
    name: string;
    artist: string;
    duration: number;
  }[];
  totalDuration: number;
  mood: 'relaxing' | 'energetic' | 'professional' | 'sophisticated' | 'motivating';
  availableFor: 'all' | string[]; // 'all' or array of client IDs
  createdBy: string; // sync2gear admin ID
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

// Templates are system-provided and can remain for UI reference
export const mockMusicTemplates: MusicTemplate[] = [];

export const mockSchedules: Schedule[] = [];
export const mockPlayEvents: PlayEvent[] = [];
export const mockAuditLogs: AuditLog[] = [];
export const mockChannelPlaylists: ChannelPlaylist[] = [];