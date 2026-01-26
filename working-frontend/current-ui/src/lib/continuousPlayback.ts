/**
 * Continuous Playback Engine
 * Handles:
 * - Auto-advance to next track (never stops)
 * - Looping playlists
 * - Multi-playlist selection & playback
 * - Shuffle across multiple playlists
 * - Scheduled announcement interruption
 * - Resume music after announcement
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  playlistId: string;
  playlistName: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export interface ScheduledAnnouncement {
  id: string;
  title: string;
  url: string;
  scheduledTime: Date;
  duration: number;
}

export class ContinuousPlaybackEngine {
  private selectedPlaylists: string[] = [];
  private allPlaylists: Playlist[] = [];
  private currentQueue: Track[] = [];
  private currentIndex: number = 0;
  private isShuffleOn: boolean = false;
  private isRepeatOn: boolean = true; // Always loop by default
  
  private announcementQueue: ScheduledAnnouncement[] = [];
  private isPlayingAnnouncement: boolean = false;
  private interruptedTrack: { track: Track; position: number } | null = null;

  private onTrackChange?: (track: Track) => void;
  private onAnnouncementStart?: (announcement: ScheduledAnnouncement) => void;
  private onAnnouncementEnd?: () => void;

  constructor(playlists: Playlist[]) {
    this.allPlaylists = playlists;
  }

  /**
   * Select which playlists to play
   */
  public selectPlaylists(playlistIds: string[]) {
    this.selectedPlaylists = playlistIds;
    this.rebuildQueue();
  }

  /**
   * Rebuild queue from selected playlists
   */
  private rebuildQueue() {
    // Get all tracks from selected playlists
    const tracks: Track[] = [];
    
    this.selectedPlaylists.forEach(playlistId => {
      const playlist = this.allPlaylists.find(p => p.id === playlistId);
      if (playlist) {
        tracks.push(...playlist.tracks);
      }
    });

    // If no playlists selected, use all playlists
    if (tracks.length === 0) {
      this.allPlaylists.forEach(playlist => {
        tracks.push(...playlist.tracks);
      });
    }

    this.currentQueue = tracks;
    
    // Apply shuffle if enabled
    if (this.isShuffleOn) {
      this.shuffleQueue();
    }
  }

  /**
   * Shuffle the current queue
   */
  private shuffleQueue() {
    const shuffled = [...this.currentQueue];
    
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    this.currentQueue = shuffled;
  }

  /**
   * Toggle shuffle mode
   */
  public toggleShuffle() {
    this.isShuffleOn = !this.isShuffleOn;
    
    if (this.isShuffleOn) {
      this.shuffleQueue();
    } else {
      this.rebuildQueue(); // Rebuild in original order
    }
    
    return this.isShuffleOn;
  }

  /**
   * Toggle repeat mode
   */
  public toggleRepeat() {
    this.isRepeatOn = !this.isRepeatOn;
    return this.isRepeatOn;
  }

  /**
   * Get current track
   */
  public getCurrentTrack(): Track | null {
    if (this.currentQueue.length === 0) return null;
    return this.currentQueue[this.currentIndex];
  }

  /**
   * Get next track (for preview)
   */
  public getNextTrack(): Track | null {
    if (this.currentQueue.length === 0) return null;
    
    const nextIndex = (this.currentIndex + 1) % this.currentQueue.length;
    return this.currentQueue[nextIndex];
  }

  /**
   * Advance to next track (auto-advance, never stops)
   */
  public advanceToNext(): Track | null {
    if (this.currentQueue.length === 0) {
      this.rebuildQueue(); // Rebuild if queue is empty
      if (this.currentQueue.length === 0) return null;
    }

    this.currentIndex++;

    // Loop back to start if at end
    if (this.currentIndex >= this.currentQueue.length) {
      if (this.isRepeatOn) {
        this.currentIndex = 0;
        
        // Re-shuffle if shuffle is on for variety
        if (this.isShuffleOn) {
          this.shuffleQueue();
        }
      } else {
        // Even if repeat is off, start over (continuous playback)
        this.currentIndex = 0;
      }
    }

    const nextTrack = this.getCurrentTrack();
    
    if (nextTrack && this.onTrackChange) {
      this.onTrackChange(nextTrack);
    }

    return nextTrack;
  }

  /**
   * Go to previous track
   */
  public goToPrevious(): Track | null {
    if (this.currentQueue.length === 0) return null;

    this.currentIndex--;

    // Loop to end if at start
    if (this.currentIndex < 0) {
      this.currentIndex = this.currentQueue.length - 1;
    }

    const previousTrack = this.getCurrentTrack();
    
    if (previousTrack && this.onTrackChange) {
      this.onTrackChange(previousTrack);
    }

    return previousTrack;
  }

  /**
   * Schedule an announcement to interrupt current playback
   */
  public scheduleAnnouncement(announcement: ScheduledAnnouncement) {
    this.announcementQueue.push(announcement);
    
    // Sort by scheduled time
    this.announcementQueue.sort((a, b) => 
      a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );
  }

  /**
   * Check if any announcements are due
   * Call this every second from your main app
   */
  public checkScheduledAnnouncements(): ScheduledAnnouncement | null {
    if (this.announcementQueue.length === 0) return null;
    if (this.isPlayingAnnouncement) return null;

    const now = new Date();
    const dueAnnouncement = this.announcementQueue.find(
      a => a.scheduledTime <= now
    );

    if (dueAnnouncement) {
      this.playAnnouncement(dueAnnouncement);
      return dueAnnouncement;
    }

    return null;
  }

  /**
   * Play announcement (interrupts music)
   */
  private playAnnouncement(announcement: ScheduledAnnouncement) {
    // Save current track and position for resuming
    const currentTrack = this.getCurrentTrack();
    if (currentTrack) {
      // Position would come from actual audio element
      this.interruptedTrack = { track: currentTrack, position: 0 };
    }

    this.isPlayingAnnouncement = true;

    // Remove from queue
    this.announcementQueue = this.announcementQueue.filter(
      a => a.id !== announcement.id
    );

    if (this.onAnnouncementStart) {
      this.onAnnouncementStart(announcement);
    }
  }

  /**
   * Announcement finished, resume music
   */
  public announcementFinished() {
    this.isPlayingAnnouncement = false;

    if (this.onAnnouncementEnd) {
      this.onAnnouncementEnd();
    }

    // Resume music from where it was interrupted
    // In production: seek to interruptedTrack.position
    this.interruptedTrack = null;
  }

  /**
   * Play instant announcement (manual trigger)
   */
  public playInstantAnnouncement(announcement: ScheduledAnnouncement) {
    this.playAnnouncement(announcement);
  }

  /**
   * Get queue info
   */
  public getQueueInfo() {
    return {
      totalTracks: this.currentQueue.length,
      currentIndex: this.currentIndex,
      selectedPlaylists: this.selectedPlaylists.length,
      isShuffleOn: this.isShuffleOn,
      isRepeatOn: this.isRepeatOn,
      upcomingTracks: this.currentQueue.slice(
        this.currentIndex + 1,
        this.currentIndex + 6
      ),
    };
  }

  /**
   * Get selected playlists
   */
  public getSelectedPlaylists(): string[] {
    return this.selectedPlaylists;
  }

  /**
   * Register callbacks
   */
  public onTrackChanged(callback: (track: Track) => void) {
    this.onTrackChange = callback;
  }

  public onAnnouncementStarted(callback: (announcement: ScheduledAnnouncement) => void) {
    this.onAnnouncementStart = callback;
  }

  public onAnnouncementEnded(callback: () => void) {
    this.onAnnouncementEnd = callback;
  }

  /**
   * Skip to specific track in queue
   */
  public skipToTrack(index: number) {
    if (index >= 0 && index < this.currentQueue.length) {
      this.currentIndex = index;
      const track = this.getCurrentTrack();
      
      if (track && this.onTrackChange) {
        this.onTrackChange(track);
      }
      
      return track;
    }
    return null;
  }

  /**
   * Get full queue
   */
  public getQueue(): Track[] {
    return this.currentQueue;
  }
}
