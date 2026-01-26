import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { usePlayback } from '@/lib/playback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { Progress } from '@/app/components/ui/progress';
import { Input } from '@/app/components/ui/input';
import { mockAnnouncementAudio, mockDevices, mockSchedules, mockMusicQueue, mockClients } from '@/lib/mockData';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, 
  Radio, AlertCircle, Clock, CheckCircle2, XCircle, Wifi, WifiOff, Music, Plus, Edit2, Save
} from 'lucide-react';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';
import { PlaybackControls } from '@/app/components/PlaybackControls';
import { ChevronDown } from 'lucide-react';
import { CreateAnnouncementDialog } from '@/app/components/CreateAnnouncementDialog';
import { PremiumFeaturesCard } from '@/app/components/PremiumFeaturesCard';
import { PWAInstaller } from '@/app/components/PWAInstaller';
import { BackgroundAudioStatus } from '@/app/components/BackgroundAudioStatus';

export function DashboardEnhanced() {
  const { user } = useAuth();
  const { 
    state, 
    mode,
    setMode, 
    startOutput, 
    stopOutput, 
    nowPlaying, 
    playPause, 
    skipNext, 
    skipPrevious,
    volume,
    setVolume,
    ducking,
    setDucking,
    isShuffleOn,
    isRepeatOn,
    toggleShuffle,
    toggleRepeat,
    playInstantAnnouncement,
  } = usePlayback();

  const [selectedAnnouncement, setSelectedAnnouncement] = useState('');
  const [duckMusic, setDuckMusic] = useState(true);
  const [nextAnnouncementIn, setNextAnnouncementIn] = useState(42 * 60); // 42 minutes in seconds
  const [fadeSeconds, setFadeSeconds] = useState(2); // Default fade duration in seconds
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [musicQueue, setMusicQueue] = useState(mockMusicQueue);
  const [editingTimer, setEditingTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(42);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isSavingDucking, setIsSavingDucking] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const availableAnnouncements = clientId 
    ? mockAnnouncementAudio.filter(a => a.clientId === clientId && a.enabled) 
    : mockAnnouncementAudio.filter(a => a.enabled);
  
  const devices = clientId ? mockDevices.filter(d => d.clientId === clientId) : mockDevices;
  const onlineDevices = devices.filter(d => d.status === 'online');

  // Get client premium features
  const currentClient = clientId ? mockClients.find(c => c.id === clientId) : null;
  const currentFloorCount = 1; // Mock: count actual floors from devices/zones

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNextAnnouncementIn(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInstantPlay = () => {
    if (!selectedAnnouncement) {
      toast.error('Please select an announcement');
      return;
    }
    
    const announcement = availableAnnouncements.find(a => a.id === selectedAnnouncement);
    playInstantAnnouncement(selectedAnnouncement, devices.map(d => d.id), { duck: duckMusic });
    
    toast.success(`Playing "${announcement?.title}" now`, {
      description: `Sent to ${onlineDevices.length} online device${onlineDevices.length !== 1 ? 's' : ''}`,
    });
  };

  const handleSkipNext = () => {
    setNextAnnouncementIn(5); // Reset to 5 seconds
    toast.info('Playing next announcement now');
  };

  const handleSkipNextScheduled = async () => {
    try {
      // TODO: Call API to skip next scheduled announcement
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Skipped next scheduled announcement');
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip announcement');
    }
  };

  const handleSaveDuckingSettings = async () => {
    setIsSavingDucking(true);
    try {
      // TODO: Save ducking settings to backend
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Ducking settings saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSavingDucking(false);
    }
  };

  const handlePreviewDucking = async () => {
    if (!selectedAnnouncement) {
      toast.error('Please select an announcement first');
      return;
    }
    setIsPlayingPreview(true);
    try {
      const announcement = availableAnnouncements.find(a => a.id === selectedAnnouncement);
      toast.info(`Previewing "${announcement?.title}" with ducking`);
      // TODO: Play preview audio with ducking effect
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate preview
    } catch (error: any) {
      toast.error(error.message || 'Preview failed');
    } finally {
      setIsPlayingPreview(false);
    }
  };

  const handleJumpToTrack = async (trackId: string) => {
    try {
      // TODO: Call API to jump to specific track in queue
      const track = mockMusicQueue.find(t => t.id === trackId);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success(`Skipping to: ${track?.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip to track');
    }
  };

  const progress = nowPlaying ? (nowPlaying.elapsed / nowPlaying.duration) * 100 : 0;
  const minutesLeft = Math.floor(nextAnnouncementIn / 60);
  const secondsLeft = nextAnnouncementIn % 60;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Master Output Control */}
      <Card>
        <CardHeader>
          <CardTitle>Master Output</CardTitle>
          <CardDescription>Control live audio output to devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Big Start/Stop Button */}
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={state === 'live' ? stopOutput : startOutput}
              className={cn(
                'h-32 w-32 rounded-full text-base font-bold shadow-2xl hover:scale-105 transition-all flex flex-col gap-2',
                state === 'live' 
                  ? 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                  : 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
              )}
            >
              {state === 'live' ? (
                <>
                  <Pause className="h-10 w-10 fill-current" />
                  <span className="text-xs">STOP</span>
                </>
              ) : (
                <>
                  <Play className="h-10 w-10 fill-current ml-1" />
                  <span className="text-xs">START</span>
                </>
              )}
            </Button>

            <div className="text-center">
              <Badge 
                variant={state === 'live' ? 'default' : 'secondary'}
                className="text-lg px-4 py-2"
              >
                {state === 'live' ? 'LIVE OUTPUT' : 'STANDBY'}
              </Badge>
              <p className="text-sm text-slate-500 mt-2">
                Target: {onlineDevices.length}/{devices.length} devices online
              </p>
            </div>
          </div>

          {/* Output Mode */}
          <div className="space-y-2">
            <Label>Output Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="music">Music Only</SelectItem>
                <SelectItem value="announcements">Announcements Only</SelectItem>
                <SelectItem value="music+announcements">Music + Announcements</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Volume & Ducking */}
          <div className="space-y-4">
            {/* Collapsible Ducking Controls */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  const section = document.getElementById('ducking-controls');
                  if (section) {
                    section.style.display = section.style.display === 'none' ? 'block' : 'none';
                  }
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-slate-600" />
                  <span className="font-medium">Announcement Ducking Controls</span>
                </div>
                <ChevronDown className="h-5 w-5 text-slate-400" />
              </button>
              
              <div id="ducking-controls" style={{ display: 'none' }} className="p-4 space-y-4 bg-white">
                <div className="space-y-2">
                  <Label>Music Volume During Announcement</Label>
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-slate-500 shrink-0" />
                    <Slider
                      value={[ducking]}
                      max={100}
                      step={10}
                      onValueChange={(value) => setDucking(value[0])}
                      className="flex-1"
                    />
                    <span className="text-sm text-slate-500 w-10 text-right">{ducking}%</span>
                  </div>
                  <p className="text-xs text-slate-500">How loud music plays during announcements</p>
                </div>

                <div className="space-y-2">
                  <Label>Fade Duration</Label>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-slate-500 shrink-0" />
                    <Slider
                      value={[fadeSeconds]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={(value) => setFadeSeconds(value[0])}
                      className="flex-1"
                    />
                    <span className="text-sm text-slate-500 w-12 text-right">{fadeSeconds}s</span>
                  </div>
                  <p className="text-xs text-slate-500">Time to fade music volume before announcement</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleSaveDuckingSettings}
                    disabled={isSavingDucking}
                  >
                    {isSavingDucking ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handlePreviewDucking}
                    disabled={isPlayingPreview}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isPlayingPreview ? 'Playing...' : 'Preview'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Now Playing */}
        <Card>
          <CardHeader>
            <CardTitle>Now Playing</CardTitle>
            <CardDescription>Current track & up next in queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nowPlaying ? (
              <>
                <div>
                  <h3 className="font-semibold text-lg">{nowPlaying.title}</h3>
                  {nowPlaying.playlist && (
                    <p className="text-sm text-slate-500">{nowPlaying.playlist}</p>
                  )}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <Progress value={progress} />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{formatDuration(nowPlaying.elapsed)}</span>
                    <span>{formatDuration(nowPlaying.duration - nowPlaying.elapsed)} left</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2">
                  <Button size="icon" variant="ghost" onClick={toggleShuffle}>
                    <Shuffle className={cn('h-4 w-4', isShuffleOn && 'text-blue-600')} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={skipPrevious}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={playPause}>
                    {nowPlaying.isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={skipNext}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={toggleRepeat}>
                    <Repeat className={cn('h-4 w-4', isRepeatOn && 'text-blue-600')} />
                  </Button>
                </div>

                {/* Up Next Queue - Horizontal Scroll */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-700">Up Next</h4>
                    <Badge variant="secondary">{mockMusicQueue.length} tracks</Badge>
                  </div>
                  <div className="relative">
                    <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                      <div className="flex gap-3 min-w-max">
                        {mockMusicQueue.map((track, index) => (
                          <button
                            key={track.id}
                            onClick={() => handleJumpToTrack(track.id)}
                            className={cn(
                              "flex-shrink-0 flex flex-col gap-1 transition-all hover:scale-105",
                              index === 0 && "scale-105"
                            )}
                          >
                            <div className={cn(
                              "relative w-28 h-28 rounded-lg overflow-hidden shadow-md",
                              index === 0 
                                ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg shadow-blue-200" 
                                : "hover:shadow-lg"
                            )}>
                              <img 
                                src={track.image} 
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                              {index === 0 && (
                                <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                                  <Play className="h-2.5 w-2.5 fill-white" />
                                  Next
                                </div>
                              )}
                            </div>
                            <div className="w-28 text-left">
                              <p className="text-xs font-semibold text-slate-900 truncate">{track.title}</p>
                              <p className="text-xs text-slate-500 truncate">{track.artist}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No track playing</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instant Announcement */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Instant Announcement</CardTitle>
            </div>
            <CardDescription>Play announcement immediately</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label>Select Announcement</Label>
                <Select value={selectedAnnouncement} onValueChange={setSelectedAnnouncement}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose announcement" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAnnouncements.map(audio => (
                      <SelectItem key={audio.id} value={audio.id}>
                        {audio.title} ({formatDuration(audio.duration)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="opacity-0">Create</Label>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 bg-white"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="duck-music">Duck Music</Label>
              <Switch
                id="duck-music"
                checked={duckMusic}
                onCheckedChange={setDuckMusic}
              />
            </div>

            <Button 
              onClick={handleInstantPlay} 
              className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-lg font-semibold"
              disabled={!selectedAnnouncement}
            >
              <Radio className="h-5 w-5 mr-2" />
              PLAY NOW
            </Button>

            <p className="text-xs text-slate-600">
              Will play on {onlineDevices.length} online device{onlineDevices.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Scheduled Announcement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Next Scheduled Announcement</CardTitle>
              <CardDescription>Upcoming automated announcement</CardDescription>
            </div>
            <Button
              variant={editingTimer ? "default" : "outline"}
              size="lg"
              onClick={() => {
                if (editingTimer) {
                  const newTime = timerMinutes * 60 + timerSeconds;
                  setNextAnnouncementIn(newTime);
                  toast.success('Timer updated');
                }
                setEditingTimer(!editingTimer);
              }}
              className="h-14 px-6 gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Radio className="h-6 w-6" />
              <span className="font-semibold text-base">
                {editingTimer ? 'Save Timer' : 'Control Announcements'}
              </span>
              {editingTimer ? <Save className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {editingTimer ? (
                <div className="flex items-center gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 text-center"
                    />
                  </div>
                  <span className="text-2xl font-bold pt-4">:</span>
                  <div className="space-y-1">
                    <Label className="text-xs">Seconds</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={timerSeconds}
                      onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-20 text-center"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs text-slate-500">time remaining</div>
                </div>
              )}
              <div>
                <p className="font-medium">Daily Special</p>
                <p className="text-sm text-slate-500">From: Hourly Promotions schedule</p>
                <Badge variant="outline" className="mt-1">Promotion</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSkipNextScheduled}>
                Play Next Now
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={async () => {
                  try {
                    // Skip/cancel the next scheduled announcement in the queue
                    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
                    toast.success('Next scheduled announcement skipped');
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to skip announcement');
                  }
                }}
              >
                Skip Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone/Device Status */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Status</CardTitle>
          <CardDescription>Quick view of all devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {device.status === 'online' ? (
                    <Wifi className="h-5 w-5 text-green-600" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-slate-400" />
                  )}
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-xs text-slate-500">{device.zone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                    {device.status}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatRelativeTime(device.lastSeen)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Premium Features & AI Credits - Only show for clients */}
      {currentClient && (
        <PremiumFeaturesCard
          aiCredits={currentClient.premiumFeatures.aiCredits}
          maxFloors={currentClient.premiumFeatures.maxFloors}
          currentFloors={currentFloorCount}
          hasMultiFloorAccess={currentClient.premiumFeatures.multiFloor}
          onUpgrade={() => {
            toast.success('Upgrade initiated!');
          }}
          onTopUpCredits={(amount) => {
            toast.success(`${amount} AI credits added!`);
          }}
        />
      )}

      {/* Create Announcement Dialog */}
      <CreateAnnouncementDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(announcement) => {
          setSelectedAnnouncement(announcement.id);
          toast.success(`Announcement \"${announcement.title}\" ready to play!`);
        }}
      />

      {/* PWA Installer */}
      <PWAInstaller />

      {/* Background Audio Status */}
      <BackgroundAudioStatus />
    </div>
  );
}