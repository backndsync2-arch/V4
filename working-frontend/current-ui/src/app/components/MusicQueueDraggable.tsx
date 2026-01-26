import React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { GripVertical, Play } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/app/components/ui/utils';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  category: string;
  image: string;
}

interface DraggableTrackProps {
  track: MusicTrack;
  index: number;
  moveTrack: (dragIndex: number, hoverIndex: number) => void;
  onPlay?: (trackId: string) => void;
}

const DraggableTrack: React.FC<DraggableTrackProps> = ({ track, index, moveTrack, onPlay }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'TRACK',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'TRACK',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveTrack(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={cn(
        'group flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-move hover:border-slate-300 transition-all',
        isDragging && 'opacity-50'
      )}
    >
      <GripVertical className="h-5 w-5 text-slate-400 shrink-0" />
      
      <div className="relative h-12 w-12 rounded overflow-hidden shrink-0 bg-slate-100">
        <img 
          src={track.image} 
          alt={track.title}
          className="h-full w-full object-cover"
        />
        <button
          onClick={() => onPlay?.(track.id)}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <Play className="h-5 w-5 text-white fill-white" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{track.title}</p>
        <p className="text-sm text-slate-500 truncate">{track.artist}</p>
      </div>

      <div className="text-right shrink-0">
        <Badge variant="secondary" className="mb-1">
          {track.category}
        </Badge>
        <p className="text-xs text-slate-500">{formatDuration(track.duration)}</p>
      </div>
    </div>
  );
};

interface MusicQueueDraggableProps {
  tracks: MusicTrack[];
  onReorder: (tracks: MusicTrack[]) => void;
  onPlay?: (trackId: string) => void;
}

export function MusicQueueDraggable({ tracks, onReorder, onPlay }: MusicQueueDraggableProps) {
  const moveTrack = (dragIndex: number, hoverIndex: number) => {
    const newTracks = [...tracks];
    const [removed] = newTracks.splice(dragIndex, 1);
    newTracks.splice(hoverIndex, 0, removed);
    onReorder(newTracks);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-2">
        {tracks.map((track, index) => (
          <DraggableTrack
            key={track.id}
            track={track}
            index={index}
            moveTrack={moveTrack}
            onPlay={onPlay}
          />
        ))}
      </div>
    </DndProvider>
  );
}
