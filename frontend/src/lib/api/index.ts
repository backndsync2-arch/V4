/**
 * API Service Layer - Main Export
 * 
 * Re-exports all API modules for backward compatibility
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

// Re-export types (these are defined as 'any' for flexibility)
export type PlaybackState = any;
export type Zone = any;

// Re-export core utilities
export { setTokens, clearTokens, getAccessToken, APIError } from './core';

// Re-export all API modules
export { authAPI } from './auth';
export { musicAPI } from './music';
export { announcementsAPI } from './announcements';
export { schedulerAPI } from './scheduler';
export { zonesAPI } from './zones';
export { playbackAPI } from './playback';
export { adminAPI } from './admin';
export { wsClient } from './websocket';

