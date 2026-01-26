export interface FolderSettings {
  intervalMinutes: number;
  intervalSeconds: number;
  enabled: boolean;
  playlistMode: 'sequential' | 'random' | 'single';
  selectedAnnouncements: string[];
  preventOverlap: boolean;
}

export interface AnnouncementAudio {
  id: string;
  title: string;
  scriptId?: string;
  clientId: string;
  url: string;
  duration: number;
  type: 'tts' | 'uploaded' | 'recorded';
  enabled: boolean;
  category?: string;
  folderId?: string;
  createdAt: Date | string;
  createdBy: string;
  ttsText?: string; // Text content for TTS announcements
}

export interface GeneratedScript {
  title: string;
  text: string;
  selected: boolean;
}

export interface TTSVoice {
  id: string;
  name: string;
  gender: string;
  accent: string;
}

export interface Folder {
  id: string;
  name: string;
  clientId?: string;
  thumbnail?: string;
  type?: string;
}

