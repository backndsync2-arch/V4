/**
 * Playback Control API
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import { apiFetch } from './core';
import type { PlaybackState } from '../types';

export const playbackAPI = {
  // Get current playback state for zone
  getPlaybackState: async (zoneId: string): Promise<PlaybackState> => {
    return apiFetch(`/playback/state/by_zone/?zone_id=${zoneId}`);
  },

  // Play music in zone (accepts either playlist_ids or music_file_ids)
  play: async (zoneId: string, playlistIds: string[], shuffle: boolean = false, musicFileIds?: string[]): Promise<void> => {
    const body: any = { zone_id: zoneId, shuffle };
    if (musicFileIds && musicFileIds.length > 0) {
      body.music_file_ids = musicFileIds;
    } else {
      body.playlist_ids = playlistIds;
    }
    return apiFetch('/playback/control/play/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Pause playback
  pause: async (zoneId: string): Promise<void> => {
    return apiFetch('/playback/control/pause/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    });
  },

  // Resume playback
  resume: async (zoneId: string): Promise<void> => {
    return apiFetch('/playback/control/resume/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    });
  },

  // Skip to next track
  next: async (zoneId: string): Promise<void> => {
    return apiFetch('/playback/control/next/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    });
  },

  // Skip to previous track
  previous: async (zoneId: string): Promise<void> => {
    return apiFetch('/playback/control/previous/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    });
  },

  // Set volume
  setVolume: async (zoneId: string, volume: number): Promise<void> => {
    return apiFetch('/playback/control/volume/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId, volume }),
    });
  },

  // Seek to position
  seek: async (zoneId: string, position: number): Promise<void> => {
    return apiFetch('/playback/control/seek/', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId, position }),
    });
  },
};

