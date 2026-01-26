import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { Play, Pause, ChevronUp } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { Badge } from '@/app/components/ui/badge';
import { useLocalPlayer } from '@/lib/localPlayer';

export function MiniPlayer() {
  const { track, isPlaying, currentTime, duration, toggle } = useLocalPlayer();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Mini Player Bar */}
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        <SheetTrigger asChild>
          <div className="bg-slate-900 text-white border-t border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
            {/* Progress bar */}
            <div className="h-1 bg-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{track.title}</p>
                </div>
                <p className="text-xs text-slate-400 truncate">Now Playing</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  className="text-white hover:text-white hover:bg-slate-700 h-9 w-9 rounded-full"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  )}
                </Button>
                <ChevronUp className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </SheetTrigger>

        {/* Expanded Now Playing Sheet */}
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Now Playing</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Album Art Placeholder */}
            <div className="aspect-square w-full max-w-sm mx-auto bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20" />
              <div className="text-white text-6xl md:text-8xl font-bold z-10">
                {track.title.charAt(0)}
              </div>
            </div>

            {/* Track Info */}
            <div className="text-center">
              <h3 className="text-2xl md:text-3xl font-bold">{track.title}</h3>
              <Badge variant="secondary" className="mt-2">Local Playback</Badge>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                className="h-14 px-10 text-lg"
                onClick={() => toggle()}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Play
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}