import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Slider } from '@/app/components/ui/slider';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { 
  Plus, 
  Music, 
  Radio, 
  Trash2, 
  Edit,
  ListMusic,
  Clock,
  Shuffle,
  MapPin
} from 'lucide-react';
import { musicAPI, announcementsAPI, zonesAPI, schedulerAPI } from '@/lib/api';
import { ChannelPlaylist, Device, MusicFile, Zone } from '@/lib/types';
import { toast } from 'sonner';

export function ChannelPlaylists() {
  const { user } = useAuth();
  const {
    musicFiles: allMusicFiles,
    announcements: allAnnouncements,
    devices: allDevices,
    zones: allZones,
    channelPlaylists,
    isLoading: loadingStates
  } = useFiles();
  const clientId = user?.role === 'admin' ? null : user?.clientId;

  // Playlist state (keep local since this manages playlists specifically)
  const [playlists, setPlaylists] = useState<ChannelPlaylist[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<ChannelPlaylist | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load playlists from centralized state
    const filteredPlaylists = Array.isArray(channelPlaylists)
      ? (clientId ? channelPlaylists.filter((p: any) => p.clientId === clientId) : channelPlaylists)
      : [];
    setPlaylists(filteredPlaylists);
  }, [channelPlaylists, clientId]);

  // Filter data
  const filteredMusic = clientId
    ? allMusicFiles.filter(m => m.clientId === clientId)
    : allMusicFiles;
  const filteredAnnouncements = clientId
    ? allAnnouncements.filter(a => a.clientId === clientId)
    : allAnnouncements;
  const filteredDevices = clientId
    ? allDevices.filter(d => d.clientId === clientId)
    : allDevices;
  const filteredZones = clientId
    ? allZones.filter(z => z.clientId === clientId)
    : allZones;

  const isLoading = loadingStates.musicFiles || loadingStates.announcements || loadingStates.devices || loadingStates.zones;
  const zones = filteredZones;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedMusicIds: [] as string[],
    selectedAnnouncementIds: [] as string[],
    selectedZones: [] as string[],
    defaultMusicInterval: 5,
    defaultAnnouncementInterval: 15,
    shuffleMusic: true,
    shuffleAnnouncements: false,
    quietHoursStart: '',
    quietHoursEnd: '',
    enabled: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      selectedMusicIds: [],
      selectedAnnouncementIds: [],
      selectedZones: [],
      defaultMusicInterval: 5,
      defaultAnnouncementInterval: 15,
      shuffleMusic: true,
      shuffleAnnouncements: false,
      quietHoursStart: '',
      quietHoursEnd: '',
      enabled: true,
    });
    setEditingPlaylist(null);
  };

  const handleCreatePlaylist = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    if (formData.selectedMusicIds.length === 0 && formData.selectedAnnouncementIds.length === 0) {
      toast.error('Please select at least one music track or announcement');
      return;
    }

    setIsSaving(true);
    try {
      // Create playlist items for API
      const items = [
        ...formData.selectedMusicIds.map(id => ({
          item_type: 'music',
          content_id: id,
          interval_minutes: formData.defaultMusicInterval,
        })),
        ...formData.selectedAnnouncementIds.map(id => ({
          item_type: 'announcement',
          content_id: id,
          interval_minutes: formData.defaultAnnouncementInterval,
        })),
      ];

      const playlistData = {
        name: formData.name,
        description: formData.description || '',
        zones: formData.selectedZones,
        items,
        default_music_interval: formData.defaultMusicInterval,
        default_announcement_interval: formData.defaultAnnouncementInterval,
        shuffle_music: formData.shuffleMusic,
        shuffle_announcements: formData.shuffleAnnouncements,
        quiet_hours_start: formData.quietHoursStart || undefined,
        quiet_hours_end: formData.quietHoursEnd || undefined,
        enabled: formData.enabled,
      };

      const newPlaylist = await schedulerAPI.createChannelPlaylist(playlistData);
      setPlaylists([...playlists, newPlaylist as ChannelPlaylist]);
      toast.success('Channel playlist created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to create playlist:', error);
      toast.error('Failed to create playlist', { description: error?.message || 'Please try again' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPlaylist = (playlist: ChannelPlaylist) => {
    setEditingPlaylist(playlist);
    setFormData({
      name: playlist.name,
      description: playlist.description,
      selectedMusicIds: playlist.items
        .filter(item => item.type === 'music')
        .map(item => item.contentId),
      selectedAnnouncementIds: playlist.items
        .filter(item => item.type === 'announcement')
        .map(item => item.contentId),
      selectedZones: playlist.zoneIds ?? [],
      defaultMusicInterval: playlist.defaultMusicInterval,
      defaultAnnouncementInterval: playlist.defaultAnnouncementInterval,
      shuffleMusic: playlist.shuffleMusic,
      shuffleAnnouncements: playlist.shuffleAnnouncements,
      quietHoursStart: playlist.quietHoursStart || '',
      quietHoursEnd: playlist.quietHoursEnd || '',
      enabled: playlist.enabled,
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist) return;

    setIsSaving(true);
    try {
      // Create playlist items for API
      const items = [
        ...formData.selectedMusicIds.map(id => ({
          item_type: 'music',
          content_id: id,
          interval_minutes: formData.defaultMusicInterval,
        })),
        ...formData.selectedAnnouncementIds.map(id => ({
          item_type: 'announcement',
          content_id: id,
          interval_minutes: formData.defaultAnnouncementInterval,
        })),
      ];

      const updateData = {
        name: formData.name,
        description: formData.description || '',
        zones: formData.selectedZones,
        items,
        default_music_interval: formData.defaultMusicInterval,
        default_announcement_interval: formData.defaultAnnouncementInterval,
        shuffle_music: formData.shuffleMusic,
        shuffle_announcements: formData.shuffleAnnouncements,
        quiet_hours_start: formData.quietHoursStart || undefined,
        quiet_hours_end: formData.quietHoursEnd || undefined,
        enabled: formData.enabled,
      };

      const updatedPlaylist = await schedulerAPI.updateChannelPlaylist(editingPlaylist.id, updateData);
      setPlaylists(playlists.map(p => p.id === editingPlaylist.id ? updatedPlaylist as ChannelPlaylist : p));
      toast.success('Playlist updated successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to update playlist:', error);
      toast.error('Failed to update playlist', { description: error?.message || 'Please try again' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      await schedulerAPI.deleteChannelPlaylist(playlistId);
      setPlaylists(playlists.filter(p => p.id !== playlistId));
      toast.success('Playlist deleted');
    } catch (error: any) {
      console.error('Failed to delete playlist:', error);
      toast.error('Failed to delete playlist', { description: error?.message || 'Please try again' });
    }
  };

  const handleToggleEnabled = async (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    try {
      const updatedPlaylist = await schedulerAPI.updateChannelPlaylist(playlistId, {
        enabled: !playlist.enabled
      });
      setPlaylists(playlists.map(p => 
        p.id === playlistId ? updatedPlaylist as ChannelPlaylist : p
      ));
      toast.success(`Playlist ${!playlist.enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Failed to toggle playlist:', error);
      toast.error('Failed to update playlist', { description: error?.message || 'Please try again' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading channel playlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Channel Playlists</h1>
          <p className="text-slate-500 mt-1">
            Create unified playlists combining music and announcements
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
              </DialogTitle>
              <DialogDescription>
                Combine music and announcements into a unified playlist for your zones
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Playlist Name *</Label>
                  <Input
                    placeholder="e.g., Morning Rush - Ground Floor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe this playlist..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              {/* Zone Assignment */}
              <div className="space-y-2">
                <Label>Assign to Zones</Label>
                <div className="grid grid-cols-2 gap-2">
                  {zones.map((zone) => (
                    <label
                      key={zone.id}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedZones.includes(zone.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedZones: [...formData.selectedZones, zone.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedZones: formData.selectedZones.filter(z => z !== zone.id),
                            });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">{zone.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Music Selection */}
              <div className="space-y-2">
                <Label>Music Tracks</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {filteredMusic.map((music) => (
                    <label
                      key={music.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedMusicIds.includes(music.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedMusicIds: [...formData.selectedMusicIds, music.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedMusicIds: formData.selectedMusicIds.filter(id => id !== music.id),
                            });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Music className="h-4 w-4 text-blue-600" />
                      <span className="text-sm flex-1">{music.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {formData.selectedMusicIds.length} track{formData.selectedMusicIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              {/* Announcement Selection */}
              <div className="space-y-2">
                <Label>Announcements</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {filteredAnnouncements.map((announcement) => (
                    <label
                      key={announcement.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedAnnouncementIds.includes(announcement.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedAnnouncementIds: [...formData.selectedAnnouncementIds, announcement.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedAnnouncementIds: formData.selectedAnnouncementIds.filter(id => id !== announcement.id),
                            });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Radio className="h-4 w-4 text-green-600" />
                      <span className="text-sm flex-1">{announcement.title}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {formData.selectedAnnouncementIds.length} announcement{formData.selectedAnnouncementIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              {/* Intervals */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Music Interval (minutes)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[formData.defaultMusicInterval]}
                      onValueChange={(value) => 
                        setFormData({ ...formData, defaultMusicInterval: value[0] })
                      }
                      min={1}
                      max={30}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-16">
                      {formData.defaultMusicInterval}m
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Announcement Interval (minutes)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[formData.defaultAnnouncementInterval]}
                      onValueChange={(value) => 
                        setFormData({ ...formData, defaultAnnouncementInterval: value[0] })
                      }
                      min={1}
                      max={60}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-16">
                      {formData.defaultAnnouncementInterval}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Shuffle Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-slate-500" />
                    <Label>Shuffle Music</Label>
                  </div>
                  <Switch
                    checked={formData.shuffleMusic}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, shuffleMusic: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-slate-500" />
                    <Label>Shuffle Announcements</Label>
                  </div>
                  <Switch
                    checked={formData.shuffleAnnouncements}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, shuffleAnnouncements: checked })
                    }
                  />
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-2">
                <Label>Quiet Hours (Optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Start Time</Label>
                    <Input
                      type="time"
                      value={formData.quietHoursStart}
                      onChange={(e) => 
                        setFormData({ ...formData, quietHoursStart: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">End Time</Label>
                    <Input
                      type="time"
                      value={formData.quietHoursEnd}
                      onChange={(e) => 
                        setFormData({ ...formData, quietHoursEnd: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={editingPlaylist ? handleUpdatePlaylist : handleCreatePlaylist}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : (editingPlaylist ? 'Update Playlist' : 'Create Playlist')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Playlists List */}
      {playlists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListMusic className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No playlists yet</h3>
            <p className="text-slate-500 mb-6">
              Create your first channel playlist to get started
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {playlists.map((playlist) => {
            const musicCount = playlist.items.filter(i => i.type === 'music').length;
            const announcementCount = playlist.items.filter(i => i.type === 'announcement').length;

            return (
              <Card key={playlist.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {playlist.name}
                        {!playlist.enabled && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {playlist.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Switch
                      checked={playlist.enabled}
                      onCheckedChange={() => handleToggleEnabled(playlist.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Music className="h-4 w-4" />
                        <span className="text-xs font-medium">Music</span>
                      </div>
                      <p className="text-lg font-bold">{musicCount}</p>
                      <p className="text-xs text-slate-600">
                        Every {playlist.defaultMusicInterval}m
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <Radio className="h-4 w-4" />
                        <span className="text-xs font-medium">Announcements</span>
                      </div>
                      <p className="text-lg font-bold">{announcementCount}</p>
                      <p className="text-xs text-slate-600">
                        Every {playlist.defaultAnnouncementInterval}m
                      </p>
                    </div>
                  </div>

                  {/* Zones */}
                  {playlist.floorIds.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Assigned Zones
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {playlist.floorIds.map((zone) => (
                          <Badge key={zone} variant="outline">
                            {zone}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quiet Hours */}
                  {playlist.quietHoursStart && playlist.quietHoursEnd && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        Quiet Hours: {playlist.quietHoursStart} - {playlist.quietHoursEnd}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPlaylist(playlist)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
