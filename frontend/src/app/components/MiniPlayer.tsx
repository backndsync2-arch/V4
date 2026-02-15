import React, { useState, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { Slider } from '@/app/components/ui/slider';
import { 
  Play, 
  Pause, 
  ChevronUp, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  VolumeX,
  Heart,
  MoreHorizontal,
  Maximize2
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { useLocalPlayer } from '@/lib/localPlayer';
import { usePlayback } from '@/lib/playback';
import { cn } from '@/app/components/ui/utils';
import { toast } from 'sonner';

export function MiniPlayer() {
  const { track, isPlaying, currentTime, duration, volume, toggle, seek, setVolume, stop } = useLocalPlayer();
  const { skipNext, skipPrevious } = usePlayback();
  const [isExpanded, setIsExpanded] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffled, setIsShuffled] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Handle progress bar click/drag
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newTime = (percentage / 100) * duration;
    seek(newTime);
  };

  // Handle progress slider change
  const handleProgressChange = (value: number[]) => {
    if (value.length > 0 && duration) {
      const newTime = (value[0] / 100) * duration;
      seek(newTime);
    }
  };

  // Handle volume slider change
  const handleVolumeChange = (value: number[]) => {
    if (value.length > 0) {
      setVolume(value[0]);
    }
  };

  // Toggle repeat mode
  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // Get repeat icon
  const getRepeatIcon = () => {
    if (repeatMode === 'one') return Repeat1;
    return Repeat;
  };

  const RepeatIcon = getRepeatIcon();

  return (
    <>
      {/* Mini Player Bar */}
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        <SheetTrigger asChild>
          <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] text-white border-t border-white/10 cursor-pointer hover:from-[#2a2a2a] hover:to-[#1a1a1a] transition-all shadow-lg">
            {/* Progress bar */}
            <div 
              ref={progressRef}
              className="h-1 bg-white/10 cursor-pointer group relative"
              onClick={handleProgressClick}
            >
              <div 
                className="h-full bg-gradient-to-r from-[#1db954] to-[#1ed760] transition-all group-hover:from-[#1ed760] group-hover:to-[#1db954]"
                style={{ width: `${progress}%` }}
              />
              {/* Hover indicator */}
              <div 
                className="absolute top-0 left-0 h-full w-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Track Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Album Art Placeholder */}
                <div className="w-14 h-14 rounded-md bg-gradient-to-br from-[#1db954] to-[#1ed760] flex items-center justify-center shrink-0 shadow-lg">
                  <span className="text-white text-xl font-bold">
                    {track.title?.charAt(0)?.toUpperCase() || '♪'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-white">{track.title}</p>
                  <p className="text-xs text-gray-400 truncate">Now Playing</p>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    skipPrevious();
                  }}
                  className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full p-0"
                >
                  <SkipBack className="h-4 w-4 fill-current" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  className="text-white hover:text-white hover:bg-white/10 h-9 w-9 rounded-full p-0"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    skipNext();
                  }}
                  className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full p-0"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </Button>
              </div>

              {/* Mobile: Just play/pause */}
              <div className="md:hidden flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  className="text-white hover:text-white hover:bg-white/10 h-9 w-9 rounded-full p-0"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  )}
                </Button>
              </div>

              {/* Expand Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full p-0 shrink-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetTrigger>

        {/* Expanded Now Playing Sheet */}
        <SheetContent side="bottom" className="h-screen max-h-screen bg-gradient-to-b from-[#121212] to-[#1a1a1a] border-white/10 p-0 overflow-hidden">
          <div className="flex flex-col h-full max-h-screen">
            {/* Header */}
            <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 flex items-center justify-between border-b border-white/10 shrink-0">
              <SheetTitle className="text-white text-base sm:text-lg font-semibold">Now Playing</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <ChevronUp className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col h-full max-h-full">
                {/* Album Art */}
                <div className="w-full max-w-[280px] sm:max-w-md mx-auto mb-4 sm:mb-6 shrink-0">
                  <div className="aspect-square w-full bg-gradient-to-br from-[#1db954] via-[#1ed760] to-[#1db954] rounded-xl sm:rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="text-white text-6xl sm:text-8xl md:text-9xl font-bold z-10 drop-shadow-2xl">
                      {track.title?.charAt(0)?.toUpperCase() || '♪'}
                    </div>
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Track Info */}
                <div className="text-center mb-4 sm:mb-6 shrink-0">
                  <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 px-2 truncate">{track.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-4">Local Playback</p>
                  
                  {/* Like Button */}
                  <div className="flex items-center justify-center gap-3 sm:gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsLiked(!isLiked)}
                      className={cn(
                        "h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0 transition-all",
                        isLiked 
                          ? "text-[#1db954] hover:text-[#1ed760] hover:bg-[#1db954]/20" 
                          : "text-gray-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5", isLiked && "fill-current")} />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0 text-gray-400 hover:text-white hover:bg-white/10"
                    >
                      <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4 sm:mb-6 shrink-0">
                  <Slider
                    value={[progress]}
                    onValueChange={handleProgressChange}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1 sm:mt-2">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6 shrink-0">
                  {/* Shuffle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsShuffled(!isShuffled)}
                    className={cn(
                      "h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0 transition-all",
                      isShuffled
                        ? "text-[#1db954] hover:text-[#1ed760] hover:bg-[#1db954]/20"
                        : "text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Shuffle className={cn("h-4 w-4 sm:h-5 sm:w-5", isShuffled && "fill-current")} />
                  </Button>

                  {/* Previous */}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full p-0 text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      skipPrevious();
                    }}
                  >
                    <SkipBack className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                  </Button>

                  {/* Play/Pause */}
                  <Button
                    size="lg"
                    onClick={() => toggle()}
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-full p-0 bg-white hover:bg-gray-200 shadow-xl hover:scale-105 transition-transform"
                  >
                    {isPlaying ? (
                      <Pause className="h-7 w-7 sm:h-8 sm:w-8 fill-black ml-0.5" />
                    ) : (
                      <Play className="h-7 w-7 sm:h-8 sm:w-8 fill-black ml-1" />
                    )}
                  </Button>

                  {/* Next */}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full p-0 text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      skipNext();
                    }}
                  >
                    <SkipForward className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                  </Button>

                  {/* Repeat */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleRepeat}
                    className={cn(
                      "h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0 transition-all",
                      repeatMode !== 'off'
                        ? "text-[#1db954] hover:text-[#1ed760] hover:bg-[#1db954]/20"
                        : "text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <RepeatIcon className={cn("h-4 w-4 sm:h-5 sm:w-5", repeatMode !== 'off' && "fill-current")} />
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (volume > 0) {
                        setVolume(0);
                      } else {
                        setVolume(100);
                      }
                    }}
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0 text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </Button>
                  
                  <div className="flex-1">
                    <Slider
                      value={[volume]}
                      onValueChange={handleVolumeChange}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <span className="text-xs text-gray-400 w-10 text-right shrink-0">{Math.round(volume)}%</span>
                </div>

                {/* Additional Actions */}
                <div className="mt-auto pt-4 sm:pt-6 border-t border-white/10 flex items-center justify-center gap-3 sm:gap-4 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      stop();
                      setIsExpanded(false);
                    }}
                    className="text-gray-400 hover:text-white hover:bg-white/10 text-xs sm:text-sm"
                  >
                    Stop
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const element = document.documentElement;
                      if (!document.fullscreenElement) {
                        element.requestFullscreen().catch((err) => {
                          console.error('Error attempting to enable fullscreen:', err);
                          toast.error('Failed to enter fullscreen mode');
                        });
                      } else {
                        document.exitFullscreen().catch((err) => {
                          console.error('Error attempting to exit fullscreen:', err);
                        });
                      }
                    }}
                    className="text-gray-400 hover:text-white hover:bg-white/10 text-xs sm:text-sm"
                  >
                    <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Full Screen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
