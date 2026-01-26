import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import type { Schedule, IntervalSchedule, TimelineSchedule, Announcement, Device } from '@/lib/types';
import { schedulerAPI, announcementsAPI, zonesAPI } from '@/lib/api';
import { Calendar, Plus, Clock, Repeat, MoreVertical, Trash2, Play, Pause } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';

export function Scheduler() {
  const { user } = useAuth();
  const {
    schedules,
    announcements,
    devices,
    isLoading: loadingStates,
  } = useFiles();

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filter announcements for enabled ones (audio files)
  const audioFiles = announcements.filter((a: any) => a.enabled);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(false); // Data is loaded by FilesProvider
    };

    loadData();
  }, [user]);

  const isLoadingCombined = isLoading || loadingStates.schedules || loadingStates.announcements || loadingStates.devices;
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleType, setScheduleType] = useState<'interval' | 'timeline'>('interval');
  const [intervalMinutes, setIntervalMinutes] = useState('60');
  const [cycleDuration, setCycleDuration] = useState('30');
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [avoidRepeat, setAvoidRepeat] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [timelineSlots, setTimelineSlots] = useState<{ announcementId: string; timestampSeconds: number }[]>([]);

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const filteredSchedules = clientId ? schedules.filter(s => s.clientId === clientId) : schedules;
  const availableAudio = clientId ? audioFiles.filter(a => a.clientId === clientId && a.enabled) : audioFiles.filter(a => a.enabled);
  const availableDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;

  const handleCreateSchedule = async () => {
    if (!scheduleName.trim()) {
      toast.error('Please enter a schedule name');
      return;
    }
    if (selectedAnnouncements.length === 0) {
      toast.error('Please select at least one announcement');
      return;
    }
    if (selectedDevices.length === 0) {
      toast.error('Please select at least one device');
      return;
    }

    setIsCreating(true);
    try {
      const scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'> = {
        name: scheduleName,
        clientId: user?.clientId || 'client1',
        deviceIds: selectedDevices,
        enabled: true,
        schedule: scheduleType === 'interval' ? {
          type: 'interval',
          intervalMinutes: parseInt(intervalMinutes),
          announcementIds: selectedAnnouncements,
          avoidRepeat,
          ...(quietHoursEnabled ? {
            quietHoursStart: quietStart,
            quietHoursEnd: quietEnd,
          } : {}),
        } as IntervalSchedule : {
          type: 'timeline',
          cycleDurationMinutes: parseInt(cycleDuration),
          announcements: timelineSlots,
        } as TimelineSchedule,
        createdBy: user?.id || 'user1',
      };

      const newSchedule = await schedulerAPI.createSchedule(scheduleData);

      setSchedules([...schedules, {
        ...newSchedule,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);
      
      // Reset form
      setScheduleName('');
      setSelectedAnnouncements([]);
      setSelectedDevices([]);
      setTimelineSlots([]);
      setIsCreateOpen(false);
      
      toast.success(`Created schedule: ${scheduleName}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create schedule');
      console.error('Create schedule error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleEnabled = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    const newEnabled = !schedule?.enabled;
    
    try {
      const result = await schedulerAPI.toggleSchedule(scheduleId, newEnabled);
      setSchedules(schedules.map(s =>
        s.id === scheduleId ? { ...s, enabled: result.enabled } : s
      ));
      toast.success(`${result.enabled ? 'Enabled' : 'Disabled'} ${schedule?.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle schedule');
      console.error('Toggle schedule error:', error);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    
    try {
      await schedulerAPI.deleteSchedule(scheduleId);
      setSchedules(schedules.filter(s => s.id !== scheduleId));
      toast.success(`Deleted ${schedule?.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete schedule');
      console.error('Delete schedule error:', error);
    }
  };

  const addTimelineSlot = () => {
    if (selectedAnnouncements.length === 0) return;
    setTimelineSlots([...timelineSlots, {
      announcementId: selectedAnnouncements[0],
      timestampSeconds: 0,
    }]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600">Create and manage announcement schedules</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Schedule</DialogTitle>
              <DialogDescription>Set up automated announcement scheduling</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label>Schedule Name</Label>
                <Input
                  placeholder="e.g. Hourly Promotions"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                />
              </div>

              {/* Schedule Type */}
              <Tabs value={scheduleType} onValueChange={(v) => setScheduleType(v as 'interval' | 'timeline')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="interval">
                    <Repeat className="h-4 w-4 mr-2" />
                    Interval-Based
                  </TabsTrigger>
                  <TabsTrigger value="timeline">
                    <Clock className="h-4 w-4 mr-2" />
                    Timeline-Based
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="interval" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Play Every (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Select Announcements</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                      {availableAudio.map(audio => (
                        <label key={audio.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAnnouncements.includes(audio.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAnnouncements([...selectedAnnouncements, audio.id]);
                              } else {
                                setSelectedAnnouncements(selectedAnnouncements.filter(id => id !== audio.id));
                              }
                            }}
                            className="rounded"
                          />
                          <span>{audio.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="avoid-repeat"
                      checked={avoidRepeat}
                      onCheckedChange={setAvoidRepeat}
                    />
                    <Label htmlFor="avoid-repeat">Avoid repeating same announcement back-to-back</Label>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="quiet-hours"
                        checked={quietHoursEnabled}
                        onCheckedChange={setQuietHoursEnabled}
                      />
                      <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                    </div>
                    {quietHoursEnabled && (
                      <div className="grid grid-cols-2 gap-3 ml-8">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={quietStart}
                            onChange={(e) => setQuietStart(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={quietEnd}
                            onChange={(e) => setQuietEnd(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cycle Duration (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={cycleDuration}
                      onChange={(e) => setCycleDuration(e.target.value)}
                    />
                    <p className="text-sm text-slate-500">
                      The schedule will repeat every {cycleDuration} minutes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Timeline Slots</Label>
                      <Button size="sm" variant="outline" onClick={addTimelineSlot}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Slot
                      </Button>
                    </div>
                    <div className="space-y-3 border rounded-lg p-3">
                      {timelineSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Select
                            value={slot.announcementId}
                            onValueChange={(value) => {
                              const newSlots = [...timelineSlots];
                              newSlots[index].announcementId = value;
                              setTimelineSlots(newSlots);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAudio.map(audio => (
                                <SelectItem key={audio.id} value={audio.id}>
                                  {audio.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Label>At</Label>
                            <Input
                              type="number"
                              min="0"
                              max={parseInt(cycleDuration) * 60}
                              placeholder="Seconds"
                              className="w-24"
                              value={slot.timestampSeconds}
                              onChange={(e) => {
                                const newSlots = [...timelineSlots];
                                newSlots[index].timestampSeconds = parseInt(e.target.value) || 0;
                                setTimelineSlots(newSlots);
                              }}
                            />
                            <span className="text-sm text-slate-500">sec</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTimelineSlots(timelineSlots.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {timelineSlots.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">
                          No slots added yet. Click "Add Slot" to begin.
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Device Selection */}
              <div className="space-y-2">
                <Label>Select Devices</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {availableDevices.map(device => (
                    <label key={device.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDevices([...selectedDevices, device.id]);
                          } else {
                            setSelectedDevices(selectedDevices.filter(id => id !== device.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span>{device.name}</span>
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="ml-auto">
                        {device.status}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={handleCreateSchedule} className="w-full" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Schedule'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedules List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSchedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {schedule.schedule.type === 'interval' ? (
                      <Repeat className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-purple-600" />
                    )}
                    {schedule.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {schedule.schedule.type === 'interval'
                      ? `Plays every ${schedule.schedule.intervalMinutes} minutes`
                      : `${schedule.schedule.cycleDurationMinutes} minute cycle`}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDelete(schedule.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`enabled-${schedule.id}`}>Active</Label>
                    <Switch
                      id={`enabled-${schedule.id}`}
                      checked={schedule.enabled}
                      onCheckedChange={() => handleToggleEnabled(schedule.id)}
                    />
                  </div>
                  <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                    {schedule.enabled ? 'Running' : 'Paused'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Devices ({schedule.deviceIds.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {schedule.deviceIds.map(deviceId => {
                      const device = devices.find(d => d.id === deviceId);
                      return device ? (
                        <Badge key={deviceId} variant="outline">
                          {device.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {schedule.schedule.type === 'interval' ? 'Announcements' : 'Timeline'}
                  </p>
                  {schedule.schedule.type === 'interval' ? (
                    <div className="flex flex-wrap gap-2">
                      {schedule.schedule.announcementIds.map(audioId => {
                        const audio = audioFiles.find(a => a.id === audioId);
                        return audio ? (
                          <Badge key={audioId} variant="secondary">
                            {audio.title}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {schedule.schedule.announcements.map((slot, index) => {
                        const audio = audioFiles.find(a => a.id === slot.announcementId);
                        const mins = Math.floor(slot.timestampSeconds / 60);
                        const secs = slot.timestampSeconds % 60;
                        return audio ? (
                          <div key={index} className="text-sm text-slate-600">
                            {mins}:{secs.toString().padStart(2, '0')} - {audio.title}
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {schedule.schedule.type === 'interval' && schedule.schedule.quietHoursStart && (
                  <div className="text-sm text-slate-600">
                    Quiet hours: {schedule.schedule.quietHoursStart} - {schedule.schedule.quietHoursEnd}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSchedules.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500">No schedules created yet</p>
            <p className="text-sm text-slate-400 mt-2">Create your first schedule to automate announcements</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}