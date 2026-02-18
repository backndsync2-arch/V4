import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export type LocalTrack = {
  id: string;
  title: string;
  url: string;
};

type LocalPlayerContextType = {
  track: LocalTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  play: (track: LocalTrack) => Promise<void>;
  toggle: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (timeSeconds: number) => void;
  setVolume: (volume0to100: number) => void;
};

const LocalPlayerContext = createContext<LocalPlayerContextType | undefined>(undefined);

export function LocalPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<LocalTrack | null>(null);
  // trackRef always holds the latest track so closures in audio event listeners
  // (which are attached once with [] deps) never see a stale value.
  const trackRef = useRef<LocalTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(100);

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      // Ensure cross-origin metadata can be read
      audioRef.current.crossOrigin = 'anonymous';
      // iOS inline playback
      audioRef.current.setAttribute('playsinline', 'true');
      audioRef.current.volume = volume / 100;
    }
    return audioRef.current;
  };

  // Keep trackRef in sync so audio event-listener closures always have the current id
  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  // Keep audio volume in sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }, [volume]);

  // Attach listeners once
  useEffect(() => {
    const audio = ensureAudio();

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const onLoadedMetadata = () => {
      let d = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (!d || !Number.isFinite(d)) {
        // Force browser to compute duration by seeking to a very large time
        const handleForceDuration = () => {
          const computed = Number.isFinite(audio.duration) ? audio.duration : 0;
          setDuration(computed || 0);
          // Reset to start
          audio.currentTime = 0;
          audio.removeEventListener('timeupdate', handleForceDuration);
        };
        audio.addEventListener('timeupdate', handleForceDuration, { once: true });
        // Trigger duration calculation
        try {
          audio.currentTime = 1e7;
        } catch {}
      } else {
        setDuration(d || 0);
      }
    };
    const onDurationChange = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (d && d !== duration) {
        setDuration(d);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Use trackRef (not the stale `track` closure) so the correct id is dispatched
      // even though this listener was registered once with an empty-deps effect.
      window.dispatchEvent(new CustomEvent('track-ended', { detail: { trackId: trackRef.current?.id } }));
    };
    const onError = () => {
      setIsPlaying(false);
      toast.error('Unable to play this audio file');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = async (next: LocalTrack) => {
    if (!next?.url) {
      toast.error('This track has no playable URL');
      return;
    }
    const audio = ensureAudio();

    // Format URL to be absolute if needed
    let audioUrl = next.url;
    if (audioUrl && !audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
      // If relative URL, make it absolute
      audioUrl = audioUrl.startsWith('/') ? `${window.location.origin}${audioUrl}` : `${window.location.origin}/${audioUrl}`;
    }

    // If same track, just toggle
    if (track?.id === next.id && audio.src === audioUrl) {
      if (audio.paused) {
        try {
          await audio.play();
        } catch (e: any) {
          console.error('Audio play blocked:', e);
          const errorMsg = e?.name === 'NotAllowedError' 
            ? 'Browser blocked playback. Please click the play button again.' 
            : e?.message || 'Failed to play audio';
          toast.error(errorMsg);
        }
      } else {
        audio.pause();
      }
      return;
    }

    setTrack(next);
    setCurrentTime(0);
    setDuration(0);

    // Load the audio first, then play
    return new Promise<void>((resolve) => {
      const handleCanPlay = async () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.currentTime = 0;
        try {
          await audio.play();
          resolve();
        } catch (e: any) {
          console.error('Audio play blocked:', e);
          const errorMsg = e?.name === 'NotAllowedError' 
            ? 'Browser blocked playback. Please click the play button again.' 
            : e?.message || 'Failed to play audio';
          toast.error(errorMsg);
          resolve();
        }
      };

      const handleError = (e: Event) => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        console.error('Audio load error:', e);
        toast.error('Failed to load audio file. Please check the file URL.');
        resolve();
      };

      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });
      audio.src = audioUrl;
      audio.load(); // Explicitly load the audio
    });
  };

  const toggle = async () => {
    const audio = ensureAudio();
    if (!track) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch (e: any) {
        console.error('Audio play blocked:', e);
        const errorMsg = e?.name === 'NotAllowedError' 
          ? 'Browser blocked playback. Please click the play button again.' 
          : e?.message || 'Failed to play audio';
        toast.error(errorMsg);
      }
    } else {
      audio.pause();
    }
  };

  const pause = () => {
    const audio = ensureAudio();
    audio.pause();
  };

  const stop = () => {
    const audio = ensureAudio();
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seek = (timeSeconds: number) => {
    const audio = ensureAudio();
    const t = Math.max(0, Math.min(timeSeconds, Number.isFinite(audio.duration) ? audio.duration : timeSeconds));
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const setVolume = (volume0to100: number) => {
    setVolumeState(Math.max(0, Math.min(100, volume0to100)));
  };

  const value = useMemo(
    () => ({
      track,
      isPlaying,
      currentTime,
      duration,
      volume,
      play,
      toggle,
      pause,
      stop,
      seek,
      setVolume,
    }),
    [track, isPlaying, currentTime, duration, volume]
  );

  return <LocalPlayerContext.Provider value={value}>{children}</LocalPlayerContext.Provider>;
}

export function useLocalPlayer() {
  const ctx = useContext(LocalPlayerContext);
  // During Vite HMR, components can briefly render before providers re-mount.
  // Return a safe no-op implementation instead of crashing the whole app.
  if (!ctx) {
    return {
      track: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 100,
      play: async () => {},
      toggle: async () => {},
      pause: () => {},
      stop: () => {},
      seek: () => {},
      setVolume: () => {},
    } satisfies LocalPlayerContextType;
  }
  return ctx;
}


