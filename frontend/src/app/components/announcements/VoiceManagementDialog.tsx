import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Play } from 'lucide-react';
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
  const handlePreview = async () => {
    try {
      const result = await announcementsAPI.previewVoice({
        text: 'Hello, this is a preview of the selected voice.',
        voice: selectedVoice,
      });
      if (result.preview_url) {
        const audio = new Audio(result.preview_url);
        await audio.play();
        toast.success('Playing voice preview...');
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview voice');
    }
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
            <div className="grid grid-cols-3 gap-2">
              {ttsVoices.map((voice) => {
                const getAvatarUrl = (voiceId: string) => {
                  const avatars: Record<string, string> = {
                    'fable': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fable&backgroundColor=b6e3f4',
                    'alloy': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alloy&backgroundColor=c7d2fe',
                    'echo': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Echo&backgroundColor=ffd5db',
                    'onyx': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Onyx&backgroundColor=ffdfbf',
                    'nova': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova&backgroundColor=d1fae5',
                    'shimmer': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shimmer&backgroundColor=fce7f3',
                  };
                  return avatars[voiceId] || avatars['alloy'];
                };
                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => onVoiceChange(voice.id)}
                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      selectedVoice === voice.id
                        ? 'border-[#1db954] bg-[#1db954]/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]">
                      <img 
                        src={getAvatarUrl(voice.id)}
                        alt={voice.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedVoice === voice.id && (
                        <div className="absolute inset-0 bg-[#1db954]/20" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-white text-center">{voice.name.split('(')[0].trim()}</span>
                    <span className="text-xs text-gray-400">{voice.accent || 'UK'}</span>
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
            >
              <Play className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              className="flex-1"
              onClick={onConfirm}
              disabled={!selectedVoice || isRegenerating}
            >
              {isRegenerating ? 'Generating...' : hasAudio ? 'Confirm & Save' : 'Generate & Play'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

