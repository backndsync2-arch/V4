import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { announcementsAPI, musicAPI, zonesAPI } from '@/lib/api';
import { Radio, Plus, Play, Pause, Volume2, Mic, Upload, FileText, Trash2, MoreVertical } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { ImageUpload } from '@/app/components/ImageUpload';
import type { Folder, Device, Announcement } from '@/lib/types';

export function Announcements() {
  const { user } = useAuth();
  const { folders: allFolders, announcements, devices, isLoading: loadingStates } = useFiles();

  // Filter announcements
  const scripts = announcements.filter((a: any) => a.is_tts || !a.file);
  const audioFiles = announcements.filter((a: any) => a.file);
  const folders = allFolders.filter((f: Folder) => f.type === 'announcements');

  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInstantOpen, setIsInstantOpen] = useState(false);
  const [announcementIcons, setAnnouncementIcons] = useState<Record<string, string | null>>({});
  const [isCreating, setIsCreating] = useState(false);
        setFolders(announcementFolders);
        setDevices(Array.isArray(devicesData) ? devicesData : []);
        
        // Separate scripts from audio (TTS announcements)
        const scriptsData = (Array.isArray(announcementsData) ? announcementsData : []).filter((a: any) => a.is_tts || !a.file);
        setScripts(scriptsData);
      } catch (error: any) {
        console.error('Failed to load announcements:', error);
        toast.error('Failed to load announcements', { description: error?.message || 'Please try again' });
      } finally {
        setIsLoading(false);
      }
    };
    
    void loadData();
  }, [user]);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  // const filteredScripts = clientId ? scripts.filter(s => s.clientId === clientId) : scripts; // Not used
  const filteredAudio = clientId ? audioFiles.filter(a => a.clientId === clientId) : audioFiles;
  const availableDevices = clientId ? devices.filter(d => d.clientId === clientId) : devices;

  const handleCreateScript = async () => {
    if (!newTitle.trim() || !newText.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      const announcement = await announcementsAPI.createTTSAnnouncement({
        title: newTitle,
        text: newText,
        folder_id: newCategory,
      });

      const script = {
        id: announcement.id,
        title: newTitle,
        text: newText,
        clientId: user?.clientId || 'client1',
        enabled: true,
        category: newCategory || undefined,
        createdAt: new Date(),
        createdBy: user?.id || 'user1',
      };

      setScripts([...scripts, script]);
      
      // Also add audio representation
      const audio = {
        id: announcement.id,
        title: newTitle,
        scriptId: script.id,
        clientId: user?.clientId || 'client1',
        url: announcement.url,
        duration: announcement.duration,
        type: 'tts' as const,
        enabled: true,
        category: newCategory || undefined,
        createdAt: new Date(),
        createdBy: user?.id || 'user1',
      };

      setAudioFiles([...audioFiles, audio]);
      
      setNewTitle('');
      setNewText('');
      setNewCategory('');
      setIsCreateOpen(false);
      toast.success(`Created announcement: ${newTitle}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create announcement');
      console.error('Create announcement error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleEnabled = async (audioId: string) => {
    const audio = audioFiles.find(a => a.id === audioId);
    const newEnabled = !audio?.enabled;
    
    try {
      await announcementsAPI.updateAnnouncement(audioId, { enabled: newEnabled });
      setAudioFiles(audioFiles.map(a => 
        a.id === audioId ? { ...a, enabled: newEnabled } : a
      ));
      toast.success(`${audio?.enabled ? 'Disabled' : 'Enabled'} ${audio?.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update announcement');
      console.error('Toggle enabled error:', error);
    }
  };

  const handleDelete = async (audioId: string) => {
    const audio = audioFiles.find(a => a.id === audioId);
    
    try {
      await announcementsAPI.deleteAnnouncement(audioId);
      setAudioFiles(audioFiles.filter(a => a.id !== audioId));
      if (audio?.scriptId) {
        setScripts(scripts.filter(s => s.id !== audio.scriptId));
      }
      toast.success(`Deleted ${audio?.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement');
      console.error('Delete error:', error);
    }
  };

  const handlePlay = (audioId: string) => {
    if (playingAudio === audioId) {
      setPlayingAudio(null);
      toast.info('Playback stopped');
    } else {
      setPlayingAudio(audioId);
      const audio = audioFiles.find(a => a.id === audioId);
      toast.success(`Playing ${audio?.title}`);
    }
  };

  const handleInstantAnnouncement = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Please select at least one device');
      return;
    }

    setIsSending(true);
    try {
      // TODO: Get selected announcement ID from state
      const announcementId = 'announcement_id'; // This should come from a selector
      await announcementsAPI.playInstantAnnouncement(announcementId, selectedDevices);

      const deviceNames = selectedDevices.map(id => 
        devices.find(d => d.id === id)?.name
      ).join(', ');

      toast.success(`Instant announcement sent to: ${deviceNames}`);
      setIsInstantOpen(false);
      setSelectedDevices([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send announcement');
      console.error('Instant announcement error:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600">Manage your announcement scripts and audio files</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isInstantOpen} onOpenChange={setIsInstantOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Volume2 className="h-4 w-4 mr-2" />
                Instant Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Play Instant Announcement</DialogTitle>
                <DialogDescription>
                  Trigger an announcement to play immediately on selected devices
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Announcement</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose announcement" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAudio.filter(a => a.enabled).map(audio => (
                        <SelectItem key={audio.id} value={audio.id}>
                          {audio.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

                <Button onClick={handleInstantAnnouncement} className="w-full">
                  <Volume2 className="h-4 w-4 mr-2" />
                  Send Now
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>Create announcements with AI, text-to-speech, upload, or record</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="ai" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="ai">
                    <span className="hidden sm:inline">✨ AI Generate</span>
                    <span className="sm:hidden">✨ AI</span>
                  </TabsTrigger>
                  <TabsTrigger value="script">
                    <FileText className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Script</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Upload</span>
                  </TabsTrigger>
                  <TabsTrigger value="record">
                    <Mic className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Record</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Describe What You Want</Label>
                    <Textarea
                      placeholder="E.g., Create promotional announcements for our weekend sale with 20% off all items. Make them friendly and upbeat."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>How Many Variations?</Label>
                      <Select defaultValue="3">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 variation</SelectItem>
                          <SelectItem value="3">3 variations</SelectItem>
                          <SelectItem value="5">5 variations</SelectItem>
                          <SelectItem value="10">10 variations</SelectItem>
                          <SelectItem value="20">20 variations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tone/Style</Label>
                      <Select defaultValue="professional">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="upbeat">Upbeat</SelectItem>
                          <SelectItem value="calm">Calm</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={() => toast.success('AI generating 3 announcements...')} 
                    className="w-full"
                    disabled={!newText.trim()}
                  >
                    ✨ Generate with AI
                  </Button>

                  {/* Generated Results - shown after generation */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Generated Announcements (3)</Label>
                      <Button variant="ghost" size="sm">Clear All</Button>
                    </div>
                    
                    {/* Example Generated Bubbles */}
                    <div className="space-y-2">
                      {[
                        { id: 1, text: "Don't miss our amazing weekend sale! Enjoy 20% off on all items this Saturday and Sunday. Visit us today!" },
                        { id: 2, text: "Big savings this weekend! Get 20% off everything in store. Your perfect purchase is waiting!" },
                        { id: 3, text: "Weekend special alert! Save 20% on your entire purchase. Limited time offer - shop now!" },
                      ].map((item) => (
                        <Card key={item.id} className="bg-blue-50 border-blue-200">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <Textarea
                                defaultValue={item.text}
                                rows={2}
                                className="flex-1 text-sm bg-white resize-none"
                              />
                              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Voice & Settings */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label>Voice</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'sarah', name: 'Sarah', image: 'https://images.unsplash.com/photo-1649589244330-09ca58e4fa64?w=400' },
                            { id: 'james', name: 'James', image: 'https://images.unsplash.com/photo-1672685667592-0392f458f46f?w=400' },
                            { id: 'alex', name: 'Alex', image: 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?w=400' },
                          ].map((voice) => (
                            <button
                              key={voice.id}
                              type="button"
                              className="group relative flex flex-col items-center gap-2 p-2 rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-slate-100">
                                <img 
                                  src={voice.image} 
                                  alt={voice.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              </div>
                              <span className="text-xs font-medium">{voice.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Tone</Label>
                        <Select defaultValue="motivated">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="motivated">Motivated</SelectItem>
                            <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                            <SelectItem value="calm">Calm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Save to Folder</Label>
                      <Select defaultValue="folder3">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {folders.map(folder => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">+ Create New Folder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        <Play className="h-4 w-4 mr-2" />
                        Preview All
                      </Button>
                      <Button 
                        onClick={() => toast.success('3 announcements created and saved!')} 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Save All (3)
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="script" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Announcement title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Script Text</Label>
                    <Textarea
                      placeholder="Enter the announcement text here..."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      rows={6}
                    />
                    <p className="text-sm text-slate-500">
                      Approx. {Math.ceil(newText.length / 10)} seconds when spoken
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Category (Optional)</Label>
                    <Input
                      placeholder="e.g. promotion, operational"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>TTS Voice</Label>
                      <Select defaultValue="female1">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="female1">Female Voice 1</SelectItem>
                          <SelectItem value="female2">Female Voice 2</SelectItem>
                          <SelectItem value="male1">Male Voice 1</SelectItem>
                          <SelectItem value="male2">Male Voice 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Save to Folder</Label>
                      <Select defaultValue="folder3">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {folders.map(folder => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCreateScript} className="w-full" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Announcement title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Upload Audio File</Label>
                    <Input type="file" accept="audio/mp3,audio/wav,audio/m4a" />
                    <p className="text-xs text-slate-500">Supported formats: MP3, WAV, M4A (max 10MB)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Save to Folder</Label>
                    <Select defaultValue="folder3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {folders
                          .filter(f => f.type === 'announcements')
                          .map(folder => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => toast.success('Audio uploaded successfully!')} disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </TabsContent>

                <TabsContent value="record" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Announcement title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <Mic className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500 mb-4">Click to start recording</p>
                    <Button variant="outline" size="lg" className="rounded-full">
                      <Mic className="h-5 w-5 mr-2" />
                      Start Recording
                    </Button>
                    <p className="text-xs text-slate-400 mt-4">Max duration: 2 minutes</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Save to Folder</Label>
                    <Select defaultValue="folder3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {folders
                          .filter(f => f.type === 'announcements')
                          .map(folder => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
          <CardDescription>
            {filteredAudio.length} announcement{filteredAudio.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAudio.map((audio) => {
              const script = scripts.find(s => s.id === audio.scriptId);
              return (
                <div
                  key={audio.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"
                >
                  {/* Announcement Icon */}
                  <ImageUpload
                    currentImage={announcementIcons[audio.id] || undefined}
                    onImageChange={(url) => setAnnouncementIcons({ ...announcementIcons, [audio.id]: url })}
                    variant="icon"
                  />

                  <div className="flex items-center justify-between flex-1">
                    <div className="flex items-center gap-4 flex-1">
                      <Button
                        size="sm"
                        variant={playingAudio === audio.id ? 'default' : 'outline'}
                        onClick={() => handlePlay(audio.id)}
                      >
                        {playingAudio === audio.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Radio className="h-5 w-5 text-slate-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{audio.title}</p>
                          {audio.category && (
                            <Badge variant="outline">{audio.category}</Badge>
                          )}
                          <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'}>
                            {(audio.type || 'UNKNOWN').toUpperCase()}
                          </Badge>
                        </div>
                        {script && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{script.text}</p>
                        )}
                        <p className="text-sm text-slate-500 mt-1">
                          Duration: {formatDuration(audio.duration || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`enabled-${audio.id}`} className="text-sm">
                          Enabled
                        </Label>
                        <Switch
                          id={`enabled-${audio.id}`}
                          checked={audio.enabled}
                          onCheckedChange={() => handleToggleEnabled(audio.id)}
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDelete(audio.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredAudio.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No announcements created yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}