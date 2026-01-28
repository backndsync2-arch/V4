import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Music2, MoreVertical } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';

export function FolderCard({
  name,
  count,
  imageUrl,
  selected,
  subtitle,
  onClick,
  onEdit,
  onDelete,
  canEdit = true,
}: {
  name: string;
  count?: number;
  imageUrl?: string;
  selected?: boolean;
  subtitle?: string;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  canEdit?: boolean;
}) {
  const img = (imageUrl || '').trim();

  return (
    <div className="relative group">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          'relative w-full rounded-lg overflow-hidden border text-left bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm shadow-lg hover:shadow-xl hover:shadow-[#1db954]/20 transition-all duration-200 hover:scale-[1.02] cursor-pointer',
          selected 
            ? 'border-[#1db954] ring-2 ring-[#1db954]/30 shadow-[#1db954]/20 bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10' 
            : 'border-white/10 hover:border-white/20'
        )}
      >
        <div className="relative aspect-square">
          {img ? (
            <img src={img} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#1db954]/20 to-[#1ed760]/10 flex items-center justify-center">
              <div className="p-3 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-lg">
                <Music2 className="h-8 w-8 text-white" />
              </div>
            </div>
          )}

          {/* Soft overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />

          {typeof count === 'number' && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-white/10 text-white border border-white/20">
                {count}
              </Badge>
            </div>
          )}

          {/* 3-dot menu for all folders */}
          {canEdit && onEdit && (
            <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 shadow-md hover:shadow-lg transition-all"
                    aria-label="Folder options"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#2a2a2a] border-white/10">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEdit) onEdit(e);
                    }}
                    className="text-white hover:bg-white/10 focus:bg-white/10"
                  >
                    Edit folder
                  </DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete) onDelete(e);
                      }}
                      className="text-red-400 hover:bg-red-500/20 focus:bg-red-500/20"
                    >
                      Delete folder
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="text-white font-semibold truncate">{name}</div>
            {subtitle ? (
              <div className="text-white/80 text-xs truncate mt-0.5">{subtitle}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


