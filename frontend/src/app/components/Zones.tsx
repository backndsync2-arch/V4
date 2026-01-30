import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { usePlayback } from '@/lib/playback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Wifi, WifiOff, Volume2, Radio, Play, Settings, Plus, Grid3x3, Clock, Music, Loader2 } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { zonesAPI } from '@/lib/api';
import { announcementsAPI } from '@/lib/api';

interface Zone {
  id: string;
  name: string;
  description?: string;
  floor?: { id: string; name: string } | null;
  default_volume: number;
  is_active: boolean;
}

interface Device {
  id: string;
  name: string;
  device_type: string;
  zone: { id: string; name: string };
  is_online: boolean;
  last_seen: string | null;
  volume: number;
  status: 'online' | 'offline';
}

export function Zones() {
  const { user } = useAuth();
  const { playInstantAnnouncement } = usePlayback();
  const [zones, setZones] = useState<Zone[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableAnnouncements, setAvailableAnnouncements] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceVolume, setDeviceVolume] = useState<Record<string, number>>({});
  const [selectedAnnouncement, setSelectedAnnouncement] = useState('');
  const [zoneSettingsOpen, setZoneSettingsOpen] = useState<Record<string, boolean>>({});
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDescription, setNewZoneDescription] = useState('');

  // Load zones, devices, and announcements
  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zonesData, devicesData, announcementsData] = await Promise.all([
        zonesAPI.getZones(),
        zonesAPI.getDevices(),
        announcementsAPI.list(),
      ]);
      
      setZones(zonesData);
      setDevices(devicesData.map((d: any) => ({
        ...d,
        status: d.is_online ? 'online' : 'offline',
      })));
      setAvailableAnnouncements(announcementsData.filter((a: any) => a.enabled));
      
      // Initialize device volumes
      const volumes: Record<string, number> = {};
      devicesData.forEach((d: any) => {
        volumes[d.id] = d.volume || 70;
      });
      setDeviceVolume(volumes);
    } catch (error: any) {
      console.error('Failed to load zones data:', error);
      toast.error('Failed to load zones and devices');
    } finally {
      setLoading(false);
    }
  };

  // Group devices by zone
  const zonesWithDevices = zones.map(zone => ({
    ...zone,
    devices: devices.filter(d => d.zone?.id === zone.id),
  }));

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

  const handleSetVolume = async (deviceId: string, volume: number) => {
    try {
      await zonesAPI.setDeviceVolume(deviceId, volume);
      setDeviceVolume(prev => ({ ...prev, [deviceId]: volume }));
      const device = devices.find(d => d.id === deviceId);
      toast.success(`Volume set to ${volume}% on ${device?.name}`);
    } catch (error: any) {
      console.error('Failed to set device volume:', error);
      toast.error('Failed to set device volume');
    }
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

  const handleCreateZone = async () => {
    if (!newZoneName.trim()) {
      toast.error('Zone name is required');
      return;
    }
    
    try {
      await zonesAPI.createZone({
        name: newZoneName.trim(),
        description: newZoneDescription.trim() || undefined,
      });
      toast.success('Zone created successfully');
      setIsCreateZoneOpen(false);
      setNewZoneName('');
      setNewZoneDescription('');
      loadData();
    } catch (error: any) {
      console.error('Failed to create zone:', error);
      toast.error('Failed to create zone');
    }
  };

  const handleSaveZoneSettings = async (zoneId: string, zoneName: string) => {
    try {
      const zone = zones.find(z => z.id === zoneId);
      if (zone) {
        await zonesAPI.updateZone(zoneId, {
          default_volume: zone.default_volume,
        });
        toast.success(`Settings saved for ${zoneName}`);
        handleCloseZoneSettings(zoneName);
        loadData();
      }
    } catch (error: any) {
      console.error('Failed to save zone settings:', error);
      toast.error('Failed to save zone settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1db954]" />
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
          <Dialog open={isCreateZoneOpen} onOpenChange={setIsCreateZoneOpen}>
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
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input 
                    placeholder="Describe this zone..." 
                    value={newZoneDescription}
                    onChange={(e) => setNewZoneDescription(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleCreateZone}>
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
                <p className="text-3xl font-bold mt-2">{zones.length}</p>
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
                  {devices.filter(d => d.status === 'online').length}
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
                  {devices.filter(d => d.status === 'offline').length}
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
      {zonesWithDevices.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-gray-400">No zones found. Create your first zone to get started.</p>
          </CardContent>
        </Card>
      ) : (
        zonesWithDevices.map((zone) => {
          const zoneDevices = zone.devices;
          return (
            <Card key={zone.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{zone.name}</CardTitle>
                    <CardDescription>
                      {zoneDevices.filter(d => d.status === 'online').length}/{zoneDevices.length} devices online
                      {zone.description && ` • ${zone.description}`}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenZoneSettings(zone.name)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Zone Settings
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {zoneDevices.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No devices in this zone</p>
                  ) : (
                    zoneDevices.map((device) => (
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
                            value={[deviceVolume[device.id] || device.volume || 70]}
                            max={100}
                            step={1}
                            onValueChange={(value) => {
                              handleSetVolume(device.id, value[0]);
                            }}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-400 w-10 text-right">
                            {deviceVolume[device.id] || device.volume || 70}%
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
                          <span className="font-medium">{device.zone?.name || 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last Seen</span>
                          <span className="font-medium">
                            {device.last_seen ? formatRelativeTime(new Date(device.last_seen)) : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Device ID</span>
                          <span className="font-mono text-xs">{device.id}</span>
                        </div>
                      </div>
                    </div>
                    </DialogContent>
                  </Dialog>
                ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Zone Settings Dialogs */}
      {zonesWithDevices.map((zone) => {
        const zoneName = zone.name;
        const zoneDevices = zone.devices;
        
        return (
          <Dialog 
            key={`settings-${zone.id}`}
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
                {/* Default Volume */}
                <div className="space-y-3">
                  <Label>Default Volume</Label>
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <Slider
                      value={[zone.default_volume]}
                      max={100}
                      step={1}
                      onValueChange={async (value) => {
                        try {
                          await zonesAPI.updateZone(zone.id, {
                            default_volume: value[0],
                          });
                          loadData();
                        } catch (error: any) {
                          console.error('Failed to update zone volume:', error);
                          toast.error('Failed to update zone volume');
                        }
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-10 text-right">
                      {zone.default_volume}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    This volume will be applied to all devices in this zone
                  </p>
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
                  <Button onClick={() => handleSaveZoneSettings(zone.id, zoneName)}>
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