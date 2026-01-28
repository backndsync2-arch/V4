import React from 'react';
import { FolderCard } from '@/app/components/music/FolderCard';
import type { Folder, MusicFile } from '@/lib/types';

export function FolderGrid({
  folders,
  musicFiles,
  selectedFolderId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
  activeTarget,
}: {
  folders: Folder[];
  musicFiles: MusicFile[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onEditFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  activeTarget?: string | null;
}) {
  // Filter music files by active zone if one is selected
  const zoneFilteredMusic = activeTarget
    ? musicFiles.filter((m: any) => m.zoneId === activeTarget || m.zone === activeTarget)
    : musicFiles;
  
  const allCount = zoneFilteredMusic.length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
      <FolderCard
        name="All Music"
        subtitle="All tracks"
        count={allCount}
        selected={selectedFolderId === null}
        onClick={() => onSelectFolder(null)}
        onEdit={onEditFolder ? () => onEditFolder(null) : undefined}
        canEdit={false}
      />

      {folders.map((f) => {
        // Count music files in this folder, filtered by active zone
        const folderMusic = zoneFilteredMusic.filter((mf) => mf.folderId === f.id);
        const count = folderMusic.length;

        return (
          <FolderCard
            key={f.id}
            name={f.name}
            subtitle="Folder"
            count={count}
            imageUrl={f.coverImageUrl}
            selected={selectedFolderId === f.id}
            onClick={() => onSelectFolder(f.id)}
            onEdit={onEditFolder ? () => onEditFolder(f) : undefined}
            onDelete={onDeleteFolder ? () => onDeleteFolder(f) : undefined}
            canEdit={true}
          />
        );
      })}
    </div>
  );
}


