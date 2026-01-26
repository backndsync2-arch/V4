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
  canEdit = true,
}: {
  name: string;
  count?: number;
  imageUrl?: string;
  selected?: boolean;
  subtitle?: string;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  canEdit?: boolean;
}) {
  const img = (imageUrl || '').trim();

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative w-full rounded-2xl overflow-hidden border text-left bg-white shadow-sm hover:shadow-md transition-all',
          selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
        )}
      >
        <div className="relative aspect-square">
          {img ? (
            <img src={img} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-200 via-slate-100 to-white flex items-center justify-center">
              <Music2 className="h-12 w-12 text-slate-500" />
            </div>
          )}

          {/* Soft overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />

          {typeof count === 'number' && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-white/90 text-slate-900 border border-white/40">
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
                    className="bg-white/95 hover:bg-white text-slate-900 rounded-lg p-2 shadow-md hover:shadow-lg transition-all"
                    aria-label="Folder options"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(e);
                    }}
                  >
                    Edit thumbnail
                  </DropdownMenuItem>
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
      </button>
    </div>
  );
}


