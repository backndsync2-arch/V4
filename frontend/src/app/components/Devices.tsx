import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { mockDevices } from '@/lib/mockData';
import { Activity, Plus, Wifi, WifiOff, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';

export function Devices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState(mockDevices);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceZone, setDeviceZone] = useState('');

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const filteredDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;

  const onlineCount = filteredDevices.filter(d => d.status === 'online').length;
  const offlineCount = filteredDevices.filter(d => d.status === 'offline').length;

  const handleAddDevice = () => {
    if (!deviceName.trim()) {
      toast.error('Please enter a device name');
      return;
    }

    const newDevice = {
      id: `device_${Date.now()}`,
      name: deviceName,
      clientId: user?.clientId || 'client1',
      status: 'offline' as const,
      lastSeen: new Date(),
      zone: deviceZone || undefined,
    };

    setDevices([...devices, newDevice]);
    setDeviceName('');
    setDeviceZone('');
    setIsAddOpen(false);
    toast.success(`Device "${deviceName}" added`);
  };

  const handleDelete = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    setDevices(devices.filter(d => d.id !== deviceId));
    toast.success(`Deleted ${device?.name}`);
  };

  const handleToggleStatus = (deviceId: string) => {
    setDevices(devices.map(d =>
      d.id === deviceId
        ? {
            ...d,
            status: d.status === 'online' ? 'offline' : 'online',
            lastSeen: new Date(),
          }
        : d
    ));
    const device = devices.find(d => d.id === deviceId);
    toast.info(`${device?.name} is now ${device?.status === 'online' ? 'offline' : 'online'}`);
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
                <Label>Zone/Location (Optional)</Label>
                <Input
                  placeholder="e.g. Ground Floor, Reception"
                  value={deviceZone}
                  onChange={(e) => setDeviceZone(e.target.value)}
                />
              </div>
              <Button onClick={handleAddDevice} className="w-full">
                Add Device
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
            {filteredDevices.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No devices registered yet
              </div>
            )}
          </div>
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
