/**
 * Announcements API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import type { AnnouncementAudio } from '../types';
import { apiFetch, uploadFile, unwrapList, normalizeAnnouncement, API_BASE_URL, getAccessToken } from './core';

export const announcementsAPI = {
  // Get all announcements
  getAnnouncements: async (): Promise<AnnouncementAudio[]> => {
    const res = await apiFetch('/announcements/');
    return unwrapList(res).map(normalizeAnnouncement);
  },

  // Create announcement (TTS)
  createTTSAnnouncement: async (data: {
    title: string;
    text: string;
    voice?: string;
    folder_id?: string;
    zone_id?: string;
    client_id?: string;
  }): Promise<AnnouncementAudio> => {
    const res = await apiFetch('/announcements/tts/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeAnnouncement(res);
  },

  // Upload announcement audio
  uploadAnnouncement: async (
    file: File,
    data: { title: string; folder_id?: string; zone_id?: string; is_recording?: boolean; client_id?: string },
    onProgress?: (progress: number) => void
  ): Promise<AnnouncementAudio> => {
    const res = await uploadFile('/announcements/upload/', file, data, onProgress);
    return normalizeAnnouncement(res);
  },

  // Update announcement
  updateAnnouncement: async (id: string, data: Partial<AnnouncementAudio>): Promise<AnnouncementAudio> => {
    const res = await apiFetch(`/announcements/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeAnnouncement(res);
  },

  // Delete announcement
  deleteAnnouncement: async (id: string): Promise<void> => {
    return apiFetch(`/announcements/${id}/`, { method: 'DELETE' });
  },

  // Regenerate TTS for an announcement (add voice or change voice)
  regenerateTTS: async (id: string, data: {
    voice?: string;
    provider?: string;
  }): Promise<AnnouncementAudio> => {
    const res = await apiFetch(`/announcements/${id}/regenerate_tts/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeAnnouncement(res);
  },

  // Recalculate duration for an announcement
  recalculateDuration: async (id: string): Promise<AnnouncementAudio> => {
    const res = await apiFetch(`/announcements/${id}/recalculate_duration/`, {
      method: 'POST',
    });
    return normalizeAnnouncement(res);
  },

  // Play instant announcement
  playInstantAnnouncement: async (id: string, deviceIds: string[]): Promise<void> => {
    return apiFetch(`/announcements/${id}/play_instant/`, {
      method: 'POST',
      body: JSON.stringify({ device_ids: deviceIds }),
    });
  },

  // Play instant announcement on zones
  playInstantAnnouncementOnZones: async (id: string, zoneIds: string[]): Promise<void> => {
    return apiFetch(`/announcements/${id}/play_instant/`, {
      method: 'POST',
      body: JSON.stringify({ zone_ids: zoneIds }),
    });
  },

  // Generate AI text
  generateAIText: async (data: {
    topic: string;
    tone: 'professional' | 'friendly' | 'urgent' | 'casual';
    key_points?: string;
    quantity: number;
  }): Promise<{ scripts: Array<{ title: string; text: string }> }> => {
    const res = await apiFetch('/announcements/generate-ai-text/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  // Get TTS voices
  getTTSVoices: async (): Promise<Array<{id: string; name: string; gender: string; accent: string}>> => {
    const res = await apiFetch('/announcements/tts-voices/');
    return res.voices || res;
  },

  // Preview voice
  previewVoice: async (data: {
    text: string;
    voice: string;
  }): Promise<{ preview_url: string }> => {
    const res = await apiFetch('/announcements/preview-voice/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  // Batch create TTS announcements
  createBatchTTSAnnouncements: async (data: {
    announcements: Array<{
      title: string;
      text: string;
      voice: string;
      folder_id?: string;
      zone_id?: string;
      client_id?: string;
    }>;
    voice?: string;
    folder_id?: string;
    zone_id?: string;
    client_id?: string;
  }): Promise<AnnouncementAudio[]> => {
    const res = await apiFetch('/announcements/batch-tts/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return Array.isArray(res) ? res.map(normalizeAnnouncement) : (res.announcements || []).map(normalizeAnnouncement);
  },

  // Generate announcement templates using AI
  generateTemplates: async (data: {
    category?: 'retail' | 'restaurant' | 'office' | 'healthcare' | 'gym' | 'general';
    quantity?: number;
    tone?: 'professional' | 'friendly' | 'urgent' | 'casual' | 'energetic' | 'calm';
  }): Promise<{
    templates: Array<{
      title: string;
      description: string;
      script: string;
      category: string;
      duration: number;
      voiceType: string;
    }>;
    count: number;
    category: string;
  }> => {
    const res = await apiFetch('/announcements/generate-templates/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  // Get template folders (ready-made templates)
  getTemplateFolders: async (category?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    image_url: string;
    category: string;
    active: boolean;
    templates: Array<{
      id: string;
      title: string;
      description: string;
      script: string;
      category: string;
      duration: number;
      voice_type: string;
      active: boolean;
    }>;
    templates_count: number;
    total_duration: number;
  }>> => {
    const url = category 
      ? `/announcements/templates/folders/?category=${category}`
      : '/announcements/templates/folders/';
    const res = await apiFetch(url);
    return unwrapList(res);
  },
};

