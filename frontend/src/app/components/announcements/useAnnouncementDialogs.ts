import { useState } from 'react';

export function useAnnouncementDialogs() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInstantOpen, setIsInstantOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isFolderSettingsOpen, setIsFolderSettingsOpen] = useState(false);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [isPlayVoiceDialogOpen, setIsPlayVoiceDialogOpen] = useState(false);
  const [selectedFolderForSettings, setSelectedFolderForSettings] = useState<string | null>(null);
  const [selectedAnnouncementForVoice, setSelectedAnnouncementForVoice] = useState<string | null>(null);
  const [selectedAnnouncementForPlay, setSelectedAnnouncementForPlay] = useState<string | null>(null);
  const [selectedAnnouncementForInstant, setSelectedAnnouncementForInstant] = useState('');

  const handleOpenFolderSettings = (folderId: string) => {
    setSelectedFolderForSettings(folderId);
    setIsFolderSettingsOpen(true);
  };

  return {
    // Dialog states
    isCreateOpen,
    setIsCreateOpen,
    isInstantOpen,
    setIsInstantOpen,
    isCreateFolderOpen,
    setIsCreateFolderOpen,
    isFolderSettingsOpen,
    setIsFolderSettingsOpen,
    isVoiceDialogOpen,
    setIsVoiceDialogOpen,
    isPlayVoiceDialogOpen,
    setIsPlayVoiceDialogOpen,
    
    // Selected items
    selectedFolderForSettings,
    setSelectedFolderForSettings,
    selectedAnnouncementForVoice,
    setSelectedAnnouncementForVoice,
    selectedAnnouncementForPlay,
    setSelectedAnnouncementForPlay,
    selectedAnnouncementForInstant,
    setSelectedAnnouncementForInstant,
    
    // Handlers
    handleOpenFolderSettings,
  };
}






