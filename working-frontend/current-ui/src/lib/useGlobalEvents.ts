/**
 * Global Events Hook
 *
 * Provides centralized management of global WebSocket events across the application.
 * Handles device status changes, schedule executions, system notifications, etc.
 */

import { useEffect, useCallback, useRef } from 'react';
import { wsClient } from './websocket';
import { toast } from 'sonner';

export interface GlobalEventHandlers {
  onDeviceStatusChange?: (data: {
    device_id: string;
    device_name: string;
    zone_id: string;
    zone_name: string;
    is_online: boolean;
    last_seen: string;
    volume?: number;
  }) => void;

  onScheduleExecuted?: (data: {
    schedule_id: string;
    schedule_name: string;
    zone_ids: string[];
    playlist_ids?: string[];
    executed_at: string;
    triggered_by: 'schedule' | 'manual';
  }) => void;

  onSystemNotification?: (data: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: string;
    action_url?: string;
  }) => void;

  onPlaybackUpdate?: (data: any) => void;
}

export interface GlobalEventsHookReturn {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
}

export function useGlobalEvents(handlers: GlobalEventHandlers = {}): GlobalEventsHookReturn {
  const handlersRef = useRef(handlers);
  const isConnectedRef = useRef(false);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleDeviceStatusChange = useCallback((data: any) => {
    // console.log('Global device status change:', data); // Debug logging removed
    handlersRef.current.onDeviceStatusChange?.(data);

    // Default toast notification if no custom handler
    if (!handlersRef.current.onDeviceStatusChange) {
      const statusText = data.is_online ? 'came online' : 'went offline';
      toast.info(`Device "${data.device_name || 'Unknown'}" ${statusText}`, {
        description: data.zone_name ? `Zone: ${data.zone_name}` : undefined
      });
    }
  }, []);

  const handleScheduleExecuted = useCallback((data: any) => {
    // console.log('Global schedule executed:', data); // Debug logging removed
    handlersRef.current.onScheduleExecuted?.(data);

    // Default toast notification if no custom handler
    if (!handlersRef.current.onScheduleExecuted) {
      toast.success(`Schedule executed: "${data.schedule_name || 'Unknown'}"`, {
        description: `Triggered ${data.triggered_by || 'automatically'} at ${new Date(data.executed_at).toLocaleTimeString()}`
      });
    }
  }, []);

  const handleSystemNotification = useCallback((data: any) => {
    // console.log('Global system notification:', data); // Debug logging removed
    handlersRef.current.onSystemNotification?.(data);

    // Default toast notification if no custom handler
    if (!handlersRef.current.onSystemNotification) {
      const toastOptions = {
        description: data.message,
        action: data.action_url ? {
          label: 'View',
          onClick: () => window.open(data.action_url, '_blank')
        } : undefined
      };

      switch (data.type) {
        case 'success':
          toast.success(data.title, toastOptions);
          break;
        case 'warning':
          toast.warning(data.title, toastOptions);
          break;
        case 'error':
          toast.error(data.title, toastOptions);
          break;
        default:
          toast.info(data.title, toastOptions);
      }
    }
  }, []);

  const handlePlaybackUpdate = useCallback((data: any) => {
    // console.log('Global playback update:', data); // Debug logging removed
    handlersRef.current.onPlaybackUpdate?.(data);
  }, []);

  const handleConnected = useCallback((data: any) => {
    if (data.type === 'events') {
      isConnectedRef.current = true;
      // console.log('Global events WebSocket connected'); // Debug logging removed
    }
  }, []);

  const handleDisconnected = useCallback((data: any) => {
    if (data.type === 'events') {
      isConnectedRef.current = false;
      // console.log('Global events WebSocket disconnected'); // Debug logging removed
    }
  }, []);

  const handleError = useCallback((data: any) => {
    if (data.type === 'events') {
      // console.error('Global events WebSocket error:', data.error); // Debug logging removed
      isConnectedRef.current = false;
    }
  }, []);

  const connect = useCallback(() => {
    wsClient.connectEvents();
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnectEvents();
  }, []);

  const sendMessage = useCallback((message: any) => {
    wsClient.sendEventsMessage(message);
  }, []);

  // Set up event listeners
  useEffect(() => {
    wsClient.on('device_status_change', handleDeviceStatusChange);
    wsClient.on('schedule_executed', handleScheduleExecuted);
    wsClient.on('system_notification', handleSystemNotification);
    wsClient.on('playback_update', handlePlaybackUpdate);
    wsClient.on('connected', handleConnected);
    wsClient.on('disconnected', handleDisconnected);
    wsClient.on('error', handleError);

    return () => {
      wsClient.off('device_status_change', handleDeviceStatusChange);
      wsClient.off('schedule_executed', handleScheduleExecuted);
      wsClient.off('system_notification', handleSystemNotification);
      wsClient.off('playback_update', handlePlaybackUpdate);
      wsClient.off('connected', handleConnected);
      wsClient.off('disconnected', handleDisconnected);
      wsClient.off('error', handleError);
    };
  }, [
    handleDeviceStatusChange,
    handleScheduleExecuted,
    handleSystemNotification,
    handlePlaybackUpdate,
    handleConnected,
    handleDisconnected,
    handleError
  ]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
    sendMessage
  };
}

// Helper hook for device status monitoring
export function useDeviceStatusMonitoring(onDeviceStatusChange?: GlobalEventHandlers['onDeviceStatusChange']) {
  return useGlobalEvents({
    onDeviceStatusChange
  });
}

// Helper hook for schedule monitoring
export function useScheduleMonitoring(onScheduleExecuted?: GlobalEventHandlers['onScheduleExecuted']) {
  return useGlobalEvents({
    onScheduleExecuted
  });
}

// Helper hook for system notifications
export function useSystemNotifications(onSystemNotification?: GlobalEventHandlers['onSystemNotification']) {
  return useGlobalEvents({
    onSystemNotification
  });
}