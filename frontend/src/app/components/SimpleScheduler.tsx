import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogTrigger } from '@/app/components/ui/dialog';
import { RefreshCw, Play, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL, getAccessToken } from '@/lib/api/core';
import { announcementsAPI, schedulerAPI, zonesAPI, musicAPI } from '@/lib/api';
import { ScheduleFormDialog } from './scheduler/ScheduleFormDialog';
import type { Schedule } from '@/lib/types';
import type { Zone } from '@/lib/api';
import { usePlayback } from '@/lib/playback';

interface SimpleSchedule {
  id: string;
  name: string;
  intervalMinutes: number;
  announcementIds: string[];
  zoneIds: string[];
  lastExecutedAt: string | null;
  countdownSeconds: number | null;
}

export function SimpleScheduler() {
  const { user } = useAuth();
  const { activeTarget } = usePlayback();
  const [schedules, setSchedules] = useState<SimpleSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const executedRef = useRef<Set<string>>(new Set());
  const autoExecuteTriggeredRef = useRef<Set<string>>(new Set()); // Track schedules that have triggered auto-execution
  const audioContextRef = useRef<AudioContext | null>(null);

  // Automatically attempt to unlock audio on mount (no user interaction required)
  useEffect(() => {
    const unlockAudio = async () => {
      if (audioUnlocked) return;
      
      try {
        // Create and resume AudioContext to unlock autoplay
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        // Try to resume audio context immediately
        if (audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
          } catch (e) {
            console.log('[SimpleScheduler] AudioContext resume failed, will retry on play');
          }
        }
        
        // Try to play a silent Audio element to unlock HTMLAudioElement autoplay
        try {
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
          silentAudio.volume = 0.001;
          await silentAudio.play();
          silentAudio.pause();
          silentAudio.remove();
          setAudioUnlocked(true);
          console.log('[SimpleScheduler] Audio unlocked automatically');
        } catch (e) {
          // If silent audio fails, try to unlock on first actual play
          console.log('[SimpleScheduler] Silent audio failed, will unlock on first play attempt');
        }
      } catch (error) {
        console.warn('[SimpleScheduler] Failed to unlock audio:', error);
      }
    };
    
    // Try to unlock immediately on mount
    unlockAudio();
    
    // Also try to unlock on any interaction as fallback
    const events = ['click', 'touchstart', 'keydown'];
    const handlers: (() => void)[] = [];
    
    events.forEach(event => {
      const handler = () => {
        unlockAudio();
        // Remove all listeners after first interaction
        events.forEach((e, i) => {
          document.removeEventListener(e, handlers[i]);
        });
      };
      handlers.push(handler);
      document.addEventListener(event, handler, { once: true });
    });
    
    return () => {
      events.forEach((event, i) => {
        if (handlers[i]) {
          document.removeEventListener(event, handlers[i]);
        }
      });
    };
  }, [audioUnlocked]);

  // Load announcements, zones, and folders
  useEffect(() => {
    const load = async () => {
      try {
        const [anns, zonesData, foldersData] = await Promise.all([
          announcementsAPI.getAnnouncements(),
          zonesAPI.getZones(),
          musicAPI.getFolders('announcements', activeTarget || undefined),
        ]);
        setAnnouncements(anns);
        setZones(zonesData);
        setFolders(foldersData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    load();
  }, [activeTarget]);

  // Execute schedules - MUST be defined before loadSchedules since loadSchedules uses it
  const executeSchedules = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/schedules/simple/execute/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[SimpleScheduler] Execute response:', data);
        
        // Play announcements that were executed using the playback API
        const executedList = data.executed || [];
        console.log('[SimpleScheduler] Executed announcements:', executedList);
        
        if (executedList.length === 0) {
          console.log('[SimpleScheduler] No announcements were executed');
        }
        
        for (const exec of executedList) {
          const executionKey = `${exec.scheduleId}-${exec.announcementId}`;
          
          // Only play if we haven't already played this execution
          if (!executedRef.current.has(executionKey)) {
            executedRef.current.add(executionKey);
            console.log('[SimpleScheduler] Processing execution:', exec);
            
            // Find announcement
            const announcement = announcements.find((a: any) => a.id === exec.announcementId);
            console.log('[SimpleScheduler] Found announcement:', {
              found: !!announcement,
              announcementId: exec.announcementId,
              announcement: announcement,
              allAnnouncements: announcements.map(a => ({ id: a.id, title: a.title }))
            });
            
            if (announcement) {
              // Play locally in browser only (no remote device calls)
              const audioUrl = (announcement as any).url || (announcement as any).file_url;
              if (audioUrl) {
                try {
                  // Construct full URL - handle both absolute and relative URLs
                  let absoluteUrl = audioUrl;
                  if (!audioUrl.startsWith('http')) {
                    // If relative URL, prepend backend base URL
                    const backendBase = API_BASE_URL.replace('/api/v1', '');
                    absoluteUrl = audioUrl.startsWith('/') 
                      ? `${backendBase}${audioUrl}`
                      : `${backendBase}/${audioUrl}`;
                  }
                  
                  console.log('[SimpleScheduler] Attempting to play locally:', {
                    title: announcement.title,
                    originalUrl: audioUrl,
                    absoluteUrl: absoluteUrl
                  });
                  
                  const audio = new Audio(absoluteUrl);
                  audio.volume = 1.0;
                  
                  // Add error handler
                  audio.onerror = (e) => {
                    console.error('[SimpleScheduler] Audio load error:', {
                      error: e,
                      url: absoluteUrl,
                      title: announcement.title
                    });
                    toast.error(`Failed to load audio: ${announcement.title}`);
                  };
                  
                  // Add load handler
                  audio.onloadeddata = () => {
                    console.log('[SimpleScheduler] Audio loaded successfully:', announcement.title);
                  };
                  
                  // Add play handler
                  audio.onplay = () => {
                    console.log('[SimpleScheduler] Audio started playing:', announcement.title);
                    toast.success(`🔊 Playing: ${announcement.title || exec.scheduleName}`);
                  };
                  
                  // Add ended handler
                  audio.onended = () => {
                    console.log('[SimpleScheduler] Audio finished playing:', announcement.title);
                  };
                  
                  // Try to play locally - fully automatic, no user interaction needed
                  try {
                    // Ensure audio context exists and is active
                    if (!audioContextRef.current) {
                      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                      audioContextRef.current = audioContext;
                    }
                    
                    // Resume audio context if suspended
                    if (audioContextRef.current.state === 'suspended') {
                      try {
                        await audioContextRef.current.resume();
                      } catch (e) {
                        // Continue even if resume fails
                      }
                    }
                    
                    // Try to play immediately
                    await audio.play();
                    console.log('[SimpleScheduler] Playing announcement automatically:', announcement.title);
                    setAudioUnlocked(true);
                  } catch (playError: any) {
                    // If autoplay is blocked, try multiple strategies automatically
                    if (playError?.name === 'NotAllowedError' || playError?.message?.includes('user gesture')) {
                      console.log('[SimpleScheduler] Autoplay blocked - trying automatic unlock strategies');
                      
                      // Strategy 1: Resume audio context and retry
                      try {
                        if (audioContextRef.current) {
                          await audioContextRef.current.resume();
                        } else {
                          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                          audioContextRef.current = audioContext;
                          await audioContext.resume();
                        }
                        
                        // Wait a moment and retry
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await audio.play();
                        console.log('[SimpleScheduler] Playing after audio context resume');
                        setAudioUnlocked(true);
                      } catch (retryError: any) {
                        // Strategy 2: Reload audio and retry
                        try {
                          audio.load();
                          await new Promise(resolve => setTimeout(resolve, 200));
                          await audio.play();
                          console.log('[SimpleScheduler] Playing after audio reload');
                          setAudioUnlocked(true);
                        } catch (finalError: any) {
                          // Strategy 3: Create new audio element and try
                          try {
                            const newAudio = new Audio(absoluteUrl);
                            newAudio.volume = 1.0;
                            await newAudio.play();
                            console.log('[SimpleScheduler] Playing with new audio element');
                            setAudioUnlocked(true);
                          } catch (lastError: any) {
                            console.log('[SimpleScheduler] All automatic strategies failed - browser autoplay policy is blocking');
                            // Silently fail - browser requires user interaction
                            // Don't show error messages that require clicks
                          }
                        }
                      }
                    } else {
                      throw playError; // Re-throw other errors
                    }
                  }
                } catch (localError: any) {
                  // Local playback failed
                  console.error('[SimpleScheduler] Local playback failed:', {
                    error: localError,
                    message: localError?.message,
                    title: announcement.title,
                    url: audioUrl
                  });
                  
                  // Show helpful error message
                  if (localError?.message?.includes('user gesture') || localError?.message?.includes('autoplay')) {
                    toast.info(`Click "Execute Now" to play ${announcement.title} (browser requires user interaction)`);
                  } else {
                    toast.error(`Failed to play: ${announcement.title} - ${localError?.message || 'Unknown error'}`);
                  }
                }
              } else {
                console.warn('[SimpleScheduler] Announcement has no audio URL:', {
                  id: exec.announcementId,
                  title: announcement.title,
                  announcement: announcement
                });
                toast.warning(`Announcement "${announcement.title}" has no audio file`);
              }
            }
          }
        }
        
        // Reload schedules to update countdown - inline fetch to avoid circular dependency
        const reloadToken = getAccessToken();
        const reloadResponse = await fetch(`${API_BASE_URL}/schedules/simple/active/`, {
          headers: {
            'Authorization': `Bearer ${reloadToken}`,
          },
        });
        if (reloadResponse.ok) {
          const reloadData = await reloadResponse.json();
          setSchedules(reloadData);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute schedules');
    } finally {
      setIsLoading(false);
    }
  }, [user, announcements]);

  // Load schedules - defined after executeSchedules to avoid circular dependency
  const loadSchedules = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/schedules/simple/active/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
        
        // If any schedule has countdownSeconds: 0, immediately trigger execution
        const schedulesAtZero = data.filter((s: any) => s.countdownSeconds === 0);
        if (schedulesAtZero.length > 0) {
          const executeKey = `execute-on-load-${Date.now()}`;
          if (!autoExecuteTriggeredRef.current.has(executeKey)) {
            autoExecuteTriggeredRef.current.add(executeKey);
            
            console.log(`[SimpleScheduler] Schedule(s) at 0 seconds detected, triggering execution:`, schedulesAtZero.map((s: any) => s.name));
            
            // Trigger execution immediately
            executeSchedules().catch(error => {
              console.error('[SimpleScheduler] Failed to execute schedules at 0:', error);
              autoExecuteTriggeredRef.current.delete(executeKey);
            });
            
            // Clear the execute key after a delay
            setTimeout(() => {
              autoExecuteTriggeredRef.current.delete(executeKey);
            }, 5000);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, executeSchedules]);

  // Load on mount
  useEffect(() => {
    loadSchedules();
  }, [user, loadSchedules]);

  // Poll for schedule execution every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      executeSchedules();
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, [user, announcements]);

  // Update countdown every second and auto-execute when reaching 3 or 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSchedules(prev => {
        let needsReload = false;
        const updated = prev.map(schedule => {
          if (schedule.countdownSeconds !== null && schedule.countdownSeconds > 0) {
            const newCountdown = schedule.countdownSeconds - 1;
            
            // Don't auto-execute at 3 or 2 seconds - wait until 0
            // The backend will only execute when the interval has actually passed
            // Triggering early causes unnecessary API calls
            
            // When countdown reaches 0, mark for reload
            if (newCountdown === 0) {
              const reloadKey = `${schedule.id}-reload-0`;
              
              // Only reload once when reaching 0
              if (!autoExecuteTriggeredRef.current.has(reloadKey)) {
                autoExecuteTriggeredRef.current.add(reloadKey);
                needsReload = true;
                
                // Clear execution triggers for this schedule
                const keysToRemove = Array.from(autoExecuteTriggeredRef.current).filter(
                  key => key.startsWith(`${schedule.id}-`) && !key.includes('reload')
                );
                keysToRemove.forEach(key => autoExecuteTriggeredRef.current.delete(key));
              }
            }
            
            return { ...schedule, countdownSeconds: newCountdown };
          }
          // If countdown is already 0, keep it at 0 and check if we need to reload
          else if (schedule.countdownSeconds === 0) {
            const reloadKey = `${schedule.id}-reload-0`;
            if (!autoExecuteTriggeredRef.current.has(reloadKey)) {
              autoExecuteTriggeredRef.current.add(reloadKey);
              needsReload = true;
            }
            return schedule;
          }
          return schedule;
        });
        
        // Reload schedules if any reached 0
        if (needsReload) {
          setTimeout(() => {
            loadSchedules().then(() => {
              // Clear reload triggers after successful reload
              const reloadKeys = Array.from(autoExecuteTriggeredRef.current).filter(
                key => key.includes('reload-0')
              );
              reloadKeys.forEach(key => {
                setTimeout(() => {
                  autoExecuteTriggeredRef.current.delete(key);
                }, 2000);
              });
            }).catch(error => {
              console.error('[SimpleScheduler] Failed to reload schedules at 0:', error);
            });
          }, 1000); // Wait 1 second for backend to update
        }
        
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [executeSchedules, loadSchedules]); // Include dependencies

  const handleCreateSchedule = async (scheduleData: any) => {
    setIsSaving(true);
    try {
      await schedulerAPI.createSchedule(scheduleData);
      toast.success(`Created schedule: ${scheduleData.name}`);
      setIsCreateOpen(false);
      // Reload schedules to show the new one
      await loadSchedules();
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || error?.data?.error || 'Failed to create schedule';
      toast.error(String(errorMessage));
      console.error('Create schedule error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  
  // Filter zones - if active zone is selected, only show that zone
  let filteredZones = clientId ? zones.filter(z => z.clientId === clientId) : zones;
  if (activeTarget) {
    filteredZones = filteredZones.filter(z => z.id === activeTarget || z.name === activeTarget);
  }
  
  // Filter announcements by client
  let clientFilteredAnnouncements = clientId 
    ? announcements.filter(a => a.clientId === clientId && a.enabled) 
    : announcements.filter(a => a.enabled);
  
  // Filter announcements by active zone if one is selected
  let availableAnnouncements = clientFilteredAnnouncements;
  if (activeTarget) {
    availableAnnouncements = clientFilteredAnnouncements.filter(a => {
      // Check if announcement has direct zone assignment
      const hasDirectZone = String(a.zoneId || '') === String(activeTarget || '') || a.zone === activeTarget;
      
      if (hasDirectZone) {
        return true;
      }
      
      // Check if announcement is in a folder that belongs to the active zone
      if (a.folderId || a.category) {
        const announcementFolder = folders.find(f => 
          String(f.id) === String(a.folderId || a.category || '')
        );
        
        if (announcementFolder) {
          const folderZoneId = String(announcementFolder.zoneId || '');
          const activeZoneId = String(activeTarget || '');
          return folderZoneId === activeZoneId || announcementFolder.zone === activeTarget;
        }
      }
      
      return false;
    });
  }
  
  const availableZones = filteredZones;

  return (
    <div className="space-y-6 pb-32 md:pb-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Scheduler</h2>
          <p className="text-gray-400">Create and manage automated announcement schedules</p>
          <p className="text-sm text-[#1db954] mt-1">
            Schedules run automatically via Celery Beat (cron job) on AWS
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadSchedules}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Schedule
              </Button>
            </DialogTrigger>
            <ScheduleFormDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              editingSchedule={null}
              availableAudio={availableAnnouncements}
              availableZones={availableZones}
              activeTarget={null}
              onSave={handleCreateSchedule}
              isLoading={isSaving}
            />
          </Dialog>
          <Button
            onClick={executeSchedules}
            disabled={isLoading}
            className="gap-2"
            variant="outline"
          >
            <Play className="h-4 w-4" />
            Execute Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {schedules.map((schedule) => {
          const announcement = announcements.find((a: any) => 
            schedule.announcementIds.includes(a.id)
          );
          
          const minutes = schedule.countdownSeconds !== null 
            ? Math.floor(schedule.countdownSeconds / 60) 
            : null;
          const seconds = schedule.countdownSeconds !== null 
            ? schedule.countdownSeconds % 60 
            : null;
          
          return (
            <Card key={schedule.id}>
              <CardHeader>
                <CardTitle>{schedule.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Interval</p>
                  <p className="text-lg font-semibold">Every {schedule.intervalMinutes} minutes</p>
                </div>
                
                {announcement && (
                  <div>
                    <p className="text-sm text-gray-400">Announcement</p>
                    <Badge variant="outline">{announcement.title}</Badge>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-400">Zones</p>
                  <p className="text-sm">{schedule.zoneIds.length} zone(s)</p>
                </div>
                
                <div className="pt-4 border-t">
                  {schedule.countdownSeconds !== null ? (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Time until next</p>
                      <div className="text-3xl font-bold text-[#1db954]">
                        {minutes !== null && seconds !== null 
                          ? `${minutes}:${seconds.toString().padStart(2, '0')}`
                          : '—'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <Badge className="bg-[#1db954]">Ready to execute</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {schedules.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-slate-500">No active schedules</p>
            <p className="text-sm text-slate-400 mt-2">Create a schedule in the Scheduler page</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

