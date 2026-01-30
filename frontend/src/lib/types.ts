// Core types for sync2gear application

export type UserRole = 'admin' | 'staff' | 'client' | 'floor_user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
  floorId?: string; // For floor_user role - restricts to single floor
  createdAt: Date;
  lastSeen: Date;
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
  subscriptionStatus: 'active' | 'cancelled' | 'past_due';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Premium Features
  premiumFeatures: {
    multiFloor: boolean; // Premium: Multiple floors/zones
    aiCredits: number; // AI TTS credits remaining
    maxFloors: number; // How many floors allowed
  };
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
  lastSeen: Date;
  zone?: string;
  zoneId?: string;
}

export interface Folder {
  id: string;
  name: string;
  clientId: string;
  parentId?: string;
  type: 'music' | 'announcements';
  zoneId?: string;
  zone?: string;
  coverImageUrl?: string;
  musicFilesCount?: number;
  createdAt: Date;
  createdBy: string;
}

export interface MusicFile {
  id: string;
  name: string;
  folderId: string;
  clientId: string;
  zoneId?: string;
  zone?: string;
  url: string;
  size: number;
  duration: number;
  type: string;
  createdAt: Date;
  createdBy: string;
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
  zoneId?: string;
  zone?: string;
  createdAt: Date;
  createdBy: string;
  ttsText?: string; // Text content for TTS announcements
}

export type ScheduleType = 'interval' | 'timeline' | 'datetime';

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

export interface DateTimeSchedule {
  type: 'datetime';
  dateTimeSlots: {
    announcementId: string;
    date: string; // YYYY-MM-DD format
    time: string; // HH:mm format (24-hour) or HH:mm AM/PM
    repeat?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'; // Repeat pattern
    repeatDays?: number[]; // For weekly: [0,1,2,3,4,5,6] (Sunday=0)
    endDate?: string; // YYYY-MM-DD format for recurring schedules
  }[];
}

export interface Schedule {
  id: string;
  name: string;
  clientId: string;
  deviceIds: string[];
  zoneIds?: string[];
  zones?: Zone[];
  enabled: boolean;
  schedule: IntervalSchedule | TimelineSchedule | DateTimeSchedule;
  lastExecutedAt?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  priority?: number;
}

// Channel Playlist - Unified music + announcements playlist
export interface ChannelPlaylistItem {
  id: string;
  type: 'music' | 'announcement';
  contentId: string; // music file ID or announcement ID
  intervalMinutes?: number; // How often this should play
  fixedTimes?: string[]; // Fixed times like ["09:00", "12:00", "17:00"]
}

export interface ChannelPlaylist {
  id: string;
  name: string;
  description: string;
  clientId: string;
  floorIds: string[]; // Which floors/zones this is assigned to
  items: ChannelPlaylistItem[];
  defaultMusicInterval: number; // Default interval for music (minutes)
  defaultAnnouncementInterval: number; // Default interval for announcements (minutes)
  shuffleMusic: boolean;
  shuffleAnnouncements: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
  enabled: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
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