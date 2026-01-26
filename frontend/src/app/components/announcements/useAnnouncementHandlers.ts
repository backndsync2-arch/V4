import { useState } from 'react';
import { toast } from 'sonner';
import { announcementsAPI, musicAPI } from '@/lib/api';
import { FolderSettings, Folder, AnnouncementAudio, TTSVoice, GeneratedScript } from './announcements.types';

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
  generatedScripts: GeneratedScript[];
  setGeneratedScripts: (scripts: GeneratedScript[]) => void;
  setIsCreateOpen: (open: boolean) => void;
  setIsCreateFolderOpen: (open: boolean) => void;
  setIsCreating: (creating: boolean) => void;
  setIsUploading: (uploading: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  setIsCreatingFolder: (creating: boolean) => void;
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
  generatedScripts,
  setGeneratedScripts,
  setIsCreateOpen,
  setIsCreateFolderOpen,
  setIsCreating,
  setIsUploading,
  setIsGenerating,
  setIsCreatingFolder,
}: UseAnnouncementHandlersProps) {
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
        { title, folder_id: newCategory || undefined },
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
        })),
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
      setNewCategory('');
      setIsCreateOpen(false);
      toast.success(`Created ${announcements.length} announcement${announcements.length > 1 ? 's' : ''}!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create announcements');
      console.error('Bulk create error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateScript = async () => {
    if (!newTitle.trim() || !newText.trim()) {
      toast.error('Please enter both title and script text');
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
      
      setNewTitle('');
      setNewText('');
      setNewCategory('');
      setIsCreateOpen(false);
      toast.success(`Announcement "${newTitle}" created!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create announcement');
      console.error('Create script error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    handleCreateFolder,
    handleUploadAnnouncement,
    handleGenerateAIScript,
    handleCreateBulkAnnouncements,
    handleCreateScript,
  };
}

