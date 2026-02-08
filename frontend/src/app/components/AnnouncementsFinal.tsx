import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Settings } from 'lucide-react';
import { AnnouncementTemplatesGallery } from '@/app/components/AnnouncementTemplatesGallery';
import { AnnouncementsHeader } from './announcements/AnnouncementsHeader';
import { AnnouncementsFolderList } from './announcements/AnnouncementsFolderList';
import { AnnouncementsToolbar } from './announcements/AnnouncementsToolbar';
import { AnnouncementsListView } from './announcements/AnnouncementsListView';
import { AnnouncementsGridView } from './announcements/AnnouncementsGridView';
import { VoiceManagementDialog } from './announcements/VoiceManagementDialog';
import { FolderSettingsDialog } from './announcements/FolderSettingsDialog';
import { InstantPlayDialog } from './announcements/InstantPlayDialog';
import { FolderSettings } from './announcements/announcements.types';
import { usePlayback } from '@/lib/playback';
import { useAnnouncementsData } from './announcements/useAnnouncementsData';
import { announcementsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useAnnouncementDialogs } from './announcements/useAnnouncementDialogs';
import { useAnnouncementFormState } from './announcements/useAnnouncementFormState';
import { useAnnouncementHandlers } from './announcements/useAnnouncementHandlers';
import { useAnnouncementTemplates } from './announcements/useAnnouncementTemplates';
import { CreateAnnouncementDialog } from './announcements/CreateAnnouncementDialog';

