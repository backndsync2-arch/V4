import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogTrigger } from '@/app/components/ui/dialog';
import { schedulerAPI, announcementsAPI, zonesAPI, musicAPI } from '@/lib/api';
import { Calendar, Plus, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Schedule } from '@/lib/types';
import type { Zone } from '@/lib/api';
import { usePlayback } from '@/lib/playback';
import { ScheduleCard } from './scheduler/ScheduleCard';
import { ScheduleFormDialog } from './scheduler/ScheduleFormDialog';
import { DeleteScheduleDialog } from './scheduler/DeleteScheduleDialog';

export function Scheduler() {
  const { user } = useAuth();
  const { activeTarget } = usePlayback();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount and when active zone changes
  useEffect(() => {
    loadData();
  }, [user, activeTarget]);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [schedulesData, announcementsData, zonesData, foldersData] = await Promise.all([
        schedulerAPI.getSchedules(),
        announcementsAPI.getAnnouncements(),
        zonesAPI.getZones(),
        musicAPI.getFolders('announcements'),
      ]);
      
      setSchedules(schedulesData);
      setAudioFiles(announcementsData);
      setZones(zonesData);
      setFolders(foldersData);
    } catch (error: any) {
      toast.error('Failed to load data: ' + (error.message || 'Unknown error'));
      console.error('Load data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  
  // Filter schedules by client and optionally by active zone
  let filteredSchedules = clientId ? schedules.filter(s => s.clientId === clientId) : schedules;
  
  // Filter by active zone if one is selected
  if (activeTarget) {
    filteredSchedules = filteredSchedules.filter((s) => {
      if (s.zoneIds && s.zoneIds.includes(activeTarget)) return true;
      if (s.zones && s.zones.some((z: any) => z.id === activeTarget || z.name === activeTarget)) return true;
      return false;
    });
  }
  
  // Filter announcements by client
  let availableAudio = clientId 
    ? audioFiles.filter(a => a.clientId === clientId && a.enabled) 
    : audioFiles.filter(a => a.enabled);
  
  // Filter announcements by active zone if one is selected
  if (activeTarget) {
    availableAudio = availableAudio.filter(a => {
      const hasDirectZone = String(a.zoneId || '') === String(activeTarget || '') || a.zone === activeTarget;
      
      if (hasDirectZone) {
        return true;
      }
      
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
  
  // Filter available zones - if active zone is selected, only show that zone
  const availableZones = activeTarget 
    ? zones.filter(z => z.id === activeTarget || z.name === activeTarget)
    : zones;

  // Helper to format time for display (convert 24h to 12h with AM/PM)
  const formatTime12h = (time24h: string): string => {
    if (time24h.includes('AM') || time24h.includes('PM')) {
      return time24h;
    }
    const [hours, minutes] = time24h.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  const handleCreateSchedule = async (scheduleData: any) => {
    setIsSaving(true);
    try {
      const newSchedule = await schedulerAPI.createSchedule(scheduleData);
      setSchedules([...schedules, newSchedule]);
      setIsCreateOpen(false);
      toast.success(`Created schedule: ${scheduleData.name}`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || error?.data?.error || 'Failed to create schedule';
      toast.error(String(errorMessage));
      console.error('Create schedule error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSchedule = async (scheduleData: any) => {
    if (!editingSchedule) return;
    
    setIsSaving(true);
    try {
      const updatedSchedule = await schedulerAPI.updateSchedule(editingSchedule.id, scheduleData);
      setSchedules(schedules.map(s =>
        s.id === editingSchedule.id ? updatedSchedule : s
      ));
      setIsEditOpen(false);
      setEditingSchedule(null);
      toast.success(`Updated schedule: ${scheduleData.name}`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || error?.data?.error || 'Failed to update schedule';
      toast.error(String(errorMessage));
      console.error('Update schedule error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsEditOpen(true);
  };

  const handleToggleEnabled = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    const newEnabled = !schedule?.enabled;
    
    try {
      const updatedSchedule = await schedulerAPI.toggleSchedule(scheduleId, newEnabled);
      setSchedules(schedules.map(s =>
        s.id === scheduleId ? updatedSchedule : s
      ));
      toast.success(`${schedule?.enabled ? 'Disabled' : 'Enabled'} ${schedule?.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle schedule');
      console.error('Toggle schedule error:', error);
    }
  };

  const handleDeleteClick = (scheduleId: string) => {
    setDeleteScheduleId(scheduleId);
    setIsDeleting(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteScheduleId) return;
    
    const schedule = schedules.find(s => s.id === deleteScheduleId);
    
    try {
      await schedulerAPI.deleteSchedule(deleteScheduleId);
      setSchedules(schedules.filter(s => s.id !== deleteScheduleId));
      setIsDeleting(false);
      setDeleteScheduleId(null);
      toast.success(`Deleted ${schedule?.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete schedule');
      console.error('Delete schedule error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1db954]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Scheduler</h2>
          <p className="text-gray-400">Create and manage announcement schedules</p>
          {activeTarget && (
            <p className="text-sm text-[#1db954] mt-1">
              Filtered by active zone
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Schedule
              </Button>
            </DialogTrigger>
            <ScheduleFormDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              editingSchedule={null}
              availableAudio={availableAudio}
              availableZones={availableZones}
              activeTarget={activeTarget}
              onSave={handleCreateSchedule}
              isLoading={isSaving}
            />
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <ScheduleFormDialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingSchedule(null);
          }}
          editingSchedule={editingSchedule}
          availableAudio={availableAudio}
          availableZones={availableZones}
          activeTarget={activeTarget}
          onSave={handleUpdateSchedule}
          isLoading={isSaving}
        />
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteScheduleDialog
        open={isDeleting}
        onOpenChange={setIsDeleting}
        scheduleName={schedules.find(s => s.id === deleteScheduleId)?.name || ''}
        onConfirm={handleDeleteConfirm}
      />

      {/* Schedules List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSchedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            audioFiles={audioFiles}
            zones={zones}
            onToggleEnabled={handleToggleEnabled}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            formatTime12h={formatTime12h}
          />
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
