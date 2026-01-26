import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { usePlayback } from '@/lib/playback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { zonesAPI, announcementsAPI, schedulerAPI, wsClient } from '@/lib/api';
import { Wifi, WifiOff, Volume2, Play, Settings, Plus, Grid3x3, Clock } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import type { Device, Zone, Announcement, Schedule } from '@/lib/types';

export function Zones() {
  const { user } = useAuth();
  const { playInstantAnnouncement } = usePlayback();
  const {
    zones,
    devices,
    announcements,
    schedules,
    isLoading: loadingStates,
    createZone,
    updateZone,
    deleteZone,
  } = useFiles();

  const [isLoading, setIsLoading] = useState(true);
  const [deviceVolume, setDeviceVolume] = useState(100); // Full volume by default
  const [selectedAnnouncement, setSelectedAnnouncement] = useState('');
  const [zoneSettingsOpen, setZoneSettingsOpen] = useState<Record<string, boolean>>({});
  const [zoneSettings, setZoneSettings] = useState<Record<string, {
    channelPlaylistId: string;
    defaultVolume: number;
    quietHoursStart: string;
    quietHoursEnd: string;
  }>>(({
    'Ground Floor': {
      channelPlaylistId: 'none',
      defaultVolume: 100, // Full volume by default
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
    'First Floor': {
      channelPlaylistId: 'none',
      defaultVolume: 100, // Full volume by default
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
    'Outdoor': {
      channelPlaylistId: 'none',
      defaultVolume: 100, // Full volume by default
      quietHoursStart: '23:00',
      quietHoursEnd: '06:00',
    },
  }));

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setIsLoading(false); // Data is loaded by FilesProvider
    };

    void loadData();
  }, [user]);

  const isLoadingCombined = isLoading || loadingStates.zones || loadingStates.devices || loadingStates.announcements || loadingStates.schedules;

  // WebSocket integration for real-time device status updates
  useEffect(() => {
    wsClient.connectEvents(); // Connect to global events WebSocket

    const handleDeviceStatusChange = (data: any) => {
      // console.log('Zone device status change received:', data); // Debug logging removed

      if (data.device_id && data.is_online !== undefined) {
        setDevices(prev => prev.map(device =>
          device.id === data.device_id
            ? {
                ...device,
                status: data.is_online ? 'online' : 'offline',
                lastSeen: new Date(data.last_seen || Date.now())
              }
            : device
        ));

        // Update zone device counts
        setZones(prev => prev.map(zone => {
          const zoneDevices = devices.filter(d => d.zoneId === zone.id);
          const onlineCount = zoneDevices.filter(d => d.status === 'online').length;
          return { ...zone, devicesCount: zoneDevices.length, isPlaying: onlineCount > 0 };
        }));
      }
    };

    const handleConnected = (data: any) => {
      if (data.type === 'events') {
        // console.log('Zones component connected to global events WebSocket'); // Debug logging removed
      }
    };

    const handleDisconnected = (data: any) => {
      if (data.type === 'events') {
        // console.log('Zones component disconnected from global events WebSocket'); // Debug logging removed
        // Mark all devices as offline when disconnected
        setDevices(prev => prev.map(device => ({ ...device, status: 'offline' })));
      }
    };

    wsClient.on('device_status_change', handleDeviceStatusChange);
    wsClient.on('connected', handleConnected);
    wsClient.on('disconnected', handleDisconnected);

    return () => {
      wsClient.off('device_status_change', handleDeviceStatusChange);
      wsClient.off('connected', handleConnected);
      wsClient.off('disconnected', handleDisconnected);
      wsClient.disconnectEvents();
    };
  }, [devices]);

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const filteredDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;
  const availableAnnouncements = announcements.filter(a => 
    (!clientId || a.clientId === clientId) && (a as any).enabled !== false
  );
  const zonesByName = new Map(zones.map(zone => [zone.name, zone]));

  // Group devices by zone (include empty zones)
  const devicesByZone = zones.reduce((acc, zone) => {
    acc[zone.name] = filteredDevices.filter((device) => device.zoneId === zone.id);
    return acc;
  }, {} as Record<string, Device[]>);
  const unassignedDevices = filteredDevices.filter((device) => !device.zoneId);
  if (unassignedDevices.length > 0) {
    devicesByZone['Unassigned'] = unassignedDevices;
  }

  const handlePlayToDevice = (deviceId: string) => {
    if (!selectedAnnouncement) {
      toast.error('Please select an announcement');
      return;
    }
    
    const device = devices.find(d => d.id === deviceId);
    const announcement = availableAnnouncements.find(a => a.id === selectedAnnouncement);
    const targetZoneId = device?.zoneId;
    if (!targetZoneId) {
      toast.error('Device is not assigned to a zone');
      return;
    }
    playInstantAnnouncement(selectedAnnouncement, [targetZoneId]);
    toast.success(`Playing "${announcement?.title}" on ${device?.name}`);
  };

  const handleSetVolume = async (deviceId: string, volume: number) => {
    try {
      await zonesAPI.setDeviceVolume(deviceId, volume);
      const device = devices.find(d => d.id === deviceId);
      toast.success(`Volume set to ${volume}% on ${device?.name}`);
    } catch (error: any) {
      toast.error('Failed to set volume', { description: error?.message || 'Please try again' });
    }
  };

  const handlePingDevice = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    try {
      await zonesAPI.pingDevice(deviceId, {
        tone_type: 'test_tone',
        duration: 2,
        volume: device.volume || 50
      });
      toast.success(`Test tone sent to ${device.name}`, {
        description: 'Device should play a 2-second test tone',
      });
    } catch (error: any) {
      toast.error(`Failed to ping ${device.name}`, {
        description: error.message || 'Please try again',
      });
    }
  };

  const handleSendSchedule = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    try {
      // Get the device's zone schedule
      const deviceZone = zones.find(z => z.id === device.zoneId);
      if (!deviceZone) {
        toast.error('Device is not assigned to a zone');
        return;
      }

      // Find schedules for this zone
      const zoneSchedules = schedules.filter(s =>
        s.zoneIds.includes(deviceZone.id)
      );

      if (zoneSchedules.length === 0) {
        toast.warning(`No schedules found for zone ${deviceZone.name}`);
        return;
      }

      // Send the first schedule (or implement schedule selection)
      const scheduleToSend = zoneSchedules[0];

      await zonesAPI.sendScheduleToDevice(deviceId, {
        id: scheduleToSend.id,
        name: scheduleToSend.name,
        schedule_config: scheduleToSend.schedule,
        enabled: scheduleToSend.enabled
      });

      toast.success(`Schedule sent to ${device.name}`, {
        description: `"${scheduleToSend.name}" has been synced to the device`,
      });
    } catch (error: any) {
      toast.error(`Failed to send schedule to ${device.name}`, {
        description: error.message || 'Please try again',
      });
    }
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

  const handleSaveZoneSettings = async (zoneName: string) => {
    try {
      // Find zone by name
      const zone = zones.find(z => z.name === zoneName);
      if (zone) {
        const settings = zoneSettings[zoneName];
        await zonesAPI.updateZone(zone.id, {
          // TODO: Map zone settings to zone update data
          // This depends on backend zone model structure
        });
        toast.success(`Settings saved for ${zoneName}`);
        handleCloseZoneSettings(zoneName);
      } else {
        toast.error('Zone not found');
      }
    } catch (error: any) {
      toast.error('Failed to save zone settings', { description: error?.message || 'Please try again' });
    }
  };

  const handleCreateZone = async (name: string, description?: string, imageFile?: File | null) => {
    try {
      await createZone({ name, description, imageFile });
    } catch (error: any) {
      toast.error('Failed to create zone', { description: error?.message || 'Please try again' });
    }
  };

  const handleAddDevice = async (name: string, deviceId: string, zoneId: string) => {
    try {
      await zonesAPI.registerDevice({
        name,
        zone_id: zoneId,
        device_type: 'speaker', // Default type
      });
      toast.success('Device added successfully');
      // Reload devices
      const devicesData = await zonesAPI.getDevices();
      setDevices(Array.isArray(devicesData) ? devicesData : []);
    } catch (error: any) {
      toast.error('Failed to add device', { description: error?.message || 'Please try again' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading zones and devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-slate-600">Manage zones and devices across your business</p>
        </div>
        <div className="flex gap-2">
          <AddDeviceDialog zones={zones} onAdd={handleAddDevice} />
          <CreateZoneDialog onCreate={handleCreateZone} />
        </div>
      </div>

      {/* Zone Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Zones</p>
                <p className="text-3xl font-bold mt-2">{zones.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Grid3x3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Online Devices</p>
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
                <p className="text-sm text-slate-500">Offline Devices</p>
                <p className="text-3xl font-bold mt-2">
                  {filteredDevices.filter(d => d.status === 'offline').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100">
                <WifiOff className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 text-slate-500">
          Loading zones and devices...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && Object.keys(devicesByZone).length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="font-medium text-slate-600">No zones or devices found</p>
            <p className="text-sm text-slate-500 mt-1">Start by creating a zone and adding devices</p>
          </CardContent>
        </Card>
      )}

      {/* Zones List */}
      {!isLoading && Object.entries(devicesByZone).map(([zoneName, zoneDevices]) => {
        const zoneInfo = zonesByName.get(zoneName);
        return (
        <Card key={zoneName}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  {zoneInfo?.imageUrl ? (
                    <img
                      src={zoneInfo.imageUrl}
                      alt={zoneName}
                      className="h-10 w-10 rounded object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center">
                      <Grid3x3 className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <span>{zoneName}</span>
                </CardTitle>
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
              {zoneDevices.length === 0 && (
                <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
                  No devices assigned to this zone yet
                </div>
              )}
              {zoneDevices.map((device) => (
                <Dialog key={device.id}>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {device.status === 'online' ? (
                        <Wifi className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{device.name}</p>
                        <p className="text-sm text-slate-500">
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
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium">Status</span>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </div>

                      {/* Volume Control */}
                      <div className="space-y-2">
                        <Label>Device Volume</Label>
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-4 w-4 text-slate-500 shrink-0" />
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
                          <span className="text-sm text-slate-500 w-10 text-right">
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
                          <span className="text-slate-500">Zone</span>
                          <span className="font-medium">{device.zone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Last Seen</span>
                          <span className="font-medium">{formatRelativeTime(device.lastSeen)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Device ID</span>
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
      )})}

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
        const zoneSchedules = schedules.filter(schedule => 
          (schedule as any).targetDevices?.some((deviceId: string) => 
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
                  {/* Channel playlist assignment - TODO: Add API when available */}
                  {currentSettings.channelPlaylistId !== 'none' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">Channel playlist assignment coming soon</p>
                    </div>
                  )}
                </div>

                {/* Default Volume */}
                <div className="space-y-3">
                  <Label>Default Volume</Label>
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-slate-500 shrink-0" />
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
                    <span className="text-sm text-slate-500 w-10 text-right">
                      {currentSettings.defaultVolume}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    This volume will be applied to all devices in this zone
                  </p>
                </div>

                {/* Quiet Hours */}
                <div className="space-y-3">
                  <Label>Quiet Hours</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Start Time</Label>
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
                      <Label className="text-xs text-slate-500">End Time</Label>
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
                  <p className="text-xs text-slate-500">
                    Playback will automatically pause during quiet hours
                  </p>
                </div>

                {/* Active Schedules */}
                <div className="space-y-3">
                  <Label>Active Schedules ({zoneSchedules.length})</Label>
                  {zoneSchedules.length > 0 ? (
                    <div className="space-y-2">
                      {zoneSchedules.map(schedule => (
                        <div key={schedule.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{schedule.name}</p>
                              <p className="text-xs text-slate-500">
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
                    <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-lg">
                      No active schedules for this zone
                    </p>
                  )}
                </div>

                {/* Devices in Zone */}
                <div className="space-y-3">
                  <Label>Devices in Zone ({zoneDevices.length})</Label>
                  <div className="space-y-2">
                    {zoneDevices.map(device => (
                      <div key={device.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
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

// Dialog Components
function CreateZoneDialog({ onCreate }: { onCreate: (name: string, description?: string, imageFile?: File | null) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Zone name is required');
      return;
    }
    setIsCreating(true);
    try {
      await onCreate(name.trim(), description.trim() || undefined, imageFile);
      setName('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Input 
              placeholder="e.g., Kitchen, Outdoor Patio" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Input 
              placeholder="Describe this zone..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Zone Image (Optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
            />
            {imagePreview && (
              <div className="flex items-center gap-3">
                <img
                  src={imagePreview}
                  alt="Zone preview"
                  className="h-16 w-16 rounded object-cover border border-slate-200"
                />
                <Button variant="outline" size="sm" onClick={handleRemoveImage}>
                  Remove
                </Button>
              </div>
            )}
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Zone'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddDeviceDialog({ zones, onAdd }: { zones: Zone[]; onAdd: (name: string, deviceId: string, zoneId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !deviceId.trim() || !zoneId) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsAdding(true);
    try {
      await onAdd(name.trim(), deviceId.trim(), zoneId);
      setName('');
      setDeviceId('');
      setZoneId('');
      setOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Input 
              placeholder="e.g., Ground Floor Speaker 1" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Device ID</Label>
            <Input 
              placeholder="Enter device ID" 
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Assign to Zone</Label>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger>
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Device'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}