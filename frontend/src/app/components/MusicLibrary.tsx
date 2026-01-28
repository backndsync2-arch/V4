import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { musicAPI, announcementsAPI } from '@/lib/api';
import { FolderPlus, Upload, Search, GripVertical } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { ImageUpload } from '@/app/components/ImageUpload';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableTrack } from '@/app/components/DraggableTrack';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { useLocalPlayer } from '@/lib/localPlayer';
import { FolderGrid } from '@/app/components/music/FolderGrid';
import { CreateFolderDialog } from '@/app/components/music/CreateFolderDialog';
import { EditFolderDialog } from '@/app/components/music/EditFolderDialog';
import { cn } from '@/app/components/ui/utils';
import { usePlayback } from '@/lib/playback';
import { zonesAPI } from '@/lib/api';
import { ConfirmationDialog } from '@/app/components/ui/confirmation-dialog';

export function MusicLibrary() {
  const { user } = useAuth();
  const { activeTarget } = usePlayback();
  const musicUploadInputId = React.useId();
  const musicUploadInputRef = useRef<HTMLInputElement | null>(null);
  const { play: playLocal, track: localTrack, isPlaying: isLocalPlaying } = useLocalPlayer();
  const filesSectionRef = useRef<HTMLDivElement | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [announcementFolders, setAnnouncementFolders] = useState<any[]>([]);
  const [musicFiles, setMusicFiles] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFoldersOnMobile, setShowFoldersOnMobile] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any | null>(null);
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [coverArt, setCoverArt] = useState<Record<string, string | null>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDestination, setUploadDestination] = useState<'music' | 'announcements'>('music');
  const [announcementUploadFolderId, setAnnouncementUploadFolderId] = useState<string | null>(null);
  const [musicUploadFolderId, setMusicUploadFolderId] = useState<string | null>(null);
  const [pendingMusicFilesCount, setPendingMusicFilesCount] = useState(0);
  const [musicCoverArtMap, setMusicCoverArtMap] = useState<Map<string, File>>(new Map());
  const [zones, setZones] = useState<any[]>([]);
  const [musicUploadZoneId, setMusicUploadZoneId] = useState<string | null>(null);
  const [announcementUploadZoneId, setAnnouncementUploadZoneId] = useState<string | null>(null);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState<{ open: boolean; folder: any | null }>({ open: false, folder: null });

  const isAdmin = user?.role === 'admin';
  const filteredFolders = folders;
  
  // Filter music files by selected zone (activeTarget from GlobalHeader)
  const zoneFilteredFiles = activeTarget
    ? musicFiles.filter((f: any) => f.zoneId === activeTarget || f.zone === activeTarget)
    : musicFiles;
  
  const displayedFiles = selectedFolder
    ? zoneFilteredFiles.filter(f => f.folderId === selectedFolder)
    : zoneFilteredFiles;

  const searchedFiles = searchQuery
    ? displayedFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : displayedFiles;

  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    // UX: when user searches, jump to results so it's obvious search is working (especially on mobile)
    if (!isSearching) {
      setShowFoldersOnMobile(true);
      return;
    }
    setShowFoldersOnMobile(false);
    // Give React a tick to render filtered results
    const t = window.setTimeout(() => {
      filesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => window.clearTimeout(t);
  }, [isSearching]);

  useEffect(() => {
    const load = async () => {
      try {
        const [musicFolders, files, z] = await Promise.all([
          musicAPI.getFolders('music'),
          musicAPI.getMusicFiles(),
          zonesAPI.getZones(),
        ]);
        setFolders(musicFolders);
        setMusicFiles(files);
        setZones(z || []);
        if (!musicUploadFolderId && musicFolders.length > 0) {
          setMusicUploadFolderId(musicFolders[0].id);
        }
        // Set default zone to activeTarget if available
        if (activeTarget && !musicUploadZoneId) {
          setMusicUploadZoneId(activeTarget);
        } else if (!musicUploadZoneId && z && z.length > 0) {
          setMusicUploadZoneId(z[0].id);
        }

        if (isAdmin) {
          const annFolders = await musicAPI.getFolders('announcements');
          setAnnouncementFolders(annFolders);
          if (!announcementUploadFolderId && annFolders.length > 0) {
            setAnnouncementUploadFolderId(annFolders[0].id);
          }
          if (activeTarget && !announcementUploadZoneId) {
            setAnnouncementUploadZoneId(activeTarget);
          } else if (!announcementUploadZoneId && z && z.length > 0) {
            setAnnouncementUploadZoneId(z[0].id);
          }
        }
      } catch (e: any) {
        console.error('Failed to load music library:', e);
        toast.error(e?.message || 'Failed to load music library');
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTarget]);

  // Ensure file input is accessible when dialog opens
  useEffect(() => {
    if (isUploadOpen && musicUploadInputRef.current) {
      // Verify input is in DOM
      const input = musicUploadInputRef.current;
      if (!document.body.contains(input) && !input.isConnected) {
        console.warn('File input not in DOM when dialog opened');
      }
    }
  }, [isUploadOpen]);

  // Folder creation is handled by CreateFolderDialog now.

  const handleEditFolder = (folder: any) => {
    // "All Music" is not a real folder, so we can't edit it
    if (folder === null) {
      toast.info('"All Music" is a view of all tracks and cannot have a custom thumbnail.');
      return;
    }
    setEditingFolder(folder);
    setIsEditFolderOpen(true);
  };

  const handleFolderUpdated = (updatedFolder: any) => {
    setFolders((prev) => prev.map((f) => (f.id === updatedFolder.id ? updatedFolder : f)));
    setEditingFolder(null);
  };

  const handleDeleteFolder = (folder: any) => {
    if (!folder || folder === null) {
      toast.info('"All Music" is a view and cannot be deleted.');
      return;
    }
    setDeleteFolderDialog({ open: true, folder });
  };

  const confirmDeleteFolder = async () => {
    const folder = deleteFolderDialog.folder;
    if (!folder) return;

    // Count music files in folder
    const filesInFolder = musicFiles.filter((f: any) => f.folderId === folder.id);
    const fileCount = filesInFolder.length;

    try {
      // First, delete all music files in the folder
      if (fileCount > 0) {
        toast.info(`Deleting ${fileCount} music file${fileCount !== 1 ? 's' : ''}...`);
        const deletePromises = filesInFolder.map((file: any) => 
          musicAPI.deleteMusicFile(file.id).catch((err: any) => {
            console.error(`Failed to delete file ${file.id}:`, err);
            return null; // Continue with other files even if one fails
          })
        );
        await Promise.all(deletePromises);
      }

      // Then delete the folder
      await musicAPI.deleteFolder(folder.id);
      
      // Update state
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setMusicFiles((prev) => prev.filter((f: any) => f.folderId !== folder.id));
      
      // If the deleted folder was selected, clear selection
      if (selectedFolder === folder.id) {
        setSelectedFolder(null);
      }

      toast.success(`Folder "${folder.name}" and ${fileCount} file${fileCount !== 1 ? 's' : ''} deleted`);
      setDeleteFolderDialog({ open: false, folder: null });
    } catch (error: any) {
      console.error('Delete folder error:', error);
      toast.error(error?.message || 'Failed to delete folder');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit to 20 files
    const filesToUpload = Array.from(files).slice(0, 20);
    
    if (files.length > 20) {
      toast.warning(`Only the first 20 files will be uploaded (${files.length} selected)`);
    }

    // Check for duplicates before uploading
    const existingFilenames = new Set(musicFiles.map((f: any) => f.filename?.toLowerCase() || f.name?.toLowerCase()));
    const duplicates: string[] = [];
    const filesToUploadFiltered = filesToUpload.filter((f) => {
      const filename = f.name.toLowerCase();
      if (existingFilenames.has(filename)) {
        duplicates.push(f.name);
        return false;
      }
      return true;
    });

    if (duplicates.length > 0) {
      const duplicateList = duplicates.slice(0, 3).join(', ');
      const more = duplicates.length > 3 ? ` (+${duplicates.length - 3} more)` : '';
      toast.warning(
        `Skipping ${duplicates.length} duplicate file(s): ${duplicateList}${more}`,
        { duration: 5000 }
      );
    }

    if (filesToUploadFiltered.length === 0) {
      toast.error('All selected files are duplicates. No files to upload.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    toast.info(`Uploading ${filesToUploadFiltered.length} file(s)...`);

    try {
      if (isAdmin && uploadDestination === 'announcements') {
        const targetFolderId = announcementUploadFolderId || undefined;
        // Upload each file as an announcement
        for (let i = 0; i < filesToUploadFiltered.length; i++) {
          const f = filesToUploadFiltered[i];
          await announcementsAPI.uploadAnnouncement(
            f,
            { 
              title: f.name.replace(/\.[^/.]+$/, ''), 
              folder_id: targetFolderId || undefined,
              zone_id: announcementUploadZoneId || activeTarget || undefined,
            },
            (p) => {
              // Calculate total progress: completed files + current file progress
              const completedFiles = i; // Files already completed
              const currentFileProgress = p / 100; // Current file progress (0-1)
              const totalProgress = ((completedFiles + currentFileProgress) / filesToUploadFiltered.length) * 100;
              setUploadProgress(Math.min(99, Math.round(totalProgress))); // Cap at 99% until all files done
            }
          );
          // Update progress to show this file is complete (but not 100% until all files done)
          const completedFiles = i + 1;
          const totalProgress = (completedFiles / filesToUploadFiltered.length) * 100;
          setUploadProgress(Math.min(99, Math.round(totalProgress)));
        }
        // Only set to 100% when ALL files are actually uploaded
        setUploadProgress(100);
        toast.success(`Uploaded ${filesToUploadFiltered.length} announcement file(s)`);
      } else {
        const folderId = selectedFolder || musicUploadFolderId || filteredFolders[0]?.id;
        const uploaded: any[] = [];
        const failed: { name: string; message: string }[] = [];

        // Upload music files one-by-one to get real progress updates.
        for (let i = 0; i < filesToUploadFiltered.length; i++) {
          const f = filesToUploadFiltered[i];
          try {
            // Get cover art for this file if one was selected
            const coverArt = musicCoverArtMap.get(f.name);
            
            // Track progress for this specific file
            let fileProgress = 0;
            const result = await musicAPI.uploadMusicFile(
              f,
              { 
                folder_id: folderId || undefined,
                zone_id: musicUploadZoneId || activeTarget || undefined,
                title: f.name.replace(/\.[^/.]+$/, ''),
                cover_art: coverArt || undefined,
              },
              (p) => {
                // Update this file's progress
                fileProgress = p;
                // Calculate total progress: completed files + current file progress
                const completedFiles = i; // Files already completed
                const currentFileProgress = p / 100; // Current file progress (0-1)
                const totalProgress = ((completedFiles + currentFileProgress) / filesToUploadFiltered.length) * 100;
                setUploadProgress(Math.min(99, Math.round(totalProgress))); // Cap at 99% until all files done
              }
            );
            uploaded.push(result);
            // Remove from map after successful upload
            musicCoverArtMap.delete(f.name);
            
            // Update progress to show this file is complete (but not 100% until all files done)
            const completedFiles = i + 1;
            const totalProgress = (completedFiles / filesToUploadFiltered.length) * 100;
            setUploadProgress(Math.min(99, Math.round(totalProgress)));
          } catch (err: any) {
            const msg =
              err?.message ||
              (typeof err === 'string' ? err : '') ||
              'Upload failed';
            failed.push({ name: f.name, message: msg });
          }
        }
        
        // Only set to 100% when ALL files are actually uploaded
        setUploadProgress(100);

        // Refresh list from backend to ensure we show correct metadata/URLs.
        const refreshed = await musicAPI.getMusicFiles(selectedFolder || undefined);
        setMusicFiles(prev => {
          // If we fetched only a folder, merge into previous; else replace.
          if (selectedFolder) {
            const other = prev.filter((mf: any) => mf.folderId !== selectedFolder);
            return [...other, ...refreshed];
          }
          return refreshed;
        });

        if (uploaded.length > 0) {
          toast.success(`Uploaded ${uploaded.length} music file(s)`);
        }
        if (failed.length > 0) {
          const first = failed.slice(0, 3).map(f => f.name).join(', ');
          const more = failed.length > 3 ? ` (+${failed.length - 3} more)` : '';
          toast.error(`Failed to upload ${failed.length} file(s): ${first}${more}`);
        }
      }

      setIsUploadOpen(false);
      // Clear cover art map after upload completes
      setMusicCoverArtMap(new Map());
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Allow selecting the same files again
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    const file = musicFiles.find(f => f.id === fileId);
    
    try {
      await musicAPI.deleteMusicFile(fileId);
      setMusicFiles(musicFiles.filter(f => f.id !== fileId));
      toast.success(`Deleted ${file?.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete file');
      console.error('Delete error:', error);
    }
  };

  const handlePlay = async (fileId: string) => {
    const file = musicFiles.find((f: any) => f.id === fileId);
    if (!file?.url) {
      toast.error('This track has no playable URL');
      return;
    }
    await playLocal({ id: String(file.id), title: String(file.name), url: String(file.url) });
  };

  // Keep UI "playing" highlight in sync with global player
  useEffect(() => {
    setPlayingTrack(localTrack?.id && isLocalPlaying ? localTrack.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localTrack?.id, isLocalPlaying]);

  const moveTrack = useCallback(async (dragIndex: number, hoverIndex: number) => {
    const reorderedFiles = [...searchedFiles];
    const [movedFile] = reorderedFiles.splice(dragIndex, 1);
    reorderedFiles.splice(hoverIndex, 0, movedFile);
    
    if (!selectedFolder && !searchQuery) {
      // Viewing all files - simply replace with reordered array
      setMusicFiles(reorderedFiles);
    } else {
      // Viewing filtered subset - update order while preserving other files
      const viewedIds = new Set(reorderedFiles.map(f => f.id));
      
      // Find the position range of filtered files in the original array
      const firstIndex = musicFiles.findIndex(f => viewedIds.has(f.id));
      const lastIndex = musicFiles.reduce((last, f, i) => viewedIds.has(f.id) ? i : last, firstIndex);
      
      // Reconstruct the array: before + reordered + after
      const before = musicFiles.slice(0, firstIndex);
      const after = musicFiles.slice(lastIndex + 1);
      
      setMusicFiles([...before, ...reorderedFiles, ...after]);
    }

    // Save order to backend if in a folder
    if (selectedFolder) {
      try {
        await musicAPI.reorderTracks(selectedFolder, reorderedFiles.map(f => f.id));
      } catch (error: any) {
        toast.error('Failed to save track order');
        console.error('Reorder error:', error);
      }
    }
  }, [searchedFiles, musicFiles, selectedFolder, searchQuery]);

  const handleCoverArtChange = async (fileId: string, url: string | null) => {
    setCoverArt({ ...coverArt, [fileId]: url });
    
    // TODO: Upload cover art to backend
    // try {
    //   if (url) {
    //     const blob = await fetch(url).then(r => r.blob());
    //     const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
    //     await musicAPI.uploadCoverArt(fileId, file);
    //   }
    // } catch (error: any) {
    //   toast.error('Failed to upload cover art');
    // }
  };

  return (
    <>
      <div className="space-y-6">
        <CreateFolderDialog
          open={isCreateFolderOpen}
          onOpenChange={setIsCreateFolderOpen}
          onCreated={(folder) => setFolders((prev) => [...prev, folder])}
        />
        <EditFolderDialog
          open={isEditFolderOpen}
          onOpenChange={setIsEditFolderOpen}
          folder={editingFolder}
          onUpdated={handleFolderUpdated}
        />
        <ConfirmationDialog
          open={deleteFolderDialog.open}
          onOpenChange={(open) => setDeleteFolderDialog({ open, folder: deleteFolderDialog.folder })}
          onConfirm={confirmDeleteFolder}
          title="Delete Folder"
          description={
            deleteFolderDialog.folder
              ? (() => {
                  const fileCount = musicFiles.filter((f: any) => f.folderId === deleteFolderDialog.folder?.id).length;
                  return fileCount > 0
                    ? `Delete folder "${deleteFolderDialog.folder.name}" and all ${fileCount} music file${fileCount !== 1 ? 's' : ''} inside it? This action cannot be undone.`
                    : `Delete folder "${deleteFolderDialog.folder.name}"? This action cannot be undone.`;
                })()
              : ''
          }
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
              <Input
                placeholder="Search music files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 backdrop-blur-sm border-white/20 focus:border-[#1db954] focus:ring-[#1db954]/20 shadow-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-400 font-medium">
                {isSearching ? (
                  <>Showing <span className="font-semibold text-white">{searchedFiles.length}</span> result{searchedFiles.length !== 1 ? 's' : ''}</>
                ) : (
                  <>Browse folders or search your library</>
                )}
              </p>
              {isSearching && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-xs hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateFolderOpen(true)}
              className="bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10 shadow-sm text-white"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Folder</span>
              <span className="sm:hidden">Folder</span>
            </Button>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] shadow-lg shadow-[#1db954]/30 text-white">
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Upload {isAdmin ? 'Content' : 'Music'}</span>
                  <span className="sm:hidden">Upload</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <input
                  id={musicUploadInputId}
                  ref={musicUploadInputRef}
                  type="file"
                  accept="audio/mp3,audio/wav,audio/m4a,audio/mpeg"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    setPendingMusicFilesCount(e.target.files?.length || 0);
                    handleUpload(e as any);
                  }}
                />
                <DialogHeader>
                  <DialogTitle>Upload {isAdmin ? 'Content' : 'Music'}</DialogTitle>
                  <DialogDescription>
                    {isAdmin ? 'Upload audio files as music or announcement templates' : 'Upload audio files to your library'} (up to 20 at once)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label>Destination</Label>
                      <Select value={uploadDestination} onValueChange={(value: 'music' | 'announcements') => setUploadDestination(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="music">Music Library</SelectItem>
                          <SelectItem value="announcements">Announcements (Template)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">
                        {uploadDestination === 'music' ? 'Files will be added to the Music Library as curated playlists' : 'Files will be added to Announcements as ready-made templates'}
                      </p>
                    </div>
                  )}
                  {uploadDestination === 'music' && (
                    <>
                      <div className="space-y-2">
                        <Label>Zone <span className="text-red-400">*</span></Label>
                        <Select
                          value={musicUploadZoneId || activeTarget || ''}
                          onValueChange={(value) => setMusicUploadZoneId(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select zone..." />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map((z: any) => (
                              <SelectItem key={z.id} value={z.id}>
                                {z.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">Select the zone for these music files.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Music Folder</Label>
                        <Select
                          value={musicUploadFolderId || selectedFolder || ''}
                          onValueChange={(value) => setMusicUploadFolderId(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select folder..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredFolders.map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">Choose which music folder these uploads should be added to.</p>
                      </div>
                    </>
                  )}
                  {isAdmin && uploadDestination === 'announcements' && (
                    <>
                      <div className="space-y-2">
                        <Label>Zone <span className="text-red-400">*</span></Label>
                        <Select
                          value={announcementUploadZoneId || activeTarget || ''}
                          onValueChange={(value) => setAnnouncementUploadZoneId(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select zone..." />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map((z: any) => (
                              <SelectItem key={z.id} value={z.id}>
                                {z.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">Select the zone for these announcement files.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Announcement Folder</Label>
                        <Select
                          value={announcementUploadFolderId || ''}
                          onValueChange={(value) => setAnnouncementUploadFolderId(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select folder..." />
                          </SelectTrigger>
                          <SelectContent>
                            {announcementFolders.map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">Uploaded files will be stored in this announcements folder.</p>
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Select Audio Files</Label>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" asChild>
                        <label htmlFor={musicUploadInputId} className="cursor-pointer">
                          Choose files
                        </label>
                      </Button>
                      <span className="text-sm text-slate-600 truncate">
                        {pendingMusicFilesCount > 0 ? `${pendingMusicFilesCount} file(s) selected` : 'No files selected'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    Supported formats: MP3, WAV, M4A • You can manually add cover art after upload
                  </p>
                  {isUploading && (
                    <div className="space-y-2 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <GripVertical className="h-4 w-4 mr-2 animate-pulse" />
                          <p className="text-sm font-medium">
                            Uploading... {uploadProgress}%
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {uploadProgress < 100 ? 'Please wait...' : 'Finalizing...'}
                        </p>
                      </div>
                      <div className="w-full bg-white/10 rounded-md h-2 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-md"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Removed duplicate template dialog - templates gallery is shown inline below */}
          </div>
        </div>

        {/* Folders (industry-style top grid) */}
        <Card className={cn(
          showFoldersOnMobile ? '' : 'hidden md:block',
          'border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm'
        )}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xl font-bold text-white">Folders</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="md:hidden hover:bg-white/10 text-gray-400 hover:text-white"
                onClick={() => setShowFoldersOnMobile((v) => !v)}
              >
                {showFoldersOnMobile ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <FolderGrid
              folders={filteredFolders}
              musicFiles={musicFiles}
              selectedFolderId={selectedFolder}
              onSelectFolder={(id) => setSelectedFolder(id)}
              onEditFolder={handleEditFolder}
              onDeleteFolder={handleDeleteFolder}
            />
          </CardContent>
        </Card>

        {/* Music Files */}
        <div ref={filesSectionRef}>
          <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-white">
                      {selectedFolder
                        ? filteredFolders.find(f => f.id === selectedFolder)?.name
                        : 'All Music'}
                    </CardTitle>
                    <CardDescription className="text-gray-400 mt-1.5">
                      {searchedFiles.length} track{searchedFiles.length !== 1 ? 's' : ''} • Drag to reorder
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <DndProvider backend={HTML5Backend}>
                  <div className="space-y-2">
                    {searchedFiles.map((file, index) => (
                      <DraggableTrack
                        key={file.id}
                        index={index}
                        file={file}
                        moveTrack={moveTrack}
                        playingTrack={playingTrack}
                        coverArt={coverArt}
                        onPlay={handlePlay}
                        onDelete={handleDelete}
                        onCoverArtChange={handleCoverArtChange}
                      />
                    ))}
                    {searchedFiles.length === 0 && (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-white/5 mb-4">
                          <Search className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-gray-400 font-medium">
                          {searchQuery ? 'No music files match your search' : 'No music files in this folder'}
                        </p>
                        {!searchQuery && (
                          <p className="text-sm text-slate-400 mt-2">Upload music files to get started</p>
                        )}
                      </div>
                    )}
                  </div>
                </DndProvider>
              </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}