import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Checkbox } from '@/app/components/ui/checkbox';
import { FolderSettings, AnnouncementAudio } from './announcements.types';

interface FolderSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  settings: FolderSettings | null;
  announcements: AnnouncementAudio[];
  onSettingsChange: (settings: FolderSettings) => void;
  onSave: () => void;
}

export function FolderSettingsDialog({
  open,
  onOpenChange,
  folderName,
  settings,
  announcements,
  onSettingsChange,
  onSave,
}: FolderSettingsDialogProps) {
  if (!settings) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Folder Settings: {folderName}</DialogTitle>
          <DialogDescription>
            Configure playlist intervals and playback order. Announcements will automatically duck music.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">Enable Automatic Playlist</Label>
              <p className="text-sm text-slate-500 mt-1">
                Play announcements from this folder on a schedule
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => {
                onSettingsChange({ ...settings, enabled: checked });
              }}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Interval */}
              <div className="space-y-3">
                <Label className="text-base">Playback Interval</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1440"
                      value={settings.intervalMinutes}
                      onChange={(e) => {
                        onSettingsChange({
                          ...settings,
                          intervalMinutes: Math.max(0, parseInt(e.target.value) || 0),
                        });
                      }}
                      className="w-full"
                    />
                  </div>
                  <span className="text-2xl font-bold pt-4">:</span>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Seconds</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={settings.intervalSeconds}
                      onChange={(e) => {
                        onSettingsChange({
                          ...settings,
                          intervalSeconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                        });
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Total interval: {settings.intervalMinutes * 60 + settings.intervalSeconds} seconds between announcements
                </p>
              </div>

              {/* Playlist Mode */}
              <div className="space-y-3">
                <Label className="text-base">Playlist Mode</Label>
                <Select
                  value={settings.playlistMode}
                  onValueChange={(value: 'sequential' | 'random' | 'single') => {
                    onSettingsChange({ ...settings, playlistMode: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential (Play in order)</SelectItem>
                    <SelectItem value="random">Random (Shuffle)</SelectItem>
                    <SelectItem value="single">Single (Rotate one at a time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prevent Overlap */}
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <Label className="text-base">Prevent Overlap</Label>
                  <p className="text-sm text-blue-700 mt-1">
                    Never play announcements over each other (recommended)
                  </p>
                </div>
                <Switch
                  checked={settings.preventOverlap}
                  onCheckedChange={(checked) => {
                    onSettingsChange({ ...settings, preventOverlap: checked });
                  }}
                />
              </div>

              {/* Announcement Selection */}
              <div className="space-y-3">
                <Label className="text-base">Select Announcements ({settings.selectedAnnouncements.length} selected)</Label>
                <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {announcements.map((announcement) => {
                    const isSelected = settings.selectedAnnouncements.includes(announcement.id);
                    return (
                      <label
                        key={announcement.id}
                        className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 min-h-[44px]"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newSelected = checked
                              ? [...settings.selectedAnnouncements, announcement.id]
                              : settings.selectedAnnouncements.filter(id => id !== announcement.id);
                            onSettingsChange({ ...settings, selectedAnnouncements: newSelected });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{announcement.title}</p>
                          <p className="text-xs text-slate-500">
                            {announcement.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  Only selected announcements will be played in this folder's playlist.
                  {settings.preventOverlap && ' Overlap prevention is active.'}
                </p>
              </div>
            </>
          )}

          <Button onClick={onSave} className="w-full">
            Save Folder Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

