import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { mockFolders, mockMusicFiles, mockMusicTemplates, type MusicTemplate } from '@/lib/mockData';
import { musicAPI } from '@/lib/api';
import { Folder as FolderIcon, FolderPlus, Upload, Play, Pause, MoreVertical, Trash2, Search, GripVertical } from 'lucide-react';
import type { Folder, MusicFile } from '@/lib/types';
import { Badge } from '@/app/components/ui/badge';
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { ImageUpload } from '@/app/components/ImageUpload';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableTrack } from '@/app/components/DraggableTrack';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { MusicTemplatesGallery } from '@/app/components/MusicTemplatesGallery';
import { UploadDialog } from '@/app/components/UploadDialog';

export function MusicLibrary() {
  const { user } = useAuth();
  const {
    folders: allFolders,
    musicFiles,
    isLoading: loadingStates,
    uploadMusicFile,
    uploadMusicBatch,
    deleteMusicFile,
    updateMusicFile,
    createFolder,
    deleteFolder,
    updateFolder,
    refreshFolders,
    refreshMusicFiles,
  } = useFiles();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCoverImage, setNewFolderCoverImage] = useState<File | null>(null);
  const [newFolderCoverPreview, setNewFolderCoverPreview] = useState<string | null>(null);
  const [coverArt, setCoverArt] = useState<Record<string, string | null>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<MusicTemplate | null>(null);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [uploadDestination, setUploadDestination] = useState<'music' | 'announcements'>('music');

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const isAdmin = user?.role === 'admin';

  // Filter folders to music type only
  const folders = allFolders.filter((f: Folder) => f.type === 'music');
  const isLoading = loadingStates.folders || loadingStates.musicFiles;
  
  const filteredFolders = folders;
  
  const displayedFiles = selectedFolder
    ? musicFiles.filter(f => f.folderId === selectedFolder)
    : musicFiles;

  const searchedFiles = searchQuery
    ? displayedFiles.filter((f) => {
        const name = f.name || f.title || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : displayedFiles;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const folderName = newFolderName.trim();
      await createFolder(folderName, 'music', newFolderCoverImage || undefined);

      setNewFolderName('');
      setNewFolderCoverImage(null);
      setNewFolderCoverPreview(null);
      setIsCreateFolderOpen(false);
      toast.success(`Folder "${folderName}" created`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
      console.error('Create folder error:', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setNewFolderCoverImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewFolderCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCoverImage = () => {
    setNewFolderCoverImage(null);
    setNewFolderCoverPreview(null);
  };

  const handleUpload = async (files: File[], folderId: string | null, type: 'music' | 'announcements') => {
    if (files.length === 0) return;

    // Limit to 20 files
    const filesToUpload = files.slice(0, 20);
    
    if (files.length > 20) {
      toast.warning(`Only the first 20 files will be uploaded (${files.length} selected)`);
    }

    setIsUploading(true);
    setUploadProgress(0);
    toast.info(`Uploading ${filesToUpload.length} file(s)...`);

    try {
      if (type === 'music') {
        const targetFolderId = folderId || undefined;
        const uploadedFiles = await uploadMusicBatch(
          filesToUpload,
          targetFolderId,
          (progress: number) => {
            setUploadProgress(Math.round(progress));
          }
        );

        if (uploadedFiles.length === 0) {
          toast.error('No files were uploaded. Please try again.');
        } else if (uploadedFiles.length < filesToUpload.length) {
          toast.warning(`Uploaded ${uploadedFiles.length} of ${filesToUpload.length} file(s).`);
        } else {
          toast.success(`Successfully uploaded ${uploadedFiles.length} file(s)`);
        }
      } else {
        // Handle announcements upload
        // TODO: Implement announcements upload API
        toast.info('Announcements upload will be implemented');
      }
      
      setIsUploadOpen(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || 'Upload failed';
      toast.error(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (fileId: string) => {
    const file = musicFiles.find(f => f.id === fileId);

    try {
      await deleteMusicFile(fileId);
      toast.success(`Deleted ${file?.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete file');
      console.error('Delete error:', error);
    }
  };

  const handlePlay = (fileId: string) => {
    if (playingTrack === fileId) {
      setPlayingTrack(null);
      toast.info('Playback stopped');
    } else {
      setPlayingTrack(fileId);
      const file = musicFiles.find(f => f.id === fileId);
      toast.success(`Playing ${file?.name}`);
    }
  };

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

  const handleTemplateSelect = async (template: MusicTemplate) => {
    try {
      setIsApplyingTemplate(true);

      // Create folders from template
      for (const folderData of template.folders) {
        try {
          await createFolder(folderData.name, 'music');
          toast.success(`Created folder: ${folderData.name}`);
        } catch (error: any) {
          toast.error(`Failed to create folder ${folderData.name}`, {
            description: error.message || 'Please try again'
          });
        }
      }

      setSelectedTemplate(template);
      setIsTemplateGalleryOpen(false);

      toast.success(`Template "${template.name}" applied successfully!`, {
        description: `${template.folders.length} folders created`
      });

    } catch (error: any) {
      toast.error('Failed to apply template', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading music library...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search music files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                  <DialogDescription>Create a new folder to organise your music</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input
                      id="folder-name"
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="folder-cover">Cover Image (Optional)</Label>
                    {newFolderCoverPreview ? (
                      <div className="relative">
                        <img
                          src={newFolderCoverPreview}
                          alt="Cover preview"
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveCoverImage}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="folder-cover"
                          accept="image/*"
                          onChange={handleCoverImageSelect}
                          className="hidden"
                        />
                        <label
                          htmlFor="folder-cover"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <Upload className="h-8 w-8 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            Click to upload cover image
                          </span>
                          <span className="text-xs text-slate-400">
                            PNG, JPG up to 5MB
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <Button onClick={handleCreateFolder} className="w-full" disabled={isCreatingFolder || !newFolderName.trim()}>
                    {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Temporary simple modal for testing */}
            {isUploadOpen && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}>
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  maxWidth: '500px',
                  width: '90%'
                }}>
                  <h3>Upload Dialog Test</h3>
                  <p>This is a simple test modal. If you see this, the state management is working!</p>
                  <p>Folders available: {filteredFolders.length}</p>
                  <p>Upload type: {uploadDestination}</p>
                  <button
                    onClick={() => setIsUploadOpen(false)}
                    style={{
                      padding: '10px 20px',
                      background: '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      marginTop: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Close Test Modal
                  </button>
                </div>
              </div>
            )}

            <UploadDialog
              open={isUploadOpen}
              onOpenChange={setIsUploadOpen}
              folders={filteredFolders.map(f => ({
                id: f.id,
                name: f.name,
                type: f.type,
              }))}
              uploadType={uploadDestination}
              allowTypeSelection={isAdmin}
              onTypeChange={(type) => setUploadDestination(type)}
              onUpload={handleUpload}
              onUploadComplete={async () => {
                // Refresh folders and files from centralized state after upload completes
                try {
                  await Promise.all([
                    refreshFolders(),
                    refreshMusicFiles()
                  ]);
                } catch (error) {
                  console.error('Failed to refresh after upload:', error);
                }
              }}
            />
            
            <Button onClick={() => {
              console.log('Upload button clicked, setting isUploadOpen to true');
              alert('Upload button clicked! Dialog should open now.');
              setIsUploadOpen(true);
            }}>
              <Upload className="h-4 w-4 mr-2" />
              Upload {isAdmin ? 'Content' : 'Music'}
            </Button>

            {/* Removed duplicate template dialog - templates gallery is shown inline below */}
          </div>
        </div>

        {/* Music Templates Gallery */}
        <MusicTemplatesGallery onUseTemplate={handleTemplateSelect} />

        <div className="grid grid-cols-12 gap-6">
          {/* Folders Sidebar */}
          <div className="col-span-12 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Folders</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto md:overflow-x-visible">
                <div className="flex md:flex-col gap-2 md:space-y-2 md:gap-0 min-w-max md:min-w-0">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className={`flex-shrink-0 md:w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedFolder === null ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100'
                    }`}
                  >
                    <FolderIcon className="h-5 w-5" />
                    <span className="flex-1 text-left whitespace-nowrap">All Music</span>
                    <Badge variant="secondary">{displayedFiles.length}</Badge>
                  </button>
                  {filteredFolders.map((folder) => {
                    const count = musicFiles.filter(f => f.folderId === folder.id).length;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => setSelectedFolder(folder.id)}
                        className={`flex-shrink-0 md:w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          selectedFolder === folder.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100'
                        }`}
                      >
                        {folder.cover_image_url ? (
                          <img
                            src={folder.cover_image_url}
                            alt={folder.name}
                            className="h-10 w-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <FolderIcon className="h-5 w-5 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-left whitespace-nowrap">{folder.name}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Music Files */}
          <div className="col-span-12 xl:col-span-9">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedFolder
                        ? filteredFolders.find(f => f.id === selectedFolder)?.name
                        : 'All Music'}
                    </CardTitle>
                    <CardDescription>
                      {searchedFiles.length} track{searchedFiles.length !== 1 ? 's' : ''} • Drag to reorder
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
                    <div className="text-center py-12 text-slate-500">
                      {searchQuery ? 'No music files match your search' : 'No music files in this folder'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}