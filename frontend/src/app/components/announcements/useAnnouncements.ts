import { useState, useEffect } from 'react';
import { announcementsAPI, musicAPI } from '@/lib/api';
import { toast } from 'sonner';
import type { Folder, AnnouncementAudio } from '@/lib/types';

export interface FolderSettings {
  intervalMinutes: number;
  intervalSeconds: number;
  enabled: boolean;
  playlistMode: 'sequential' | 'random' | 'single';
  selectedAnnouncements: string[];
  preventOverlap: boolean;
}

export function useAnnouncements(user: any) {
  const [audioFiles, setAudioFiles] = useState<AnnouncementAudio[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [ttsVoices, setTtsVoices] = useState<Array<{id: string; name: string; gender: string; accent: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load folders from backend
        const announcementFolders = await musicAPI.getFolders('announcements');
        setFolders(announcementFolders);
        
        // Load real announcements from backend
        const announcements = await announcementsAPI.getAnnouncements();
        setAudioFiles(announcements);
        
        // Extract scripts from TTS announcements
        const ttsScripts = announcements
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
        
        // Load TTS voices
        const voices = await announcementsAPI.getTTSVoices();
        setTtsVoices(voices);
      } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback voices if API fails
        setTtsVoices([
          { id: 'alloy', name: 'Alloy (Neutral)', gender: 'neutral', accent: 'US' },
          { id: 'echo', name: 'Echo (Male)', gender: 'male', accent: 'US' },
          { id: 'nova', name: 'Nova (Female)', gender: 'female', accent: 'US' },
          { id: 'shimmer', name: 'Shimmer (Female)', gender: 'female', accent: 'US' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const filteredFolders = clientId ? folders.filter(f => f.clientId === clientId) : folders;

  const getFolderStats = (folderId: string) => {
    const folderAnnouncements = audioFiles.filter(a => a.category === folderId || a.folderId === folderId);
    const enabled = folderAnnouncements.filter(a => a.enabled).length;
    const total = folderAnnouncements.length;
    const totalDuration = folderAnnouncements.reduce((sum, a) => sum + (a.duration || 0), 0);
    return { enabled, total, totalDuration };
  };

  const createFolder = async (name: string) => {
    const newFolder = await musicAPI.createFolder({
      name,
      type: 'announcements',
    });
    setFolders([...folders, newFolder]);
    return newFolder;
  };

  const deleteAnnouncement = async (id: string) => {
    await announcementsAPI.deleteAnnouncement(id);
    setAudioFiles(prev => prev.filter(a => a.id !== id));
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  const toggleEnabled = async (id: string) => {
    const audio = audioFiles.find(a => a.id === id);
    if (!audio) return;
    
    try {
      await announcementsAPI.updateAnnouncement(id, { enabled: !audio.enabled });
      setAudioFiles(prev => prev.map(a => 
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ));
    } catch (error: any) {
      toast.error(error.message || 'Failed to update announcement');
    }
  };

  return {
    audioFiles,
    folders: filteredFolders,
    scripts,
    ttsVoices,
    isLoading,
    clientId,
    getFolderStats,
    createFolder,
    deleteAnnouncement,
    toggleEnabled,
    setAudioFiles,
    setFolders,
  };
}

