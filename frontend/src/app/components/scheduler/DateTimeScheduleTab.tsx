import React from 'react';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { AnnouncementPreview } from './AnnouncementPreview';

interface DateTimeSlot {
  announcementId: string;
  date: string;
  time: string;
  repeat: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
  repeatDays?: number[];
  endDate?: string;
}

interface DateTimeScheduleTabProps {
  dateTimeSlots: DateTimeSlot[];
  onDateTimeSlotsChange: (slots: DateTimeSlot[]) => void;
  availableAudio: any[];
  onAddSlot: () => void;
}

export function DateTimeScheduleTab({
  dateTimeSlots,
  onDateTimeSlotsChange,
  availableAudio,
  onAddSlot,
}: DateTimeScheduleTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Date & Time Slots</Label>
          <Button size="sm" variant="outline" onClick={onAddSlot}>
            <Plus className="h-4 w-4 mr-2" />
            Add Date/Time Slot
          </Button>
        </div>
        <div className="space-y-3 border border-white/10 rounded-lg p-3 max-h-96 overflow-y-auto bg-[#2a2a2a]">
          {dateTimeSlots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 mb-2">No date/time slots added yet</p>
              <p className="text-xs text-gray-500">Click "Add Date/Time Slot" to create your first slot</p>
            </div>
          ) : (
            dateTimeSlots.map((slot, index) => {
              const [timeValue, period] = slot.time.includes('AM') || slot.time.includes('PM')
                ? slot.time.split(' ')
                : [slot.time, 'AM'];
              const [hours, minutes] = timeValue.split(':');
              const selectedAudio = availableAudio.find(a => a.id === slot.announcementId);
              
              return (
                <div key={index} className="bg-[#1a1a1a] p-4 rounded-lg border border-white/10 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Announcement</Label>
                        {selectedAudio && (
                          <AnnouncementPreview audio={selectedAudio} size="sm" />
                        )}
                      </div>
                      <Select
                        value={slot.announcementId}
                        onValueChange={(value) => {
                          const newSlots = [...dateTimeSlots];
                          newSlots[index].announcementId = value;
                          onDateTimeSlotsChange(newSlots);
                        }}
                      >
                        <SelectTrigger>
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
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={slot.date}
                        onChange={(e) => {
                          const newSlots = [...dateTimeSlots];
                          newSlots[index].date = e.target.value;
                          onDateTimeSlotsChange(newSlots);
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full"
                      />
                      {slot.date && (
                        <p className="text-xs text-gray-400">
                          {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Hour</Label>
                      <Select
                        value={hours}
                        onValueChange={(value) => {
                          const newSlots = [...dateTimeSlots];
                          const newTime = `${value}:${minutes} ${period}`;
                          newSlots[index].time = newTime;
                          onDateTimeSlotsChange(newSlots);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <SelectItem key={h} value={h.toString().padStart(2, '0')}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Minute</Label>
                      <Select
                        value={minutes}
                        onValueChange={(value) => {
                          const newSlots = [...dateTimeSlots];
                          const newTime = `${hours}:${value} ${period}`;
                          newSlots[index].time = newTime;
                          onDateTimeSlotsChange(newSlots);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 60 }, (_, i) => {
                            const min = i.toString().padStart(2, '0');
                            return (
                              <SelectItem key={min} value={min}>
                                {min}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Period</Label>
                      <Select
                        value={period}
                        onValueChange={(value) => {
                          const newSlots = [...dateTimeSlots];
                          const newTime = `${hours}:${minutes} ${value}`;
                          newSlots[index].time = newTime;
                          onDateTimeSlotsChange(newSlots);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Repeat</Label>
                      <Select
                        value={slot.repeat}
                        onValueChange={(value) => {
                          const newSlots = [...dateTimeSlots];
                          newSlots[index].repeat = value as any;
                          if (value !== 'weekly') {
                            newSlots[index].repeatDays = [];
                          } else if (!newSlots[index].repeatDays || newSlots[index].repeatDays.length === 0) {
                            newSlots[index].repeatDays = [1, 2, 3, 4, 5];
                          }
                          onDateTimeSlotsChange(newSlots);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Repeat</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {slot.repeat !== 'none' && (
                      <div className="space-y-2">
                        <Label>End Date (Optional)</Label>
                        <Input
                          type="date"
                          value={slot.endDate || ''}
                          onChange={(e) => {
                            const newSlots = [...dateTimeSlots];
                            newSlots[index].endDate = e.target.value || undefined;
                            onDateTimeSlotsChange(newSlots);
                          }}
                          min={slot.date || new Date().toISOString().split('T')[0]}
                          className="w-full"
                        />
                        {slot.endDate && (
                          <p className="text-xs text-gray-400">
                            {new Date(slot.endDate + 'T00:00:00').toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {slot.repeat === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Repeat Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 0, label: 'Sun' },
                          { value: 1, label: 'Mon' },
                          { value: 2, label: 'Tue' },
                          { value: 3, label: 'Wed' },
                          { value: 4, label: 'Thu' },
                          { value: 5, label: 'Fri' },
                          { value: 6, label: 'Sat' },
                        ].map(day => (
                          <label key={day.value} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5 transition-colors">
                            <input
                              type="checkbox"
                              checked={slot.repeatDays?.includes(day.value)}
                              onChange={(e) => {
                                const newSlots = [...dateTimeSlots];
                                if (!newSlots[index].repeatDays) {
                                  newSlots[index].repeatDays = [];
                                }
                                if (e.target.checked) {
                                  newSlots[index].repeatDays = [...(newSlots[index].repeatDays || []), day.value];
                                } else {
                                  newSlots[index].repeatDays = (newSlots[index].repeatDays || []).filter(d => d !== day.value);
                                }
                                onDateTimeSlotsChange(newSlots);
                              }}
                              className="rounded"
                            />
                            <span className={`text-sm ${slot.repeatDays?.includes(day.value) ? 'text-[#1db954] font-medium' : 'text-gray-300'}`}>{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDateTimeSlotsChange(dateTimeSlots.filter((_, i) => i !== index))}
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Slot
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

