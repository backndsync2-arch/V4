import React from 'react';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Radio } from 'lucide-react';
import { AnnouncementPreview } from './AnnouncementPreview';

interface IntervalScheduleTabProps {
  intervalMinutes: string;
  onIntervalMinutesChange: (value: string) => void;
  availableAudio: any[];
  selectedAnnouncements: string[];
  onAnnouncementsChange: (ids: string[]) => void;
}

export function IntervalScheduleTab({
  intervalMinutes,
  onIntervalMinutesChange,
  availableAudio,
  selectedAnnouncements,
  onAnnouncementsChange,
}: IntervalScheduleTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Play Every (minutes)</Label>
        <Input
          type="number"
          min="1"
          value={intervalMinutes}
          onChange={(e) => onIntervalMinutesChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Announcements</Label>
          {availableAudio.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (selectedAnnouncements.length === availableAudio.length) {
                  onAnnouncementsChange([]);
                } else {
                  onAnnouncementsChange(availableAudio.map(a => a.id));
                }
              }}
            >
              {selectedAnnouncements.length === availableAudio.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto border border-white/10 rounded-lg p-3 bg-[#2a2a2a]">
          {availableAudio.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No announcements available. Create announcements first.</p>
          ) : (
            availableAudio.map(audio => {
              const isSelected = selectedAnnouncements.includes(audio.id);
              return (
                <label
                  key={audio.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1db954]/20 border-[#1db954] shadow-sm'
                      : 'bg-[#1a1a1a] border-white/10 hover:border-[#1db954]/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onAnnouncementsChange([...selectedAnnouncements, audio.id]);
                      } else {
                        onAnnouncementsChange(selectedAnnouncements.filter(id => id !== audio.id));
                      }
                    }}
                    className="rounded h-4 w-4"
                  />
                  <Radio className={`h-4 w-4 ${isSelected ? 'text-[#1db954]' : 'text-gray-400'}`} />
                  <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>{audio.title}</span>
                  <AnnouncementPreview audio={audio} size="sm" />
                  {isSelected && (
                    <Badge variant="secondary" className="bg-[#1db954] text-white">
                      Selected
                    </Badge>
                  )}
                </label>
              );
            })
          )}
        </div>
        {selectedAnnouncements.length > 0 && (
          <p className="text-xs text-gray-400">
            {selectedAnnouncements.length} announcement{selectedAnnouncements.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

    </div>
  );
}

