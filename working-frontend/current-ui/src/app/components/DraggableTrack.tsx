import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier, XYCoord } from 'dnd-core';
import { Button } from '@/app/components/ui/button';
import { Play, Pause, MoreVertical, Trash2, GripVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { ImageUpload } from '@/app/components/ImageUpload';
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils';

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
      className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
        isDragging 
          ? 'bg-blue-100 shadow-lg scale-105 cursor-grabbing' 
          : 'bg-slate-50 hover:bg-slate-100 cursor-grab'
      }`}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-5 w-5 text-slate-400" />
      </div>

      {/* Cover Art */}
      <div className="w-16 h-16 flex-shrink-0">
        <ImageUpload
          currentImage={coverArt[file.id] || undefined}
          onImageChange={(url) => onCoverArtChange(file.id, url)}
          variant="cover"
          size="sm"
        />
      </div>

      <div className="flex items-center justify-between flex-1">
        <div className="flex items-center gap-4 flex-1">
          <Button
            size="sm"
            variant={playingTrack === file.id ? 'default' : 'outline'}
            onClick={() => onPlay(file.id)}
          >
            {playingTrack === file.id ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <div className="flex-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-slate-500">
              {formatDuration(file.duration)} • {formatFileSize(file.size)} • {formatDate(file.createdAt)}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDelete(file.id)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
