/**
 * WebSocket Client for Real-Time Features
 *
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import { getAccessToken } from './api';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

export type WebSocketEvent =
  | 'playback_update'
  | 'device_status_change'
  | 'schedule_executed'
  | 'system_notification'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface PlaybackUpdateData {
  zone_id: string;
  now_playing?: {
    type: 'music' | 'announcement';
    title: string;
    playlist?: string;
    duration: number;
    elapsed: number;
    is_playing: boolean;
  };
  state?: 'live' | 'standby' | 'offline';
  volume?: number;
  position?: number;
  current_track_data?: any;
  current_announcement_data?: any;
  current_playlists?: string[];
}

export interface DeviceStatusChangeData {
  device_id: string;
  device_name: string;
  zone_id: string;
  zone_name: string;
  is_online: boolean;
  last_seen: string;
  volume?: number;
}

export interface ScheduleExecutedData {
  schedule_id: string;
  schedule_name: string;
  zone_ids: string[];
  playlist_ids?: string[];
  executed_at: string;
  triggered_by: 'schedule' | 'manual';
}

export interface SystemNotificationData {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  action_url?: string;
}

class WebSocketClient {
  private playbackWs: WebSocket | null = null;
  private eventsWs: WebSocket | null = null;
  private playbackZoneId: string | null = null;
  private eventListeners = new Map<WebSocketEvent, Set<Function>>();
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
    private heartbeatInterval: number | null = null;
  private isConnecting = new Set<string>();

  constructor() {
    // Start heartbeat to keep connections alive
    this.startHeartbeat();
  }

  /**
   * Connect to playback WebSocket for a specific zone
   */
  connectPlayback(zoneId: string): void {
    if (this.playbackZoneId === zoneId && this.playbackWs?.readyState === WebSocket.OPEN) {
      return; // Already connected to this zone
    }

    this.disconnectPlayback(); // Disconnect from previous zone
    this.playbackZoneId = zoneId;

    const token = getAccessToken();
    if (!token) {
      console.error('No access token available for WebSocket connection');
      return;
    }

    const wsUrl = `${WS_BASE_URL}/playback/${zoneId}/?token=${token}`;
    this.connectWebSocket('playback', wsUrl);
  }

  /**
   * Connect to global events WebSocket
   */
  connectEvents(): void {
    if (this.eventsWs?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const token = getAccessToken();
    if (!token) {
      console.error('No access token available for events WebSocket');
      return;
    }

    const wsUrl = `${WS_BASE_URL}/events/?token=${token}`;
    this.connectWebSocket('events', wsUrl);
  }

  /**
   * Connect to both playback and events WebSockets
   */
  connectAll(zoneId: string): void {
    this.connectPlayback(zoneId);
    this.connectEvents();
  }

  /**
   * Disconnect from playback WebSocket
   */
  disconnectPlayback(): void {
    if (this.playbackWs) {
      this.playbackWs.close(1000, 'Client disconnecting');
      this.playbackWs = null;
      this.playbackZoneId = null;
    }
  }

  /**
   * Disconnect from events WebSocket
   */
  disconnectEvents(): void {
    if (this.eventsWs) {
      this.eventsWs.close(1000, 'Client disconnecting');
      this.eventsWs = null;
    }
  }

  /**
   * Disconnect from all WebSockets
   */
  disconnect(): void {
    this.disconnectPlayback();
    this.disconnectEvents();
  }

  /**
   * Send a message to the playback WebSocket
   */
  sendPlaybackMessage(message: any): void {
    if (this.playbackWs?.readyState === WebSocket.OPEN) {
      this.playbackWs.send(JSON.stringify(message));
    } else {
      console.warn('Playback WebSocket not connected');
    }
  }

  /**
   * Send a message to the events WebSocket
   */
  sendEventsMessage(message: any): void {
    if (this.eventsWs?.readyState === WebSocket.OPEN) {
      this.eventsWs.send(JSON.stringify(message));
    } else {
      console.warn('Events WebSocket not connected');
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  on(event: WebSocketEvent, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off(event: WebSocketEvent, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: WebSocketEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event listener:`, error);
        }
      });
    }
  }

  /**
   * Connect to a WebSocket with automatic reconnection
   */
  private connectWebSocket(type: string, url: string): void {
    if (this.isConnecting.has(type)) {
      return; // Already connecting
    }

    this.isConnecting.add(type);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        // console.log(`${type} WebSocket connected`); // Debug logging removed
        this.isConnecting.delete(type);
        this.reconnectAttempts.set(type, 0);
        this.emit('connected', { type });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(type, data);
        } catch (error) {
          console.error(`Error parsing ${type} WebSocket message:`, error);
        }
      };

      ws.onclose = (event) => {
        // console.log(`${type} WebSocket disconnected:`, event.code, event.reason); // Debug logging removed
        this.isConnecting.delete(type);

        if (type === 'playback') {
          this.playbackWs = null;
          this.playbackZoneId = null;
        } else if (type === 'events') {
          this.eventsWs = null;
        }

        this.emit('disconnected', { type, code: event.code, reason: event.reason });

        // Attempt reconnection unless it was a clean close
        if (event.code !== 1000) {
          this.scheduleReconnect(type, url);
        }
      };

      ws.onerror = (error) => {
        // console.error(`${type} WebSocket error:`, error); // Debug logging removed
        this.emit('error', { type, error });
      };

      if (type === 'playback') {
        this.playbackWs = ws;
      } else if (type === 'events') {
        this.eventsWs = ws;
      }

    } catch (error) {
      // console.error(`Error creating ${type} WebSocket:`, error); // Debug logging removed
      this.isConnecting.delete(type);
      this.emit('error', { type, error: `Failed to create WebSocket: ${error}` });
      this.scheduleReconnect(type, url);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(type: string, data: any): void {
    if (!data.type) {
      console.warn(`Received ${type} message without type:`, data);
      return;
    }

    // console.log(`Received ${type} WebSocket message:`, data.type, data); // Debug logging removed

    // Emit the specific event
    this.emit(data.type as WebSocketEvent, data.data || data);
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(type: string, url: string): void {
    const attempts = this.reconnectAttempts.get(type) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      // console.error(`${type} WebSocket: Max reconnection attempts reached`); // Debug logging removed
      this.emit('error', { type, error: 'Max reconnection attempts reached' });
      return;
    }

    const newAttempts = attempts + 1;
    this.reconnectAttempts.set(type, newAttempts);

    const delay = Math.min(this.reconnectDelay * Math.pow(2, attempts), 30000); // Max 30 seconds

    // console.log(`${type} WebSocket: Reconnecting in ${delay}ms (attempt ${newAttempts}/${this.maxReconnectAttempts})`); // Debug logging removed

    setTimeout(() => {
      this.connectWebSocket(type, url);
    }, delay);
  }

  /**
   * Start heartbeat to keep WebSocket connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      // Send ping to playback WebSocket
      if (this.playbackWs?.readyState === WebSocket.OPEN) {
        this.playbackWs.send(JSON.stringify({ type: 'ping' }));
      }

      // Send ping to events WebSocket
      if (this.eventsWs?.readyState === WebSocket.OPEN) {
        this.eventsWs.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnect();
    this.stopHeartbeat();
  }

  /**
   * Get connection status
   */
  getStatus(): {
    playback: { connected: boolean; zoneId: string | null };
    events: { connected: boolean };
  } {
    return {
      playback: {
        connected: this.playbackWs?.readyState === WebSocket.OPEN,
        zoneId: this.playbackZoneId
      },
      events: {
        connected: this.eventsWs?.readyState === WebSocket.OPEN
      }
    };
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();
