import { useState, useEffect } from 'react';
import { announcementsAPI, musicAPI, zonesAPI } from '@/lib/api';
import { Folder, AnnouncementAudio, TTSVoice } from './announcements.types';
import { toast } from 'sonner';

export function useAnnouncementsData() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [audioFiles, setAudioFiles] = useState<AnnouncementAudio[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [ttsVoices, setTtsVoices] = useState<TTSVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
          setDevices([]);
        }
        
        // IMMEDIATELY recalculate duration for announcements with 0 duration that have audio files
        const announcementsNeedingDuration = announcements.filter(a => 
          a.duration === 0 && a.url && a.url !== '' && a.url !== '#'
        );
        if (announcementsNeedingDuration.length > 0) {
          console.log(`Found ${announcementsNeedingDuration.length} announcements with 0:00 duration, recalculating immediately...`);
          const recalculationPromises = announcementsNeedingDuration.map(a => 
            announcementsAPI.recalculateDuration(a.id).catch(err => {
              console.warn(`Failed to recalculate duration for ${a.id}:`, err);
              return null;
            })
          );
          
          Promise.all(recalculationPromises).then(() => {
            return new Promise(resolve => setTimeout(resolve, 500));
          }).then(() => {
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
    
    // Periodic check for announcements with 0:00 duration (every 10 seconds)
    const durationCheckInterval = setInterval(async () => {
      try {
        const announcements = await announcementsAPI.getAnnouncements();
        const needsRecalculation = announcements.filter(a => 
          a.duration === 0 && a.url && a.url !== '' && a.url !== '#'
        );
        
        if (needsRecalculation.length > 0) {
          console.log(`Periodic check: Found ${needsRecalculation.length} announcements with 0:00, recalculating...`);
          Promise.all(
            needsRecalculation.map(a => 
              announcementsAPI.recalculateDuration(a.id).catch(err => {
                console.warn(`Failed to recalculate duration for ${a.id}:`, err);
                return null;
              })
            )
          ).then(() => {
            return announcementsAPI.getAnnouncements();
          }).then(updated => {
            setAudioFiles(updated);
          }).catch(err => {
            console.error('Error in periodic duration check:', err);
          });
        }
      } catch (error) {
        console.error('Error in periodic duration check:', error);
      }
    }, 10000);
    
    return () => clearInterval(durationCheckInterval);
  }, []);

  return {
    scripts,
    setScripts,
    audioFiles,
    setAudioFiles,
    folders,
    setFolders,
    devices,
    setDevices,
    ttsVoices,
    setTtsVoices,
    isLoading,
  };
}


