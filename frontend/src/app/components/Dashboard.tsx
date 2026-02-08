import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Music, Radio, Calendar } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { DashboardPlayback } from '@/app/components/DashboardPlayback';
import { announcementsAPI, musicAPI } from '@/lib/api';
import { API_BASE_URL, getAccessToken } from '@/lib/api/core';
import { usePlayback } from '@/lib/playback';
import { toast } from 'sonner';

export function Dashboard() {
  const { user } = useAuth();
  const { activeTarget } = usePlayback();
  const [musicFiles, setMusicFiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementFolders, setAnnouncementFolders] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const executeTriggeredRef = useRef<Set<string>>(new Set()); // Track schedules that have triggered execution
  
  // Update countdown every second - when it reaches 0, reload schedules to get updated countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSchedules(prev => {
        let shouldReload = false;
        const updated = prev.map(schedule => {
          if (schedule.countdownSeconds !== null && schedule.countdownSeconds > 0) {
            const newCountdown = schedule.countdownSeconds - 1;
            
            // When countdown reaches 0, mark for reload
            if (newCountdown === 0) {
              shouldReload = true;
            }
            
            return { ...schedule, countdownSeconds: newCountdown };
          }
          return schedule;
        });
        
        // Reload schedules if any reached 0 to get updated countdown from backend
        if (shouldReload) {
          setTimeout(() => {
            loadSchedules();
          }, 1000); // Small delay to let backend update
        }
        
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter by client if not admin
  const clientId = user?.role === 'admin' ? null : user?.clientId;
  
  // Filter by client
  let clientFilteredMusic = clientId ? musicFiles.filter(m => m.clientId === clientId) : musicFiles;
  let clientFilteredAnnouncements = clientId ? announcements.filter(a => a.clientId === clientId) : announcements;
  
  // Filter by active zone if one is selected
  const filteredMusic = activeTarget
    ? clientFilteredMusic.filter((m: any) => m.zoneId === activeTarget || m.zone === activeTarget)
    : clientFilteredMusic;
  
  // Filter announcements by folder's zone
  const filteredAnnouncements = activeTarget
    ? clientFilteredAnnouncements.filter((a: any) => {
        const announcementFolder = announcementFolders.find(f => 
          String(f.id) === String(a.folderId) || String(f.id) === String(a.category)
        );
        if (announcementFolder) {
          const folderZoneId = String(announcementFolder.zoneId || '');
          const activeZoneId = String(activeTarget || '');
          return folderZoneId === activeZoneId || announcementFolder.zone === activeTarget;
        }
        return String(a.zoneId || '') === String(activeTarget || '') || a.zone === activeTarget;
      })
    : clientFilteredAnnouncements;

  // Filter schedules by active zone
  const filteredSchedules = activeTarget
    ? schedules.filter((schedule: any) => {
        const zoneIds = schedule.zoneIds || [];
        return zoneIds.includes(String(activeTarget));
      })
    : schedules;

  // Load schedules
  const loadSchedules = async () => {
    if (!user) return;
    try {
      const token = getAccessToken();
      // Add zone filter if activeTarget is set
      const url = activeTarget 
        ? `${API_BASE_URL}/schedules/simple/active/?zone_id=${activeTarget}`
        : `${API_BASE_URL}/schedules/simple/active/`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Extract results array from response (API returns { results: [], count: 0 })
        const schedulesArray = Array.isArray(data) ? data : (data.results || []);
        setSchedules(schedulesArray);
        
        // If any schedule has countdownSeconds: 0, immediately trigger execution
        const schedulesAtZero = schedulesArray.filter((s: any) => s.countdownSeconds === 0);
        if (schedulesAtZero.length > 0) {
          // Check if we've already triggered execution for these schedules
          const schedulesToExecute = schedulesAtZero.filter((s: any) => {
            const key = `${s.id}-execute-at-zero`;
            if (!executeTriggeredRef.current.has(key)) {
              executeTriggeredRef.current.add(key);
              return true;
            }
            return false;
          });
          
          if (schedulesToExecute.length > 0) {
            console.log(`[Dashboard] Schedule(s) at 0 seconds detected, triggering execution:`, schedulesToExecute.map((s: any) => s.name));
            
            // Trigger execution immediately
            try {
              await fetch(`${API_BASE_URL}/schedules/simple/execute/`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              // Clear the trigger keys after a delay
              setTimeout(() => {
                schedulesToExecute.forEach((s: any) => {
                  executeTriggeredRef.current.delete(`${s.id}-execute-at-zero`);
                });
              }, 5000);
              
              // Reload schedules after execution to get updated countdown
              setTimeout(() => {
                loadSchedules();
              }, 1000);
            } catch (error) {
              console.error('[Dashboard] Failed to execute schedules at 0:', error);
              // Clear trigger on error
              schedulesToExecute.forEach((s: any) => {
                executeTriggeredRef.current.delete(`${s.id}-execute-at-zero`);
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };

  // Load data
  useEffect(() => {
    let mounted = true;
    const load = async (silent = false) => {
      try {
        const [music, anns, folders] = await Promise.all([
          musicAPI.getMusicFiles(undefined, activeTarget || undefined),
          announcementsAPI.getAnnouncements(),
          musicAPI.getFolders('announcements', activeTarget || undefined),
        ]);
        if (!mounted) return;
        setMusicFiles(music);
        setAnnouncements(anns);
        setAnnouncementFolders(folders);
      } catch (e: any) {
        console.error('Dashboard load failed:', e);
        if (!silent) toast.error(e?.message || 'Failed to load dashboard data');
      }
    };
    load(false);
    loadSchedules(); // Load schedules on mount

    // Poll every 10 seconds
    const interval = window.setInterval(() => {
      load(true);
      loadSchedules(); // Also refresh schedules
    }, 10000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [activeTarget, user]);

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
      value: filteredSchedules.length,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6 pb-32 md:pb-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

      {/* Active Schedules */}
      {filteredSchedules.length > 0 && (
        <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#1db954]" />
              <CardTitle className="text-xl font-bold text-white">Active Schedules</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              {activeTarget ? 'Schedules for selected zone' : 'Upcoming scheduled announcements'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((schedule) => {
                const scheduledAnnouncements = (schedule.announcementIds || [])
                  .map((annId: string) => announcements.find(a => a.id === annId))
                  .filter(Boolean);
                
                const minutes = schedule.countdownSeconds !== null 
                  ? Math.floor(schedule.countdownSeconds / 60) 
                  : null;
                const seconds = schedule.countdownSeconds !== null 
                  ? schedule.countdownSeconds % 60 
                  : null;
                
                return (
                  <div 
                    key={schedule.id} 
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{schedule.name}</h3>
                        <p className="text-xs text-gray-400">
                          Every {schedule.intervalMinutes} minutes
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-[#1db954]/20 text-[#1db954] border-[#1db954]/30">
                        Active
                      </Badge>
                    </div>
                    
                    {schedule.countdownSeconds !== null && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-1">Next execution in:</p>
                        <div className="text-2xl font-bold text-[#1db954]">
                          {minutes !== null && seconds !== null 
                            ? `${minutes}:${seconds.toString().padStart(2, '0')}`
                            : '—'}
                        </div>
                      </div>
                    )}
                    
                    {scheduledAnnouncements.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Will play:</p>
                        <div className="flex flex-wrap gap-1">
                          {scheduledAnnouncements.slice(0, 2).map((ann: any) => (
                            <Badge 
                              key={ann.id} 
                              variant="outline" 
                              className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-300"
                            >
                              {ann.title}
                            </Badge>
                          ))}
                          {scheduledAnnouncements.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{scheduledAnnouncements.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-gray-400">
                        {schedule.zoneIds?.length || 0} zone(s)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
