// Core types for sync2gear application

// Global type declarations
declare global {
  interface Window {
    Calendly?: any;
  }

  namespace NodeJS {
    interface Timeout {
      ref(): this;
      unref(): this;
      hasRef(): boolean;
      refresh(): this;
      [Symbol.toPrimitive](): number;
    }
  }
}

export type UserRole = 'admin' | 'client' | 'floor_user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
  floorId?: string; // For floor_user role - restricts to single floor
  phone?: string;
  timezone?: string;
  avatar?: string;
  settings?: Record<string, any>; // User preferences and settings
  isActive?: boolean;
  createdAt: Date | string;
  lastSeen: Date | string;
}

export interface Client {
  id: string;
  name: string;
  businessName: string;
  email: string;
  telephone: string;
  description: string;
  status: 'active' | 'suspended' | 'trial';
  trialDays: number;
  trialEndsAt?: Date;
  subscriptionPrice: number; // Monthly price in £
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'trial';
  subscriptionTier?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Premium Features
  premiumFeatures: {
    multiFloor: boolean; // Premium: Multiple floors/zones
    aiCredits: number; // AI TTS credits remaining
    maxFloors: number; // How many floors allowed
  };
  maxDevices: number;
  maxStorageGb: number;
  maxFloors: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Floor {
  id: string;
  name: string;
  clientId: string;
  description?: string;
  deviceIds: string[]; // Devices assigned to this floor
  isPremium: boolean; // First floor is free, additional floors are premium
  createdAt: Date;
  createdBy: string;
}

export interface Device {
  id: string;
  name: string;
  clientId: string;
  status: 'online' | 'offline';
  lastSeen: Date | string;
  zone?: string;
  zoneId?: string;
  deviceId?: string;
  volume?: number;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  floorId?: string;
  floorName?: string;
  clientId?: string;
  imageUrl?: string | null;
  defaultVolume?: number;
  isActive?: boolean;
  devicesCount?: number;
  isPlaying?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  parentId?: string;
  type: 'music' | 'announcements';
  cover_image?: string;
  cover_image_url?: string;
  createdAt: Date;
  createdBy: string;
}

export interface MusicFile {
  id: string;
  name: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  image?: string;
  folderId?: string;
  clientId?: string;
  url?: string;
  size?: number;
  duration?: number;
  type?: string;
  createdAt?: Date | string;
  createdBy?: string;
}

export interface Announcement {
  id: string;
  title: string;
  scriptId?: string;
  clientId?: string;
  folderId?: string | null;
  folderName?: string;
  url?: string | null;
  fileUrl?: string | null;
  duration?: number;
  fileSize?: number;
  enabled?: boolean;
  category?: string | null;
  isTts?: boolean;
  ttsText?: string | null;
  ttsVoice?: string | null;
  ttsProvider?: string | null;
  isRecording?: boolean;
  type?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AnnouncementScript {
  id: string;
  title: string;
  text: string;
  clientId: string;
  folderId?: string;
  enabled: boolean;
  category?: string;
  createdAt: Date;
  createdBy: string;
}

export interface AnnouncementAudio {
  id: string;
  title: string;
  scriptId?: string;
  clientId: string;
  folderId?: string;
  url: string;
  duration: number;
  type: 'tts' | 'uploaded' | 'recorded';
  enabled: boolean;
  category?: string;
  createdAt: Date;
  createdBy: string;
}

export type ScheduleType = 'interval' | 'timeline';

export interface IntervalSchedule {
  type: 'interval';
  intervalMinutes: number;
  announcementIds: string[];
  avoidRepeat: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
}

export interface TimelineSchedule {
  type: 'timeline';
  cycleDurationMinutes: number;
  announcements: {
    announcementId: string;
    timestampSeconds: number; // position in cycle
  }[];
}

export interface Schedule {
  id: string;
  name: string;
  clientId: string;
  deviceIds: string[];
  zoneIds?: string[];
  priority?: number;
  enabled: boolean;
  schedule: IntervalSchedule | TimelineSchedule;
  startTime?: string;
  endTime?: string;
  createdAt: Date | string;
  createdBy: string;
  updatedAt: Date | string;
}

// Channel Playlist - Unified music + announcements playlist
export interface ChannelPlaylistItem {
  id: string;
  type: 'music' | 'announcement';
  contentId: string; // music file ID or announcement ID
  intervalMinutes?: number; // How often this should play
  fixedTimes?: string[]; // Fixed times like ["09:00", "12:00", "17:00"]
  order?: number;
}

export interface ChannelPlaylist {
  id: string;
  name: string;
  description: string;
  clientId: string;
  floorIds: string[]; // Which floors/zones this is assigned to
  zoneIds?: string[];
  items: ChannelPlaylistItem[];
  defaultMusicInterval: number; // Default interval for music (minutes)
  defaultAnnouncementInterval: number; // Default interval for announcements (minutes)
  shuffleMusic: boolean;
  shuffleAnnouncements: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
  enabled: boolean;
  createdAt: Date | string;
  createdBy: string;
  updatedAt: Date | string;
}

export interface PlaybackState {
  current_track_data?: {
    id: string;
    title: string;
    file_url: string;
    duration: number;
  };
  current_announcement_data?: {
    id: string;
    title: string;
    file_url: string;
    duration: number;
  };
  current_playlists?: string[];
  is_playing: boolean;
  position: number;
  volume: number;
  queue_position: number;
}

export interface PlayEvent {
  id: string;
  announcementId: string;
  deviceId: string;
  clientId: string;
  type: 'instant' | 'scheduled';
  status: 'pending' | 'delivered' | 'playing' | 'completed' | 'failed';
  createdAt: Date;
  createdBy: string;
  deliveredAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  clientId?: string;
  details: string;
  timestamp: Date;
}