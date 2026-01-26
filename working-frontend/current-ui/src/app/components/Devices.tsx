import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { zonesAPI, zonesAPI as devicesAPI, wsClient } from '@/lib/api';
import { Activity, Plus, Wifi, WifiOff, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import type { Device, Zone } from '@/lib/types';

export function Devices() {
  const { user } = useAuth();
  const { devices, zones, isLoading: loadingStates } = useFiles();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceZoneId, setDeviceZoneId] = useState('');

  const isLoading = loadingStates.devices || loadingStates.zones;

  // WebSocket integration for real-time device status updates
  useEffect(() => {
    wsClient.connectEvents(); // Connect to global events WebSocket

    const handleDeviceStatusChange = (data: any) => {
      // console.log('Device status change received:', data); // Debug logging removed

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

        // Show toast notification for status changes
        const device = devices.find(d => d.id === data.device_id);
        if (device) {
          const statusText = data.is_online ? 'came online' : 'went offline';
          toast.info(`Device "${device.name}" ${statusText}`);
        }
      }
    };

    const handleConnected = (data: any) => {
      if (data.type === 'events') {
        // console.log('Connected to global events WebSocket'); // Debug logging removed
      }
    };

    const handleDisconnected = (data: any) => {
      if (data.type === 'events') {
        // console.log('Disconnected from global events WebSocket'); // Debug logging removed
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

  const onlineCount = filteredDevices.filter(d => d.status === 'online').length;
  const offlineCount = filteredDevices.filter(d => d.status === 'offline').length;

  const handleAddDevice = async () => {
    if (!deviceName.trim()) {
      toast.error('Please enter a device name');
      return;
    }

    if (!deviceZoneId) {
      toast.error('Please select a zone');
      return;
    }

    try {
      await zonesAPI.registerDevice({
        name: deviceName.trim(),
        zone_id: deviceZoneId,
        device_type: 'speaker',
      });
      
      toast.success(`Device "${deviceName}" added`);
      setDeviceName('');
      setDeviceZoneId('');
      setIsAddOpen(false);
      
      // Reload devices
      const devicesData = await zonesAPI.getDevices();
      setDevices(Array.isArray(devicesData) ? devicesData : []);
    } catch (error: any) {
      toast.error('Failed to add device', { description: error?.message || 'Please try again' });
    }
  };

  const handleDelete = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    if (!confirm(`Are you sure you want to delete ${device.name}?`)) {
      return;
    }

    try {
      await zonesAPI.deleteDevice(deviceId);
      setDevices(devices.filter(d => d.id !== deviceId));
      toast.success(`Deleted ${device.name}`);
    } catch (error: any) {
      toast.error('Failed to delete device', { description: error?.message || 'Please try again' });
    }
  };

  const handleToggleStatus = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    try {
      // Update device status via API
      await zonesAPI.updateDevice(deviceId, {
        // Status update depends on backend model structure
        // This is a placeholder - adjust based on actual API
      } as any);
      
      // Update local state optimistically
      setDevices(devices.map(d =>
        d.id === deviceId
          ? {
              ...d,
              status: d.status === 'online' ? 'offline' : 'online',
              lastSeen: new Date(),
            }
          : d
      ));
      
      toast.info(`${device.name} is now ${device.status === 'online' ? 'offline' : 'online'}`);
    } catch (error: any) {
      toast.error('Failed to update device status', { description: error?.message || 'Please try again' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600">Manage playback devices and monitor their status</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Device</DialogTitle>
              <DialogDescription>Register a new playback device</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Device Name</Label>
                <Input
                  placeholder="e.g. Main Floor Speaker"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Zone/Location</Label>
                <Select value={deviceZoneId} onValueChange={setDeviceZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a zone" />
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
              <Button onClick={handleAddDevice} className="w-full" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Device'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Devices</p>
                <p className="text-3xl font-bold mt-2">{filteredDevices.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Online</p>
                <p className="text-3xl font-bold mt-2">{onlineCount}</p>
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
                <p className="text-sm text-slate-500">Offline</p>
                <p className="text-3xl font-bold mt-2">{offlineCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100">
                <WifiOff className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Devices List */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
          <CardDescription>All playback devices in your system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              Loading devices...
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No devices registered yet</p>
              <p className="text-sm mt-1">Start by adding your first device</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => handleToggleStatus(device.id)}
                    className={`p-3 rounded-lg ${
                      device.status === 'online'
                        ? 'bg-green-100'
                        : 'bg-slate-200'
                    }`}
                  >
                    {device.status === 'online' ? (
                      <Wifi className="h-6 w-6 text-green-600" />
                    ) : (
                      <WifiOff className="h-6 w-6 text-slate-500" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{device.name}</p>
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {device.zone && (
                        <p className="text-sm text-slate-500">{device.zone}</p>
                      )}
                      <p className="text-sm text-slate-500">
                        Last seen: {formatRelativeTime(device.lastSeen)}
                      </p>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(device.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Device Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ol className="space-y-2 text-slate-600">
            <li>Download the sync2gear Player app on your device</li>
            <li>Sign in with your account credentials</li>
            <li>The device will automatically appear in this list once connected</li>
            <li>Assign the device to a zone/location for better organisation</li>
            <li>Start scheduling announcements to your devices</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
