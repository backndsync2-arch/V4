import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:just_audio/just_audio.dart';
import '../../models/zone_model.dart';
import '../../models/player_model.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/common/stat_card.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});
  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  String? _selectedZoneId;
  List<dynamic> _devices = [];
  Map<String, dynamic>? _playbackState;
  bool _loading = false;
  
  // Data
  List<dynamic> _allMusic = [];
  List<dynamic> _announcements = [];
  List<dynamic> _announcementFolders = [];
  List<dynamic> _musicFolders = [];
  List<dynamic> _schedules = [];
  
  // Selection State
  final Set<String> _selectedMusicIds = {};
  String? _selectedAnnouncementFolderId;
  String? _selectedMusicFolderId;
  
  // Sliders
  double _announcementInterval = 300; // seconds
  double _fadeDuration = 3;
  double _musicVolume = 20;
  double _announcementVolume = 100;

  // Announcement Logic
  Timer? _announcementTimer;
  Timer? _playbackStateTimer;
  Timer? _countdownTimer;
  int _nextAnnouncementIndex = 0;
  final Map<String, int> _durationCache = {};
  bool _wasPlayingBeforeAnnouncement = false;
  int? _previousIndex;
  DateTime? _playbackStartTime;
  DateTime? _lastAnnouncementTime;
  bool _isPlayingAnnouncement = false;

  // Helper function to normalize announcement URLs
  String _normalizeAnnouncementUrl(String url) {
    if (url.isEmpty) return '';
    
    // Remove leading/trailing whitespace and URL-encoded spaces
    url = url.trim().replaceAll('%20', '').replaceAll(' ', '');
    
    const apiBase = 'https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1';
    
    // If URL already contains the base URL, check for duplication
    if (url.contains(apiBase)) {
      // Find all occurrences of the base URL
      final baseUrlPattern = apiBase.replaceAll('/', r'\/');
      final matches = RegExp(baseUrlPattern).allMatches(url);
      
      // If there are multiple occurrences, keep only the last one
      if (matches.length > 1) {
        final lastMatch = matches.last;
        url = url.substring(lastMatch.start);
      }
    }
    
    // If it's a relative URL starting with /api/, prepend base URL
    if (url.startsWith('/api/')) {
      return '$apiBase${url.substring(4)}';
    }
    
    // If it's a relative URL, prepend base URL
    if (url.startsWith('/')) {
      return '$apiBase$url';
    }
    
    // If it's already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    return url;
  }

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _announcementTimer?.cancel();
    _playbackStateTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _initData() async {
    setState(() => _loading = true);
    try {
      final zones = await getZones();
      if (zones.isNotEmpty) {
        _selectedZoneId = (zones.first['id'] ?? zones.first['zone_id']).toString();
        // Load initial data
        await Future.wait([
          _loadPlaybackState(),
          _loadContent(),
        ]);
        // Start real-time playback state polling
        _startPlaybackStatePolling();
      }
    } catch (e) {
      print(e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _startPlaybackStatePolling() {
    _playbackStateTimer?.cancel();
    // Poll every 2 seconds for real-time updates
    _playbackStateTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (mounted) {
        _loadPlaybackState();
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _loadPlaybackState() async {
    final zm = context.read<ZoneModel>();
    final zoneId = zm.selectedZoneId ?? _selectedZoneId;
    if (zoneId == null) return;
    try {
      final d = await getDevices(zoneId: zoneId);
      final s = await getPlaybackState(zoneId);
      if (mounted) {
        setState(() {
          _devices = d;
          _playbackState = s;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadContent() async {
    try {
      final zm = context.read<ZoneModel>();
      final zoneId = zm.selectedZoneId ?? _selectedZoneId;
      final m = await getMusicFiles(zoneId: zoneId);
      // Load announcements - if folder is selected, load only that folder's announcements
      // If no folder selected, load all announcements (for "No Folder (All Enabled)" option)
      // This matches how announcements page works
      final a = await getAnnouncements(
        zoneId: zoneId,
        folderId: _selectedAnnouncementFolderId, // Pass folderId to API like announcements page does
      );
      final af = await getFolders(type: 'announcements', zoneId: zoneId);
      final mf = await getFolders(type: 'music', zoneId: zoneId);
      final s = await getSchedules();
      if (mounted) {
        setState(() {
          _allMusic = m;
          _announcements = a; // These are already filtered by folder if _selectedAnnouncementFolderId is set
          _announcementFolders = af;
          _musicFolders = mf;
          _schedules = s;
        });
        // Auto-select music when folder is selected
        _updateMusicSelectionFromFolder();
        print('Dashboard loaded ${a.length} announcements for folder: $_selectedAnnouncementFolderId');
        if (a.isNotEmpty) {
          print('Sample announcement folder IDs: ${a.take(3).map((ann) => (ann['folder_id'] ?? ann['folderId'] ?? ann['category'] ?? '').toString()).toList()}');
        }
      }
    } catch (e) {
      print('Error loading dashboard content: $e');
    }
  }

  void _updateMusicSelectionFromFolder() {
    if (_selectedMusicFolderId != null) {
      final folderMusic = _allMusic.where((m) {
        final folderId = (m['folder'] ?? m['folder_id'] ?? '').toString();
        return folderId == _selectedMusicFolderId;
      }).toList();
      setState(() {
        _selectedMusicIds.clear();
        _selectedMusicIds.addAll(folderMusic.map((m) => (m['id'] ?? m['file_id'] ?? m['music_file_id'] ?? '').toString()));
      });
    }
  }

  Future<void> _togglePlayback() async {
    final pm = context.read<PlayerModel>();
    final isPlaying = pm.player.playing || (_playbackState?['is_playing'] == true);
    if (!isPlaying && _selectedMusicIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select at least one music track')));
      return;
    }

    try {
      if (isPlaying) {
        // Stop any playing announcement first
        if (_isPlayingAnnouncement) {
          try {
            await pm.annPlayer.stop();
            _isPlayingAnnouncement = false;
          } catch (_) {}
        }
        await pm.pause();
        _announcementTimer?.cancel();
        _countdownTimer?.cancel();
        _lastAnnouncementTime = null;
        if (mounted) setState(() => _playbackState = {'is_playing': false});
      } else {
        // Get authentication token to append to URLs
        final token = await getAccessToken();
        
        final items = _allMusic.where((m) => _selectedMusicIds.contains((m['id'] ?? m['file_id'] ?? m['music_file_id'] ?? '').toString()))
          .map((m) {
            String url = (m['stream_url'] ?? m['file_url'] ?? m['url'] ?? '').toString();
            // Don't add token to URL - playUrls() will handle auth via headers
            return {
              'url': url,
              'title': (m['name'] ?? m['title'] ?? 'Unknown').toString(),
            };
          }).where((e) => (e['url'] ?? '').isNotEmpty).toList();
        if (items.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Selected tracks have no URLs')));
          return;
        }
        
        print('Starting playback with ${items.length} tracks');
        if (items.isNotEmpty) {
          print('First track URL: ${items.first['url']}');
        }
        
        try {
          await pm.playUrls(items);
          // Enable continuous looping - set to LoopMode.all for continuous playback
          await pm.setLoopMode(LoopMode.all);
          
          // Wait a bit and check if actually playing
          await Future.delayed(const Duration(milliseconds: 500));
          final isActuallyPlaying = pm.player.playing;
          print('After playUrls, player.playing: $isActuallyPlaying');
          
          if (mounted) setState(() => _playbackState = {'is_playing': isActuallyPlaying});
          // Always start announcement loop when playback starts
          // The loop will check if music is actually playing before playing announcements
          print('Starting announcement loop after playback start');
          _startAnnouncementLoop();
          print('Announcement loop start called');
        } catch (e) {
          print('Error starting playback: $e');
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to start playback: $e')));
        }
      }
      // Refresh state
      await Future.delayed(const Duration(seconds: 1));
      await _loadPlaybackState();
    } catch (e, stackTrace) {
      print('Playback error: $e');
      print('Stack trace: $stackTrace');
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e')));
    }
  }

  Future<String?> _pickZone(BuildContext context) async {
    final zones = context.read<ZoneModel>().zones;
    String? selected = zones.isNotEmpty ? (zones.first['id'] ?? zones.first['zone_id']).toString() : null;
    return await showDialog<String>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Select Target Zone'),
          content: DropdownButtonFormField<String>(
            initialValue: selected,
            items: zones.map<DropdownMenuItem<String>>((z) {
              final id = (z['id'] ?? z['zone_id']).toString();
              return DropdownMenuItem(value: id, child: Text(z['name'] ?? 'Zone'));
            }).toList(),
            onChanged: (v) => selected = v,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, null), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, selected), child: const Text('Confirm')),
          ],
        );
      },
    );
  }

  Future<void> _transferSelectedMusicToZone(String targetZoneId) async {
    final ids = _selectedMusicIds.toList();
    for (final id in ids) {
      try {
        await updateMusicFile(id, zoneId: targetZoneId);
      } catch (_) {}
    }
    await _loadContent();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transferred selected music tracks')));
    }
  }

  Future<void> _copySelectedMusicToZone(String targetZoneId) async {
    final ids = _selectedMusicIds.toList();
    for (final id in ids) {
      try {
        await copyMusicFileToZone(id, targetZoneId);
      } catch (_) {}
    }
    await _loadContent();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied selected music tracks')));
    }
  }

  Future<void> _transferAnnouncementsFolderToZone(String targetZoneId, String folderId) async {
    try {
      final zm = context.read<ZoneModel>();
      final currentZoneId = zm.selectedZoneId ?? _selectedZoneId;
      final anns = await getAnnouncements(folderId: folderId, zoneId: currentZoneId);
      for (final a in anns) {
        final id = (a['id'] ?? a['announcement_id'] ?? '').toString();
        if (id.isEmpty) continue;
        try {
          await updateAnnouncement(id, zoneId: targetZoneId);
        } catch (_) {}
      }
      await _loadContent();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transferred announcements in selected folder')));
      }
    } catch (_) {}
  }

  Future<void> _copyAnnouncementsFolderToZone(String targetZoneId, String folderId) async {
    try {
      final zm = context.read<ZoneModel>();
      final currentZoneId = zm.selectedZoneId ?? _selectedZoneId;
      final anns = await getAnnouncements(folderId: folderId, zoneId: currentZoneId);
      for (final a in anns) {
        final title = (a['title'] ?? '').toString();
        final text = (a['text'] ?? '').toString();
        if (title.isEmpty || text.isEmpty) continue;
        try {
          await createTTSAnnouncement(title, text, folderId: folderId, zoneId: targetZoneId);
        } catch (_) {}
      }
      await _loadContent();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied announcements in selected folder')));
      }
    } catch (_) {}
  }

  void _startAnnouncementLoop() {
    _announcementTimer?.cancel();
    _countdownTimer?.cancel();
    _nextAnnouncementIndex = 0;
    // Set _lastAnnouncementTime to NOW so countdown starts from full interval
    _lastAnnouncementTime = DateTime.now();
    final interval = _announcementInterval.toInt();
    print('=== Starting announcement loop ===');
    print('Interval: ${interval}s');
    print('Total announcements: ${_announcements.length}');
    print('Selected folder: $_selectedAnnouncementFolderId');
    
    // Filter announcements to check if we have any candidates
    final candidates = _announcements.where((a) {
      final enabled = a['enabled'] != false;
      if (!enabled) return false;
      // Check all possible folder ID fields
      final folderId = (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
      if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
        final selectedId = _selectedAnnouncementFolderId!.trim();
        return folderId == selectedId;
      }
      return true;
    }).toList();
    
    if (candidates.isEmpty) {
      print('No announcement candidates found - not starting loop');
      _lastAnnouncementTime = null; // Clear so countdown doesn't show
      if (mounted) setState(() {});
      return;
    }
    
    // Start periodic timer for announcements
    _announcementTimer = Timer.periodic(Duration(seconds: interval), (timer) {
      if (mounted) {
        print('Announcement timer fired at ${DateTime.now()}');
        _playNextAnnouncement();
      } else {
        timer.cancel();
      }
    });
    // Start countdown timer to update UI every second
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {}); // Force rebuild every second to update countdown
      } else {
        timer.cancel();
      }
    });
    print('Announcement loop started successfully with ${candidates.length} candidates');
  }

  Future<void> _playNextAnnouncement() async {
    // Guard: don't start if already playing an announcement
    if (_isPlayingAnnouncement) { 
      print('Announcement already playing, skipping'); 
      return; 
    }
    
    final pm = context.read<PlayerModel>();
    // Check if music is playing - but be more lenient
    final musicPlaying = pm.player.playing || _playbackState?['is_playing'] == true;
    if (!musicPlaying) {
      print('Skipping announcement - music is not playing (player.playing=${pm.player.playing}, state=${_playbackState?['is_playing']})');
      return;
    }
    print('Music is playing, proceeding with announcement');
    
    final zm = context.read<ZoneModel>();
    final zoneId = zm.selectedZoneId ?? _selectedZoneId;
    if (zoneId == null) return;

    // Since we're loading announcements filtered by folder in _loadContent,
    // all announcements in _announcements should already be in the selected folder
    // Just filter by enabled status
    final candidates = _announcements.where((a) {
      final enabled = a['enabled'] != false; // respect enabled flag
      if (!enabled) return false;
      
      // If a folder is selected, verify the announcement is in that folder
      if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
        final folderId = (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
        final selectedId = _selectedAnnouncementFolderId!.trim();
        final matches = folderId == selectedId;
        if (!matches) {
          print('WARNING: Announcement "${a['title']}" has folderId "$folderId" but selected folder is "$selectedId"');
          print('  Full announcement: ${a.toString()}');
        }
        return matches;
      }
      // If no folder selected, show all enabled announcements
      return true;
    }).toList();

    print('Announcement candidates: ${candidates.length} out of ${_announcements.length} total');
    print('Selected folder ID: "$_selectedAnnouncementFolderId"');
    if (_announcements.isNotEmpty) {
      print('Loaded announcements folder IDs: ${_announcements.map((a) => (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString()).toList()}');
    }
    if (candidates.isEmpty) {
      print('No announcements available. Selected folder: $_selectedAnnouncementFolderId');
      return;
    }

    if (_nextAnnouncementIndex >= candidates.length) {
      _nextAnnouncementIndex = 0;
    }
    
    final ann = candidates[_nextAnnouncementIndex];
    _nextAnnouncementIndex++;
    
    final annId = (ann['id'] ?? '').toString();
    final deviceIds = _devices.map((d) => (d['id'] ?? d['device_id'] ?? '').toString()).toList();
    if (deviceIds.isEmpty) {
      // Local announcement: duck music volume, play announcement, then restore
      // Check all possible URL fields, including stream_url
      final rawUrl = (ann['file_url'] ?? ann['fileUrl'] ?? ann['stream_url'] ?? ann['url'] ?? '').toString();
      // Normalize URL - remove spaces, duplicates, etc.
      final url = _normalizeAnnouncementUrl(rawUrl);
      final title = (ann['title'] ?? 'Announcement').toString();
      // Filter out placeholder/empty URLs
      if (url.isEmpty || url.contains('placeholder') || url == '#' || url.contains('%20')) {
        print('Announcement URL is empty or invalid: $url');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Announcement "$title" has no valid audio file. Please regenerate it.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }
      
      // Get authentication token for announcement headers
      final token = await getAccessToken();
      String announcementUrl = url;
      
      // Resolve redirect if it's an API endpoint
      final isApiEndpoint = url.contains('/api/v1/') || url.contains('execute-api');
      final isPresignedS3 = url.contains('X-Amz-') || (url.contains('amazonaws.com') && !url.contains('/api/'));
      if (isApiEndpoint && !isPresignedS3 && token != null && token.isNotEmpty) {
        try {
          print('Resolving announcement URL redirect: $url');
          final response = await http.head(Uri.parse(url), headers: {'Authorization': 'Bearer $token'}).timeout(const Duration(seconds: 10));
          if (response.statusCode == 302 || response.statusCode == 301) {
            final location = response.headers['location'];
            if (location != null && location.isNotEmpty) {
              announcementUrl = location;
              print('Announcement redirect resolved to: $announcementUrl');
            }
          }
        } catch (e) {
          print('Error resolving announcement redirect: $e, using original URL');
        }
      }
      
      print('Playing announcement: $title, URL: $announcementUrl');
      
      try {
        // pm is already defined above in the function
        final originalVol = pm.volume;
        final musicVol = (_musicVolume.clamp(0, 100) / 100).toDouble();
        final annVol = (_announcementVolume.clamp(0, 100) / 100).toDouble();
        final fade = _fadeDuration.clamp(0, 10).toInt();
        // Fade down
        if (fade > 0) {
          final steps = 6;
          for (int i = 1; i <= steps; i++) {
            final v = originalVol - (originalVol - musicVol) * (i / steps);
            await pm.setVol(v);
            await Future.delayed(Duration(milliseconds: (fade * 1000 / steps).round()));
          }
        } else {
          await pm.setVol(musicVol);
        }
        print('Setting announcement URL: $announcementUrl');
        
        // Use DEDICATED annPlayer - music player keeps playing at reduced volume
        // Create announcement source with headers
        final annHeaders = <String, String>{};
        if (token != null && token.isNotEmpty) {
          annHeaders['Authorization'] = 'Bearer $token';
        }
        final annSource = AudioSource.uri(
          Uri.parse(announcementUrl),
          headers: annHeaders.isNotEmpty ? annHeaders : null,
        );
        
        // Play announcement using dedicated player (music continues at reduced volume)
        _isPlayingAnnouncement = true;
        if (mounted) setState(() {});
        await pm.annPlayer.setVolume(annVol);
        await pm.annPlayer.setAudioSource(annSource);
        print('Playing announcement via dedicated annPlayer: $title');
        print('Announcement URL: $announcementUrl');
        print('Announcement volume: $annVol');
        print('Music volume (reduced): $musicVol');
        await pm.annPlayer.play();
        
        // Verify it's actually playing - wait longer and check multiple times
        await Future.delayed(const Duration(milliseconds: 1000));
        var isAnnPlaying = pm.annPlayer.playing;
        print('Announcement playing status (1s): $isAnnPlaying');
        if (!isAnnPlaying) {
          // Try again - sometimes it takes a moment
          await Future.delayed(const Duration(milliseconds: 500));
          isAnnPlaying = pm.annPlayer.playing;
          print('Announcement playing status (1.5s): $isAnnPlaying');
        }
        if (!isAnnPlaying) {
          print('ERROR: Announcement failed to start playing after retry');
          print('Player state: ${pm.annPlayer.playerState}');
          _isPlayingAnnouncement = false;
          if (mounted) setState(() {});
          return;
        }
        
        // Wait until announcement completes
        await pm.annPlayer.playerStateStream.firstWhere((s) => s.processingState == ProcessingState.completed || (!s.playing && s.processingState == ProcessingState.idle)).timeout(const Duration(seconds: 120), onTimeout: () => pm.annPlayer.playerState);
        // Restore volume with fade up
        if (fade > 0) {
          final steps = 6;
          for (int i = 1; i <= steps; i++) {
            final v = musicVol + (originalVol - musicVol) * (i / steps);
            await pm.setVol(v);
            await Future.delayed(Duration(milliseconds: (fade * 1000 / steps).round()));
          }
        } else {
          await pm.setVol(originalVol);
        }
        
        // Stop announcement player (music continues playing at normal volume)
        await pm.annPlayer.stop();
        _isPlayingAnnouncement = false;
        // Reset countdown timer - next announcement will be in _announcementInterval seconds
        _lastAnnouncementTime = DateTime.now();
        if (mounted) setState(() {});
        
        // Music should still be playing - no need to restore
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Playing Announcement: $title'),
            duration: const Duration(seconds: 2),
            backgroundColor: const Color(0xFF1DB954),
          ));
        }
      } catch (e) {
        print('Error playing announcement: $e');
        // Stop announcement player on error
        try {
          final pm = context.read<PlayerModel>();
          await pm.annPlayer.stop();
          _isPlayingAnnouncement = false;
          // Reset countdown timer on error - next announcement will be in _announcementInterval seconds
          _lastAnnouncementTime = DateTime.now();
          if (mounted) setState(() {});
        } catch (_) {}
        // Music should still be playing - no need to restore
      }
      return;
    }
    try {
      await playInstantAnnouncement(annId, deviceIds);
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(
           content: Text('Playing Announcement: ${ann['title'] ?? 'Unknown'}'),
           duration: const Duration(seconds: 3),
           backgroundColor: const Color(0xFF1DB954),
         ));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Announcement failed: $e')));
    }
  }

  String _formatDuration(double seconds) {
    if (seconds < 60) return '${seconds.toInt()}s';
    final mins = seconds ~/ 60;
    final secs = (seconds % 60).toInt();
    if (secs == 0) return '$mins min${mins != 1 ? 's' : ''}';
    return '${mins}m ${secs}s';
  }
  
  String _formatSecondsInt(int total) {
    if (total >= 3600) {
      final h = total ~/ 3600;
      final m = (total % 3600) ~/ 60;
      final s = total % 60;
      return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
    final m = total ~/ 60;
    final s = total % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
  
  Future<void> _probeDuration(String id, String url) async {
    if (id.isEmpty || url.isEmpty || _durationCache.containsKey(id)) return;
    // Skip duration probing to avoid creating multiple player instances
    // Duration will be available once playback starts via playbackEventStream
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    
    // Sync with global zone
    final zoneModel = context.watch<ZoneModel>();
    if (zoneModel.selectedZoneId != _selectedZoneId && zoneModel.selectedZoneId != null) {
      _selectedZoneId = zoneModel.selectedZoneId;
      _loadPlaybackState();
      _selectedMusicIds.clear();
      _selectedAnnouncementFolderId = null;
      _selectedMusicFolderId = null;
      _loadContent();
    }

    final isPlaying = _playbackState?['is_playing'] == true;
    String zoneName = 'Selected Zone';
    if (_selectedZoneId != null && zoneModel.zones.isNotEmpty) {
       final z = zoneModel.zones.firstWhere((z) => (z['id'] ?? z['zone_id']).toString() == _selectedZoneId, orElse: () => {});
       if (z.isNotEmpty) zoneName = z['name'];
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(zoneName),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await _loadContent();
              await _loadPlaybackState();
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Stats Row
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  StatCard(title: 'Music Tracks', value: '${_allMusic.length}', icon: Icons.music_note, color: Colors.blue),
                  const SizedBox(width: 12),
                  StatCard(title: 'Announcements', value: '${_announcements.length}', icon: Icons.campaign, color: Colors.green),
                  const SizedBox(width: 12),
                  StatCard(title: 'Active Schedules', value: '${_schedules.length}', icon: Icons.calendar_today, color: Colors.purple), 
                ],
              ),
            ),
            const SizedBox(height: 24),

            
            // 2. Now Playing & Queue Section
            Builder(builder: (ctx) {
              // Capture state variables for use in Builder
              final isPlayingAnn = _isPlayingAnnouncement;
              final lastAnnTime = _lastAnnouncementTime;
              final annInterval = _announcementInterval;
              final nextAnnIdx = _nextAnnouncementIndex;
              
              final pm = ctx.watch<PlayerModel>();
              final isActuallyPlaying = pm.player.playing;
              final currentIdx = pm.player.currentIndex ?? 0;
              final totalTracks = pm.player.sequence?.length ?? 0;
              final currentPos = pm.position;
              final currentDur = pm.duration;
              
              // Get upcoming songs from playlist
              final upcomingSongs = <Map<String, dynamic>>[];
              if (totalTracks > 0 && currentIdx < totalTracks - 1) {
                for (int i = currentIdx + 1; i < totalTracks && i < currentIdx + 6; i++) {
                  final title = i < pm.playlistTitles.length ? pm.playlistTitles[i] : 'Track ${i + 1}';
                  upcomingSongs.add({'title': title, 'index': i});
                }
              }
              
              // Get announcement info
              final annCandidates = _announcements.where((a) {
                final enabled = a['enabled'] != false;
                if (!enabled) return false;
                if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
                  // Check all possible folder ID fields
                  final folderId = (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
                  final selectedId = _selectedAnnouncementFolderId!.trim();
                  return folderId == selectedId;
                }
                return true;
              }).toList();
              
              final nextAnnIdx2 = nextAnnIdx < annCandidates.length ? nextAnnIdx : 0;
              final nextAnn = annCandidates.isNotEmpty ? annCandidates[nextAnnIdx2] : null;
              final nextAnnTitle = nextAnn?['title'] ?? 'None';
              final nextAnnDur = nextAnn?['duration_seconds'] ?? nextAnn?['duration'] ?? 0;
              
              // Calculate countdown - use current state, not captured value
              // This will rebuild every second due to _countdownTimer
              int secsLeft = annInterval.toInt();
              final currentLastAnnTime = _lastAnnouncementTime; // Get fresh value
              
              // Check if we have any announcement candidates
              final annCandidatesCheck = _announcements.where((a) {
                final enabled = a['enabled'] != false;
                if (!enabled) return false;
                if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
                  // Check all possible folder ID fields
                  final folderId = (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
                  final selectedId = _selectedAnnouncementFolderId!.trim();
                  return folderId == selectedId;
                }
                return true;
              }).toList();
              
              if (annCandidatesCheck.isEmpty) {
                // No announcements available - don't show countdown
                secsLeft = 0;
              } else if (currentLastAnnTime != null && isActuallyPlaying) {
                final now = DateTime.now();
                final elapsed = now.difference(currentLastAnnTime).inSeconds;
                secsLeft = (annInterval.toInt() - elapsed).clamp(0, annInterval.toInt());
              } else if (currentLastAnnTime == null && isActuallyPlaying) {
                // Loop hasn't started yet, show full interval
                secsLeft = annInterval.toInt();
              } else if (!isActuallyPlaying) {
                secsLeft = annInterval.toInt(); // Show full interval when not playing
              }
              
              if (!isActuallyPlaying) {
                return const SizedBox.shrink();
              }
              
              return Card(
                color: const Color(0xFF181818),
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                margin: const EdgeInsets.only(bottom: 16),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      const Row(
                        children: [
                          Icon(Icons.queue_music, color: Color(0xFF1DB954), size: 20),
                          SizedBox(width: 8),
                          Text('Now Playing', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Current Song
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1DB954).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.music_note, color: Color(0xFF1DB954), size: 32),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  pm.currentTitle ?? 'Unknown',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Wrap(
                                  spacing: 8,
                                  children: [
                                    Text(
                                      '${_formatSecondsInt(currentPos.inSeconds)} / ${_formatSecondsInt(currentDur.inSeconds)}',
                                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                                    ),
                                    Text(
                                      'Track ${currentIdx + 1} of $totalTracks',
                                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                LinearProgressIndicator(
                                  value: currentDur.inSeconds > 0 ? currentPos.inSeconds / currentDur.inSeconds : 0,
                                  backgroundColor: Colors.grey[800],
                                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1DB954)),
                                  minHeight: 4,
                                ),
                              ],
                            ),
                          ),
                          // Announcement Section (Side-by-side)
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(left: 12),
                              constraints: const BoxConstraints(maxWidth: 140),
                              decoration: BoxDecoration(
                                color: isPlayingAnn ? Colors.orange.withOpacity(0.15) : const Color(0xFF1E3A2A),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isPlayingAnn ? Colors.orange : const Color(0xFF1DB954).withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        isPlayingAnn ? Icons.campaign : Icons.access_time,
                                        size: 14,
                                        color: isPlayingAnn ? Colors.orange : const Color(0xFF1DB954),
                                      ),
                                      const SizedBox(width: 4),
                                      Flexible(
                                        child: Text(
                                          isPlayingAnn ? 'Broadcasting' : 'Next Announcement',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: isPlayingAnn ? Colors.orange : const Color(0xFF1DB954),
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                    Text(
                                      isPlayingAnn ? 'Playing...' : (secsLeft > 0 ? _formatSecondsInt(secsLeft) : 'No announcements'),
                                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                  const SizedBox(height: 4),
                                  Text(
                                    nextAnnTitle,
                                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (nextAnnDur > 0)
                                    Text(
                                      _formatSecondsInt(nextAnnDur),
                                      style: const TextStyle(fontSize: 9, color: Colors.grey),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Upcoming Songs
                      if (upcomingSongs.isNotEmpty) ...[
                        const Divider(color: Colors.white10),
                        const SizedBox(height: 8),
                        const Text('Upcoming', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                        const SizedBox(height: 8),
                        ...upcomingSongs.map((song) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              children: [
                                Container(
                                  width: 4,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1DB954).withOpacity(0.5),
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Icon(Icons.music_note, color: Colors.grey, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        song['title'] ?? 'Unknown',
                                        style: const TextStyle(fontSize: 13, color: Colors.white),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        'Track ${song['index'] + 1}',
                                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ],
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 16),
            
            // 3. Live Playback Control Card
            Card(
              color: const Color(0xFF181818),
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.white.withOpacity(0.1))),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    const Row(
                      children: [
                        Icon(Icons.play_circle_filled, color: Color(0xFF1DB954)),
                        SizedBox(width: 8),
                        Text('Live Playback Control', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text('Control music and announcement playback across your zones', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    const SizedBox(height: 16),

                    // Zone Banner
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1DB954).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF1DB954).withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.speaker, color: Color(0xFF1DB954), size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Playing on: $zoneName', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                const Text('Change zone using the selector at the top of the page', style: TextStyle(color: Colors.grey, fontSize: 10)),
                                Text('Devices: ${_devices.length}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                Text('State: ${_playbackState?['is_playing'] == true ? 'PLAYING' : 'IDLE'}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                Text('Selected Tracks: ${_selectedMusicIds.length}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                Text('Announcement Folder: ${_selectedAnnouncementFolderId == null ? 'None' : (_announcementFolders.firstWhere((f) => (f['id'] ?? '').toString() == _selectedAnnouncementFolderId, orElse: () => {'name':'Unknown'})['name'] ?? 'Unknown')}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Music Folder Selection
                    const Text('Select Music Folder', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(filled: true, fillColor: Color(0xFF2A2A2A)),
                      initialValue: _selectedMusicFolderId,
                      items: [
                        const DropdownMenuItem(value: null, child: Text('No Folder (Select Individual Tracks)')),
                        ..._musicFolders.map((f) => DropdownMenuItem(
                          value: (f['id'] ?? '').toString(),
                          child: Text(f['name'] ?? 'Unknown'),
                        )),
                      ],
                      onChanged: (v) {
                        setState(() => _selectedMusicFolderId = v);
                        _updateMusicSelectionFromFolder();
                      },
                      hint: const Text('No Folder (Select Individual Tracks)'),
                    ),
                    const SizedBox(height: 16),

                    // Music Selection
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Select Music Tracks', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        TextButton(
                          onPressed: () {
                            setState(() {
                              if (_selectedMusicIds.length == _allMusic.length) {
                                _selectedMusicIds.clear();
                              } else {
                                _selectedMusicIds.addAll(_allMusic.map((m) => (m['id'] ?? '').toString()));
                              }
                            });
                          },
                          child: Text(_selectedMusicIds.length == _allMusic.length ? 'Deselect All' : 'Select All'),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () async {
                            final targetZoneId = await _pickZone(context);
                            if (targetZoneId == null || _selectedMusicIds.isEmpty) return;
                            await _transferSelectedMusicToZone(targetZoneId);
                          },
                          icon: const Icon(Icons.redo, size: 18),
                          label: const Text('Transfer to Zone'),
                        ),
                        OutlinedButton.icon(
                          onPressed: () async {
                            final targetZoneId = await _pickZone(context);
                            if (targetZoneId == null || _selectedMusicIds.isEmpty) return;
                            await _copySelectedMusicToZone(targetZoneId);
                          },
                          icon: const Icon(Icons.copy_all, size: 18),
                          label: const Text('Copy to Zone'),
                        ),
                      ],
                    ),
                    Builder(
                      builder: (context) {
                        // Filter music by folder if folder is selected
                        final displayMusic = _selectedMusicFolderId != null
                          ? _allMusic.where((m) {
                              final folderId = (m['folder'] ?? m['folder_id'] ?? '').toString();
                              return folderId == _selectedMusicFolderId;
                            }).toList()
                          : _allMusic;
                        return Container(
                          height: 200,
                          decoration: BoxDecoration(
                            color: const Color(0xFF2A2A2A),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: displayMusic.isEmpty 
                            ? const Center(child: Text('No music found', style: TextStyle(color: Colors.grey)))
                            : ListView.separated(
                                itemCount: displayMusic.length,
                                separatorBuilder: (_, __) => const Divider(height: 1, color: Colors.white10),
                                itemBuilder: (ctx, i) {
                                  final m = displayMusic[i];
                            final id = (m['id'] ?? m['file_id'] ?? m['music_file_id'] ?? '').toString();
                              final url = (m['file_url'] ?? m['url'] ?? '').toString();
                              final isSelected = _selectedMusicIds.contains(id);
                              final rawDur = m['duration_seconds'] ?? m['duration'] ?? m['length_seconds'];
                              int? durSecs;
                              if (rawDur is int) {
                                durSecs = rawDur;
                              } else if (rawDur is String) {
                                durSecs = int.tryParse(rawDur);
                              } else {
                                durSecs = _durationCache[id];
                              }
                              if ((durSecs == null || durSecs == 0) && url.isNotEmpty) {
                                WidgetsBinding.instance.addPostFrameCallback((_) {
                                  _probeDuration(id, url);
                                });
                              }
                              return CheckboxListTile(
                                value: isSelected,
                                activeColor: const Color(0xFF1DB954),
                                checkColor: Colors.black,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                title: Text(m['name'] ?? 'Unknown', style: const TextStyle(color: Colors.white, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
                                subtitle: Text(durSecs == null ? '...' : _formatSecondsInt(durSecs), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                secondary: const Icon(Icons.music_note, color: Colors.grey),
                                onChanged: (v) {
                                  setState(() {
                                    if (v == true) {
                                      _selectedMusicIds.add(id);
                                    } else {
                                      _selectedMusicIds.remove(id);
                                    }
                                  });
                                },
                              );
                                },
                              ),
                        );
                      },
                    ),
                    const SizedBox(height: 24),

                    // Announcement Folder
                    const Text('Select Announcement Folder', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(filled: true, fillColor: Color(0xFF2A2A2A)),
                      initialValue: _selectedAnnouncementFolderId,
                      items: [
                        const DropdownMenuItem(value: null, child: Text('No Folder (All Enabled)')),
                        ..._announcementFolders.map((f) => DropdownMenuItem(
                          value: (f['id'] ?? '').toString(),
                          child: Text(f['name'] ?? 'Unknown'),
                        )),
                      ],
                      onChanged: (v) {
                        setState(() {
                          _selectedAnnouncementFolderId = v;
                          print('Announcement folder selected: $v');
                        });
                        // Reload announcements for the selected folder (like announcements page does)
                        _loadContent();
                        // Restart announcement loop with new folder selection if music is playing
                        if (_playbackState?['is_playing'] == true) {
                          _startAnnouncementLoop();
                        }
                      },
                      hint: const Text('No Folder (All Enabled)'),
                    ),
                    const SizedBox(height: 16),

                    // Show announcements in selected folder (like music does)
                    const Text('Announcements in Selected Folder', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    Builder(
                      builder: (context) {
                        // Announcements are already filtered by folder in _loadContent
                        final folderAnnouncements = _announcements.where((a) {
                          final enabled = a['enabled'] != false;
                          return enabled;
                        }).toList();
                        return Container(
                          height: 150,
                          decoration: BoxDecoration(
                            color: const Color(0xFF2A2A2A),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: folderAnnouncements.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.campaign, color: Colors.grey, size: 32),
                                    const SizedBox(height: 8),
                                    Text(
                                      _selectedAnnouncementFolderId == null 
                                        ? 'No folder selected - select a folder above' 
                                        : 'No announcements in this folder',
                                      style: const TextStyle(color: Colors.grey),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.separated(
                                itemCount: folderAnnouncements.length,
                                separatorBuilder: (_, __) => const Divider(height: 1, color: Colors.white10),
                                itemBuilder: (ctx, i) {
                                  final ann = folderAnnouncements[i];
                                  final title = (ann['title'] ?? 'Unknown').toString();
                                  final folderId = (ann['folder_id'] ?? ann['folderId'] ?? ann['category'] ?? '').toString();
                                  final selectedFolderId = _selectedAnnouncementFolderId ?? '';
                                  return ListTile(
                                    leading: const Icon(Icons.campaign, color: Colors.orange),
                                    title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14)),
                                    subtitle: Text(
                                      'Folder: ${folderId.isEmpty ? "None" : folderId}${selectedFolderId.isNotEmpty && folderId != selectedFolderId ? " (MISMATCH!)" : ""}',
                                      style: TextStyle(
                                        color: (selectedFolderId.isNotEmpty && folderId != selectedFolderId) ? Colors.red : Colors.grey,
                                        fontSize: 10,
                                      ),
                                    ),
                                    dense: true,
                                  );
                                },
                              ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),

                    // Sliders
                    _buildSlider('Announcement Interval', _announcementInterval, 10, 1800, (v) => setState(() => _announcementInterval = v), _formatDuration(_announcementInterval)),
                    const SizedBox(height: 16),
                    _buildSlider('Fade Duration', _fadeDuration, 1, 10, (v) => setState(() => _fadeDuration = v), '${_fadeDuration.toInt()}s'),
                    const SizedBox(height: 16),
                    _buildSlider('Music Volume During Announcement', _musicVolume, 0, 100, (v) => setState(() => _musicVolume = v), '${_musicVolume.toInt()}%'),
                    const SizedBox(height: 16),
                    _buildSlider('Announcement Volume', _announcementVolume, 0, 100, (v) => setState(() => _announcementVolume = v), '${_announcementVolume.toInt()}%'),
                    const SizedBox(height: 32),

                    // Start/Stop Button
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton.icon(
                        onPressed: _togglePlayback,
                        icon: Icon(isPlaying ? Icons.pause : Icons.play_arrow),
                        label: Text(isPlaying ? 'Pause Playback' : 'Start Playback', style: const TextStyle(fontSize: 18)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isPlaying ? Colors.red : const Color(0xFF1DB954),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton(
                        onPressed: _playNextAnnouncement,
                        child: const Text('Play Announcement Now'),
                      ),
                    ),

                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSlider(String label, double value, double min, double max, ValueChanged<double> onChanged, String displayValue) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF2A2A2A), borderRadius: BorderRadius.circular(8)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFF1DB954), borderRadius: BorderRadius.circular(4)),
                child: Text(displayValue, style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: const Color(0xFF1DB954),
              inactiveTrackColor: Colors.grey[800],
              thumbColor: Colors.white,
              trackHeight: 4,
            ),
            child: Slider(
              value: value,
              min: min,
              max: max,
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}

