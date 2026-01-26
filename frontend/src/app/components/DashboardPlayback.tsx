import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { 
  Play, 
  Pause,
  Square, 
  Music, 
  Radio, 
  SkipForward,
  Volume2,
  Clock,
  Disc3
} from 'lucide-react';
import { announcementsAPI, musicAPI, zonesAPI, playbackAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useLocalPlayer } from '@/lib/localPlayer';
import { usePlayback } from '@/lib/playback';
import { formatDuration } from '@/lib/utils';

export function DashboardPlayback() {
  const { user } = useAuth();
  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const { play: playLocal, pause: pauseLocal, setVolume: setLocalVolume, isPlaying: localIsPlaying } = useLocalPlayer();
  const { state: playbackState, nowPlaying: playbackNowPlaying, playPause: playbackPlayPause } = usePlayback();

  const [musicFiles, setMusicFiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);

  const filteredDevices = clientId ? devices.filter((d: any) => d.clientId === clientId) : devices;
  const filteredZones = clientId ? zones.filter((z: any) => z.clientId === clientId) : zones;

  const filteredMusic = musicFiles;
  const filteredAnnouncements = announcements.filter((a: any) => a.enabled);

  const isAudioUrl = (url?: string) => {
    if (!url) return false;
    const u = url.toLowerCase();
    return (
      u.endsWith('.mp3') ||
      u.endsWith('.wav') ||
      u.endsWith('.m4a') ||
      u.endsWith('.aac') ||
      u.endsWith('.ogg') ||
      u.endsWith('.flac')
    );
  };

  // Playback state - sync with shared playback state
  // Use playbackState from PlaybackProvider if available, otherwise use local state
  const isBackendPlaying = playbackState === 'live' && (playbackNowPlaying?.isPlaying ?? false);
  const [localIsPlayingState, setLocalIsPlayingState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine actual playing state: backend playback OR local preview
  const isPlaying = isBackendPlaying || localIsPlayingState || localIsPlaying;
  const [selectedMusicIds, setSelectedMusicIds] = useState<string[]>([]);
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('All Zones');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [announcementInterval, setAnnouncementInterval] = useState(5); // minutes
  const [fadeDuration, setFadeDuration] = useState(3); // seconds
  const [backgroundVolume, setBackgroundVolume] = useState(20); // percentage (0-100)
  const [announcementVolume, setAnnouncementVolume] = useState(100); // percentage (0-100)

  // Current playback state
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [isPlayingAnnouncement, setIsPlayingAnnouncement] = useState(false);
  const [timeUntilNextAnnouncement, setTimeUntilNextAnnouncement] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Audio refs (announcements only; music uses the global LocalPlayer)
  const announcementAudioRef = useRef<HTMLAudioElement | null>(null);

  // Timer refs
  const intervalTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);

  // Get current music and announcement
  const currentMusic = selectedMusicIds[currentMusicIndex] 
    ? filteredMusic.find(m => m.id === selectedMusicIds[currentMusicIndex])
    : null;

  // Get current announcement based on index (cycles through selected announcements)
  const nextAnnouncement = selectedAnnouncementIds.length > 0 && currentAnnouncementIndex < selectedAnnouncementIds.length
    ? filteredAnnouncements.find(a => a.id === selectedAnnouncementIds[currentAnnouncementIndex])
    : null;

  // Start playback
  const handleStart = async () => {
    if (selectedMusicIds.length === 0) {
      toast.error('Please select at least one music track');
      return;
    }

    if (!selectedZoneId && selectedZone !== 'All Zones') {
      toast.error('Please select a valid zone');
      return;
    }

    setIsLoading(true);
    try {
      // Get zone ID - if "All Zones", use first zone or null
      const zoneId = selectedZone === 'All Zones' 
        ? (filteredZones.length > 0 ? filteredZones[0].id : null)
        : selectedZoneId;

      if (!zoneId && selectedZone !== 'All Zones') {
        toast.error('Zone not found');
        setIsLoading(false);
        return;
      }

      // Start backend playback (pass music file IDs directly)
      if (zoneId) {
        await playbackAPI.play(zoneId, [], false, selectedMusicIds);
      }

      setLocalIsPlayingState(true);
      // Only start announcement countdown if announcements are selected
      setTimeUntilNextAnnouncement(selectedAnnouncementIds.length > 0 ? announcementInterval * 60 : 0);
      
      // Also start local preview playback
      if (currentMusic?.url) {
        try {
          await playLocal({
            id: String(currentMusic.id),
            title: String(currentMusic.name),
            url: String(currentMusic.url),
          });
        } catch (e: any) {
          console.warn('Local preview play failed:', e?.name, e?.message);
        }
      }

      toast.success(`Playback started on ${selectedZone}`);
    } catch (e: any) {
      console.error('Playback start failed:', e);
      toast.error(e?.message || 'Failed to start playback');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop playback
  const handleStop = async () => {
    setIsLoading(true);
    try {
      const zoneId = selectedZone === 'All Zones' 
        ? (filteredZones.length > 0 ? filteredZones[0].id : null)
        : selectedZoneId;

      if (zoneId) {
        await playbackAPI.pause(zoneId);
      }

      setLocalIsPlayingState(false);
      setIsPlayingAnnouncement(false);
      setTimeUntilNextAnnouncement(0);
      setElapsedTime(0);
      
      pauseLocal();
      setLocalVolume(100);
      if (announcementAudioRef.current) {
        announcementAudioRef.current.pause();
        announcementAudioRef.current.currentTime = 0;
      }

      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }

      toast.info('Playback stopped');
    } catch (e: any) {
      console.error('Playback stop failed:', e);
      toast.error(e?.message || 'Failed to stop playback');
    } finally {
      setIsLoading(false);
    }
  };

  // Play next announcement manually
  const handleNextAnnouncement = () => {
    if (!isPlaying) return;
    playAnnouncement();
  };

  // Play announcement
  const playAnnouncement = async () => {
    if (selectedAnnouncementIds.length === 0) return;

    setIsPlayingAnnouncement(true);
    
    // Fade music down
    {
      const fadeSteps = 20;
      const fadeInterval = (fadeDuration * 1000) / fadeSteps;
      const startVol = 100;
      const endVol = Math.max(0, Math.min(100, backgroundVolume));
      const volStep = (startVol - endVol) / fadeSteps;
      let currentStep = 0;
      const fadeDown = setInterval(() => {
        setLocalVolume(Math.round(Math.max(endVol, startVol - volStep * currentStep)));
        currentStep++;
        if (currentStep >= fadeSteps) clearInterval(fadeDown);
      }, fadeInterval);
    }

    // Play announcement after fade
    setTimeout(async () => {
      if (!nextAnnouncement?.url) {
        toast.error('Selected announcement has no playable URL. Upload an announcement audio first.');
        setIsPlayingAnnouncement(false);
        setTimeUntilNextAnnouncement(announcementInterval * 60);
        return;
      }

      // Show prominent announcement notification
      toast.success(`🔊 Playing Announcement: ${nextAnnouncement?.title || 'Announcement'}`, {
        duration: 3000,
        description: `Music volume reduced to ${backgroundVolume}%`,
      });

      // Ensure announcement audio element exists
      if (!announcementAudioRef.current) {
        announcementAudioRef.current = new Audio();
      }

      const ann = announcementAudioRef.current;
      ann.src = nextAnnouncement.url;
      ann.currentTime = 0;
      
      // Set announcement volume based on user preference (0-100%)
      const targetVolume = Math.max(0, Math.min(1, announcementVolume / 100));
      ann.volume = targetVolume;
      
      // Monitor and maintain announcement volume during playback
      // This ensures announcements stay at the user-set volume
      const volumeMonitor = setInterval(() => {
        const currentTarget = Math.max(0, Math.min(1, announcementVolume / 100));
        if (Math.abs(ann.volume - currentTarget) > 0.01) {
          ann.volume = currentTarget;
        }
      }, 50); // Check every 50ms to ensure volume stays at target

      const onEnded = () => {
        clearInterval(volumeMonitor);
        ann.removeEventListener('ended', onEnded);

        // Fade music back up
        {
          const fadeSteps = 20;
          const fadeInterval = (fadeDuration * 1000) / fadeSteps;
          const startVol = Math.max(0, Math.min(100, backgroundVolume));
          const endVol = 100;
          const volStep = (endVol - startVol) / fadeSteps;
          let currentStep = 0;
          const fadeUp = setInterval(() => {
            setLocalVolume(Math.round(Math.min(endVol, startVol + volStep * currentStep)));
            currentStep++;
            if (currentStep >= fadeSteps) clearInterval(fadeUp);
          }, fadeInterval);
        }

        setIsPlayingAnnouncement(false);
        // Cycle to next announcement in the queue (continuous loop)
        setCurrentAnnouncementIndex((prev) => (prev + 1) % selectedAnnouncementIds.length);
        // Reset timer for next announcement
        setTimeUntilNextAnnouncement(announcementInterval * 60);
      };

      ann.addEventListener('ended', onEnded);

      try {
        await ann.play();
        // Double-check volume after play starts
        const targetVolume = Math.max(0, Math.min(1, announcementVolume / 100));
        ann.volume = targetVolume;
      } catch (e) {
        clearInterval(volumeMonitor);
        ann.removeEventListener('ended', onEnded);
        console.error('Announcement play failed:', e);
        toast.error('Failed to play announcement audio');
        setIsPlayingAnnouncement(false);
        setTimeUntilNextAnnouncement(announcementInterval * 60);
      }
    }, fadeDuration * 1000);
  };

  // Timer effect
  useEffect(() => {
    if (isPlaying && !isPlayingAnnouncement && selectedAnnouncementIds.length > 0) {
      // Countdown timer
      intervalTimerRef.current = setInterval(() => {
        setTimeUntilNextAnnouncement((prev) => {
          if (prev <= 1) {
            playAnnouncement();
            return announcementInterval * 60;
          }
          return prev - 1;
        });
      }, 1000);

      // Elapsed timer
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      return () => {
        if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      };
    }
  }, [isPlaying, isPlayingAnnouncement, announcementInterval, selectedAnnouncementIds.length]);

  // Load real backend music + announcements + zones
  useEffect(() => {
    const load = async () => {
      try {
        const [m, a, d, z] = await Promise.all([
          musicAPI.getMusicFiles(),
          announcementsAPI.getAnnouncements(),
          zonesAPI.getDevices(),
          zonesAPI.getZones(),
        ]);
        setMusicFiles((m || []).filter((x: any) => isAudioUrl(x?.url)));
        setAnnouncements((a || []).filter((x: any) => isAudioUrl(x?.url)));
        setDevices(d || []);
        setZones(z || []);
        
        // Set default zone if available
        if (z && z.length > 0 && selectedZone === 'All Zones') {
          setSelectedZone(z[0].name);
          setSelectedZoneId(z[0].id);
        }
      } catch (e: any) {
        console.error('Failed to load playback data:', e);
        toast.error(e?.message || 'Failed to load playback data');
      }
    };
    load();
  }, []);

  // Sync local state with shared playback state
  useEffect(() => {
    // Update local state when shared playback state changes
    if (playbackState === 'live' && playbackNowPlaying?.isPlaying) {
      setLocalIsPlayingState(true);
    } else if (playbackState === 'standby') {
      setLocalIsPlayingState(false);
    }
  }, [playbackState, playbackNowPlaying?.isPlaying]);

  // Sync with local player state
  useEffect(() => {
    // If local player is playing, update local state
    if (localIsPlaying) {
      setLocalIsPlayingState(true);
    } else if (!isBackendPlaying) {
      // Only set to false if backend is also not playing
      setLocalIsPlayingState(false);
    }
  }, [localIsPlaying, isBackendPlaying]);

  // Play next track when the index changes (allowed once playback has started)
  useEffect(() => {
    if (!isPlaying) return;
    if (!currentMusic?.url) return;
    playLocal({
      id: String(currentMusic.id),
      title: String(currentMusic.name),
      url: String(currentMusic.url),
    }).catch((e: any) => {
      console.error('Music play failed:', e?.name, e?.message, e);
    });
    setLocalVolume(isPlayingAnnouncement ? backgroundVolume : 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMusicIndex]);

  // Handle track ended - auto-advance to next song in queue
  useEffect(() => {
    const handleTrackEnded = (event: CustomEvent) => {
      // Only auto-advance if we're playing and not playing an announcement
      if (!isPlaying || isPlayingAnnouncement) return;
      
      // Check if this is the current track
      if (event.detail?.trackId === currentMusic?.id) {
        // Advance to next track in queue
        if (selectedMusicIds.length > 0) {
          setCurrentMusicIndex((prev) => {
            const nextIndex = (prev + 1) % selectedMusicIds.length;
            return nextIndex;
          });
          
          // Also advance backend playback
          if (selectedZoneId || selectedZone === 'All Zones') {
            const zoneId = selectedZone === 'All Zones' 
              ? (filteredZones.length > 0 ? filteredZones[0].id : null)
              : selectedZoneId;
            if (zoneId) {
              playbackAPI.next(zoneId).catch((e) => {
                console.error('Failed to advance backend track:', e);
              });
            }
          }
        }
      }
    };

    window.addEventListener('track-ended', handleTrackEnded as EventListener);
    return () => {
      window.removeEventListener('track-ended', handleTrackEnded as EventListener);
    };
  }, [isPlaying, isPlayingAnnouncement, currentMusic?.id, selectedMusicIds.length, selectedZoneId, selectedZone, filteredZones]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Main Playback Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Disc3 className="h-6 w-6" />
            Live Playback Control
          </CardTitle>
          <CardDescription>
            Control music and announcement playback across your zones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Zone Selector */}
          <div className="space-y-2">
            <Label>Target Zone</Label>
            <Select 
              value={selectedZone} 
              onValueChange={(value) => {
                setSelectedZone(value);
                if (value !== 'All Zones') {
                  const zone = filteredZones.find(z => z.name === value);
                  setSelectedZoneId(zone?.id || null);
                } else {
                  setSelectedZoneId(null);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Zones">All Zones</SelectItem>
                {filteredZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.name}>{zone.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Music Selection */}
          <div className="space-y-2">
            <Label>Select Music Tracks</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
              {filteredMusic.map((music) => (
                <label
                  key={music.id}
                  className="flex items-center gap-3 p-2 bg-white rounded border hover:border-blue-400 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMusicIds.includes(music.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMusicIds([...selectedMusicIds, music.id]);
                      } else {
                        setSelectedMusicIds(selectedMusicIds.filter(id => id !== music.id));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <Music className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{music.name}</p>
                    <p className="text-xs text-slate-500">
                      {music.duration ? formatDuration(music.duration) : '0:00'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              {selectedMusicIds.length} track{selectedMusicIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Announcement Selection */}
          <div className="space-y-2">
            <Label>Select Announcements</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
              {filteredAnnouncements.map((announcement) => (
                <label
                  key={announcement.id}
                  className="flex items-center gap-3 p-2 bg-white rounded border hover:border-green-400 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAnnouncementIds.includes(announcement.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAnnouncementIds([...selectedAnnouncementIds, announcement.id]);
                      } else {
                        setSelectedAnnouncementIds(selectedAnnouncementIds.filter(id => id !== announcement.id));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <Radio className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{announcement.title}</p>
                    <p className="text-xs text-slate-500">
                      {announcement.type === 'tts' ? 'Text-to-Speech' : 'Uploaded'} • {announcement.duration}s
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              {selectedAnnouncementIds.length} announcement{selectedAnnouncementIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Announcement Interval */}
          <div className="space-y-2">
            <Label>Announcement Interval</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[announcementInterval]}
                onValueChange={(value) => setAnnouncementInterval(value[0])}
                min={1}
                max={60}
                step={1}
                className="flex-1"
              />
              <div className="text-sm font-medium w-24 text-right">
                {announcementInterval} min{announcementInterval !== 1 ? 's' : ''}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              How often announcements will play (1-60 minutes)
            </p>
          </div>

          {/* Fade Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fade Duration</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[fadeDuration]}
                  onValueChange={(value) => setFadeDuration(value[0])}
                  min={1}
                  max={10}
                  step={0.5}
                  className="flex-1"
                />
                <div className="text-sm font-medium w-16 text-right">
                  {fadeDuration}s
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Music Volume During Announcement</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[backgroundVolume]}
                  onValueChange={(value) => setBackgroundVolume(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <div className="text-sm font-medium w-16 text-right">
                  {backgroundVolume}%
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Music volume when announcement plays (0-100%)
              </p>
            </div>
          </div>

          {/* Volume Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Announcement Volume</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[announcementVolume]}
                  onValueChange={(value) => setAnnouncementVolume(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <div className="text-sm font-medium w-16 text-right">
                  {announcementVolume}%
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Volume level for announcements (0-100%)
              </p>
            </div>
          </div>

          {/* Start/Stop/Pause Button */}
          <div className="pt-4">
            {!isPlaying ? (
              <Button 
                onClick={handleStart}
                disabled={isLoading}
                className="w-full h-16 text-lg bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Play className="h-6 w-6 mr-2" />
                {isLoading ? 'Starting...' : (currentMusic?.name ? `Play: ${currentMusic.name}` : 'Start Playback')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={async () => {
                    // Pause/Resume using shared playback controls
                    if (selectedZoneId) {
                      try {
                        await playbackPlayPause();
                        // Also pause local preview
                        if (localIsPlaying) {
                          pauseLocal();
                        }
                        setLocalIsPlayingState(!localIsPlayingState);
                      } catch (e: any) {
                        toast.error(e?.message || 'Failed to pause/resume');
                      }
                    } else {
                      // For local preview only
                      if (localIsPlaying) {
                        pauseLocal();
                        setLocalIsPlayingState(false);
                      } else {
                        if (currentMusic?.url) {
                          await playLocal({
                            id: String(currentMusic.id),
                            title: String(currentMusic.name),
                            url: String(currentMusic.url),
                          });
                          setLocalIsPlayingState(true);
                        }
                      }
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 h-16 text-lg bg-yellow-600 hover:bg-yellow-700"
                  size="lg"
                >
                  {localIsPlaying || isBackendPlaying ? (
                    <>
                      <Pause className="h-6 w-6 mr-2" />
                      {isLoading ? 'Pausing...' : 'Pause'}
                    </>
                  ) : (
                    <>
                      <Play className="h-6 w-6 mr-2" />
                      {isLoading ? 'Resuming...' : 'Resume'}
                    </>
                  )}
                </Button>
              <Button 
                onClick={handleStop}
                disabled={isLoading}
                  className="flex-1 h-16 text-lg bg-red-600 hover:bg-red-700"
                size="lg"
                variant="destructive"
              >
                <Square className="h-6 w-6 mr-2" />
                  {isLoading ? 'Stopping...' : 'Stop'}
              </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Currently Playing Display */}
      {isPlaying && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Now Playing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Now Playing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentMusic ? (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="font-medium text-lg">{currentMusic.name}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Track {currentMusicIndex + 1} of {selectedMusicIds.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4" />
                    <span>Playing for {formatTime(elapsedTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Volume2 className="h-4 w-4" />
                    <span>
                      Music Volume: {isPlayingAnnouncement ? `${backgroundVolume}%` : '100%'}
                    </span>
                  </div>
                  {isPlayingAnnouncement && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <Volume2 className="h-4 w-4" />
                        <span>
                          Announcement Volume: {announcementVolume}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <Badge className="bg-orange-500 animate-pulse">
                          🔊 Announcement Playing
                        </Badge>
                        <p className="text-xs text-orange-700 font-medium">
                          {nextAnnouncement?.title || 'Announcement'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">No music selected</p>
              )}
            </CardContent>
          </Card>

          {/* Next Announcement */}
          <Card className={isPlayingAnnouncement ? 'ring-2 ring-orange-500 shadow-lg' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className={`h-5 w-5 ${isPlayingAnnouncement ? 'text-orange-500 animate-pulse' : 'text-green-600'}`} />
                {isPlayingAnnouncement ? '🔊 Currently Playing Announcement' : 'Next Announcement'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextAnnouncement ? (
                <div className="space-y-3">
                    <div className={`p-4 rounded-lg ${isPlayingAnnouncement ? 'bg-orange-50 border-2 border-orange-200' : 'bg-green-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-lg">{nextAnnouncement.title}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {nextAnnouncement.type === 'tts' ? 'Text-to-Speech' : 'Uploaded Audio'} • {nextAnnouncement.duration ? formatDuration(nextAnnouncement.duration) : '0:00'}
                        </p>
                      </div>
                      {isPlayingAnnouncement && (
                        <div className="ml-2">
                          <div className="h-3 w-3 bg-orange-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {isPlayingAnnouncement 
                        ? '🔊 Playing now...' 
                        : `In ${formatTime(timeUntilNextAnnouncement)}`
                      }
                    </span>
                  </div>
                  {selectedAnnouncementIds.length > 1 && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                      {selectedAnnouncementIds.length - currentAnnouncementIndex - 1} more announcement{selectedAnnouncementIds.length - currentAnnouncementIndex - 1 !== 1 ? 's' : ''} in queue
                    </div>
                  )}
                  <Button
                    onClick={handleNextAnnouncement}
                    disabled={isPlayingAnnouncement}
                    className="w-full"
                    variant={isPlayingAnnouncement ? "default" : "outline"}
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    {isPlayingAnnouncement ? 'Playing...' : 'Play Now'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Radio className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No announcements selected</p>
                  <p className="text-xs text-slate-400 mt-1">Select announcements above to play them</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
