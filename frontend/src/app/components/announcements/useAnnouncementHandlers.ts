import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { announcementsAPI, musicAPI } from '@/lib/api';
import { FolderSettings, Folder, AnnouncementAudio, TTSVoice, GeneratedScript } from './announcements.types';
import { formatDuration } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

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
  const { user: authUser, impersonatingClient } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Get effective client ID for admin
  const getEffectiveClientId = (selectedClientId?: string) => {
    // Priority: 1) selectedClientId from dialog, 2) impersonated client, 3) user's clientId
    if (user?.role === 'admin') {
      // Check for temporarily stored client ID from dialog
      const tempClientId = (window as any).__tempSelectedClientId;
      if (tempClientId) {
        delete (window as any).__tempSelectedClientId;
        return tempClientId;
      }
      if (selectedClientId) return selectedClientId;
      if (impersonatingClient) return impersonatingClient;
      return user?.clientId || null;
    }
    return user?.clientId || null;
  };
  
  const handleCreateFolder = async (selectedClientId?: string) => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return null;
    }
    if (!activeTarget) {
      toast.error('Please select a zone first');
      return null;
    }
    
    setIsCreatingFolder(true);
    try {
      const folderData: any = {
        name: newFolderName,
        type: 'announcements',
        zone_id: activeTarget,
      };
      
      // Add client_id for admin
      const effectiveClientId = selectedClientId || getEffectiveClientId();
      if (effectiveClientId) {
        folderData.client_id = effectiveClientId;
      }
      
      const newFolder = await musicAPI.createFolder(folderData);
      
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
      toast.success(`Folder "${newFolder.name}" created`);
      return newFolder;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
      console.error('Create folder error:', error);
      return null;
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadAnnouncement = async (isRecording: boolean = false, selectedClientId?: string) => {
    if (!uploadFile) {
      toast.error('Please select an audio file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const title =
        (newTitle && newTitle.trim()) ||
        uploadFile.name.replace(/\.[^/.]+$/, '');

      // Get effective client ID (check for temp stored value or passed value)
      const tempClientId = (window as any).__tempSelectedClientId;
      if (tempClientId) {
        delete (window as any).__tempSelectedClientId;
      }
      const effectiveClientId = selectedClientId || tempClientId || getEffectiveClientId();

      await announcementsAPI.uploadAnnouncement(
        uploadFile,
        { 
          title, 
          folder_id: newCategory || undefined,
          zone_id: activeTarget || undefined,
          is_recording: isRecording,
          client_id: effectiveClientId || undefined,
        },
        () => {}
      );

      // Reload all announcements from backend to get fresh data with proper folder_id
      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      // Also reload folders to ensure we have latest zone information
      if (activeTarget) {
        try {
          const updatedFolders = await musicAPI.getFolders('announcements', activeTarget);
          setFolders(updatedFolders);
        } catch (error) {
          console.error('Failed to reload folders:', error);
        }
      }

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
      // Get effective client ID (check for temp stored value)
      const effectiveClientId = getEffectiveClientId();
      
      const announcements = await announcementsAPI.createBatchTTSAnnouncements({
        announcements: selectedScripts.map(s => ({
          title: s.title,
          text: s.text,
          voice: selectedVoice,
          folder_id: newCategory || undefined,
          zone_id: activeTarget || undefined,
          client_id: effectiveClientId || undefined,
        })),
        voice: selectedVoice,
        folder_id: newCategory || undefined,
        zone_id: activeTarget || undefined,
        client_id: effectiveClientId || undefined,
      });

      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      // Also reload folders to ensure we have latest zone information
      if (activeTarget) {
        try {
          const updatedFolders = await musicAPI.getFolders('announcements', activeTarget);
          setFolders(updatedFolders);
        } catch (error) {
          console.error('Failed to reload folders:', error);
        }
      }
      
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
      // Get effective client ID (check for temp stored value)
      const effectiveClientId = getEffectiveClientId();
      
      const announcement = await announcementsAPI.createTTSAnnouncement({
        title: newTitle,
        text: newText,
        voice: selectedVoice,
        folder_id: newCategory || undefined,
        zone_id: activeTarget || undefined,
        client_id: effectiveClientId || undefined,
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

      // Reload all announcements from backend to get fresh data with proper folder_id
      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      // Also reload folders to ensure we have latest zone information
      if (activeTarget) {
        try {
          const updatedFolders = await musicAPI.getFolders('announcements', activeTarget);
          setFolders(updatedFolders);
        } catch (error) {
          console.error('Failed to reload folders:', error);
        }
      }
      
      // Extract scripts from TTS announcements
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
    
    console.log('Starting voice preview for:', voice);
    setPreviewingVoice(voice);
    try {
      const previewText = newText.trim() || 'Hello, this is a voice preview. How does this sound?';
      console.log('Calling previewVoice API to generate/retrieve preview:', { text: previewText, voice });
      
      // Always call the POST endpoint which will generate if not exists
      // This ensures we always get a valid preview URL
      toast.info('Generating voice preview...');
      const preview = await announcementsAPI.previewVoice({
        text: previewText,
        voice: voice,
      });
      
      console.log('Preview API response:', preview);
      
      // Check if we got an error response
      if (preview.error || preview.detail) {
        const errorMsg = preview.error || preview.detail || 'Failed to generate voice preview';
        console.error('API returned error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!preview.preview_url) {
        console.error('No preview_url in response:', preview);
        throw new Error('No preview URL returned from server');
      }
      
      // Ensure the preview URL is absolute using the normalizeUrl utility
      const { normalizeUrl } = await import('@/lib/api/core');
      const previewUrl = normalizeUrl(preview.preview_url);
      console.log('Normalized preview URL:', previewUrl);
      
      // Create audio element and set up handlers before loading
      const audio = new Audio(previewUrl);
      setPreviewAudio(audio);
      
      // Add error handlers before playing
      audio.addEventListener('error', async (e) => {
        console.error('Audio playback error:', e, audio.error);
        
        // If audio fails to load (404 or other error), try to regenerate
        if (audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
            audio.error?.code === MediaError.MEDIA_ERR_NETWORK) {
          console.log('Audio failed to load, attempting to regenerate...');
          try {
            toast.info('Regenerating voice preview...');
            const regenerated = await announcementsAPI.previewVoice({
              text: previewText,
              voice: voice,
            });
            
            if (regenerated.preview_url) {
              const newUrl = normalizeUrl(regenerated.preview_url);
              audio.src = newUrl;
              audio.load();
              try {
                await audio.play();
                toast.success('Voice preview playing');
                return;
              } catch (playErr) {
                console.error('Failed to play regenerated audio:', playErr);
              }
            }
          } catch (regenError) {
            console.error('Failed to regenerate preview:', regenError);
          }
        }
        
        toast.error('Failed to play audio. Please check your browser audio settings.');
        setPreviewingVoice(null);
        setPreviewAudio(null);
      });
      
      audio.addEventListener('ended', () => {
        console.log('Audio playback ended');
        setPreviewingVoice(null);
        setPreviewAudio(null);
      });
      
      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started');
      });
      
      audio.addEventListener('canplay', () => {
        console.log('Audio can play');
        toast.dismiss(); // Dismiss the "Generating..." toast
      });
      
      // Try to play the audio
      try {
        console.log('Attempting to play audio...');
        await audio.play();
        console.log('Audio playing successfully');
        toast.success(preview.cached ? 'Playing cached preview' : 'Voice preview playing');
      } catch (playError: any) {
        console.error('Audio play error:', playError);
        // Check if it's an autoplay policy issue
        if (playError.name === 'NotAllowedError') {
          toast.error('Please click the play button to start audio (browser autoplay restriction)');
        } else {
          toast.error(`Failed to play audio: ${playError.message}`);
        }
        setPreviewingVoice(null);
        setPreviewAudio(null);
      }
    } catch (error: any) {
      console.error('Preview voice error:', error);
      const errorMessage = error?.error || error?.detail || error?.message || 'Failed to preview voice';
      console.error('Error message:', errorMessage);
      
      // If it's an OpenAI key error, provide helpful message
      if (errorMessage.includes('OpenAI API key')) {
        toast.error('Voice preview generation is not configured. Please contact your administrator.');
      } else {
        toast.error(errorMessage);
      }
      
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
      toast.info('Generating audio... This may take a few seconds.');
      const updated = await announcementsAPI.regenerateTTS(selectedAnnouncementForVoice, {
        voice: voiceDialogVoice,
        provider: 'openai',
      });
      
      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      if (updated.url && updated.url !== '#' && updated.url !== '') {
        toast.success(`Audio generated successfully! Duration: ${formatDuration(updated.duration)}`);
      } else {
        toast.warning('Voice updated but audio generation may still be in progress. Please try again in a moment.');
      }
      setIsVoiceDialogOpen(false);
      setSelectedAnnouncementForVoice(null);
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to regenerate audio';
      toast.error(`Failed to regenerate audio: ${errorMessage}`);
      console.error('Voice regeneration error:', error);
    } finally {
      setIsRegeneratingVoice(false);
    }
  };

  const handleConfirmPlayVoice = async () => {
    if (!selectedAnnouncementForPlay) return;
    
    const audio = audioFiles.find(a => a.id === selectedAnnouncementForPlay);
    if (!audio) {
      toast.error('Announcement not found');
      return;
    }
    
    // Check if announcement has text to generate from
    if (!audio.ttsText && !audio.text) {
      toast.error('Announcement has no text content. Cannot generate audio without text.');
      return;
    }
    
    setIsGeneratingForPlay(true);
    try {
      toast.info('Generating audio... This may take a few seconds.');
      
      const updated = await announcementsAPI.regenerateTTS(selectedAnnouncementForPlay, {
        voice: playVoiceDialogVoice,
        provider: 'openai',
      });
      
      // Update the audio files list
      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      // Check if audio was successfully generated
      if (updated.url && updated.url !== '#' && updated.url !== '') {
        setIsPlayVoiceDialogOpen(false);
        setSelectedAnnouncementForPlay(null);
        
        // Ensure audio URL is absolute using normalizeUrl
        const { normalizeUrl } = await import('@/lib/api/core');
        const audioUrl = normalizeUrl(updated.url);
        
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        // Small delay to ensure audio file is accessible
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
            toast.error('Failed to play audio. The file may still be processing. Please try again in a moment.');
            setPlayingAudio(null);
            audioRef.current = null;
          });
        } catch (playError: any) {
          console.error('Play error:', playError);
          toast.error('Audio generated but playback failed. Please try playing again.');
          setPlayingAudio(null);
          audioRef.current = null;
        }
      } else {
        toast.warning('Audio generation may still be in progress. Please try playing again in a moment.');
        setIsPlayVoiceDialogOpen(false);
        setSelectedAnnouncementForPlay(null);
      }
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to generate audio';
      toast.error(`Failed to generate audio: ${errorMessage}`);
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
        
        if (updatedAudio && updatedAudio.url && updatedAudio.url !== '#' && updatedAudio.url !== '') {
          setAudioFiles(prev => prev.map(a => 
            a.id === audioId 
              ? { ...a, url: updatedAudio.url }
              : a
          ));
          
          // Ensure audio URL is absolute using normalizeUrl
          const { normalizeUrl } = await import('@/lib/api/core');
          const audioUrl = normalizeUrl(updatedAudio.url);
          
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
              toast.error('Unable to play this announcement. Use "Regenerate Audio" from the menu to fix this.');
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
          // If audio is still missing, check if we can regenerate it
          if (updatedAudio?.type === 'tts' || updatedAudio?.ttsText) {
             toast.info('Audio file missing. Opening generation dialog...');
             setSelectedAnnouncementForPlay(audioId);
             setPlayVoiceDialogVoice(selectedVoice || 'alloy');
             setIsPlayVoiceDialogOpen(true);
          } else {
             toast.error('This announcement needs an audio file. Please generate it first.');
             // Add option to delete announcement without audio
             if (window.confirm('This announcement doesn\'t have an audio file yet. Do you want to delete it?')) {
               handleDelete(audioId);
             }
          }
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
      // Validate audio URL before attempting to play
      if (!audio.url || audio.url === '#' || audio.url === '') {
        if (audio.ttsText) {
          const shouldRegenerate = window.confirm(
            'This announcement has no audio file. Would you like to regenerate it now?'
          );
          if (shouldRegenerate) {
            setSelectedAnnouncementForPlay(audioId);
            setPlayVoiceDialogVoice(selectedVoice || 'alloy');
            setIsPlayVoiceDialogOpen(true);
          }
        } else {
          toast.error('This announcement has no audio file or text. Please regenerate it or delete it.');
        }
        return;
      }
      
      // Ensure audio URL is absolute using normalizeUrl
      const { normalizeUrl } = await import('@/lib/api/core');
      const audioUrl = normalizeUrl(audio.url);
      
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
          toast.error('Failed to play audio. The file may be missing or corrupted. Use "Regenerate Audio" from the menu to fix this.');
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
      
      // Validate announcement has proper audio URL
      if (!announcement || !announcement.url || announcement.url === '#' || announcement.url === '') {
        toast.error('Selected announcement has no audio file. Please generate the audio first.');
        setIsSending(false);
        return;
      }
      
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        // Ensure audio URL is absolute using normalizeUrl
        const { normalizeUrl } = await import('@/lib/api/core');
        const audioUrl = normalizeUrl(announcement.url);
        
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
            toast.warning('Unable to play announcement preview. The audio file may need to be regenerated.');
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

