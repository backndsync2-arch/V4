import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier, XYCoord } from 'dnd-core';
import { Button } from '@/app/components/ui/button';
import { Play, Pause, MoreVertical, Trash2, GripVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { ImageUpload } from '@/app/components/ImageUpload';
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils';
import { cn } from '@/app/components/ui/utils';

interface DragItem {
  index: number;
  id: string;
  type: string;
}

interface DraggableTrackProps {
  file: any;
  index: number;
  moveTrack: (dragIndex: number, hoverIndex: number) => void;
  playingTrack: string | null;
  coverArt: Record<string, string | null>;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
  onCoverArtChange: (id: string, url: string | null) => void;
}

export function DraggableTrack({
  file,
  index,
  moveTrack,
  playingTrack,
  coverArt,
  onPlay,
  onDelete,
  onCoverArtChange,
}: DraggableTrackProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: 'track',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveTrack(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'track',
    item: () => {
      return { id: file.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;
  
  // Connect drag and drop refs
  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      style={{ opacity }}
      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg transition-all duration-200 border ${
        isDragging 
          ? 'bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 border-[#1db954] shadow-xl scale-[1.02] cursor-grabbing' 
          : playingTrack === file.id
          ? 'bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 border-[#1db954] hover:border-[#1ed760] hover:shadow-md cursor-grab'
          : 'bg-white/5 border-white/10 hover:border-white/20 hover:shadow-md cursor-grab'
      }`}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing touch-none shrink-0">
        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
      </div>

      {/* Cover Art */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-sm">
        <ImageUpload
          currentImage={coverArt[file.id] || undefined}
          onImageChange={(url) => onCoverArtChange(file.id, url)}
          variant="cover"
          size="sm"
        />
      </div>

      <div className="flex items-center justify-between flex-1 min-w-0">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <Button
            size="sm"
            variant={playingTrack === file.id ? 'default' : 'outline'}
            onClick={() => onPlay(file.id)}
            className={cn(
              "shrink-0",
              playingTrack === file.id && "bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] shadow-md text-white"
            )}
          >
            {playingTrack === file.id ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{file.name}</p>
            <p className="text-xs sm:text-sm text-gray-400 truncate">
              {formatDuration(file.duration)} • {formatFileSize(file.size)} • {formatDate(file.createdAt)}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="shrink-0 hover:bg-white/10 text-gray-400 hover:text-white">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#2a2a2a] border-white/10">
            <DropdownMenuItem onClick={() => onDelete(file.id)} className="text-red-400 hover:bg-red-500/20">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