export function AnnouncementsFinal() {
  const { user } = useAuth();
  const { activeTarget } = usePlayback();
  const uploadInputId = React.useId();
  
  // Data management hook
  const {
    scripts,
    setScripts,
    audioFiles,
    setAudioFiles,
    folders,
    setFolders,
    devices,
    ttsVoices,
    isLoading,
  } = useAnnouncementsData();
  
  // Dialog management hook
  const dialogs = useAnnouncementDialogs();
  
  // Form state hook
  const formState = useAnnouncementFormState();
  
  // UI state
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [announcementIcons, setAnnouncementIcons] = useState<Record<string, string | null>>({});
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  
  // Folder-level settings
  const [folderSettings, setFolderSettings] = useState<Record<string, FolderSettings>>({});
  
  // Set default voice when voices load - prioritize UK English (fable)
  React.useEffect(() => {
    if (ttsVoices.length > 0 && !formState.selectedVoice) {
      // Prefer fable (UK English) if available, otherwise use first voice
      const ukVoice = ttsVoices.find(v => v.id === 'fable');
      formState.setSelectedVoice(ukVoice?.id || ttsVoices[0].id);
    }
  }, [ttsVoices, formState.selectedVoice]);

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  
  // Filter folders by client first, then by zone
  let clientFilteredFolders = clientId ? folders.filter(f => f.clientId === clientId) : folders;
  const filteredFolders = activeTarget
    ? clientFilteredFolders.filter((f: any) => String(f.zoneId || '') === String(activeTarget || '') || f.zone === activeTarget)
    : clientFilteredFolders;
  
  // Apply client filter first
  const clientFilteredAudio = clientId
    ? audioFiles.filter(a => a.clientId === clientId)
    : audioFiles;
  
  // Filter by zone: Since folders are zone-specific, filter announcements by their folder's zone
  // If activeTarget is set, only show announcements in folders that belong to that zone
  const zoneFilteredAudio = activeTarget
    ? clientFilteredAudio.filter(a => {
        // Find the folder for this announcement
        const announcementFolder = folders.find(f => String(f.id) === String(a.folderId) || String(f.id) === String(a.category));
        // If announcement has a folder, check if folder belongs to active zone
        if (announcementFolder) {
          // Folders have zoneId - check if it matches activeTarget (convert to string for comparison)
          const folderZoneId = String(announcementFolder.zoneId || '');
          const activeZoneId = String(activeTarget || '');
          return folderZoneId === activeZoneId || announcementFolder.zone === activeTarget;
        }
        // If no folder, include it (backward compatibility)
        // But also check if announcement itself has zone info
        return String(a.zoneId || '') === String(activeTarget || '') || a.zone === activeTarget;
      })
    : clientFilteredAudio;
  
  // Filter audio by folder and search for display
  let displayedAudio = zoneFilteredAudio;
  
  // Filter by folder if selected (convert to string for comparison)
  if (selectedFolder) {
    const selectedFolderStr = String(selectedFolder);
    displayedAudio = displayedAudio.filter(a => 
      String(a.category || '') === selectedFolderStr || String(a.folderId || '') === selectedFolderStr
    );
  }

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

  // Get folder statistics (respects zone and client filtering)
  const getFolderStats = (folderId: string) => {
    const folderIdStr = String(folderId);
    // Use zoneFilteredAudio to ensure we only count announcements from the active zone
    let folderAnnouncements = zoneFilteredAudio.filter(a => 
      String(a.category || '') === folderIdStr || String(a.folderId || '') === folderIdStr
    );
    
    const enabled = folderAnnouncements.filter(a => a.enabled).length;
    const total = folderAnnouncements.length;
    const totalDuration = folderAnnouncements.reduce((sum, a) => sum + (a.duration || 0), 0);
    return { enabled, total, totalDuration };
  };
  
  // Get total count for "All Announcements" (respects zone and client filtering)
  const allAnnouncementsCount = clientFilteredAudio.length;

  // Handlers hook
  const handlers = useAnnouncementHandlers({
    user,
    audioFiles,
    setAudioFiles,
    folders,
    setFolders,
    scripts,
    setScripts,
    folderSettings,
    setFolderSettings,
    newFolderName: formState.newFolderName,
    setNewFolderName: formState.setNewFolderName,
    uploadFile: formState.uploadFile,
    setUploadFile: formState.setUploadFile,
    newTitle: formState.newTitle,
    setNewTitle: formState.setNewTitle,
    newText: formState.newText,
    setNewText: formState.setNewText,
    newCategory: formState.newCategory,
    setNewCategory: formState.setNewCategory,
    selectedVoice: formState.selectedVoice,
    aiTopic: formState.aiTopic,
    setAiTopic: formState.setAiTopic,
    aiTone: formState.aiTone,
    setAiTone: formState.setAiTone,
    aiKeyPoints: formState.aiKeyPoints,
    setAiKeyPoints: formState.setAiKeyPoints,
    aiQuantity: formState.aiQuantity,
    setAiQuantity: formState.setAiQuantity,
    generatedScripts: formState.generatedScripts,
    setGeneratedScripts: formState.setGeneratedScripts,
    setIsCreateOpen: dialogs.setIsCreateOpen,
    setIsCreateFolderOpen: dialogs.setIsCreateFolderOpen,
    setIsCreating: formState.setIsCreating,
    setIsUploading: formState.setIsUploading,
    setIsGenerating: formState.setIsGenerating,
    setIsCreatingFolder: formState.setIsCreatingFolder,
    activeTarget,
    playingAudio,
    setPlayingAudio,
    voiceDialogVoice: formState.voiceDialogVoice,
    setVoiceDialogVoice: formState.setVoiceDialogVoice,
    playVoiceDialogVoice: formState.playVoiceDialogVoice,
    setPlayVoiceDialogVoice: formState.setPlayVoiceDialogVoice,
    selectedAnnouncementForVoice: dialogs.selectedAnnouncementForVoice,
    setSelectedAnnouncementForVoice: dialogs.setSelectedAnnouncementForVoice,
    selectedAnnouncementForPlay: dialogs.selectedAnnouncementForPlay,
    setSelectedAnnouncementForPlay: dialogs.setSelectedAnnouncementForPlay,
    setIsVoiceDialogOpen: dialogs.setIsVoiceDialogOpen,
    setIsPlayVoiceDialogOpen: dialogs.setIsPlayVoiceDialogOpen,
    setIsRegeneratingVoice: formState.setIsRegeneratingVoice,
    setIsGeneratingForPlay: formState.setIsGeneratingForPlay,
    selectedAnnouncementForInstant: dialogs.selectedAnnouncementForInstant,
    setSelectedAnnouncementForInstant: dialogs.setSelectedAnnouncementForInstant,
    selectedDevices,
    setSelectedDevices,
    devices,
    setIsInstantOpen: dialogs.setIsInstantOpen,
    setIsSending: formState.setIsSending,
    selectedFolderForSettings: dialogs.selectedFolderForSettings,
    setSelectedFolderForSettings: dialogs.setSelectedFolderForSettings,
    setIsFolderSettingsOpen: dialogs.setIsFolderSettingsOpen,
    ttsVoices,
    previewingVoice,
    setPreviewingVoice,
    previewAudio,
    setPreviewAudio,
  });

  // Templates hook
  const templates = useAnnouncementTemplates({
    user,
    audioFiles,
    setAudioFiles,
    folders,
    setFolders,
    folderSettings,
    setFolderSettings,
    newCategory: formState.newCategory,
    setNewCategory: formState.setNewCategory,
    setIsCreateOpen: dialogs.setIsCreateOpen,
    setIsCreating: formState.setIsCreating,
    setNewTitle: formState.setNewTitle,
    setNewText: formState.setNewText,
    activeTarget,
  });

  const currentFolderSettings = dialogs.selectedFolderForSettings 
    ? folderSettings[dialogs.selectedFolderForSettings] 
    : null;

  const folderAnnouncementsForSettings = dialogs.selectedFolderForSettings
    ? audioFiles.filter(a => a.category === dialogs.selectedFolderForSettings || a.folderId === dialogs.selectedFolderForSettings)
    : [];

  const handleIconChange = async (id: string, url: string | null) => {
    // If URL is null, remove the cover art
    if (!url) {
      setAnnouncementIcons({ ...announcementIcons, [id]: null });
      // Optionally, could also update the announcement to remove coverArtUrl
      return;
    }

    // If it's a blob URL (from file selection), upload it
    if (url.startsWith('blob:')) {
      try {
        // Fetch the blob
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Convert blob to File
        const file = new File([blob], 'cover-art.jpg', { type: blob.type || 'image/jpeg' });
        
        // Upload to backend
        const result = await announcementsAPI.uploadCoverArt(id, file);
        
        // Update the announcement in state
        setAudioFiles(prev => prev.map(a => 
          a.id === id 
            ? { ...a, coverArtUrl: result.coverArtUrl }
            : a
        ));
        
        // Also update local icons state for immediate UI feedback
        setAnnouncementIcons({ ...announcementIcons, [id]: result.coverArtUrl });
        
        toast.success('Cover image uploaded successfully!');
      } catch (error: any) {
        toast.error(error.message || 'Failed to upload cover image');
        console.error('Upload cover art error:', error);
      }
    } else {
      // It's already a URL (from backend), just update local state
      setAnnouncementIcons({ ...announcementIcons, [id]: url });
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <AnnouncementsHeader
        onCreateClick={() => dialogs.setIsCreateOpen(true)}
        onInstantPlayClick={() => dialogs.setIsInstantOpen(true)}
        isCreateOpen={dialogs.isCreateOpen}
        isInstantOpen={dialogs.isInstantOpen}
        onCreateOpenChange={dialogs.setIsCreateOpen}
        onInstantOpenChange={dialogs.setIsInstantOpen}
        instantPlayDialog={
          <InstantPlayDialog
            open={dialogs.isInstantOpen}
            onOpenChange={dialogs.setIsInstantOpen}
            announcements={audioFiles}
            devices={availableDevices}
            selectedAnnouncement={dialogs.selectedAnnouncementForInstant}
            onAnnouncementChange={dialogs.setSelectedAnnouncementForInstant}
            selectedDevices={selectedDevices}
            onDevicesChange={setSelectedDevices}
            onSend={handlers.handleInstantAnnouncement}
            isSending={formState.isSending}
          />
        }
        createDialog={
          <CreateAnnouncementDialog
            folders={filteredFolders}
            ttsVoices={ttsVoices}
            selectedVoice={formState.selectedVoice}
            onVoiceChange={formState.setSelectedVoice}
            newTitle={formState.newTitle}
            onTitleChange={formState.setNewTitle}
            newText={formState.newText}
            onTextChange={formState.setNewText}
            newCategory={formState.newCategory}
            onCategoryChange={formState.setNewCategory}
            uploadFile={formState.uploadFile}
            onUploadFileChange={formState.setUploadFile}
            uploadInputId={uploadInputId}
            isCreating={formState.isCreating}
            isUploading={formState.isUploading}
            isGenerating={formState.isGenerating}
            aiTopic={formState.aiTopic}
            onAiTopicChange={formState.setAiTopic}
            aiTone={formState.aiTone}
            onAiToneChange={formState.setAiTone}
            aiKeyPoints={formState.aiKeyPoints}
            onAiKeyPointsChange={formState.setAiKeyPoints}
            aiQuantity={formState.aiQuantity}
            onAiQuantityChange={formState.setAiQuantity}
            generatedScripts={formState.generatedScripts}
            onGeneratedScriptsChange={formState.setGeneratedScripts}
            previewingVoice={previewingVoice}
            previewAudio={previewAudio}
            onPreviewVoice={handlers.handlePreviewVoice}
            onStopPreview={handlers.handleStopPreview}
            onCreateScript={handlers.handleCreateScript}
            onGenerateAI={handlers.handleGenerateAIScript}
            onCreateBulk={handlers.handleCreateBulkAnnouncements}
            onUpload={handlers.handleUploadAnnouncement}
            newFolderName={formState.newFolderName}
            onNewFolderNameChange={formState.setNewFolderName}
            onCreateFolder={handlers.handleCreateFolder}
            isCreatingFolder={formState.isCreatingFolder}
            activeTarget={activeTarget}
          />
        }
      />

      {/* Ready-Made Templates Gallery */}
      <AnnouncementTemplatesGallery
        onAnnouncementsCreated={templates.handleAnnouncementsCreated}
        onUseTemplate={templates.handleUseTemplate}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <AnnouncementsFolderList
          folders={filteredFolders}
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onFolderSettings={handlers.handleOpenFolderSettings}
          audioFiles={clientFilteredAudio}
          allAnnouncementsCount={allAnnouncementsCount}
          isCreateFolderOpen={dialogs.isCreateFolderOpen}
          onCreateFolderOpenChange={dialogs.setIsCreateFolderOpen}
          newFolderName={formState.newFolderName}
          onNewFolderNameChange={formState.setNewFolderName}
          onCreateFolder={handlers.handleCreateFolder}
          isCreatingFolder={formState.isCreatingFolder}
          getFolderStats={getFolderStats}
          folderSettings={folderSettings}
        />

        <div className="xl:col-span-3 space-y-4">
          <AnnouncementsToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterEnabled={filterEnabled}
            onFilterChange={setFilterEnabled}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Announcements */}
          <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-xl font-bold text-white">
                    {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : 'All Announcements'}
                  </CardTitle>
                  <CardDescription className="text-gray-400 mt-1.5">
                    {searchedAudio.length} announcement{searchedAudio.length !== 1 ? 's' : ''} 
                    {filterEnabled !== 'all' && ` (${filterEnabled})`}
                  </CardDescription>
                </div>
                {selectedFolder && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlers.handleOpenFolderSettings(selectedFolder)}
                    className="bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10 shadow-sm text-white"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Folder Settings
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'list' ? (
                <AnnouncementsListView
                  announcements={searchedAudio}
                  scripts={scripts}
                  folders={folders}
                  playingAudio={playingAudio}
                  onPlay={handlers.handlePlay}
                  onToggleEnabled={handlers.handleToggleEnabled}
                  onRegenerateVoice={handlers.handleRegenerateVoice}
                  onRecalculateDuration={handlers.handleRecalculateDuration}
                  onDelete={handlers.handleDelete}
                  announcementIcons={announcementIcons}
                  onIconChange={handleIconChange}
                  searchQuery={searchQuery}
                />
              ) : (
                <AnnouncementsGridView
                  announcements={searchedAudio}
                  folders={folders}
                  playingAudio={playingAudio}
                  onPlay={handlers.handlePlay}
                  onToggleEnabled={handlers.handleToggleEnabled}
                  onRegenerateVoice={handlers.handleRegenerateVoice}
                  onRecalculateDuration={handlers.handleRecalculateDuration}
                  onDelete={handlers.handleDelete}
                  announcementIcons={announcementIcons}
                  onIconChange={handleIconChange}
                  searchQuery={searchQuery}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FolderSettingsDialog
        open={dialogs.isFolderSettingsOpen}
        onOpenChange={dialogs.setIsFolderSettingsOpen}
        folderName={dialogs.selectedFolderForSettings ? folders.find(f => f.id === dialogs.selectedFolderForSettings)?.name || '' : ''}
        settings={currentFolderSettings}
        announcements={folderAnnouncementsForSettings}
        onSettingsChange={(settings) => {
          if (dialogs.selectedFolderForSettings) {
            setFolderSettings({
              ...folderSettings,
              [dialogs.selectedFolderForSettings]: settings,
            });
          }
        }}
        onSave={handlers.handleSaveFolderSettings}
      />

      <VoiceManagementDialog
        open={dialogs.isVoiceDialogOpen}
        onOpenChange={dialogs.setIsVoiceDialogOpen}
        selectedAnnouncementId={dialogs.selectedAnnouncementForVoice}
        announcementTitle={dialogs.selectedAnnouncementForVoice ? audioFiles.find(a => a.id === dialogs.selectedAnnouncementForVoice)?.title : undefined}
        hasAudio={dialogs.selectedAnnouncementForVoice ? !!(audioFiles.find(a => a.id === dialogs.selectedAnnouncementForVoice)?.url) : false}
        ttsVoices={ttsVoices}
        selectedVoice={formState.voiceDialogVoice}
        onVoiceChange={formState.setVoiceDialogVoice}
        onConfirm={handlers.handleConfirmVoiceRegeneration}
        isRegenerating={formState.isRegeneratingVoice}
      />

      {/* Voice Selection Dialog for Play */}
      <VoiceManagementDialog
        open={dialogs.isPlayVoiceDialogOpen}
        onOpenChange={dialogs.setIsPlayVoiceDialogOpen}
        selectedAnnouncementId={dialogs.selectedAnnouncementForPlay}
        announcementTitle={dialogs.selectedAnnouncementForPlay ? audioFiles.find(a => a.id === dialogs.selectedAnnouncementForPlay)?.title : undefined}
        hasAudio={false}
        ttsVoices={ttsVoices}
        selectedVoice={formState.playVoiceDialogVoice}
        onVoiceChange={formState.setPlayVoiceDialogVoice}
        onConfirm={handlers.handleConfirmPlayVoice}
        isRegenerating={formState.isGeneratingForPlay}
      />
    </div>
  );
}
