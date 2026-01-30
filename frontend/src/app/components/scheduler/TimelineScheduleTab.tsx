import React from 'react';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { AnnouncementPreview } from './AnnouncementPreview';

interface TimelineScheduleTabProps {
  cycleDuration: string;
  onCycleDurationChange: (value: string) => void;
  timelineSlots: { announcementId: string; timestampSeconds: number }[];
  onTimelineSlotsChange: (slots: { announcementId: string; timestampSeconds: number }[]) => void;
  availableAudio: any[];
  onAddSlot: () => void;
}

export function TimelineScheduleTab({
  cycleDuration,
  onCycleDurationChange,
  timelineSlots,
  onTimelineSlotsChange,
  availableAudio,
  onAddSlot,
}: TimelineScheduleTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cycle Duration (minutes)</Label>
        <Input
          type="number"
          min="1"
          value={cycleDuration}
          onChange={(e) => onCycleDurationChange(e.target.value)}
        />
        <p className="text-sm text-gray-400">
          The schedule will repeat every {cycleDuration} minutes
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Timeline Slots</Label>
          <Button size="sm" variant="outline" onClick={onAddSlot}>
            <Plus className="h-4 w-4 mr-2" />
            Add Slot
          </Button>
        </div>
        <div className="space-y-3 border rounded-lg p-3">
          {timelineSlots.map((slot, index) => {
            const selectedAudio = availableAudio.find(a => a.id === slot.announcementId);
            return (
              <div key={index} className="flex items-center gap-3">
                <Select
                  value={slot.announcementId}
                  onValueChange={(value) => {
                    const newSlots = [...timelineSlots];
                    newSlots[index].announcementId = value;
                    onTimelineSlotsChange(newSlots);
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAudio.map(audio => (
                      <SelectItem key={audio.id} value={audio.id}>
                        {audio.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAudio && (
                  <AnnouncementPreview audio={selectedAudio} size="sm" />
                )}
              <div className="flex items-center gap-2">
                <Label>At</Label>
                <Input
                  type="number"
                  min="0"
                  max={parseInt(cycleDuration) * 60}
                  placeholder="Seconds"
                  className="w-24"
                  value={slot.timestampSeconds}
                  onChange={(e) => {
                    const newSlots = [...timelineSlots];
                    newSlots[index].timestampSeconds = parseInt(e.target.value) || 0;
                    onTimelineSlotsChange(newSlots);
                  }}
                />
                <span className="text-sm text-gray-400">sec</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onTimelineSlotsChange(timelineSlots.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            );
          })}
          {timelineSlots.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No slots added yet. Click "Add Slot" to begin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

