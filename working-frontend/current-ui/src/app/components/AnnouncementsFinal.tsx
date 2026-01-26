import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { announcementsAPI } from '@/lib/api';
import type { Folder } from '@/lib/types';
import { Radio, Plus, Play, Pause, Volume2, Mic, Upload, FileText, Trash2, MoreVertical, FolderPlus, Folder as FolderIcon, Clock, Search, Settings, List, Grid, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { ImageUpload } from '@/app/components/ImageUpload';
import { AnnouncementTemplatesGallery } from '@/app/components/AnnouncementTemplatesGallery';

interface FolderSettings {
  intervalMinutes: number;
  intervalSeconds: number;
  enabled: boolean;
  playlistMode: 'sequential' | 'random' | 'single';
  selectedAnnouncements: string[];
  preventOverlap: boolean;
}

export function AnnouncementsFinal() {
  const { user } = useAuth();
  const {
    folders: allFolders,
    announcements,
    devices,
    isLoading: loadingStates,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    createFolder,
    deleteFolder,
    updateFolder,
  } = useFiles();

  const [isLoading, setIsLoading] = useState(true);

  // Filter folders and announcements for announcements type
  const folders = allFolders.filter((f: Folder) => f.type === 'announcements');
  const scripts = announcements.filter((a: any) => a.is_tts || !a.file);
  const audioFiles = announcements.filter((a: any) => a.file);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(false); // Data is loaded by FilesProvider
    };

    loadData();
  }, [user]);

  const isLoadingCombined = isLoading || loadingStates.folders || loadingStates.announcements || loadingStates.devices;

  // Initialize folder settings when folders change
  useEffect(() => {
    const newSettings: Record<string, FolderSettings> = { ...folderSettings };
    let hasChanges = false;

    folders.forEach(folder => {
      if (!newSettings[folder.id]) {
        newSettings[folder.id] = {
          intervalMinutes: 30,
          intervalSeconds: 0,
          enabled: false,
          playlistMode: 'sequential',
          selectedAnnouncements: [],
          preventOverlap: true,
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setFolderSettings(newSettings);
    }
  }, [folders, folderSettings]);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInstantOpen, setIsInstantOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isFolderSettingsOpen, setIsFolderSettingsOpen] = useState(false);
  const [selectedFolderForSettings, setSelectedFolderForSettings] = useState<string | null>(null);
  const [announcementIcons, setAnnouncementIcons] = useState<Record<string, string | null>>({});
  const [isCreating, setIsCreating] = useState(false);
  // const [isUploading] = useState(false); // Not used
  const [isSending, setIsSending] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Folder-level settings
  const [folderSettings, setFolderSettings] = useState<Record<string, FolderSettings>>({});

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedAnnouncementForInstant, setSelectedAnnouncementForInstant] = useState('');

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const filteredFolders = clientId ? folders.filter(f => f.clientId === clientId) : folders;
  
  // Filter audio by folder and search
  let displayedAudio = selectedFolder
    ? audioFiles.filter(a => a.category === selectedFolder || a.folderId === selectedFolder)
    : clientId
    ? audioFiles.filter(a => a.clientId === clientId)
    : audioFiles;

  // Apply enabled filter
  if (filterEnabled === 'enabled') {
    displayedAudio = displayedAudio.filter(a => a.enabled);
  } else if (filterEnabled === 'disabled') {
    displayedAudio = displayedAudio.filter(a => !a.enabled);
  }

  const searchedAudio = searchQuery
    ? displayedAudio.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : displayedAudio;

  const availableDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;

  // Get folder statistics
  const getFolderStats = (folderId: string) => {
    const folderAnnouncements = audioFiles.filter(a => a.category === folderId || a.folderId === folderId);
    const enabled = folderAnnouncements.filter(a => a.enabled).length;
    const total = folderAnnouncements.length;
    const totalDuration = folderAnnouncements.reduce((sum, a) => sum + (a.duration || 0), 0);
    return { enabled, total, totalDuration };
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    setIsCreatingFolder(true);
    try {
      const newFolder = await createFolder(newFolderName, 'announcements');

      // Initialize default folder settings
      setFolderSettings({
        ...folderSettings,
        [newFolder.id]: {
          intervalMinutes: 30,
          intervalSeconds: 0,
          enabled: false,
          playlistMode: 'sequential',
          selectedAnnouncements: [],
          preventOverlap: true,
        }
      });

      setNewFolderName('');
      setIsCreateFolderOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
      console.error('Create folder error:', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateScript = async () => {
    if (!newTitle.trim() || !newText.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      await createAnnouncement({
        title: newTitle,
        content: newText,
        folderId: newCategory || undefined,
        isTts: true,
      });

      setNewTitle('');
      setNewText('');
      setNewCategory('');
      setIsCreateOpen(false);
      toast.success(`Created announcement: ${newTitle}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create announcement');
      console.error('Create announcement error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleEnabled = async (audioId: string) => {
    const audio = audioFiles.find(a => a.id === audioId);
    const newEnabled = !audio?.enabled;

    try {
      await updateAnnouncement(audioId, { enabled: newEnabled });
      toast.success(`${newEnabled ? 'Enabled' : 'Disabled'} ${audio?.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update announcement');
      console.error('Toggle enabled error:', error);
    }
  };

  const handleDelete = async (audioId: string) => {
    const audio = audioFiles.find(a => a.id === audioId);

    try {
      await deleteAnnouncement(audioId);
      toast.success(`Deleted ${audio?.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement');
      console.error('Delete error:', error);
    }
  };

  const handlePlay = (audioId: string) => {
    if (playingAudio === audioId) {
      setPlayingAudio(null);
      toast.info('Playback stopped');
    } else {
      setPlayingAudio(audioId);
      const audio = audioFiles.find(a => a.id === audioId);
      toast.success(`Playing ${audio?.title}`);
    }
  };

  const handleInstantAnnouncement = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Please select at least one device');
      return;
    }

    if (!selectedAnnouncementForInstant) {
      toast.error('Please select an announcement');
      return;
    }

    setIsSending(true);
    try {
      const targetZoneIds = Array.from(
        new Set(
          selectedDevices
            .map((deviceId) => devices.find((d: any) => d.id === deviceId)?.zoneId)
            .filter(Boolean)
        )
      ) as string[];
      await announcementsAPI.playInstantAnnouncement(selectedAnnouncementForInstant, targetZoneIds);

      const deviceNames = selectedDevices.map(id => 
        devices.find(d => d.id === id)?.name
      ).join(', ');

      const announcement = audioFiles.find(a => a.id === selectedAnnouncementForInstant);
      toast.success(`Playing "${announcement?.title}" on: ${deviceNames}`);
      setIsInstantOpen(false);
      setSelectedDevices([]);
      setSelectedAnnouncementForInstant('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send announcement');
      console.error('Instant announcement error:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenFolderSettings = (folderId: string) => {
    setSelectedFolderForSettings(folderId);
    
    // Load existing settings or create defaults
    if (!folderSettings[folderId]) {
      const folderAnnouncements = audioFiles.filter(a => a.category === folderId || a.folderId === folderId);
      setFolderSettings({
        ...folderSettings,
        [folderId]: {
          intervalMinutes: 30,
          intervalSeconds: 0,
          enabled: false,
          playlistMode: 'sequential',
          selectedAnnouncements: folderAnnouncements.map(a => a.id),
          preventOverlap: true,
        }
      });
    }
    
    setIsFolderSettingsOpen(true);
  };

  const handleSaveFolderSettings = async () => {
    if (!selectedFolderForSettings) return;

    const folder = folders.find(f => f.id === selectedFolderForSettings);
    
    try {
      // TODO: Save to backend
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success(`Saved settings for "${folder?.name}"`);
      setIsFolderSettingsOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save folder settings');
    }
  };

  const toggleAnnouncementInPlaylist = (folderId: string, announcementId: string) => {
    const settings = folderSettings[folderId] || {
      intervalMinutes: 30,
      intervalSeconds: 0,
      enabled: false,
      playlistMode: 'sequential',
      selectedAnnouncements: [],
      preventOverlap: true,
    };

    const isSelected = settings.selectedAnnouncements.includes(announcementId);
    const newSelected = isSelected
      ? settings.selectedAnnouncements.filter(id => id !== announcementId)
      : [...settings.selectedAnnouncements, announcementId];

    setFolderSettings({
      ...folderSettings,
      [folderId]: {
        ...settings,
        selectedAnnouncements: newSelected,
      }
    });
  };

  const currentFolderSettings = selectedFolderForSettings 
    ? folderSettings[selectedFolderForSettings] 
    : null;

  const folderAnnouncementsForSettings = selectedFolderForSettings
    ? audioFiles.filter(a => a.category === selectedFolderForSettings || a.folderId === selectedFolderForSettings)
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Announcements Studio</h2>
          <p className="text-slate-600">Manage announcement folders, playlists, and scheduling intervals</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Dialog open={isInstantOpen} onOpenChange={setIsInstantOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Volume2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Instant Play</span>
                <span className="sm:hidden">Play</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Play Instant Announcement</DialogTitle>
                <DialogDescription>
                  Trigger an announcement to play immediately on selected devices (ducks music automatically)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Announcement</Label>
                  <Select value={selectedAnnouncementForInstant} onValueChange={setSelectedAnnouncementForInstant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose announcement" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioFiles.filter(a => a.enabled).map(audio => (
                        <SelectItem key={audio.id} value={audio.id}>
                          {audio.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Devices</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                    {availableDevices.map(device => (
                      <label key={device.id} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(device.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDevices([...selectedDevices, device.id]);
                            } else {
                              setSelectedDevices(selectedDevices.filter(id => id !== device.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span>{device.name}</span>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="ml-auto">
                          {device.status}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                <Button onClick={handleInstantAnnouncement} className="w-full" disabled={isSending}>
                  <Volume2 className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send Now'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>Create announcements with text-to-speech, upload, or record</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="script" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="script">
                    <FileText className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Script</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Upload</span>
                  </TabsTrigger>
                  <TabsTrigger value="record">
                    <Mic className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Record</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="script" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Announcement title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Script Text</Label>
                    <Textarea
                      placeholder="Enter the announcement text here..."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      rows={6}
                    />
                    <p className="text-sm text-slate-500">
                      Approx. {Math.ceil(newText.length / 10)} seconds when spoken
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Folder</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredFolders.map(folder => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateScript} className="w-full" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Announcement'}
                  </Button>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Announcement title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Upload Audio File</Label>
                    <Input type="file" accept="audio/mp3,audio/wav,audio/m4a" />
                    <p className="text-xs text-slate-500">Supported formats: MP3, WAV, M4A (max 10MB)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Folder</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredFolders.map(folder => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </TabsContent>

                <TabsContent value="record" className="space-y-4">
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <Mic className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500 mb-4">Click to start recording</p>
                    <Button variant="outline" size="lg" className="rounded-full">
                      <Mic className="h-5 w-5 mr-2" />
                      Start Recording
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Ready-Made Templates Gallery */}
      <AnnouncementTemplatesGallery
        onUseTemplate={async (template) => {
          try {
            setIsCreating(true);

            // Create announcement from template using centralized method
            await createAnnouncement({
              title: template.title,
              content: template.script,
              folderId: selectedFolder || undefined,
              isTts: true,
            });

            toast.success(`Created announcement "${template.title}" from template!`, {
              description: 'TTS generation will begin shortly'
            });

          } catch (error: any) {
            toast.error('Failed to create announcement from template', {
              description: error.message || 'Please try again'
            });
          } finally {
            setIsCreating(false);
          }
        }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Folders Sidebar */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Folders</CardTitle>
              <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Folder</DialogTitle>
                    <DialogDescription>Organize your announcements with folder-level playlist settings</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                    <Button onClick={handleCreateFolder} className="w-full" disabled={isCreatingFolder}>
                      {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto md:overflow-x-visible">
            <div className="flex md:flex-col gap-2 md:space-y-2 md:gap-0 min-w-max md:min-w-0">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`flex-shrink-0 md:w-full flex items-center gap-3 p-3 rounded-lg transition-colors min-h-[44px] ${
                  selectedFolder === null ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100'
                }`}
              >
                <FolderIcon className="h-5 w-5 shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium">All</div>
                  <div className="text-sm font-medium">Announcements</div>
                </div>
                <Badge variant="secondary" className="shrink-0">{audioFiles.length}</Badge>
              </button>
              {filteredFolders.map((folder) => {
                const stats = getFolderStats(folder.id);
                const settings = folderSettings[folder.id];
                return (
                  <div key={folder.id} className="flex-shrink-0 md:w-full">
                    <div
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors min-h-[44px] cursor-pointer ${
                        selectedFolder === folder.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div 
                        onClick={() => setSelectedFolder(folder.id)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <FolderIcon className="h-5 w-5 shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">{folder.name}</span>
                            {settings?.enabled && (
                              <Badge variant="default" className="shrink-0">
                                <Clock className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {stats.enabled}/{stats.total} enabled
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFolderSettings(folder.id);
                        }}
                        className="shrink-0"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Announcements List */}
        <div className="xl:col-span-3 space-y-4">
          {/* Toolbar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filterEnabled} onValueChange={(v: any) => setFilterEnabled(v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex border rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-none"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : 'All Announcements'}
                  </CardTitle>
                  <CardDescription>
                    {searchedAudio.length} announcement{searchedAudio.length !== 1 ? 's' : ''} 
                    {filterEnabled !== 'all' && ` (${filterEnabled})`}
                  </CardDescription>
                </div>
                {selectedFolder && (
                  <Button variant="outline" size="sm" onClick={() => handleOpenFolderSettings(selectedFolder)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Folder Settings
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {searchedAudio.map((audio) => {
                    const script = scripts.find(s => s.id === audio.scriptId);
                    return (
                      <div
                        key={audio.id}
                        className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-slate-50 rounded-lg"
                      >
                        <ImageUpload
                          currentImage={announcementIcons[audio.id] || undefined}
                          onImageChange={(url) => setAnnouncementIcons({ ...announcementIcons, [audio.id]: url })}
                          variant="icon"
                        />

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between flex-1 gap-4 w-full">
                          <div className="flex items-start md:items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
                            <Button
                              size="sm"
                              variant={playingAudio === audio.id ? 'default' : 'outline'}
                              onClick={() => handlePlay(audio.id)}
                              className="shrink-0"
                            >
                              {playingAudio === audio.id ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Radio className="h-5 w-5 text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{audio.title}</p>
                                {audio.category && (
                                  <Badge variant="outline" className="shrink-0">
                                    {folders.find(f => f.id === audio.category)?.name || audio.category}
                                  </Badge>
                                )}
                                <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'} className="shrink-0">
                                  {audio.type.toUpperCase()}
                                </Badge>
                              </div>
                              {script && (
                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{script.text}</p>
                              )}
                              <p className="text-sm text-slate-500 mt-1">
                                Duration: {formatDuration(audio.duration)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`enabled-${audio.id}`} className="text-sm">
                                Enabled
                              </Label>
                              <Switch
                                id={`enabled-${audio.id}`}
                                checked={audio.enabled}
                                onCheckedChange={() => handleToggleEnabled(audio.id)}
                              />
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDelete(audio.id)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {searchedAudio.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      {searchQuery ? 'No announcements found matching your search' : 'No announcements in this folder'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchedAudio.map((audio) => {
                    return (
                      <Card key={audio.id} className="overflow-hidden">
                        <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 relative">
                          <ImageUpload
                            currentImage={announcementIcons[audio.id] || undefined}
                            onImageChange={(url) => setAnnouncementIcons({ ...announcementIcons, [audio.id]: url })}
                            variant="icon"
                          />
                          <Button
                            size="sm"
                            variant={playingAudio === audio.id ? 'default' : 'outline'}
                            onClick={() => handlePlay(audio.id)}
                            className="absolute bottom-2 right-2"
                          >
                            {playingAudio === audio.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <p className="font-medium truncate">{audio.title}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'} className="shrink-0">
                                {audio.type.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="shrink-0">
                                {formatDuration(audio.duration)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <Switch
                                checked={audio.enabled}
                                onCheckedChange={() => handleToggleEnabled(audio.id)}
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleDelete(audio.id)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {searchedAudio.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                      {searchQuery ? 'No announcements found matching your search' : 'No announcements in this folder'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Folder Settings Dialog */}
      <Dialog open={isFolderSettingsOpen} onOpenChange={setIsFolderSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Folder Settings: {selectedFolderForSettings && folders.find(f => f.id === selectedFolderForSettings)?.name}
            </DialogTitle>
            <DialogDescription>
              Configure playlist intervals and playback order. Announcements will automatically duck music.
            </DialogDescription>
          </DialogHeader>
          
          {currentFolderSettings && (
            <div className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-base">Enable Automatic Playlist</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Play announcements from this folder on a schedule
                  </p>
                </div>
                <Switch
                  checked={currentFolderSettings.enabled}
                  onCheckedChange={(checked) => {
                    if (selectedFolderForSettings) {
                      setFolderSettings({
                        ...folderSettings,
                        [selectedFolderForSettings]: {
                          ...currentFolderSettings,
                          enabled: checked,
                        }
                      });
                    }
                  }}
                />
              </div>

              {currentFolderSettings.enabled && (
                <>
                  {/* Interval */}
                  <div className="space-y-3">
                    <Label className="text-base">Playback Interval</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Minutes</Label>
                        <Input
                          type="number"
                          min="0"
                          max="1440"
                          value={currentFolderSettings.intervalMinutes}
                          onChange={(e) => {
                            if (selectedFolderForSettings) {
                              setFolderSettings({
                                ...folderSettings,
                                [selectedFolderForSettings]: {
                                  ...currentFolderSettings,
                                  intervalMinutes: Math.max(0, parseInt(e.target.value) || 0),
                                }
                              });
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                      <span className="text-2xl font-bold pt-4">:</span>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Seconds</Label>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={currentFolderSettings.intervalSeconds}
                          onChange={(e) => {
                            if (selectedFolderForSettings) {
                              setFolderSettings({
                                ...folderSettings,
                                [selectedFolderForSettings]: {
                                  ...currentFolderSettings,
                                  intervalSeconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                                }
                              });
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Total interval: {currentFolderSettings.intervalMinutes * 60 + currentFolderSettings.intervalSeconds} seconds between announcements
                    </p>
                  </div>

                  {/* Playlist Mode */}
                  <div className="space-y-3">
                    <Label className="text-base">Playlist Mode</Label>
                    <Select
                      value={currentFolderSettings.playlistMode}
                      onValueChange={(value: any) => {
                        if (selectedFolderForSettings) {
                          setFolderSettings({
                            ...folderSettings,
                            [selectedFolderForSettings]: {
                              ...currentFolderSettings,
                              playlistMode: value,
                            }
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">Sequential (Play in order)</SelectItem>
                        <SelectItem value="random">Random (Shuffle)</SelectItem>
                        <SelectItem value="single">Single (Rotate one at a time)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prevent Overlap */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <Label className="text-base">Prevent Overlap</Label>
                      <p className="text-sm text-blue-700 mt-1">
                        Never play announcements over each other (recommended)
                      </p>
                    </div>
                    <Switch
                      checked={currentFolderSettings.preventOverlap}
                      onCheckedChange={(checked) => {
                        if (selectedFolderForSettings) {
                          setFolderSettings({
                            ...folderSettings,
                            [selectedFolderForSettings]: {
                              ...currentFolderSettings,
                              preventOverlap: checked,
                            }
                          });
                        }
                      }}
                    />
                  </div>

                  {/* Announcement Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Select Announcements for Playlist</Label>
                      <Badge variant="secondary">
                        {currentFolderSettings.selectedAnnouncements.length} selected
                      </Badge>
                    </div>
                    <div className="border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                      {folderAnnouncementsForSettings.map((audio) => (
                        <label
                          key={audio.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer min-h-[44px]"
                        >
                          <input
                            type="checkbox"
                            checked={currentFolderSettings.selectedAnnouncements.includes(audio.id)}
                            onChange={() => selectedFolderForSettings && toggleAnnouncementInPlaylist(selectedFolderForSettings, audio.id)}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{audio.title}</p>
                            <p className="text-xs text-slate-500">{formatDuration(audio.duration)}</p>
                          </div>
                          {audio.enabled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <Badge variant="secondary" className="shrink-0">Disabled</Badge>
                          )}
                        </label>
                      ))}
                      {folderAnnouncementsForSettings.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">
                          No announcements in this folder
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-900">
                      <strong>Summary:</strong> Will play {currentFolderSettings.selectedAnnouncements.length} announcements 
                      in <strong>{currentFolderSettings.playlistMode}</strong> order, every{' '}
                      <strong>{currentFolderSettings.intervalMinutes}m {currentFolderSettings.intervalSeconds}s</strong>.
                      Music will automatically duck during playback.
                      {currentFolderSettings.preventOverlap && ' Overlap prevention is active.'}
                    </p>
                  </div>
                </>
              )}

              <Button onClick={handleSaveFolderSettings} className="w-full">
                Save Folder Settings
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}