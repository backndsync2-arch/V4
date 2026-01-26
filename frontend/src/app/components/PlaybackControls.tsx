import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Slider } from '@/app/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2 } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isShuffleOn: boolean;
  isRepeatOn: boolean;
  volume: number;
  onPlayPause: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onVolumeChange: (volume: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showVolume?: boolean;
}

export function PlaybackControls({
  isPlaying,
  isShuffleOn,
  isRepeatOn,
  volume,
  onPlayPause,
  onSkipNext,
  onSkipPrevious,
  onToggleShuffle,
  onToggleRepeat,
  onVolumeChange,
  size = 'md',
  showVolume = false,
}: PlaybackControlsProps) {
  const sizes = {
    sm: {
      main: 'h-10 w-10',
      mainIcon: 'h-5 w-5',
      secondary: 'h-8 w-8',
      secondaryIcon: 'h-4 w-4',
      tertiary: 'h-7 w-7',
      tertiaryIcon: 'h-3.5 w-3.5',
    },
    md: {
      main: 'h-14 w-14',
      mainIcon: 'h-6 w-6',
      secondary: 'h-10 w-10',
      secondaryIcon: 'h-5 w-5',
      tertiary: 'h-9 w-9',
      tertiaryIcon: 'h-4 w-4',
    },
    lg: {
      main: 'h-20 w-20',
      mainIcon: 'h-8 w-8',
      secondary: 'h-14 w-14',
      secondaryIcon: 'h-6 w-6',
      tertiary: 'h-12 w-12',
      tertiaryIcon: 'h-5 w-5',
    },
  };

  const sizeClass = sizes[size];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 md:gap-3">
        {/* Shuffle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleShuffle}
          className={cn(
            sizeClass.tertiary,
            'rounded-full transition-all hover:scale-105',
            isShuffleOn && 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800'
          )}
        >
          <Shuffle className={sizeClass.tertiaryIcon} />
        </Button>

        {/* Previous */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onSkipPrevious}
          className={cn(
            sizeClass.secondary,
            'rounded-full hover:bg-slate-100 hover:scale-105 transition-all'
          )}
        >
          <SkipBack className={cn(sizeClass.secondaryIcon, 'fill-current')} />
        </Button>

        {/* Play/Pause */}
        <Button
          size="icon"
          onClick={onPlayPause}
          className={cn(
            sizeClass.main,
            'rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all'
          )}
        >
          {isPlaying ? (
            <Pause className={cn(sizeClass.mainIcon, 'fill-current')} />
          ) : (
            <Play className={cn(sizeClass.mainIcon, 'fill-current ml-0.5')} />
          )}
        </Button>

        {/* Next */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onSkipNext}
          className={cn(
            sizeClass.secondary,
            'rounded-full hover:bg-slate-100 hover:scale-105 transition-all'
          )}
        >
          <SkipForward className={cn(sizeClass.secondaryIcon, 'fill-current')} />
        </Button>

        {/* Repeat */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleRepeat}
          className={cn(
            sizeClass.tertiary,
            'rounded-full transition-all hover:scale-105',
            isRepeatOn && 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800'
          )}
        >
          <Repeat className={sizeClass.tertiaryIcon} />
        </Button>
      </div>

      {/* Volume Control */}
      {showVolume && (
        <div className="flex items-center gap-3 px-4">
          <Volume2 className="h-4 w-4 text-slate-500 shrink-0" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={(value) => onVolumeChange(value[0])}
            className="flex-1"
          />
          <span className="text-sm text-slate-500 w-10 text-right font-medium">{volume}%</span>
        </div>
      )}
    </div>
  );
}
