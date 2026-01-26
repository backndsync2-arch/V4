import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { type AnnouncementTemplate } from '@/lib/mockData';
import { announcementsAPI, musicAPI, zonesAPI } from '@/lib/api';
import { AnnouncementTemplatesGallery } from '@/app/components/AnnouncementTemplatesGallery';
import { AnnouncementsHeader } from './announcements/AnnouncementsHeader';
import { AnnouncementsFolderList } from './announcements/AnnouncementsFolderList';
import { AnnouncementsToolbar } from './announcements/AnnouncementsToolbar';
import { AnnouncementsListView } from './announcements/AnnouncementsListView';
import { AnnouncementsGridView } from './announcements/AnnouncementsGridView';
import { CreateAnnouncementDialog } from './announcements/CreateAnnouncementDialog';
import { VoiceManagementDialog } from './announcements/VoiceManagementDialog';
import { FolderSettingsDialog } from './announcements/FolderSettingsDialog';
import { InstantPlayDialog } from './announcements/InstantPlayDialog';
import { FolderSettings, Folder, AnnouncementAudio, TTSVoice, GeneratedScript } from './announcements/announcements.types';
import { formatDuration } from '@/lib/utils';

export function AnnouncementsFinal() {
  const { user } = useAuth();
  const uploadInputId = React.useId();
  const [scripts, setScripts] = useState<any[]>([]);
  const [audioFiles, setAudioFiles] = useState<AnnouncementAudio[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInstantOpen, setIsInstantOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isFolderSettingsOpen, setIsFolderSettingsOpen] = useState(false);
  const [selectedFolderForSettings, setSelectedFolderForSettings] = useState<string | null>(null);
  const [announcementIcons, setAnnouncementIcons] = useState<Record<string, string | null>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [ttsVoices, setTtsVoices] = useState<TTSVoice[]>([]);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [selectedAnnouncementForVoice, setSelectedAnnouncementForVoice] = useState<string | null>(null);
  const [voiceDialogVoice, setVoiceDialogVoice] = useState('alloy');
  const [isRegeneratingVoice, setIsRegeneratingVoice] = useState(false);
  
  // Voice selection for play action (when announcement has text but no audio)
  const [isPlayVoiceDialogOpen, setIsPlayVoiceDialogOpen] = useState(false);
  const [selectedAnnouncementForPlay, setSelectedAnnouncementForPlay] = useState<string | null>(null);
  const [playVoiceDialogVoice, setPlayVoiceDialogVoice] = useState('alloy');
  const [isGeneratingForPlay, setIsGeneratingForPlay] = useState(false);
  
  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiKeyPoints, setAiKeyPoints] = useState('');
  const [aiQuantity, setAiQuantity] = useState('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<GeneratedScript[]>([]);

  // Load folders, announcements, devices, and TTS voices on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        // Load folders from backend
        const announcementFolders = await musicAPI.getFolders('announcements');
        setFolders(announcementFolders);
        
        // Load real announcements from backend
        const announcements = await announcementsAPI.getAnnouncements();
        setAudioFiles(announcements);
        
        // Load real devices from backend
        try {
          const realDevices = await zonesAPI.getDevices();
          setDevices(realDevices);
        } catch (deviceError) {
          console.error('Failed to load devices:', deviceError);
          // Fallback to empty array if devices can't be loaded
          setDevices([]);
        }
        
        // IMMEDIATELY recalculate duration for announcements with 0 duration that have audio files
        const announcementsNeedingDuration = announcements.filter(a => 
          a.duration === 0 && a.url && a.url !== '' && a.url !== '#'
        );
        if (announcementsNeedingDuration.length > 0) {
          console.log(`Found ${announcementsNeedingDuration.length} announcements with 0:00 duration, recalculating immediately...`);
          // Recalculate immediately (don't block UI, but do it right away)
          const recalculationPromises = announcementsNeedingDuration.map(a => 
            announcementsAPI.recalculateDuration(a.id).catch(err => {
              console.warn(`Failed to recalculate duration for ${a.id}:`, err);
              return null;
            })
          );
          
          // Wait for all recalculations to complete, then reload
          Promise.all(recalculationPromises).then(() => {
            // Small delay to ensure backend has saved
            return new Promise(resolve => setTimeout(resolve, 500));
          }).then(() => {
            // Reload announcements after recalculation
            return announcementsAPI.getAnnouncements();
          }).then(updated => {
            setAudioFiles(updated);
            console.log('Duration recalculation complete, announcements updated');
            toast.success(`Updated duration for ${announcementsNeedingDuration.length} announcement${announcementsNeedingDuration.length > 1 ? 's' : ''}`);
          }).catch(err => {
            console.error('Failed to reload announcements after duration recalculation:', err);
          });
        }
        
        // Extract scripts from TTS announcements
        const ttsScripts = announcements
          .filter(a => a.type === 'tts')
          .map(a => ({
            id: a.id,
            title: a.title,
            text: '', // We don't store text in the audio file, but we can get it from backend if needed
            clientId: a.clientId,
            enabled: a.enabled,
            category: a.category,
            createdAt: a.createdAt,
            createdBy: a.createdBy,
          }));
        setScripts(ttsScripts);
        
        // Load TTS voices
        const voices = await announcementsAPI.getTTSVoices();
        setTtsVoices(voices);
        if (voices.length > 0 && !selectedVoice) {
          setSelectedVoice(voices[0].id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback voices if API fails
        setTtsVoices([
          { id: 'alloy', name: 'Alloy (Neutral)', gender: 'neutral', accent: 'US' },
          { id: 'echo', name: 'Echo (Male)', gender: 'male', accent: 'US' },
          { id: 'nova', name: 'Nova (Female)', gender: 'female', accent: 'US' },
          { id: 'shimmer', name: 'Shimmer (Female)', gender: 'female', accent: 'US' },
        ]);
      }
    };
    loadData();
    
    // Periodic check for announcements with 0:00 duration (every 10 seconds for faster updates)
    const durationCheckInterval = setInterval(async () => {
      try {
        const announcements = await announcementsAPI.getAnnouncements();
        const needsRecalculation = announcements.filter(a => 
          a.duration === 0 && a.url && a.url !== '' && a.url !== '#'
        );
        
        if (needsRecalculation.length > 0) {
          console.log(`Periodic check: Found ${needsRecalculation.length} announcements with 0:00, recalculating...`);
          // Recalculate in background
          Promise.all(
            needsRecalculation.map(a => 
              announcementsAPI.recalculateDuration(a.id).catch(err => {
                console.warn(`Failed to recalculate duration for ${a.id}:`, err);
                return null;
              })
            )
          ).then(() => {
            // Small delay to ensure backend has saved
            return new Promise(resolve => setTimeout(resolve, 500));
          }).then(() => {
            // Reload announcements after recalculation
            return announcementsAPI.getAnnouncements();
          }).then(updated => {
            setAudioFiles(updated);
            console.log('Periodic duration recalculation complete');
          }).catch(err => {
            console.error('Failed to reload announcements:', err);
          });
        }
      } catch (error) {
        console.error('Error in periodic duration check:', error);
      }
    }, 10000); // Check every 10 seconds for faster updates
    
    return () => clearInterval(durationCheckInterval);
  }, []);

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const filteredScripts = clientId ? scripts.filter(s => s.clientId === clientId) : scripts;
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
      const newFolder = await musicAPI.createFolder({
        name: newFolderName,
        type: 'announcements',
      });
      
      // Use the folder from the API response directly (already normalized)
      setFolders([...folders, newFolder]);
      
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
        { title, folder_id: newCategory || undefined },
        () => {
          // We don't currently surface progress here (XMLHttpRequest supports it but UI doesn't show a bar).
        }
      );

      // Add to local UI list
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
      // Use batch API for multiple announcements (much faster - single API call with parallel processing)
      const announcements = await announcementsAPI.createBatchTTSAnnouncements({
        announcements: selectedScripts.map(s => ({
          title: s.title,
          text: s.text,
          voice: selectedVoice,
          folder_id: newCategory || undefined,
        })),
        voice: selectedVoice,
        folder_id: newCategory || undefined,
      });

      // Reload all announcements from backend to get fresh data
      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      // Extract scripts from TTS announcements
      const ttsScripts = allAnnouncements
        .filter(a => a.type === 'tts')
        .map(a => ({
          id: a.id,
          title: a.title,
          text: '', // We don't store text in the audio file
          clientId: a.clientId,
          enabled: a.enabled,
          category: a.category,
          createdAt: a.createdAt,
          createdBy: a.createdBy,
        }));
      setScripts(ttsScripts);
      
      // Clear form
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
      
      // Reload announcements to get updated data
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
      
      // Generate TTS with selected voice
      const updated = await announcementsAPI.regenerateTTS(selectedAnnouncementForPlay, {
        voice: playVoiceDialogVoice,
        provider: 'openai',
      });
      
      // Reload announcements to get updated data with audio URL
      const allAnnouncements = await announcementsAPI.getAnnouncements();
      setAudioFiles(allAnnouncements);
      
      // Wait a moment for the audio file to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the updated announcement with audio URL
      const updatedAnnouncements = await announcementsAPI.getAnnouncements();
      const announcementWithAudio = updatedAnnouncements.find(a => a.id === selectedAnnouncementForPlay);
      
      if (announcementWithAudio && announcementWithAudio.url && announcementWithAudio.url !== '#' && announcementWithAudio.url !== '') {
        // Close dialog
        setIsPlayVoiceDialogOpen(false);
        setSelectedAnnouncementForPlay(null);
        
        // Play the generated audio
        const audioUrl = announcementWithAudio.url.startsWith('http') 
          ? announcementWithAudio.url 
          : `${window.location.origin}${announcementWithAudio.url}`;
        
        // Stop any currently playing audio
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
          
          audioElement.addEventListener('error', (e) => {
            console.error('Audio playback error:', e, 'URL:', audioUrl);
            toast.error('Failed to play audio. The file may be missing or corrupted.');
            setPlayingAudio(null);
            audioRef.current = null;
          });
        } catch (playError) {
          console.error('Playback error:', playError, 'URL:', audioUrl);
          toast.error('Failed to play audio. Please try again.');
          setPlayingAudio(null);
          audioRef.current = null;
        }
      } else {
        // Poll for audio to be ready
        let attempts = 0;
        while (attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const polledAnnouncements = await announcementsAPI.getAnnouncements();
          const polledAnnouncement = polledAnnouncements.find(a => a.id === selectedAnnouncementForPlay);
          
          if (polledAnnouncement && polledAnnouncement.url && polledAnnouncement.url !== '#' && polledAnnouncement.url !== '') {
            setAudioFiles(polledAnnouncements);
            setIsPlayVoiceDialogOpen(false);
            setSelectedAnnouncementForPlay(null);
            
            // Play the audio
            const audioUrl = polledAnnouncement.url.startsWith('http') 
              ? polledAnnouncement.url 
              : `${window.location.origin}${polledAnnouncement.url}`;
            
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
              
              audioElement.addEventListener('error', (e) => {
                console.error('Audio playback error:', e);
                toast.error('Failed to play audio.');
                setPlayingAudio(null);
                audioRef.current = null;
              });
            } catch (playError) {
              console.error('Playback error:', playError);
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
      }
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
      
      // Reload announcements to get updated data
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

    // Check if announcement has text but no audio URL (ready-made announcement)
    if ((!audio.url || audio.url === '#' || audio.url === '') && audio.ttsText) {
      // Show voice selection dialog for play
      setSelectedAnnouncementForPlay(audioId);
      setPlayVoiceDialogVoice(selectedVoice);
      setIsPlayVoiceDialogOpen(true);
      return;
    }

    // If no URL, try to reload the announcement from backend
    if (!audio.url || audio.url === '#' || audio.url === '') {
      try {
        toast.info('Loading audio file...');
        const announcements = await announcementsAPI.getAnnouncements();
        const updatedAudio = announcements.find(a => a.id === audioId);
        
        if (updatedAudio && updatedAudio.url) {
          // Update the audio file in the list
          setAudioFiles(prev => prev.map(a => 
            a.id === audioId 
              ? { ...a, url: updatedAudio.url }
              : a
          ));
          
          // Retry playing with updated URL
          const audioUrl = updatedAudio.url;
          if (!audioUrl || audioUrl === '#' || audioUrl === '') {
            toast.error('Audio file is not ready yet. Please wait a moment and try again.');
            return;
          }
          
          // Ensure URL is absolute
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

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (playingAudio === audioId) {
      // Stop playback
      setPlayingAudio(null);
      toast.info('Playback stopped');
    } else {
      // Ensure URL is absolute
      const audioUrl = audio.url.startsWith('http') ? audio.url : `${window.location.origin}${audio.url}`;
      
      // Create new audio element
      const audioElement = new Audio(audioUrl);
      audioRef.current = audioElement;
      
      // Play new audio
      setPlayingAudio(audioId);
      try {
        await audioElement.play();
        toast.success(`Playing ${audio.title}`);
        
        // Handle end of playback
        audioElement.addEventListener('ended', () => {
          setPlayingAudio(null);
          audioRef.current = null;
        });
        
        // Handle errors
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
      // Send to backend (for real devices)
      await announcementsAPI.playInstantAnnouncement(selectedAnnouncementForInstant, selectedDevices);

      const deviceNames = selectedDevices.map(id => 
        devices.find(d => d.id === id)?.name
      ).join(', ');

      const announcement = audioFiles.find(a => a.id === selectedAnnouncementForInstant);
      
      // For development/demo: Also play audio in browser
      if (announcement && announcement.url && announcement.url !== '#' && announcement.url !== '') {
        try {
          // Stop any currently playing audio
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          
          // Ensure URL is absolute
          const audioUrl = announcement.url.startsWith('http') 
            ? announcement.url 
            : `${window.location.origin}${announcement.url}`;
          
          // Create and play audio element
          const audioElement = new Audio(audioUrl);
          audioRef.current = audioElement;
          setPlayingAudio(selectedAnnouncementForInstant);
          
          await audioElement.play();
          
          // Handle end of playback
          audioElement.addEventListener('ended', () => {
            setPlayingAudio(null);
            audioRef.current = null;
          });
          
          // Handle errors
          audioElement.addEventListener('error', (e) => {
            console.error('Audio playback error:', e, 'URL:', audioUrl);
            toast.warning('Backend received command, but audio playback failed in browser. Check audio file URL.');
            setPlayingAudio(null);
            audioRef.current = null;
          });
          
          toast.success(`Playing "${announcement.title}" on: ${deviceNames}`);
        } catch (playError: any) {
          console.error('Browser audio playback error:', playError);
          // Still show success for backend, but warn about browser playback
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

    const settings = folderSettings[selectedFolderForSettings];
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

  const handleIconChange = (id: string, url: string | null) => {
    setAnnouncementIcons({ ...announcementIcons, [id]: url });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <AnnouncementsHeader
        onCreateClick={() => setIsCreateOpen(true)}
        onInstantPlayClick={() => setIsInstantOpen(true)}
        isCreateOpen={isCreateOpen}
        isInstantOpen={isInstantOpen}
        onCreateOpenChange={setIsCreateOpen}
        onInstantOpenChange={setIsInstantOpen}
        instantPlayDialog={
          <InstantPlayDialog
            open={isInstantOpen}
            onOpenChange={setIsInstantOpen}
            announcements={audioFiles}
            devices={availableDevices}
            selectedAnnouncement={selectedAnnouncementForInstant}
            onAnnouncementChange={setSelectedAnnouncementForInstant}
            selectedDevices={selectedDevices}
            onDevicesChange={setSelectedDevices}
            onSend={handleInstantAnnouncement}
            isSending={isSending}
          />
        }
        createDialog={
          <CreateAnnouncementDialog
            folders={filteredFolders}
            ttsVoices={ttsVoices}
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            newTitle={newTitle}
            onTitleChange={setNewTitle}
            newText={newText}
            onTextChange={setNewText}
            newCategory={newCategory}
            onCategoryChange={setNewCategory}
            uploadFile={uploadFile}
            onUploadFileChange={setUploadFile}
            uploadInputId={uploadInputId}
            isCreating={isCreating}
            isUploading={isUploading}
            isGenerating={isGenerating}
            aiTopic={aiTopic}
            onAiTopicChange={setAiTopic}
            aiTone={aiTone}
            onAiToneChange={setAiTone}
            aiKeyPoints={aiKeyPoints}
            onAiKeyPointsChange={setAiKeyPoints}
            aiQuantity={aiQuantity}
            onAiQuantityChange={setAiQuantity}
            generatedScripts={generatedScripts}
            onGeneratedScriptsChange={setGeneratedScripts}
            previewingVoice={previewingVoice}
            previewAudio={previewAudio}
            onPreviewVoice={handlePreviewVoice}
            onStopPreview={handleStopPreview}
            onCreateScript={handleCreateScript}
            onGenerateAI={handleGenerateAIScript}
            onCreateBulk={handleCreateBulkAnnouncements}
            onUpload={handleUploadAnnouncement}
          />
        }
      />

      {/* Ready-Made Templates Gallery */}
      <AnnouncementTemplatesGallery
        onAnnouncementsCreated={async () => {
          // Reload announcements after templates are created
          try {
            const announcements = await announcementsAPI.getAnnouncements();
            setAudioFiles(announcements.map(a => ({
              id: a.id,
              title: a.title,
              scriptId: a.id,
              clientId: user?.clientId || 'client1',
              url: a.url || '',
              duration: a.duration || 0,
              type: a.type || 'tts',
              enabled: a.enabled ?? true,
              category: a.folderId || undefined,
              folderId: a.folderId || undefined,
              createdAt: a.createdAt || new Date(),
              createdBy: user?.id || 'user1',
            })));
          } catch (error) {
            console.error('Failed to reload announcements:', error);
          }
        }}
        onUseTemplate={async (template, folderInfo) => {
          // Automatically create TTS announcement from template with appropriate voice
          try {
            setIsCreating(true);
            toast.info(`Creating announcement: ${template.title}...`);
            
            // Handle folder creation/selection if folderInfo is provided
            let targetFolderId: string | undefined = newCategory || undefined;
            
            if (folderInfo) {
              // First, reload folders to ensure we have the latest state
              let allFolders = folders;
              try {
                allFolders = await musicAPI.getFolders('announcements');
                setFolders(allFolders);
              } catch (reloadError) {
                console.warn('Failed to reload folders, using cached list:', reloadError);
              }
              
              // Check if folder with this name already exists (case-insensitive)
              const existingFolder = allFolders.find(
                f => f.name.toLowerCase() === folderInfo.name.toLowerCase() && f.type === 'announcements'
              );
              
              if (existingFolder) {
                // Use existing folder
                targetFolderId = existingFolder.id;
              } else {
                // Create new folder with same name and thumbnail
                try {
                  let coverImageFile: File | undefined;
                  let imageFetchFailed = false;
                  
                  // If folder has an image URL, fetch it and convert to File
                  if (folderInfo.image && folderInfo.image.startsWith('http')) {
                    try {
                      const imageResponse = await fetch(folderInfo.image, { mode: 'cors' });
                      if (!imageResponse.ok) {
                        throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`);
                      }
                      const imageBlob = await imageResponse.blob();
                      
                      // Validate that it's actually an image
                      if (!imageBlob.type.startsWith('image/')) {
                        throw new Error('Fetched file is not an image');
                      }
                      
                      // Extract proper file extension from URL (remove query params first)
                      let imageFileExtension = 'jpg'; // Default
                      try {
                        const urlWithoutQuery = folderInfo.image.split('?')[0]; // Remove query params
                        const urlPath = urlWithoutQuery.split('/').pop() || '';
                        const lastDotIndex = urlPath.lastIndexOf('.');
                        if (lastDotIndex > 0 && lastDotIndex < urlPath.length - 1) {
                          const ext = urlPath.substring(lastDotIndex + 1).toLowerCase();
                          // Validate extension is in allowed list (basic check)
                          const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
                          if (allowedExtensions.includes(ext)) {
                            imageFileExtension = ext;
                          }
                        }
                      } catch (extError) {
                        console.warn('Could not extract extension from URL, using default:', extError);
                      }
                      
                      // Use the blob's MIME type to determine extension if URL extraction failed
                      if (imageFileExtension === 'jpg' && imageBlob.type) {
                        const mimeToExt: Record<string, string> = {
                          'image/jpeg': 'jpg',
                          'image/jpg': 'jpg',
                          'image/png': 'png',
                          'image/gif': 'gif',
                          'image/webp': 'webp',
                          'image/bmp': 'bmp',
                          'image/svg+xml': 'svg',
                        };
                        const extFromMime = mimeToExt[imageBlob.type.toLowerCase()];
                        if (extFromMime) {
                          imageFileExtension = extFromMime;
                        }
                      }
                      
                      coverImageFile = new File([imageBlob], `folder-cover.${imageFileExtension}`, {
                        type: imageBlob.type || 'image/jpeg',
                      });
                    } catch (imageError) {
                      console.warn('Failed to fetch folder image:', imageError);
                      imageFetchFailed = true;
                      // Continue without thumbnail if image fetch fails
                    }
                  }
                  
                  // Try to create folder with image first, fallback to without image if it fails
                  let createdFolder;
                  try {
                    const newFolder = await musicAPI.createFolder({
                      name: folderInfo.name,
                      type: 'announcements',
                      cover_image: coverImageFile,
                    });
                    createdFolder = newFolder;
                  } catch (createError: any) {
                    // If creation with image failed, try without image
                    if (coverImageFile) {
                      console.warn('Failed to create folder with image, trying without image:', createError);
                      try {
                        const newFolderWithoutImage = await musicAPI.createFolder({
                          name: folderInfo.name,
                          type: 'announcements',
                        });
                        createdFolder = newFolderWithoutImage;
                        toast.info(`Folder created without thumbnail (image upload failed)`);
                      } catch (retryError: any) {
                        // If this also fails, throw the original error
                        throw createError;
                      }
                    } else {
                      throw createError;
                    }
                  }
                  
                  if (createdFolder) {
                    // Reload folders to get the latest state from backend
                    const updatedFolders = await musicAPI.getFolders('announcements');
                    setFolders(updatedFolders);
                    
                    // Initialize default folder settings
                    setFolderSettings({
                      ...folderSettings,
                      [createdFolder.id]: {
                        intervalMinutes: 30,
                        intervalSeconds: 0,
                        enabled: false,
                        playlistMode: 'sequential',
                        selectedAnnouncements: [],
                        preventOverlap: true,
                      }
                    });
                    
                    targetFolderId = createdFolder.id;
                  }
                } catch (folderError: any) {
                  console.error('Failed to create folder:', folderError);
                  
                  // Extract error message from various possible formats
                  let errorMessage = 'Unknown error';
                  if (folderError?.message) {
                    errorMessage = folderError.message;
                  } else if (folderError?.response?.data) {
                    const data = folderError.response.data;
                    if (typeof data === 'string') {
                      errorMessage = data;
                    } else if (data.detail) {
                      errorMessage = data.detail;
                    } else if (data.name && Array.isArray(data.name)) {
                      errorMessage = data.name[0];
                    } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
                      errorMessage = data.non_field_errors[0];
                    }
                  }
                  
                  // Check if folder already exists (unique constraint violation)
                  const isUniqueError = errorMessage.toLowerCase().includes('already exists') || 
                                      errorMessage.toLowerCase().includes('unique') || 
                                      errorMessage.toLowerCase().includes('duplicate') ||
                                      errorMessage.toLowerCase().includes('unique_together');
                  
                  if (isUniqueError) {
                    // Try to find the existing folder
                    try {
                      const refreshedFolders = await musicAPI.getFolders('announcements');
                      const foundFolder = refreshedFolders.find(
                        f => f.name.toLowerCase() === folderInfo.name.toLowerCase()
                      );
                      if (foundFolder) {
                        targetFolderId = foundFolder.id;
                        setFolders(refreshedFolders);
                        // Don't show toast for this - it's expected behavior
                      } else {
                        toast.warning(`Folder "${folderInfo.name}" may already exist. Adding to default location.`);
                      }
                    } catch (lookupError) {
                      console.error('Failed to lookup existing folder:', lookupError);
                      toast.warning(`Failed to create folder "${folderInfo.name}". Adding to default location.`);
                    }
                  } else {
                    // Show the actual error for debugging
                    console.error('Folder creation error details:', {
                      error: folderError,
                      message: errorMessage,
                      response: folderError?.response?.data,
                    });
                    toast.error(`Failed to create folder "${folderInfo.name}": ${errorMessage}`);
                  }
                  // Continue without folder if creation fails
                }
              }
            }
            
            // Map template voice type to actual TTS voice IDs
            const voices = await announcementsAPI.getTTSVoices();
            let selectedVoice = 'alloy'; // Default
            
            // Map voice types to OpenAI voices
            const voiceTypeMap: Record<string, string[]> = {
              'friendly': ['nova', 'shimmer', 'alloy'],
              'energetic': ['echo', 'alloy'],
              'professional': ['alloy', 'echo'],
              'calm': ['shimmer', 'nova'],
              'casual': ['nova', 'alloy'],
              'urgent': ['echo', 'alloy'],
            };
            
            const preferredVoices = voiceTypeMap[template.voiceType] || ['alloy'];
            for (const preferred of preferredVoices) {
              const found = voices.find(v => v.id.toLowerCase() === preferred.toLowerCase());
              if (found) {
                selectedVoice = found.id;
                break;
              }
            }
            
            // Create TTS announcement - backend will generate audio synchronously
            const announcement = await announcementsAPI.createTTSAnnouncement({
              title: template.title,
              text: template.script,
              voice: selectedVoice,
              folder_id: targetFolderId,
            });
            
            // Poll for audio file to be ready (backend generates synchronously, but give it a moment)
            let attempts = 0;
            let audioReady = false;
            while (attempts < 10 && !audioReady) {
              await new Promise(resolve => setTimeout(resolve, 500));
              const updated = await announcementsAPI.getAnnouncements();
              const createdAnnouncement = updated.find(a => a.id === announcement.id);
              
              if (createdAnnouncement && createdAnnouncement.url) {
                audioReady = true;
                // Reload all announcements
                const allAnnouncements = await announcementsAPI.getAnnouncements();
                const updatedAudioFiles = allAnnouncements.map(a => ({
                  id: a.id,
                  title: a.title,
                  scriptId: a.id,
                  clientId: user?.clientId || 'client1',
                  url: a.url || '',
                  duration: a.duration || 0,
                  type: a.type || 'tts',
                  enabled: a.enabled ?? true,
                  category: a.folderId || undefined,
                  folderId: a.folderId || undefined,
                  createdAt: a.createdAt || new Date(),
                  createdBy: user?.id || 'user1',
                }));
                
                setAudioFiles(updatedAudioFiles);
                toast.success(`Announcement "${template.title}" created with audio! You can play it now.`);
                break;
              }
              attempts++;
            }
            
            if (!audioReady) {
              // Still reload even if audio isn't ready yet
              const allAnnouncements = await announcementsAPI.getAnnouncements();
              const updatedAudioFiles = allAnnouncements.map(a => ({
                id: a.id,
                title: a.title,
                scriptId: a.id,
                clientId: user?.clientId || 'client1',
                url: a.url || '',
                duration: a.duration || 0,
                type: a.type || 'tts',
                enabled: a.enabled ?? true,
                category: a.folderId || undefined,
                folderId: a.folderId || undefined,
                createdAt: a.createdAt || new Date(),
                createdBy: user?.id || 'user1',
              }));
              
              setAudioFiles(updatedAudioFiles);
              toast.warning(`Announcement "${template.title}" created. Audio may still be generating...`);
            }
          } catch (error: any) {
            console.error('Failed to create announcement from template:', error);
            toast.error(error?.message || 'Failed to create announcement. Please try again.');
            // Fallback: open dialog with template filled in
            setNewTitle(template.title);
            setNewText(template.script);
            setIsCreateOpen(true);
          } finally {
            setIsCreating(false);
          }
        }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <AnnouncementsFolderList
          folders={filteredFolders}
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onFolderSettings={handleOpenFolderSettings}
          audioFiles={audioFiles}
          isCreateFolderOpen={isCreateFolderOpen}
          onCreateFolderOpenChange={setIsCreateFolderOpen}
          newFolderName={newFolderName}
          onNewFolderNameChange={setNewFolderName}
          onCreateFolder={handleCreateFolder}
          isCreatingFolder={isCreatingFolder}
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
                <AnnouncementsListView
                  announcements={searchedAudio}
                  scripts={scripts}
                  folders={folders}
                  playingAudio={playingAudio}
                  onPlay={handlePlay}
                  onToggleEnabled={handleToggleEnabled}
                  onRegenerateVoice={handleRegenerateVoice}
                  onRecalculateDuration={handleRecalculateDuration}
                  onDelete={handleDelete}
                  announcementIcons={announcementIcons}
                  onIconChange={handleIconChange}
                  searchQuery={searchQuery}
                />
              ) : (
                <AnnouncementsGridView
                  announcements={searchedAudio}
                  folders={folders}
                  playingAudio={playingAudio}
                  onPlay={handlePlay}
                  onToggleEnabled={handleToggleEnabled}
                  onRegenerateVoice={handleRegenerateVoice}
                  onRecalculateDuration={handleRecalculateDuration}
                  onDelete={handleDelete}
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
        open={isFolderSettingsOpen}
        onOpenChange={setIsFolderSettingsOpen}
        folderName={selectedFolderForSettings ? folders.find(f => f.id === selectedFolderForSettings)?.name || '' : ''}
        settings={currentFolderSettings}
        announcements={folderAnnouncementsForSettings}
        onSettingsChange={(settings) => {
          if (selectedFolderForSettings) {
            setFolderSettings({
              ...folderSettings,
              [selectedFolderForSettings]: settings,
            });
          }
        }}
        onSave={handleSaveFolderSettings}
      />

      <VoiceManagementDialog
        open={isVoiceDialogOpen}
        onOpenChange={setIsVoiceDialogOpen}
        selectedAnnouncementId={selectedAnnouncementForVoice}
        announcementTitle={selectedAnnouncementForVoice ? audioFiles.find(a => a.id === selectedAnnouncementForVoice)?.title : undefined}
        hasAudio={selectedAnnouncementForVoice ? !!(audioFiles.find(a => a.id === selectedAnnouncementForVoice)?.url) : false}
        ttsVoices={ttsVoices}
        selectedVoice={voiceDialogVoice}
        onVoiceChange={setVoiceDialogVoice}
        onConfirm={handleConfirmVoiceRegeneration}
        isRegenerating={isRegeneratingVoice}
      />

      {/* Voice Selection Dialog for Play */}
      <VoiceManagementDialog
        open={isPlayVoiceDialogOpen}
        onOpenChange={setIsPlayVoiceDialogOpen}
        selectedAnnouncementId={selectedAnnouncementForPlay}
        announcementTitle={selectedAnnouncementForPlay ? audioFiles.find(a => a.id === selectedAnnouncementForPlay)?.title : undefined}
        hasAudio={false}
        ttsVoices={ttsVoices}
        selectedVoice={playVoiceDialogVoice}
        onVoiceChange={setPlayVoiceDialogVoice}
        onConfirm={handleConfirmPlayVoice}
        isRegenerating={isGeneratingForPlay}
      />
    </div>
  );
}