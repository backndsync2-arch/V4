import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Volume2 } from 'lucide-react';
import { AnnouncementAudio } from './announcements.types';

interface InstantPlayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcements: AnnouncementAudio[];
  devices: any[];
  selectedAnnouncement: string;
  onAnnouncementChange: (id: string) => void;
  selectedDevices: string[];
  onDevicesChange: (devices: string[]) => void;
  onSend: () => void;
  isSending: boolean;
}

export function InstantPlayDialog({
  open,
  onOpenChange,
  announcements,
  devices,
  selectedAnnouncement,
  onAnnouncementChange,
  selectedDevices,
  onDevicesChange,
  onSend,
  isSending,
}: InstantPlayDialogProps) {
  const availableDevices = devices;
  
  // Filter enabled announcements and remove duplicates by name
  // If multiple announcements have the same name, keep the most recent one with a valid URL
  const enabledAnnouncements = announcements
    .filter(a => a.enabled)
    .reduce((unique: AnnouncementAudio[], current) => {
      const existing = unique.find(a => a.title.toLowerCase().trim() === current.title.toLowerCase().trim());
      
      if (!existing) {
        // First occurrence of this name
        unique.push(current);
      } else {
        // Duplicate name found - keep the one with better quality
        // Prefer: has URL > more recent > longer duration
        const currentHasUrl = current.url && current.url !== '#' && current.url !== '';
        const existingHasUrl = existing.url && existing.url !== '#' && existing.url !== '';
        
        if (currentHasUrl && !existingHasUrl) {
          // Current has URL, existing doesn't - replace
          const index = unique.indexOf(existing);
          unique[index] = current;
        } else if (currentHasUrl === existingHasUrl) {
          // Both have URL or both don't - prefer more recent or longer duration
          const currentDate = current.createdAt ? new Date(current.createdAt).getTime() : 0;
          const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
          
          if (currentDate > existingDate) {
            // Current is more recent
            const index = unique.indexOf(existing);
            unique[index] = current;
          } else if (currentDate === existingDate && (current.duration || 0) > (existing.duration || 0)) {
            // Same date, but current has longer duration (likely more complete)
            const index = unique.indexOf(existing);
            unique[index] = current;
          }
        }
      }
      
      return unique;
    }, [])
    .sort((a, b) => a.title.localeCompare(b.title)); // Sort alphabetically

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Play Instant Announcement</DialogTitle>
          <DialogDescription className="text-gray-400">
            Trigger an announcement to play immediately on selected devices (ducks music automatically)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Select Announcement</Label>
            <Select value={selectedAnnouncement} onValueChange={onAnnouncementChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose announcement" />
              </SelectTrigger>
              <SelectContent>
                {enabledAnnouncements.map(audio => (
                  <SelectItem key={audio.id} value={audio.id}>
                    {audio.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Select Devices</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-white/10 rounded-lg p-3 bg-white/5">
              {availableDevices.map(device => (
                <label key={device.id} className="flex items-center gap-2 cursor-pointer min-h-[44px] hover:bg-white/10 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedDevices.includes(device.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onDevicesChange([...selectedDevices, device.id]);
                      } else {
                        onDevicesChange(selectedDevices.filter(id => id !== device.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-white">{device.name}</span>
                  <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="ml-auto">
                    {device.status}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={onSend} className="w-full" disabled={isSending}>
            <Volume2 className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

