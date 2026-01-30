import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Calendar, Plus, Clock, Repeat } from 'lucide-react';
import { IntervalScheduleTab } from './IntervalScheduleTab';
import { TimelineScheduleTab } from './TimelineScheduleTab';
import { DateTimeScheduleTab } from './DateTimeScheduleTab';
import type { Schedule } from '@/lib/types';
import type { Zone } from '@/lib/api';

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSchedule: Schedule | null;
  availableAudio: any[];
  availableZones: Zone[];
  activeTarget: string | null;
  onSave: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  editingSchedule,
  availableAudio,
  availableZones,
  activeTarget,
  onSave,
  isLoading,
}: ScheduleFormDialogProps) {
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleType, setScheduleType] = useState<'interval' | 'timeline' | 'datetime'>('interval');
  const [intervalMinutes, setIntervalMinutes] = useState('60');
  const [cycleDuration, setCycleDuration] = useState('30');
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [timelineSlots, setTimelineSlots] = useState<{ announcementId: string; timestampSeconds: number }[]>([]);
  const [dateTimeSlots, setDateTimeSlots] = useState<{
    announcementId: string;
    date: string;
    time: string;
    repeat: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
    repeatDays?: number[];
    endDate?: string;
  }[]>([]);

  // Track previous open state and editing schedule ID to only reset when needed
  const prevOpenRef = useRef(false);
  const prevEditingScheduleIdRef = useRef<string | null>(null);

  // Load editing schedule data - only when dialog opens or editingSchedule changes
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    const isNowOpen = open;
    const currentEditingId = editingSchedule?.id || null;
    const prevEditingId = prevEditingScheduleIdRef.current;

    // Only initialize/reset when:
    // 1. Dialog just opened (was closed, now open)
    // 2. Editing schedule ID changed (switching between schedules or create/edit mode)
    const shouldInitialize = (!wasOpen && isNowOpen) || (currentEditingId !== prevEditingId);

    if (shouldInitialize) {
      if (editingSchedule) {
        setScheduleName(editingSchedule.name);
        setScheduleType(editingSchedule.schedule.type);
        const config = editingSchedule.schedule;
        
        if (config.type === 'interval') {
          setIntervalMinutes(String(config.intervalMinutes || 60));
          setSelectedAnnouncements(config.announcementIds || []);
        } else if (config.type === 'timeline') {
          setCycleDuration(String(config.cycleDurationMinutes || 30));
          setTimelineSlots(config.announcements || []);
        } else if (config.type === 'datetime') {
          setDateTimeSlots(config.dateTimeSlots || []);
        }
        
        // Set zones
        if (editingSchedule.zoneIds) {
          setSelectedZones(editingSchedule.zoneIds);
        } else if (editingSchedule.zones) {
          setSelectedZones(editingSchedule.zones.map((z: any) => z.id || z));
        }
      } else {
        // Reset form for new schedule
        setScheduleName('');
        setScheduleType('interval');
        setIntervalMinutes('60');
        setCycleDuration('30');
        setSelectedAnnouncements([]);
        setTimelineSlots([]);
        setDateTimeSlots([]);
        
        // Auto-select active zone if available (only when initializing)
        if (activeTarget && availableZones.length > 0) {
          const activeZone = availableZones.find(z => z.id === activeTarget || z.name === activeTarget);
          setSelectedZones(activeZone ? [activeZone.id] : []);
        } else {
          setSelectedZones([]);
        }
      }
    }

    // Update refs
    prevOpenRef.current = isNowOpen;
    prevEditingScheduleIdRef.current = currentEditingId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingSchedule?.id]);

  const convertTo24Hour = (time12h: string): string => {
    const [time, period] = time12h.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  };

  const handleSave = async () => {
    if (!scheduleName.trim()) {
      return;
    }
    if (scheduleType === 'datetime') {
      if (dateTimeSlots.length === 0) {
        return;
      }
    } else {
      if (selectedAnnouncements.length === 0) {
        return;
      }
    }
    if (selectedZones.length === 0) {
      return;
    }

    let scheduleConfig: any;
    
    if (scheduleType === 'interval') {
      scheduleConfig = {
        type: 'interval',
        intervalMinutes: parseInt(intervalMinutes),
        announcementIds: selectedAnnouncements,
      };
    } else if (scheduleType === 'timeline') {
      scheduleConfig = {
        type: 'timeline',
        cycleDurationMinutes: parseInt(cycleDuration),
        announcements: timelineSlots,
      };
    } else if (scheduleType === 'datetime') {
      const processedSlots = dateTimeSlots.map(slot => ({
        ...slot,
        time: slot.time.includes('AM') || slot.time.includes('PM') 
          ? convertTo24Hour(slot.time) 
          : slot.time,
      }));
      
      scheduleConfig = {
        type: 'datetime',
        dateTimeSlots: processedSlots,
      };
    }

    const scheduleData = {
      name: scheduleName,
      schedule_config: scheduleConfig,
      zones: selectedZones,
      enabled: editingSchedule?.enabled ?? true,
    };

    await onSave(scheduleData);
  };

  const addTimelineSlot = () => {
    if (availableAudio.length === 0) return;
    setTimelineSlots([...timelineSlots, {
      announcementId: availableAudio[0]?.id || '',
      timestampSeconds: 0,
    }]);
  };

  const addDateTimeSlot = () => {
    if (availableAudio.length === 0) return;
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setDateTimeSlots([...dateTimeSlots, {
      announcementId: availableAudio[0]?.id || '',
      date: dateStr,
      time: '09:00 AM',
      repeat: 'none' as const,
      repeatDays: [],
    }]);
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10">
      <DialogHeader>
        <DialogTitle className="text-white">
          {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
        </DialogTitle>
        <DialogDescription className="text-gray-400">
          {editingSchedule ? 'Update schedule settings' : 'Set up automated announcement scheduling'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Schedule Name</Label>
            <Input
              placeholder="e.g. Hourly Promotions"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              {activeTarget ? 'Zone' : 'Select Zones'}
              {activeTarget && (
                <span className="text-xs text-gray-400 ml-2">(Active zone pre-selected)</span>
              )}
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-white/10 rounded-lg p-3 bg-[#2a2a2a]">
              {availableZones.length === 0 ? (
                <p className="text-sm text-gray-400">No zones available</p>
              ) : (
                availableZones.map(zone => (
                  <label key={zone.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedZones.includes(zone.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedZones([...selectedZones, zone.id]);
                        } else {
                          setSelectedZones(selectedZones.filter(id => id !== zone.id));
                        }
                      }}
                      className="rounded"
                      disabled={activeTarget && zone.id === activeTarget}
                    />
                    <span className={activeTarget && zone.id === activeTarget ? 'font-semibold text-[#1db954]' : 'text-gray-300'}>
                      {zone.name}
                      {activeTarget && zone.id === activeTarget && ' (Active)'}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <Tabs value={scheduleType} onValueChange={(v) => setScheduleType(v as 'interval' | 'timeline' | 'datetime')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interval">
              <Repeat className="h-4 w-4 mr-2" />
              Interval-Based
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Timeline-Based
            </TabsTrigger>
            <TabsTrigger value="datetime">
              <Calendar className="h-4 w-4 mr-2" />
              Date & Time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interval">
            <IntervalScheduleTab
              intervalMinutes={intervalMinutes}
              onIntervalMinutesChange={setIntervalMinutes}
              availableAudio={availableAudio}
              selectedAnnouncements={selectedAnnouncements}
              onAnnouncementsChange={setSelectedAnnouncements}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineScheduleTab
              cycleDuration={cycleDuration}
              onCycleDurationChange={setCycleDuration}
              timelineSlots={timelineSlots}
              onTimelineSlotsChange={setTimelineSlots}
              availableAudio={availableAudio}
              onAddSlot={addTimelineSlot}
            />
          </TabsContent>

          <TabsContent value="datetime">
            <DateTimeScheduleTab
              dateTimeSlots={dateTimeSlots}
              onDateTimeSlotsChange={setDateTimeSlots}
              availableAudio={availableAudio}
              onAddSlot={addDateTimeSlot}
            />
          </TabsContent>
        </Tabs>

        <Button onClick={handleSave} className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </div>
    </DialogContent>
  );
}

