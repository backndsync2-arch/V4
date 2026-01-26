import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Music, Radio, Calendar, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { DashboardPlayback } from '@/app/components/DashboardPlayback';
import { announcementsAPI, musicAPI, schedulerAPI, wsClient, zonesAPI } from '@/lib/api';
import { toast } from 'sonner';

export function Dashboard() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [musicFiles, setMusicFiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Filter by client if not admin
  const clientId = user?.role === 'admin' ? null : user?.clientId;
  
  const filteredDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;
  const filteredSchedules = clientId ? schedules.filter(s => s.clientId === clientId) : schedules;
  const filteredMusic = clientId ? musicFiles.filter(m => m.clientId === clientId) : musicFiles;
  const filteredAnnouncements = clientId ? announcements.filter(a => a.clientId === clientId) : announcements;

  useEffect(() => {
    let mounted = true;
    const load = async (silent = false) => {
      try {
        const [music, anns, devs, sch] = await Promise.all([
          musicAPI.getMusicFiles(),
          announcementsAPI.getAnnouncements(),
          zonesAPI.getDevices(),
          schedulerAPI.getSchedules(),
        ]);
        if (!mounted) return;
        setMusicFiles(music);
        setAnnouncements(anns);
        setDevices(devs);
        setSchedules(sch);
      } catch (e: any) {
        console.error('Dashboard load failed:', e);
        if (!silent) toast.error(e?.message || 'Failed to load dashboard data');
      }
    };
    load(false);

    // Light polling for "realtime" feel without relying on external services
    const interval = window.setInterval(() => load(true), 10000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Real-time events (device status changes, etc.)
    const onDeviceEvent = (data: any) => {
      setRecentEvents((prev) => {
        const next = [{ ...data, _ts: new Date() }, ...prev];
        return next.slice(0, 10);
      });
    };

    wsClient.connect();
    wsClient.on('device_status_change', onDeviceEvent);
    wsClient.on('device_heartbeat', onDeviceEvent);

    return () => {
      wsClient.off('device_status_change', onDeviceEvent);
      wsClient.off('device_heartbeat', onDeviceEvent);
    };
  }, []);

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
      value: filteredSchedules.filter((s: any) => Boolean(s.enabled)).length,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Online Devices',
      value: `${filteredDevices.filter((d: any) => d.status === 'online').length}/${filteredDevices.length}`,
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
            <div className="space-y-3">
              {filteredDevices.length === 0 ? (
                <p className="text-slate-500 text-sm">No devices found.</p>
              ) : (
                filteredDevices.map((device: any) => (
                  <div key={device.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-slate-400'}`} />
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-slate-500">{device.zone || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatRelativeTime(device.lastSeen)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Device Events (real-time) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Live device status updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents.length === 0 ? (
                <p className="text-slate-500 text-sm">No activity yet.</p>
              ) : (
                recentEvents.map((event: any, idx: number) => (
                  <div key={event.id ?? `${event.type}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {event.type === 'device_status_change' ? (
                        event.is_online ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-orange-600" />
                      )}
                      <div>
                        <p className="font-medium">
                          {event.type === 'device_status_change'
                            ? `Device ${event.is_online ? 'online' : 'offline'}`
                            : 'Device heartbeat'}
                        </p>
                        <p className="text-sm text-slate-500">{event.device_name || event.device_id || event.deviceId || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{event.type}</Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatRelativeTime(event._ts ?? new Date())}
                      </p>
                    </div>
                  </div>
                ))
              )}
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
          <div className="space-y-3">
            {filteredSchedules.filter((s: any) => Boolean(s.enabled)).length === 0 ? (
              <p className="text-slate-500 text-sm">No active schedules.</p>
            ) : (
              filteredSchedules.filter((s: any) => Boolean(s.enabled)).map((schedule: any) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{schedule.name}</p>
                      <p className="text-sm text-slate-500">
                        {schedule.schedule?.type === 'interval'
                          ? `Every ${schedule.schedule?.intervalMinutes ?? '—'} minutes`
                          : schedule.schedule?.type === 'timeline'
                            ? `${schedule.schedule?.cycleDurationMinutes ?? '—'} min cycle`
                            : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge>Active</Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {(schedule.deviceIds?.length ?? 0)} device{(schedule.deviceIds?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}