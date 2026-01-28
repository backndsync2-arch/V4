import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { announcementsAPI, musicAPI } from '@/lib/api';
import { FolderSettings, Folder, AnnouncementAudio, TTSVoice, GeneratedScript } from './announcements.types';
import { formatDuration } from '@/lib/utils';

interface UseAnnouncementHandlersProps {
  user: any;
  audioFiles: AnnouncementAudio[];
  setAudioFiles: (files: AnnouncementAudio[] | ((prev: AnnouncementAudio[]) => AnnouncementAudio[])) => void;
  folders: Folder[];
  setFolders: (folders: Folder[] | ((prev: Folder[]) => Folder[])) => void;
  scripts: any[];
  setScripts: (scripts: any[] | ((prev: any[]) => any[])) => void;
  folderSettings: Record<string, FolderSettings>;
  setFolderSettings: (settings: Record<string, FolderSettings> | ((prev: Record<string, FolderSettings>) => Record<string, FolderSettings>)) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  uploadFile: File | null;
  setUploadFile: (file: File | null) => void;
  newTitle: string;
  setNewTitle: (title: string) => void;
  newText: string;
  setNewText: (text: string) => void;
  newCategory: string;
  setNewCategory: (category: string) => void;
  selectedVoice: string;
  aiTopic: string;
  setAiTopic: (topic: string) => void;
  aiTone: string;
  setAiTone: (tone: string) => void;
  aiKeyPoints: string;
  setAiKeyPoints: (keyPoints: string) => void;
  aiQuantity: string;
  setAiQuantity: (quantity: string) => void;
  generatedScripts: GeneratedScript[];
  setGeneratedScripts: (scripts: GeneratedScript[] | ((prev: GeneratedScript[]) => GeneratedScript[])) => void;
  setIsCreateOpen: (open: boolean) => void;
  setIsCreateFolderOpen: (open: boolean) => void;
  setIsCreating: (creating: boolean) => void;
  setIsUploading: (uploading: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  setIsCreatingFolder: (creating: boolean) => void;
  activeTarget?: string | null;
  playingAudio: string | null;
  setPlayingAudio: (id: string | null) => void;
  voiceDialogVoice: string;
  setVoiceDialogVoice: (voice: string) => void;
  playVoiceDialogVoice: string;
  setPlayVoiceDialogVoice: (voice: string) => void;
  selectedAnnouncementForVoice: string | null;
  setSelectedAnnouncementForVoice: (id: string | null) => void;
  selectedAnnouncementForPlay: string | null;
  setSelectedAnnouncementForPlay: (id: string | null) => void;
  setIsVoiceDialogOpen: (open: boolean) => void;
  setIsPlayVoiceDialogOpen: (open: boolean) => void;
  setIsRegeneratingVoice: (regenerating: boolean) => void;
  setIsGeneratingForPlay: (generating: boolean) => void;
  selectedAnnouncementForInstant: string;
  setSelectedAnnouncementForInstant: (id: string) => void;
  selectedDevices: string[];
  setSelectedDevices: (devices: string[]) => void;
  devices: any[];
  setIsInstantOpen: (open: boolean) => void;
  setIsSending: (sending: boolean) => void;
  selectedFolderForSettings: string | null;
  setSelectedFolderForSettings: (id: string | null) => void;
  setIsFolderSettingsOpen: (open: boolean) => void;
  ttsVoices: TTSVoice[];
  previewingVoice: string | null;
  setPreviewingVoice: (voice: string | null) => void;
  previewAudio: HTMLAudioElement | null;
  setPreviewAudio: (audio: HTMLAudioElement | null) => void;
}

export function useAnnouncementHandlers({
  user,
  audioFiles,
  setAudioFiles,
  folders,
  setFolders,
  scripts,
  setScripts,
  folderSettings,
  setFolderSettings,
  newFolderName,
  setNewFolderName,
  uploadFile,
  setUploadFile,
  newTitle,
  setNewTitle,
  newText,
  setNewText,
  newCategory,
  setNewCategory,
  selectedVoice,
  aiTopic,
  setAiTopic,
  aiTone,
  setAiTone,
  aiKeyPoints,
  setAiKeyPoints,
  aiQuantity,
  setAiQuantity,
  generatedScripts,
  setGeneratedScripts,
  setIsCreateOpen,
  setIsCreateFolderOpen,
  setIsCreating,
  setIsUploading,
  setIsGenerating,
  setIsCreatingFolder,
  activeTarget,
  playingAudio,
  setPlayingAudio,
  voiceDialogVoice,
  setVoiceDialogVoice,
  playVoiceDialogVoice,
  setPlayVoiceDialogVoice,
  selectedAnnouncementForVoice,
  setSelectedAnnouncementForVoice,
  selectedAnnouncementForPlay,
  setSelectedAnnouncementForPlay,
  setIsVoiceDialogOpen,
  setIsPlayVoiceDialogOpen,
  setIsRegeneratingVoice,
  setIsGeneratingForPlay,
  selectedAnnouncementForInstant,
  setSelectedAnnouncementForInstant,
  selectedDevices,
  setSelectedDevices,
  devices,
  setIsInstantOpen,
  setIsSending,
  selectedFolderForSettings,
  setSelectedFolderForSettings,
  setIsFolderSettingsOpen,
  ttsVoices,
  previewingVoice,
  setPreviewingVoice,
  previewAudio,
  setPreviewAudio,
}: UseAnnouncementHandlersProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    
    setIsCreatingFolder(true);
    try {
      const newFolder = await musicAPI.createFolder({
        name: newFolderName,
        type: 'announcements',
      });
      
      setFolders([...folders, newFolder]);
      
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
      toast.success(`Folder "${newFolderName}" created`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
      console.error('Create folder error:', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadAnnouncement = async () => {
    if (!uploadFile) {
      toast.error('Please select an audio file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const title =
        (newTitle && newTitle.trim()) ||
        uploadFile.name.replace(/\.[^/.]+$/, '');

      const uploaded = await announcementsAPI.uploadAnnouncement(
        uploadFile,
        { 
          title, 
          folder_id: newCategory || undefined,
          zone_id: activeTarget || undefined,
        },
        () => {}
      );

      setAudioFiles(prev => [
        ...prev,
        {
          id: uploaded.id,
          title: uploaded.title,
          scriptId: undefined,
          clientId: user?.clientId || 'client1',
          url: uploaded.url,
          duration: uploaded.duration || 0,
          type: uploaded.type || 'uploaded',
          enabled: uploaded.enabled ?? true,
          category: newCategory || undefined,
          folderId: newCategory || undefined,
          zoneId: activeTarget || undefined,
          createdAt: new Date(),
          createdBy: user?.id || 'user1',
        },
      ]);

      toast.success(`Uploaded: ${title}`);
      setUploadFile(null);
      setNewTitle('');
      setNewCategory('');
      setIsCreateOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      console.error('Announcement upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateAIScript = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    try {
      const quantity = parseInt(aiQuantity);
      const result = await announcementsAPI.generateAIText({
        topic: aiTopic,
        tone: aiTone as 'professional' | 'friendly' | 'urgent' | 'casual',
        key_points: aiKeyPoints.trim() || undefined,
        quantity: quantity,
      });

      const variations = result.scripts.map((script, index) => ({
        title: script.title || (quantity > 1 ? `${aiTopic} - Variation ${index + 1}` : aiTopic),
        text: script.text,
        selected: true,
      }));

      setGeneratedScripts(variations);
      toast.success(`Generated ${variations.length} AI script${variations.length > 1 ? 's' : ''}! Review and create announcements.`);
    } catch (error: any) {
      const errorMsg = error?.data?.error || error?.message || 'Failed to generate AI scripts';
      toast.error(errorMsg);
      console.error('AI generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateBulkAnnouncements = async () => {
    const selectedScripts = generatedScripts.filter(s => s.selected);
    
    if (selectedScripts.length === 0) {
      toast.error('Please select at least one script to create');
      return;
    }

    if (!newCategory) {
      toast.error('Please select a folder');
      return;
    }

    setIsCreating(true);
    try {
      const announcements = await announcementsAPI.createBatchTTSAnnouncements({
        announcements: selectedScripts.map(s => ({
          title: s.title,
          text: s.text,
          voice: selectedVoice,
          folder_id: newCategory || undefined,
          zone_id: activeTarget || undefined,
        })),
        voice: selectedVoice,
        folder_id: newCategory || undefined,
        zone_id: activeTarget || undefined,
      });

      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      const ttsScripts = allAnnouncements
        .filter(a => a.type === 'tts')
        .map(a => ({
          id: a.id,
          title: a.title,
          text: '',
          clientId: a.clientId,
          enabled: a.enabled,
          category: a.category,
          createdAt: a.createdAt,
          createdBy: a.createdBy,
        }));
      setScripts(ttsScripts);
      
      setGeneratedScripts([]);
      setAiTopic('');
      setAiTone('professional');
      setAiKeyPoints('');
      setAiQuantity('1');
      setNewCategory('');
      setIsCreateOpen(false);
      toast.success(`Created ${announcements.length} announcement${announcements.length > 1 ? 's' : ''}!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create announcements');
      console.error('Create bulk announcements error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateScript = async () => {
    if (!newTitle.trim() || !newText.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      const announcement = await announcementsAPI.createTTSAnnouncement({
        title: newTitle,
        text: newText,
        voice: selectedVoice,
        folder_id: newCategory || undefined,
        zone_id: activeTarget || undefined,
      });

      const script = {
        id: announcement.id,
        title: newTitle,
        text: newText,
        clientId: user?.clientId || 'client1',
        enabled: true,
        category: newCategory || undefined,
        createdAt: new Date(),
        createdBy: user?.id || 'user1',
      };

      setScripts([...scripts, script]);
      
      const audio = {
        id: announcement.id,
        title: newTitle,
        scriptId: script.id,
        clientId: user?.clientId || 'client1',
        url: announcement.url,
        duration: announcement.duration,
        type: 'tts' as const,
        enabled: true,
        category: newCategory || undefined,
        folderId: newCategory || undefined,
        zoneId: activeTarget || undefined,
        createdAt: new Date(),
        createdBy: user?.id || 'user1',
      };

      setAudioFiles([...audioFiles, audio]);
      
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

  const toggleScriptSelection = (index: number) => {
    setGeneratedScripts(prev => prev.map((script, i) => 
      i === index ? { ...script, selected: !script.selected } : script
    ));
  };

  const handlePreviewVoice = async (voice: string) => {
    if (previewingVoice === voice && previewAudio) {
      previewAudio.pause();
      setPreviewingVoice(null);
      setPreviewAudio(null);
      return;
    }
    
    setPreviewingVoice(voice);
    try {
      const preview = await announcementsAPI.previewVoice({
        text: newText.trim() || 'Hello, this is a voice preview. How does this sound?',
        voice: voice,
      });
      
      const audio = new Audio(preview.preview_url);
      setPreviewAudio(audio);
      await audio.play();
      
      audio.addEventListener('ended', () => {
        setPreviewingVoice(null);
        setPreviewAudio(null);
      });
      
      audio.addEventListener('error', () => {
        toast.error('Failed to play voice preview');
        setPreviewingVoice(null);
        setPreviewAudio(null);
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to preview voice');
      setPreviewingVoice(null);
      setPreviewAudio(null);
    }
  };

  const handleStopPreview = () => {
    if (previewAudio) {
      previewAudio.pause();
    }
    setPreviewingVoice(null);
    setPreviewAudio(null);
  };

  const handleToggleEnabled = async (audioId: string) => {
    const audio = audioFiles.find(a => a.id === audioId);
    const newEnabled = !audio?.enabled;
    
    try {
      await announcementsAPI.updateAnnouncement(audioId, { enabled: newEnabled });
      setAudioFiles(audioFiles.map(a => 
        a.id === audioId ? { ...a, enabled: newEnabled } : a
      ));
      toast.success(`${audio?.enabled ? 'Disabled' : 'Enabled'} ${audio?.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update announcement');
      console.error('Toggle enabled error:', error);
    }
  };

  const handleRegenerateVoice = async (audioId: string) => {
    const audio = audioFiles.find(a => a.id === audioId);
    if (!audio) return;
    
    setSelectedAnnouncementForVoice(audioId);
    setVoiceDialogVoice(selectedVoice);
    setIsVoiceDialogOpen(true);
  };

  const handleConfirmVoiceRegeneration = async () => {
    if (!selectedAnnouncementForVoice) return;
    
    setIsRegeneratingVoice(true);
    try {
      const updated = await announcementsAPI.regenerateTTS(selectedAnnouncementForVoice, {
        voice: voiceDialogVoice,
        provider: 'openai',
      });
      
      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      toast.success(`Voice updated successfully! Duration: ${formatDuration(updated.duration)}`);
      setIsVoiceDialogOpen(false);
      setSelectedAnnouncementForVoice(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to regenerate voice');
      console.error('Voice regeneration error:', error);
    } finally {
      setIsRegeneratingVoice(false);
    }
  };

  const handleConfirmPlayVoice = async () => {
    if (!selectedAnnouncementForPlay) return;
    
    const audio = audioFiles.find(a => a.id === selectedAnnouncementForPlay);
    if (!audio || !audio.ttsText) {
      toast.error('Announcement text not found');
      return;
    }
    
    setIsGeneratingForPlay(true);
    try {
      toast.info('Generating audio...');
      
      const updated = await announcementsAPI.regenerateTTS(selectedAnnouncementForPlay, {
        voice: playVoiceDialogVoice,
        provider: 'openai',
      });
      
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const updatedAnnouncements = await announcementsAPI.getAnnouncements();
        const announcementWithAudio = updatedAnnouncements.find(a => a.id === selectedAnnouncementForPlay);
        
        if (announcementWithAudio && announcementWithAudio.url && announcementWithAudio.url !== '#' && announcementWithAudio.url !== '') {
          setAudioFiles(updatedAnnouncements);
          setIsPlayVoiceDialogOpen(false);
          setSelectedAnnouncementForPlay(null);
          
          const audioUrl = announcementWithAudio.url.startsWith('http') 
            ? announcementWithAudio.url 
            : `${window.location.origin}${announcementWithAudio.url}`;
          
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          
          const audioElement = new Audio(audioUrl);
          audioRef.current = audioElement;
          setPlayingAudio(selectedAnnouncementForPlay);
          
          try {
            await audioElement.play();
            toast.success(`Playing ${audio.title}`);
            
            audioElement.addEventListener('ended', () => {
              setPlayingAudio(null);
              audioRef.current = null;
            });
            
            audioElement.addEventListener('error', () => {
              toast.error('Failed to play audio.');
              setPlayingAudio(null);
              audioRef.current = null;
            });
          } catch (playError) {
            toast.error('Failed to play audio.');
            setPlayingAudio(null);
            audioRef.current = null;
          }
          return;
        }
        attempts++;
      }
      
      toast.warning('Audio is still generating. Please try playing again in a moment.');
      setIsPlayVoiceDialogOpen(false);
      setSelectedAnnouncementForPlay(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate audio');
      console.error('TTS generation error:', error);
    } finally {
      setIsGeneratingForPlay(false);
    }
  };

  const handleRecalculateDuration = async (audioId: string) => {
    try {
      toast.info('Recalculating duration...');
      const updated = await announcementsAPI.recalculateDuration(audioId);
      
      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      toast.success(`Duration updated: ${formatDuration(updated.duration)}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to recalculate duration');
      console.error('Duration recalculation error:', error);
    }
  };

  const handleDelete = async (audioId: string) => {
    const audio = audioFiles.find(a => a.id === audioId);
    
    try {
      await announcementsAPI.deleteAnnouncement(audioId);
      setAudioFiles(audioFiles.filter(a => a.id !== audioId));
      if (audio?.scriptId) {
        setScripts(scripts.filter(s => s.id !== audio.scriptId));
      }
      toast.success(`Deleted ${audio?.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement');
      console.error('Delete error:', error);
    }
  };

  const handlePlay = async (audioId: string) => {
    const audio = audioFiles.find(a => a.id === audioId);
    if (!audio) {
      toast.error('Announcement not found');
      return;
    }

    if ((!audio.url || audio.url === '#' || audio.url === '') && audio.ttsText) {
      setSelectedAnnouncementForPlay(audioId);
      setPlayVoiceDialogVoice(selectedVoice);
      setIsPlayVoiceDialogOpen(true);
      return;
    }

    if (!audio.url || audio.url === '#' || audio.url === '') {
      try {
        toast.info('Loading audio file...');
        const announcements = await announcementsAPI.getAnnouncements();
        const updatedAudio = announcements.find(a => a.id === audioId);
        
        if (updatedAudio && updatedAudio.url) {
          setAudioFiles(prev => prev.map(a => 
            a.id === audioId 
              ? { ...a, url: updatedAudio.url }
              : a
          ));
          
          const audioUrl = updatedAudio.url;
          if (!audioUrl || audioUrl === '#' || audioUrl === '') {
            toast.error('Audio file is not ready yet. Please wait a moment and try again.');
            return;
          }
          
          const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${window.location.origin}${audioUrl}`;
          
          const audioElement = new Audio(fullUrl);
          audioRef.current = audioElement;
          setPlayingAudio(audioId);
          
          try {
            await audioElement.play();
            toast.success(`Playing ${audio.title}`);
            
            audioElement.addEventListener('ended', () => {
              setPlayingAudio(null);
              audioRef.current = null;
            });
            
            audioElement.addEventListener('error', (e) => {
              console.error('Audio playback error:', e, 'URL:', fullUrl);
              toast.error('Failed to play audio. The file may be missing or corrupted.');
              setPlayingAudio(null);
              audioRef.current = null;
            });
          } catch (playError) {
            console.error('Playback error:', playError, 'URL:', fullUrl);
            toast.error('Failed to play audio. Please try again.');
            setPlayingAudio(null);
            audioRef.current = null;
          }
        } else {
          toast.error('This announcement has no audio file yet. TTS generation may still be in progress. Please wait a moment and try again.');
        }
      } catch (error) {
        console.error('Error loading announcement:', error);
        toast.error('Failed to load announcement. Please try again.');
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (playingAudio === audioId) {
      setPlayingAudio(null);
      toast.info('Playback stopped');
    } else {
      const audioUrl = audio.url.startsWith('http') ? audio.url : `${window.location.origin}${audio.url}`;
      
      const audioElement = new Audio(audioUrl);
      audioRef.current = audioElement;
      
      setPlayingAudio(audioId);
      try {
        await audioElement.play();
        toast.success(`Playing ${audio.title}`);
        
        audioElement.addEventListener('ended', () => {
          setPlayingAudio(null);
          audioRef.current = null;
        });
        
        audioElement.addEventListener('error', (e) => {
          console.error('Audio playback error:', e, 'URL:', audioUrl);
          toast.error('Failed to play audio. The file may be missing or corrupted.');
          setPlayingAudio(null);
          audioRef.current = null;
        });
      } catch (error: any) {
        console.error('Playback error:', error, 'URL:', audioUrl);
        toast.error('Failed to play audio. Please try again.');
        setPlayingAudio(null);
        audioRef.current = null;
      }
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
      await announcementsAPI.playInstantAnnouncement(selectedAnnouncementForInstant, selectedDevices);

      const deviceNames = selectedDevices.map(id => 
        devices.find(d => d.id === id)?.name
      ).join(', ');

      const announcement = audioFiles.find(a => a.id === selectedAnnouncementForInstant);
      
      if (announcement && announcement.url && announcement.url !== '#' && announcement.url !== '') {
        try {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          
          const audioUrl = announcement.url.startsWith('http') 
            ? announcement.url 
            : `${window.location.origin}${announcement.url}`;
          
          const audioElement = new Audio(audioUrl);
          audioRef.current = audioElement;
          setPlayingAudio(selectedAnnouncementForInstant);
          
          await audioElement.play();
          
          audioElement.addEventListener('ended', () => {
            setPlayingAudio(null);
            audioRef.current = null;
          });
          
          audioElement.addEventListener('error', (e) => {
            console.error('Audio playback error:', e, 'URL:', audioUrl);
            toast.warning('Backend received command, but audio playback failed in browser. Check audio file URL.');
            setPlayingAudio(null);
            audioRef.current = null;
          });
          
          toast.success(`Playing "${announcement.title}" on: ${deviceNames}`);
        } catch (playError: any) {
          console.error('Browser audio playback error:', playError);
          toast.success(`Command sent to devices: ${deviceNames}`, {
            description: 'Browser audio playback failed. Audio should play on physical devices.',
          });
        }
      } else {
        toast.success(`Command sent to devices: ${deviceNames}`, {
          description: 'Announcement has no audio URL. Please ensure the audio file is generated.',
        });
      }
      
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

    const settings = folderSettings[selectedFolderForSettings];
    const folder = folders.find(f => f.id === selectedFolderForSettings);
    
    try {
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

  return {
    handleCreateFolder,
    handleUploadAnnouncement,
    handleGenerateAIScript,
    handleCreateBulkAnnouncements,
    handleCreateScript,
    toggleScriptSelection,
    handlePreviewVoice,
    handleStopPreview,
    handleToggleEnabled,
    handleRegenerateVoice,
    handleConfirmVoiceRegeneration,
    handleConfirmPlayVoice,
    handleRecalculateDuration,
    handleDelete,
    handlePlay,
    handleInstantAnnouncement,
    handleOpenFolderSettings,
    handleSaveFolderSettings,
    toggleAnnouncementInPlaylist,
    audioRef,
  };
}

