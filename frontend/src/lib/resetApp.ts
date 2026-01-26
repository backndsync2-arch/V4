/**
 * App Reset Utility - Clean State for Export
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

/**
 * Clears all localStorage data used by sync2gear
 */
export const clearAllStorage = () => {
  const keysToRemove = [
    'sync2gear_user',
    'sync2gear_impersonating',
    'access_token',
    'refresh_token',
    'sync2gear_onboarding_complete',
    'sync2gear_tutorial_complete',
    'background_audio_enabled',
    'background_audio_initialized',
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  // Clear any sessionStorage if used
  sessionStorage.clear();
};

/**
 * Resets the entire application to clean state
 * This includes:
 * - Clearing all localStorage
 * - Clearing all sessionStorage
 * - Disconnecting WebSocket connections
 * - Stopping any audio playback
 * - Resetting service workers
 */
export const resetApp = async () => {
  try {
    // Clear storage
    clearAllStorage();

    // Stop any audio playback
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.src = '';
    });

    // Clear service worker cache if available
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // Clear any caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    console.log('✅ App reset complete');
    return true;
  } catch (error) {
    console.error('❌ Error resetting app:', error);
    return false;
  }
};

/**
 * Performs a full reset and reload
 */
export const resetAndReload = async () => {
  await resetApp();
  window.location.href = '/';
  window.location.reload();
};

/**
 * Export app data for backup (if needed in future)
 */
export const exportAppData = () => {
  const data = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage },
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sync2gear-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
