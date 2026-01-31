import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Play, Pause, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { announcementsAPI } from '@/lib/api';
import { TTSVoice } from './announcements.types';

interface VoiceManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAnnouncementId: string | null;
  announcementTitle?: string;
  hasAudio: boolean;
  ttsVoices: TTSVoice[];
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  onConfirm: () => void;
  isRegenerating: boolean;
}

export function VoiceManagementDialog({
  open,
  onOpenChange,
  selectedAnnouncementId,
  announcementTitle,
  hasAudio,
  ttsVoices,
  selectedVoice,
  onVoiceChange,
  onConfirm,
  isRegenerating,
}: VoiceManagementDialogProps) {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const previewText = 'Hello, this is a preview of the selected voice. How does this sound?';

  const handleVoiceClick = async (voiceId: string) => {
    // Select the voice
    onVoiceChange(voiceId);
    
    // If already previewing this voice, stop it
    if (previewingVoice === voiceId && previewAudio) {
      previewAudio.pause();
      setPreviewingVoice(null);
      setPreviewAudio(null);
      return;
    }
    
    // Stop any currently playing preview
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }
    
    // Start preview for the clicked voice
    setPreviewingVoice(voiceId);
    try {
      const result = await announcementsAPI.previewVoice({
        text: previewText,
        voice: voiceId,
      });
      
      // Check for error response
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (!result.preview_url) {
        throw new Error('No preview URL returned from server');
      }
      
      const audio = new Audio(result.preview_url);
      setPreviewAudio(audio);
      
      audio.addEventListener('ended', () => {
        setPreviewingVoice(null);
        setPreviewAudio(null);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        toast.error('Failed to play audio. Please check your browser audio settings.');
        setPreviewingVoice(null);
        setPreviewAudio(null);
      });
      
      try {
        await audio.play();
      } catch (playError: any) {
        console.error('Audio play error:', playError);
        if (playError.name === 'NotAllowedError') {
          toast.error('Please click the play button to start audio (browser autoplay restriction)');
        } else {
          toast.error(`Failed to play audio: ${playError.message}`);
        }
        setPreviewingVoice(null);
        setPreviewAudio(null);
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      const errorMessage = error?.error || error?.message || 'Failed to preview voice';
      toast.error(errorMessage);
      setPreviewingVoice(null);
      setPreviewAudio(null);
    }
  };

  const handlePreview = async () => {
    if (!selectedVoice) return;
    await handleVoiceClick(selectedVoice);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">
            {hasAudio ? 'Change Announcement Voice' : 'Select Voice to Generate & Play'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {announcementTitle ? `${announcementTitle} - Select a voice to generate audio` : 'Select a voice for this announcement'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Select Voice</Label>
            <div className="grid grid-cols-3 gap-3">
              {ttsVoices.map((voice) => {
                // Use professional image from API or fallback to Unsplash
                const getAvatarUrl = (voice: any) => {
                  if (voice.image_url) {
                    return voice.image_url;
                  }
                  // Fallback professional images - matched to voice genders
                  // Male voices: echo, fable, onyx
                  // Female voices: nova, shimmer, alloy
                  const fallbackImages: Record<string, string> = {
                    // Male voices - professional male headshots
                    'echo': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
                    'fable': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
                    'onyx': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
                    // Female voices - professional female headshots
                    'nova': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
                    'shimmer': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
                    'alloy': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
                  };
                  return fallbackImages[voice.id] || fallbackImages['alloy'];
                };
                const isPreviewing = previewingVoice === voice.id;
                const isSelected = selectedVoice === voice.id;
                
                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => handleVoiceClick(voice.id)}
                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-[#1db954] bg-[#1db954]/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    } ${isPreviewing ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                  >
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] ring-2 ring-white/10">
                      <img 
                        src={getAvatarUrl(voice)}
                        alt={voice.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#1db954]/20" />
                      )}
                      {isPreviewing && (
                        <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                          <Volume2 className="h-6 w-6 text-white animate-pulse" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-white text-center">{voice.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{voice.gender || 'neutral'}</span>
                    {voice.description && (
                      <span className="text-xs text-gray-500 text-center px-1 line-clamp-2">{voice.description}</span>
                    )}
                    {isPreviewing && (
                      <span className="text-xs text-blue-400 font-medium">Playing...</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePreview}
              disabled={!selectedVoice}
            >
              {previewingVoice === selectedVoice ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Preview
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Preview Selected
                </>
              )}
            </Button>
            <Button
              className="flex-1"
              onClick={onConfirm}
              disabled={!selectedVoice || isRegenerating}
            >
              {isRegenerating ? 'Generating...' : hasAudio ? 'Confirm & Save' : 'Generate & Play'}
            </Button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            💡 Click on any voice to preview it instantly
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

