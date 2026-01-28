import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Music, Radio, Calendar, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { DashboardPlayback } from '@/app/components/DashboardPlayback';
import { announcementsAPI, musicAPI, schedulerAPI, wsClient, zonesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';
import { usePlayback } from '@/lib/playback';

export function Dashboard() {
  const { user } = useAuth();
  const { activeTarget } = usePlayback();
  const [devices, setDevices] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [musicFiles, setMusicFiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementFolders, setAnnouncementFolders] = useState<any[]>([]);

  // Filter by client if not admin
  const clientId = user?.role === 'admin' ? null : user?.clientId;
  
  // First filter by client
  let clientFilteredDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;
  let clientFilteredSchedules = clientId ? schedules.filter(s => s.clientId === clientId) : schedules;
  let clientFilteredMusic = clientId ? musicFiles.filter(m => m.clientId === clientId) : musicFiles;
  let clientFilteredAnnouncements = clientId ? announcements.filter(a => a.clientId === clientId) : announcements;
  
  // Then filter by active zone if one is selected
  const filteredDevices = activeTarget 
    ? clientFilteredDevices.filter((d: any) => {
        // Check if device belongs to the active zone
        return d.zoneId === activeTarget || 
               d.zone === activeTarget || 
               (d.zone && typeof d.zone === 'object' && d.zone.id === activeTarget) ||
               (d.zone && typeof d.zone === 'object' && d.zone.name === activeTarget);
      })
    : clientFilteredDevices;
  
  const filteredSchedules = activeTarget
    ? clientFilteredSchedules.filter((s: any) => {
        // Check if schedule targets the active zone
        if (s.zones && Array.isArray(s.zones)) {
          return s.zones.some((z: any) => z === activeTarget || (typeof z === 'object' && z.id === activeTarget));
        }
        if (s.zoneIds && Array.isArray(s.zoneIds)) {
          return s.zoneIds.includes(activeTarget);
        }
        // If no zone info, include it (backward compatibility)
        return true;
      })
    : clientFilteredSchedules;
  
  const filteredMusic = activeTarget
    ? clientFilteredMusic.filter((m: any) => m.zoneId === activeTarget || m.zone === activeTarget)
    : clientFilteredMusic;
  
  // Filter announcements by folder's zone (since folders are zone-specific)
  const filteredAnnouncements = activeTarget
    ? clientFilteredAnnouncements.filter((a: any) => {
        // Find the folder for this announcement
        const announcementFolder = announcementFolders.find(f => 
          String(f.id) === String(a.folderId) || String(f.id) === String(a.category)
        );
        // If announcement has a folder, check if folder belongs to active zone
        if (announcementFolder) {
          const folderZoneId = String(announcementFolder.zoneId || '');
          const activeZoneId = String(activeTarget || '');
          return folderZoneId === activeZoneId || announcementFolder.zone === activeTarget;
        }
        // If no folder, check if announcement itself has zone info (backward compatibility)
        return String(a.zoneId || '') === String(activeTarget || '') || a.zone === activeTarget;
      })
    : clientFilteredAnnouncements;

  useEffect(() => {
    let mounted = true;
    const load = async (silent = false) => {
      try {
        const [music, anns, devs, sch, folders] = await Promise.all([
          musicAPI.getMusicFiles(),
          announcementsAPI.getAnnouncements(),
          zonesAPI.getDevices(),
          schedulerAPI.getSchedules(),
          musicAPI.getFolders('announcements', activeTarget || undefined),
        ]);
        if (!mounted) return;
        setMusicFiles(music);
        setAnnouncements(anns);
        setDevices(devs);
        setSchedules(sch);
        setAnnouncementFolders(folders);
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
  }, [activeTarget]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-white/10 shadow-lg hover:shadow-xl hover:shadow-[#1db954]/20 transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-400 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-gradient-to-br from-[#1db954]/20 to-[#1ed760]/20 shadow-md border border-[#1db954]/30">
                  <stat.icon className="h-6 w-6 text-[#1db954]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Playback Control */}
      <DashboardPlayback />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Recent Device Events (real-time) */}
        <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white">Recent Activity</CardTitle>
            <CardDescription className="text-gray-400">Live device status updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No activity yet.</p>
              ) : (
                recentEvents.map((event: any, idx: number) => (
                  <div key={event.id ?? `${event.type}-${idx}`} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      {event.type === 'device_status_change' ? (
                        event.is_online ? <CheckCircle2 className="h-5 w-5 text-[#1db954]" /> : <XCircle className="h-5 w-5 text-gray-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-[#1db954]" />
                      )}
                      <div>
                        <p className="font-semibold text-white">
                          {event.type === 'device_status_change'
                            ? `Device ${event.is_online ? 'online' : 'offline'}`
                            : 'Device heartbeat'}
                        </p>
                        <p className="text-sm text-gray-400">{event.device_name || event.device_id || event.deviceId || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="shadow-sm bg-white/10 text-gray-300 border-white/20">{event.type}</Badge>
                      <p className="text-xs text-gray-400 mt-1.5">
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
      <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-white">Active Schedules</CardTitle>
          <CardDescription className="text-gray-400">Currently running announcement schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredSchedules.filter((s: any) => Boolean(s.enabled)).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No active schedules.</p>
            ) : (
              filteredSchedules.filter((s: any) => Boolean(s.enabled)).map((schedule: any) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-[#1db954]/10 to-[#1ed760]/5 rounded-lg border border-[#1db954]/20 hover:border-[#1db954]/40 hover:shadow-lg hover:shadow-[#1db954]/20 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-sm">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{schedule.name}</p>
                      <p className="text-sm text-gray-400">
                        {schedule.schedule?.type === 'interval'
                          ? `Every ${schedule.schedule?.intervalMinutes ?? '—'} minutes`
                          : schedule.schedule?.type === 'timeline'
                            ? `${schedule.schedule?.cycleDurationMinutes ?? '—'} min cycle`
                            : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-gradient-to-r from-[#1db954] to-[#1ed760] text-white shadow-sm border-0">Active</Badge>
                    <p className="text-xs text-gray-400 mt-1.5">
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