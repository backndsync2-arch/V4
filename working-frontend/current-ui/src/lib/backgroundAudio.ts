/**
 * Background Audio Manager
 * Handles continuous playback even when screen is off or app is in background
 * Uses Media Session API, Wake Lock API, and Audio Context management
 */

export class BackgroundAudioManager {
  private audioContext: AudioContext | null = null;
  private wakeLock: any = null;
  private mediaSession: MediaSession | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isBackgroundEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize background audio capabilities
   */
  private async initialize() {
    // Create AudioContext (survives screen off)
    this.createAudioContext();

    // Setup Media Session API (lock screen controls)
    this.setupMediaSession();

    // DON'T request Wake Lock here - needs user gesture
    // Will be requested in enableBackground() instead

    // Prevent audio context suspension
    this.preventAudioSuspension();

    // Handle visibility changes
    this.setupVisibilityHandlers();

    console.log('[BackgroundAudio] Initialized');
  }

  /**
   * Create or resume AudioContext
   */
  private createAudioContext() {
    if (!this.audioContext) {
      // @ts-ignore - webkit prefix for iOS
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Setup Media Session API for lock screen controls
   */
  private setupMediaSession() {
    if ('mediaSession' in navigator) {
      this.mediaSession = navigator.mediaSession;
      
      // Set default metadata
      this.mediaSession.metadata = new MediaMetadata({
        title: 'sync2gear',
        artist: 'Business Audio System',
        album: 'Now Playing',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      console.log('[BackgroundAudio] Media Session configured');
    }
  }

  /**
   * Request Wake Lock to keep device awake during playback
   */
  private async requestWakeLock() {
    // Wake Lock is optional - background audio works without it
    if (!('wakeLock' in navigator)) {
      console.log('[BackgroundAudio] Wake Lock API not supported (iOS does not support this)');
      return;
    }

    try {
      // @ts-ignore - Wake Lock API
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('[BackgroundAudio] Wake Lock acquired');

      this.wakeLock.addEventListener('release', () => {
        console.log('[BackgroundAudio] Wake Lock released');
        this.wakeLock = null;
      });
    } catch (err: any) {
      // Don't log as error - wake lock is optional
      if (err.name === 'NotAllowedError') {
        console.log('[BackgroundAudio] Wake Lock requires user gesture or secure context');
      } else {
        console.log('[BackgroundAudio] Wake Lock not available:', err.name);
      }
    }
  }

  /**
   * Prevent audio context from being suspended
   */
  private preventAudioSuspension() {
    if (!this.audioContext) return;

    // Keep audio context alive
    const keepAlive = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    };

    // Check every 5 seconds
    setInterval(keepAlive, 5000);

    // Resume on user interaction
    ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(event => {
      document.addEventListener(event, keepAlive, { once: true });
    });
  }

  /**
   * Handle page visibility changes
   */
  private setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('[BackgroundAudio] App in background - continuing playback');
        // Ensure audio continues in background
        this.ensurePlayback();
      } else {
        console.log('[BackgroundAudio] App in foreground');
        // Resume audio context if needed
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }
      }
    });

    // iOS-specific: handle audio interruptions
    if ('onpagehide' in window) {
      window.addEventListener('pagehide', () => {
        console.log('[BackgroundAudio] Page hidden - maintaining audio');
      });
    }
  }

  /**
   * Ensure playback continues (called when going to background)
   */
  private ensurePlayback() {
    if (this.currentAudio && !this.currentAudio.paused) {
      // Make sure audio keeps playing
      this.currentAudio.play().catch(err => {
        console.warn('[BackgroundAudio] Playback interrupted:', err);
      });

      // Resume audio context
      if (this.audioContext?.state === 'suspended') {
        this.audioContext.resume();
      }
    }
  }

  /**
   * Setup audio element for background playback
   */
  public setupAudio(audioElement: HTMLAudioElement) {
    this.currentAudio = audioElement;

    // Connect to AudioContext for better control
    if (this.audioContext && !audioElement.hasAttribute('data-connected')) {
      try {
        const source = this.audioContext.createMediaElementSource(audioElement);
        source.connect(this.audioContext.destination);
        audioElement.setAttribute('data-connected', 'true');
      } catch (err) {
        console.warn('[BackgroundAudio] Could not connect to AudioContext:', err);
      }
    }

    // Configure audio element for background playback
    audioElement.setAttribute('playsinline', 'true'); // iOS requirement
    audioElement.setAttribute('preload', 'auto');

    // Enable background playback on iOS
    // @ts-ignore - webkit specific
    if (audioElement.webkitPreservesPitch !== undefined) {
      // @ts-ignore
      audioElement.webkitPreservesPitch = true;
    }

    return audioElement;
  }

  /**
   * Update Media Session metadata (lock screen display)
   */
  public updateMetadata(metadata: {
    title: string;
    artist?: string;
    album?: string;
    artwork?: string;
  }) {
    if (!this.mediaSession) return;

    const artwork = metadata.artwork ? [
      { src: metadata.artwork, sizes: '192x192', type: 'image/png' },
      { src: metadata.artwork, sizes: '512x512', type: 'image/png' }
    ] : [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ];

    this.mediaSession.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist || 'sync2gear',
      album: metadata.album || 'Now Playing',
      artwork
    });

    console.log('[BackgroundAudio] Metadata updated:', metadata.title);
  }

  /**
   * Setup Media Session action handlers (lock screen controls)
   */
  public setupControls(handlers: {
    play?: () => void;
    pause?: () => void;
    previoustrack?: () => void;
    nexttrack?: () => void;
    seekbackward?: () => void;
    seekforward?: () => void;
  }) {
    if (!this.mediaSession) return;

    const actions: Array<MediaSessionAction> = [
      'play',
      'pause',
      'previoustrack',
      'nexttrack',
      'seekbackward',
      'seekforward'
    ];

    actions.forEach(action => {
      if (handlers[action]) {
        try {
          this.mediaSession!.setActionHandler(action, handlers[action]);
        } catch (err) {
          console.warn(`[BackgroundAudio] Action "${action}" not supported`);
        }
      }
    });

    console.log('[BackgroundAudio] Media controls configured');
  }

  /**
   * Update playback state (playing/paused on lock screen)
   */
  public setPlaybackState(state: 'playing' | 'paused' | 'none') {
    if (this.mediaSession) {
      this.mediaSession.playbackState = state;
    }
  }

  /**
   * Enable background mode
   */
  public async enableBackground() {
    this.isBackgroundEnabled = true;

    // Request wake lock
    await this.requestWakeLock();

    // Resume audio context
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    console.log('[BackgroundAudio] Background mode enabled');
  }

  /**
   * Disable background mode (release wake lock)
   */
  public async disableBackground() {
    this.isBackgroundEnabled = false;

    // Release wake lock
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }

    console.log('[BackgroundAudio] Background mode disabled');
  }

  /**
   * Check if background audio is supported
   */
  public isSupported(): boolean {
    const hasMediaSession = 'mediaSession' in navigator;
    const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window;
    
    return hasMediaSession && hasAudioContext;
  }

  /**
   * Get status information
   */
  public getStatus() {
    return {
      isSupported: this.isSupported(),
      hasWakeLock: !!this.wakeLock,
      hasMediaSession: !!this.mediaSession,
      audioContextState: this.audioContext?.state,
      isBackgroundEnabled: this.isBackgroundEnabled
    };
  }

  /**
   * Cleanup
   */
  public dispose() {
    if (this.wakeLock) {
      this.wakeLock.release();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    console.log('[BackgroundAudio] Disposed');
  }
}

// Global singleton instance
export const backgroundAudio = new BackgroundAudioManager();