import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import { backgroundAudio } from '@/lib/backgroundAudio';
import { Slider } from '@/app/components/ui/slider';

/**
 * Example Audio Player with Background Playback
 * 
 * This component demonstrates how to:
 * 1. Setup audio element for background playback
 * 2. Connect to background audio manager
 * 3. Update lock screen metadata
 * 4. Handle playback controls
 */

export function AudioPlayerExample() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [currentTrack, setCurrentTrack] = useState({
    title: 'Autumn Leaves',
    artist: 'Miles Davis',
    album: 'Jazz Collection',
    url: '/audio/autumn-leaves.mp3', // Replace with actual audio URL
    artwork: '/album-art.png', // Replace with actual artwork
  });

  useEffect(() => {
    if (!audioRef.current) return;

    // Setup audio element for background playback
    const audio = backgroundAudio.setupAudio(audioRef.current);
    
    // Update lock screen metadata
    backgroundAudio.updateMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: currentTrack.artwork,
    });

    // Setup lock screen controls
    backgroundAudio.setupControls({
      play: handlePlay,
      pause: handlePause,
      nexttrack: handleNext,
      previoustrack: handlePrevious,
    });

    // Listen for audio events
    const handlePlayEvent = () => {
      setIsPlaying(true);
      backgroundAudio.setPlaybackState('playing');
    };

    const handlePauseEvent = () => {
      setIsPlaying(false);
      backgroundAudio.setPlaybackState('paused');
    };

    const handleEndedEvent = () => {
      handleNext(); // Auto-play next track
    };

    audio.addEventListener('play', handlePlayEvent);
    audio.addEventListener('pause', handlePauseEvent);
    audio.addEventListener('ended', handleEndedEvent);

    return () => {
      audio.removeEventListener('play', handlePlayEvent);
      audio.removeEventListener('pause', handlePauseEvent);
      audio.removeEventListener('ended', handleEndedEvent);
    };
  }, [currentTrack]);

  const handlePlay = async () => {
    if (!audioRef.current) return;

    try {
      // Enable background audio (requires user gesture)
      await backgroundAudio.enableBackground();
      
      // Play audio
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Playback failed:', err);
    }
  };

  const handlePause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handleNext = () => {
    // In production: Load next track from queue
    console.log('Next track');
    setCurrentTrack({
      title: 'Take Five',
      artist: 'Dave Brubeck',
      album: 'Jazz Collection',
      url: '/audio/take-five.mp3',
      artwork: '/album-art-2.png',
    });
  };

  const handlePrevious = () => {
    // In production: Load previous track
    console.log('Previous track');
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background Audio Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={currentTrack.url}
          preload="auto"
        />

        {/* Track info */}
        <div className="text-center">
          <h3 className="font-semibold text-lg">{currentTrack.title}</h3>
          <p className="text-sm text-slate-500">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={handlePrevious}
          >
            ⏮️
          </Button>
          
          <Button
            size="lg"
            onClick={isPlaying ? handlePause : handlePlay}
            className="h-16 w-16 rounded-full"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
          
          <Button
            size="icon"
            variant="outline"
            onClick={handleNext}
          >
            ⏭️
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3">
          <Volume2 className="h-4 w-4 text-slate-500" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
          <span className="text-sm text-slate-500 w-10 text-right">{volume}%</span>
        </div>

        {/* Status */}
        <div className="text-center text-sm text-slate-600">
          {isPlaying ? (
            <span className="text-green-600">▶️ Playing (continues in background)</span>
          ) : (
            <span className="text-slate-400">⏸️ Paused</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * PRODUCTION USAGE GUIDE:
 * 
 * 1. Replace mock audio URLs with real URLs:
 *    - Use your backend API for audio streaming
 *    - Or use CDN URLs for hosted audio
 * 
 * 2. Implement real queue management:
 *    - Load tracks from database
 *    - Handle next/previous properly
 *    - Shuffle and repeat functionality
 * 
 * 3. Add progress tracking:
 *    - Listen to 'timeupdate' event
 *    - Update progress bar
 *    - Save playback position
 * 
 * 4. Handle errors:
 *    - Network errors (retry logic)
 *    - Invalid audio files
 *    - Browser limitations
 * 
 * 5. Optimize for mobile:
 *    - Preload next track
 *    - Cache frequently played tracks
 *    - Handle phone calls (pause/resume)
 * 
 * IMPORTANT:
 * - First play() MUST be triggered by user gesture
 * - After that, background audio works automatically
 * - Test on real devices (iOS/Android/Desktop)
 * - HTTPS is required for all background audio features
 */
