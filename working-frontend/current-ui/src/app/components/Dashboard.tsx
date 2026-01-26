import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Music, Radio, Calendar, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { DashboardPlayback } from '@/app/components/DashboardPlayback';
import { toast } from 'sonner';
import type { Device, Schedule, MusicFile, Announcement } from '@/lib/types';

export function Dashboard() {
  const { user } = useAuth();
  const {
    devices,
    schedules,
    musicFiles,
    announcements,
    isLoading: loadingStates,
  } = useFiles();

  const [isLoading, setIsLoading] = useState(false);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setIsLoading(false); // Data is loaded by FilesProvider
    };

    void loadData();
  }, [user]);

  const isLoadingCombined = isLoading || loadingStates.devices || loadingStates.schedules || loadingStates.musicFiles || loadingStates.announcements;

  // Filter by client if not admin
  const clientId = user?.role === 'admin' ? null : user?.clientId;
  
  const filteredDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;
  const filteredSchedules = clientId ? schedules.filter(s => s.clientId === clientId) : schedules;
  const filteredMusic = clientId ? musicFiles.filter(m => m.clientId === clientId) : musicFiles;
  const filteredAnnouncements = clientId ? announcements.filter(a => a.clientId === clientId) : announcements;

  const stats = [
    {
      title: 'Music Tracks',
      value: filteredMusic.length,
      icon: Music,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Announcements',
      value: filteredAnnouncements.length,
      icon: Radio,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Schedules',
      value: filteredSchedules.filter(s => s.enabled).length,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Online Devices',
      value: `${filteredDevices.filter(d => d.status === 'online').length}/${filteredDevices.length}`,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Playback Control */}
      <DashboardPlayback />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Status */}
        <Card>
          <CardHeader>
            <CardTitle>Device Status</CardTitle>
            <CardDescription>Monitor your connected devices</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">
                Loading devices...
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No devices found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-slate-400'}`} />
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-slate-500">{device.zone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                      {device.status}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatRelativeTime(new Date(device.lastSeen))}
                    </p>
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity - Placeholder for play events API */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest announcement activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500">
              <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Play events will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Active Schedules</CardTitle>
          <CardDescription>Currently running announcement schedules</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              Loading schedules...
            </div>
          ) : filteredSchedules.filter(s => s.enabled).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No active schedules</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSchedules.filter(s => s.enabled).map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{schedule.name}</p>
                    <p className="text-sm text-slate-500">
                      {schedule.schedule.type === 'interval'
                        ? `Every ${schedule.schedule.intervalMinutes} minutes`
                        : `${schedule.schedule.cycleDurationMinutes} min cycle`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge>Active</Badge>
                  <p className="text-xs text-slate-500 mt-1">
                    {schedule.deviceIds.length} device{schedule.deviceIds.length !== 1 ? 's' : ''}
                  </p>
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
      </Card>
    </div>
  );
}