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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasAudio ? 'Change Announcement Voice' : 'Select Voice to Generate & Play'}
          </DialogTitle>
          <DialogDescription>
            {announcementTitle ? `${announcementTitle} - Select a voice to generate audio` : 'Select a voice for this announcement'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Voice</Label>
            <Select value={selectedVoice} onValueChange={onVoiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {ttsVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender}, {voice.accent})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

