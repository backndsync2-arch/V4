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
}: {
  folders: Folder[];
  musicFiles: MusicFile[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onEditFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
}) {
  const allCount = musicFiles.length;

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
        const count =
          typeof f.musicFilesCount === 'number'
            ? f.musicFilesCount
            : musicFiles.filter((mf) => mf.folderId === f.id).length;

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


