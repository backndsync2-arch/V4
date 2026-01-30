/**
 * WebSocket Client
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

import { WS_BASE_URL, getAccessToken } from './core';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'offline';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 5000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private isConnecting = false;
  private shouldConnect = false;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private hasLoggedConnectionFailure = false;

  connect(zoneId?: string) {
    // Don't attempt connection if backend URL is not configured
    if (!WS_BASE_URL) return;

    // If already connected to the same endpoint, don't reconnect
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Check if we're already connected to the right endpoint
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const token = getAccessToken();
      const expectedUrl = zoneId && uuidRegex.test(zoneId)
        ? `${WS_BASE_URL}/playback/${zoneId}/?token=${token}`
        : `${WS_BASE_URL}/events/?token=${token}`;
      
      // If URL matches, we're already connected - don't reconnect
      if (this.ws.url === expectedUrl) {
        return;
      }
      // Otherwise, disconnect first before reconnecting to different endpoint
      this.disconnect();
    }

    if (this.isConnecting) {
      return;
    }

    // Don't attempt WebSocket connection if no token (user not logged in)
    const token = getAccessToken();
    if (!token) {
      // Silently skip - user is not logged in
      return;
    }

    this.shouldConnect = true;
    this.isConnecting = true;
    this.setConnectionStatus('connecting');

    try {
      // Only use playback endpoint if zoneId is a valid UUID
      // "all-zones" is not a valid zone ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const url = zoneId && uuidRegex.test(zoneId)
        ? `${WS_BASE_URL}/playback/${zoneId}/?token=${token}`
        : `${WS_BASE_URL}/events/?token=${token}`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.hasLoggedConnectionFailure = false;
        this.setConnectionStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const listeners = this.listeners.get(data.type);
          if (listeners) {
            listeners.forEach(callback => callback(data));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Suppress error logging - the onclose handler will log if needed
        // This prevents duplicate error messages in console
        this.isConnecting = false;
        this.setConnectionStatus('disconnected');
      };

      this.ws.onclose = (event) => {
        const wasConnected = this.connectionStatus === 'connected';
        this.isConnecting = false;
        this.setConnectionStatus('disconnected');
        
        // Only log if we were previously connected, or if this is the first failure
        if (wasConnected) {
          console.log('WebSocket disconnected');
        } else if (!this.hasLoggedConnectionFailure && this.reconnectAttempts === 0) {
          // First connection attempt failed - log once
          console.warn('WebSocket connection failed - backend WebSocket server may not be running');
          console.warn('Note: To enable WebSocket support, run backend with: daphne -b 0.0.0.0 -p 8000 sync2gear_backend.config.asgi:application');
          console.warn('Manual playback via API will still work without WebSocket.');
          this.hasLoggedConnectionFailure = true;
        }
        
        this.attemptReconnect(zoneId);
      };
    } catch (error) {
      console.warn('WebSocket initialization failed:', error);
      this.isConnecting = false;
      this.setConnectionStatus('disconnected');
    }
  }

  private attemptReconnect(zoneId?: string) {
    if (!this.shouldConnect) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        // Silently reconnect - don't log every attempt
        this.connect(zoneId);
      }, this.reconnectDelay);
    } else {
      // Only log once when max attempts reached
      if (this.connectionStatus !== 'offline') {
        console.log('WebSocket: Max reconnection attempts reached. Running in offline mode.');
        console.log('Scheduled announcements require WebSocket. Manual playback via API still works.');
      }
      this.setConnectionStatus('offline');
      this.shouldConnect = false;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected - cannot send data');
    }
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.ws) {
      // Only close if WebSocket is in a state that can be closed
      // CONNECTING (0) state will throw an error if we try to close
      if (this.ws.readyState === WebSocket.CONNECTING) {
        // Wait a bit for connection to establish, then close
        setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.CONNECTING) {
            this.ws.close();
            this.ws = null;
          }
        }, 100);
      } else if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CLOSING) {
        // Safe to close if OPEN or already CLOSING
        this.ws.close();
        this.ws = null;
      } else {
        // Already closed, just clear reference
        this.ws = null;
      }
    }
    this.reconnectAttempts = 0;
    this.setConnectionStatus('disconnected');
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected' && 
           this.ws !== null && 
           this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusListeners.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
  }

  /**
   * Unsubscribe from connection status changes
   */
  offStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusListeners.delete(callback);
  }

  /**
   * Manually retry connection
   */
  retry(zoneId?: string) {
    this.reconnectAttempts = 0;
    this.hasLoggedConnectionFailure = false;
    this.shouldConnect = true;
    this.connect(zoneId);
  }

  /**
   * Update connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach(callback => callback(status));
    }
  }
}

// Export singleton WebSocket client
export const wsClient = new WebSocketClient();

