import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
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
import { mockDevices } from '@/lib/mockData';
import { ChannelPlaylist, ChannelPlaylistItem } from '@/lib/types';
import { announcementsAPI, musicAPI } from '@/lib/api';
import { toast } from 'sonner';

export function ChannelPlaylists() {
  const { user } = useAuth();
  const clientId = user?.role === 'admin' ? null : user?.clientId;

  const [musicFiles, setMusicFiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Filter data
  const filteredMusic = clientId 
    ? musicFiles.filter(m => m.clientId === clientId) 
    : musicFiles;
  const filteredAnnouncements = clientId 
    ? announcements.filter(a => a.clientId === clientId) 
    : announcements;
  const filteredDevices = clientId 
    ? mockDevices.filter(d => d.clientId === clientId) 
    : mockDevices;

  // Get unique zones
  const zones = Array.from(new Set(filteredDevices.map(d => d.zone).filter(Boolean)));

  // Playlist state
  const [playlists, setPlaylists] = useState<ChannelPlaylist[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<ChannelPlaylist | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [music, anns] = await Promise.all([
          musicAPI.getMusicFiles(),
          announcementsAPI.getAnnouncements(),
        ]);
        setMusicFiles(music);
        setAnnouncements(anns);
      } catch (e: any) {
        console.error('Channel playlists load failed:', e);
        toast.error(e?.message || 'Failed to load music/announcements');
      }
    };
    load();
  }, []);

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

  const handleCreatePlaylist = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    if (formData.selectedMusicIds.length === 0 && formData.selectedAnnouncementIds.length === 0) {
      toast.error('Please select at least one music track or announcement');
      return;
    }

    // Create playlist items
    const items: ChannelPlaylistItem[] = [
      ...formData.selectedMusicIds.map(id => ({
        id: `item-${Date.now()}-${id}`,
        type: 'music' as const,
        contentId: id,
        intervalMinutes: formData.defaultMusicInterval,
      })),
      ...formData.selectedAnnouncementIds.map(id => ({
        id: `item-${Date.now()}-${id}`,
        type: 'announcement' as const,
        contentId: id,
        intervalMinutes: formData.defaultAnnouncementInterval,
      })),
    ];

    const newPlaylist: ChannelPlaylist = {
      id: `playlist-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      clientId: clientId || 'client1',
      floorIds: formData.selectedZones,
      items,
      defaultMusicInterval: formData.defaultMusicInterval,
      defaultAnnouncementInterval: formData.defaultAnnouncementInterval,
      shuffleMusic: formData.shuffleMusic,
      shuffleAnnouncements: formData.shuffleAnnouncements,
      quietHoursStart: formData.quietHoursStart || undefined,
      quietHoursEnd: formData.quietHoursEnd || undefined,
      enabled: formData.enabled,
      createdAt: new Date(),
      createdBy: user?.id || 'user1',
      updatedAt: new Date(),
    };

    setPlaylists([...playlists, newPlaylist]);
    toast.success('Channel playlist created successfully');
    setIsCreateDialogOpen(false);
    resetForm();
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
      selectedZones: playlist.floorIds,
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

  const handleUpdatePlaylist = () => {
    if (!editingPlaylist) return;

    const items: ChannelPlaylistItem[] = [
      ...formData.selectedMusicIds.map(id => ({
        id: `item-${Date.now()}-${id}`,
        type: 'music' as const,
        contentId: id,
        intervalMinutes: formData.defaultMusicInterval,
      })),
      ...formData.selectedAnnouncementIds.map(id => ({
        id: `item-${Date.now()}-${id}`,
        type: 'announcement' as const,
        contentId: id,
        intervalMinutes: formData.defaultAnnouncementInterval,
      })),
    ];

    const updatedPlaylist: ChannelPlaylist = {
      ...editingPlaylist,
      name: formData.name,
      description: formData.description,
      floorIds: formData.selectedZones,
      items,
      defaultMusicInterval: formData.defaultMusicInterval,
      defaultAnnouncementInterval: formData.defaultAnnouncementInterval,
      shuffleMusic: formData.shuffleMusic,
      shuffleAnnouncements: formData.shuffleAnnouncements,
      quietHoursStart: formData.quietHoursStart || undefined,
      quietHoursEnd: formData.quietHoursEnd || undefined,
      enabled: formData.enabled,
      updatedAt: new Date(),
    };

    setPlaylists(playlists.map(p => p.id === editingPlaylist.id ? updatedPlaylist : p));
    toast.success('Playlist updated successfully');
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists(playlists.filter(p => p.id !== playlistId));
    toast.success('Playlist deleted');
  };

  const handleToggleEnabled = (playlistId: string) => {
    setPlaylists(playlists.map(p => 
      p.id === playlistId ? { ...p, enabled: !p.enabled } : p
    ));
  };

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
                      key={zone}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-white/10"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedZones.includes(zone)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedZones: [...formData.selectedZones, zone],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedZones: formData.selectedZones.filter(z => z !== zone),
                            });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">{zone}</span>
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
                      className="flex items-center gap-3 p-2 hover:bg-white/10 rounded cursor-pointer"
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
                      className="flex items-center gap-3 p-2 hover:bg-white/10 rounded cursor-pointer"
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
              <Button onClick={editingPlaylist ? handleUpdatePlaylist : handleCreatePlaylist}>
                {editingPlaylist ? 'Update Playlist' : 'Create Playlist'}
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
