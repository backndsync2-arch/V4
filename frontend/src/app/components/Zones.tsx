import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { usePlayback } from '@/lib/playback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { mockDevices, mockAnnouncementAudio, mockSchedules, mockChannelPlaylists } from '@/lib/mockData';
import { Wifi, WifiOff, Volume2, Radio, Play, Settings, Plus, Grid3x3, Clock, Music } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';

export function Zones() {
  const { user } = useAuth();
  const { playInstantAnnouncement } = usePlayback();
  const [devices, setDevices] = useState(mockDevices);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceVolume, setDeviceVolume] = useState(75);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState('');
  const [zoneSettingsOpen, setZoneSettingsOpen] = useState<Record<string, boolean>>({});
  const [zoneSettings, setZoneSettings] = useState<Record<string, {
    channelPlaylistId: string;
    defaultVolume: number;
    quietHoursStart: string;
    quietHoursEnd: string;
  }>>(({
    'Ground Floor': {
      channelPlaylistId: 'channel1',
      defaultVolume: 75,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
    'First Floor': {
      channelPlaylistId: 'channel2',
      defaultVolume: 70,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
    'Outdoor': {
      channelPlaylistId: 'none',
      defaultVolume: 80,
      quietHoursStart: '23:00',
      quietHoursEnd: '06:00',
    },
  }));

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const filteredDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;
  const availableAnnouncements = clientId 
    ? mockAnnouncementAudio.filter(a => a.clientId === clientId && a.enabled) 
    : mockAnnouncementAudio.filter(a => a.enabled);
  
  const availableChannelPlaylists = clientId
    ? mockChannelPlaylists.filter(cp => cp.clientId === clientId)
    : mockChannelPlaylists;

  // Group devices by zone
  const zones = filteredDevices.reduce((acc, device) => {
    const zone = device.zone || 'Unassigned';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(device);
    return acc;
  }, {} as Record<string, typeof devices>);

  const handlePlayToDevice = (deviceId: string) => {
    if (!selectedAnnouncement) {
      toast.error('Please select an announcement');
      return;
    }
    
    const device = devices.find(d => d.id === deviceId);
    const announcement = availableAnnouncements.find(a => a.id === selectedAnnouncement);
    
    playInstantAnnouncement(selectedAnnouncement, [deviceId]);
    toast.success(`Playing "${announcement?.title}" on ${device?.name}`);
  };

  const handleSetVolume = (deviceId: string, volume: number) => {
    const device = devices.find(d => d.id === deviceId);
    toast.success(`Volume set to ${volume}% on ${device?.name}`);
  };

  const handlePingDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    toast.info(`Pinging ${device?.name}...`, {
      description: 'Test tone will play in 2 seconds',
    });
  };

  const handleSendSchedule = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    toast.success(`Schedule sent to ${device?.name}`, {
      description: 'Device will sync and apply new schedule',
    });
  };

  const handleOpenZoneSettings = (zoneName: string) => {
    setZoneSettingsOpen(prev => ({
      ...prev,
      [zoneName]: true,
    }));
  };

  const handleCloseZoneSettings = (zoneName: string) => {
    setZoneSettingsOpen(prev => ({
      ...prev,
      [zoneName]: false,
    }));
  };

  const handleSaveZoneSettings = (zoneName: string) => {
    toast.success(`Settings saved for ${zoneName}`);
    handleCloseZoneSettings(zoneName);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-slate-600">Manage zones and devices across your business</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Register a new speaker or player device
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Device Name</Label>
                  <Input placeholder="e.g., Ground Floor Speaker 1" />
                </div>
                <div className="space-y-2">
                  <Label>Device ID</Label>
                  <Input placeholder="Enter device ID" />
                </div>
                <div className="space-y-2">
                  <Label>Assign to Zone</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(zones).map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => {
                  toast.success('Device added successfully');
                }}>
                  Add Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Zone</DialogTitle>
                <DialogDescription>
                  Create a new zone to organize your devices by location
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Zone Name</Label>
                  <Input placeholder="e.g., Kitchen, Outdoor Patio" />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input placeholder="Describe this zone..." />
                </div>
                <Button className="w-full" onClick={() => {
                  toast.success('Zone created successfully');
                }}>
                  Create Zone
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Zone Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Zones</p>
                <p className="text-3xl font-bold mt-2">{Object.keys(zones).length}</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-[#1db954]/20 to-[#1ed760]/10">
                <Grid3x3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Online Devices</p>
                <p className="text-3xl font-bold mt-2">
                  {filteredDevices.filter(d => d.status === 'online').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <Wifi className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Offline Devices</p>
                <p className="text-3xl font-bold mt-2">
                  {filteredDevices.filter(d => d.status === 'offline').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/10">
                <WifiOff className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones List */}
      {Object.entries(zones).map(([zoneName, zoneDevices]) => (
        <Card key={zoneName}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{zoneName}</CardTitle>
                <CardDescription>
                  {zoneDevices.filter(d => d.status === 'online').length}/{zoneDevices.length} devices online
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleOpenZoneSettings(zoneName)}>
                <Settings className="h-4 w-4 mr-2" />
                Zone Settings
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {zoneDevices.map((device) => (
                <Dialog key={device.id}>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {device.status === 'online' ? (
                        <Wifi className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{device.name}</p>
                        <p className="text-sm text-gray-400">
                          Last seen: {formatRelativeTime(device.lastSeen)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Control
                        </Button>
                      </DialogTrigger>
                    </div>
                  </div>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{device.name}</DialogTitle>
                      <DialogDescription>Device controls and settings</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                      {/* Status */}
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-sm font-medium">Status</span>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </div>

                      {/* Volume Control */}
                      <div className="space-y-2">
                        <Label>Device Volume</Label>
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-4 w-4 text-gray-400 shrink-0" />
                          <Slider
                            value={[deviceVolume]}
                            max={100}
                            step={1}
                            onValueChange={(value) => {
                              setDeviceVolume(value[0]);
                              handleSetVolume(device.id, value[0]);
                            }}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-400 w-10 text-right">
                            {deviceVolume}%
                          </span>
                        </div>
                      </div>

                      {/* Play Announcement */}
                      <div className="space-y-2">
                        <Label>Play Announcement</Label>
                        <div className="flex gap-2">
                          <Select value={selectedAnnouncement} onValueChange={setSelectedAnnouncement}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select announcement" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAnnouncements.map(audio => (
                                <SelectItem key={audio.id} value={audio.id}>
                                  {audio.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={() => handlePlayToDevice(device.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Play
                          </Button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => handlePingDevice(device.id)}
                          disabled={device.status === 'offline'}
                        >
                          Play Test Tone
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleSendSchedule(device.id)}
                          disabled={device.status === 'offline'}
                        >
                          Sync Schedule
                        </Button>
                      </div>

                      {/* Device Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Zone</span>
                          <span className="font-medium">{device.zone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last Seen</span>
                          <span className="font-medium">{formatRelativeTime(device.lastSeen)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Device ID</span>
                          <span className="font-mono text-xs">{device.id}</span>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Zone Settings Dialogs */}
      {Object.entries(zones).map(([zoneName, zoneDevices]) => {
        const currentSettings = zoneSettings[zoneName] || {
          channelPlaylistId: 'none',
          defaultVolume: 75,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        };
        
        const assignedPlaylist = currentSettings.channelPlaylistId !== 'none' 
          ? availableChannelPlaylists.find(cp => cp.id === currentSettings.channelPlaylistId)
          : undefined;

        // Get active schedules for this zone
        const zoneSchedules = mockSchedules.filter(schedule => 
          schedule.targetDevices?.some(deviceId => 
            zoneDevices.some(d => d.id === deviceId)
          )
        );

        return (
          <Dialog 
            key={`settings-${zoneName}`}
            open={zoneSettingsOpen[zoneName] || false}
            onOpenChange={(open) => {
              if (!open) handleCloseZoneSettings(zoneName);
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{zoneName} Settings</DialogTitle>
                <DialogDescription>
                  Configure channel playlist, volume, and quiet hours for this zone
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Channel Playlist Assignment */}
                <div className="space-y-3">
                  <Label>Channel Playlist</Label>
                  <Select 
                    value={currentSettings.channelPlaylistId}
                    onValueChange={(value) => {
                      setZoneSettings(prev => ({
                        ...prev,
                        [zoneName]: {
                          ...currentSettings,
                          channelPlaylistId: value,
                        },
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel playlist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableChannelPlaylists.map(playlist => (
                        <SelectItem key={playlist.id} value={playlist.id}>
                          {playlist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignedPlaylist && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <Music className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-900">{assignedPlaylist.name}</p>
                          <p className="text-xs text-blue-700">{assignedPlaylist.description}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {assignedPlaylist.items.length} items
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-blue-700">
                        <span>Music: every {assignedPlaylist.defaultMusicInterval} min</span>
                        <span>Announcements: every {assignedPlaylist.defaultAnnouncementInterval} min</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Default Volume */}
                <div className="space-y-3">
                  <Label>Default Volume</Label>
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <Slider
                      value={[currentSettings.defaultVolume]}
                      max={100}
                      step={1}
                      onValueChange={(value) => {
                        setZoneSettings(prev => ({
                          ...prev,
                          [zoneName]: {
                            ...currentSettings,
                            defaultVolume: value[0],
                          },
                        }));
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-10 text-right">
                      {currentSettings.defaultVolume}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    This volume will be applied to all devices in this zone
                  </p>
                </div>

                {/* Quiet Hours */}
                <div className="space-y-3">
                  <Label>Quiet Hours</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400">Start Time</Label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                        <Input
                          type="time"
                          value={currentSettings.quietHoursStart}
                          onChange={(e) => {
                            setZoneSettings(prev => ({
                              ...prev,
                              [zoneName]: {
                                ...currentSettings,
                                quietHoursStart: e.target.value,
                              },
                            }));
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400">End Time</Label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                        <Input
                          type="time"
                          value={currentSettings.quietHoursEnd}
                          onChange={(e) => {
                            setZoneSettings(prev => ({
                              ...prev,
                              [zoneName]: {
                                ...currentSettings,
                                quietHoursEnd: e.target.value,
                              },
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Playback will automatically pause during quiet hours
                  </p>
                </div>

                {/* Active Schedules */}
                <div className="space-y-3">
                  <Label>Active Schedules ({zoneSchedules.length})</Label>
                  {zoneSchedules.length > 0 ? (
                    <div className="space-y-2">
                      {zoneSchedules.map(schedule => (
                        <div key={schedule.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{schedule.name}</p>
                              <p className="text-xs text-gray-400">
                                {schedule.startTime} - {schedule.endTime}
                              </p>
                            </div>
                            <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                              {schedule.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-4 text-center bg-white/5 rounded-lg">
                      No active schedules for this zone
                    </p>
                  )}
                </div>

                {/* Devices in Zone */}
                <div className="space-y-3">
                  <Label>Devices in Zone ({zoneDevices.length})</Label>
                  <div className="space-y-2">
                    {zoneDevices.map(device => (
                      <div key={device.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          {device.status === 'online' ? (
                            <Wifi className="h-4 w-4 text-green-600" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="text-sm font-medium">{device.name}</span>
                        </div>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => handleCloseZoneSettings(zoneName)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleSaveZoneSettings(zoneName)}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}