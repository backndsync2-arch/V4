import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Calendar, Clock, Repeat, MoreVertical, Trash2, Edit } from 'lucide-react';
import type { Schedule } from '@/lib/types';

interface ScheduleCardProps {
  schedule: Schedule;
  audioFiles: any[];
  zones: any[];
  onToggleEnabled: (scheduleId: string) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: string) => void;
  formatTime12h: (time24h: string) => string;
}

export function ScheduleCard({
  schedule,
  audioFiles,
  zones,
  onToggleEnabled,
  onEdit,
  onDelete,
  formatTime12h,
}: ScheduleCardProps) {
  return (
    <Card key={schedule.id}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {schedule.schedule.type === 'interval' ? (
                <Repeat className="h-5 w-5 text-blue-600" />
              ) : schedule.schedule.type === 'timeline' ? (
                <Clock className="h-5 w-5 text-purple-600" />
              ) : (
                <Calendar className="h-5 w-5 text-green-600" />
              )}
              {schedule.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {schedule.schedule.type === 'interval'
                ? `Plays every ${schedule.schedule.intervalMinutes} minutes`
                : schedule.schedule.type === 'timeline'
                ? `${schedule.schedule.cycleDurationMinutes} minute cycle`
                : `${schedule.schedule.dateTimeSlots?.length || 0} date/time slot(s)`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(schedule)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDelete(schedule.id)}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 w-9 p-0 border-white/20 hover:bg-white/10 hover:border-white/30"
                  aria-label="More options"
                >
                  <MoreVertical className="h-5 w-5 text-gray-300 hover:text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10 min-w-[150px]">
                <DropdownMenuItem 
                  onClick={() => onEdit(schedule)}
                  className="text-white hover:bg-white/10 cursor-pointer focus:bg-white/10"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Schedule
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(schedule.id)} 
                  className="text-red-400 hover:bg-red-600/20 hover:text-red-300 cursor-pointer focus:bg-red-600/20 focus:text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Schedule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
                onCheckedChange={() => onToggleEnabled(schedule.id)}
              />
            </div>
            <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
              {schedule.enabled ? 'Running' : 'Paused'}
            </Badge>
          </div>

          {/* Zones */}
          {(schedule.zoneIds && schedule.zoneIds.length > 0) || (schedule.zones && schedule.zones.length > 0) ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Zones ({(schedule.zones?.length ?? schedule.zoneIds?.length ?? 0)})</p>
              <div className="flex flex-wrap gap-2">
                {(schedule.zones || []).map((zone: any) => (
                  <Badge key={zone.id || zone} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {zone.name || zone}
                  </Badge>
                ))}
                {(schedule.zoneIds || []).filter((zId: string) => !schedule.zones?.some((z: any) => z.id === zId)).map((zoneId: string) => {
                  const zone = zones.find(z => z.id === zoneId);
                  return zone ? (
                    <Badge key={zoneId} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {zone.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium">
              {schedule.schedule.type === 'interval' ? 'Announcements' : 
               schedule.schedule.type === 'timeline' ? 'Timeline' : 
               'Date/Time Slots'}
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
            ) : schedule.schedule.type === 'timeline' ? (
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
            ) : (
              <div className="space-y-2">
                {schedule.schedule.dateTimeSlots?.map((slot: any, index: number) => {
                  const audio = audioFiles.find(a => a.id === slot.announcementId);
                  const timeDisplay = formatTime12h(slot.time);
                  const repeatLabel = slot.repeat === 'none' ? 'Once' :
                                    slot.repeat === 'daily' ? 'Daily' :
                                    slot.repeat === 'weekly' ? 'Weekly' :
                                    slot.repeat === 'monthly' ? 'Monthly' : 'Yearly';
                  return audio ? (
                    <div key={index} className="text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded border">
                      <div className="font-medium">{slot.date} at {timeDisplay}</div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {audio.title} • {repeatLabel}
                        {slot.repeat !== 'none' && slot.endDate && ` • Until ${slot.endDate}`}
                      </div>
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
  );
}

