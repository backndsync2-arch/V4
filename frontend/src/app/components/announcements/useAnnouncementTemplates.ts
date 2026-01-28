import { toast } from 'sonner';
import { announcementsAPI, musicAPI } from '@/lib/api';
import { type AnnouncementTemplate } from '@/lib/mockData';
import { AnnouncementAudio } from './announcements.types';

interface UseAnnouncementTemplatesProps {
  user: any;
  audioFiles: AnnouncementAudio[];
  setAudioFiles: (files: AnnouncementAudio[] | ((prev: AnnouncementAudio[]) => AnnouncementAudio[])) => void;
  folders: any[];
  setFolders: (folders: any[] | ((prev: any[]) => any[])) => void;
  folderSettings: Record<string, any>;
  setFolderSettings: (settings: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  newCategory: string;
  setNewCategory: (category: string) => void;
  setIsCreateOpen: (open: boolean) => void;
  setIsCreating: (creating: boolean) => void;
  setNewTitle: (title: string) => void;
  setNewText: (text: string) => void;
  activeTarget?: string | null;
}

export function useAnnouncementTemplates({
  user,
  audioFiles,
  setAudioFiles,
  folders,
  setFolders,
  folderSettings,
  setFolderSettings,
  newCategory,
  setNewCategory,
  setIsCreateOpen,
  setIsCreating,
  setNewTitle,
  setNewText,
  activeTarget,
}: UseAnnouncementTemplatesProps) {
  const handleAnnouncementsCreated = async () => {
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
  };

  const handleUseTemplate = async (template: AnnouncementTemplate, folderInfo?: { name: string; image?: string }) => {
    try {
      setIsCreating(true);
      toast.info(`Creating announcement: ${template.title}...`);
      
      let targetFolderId: string | undefined = newCategory || undefined;
      
      if (folderInfo) {
        let allFolders = folders;
        try {
          allFolders = await musicAPI.getFolders('announcements');
          setFolders(allFolders);
        } catch (reloadError) {
          console.warn('Failed to reload folders, using cached list:', reloadError);
        }
        
        const existingFolder = allFolders.find(
          f => f.name.toLowerCase() === folderInfo.name.toLowerCase() && f.type === 'announcements'
        );
        
        if (existingFolder) {
          targetFolderId = existingFolder.id;
        } else {
          try {
            let coverImageFile: File | undefined;
            let imageFetchFailed = false;
            
            if (folderInfo.image && folderInfo.image.startsWith('http')) {
              try {
                const imageResponse = await fetch(folderInfo.image, { mode: 'cors' });
                if (!imageResponse.ok) {
                  throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`);
                }
                const imageBlob = await imageResponse.blob();
                
                if (!imageBlob.type.startsWith('image/')) {
                  throw new Error('Fetched file is not an image');
                }
                
                let imageFileExtension = 'jpg';
                try {
                  const urlWithoutQuery = folderInfo.image.split('?')[0];
                  const urlPath = urlWithoutQuery.split('/').pop() || '';
                  const lastDotIndex = urlPath.lastIndexOf('.');
                  if (lastDotIndex > 0 && lastDotIndex < urlPath.length - 1) {
                    const ext = urlPath.substring(lastDotIndex + 1).toLowerCase();
                    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
                    if (allowedExtensions.includes(ext)) {
                      imageFileExtension = ext;
                    }
                  }
                } catch (extError) {
                  console.warn('Could not extract extension from URL, using default:', extError);
                }
                
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
              }
            }
            
            let createdFolder;
            try {
              const newFolder = await musicAPI.createFolder({
                name: folderInfo.name,
                type: 'announcements',
                cover_image: coverImageFile,
              });
              createdFolder = newFolder;
            } catch (createError: any) {
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
                  throw createError;
                }
              } else {
                throw createError;
              }
            }
            
            if (createdFolder) {
              const updatedFolders = await musicAPI.getFolders('announcements');
              setFolders(updatedFolders);
              
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
            
            const isUniqueError = errorMessage.toLowerCase().includes('already exists') || 
                                errorMessage.toLowerCase().includes('unique') || 
                                errorMessage.toLowerCase().includes('duplicate') ||
                                errorMessage.toLowerCase().includes('unique_together');
            
            if (isUniqueError) {
              try {
                const refreshedFolders = await musicAPI.getFolders('announcements');
                const foundFolder = refreshedFolders.find(
                  f => f.name.toLowerCase() === folderInfo.name.toLowerCase()
                );
                if (foundFolder) {
                  targetFolderId = foundFolder.id;
                  setFolders(refreshedFolders);
                } else {
                  toast.warning(`Folder "${folderInfo.name}" may already exist. Adding to default location.`);
                }
              } catch (lookupError) {
                console.error('Failed to lookup existing folder:', lookupError);
                toast.warning(`Failed to create folder "${folderInfo.name}". Adding to default location.`);
              }
            } else {
              console.error('Folder creation error details:', {
                error: folderError,
                message: errorMessage,
                response: folderError?.response?.data,
              });
              toast.error(`Failed to create folder "${folderInfo.name}": ${errorMessage}`);
            }
          }
        }
      }
      
      const voices = await announcementsAPI.getTTSVoices();
      // Default to fable (UK English) if available
      let selectedVoice = 'fable';
      const fableVoice = voices.find((v: any) => v.id === 'fable');
      if (!fableVoice) {
        selectedVoice = voices[0]?.id || 'fable';
      }
      
      // Prioritize fable (UK English) in voice type mappings
      const voiceTypeMap: Record<string, string[]> = {
        'friendly': ['fable', 'nova', 'shimmer'],
        'energetic': ['fable', 'echo'],
        'professional': ['fable', 'alloy', 'echo'],
        'calm': ['fable', 'shimmer', 'nova'],
        'casual': ['fable', 'nova'],
        'urgent': ['fable', 'echo'],
      };
      
      const preferredVoices = voiceTypeMap[template.voiceType] || ['fable'];
      for (const preferred of preferredVoices) {
        const found = voices.find(v => v.id.toLowerCase() === preferred.toLowerCase());
        if (found) {
          selectedVoice = found.id;
          break;
        }
      }
      
      const announcement = await announcementsAPI.createTTSAnnouncement({
        title: template.title,
        text: template.script,
        voice: selectedVoice,
        folder_id: targetFolderId,
        zone_id: activeTarget || undefined,
      });
      
      let attempts = 0;
      let audioReady = false;
      while (attempts < 10 && !audioReady) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const updated = await announcementsAPI.getAnnouncements();
        const createdAnnouncement = updated.find(a => a.id === announcement.id);
        
        if (createdAnnouncement && createdAnnouncement.url) {
          audioReady = true;
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
      setNewTitle(template.title);
      setNewText(template.script);
      setIsCreateOpen(true);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    handleAnnouncementsCreated,
    handleUseTemplate,
  };
}


