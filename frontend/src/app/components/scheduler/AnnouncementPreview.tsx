import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { Play, Pause, Loader2 } from 'lucide-react';
import { backgroundAudio } from '@/lib/backgroundAudio';

// Shared state to track currently playing audio (only one at a time)
let currentPlayingAudio: HTMLAudioElement | null = null;
let currentSetIsPlaying: ((playing: boolean) => void) | null = null;

interface AnnouncementPreviewProps {
  audio: any;
  size?: 'sm' | 'md';
}

export function AnnouncementPreview({ audio, size = 'sm' }: AnnouncementPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop audio when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (currentPlayingAudio === audioRef.current) {
          currentPlayingAudio = null;
          currentSetIsPlaying = null;
        }
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent checkbox selection when clicking play
    
    if (!audio.url && !audio.file_url && !audio.file) {
      return;
    }

    const audioUrl = audio.file_url || audio.url || audio.file;
    const absoluteUrl = audioUrl.startsWith('http') 
      ? audioUrl 
      : `${window.location.origin}${audioUrl}`;

    // Stop any currently playing audio from other components
    if (currentPlayingAudio && currentPlayingAudio !== audioRef.current) {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
      if (currentSetIsPlaying) {
        currentSetIsPlaying(false);
      }
      currentPlayingAudio = null;
      currentSetIsPlaying = null;
    }

    // If clicking the same announcement that's playing, just pause it
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      currentPlayingAudio = null;
      currentSetIsPlaying = null;
      return;
    }

    setIsLoading(true);
    
    try {
      // Ensure AudioContext is ready
      backgroundAudio.createAudioContext();
      await backgroundAudio.resumeAudioContext();
      
      // Create new audio element
      const audioElement = new Audio(absoluteUrl);
      audioRef.current = audioElement;
      
      audioElement.volume = 1.0;
      
      // Handle events
      audioElement.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);
        if (currentPlayingAudio === audioElement) {
          currentPlayingAudio = null;
          currentSetIsPlaying = null;
        }
      };
      
      audioElement.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        if (currentPlayingAudio === audioElement) {
          currentPlayingAudio = null;
          currentSetIsPlaying = null;
        }
        console.error('Failed to play announcement:', absoluteUrl);
      };
      
      audioElement.oncanplay = () => {
        setIsLoading(false);
      };
      
      // Play
      await audioElement.play();
      setIsPlaying(true);
      
      // Update shared state
      currentPlayingAudio = audioElement;
      currentSetIsPlaying = setIsPlaying;
    } catch (error: any) {
      setIsPlaying(false);
      setIsLoading(false);
      console.error('Play error:', error);
    }
  };

  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size={buttonSize}
          variant="outline"
          onClick={handlePlay}
          className="shrink-0"
          disabled={isLoading || (!audio.url && !audio.file_url && !audio.file)}
        >
          {isLoading ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : isPlaying ? (
            <Pause className={iconSize} />
          ) : (
            <Play className={iconSize} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isPlaying ? 'Pause preview' : 'Preview announcement'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

