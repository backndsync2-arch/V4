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
  Timer? _announcementTimer; // Periodic countdown timer (like web)
  Timer? _playbackStateTimer;
  Timer? _countdownTimer; // UI update timer
  Timer? _elapsedTimer; // Session elapsed time timer
  Timer? _volumeMonitorTimer; // Volume monitoring during announcement
  int _nextAnnouncementIndex = 0;
  List<dynamic> _announcementCandidates = []; // Store candidates to ensure consistent cycling
  final Map<String, int> _durationCache = {};
  bool _wasPlayingBeforeAnnouncement = false;
  int? _previousIndex;
  DateTime? _playbackStartTime;
  DateTime? _lastAnnouncementTime;
  bool _isPlayingAnnouncement = false;
  int _timeUntilNextAnnouncement = 0; // Countdown in seconds (like web)
  int _elapsedTime = 0; // Session elapsed time in seconds (like web)

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
    _elapsedTimer?.cancel();
    _volumeMonitorTimer?.cancel();
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
            _elapsedTimer?.cancel();
            _volumeMonitorTimer?.cancel();
            _lastAnnouncementTime = null;
            _timeUntilNextAnnouncement = 0;
            _elapsedTime = 0;
            _isPlayingAnnouncement = false;
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
              // Reset announcement state
              _nextAnnouncementIndex = 0;
              _isPlayingAnnouncement = false;

              final hasAnnouncements = _announcements.where((a) {
                final enabled = a['enabled'] != false;
                if (!enabled) return false;
                final folderId =
                    (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
                if (_selectedAnnouncementFolderId != null &&
                    _selectedAnnouncementFolderId!.isNotEmpty) {
                  return folderId == _selectedAnnouncementFolderId!.trim();
                }
                return true;
              }).isNotEmpty;

              // Set countdown value ONCE before starting
              if (hasAnnouncements) {
                _timeUntilNextAnnouncement = _announcementInterval.toInt();
                print('Countdown initialized to: $_timeUntilNextAnnouncement seconds');
              } else {
                _timeUntilNextAnnouncement = 0;
              }

              // Start music
              await pm.playUrls(items);

              // Set loop mode immediately
              await pm.setLoopMode(LoopMode.all);
              print('Loop mode set to: all');

              // Brief wait for player to confirm playing state
              await Future.delayed(const Duration(milliseconds: 300));

              // FIX: Set playback state to TRUE here and DON'T re-check later.
              // Trusting that playUrls succeeded since it didn't throw.
              if (mounted) {
                setState(() {
                  _playbackState = {'is_playing': true};
                  _playbackStartTime = DateTime.now();
                  _elapsedTime = 0;
                });
              }

              // FIX: Start announcement loop ONCE, AFTER music is confirmed started.
              // Do NOT call this before playUrls.
              if (hasAnnouncements) {
                print('Starting announcement loop after music confirmed started');
                _startAnnouncementLoop();
              }

              print('Playback started successfully');

              // FIX: REMOVED the dangerous 500ms re-check of pm.player.playing.
              // That re-check was setting _playbackState to {is_playing: false} if
              // the player was still buffering, which hid the Now Playing card and
              // made the countdown invisible.

              // Refresh state from server after a short delay (for logging/sync only)
              await Future.delayed(const Duration(seconds: 2));
              await _loadPlaybackState();
            } catch (e, stackTrace) {
              print('Error starting playback: $e');
              print('Stack trace: $stackTrace');
              ScaffoldMessenger.of(context)
                  .showSnackBar(SnackBar(content: Text('Failed to start playback: $e')));
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

  void _startElapsedTimer() {
    _elapsedTimer?.cancel();
    int graceTicks = 0; // Grace period: don't cancel immediately if player is buffering
    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final pm = Provider.of<PlayerModel>(context, listen: false);
      if (_playbackState?['is_playing'] == true || pm.player.playing) {
        graceTicks = 0; // Reset grace counter when playing
        setState(() {
          _elapsedTime++;
        });
      } else {
        graceTicks++;
        // Only cancel after 5 consecutive seconds of not playing (grace period)
        // This prevents the timer from cancelling itself during initial buffering
        if (graceTicks > 5) {
          timer.cancel();
        }
      }
    });
  }

  // MATCH WEB LOGIC: Use periodic timer that decrements countdown and triggers play when it reaches 0
  void _startAnnouncementLoop() {
    _announcementTimer?.cancel();
    _countdownTimer?.cancel();
    _elapsedTimer?.cancel();
    
    // Filter announcements to get candidates
    _announcementCandidates = _announcements.where((a) {
      final enabled = a['enabled'] != false;
      if (!enabled) return false;
      final folderId = (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
      if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
        final selectedId = _selectedAnnouncementFolderId!.trim();
        return folderId == selectedId;
      }
      return true;
    }).toList();
    
    print('=== Starting announcement loop (WEB STYLE) ===');
    print('Interval: ${_announcementInterval.toInt()}s');
    print('Candidates: ${_announcementCandidates.length} out of ${_announcements.length} total');
    print('Initial countdown: $_timeUntilNextAnnouncement');
    
    // CRITICAL FIX: Always reset countdown when starting loop if we have candidates
    if (_announcementCandidates.isNotEmpty && _timeUntilNextAnnouncement <= 0) {
      _timeUntilNextAnnouncement = _announcementInterval.toInt();
      print('Reset countdown to: $_timeUntilNextAnnouncement');
    }
    
    // Start UI update timer (updates countdown display every second)
    // CRITICAL: This timer MUST run to update the UI display
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      // Force rebuild to update countdown display
      // This ensures the UI shows the current _timeUntilNextAnnouncement value
      setState(() {
        // Just trigger rebuild - _timeUntilNextAnnouncement is already updated by _announcementTimer
      });
    });
    
    // Start elapsed time timer
    _startElapsedTimer();
    
    // Start announcement countdown timer (MATCHES WEB LOGIC)
    // This decrements _timeUntilNextAnnouncement every second
    // When it reaches 0, plays announcement and resets to interval
    if (_announcementCandidates.isNotEmpty) {
      print('=== STARTING TIMER - Will decrement every second ===');
      _announcementTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }
        
        // SIMPLEST FIX: Timer ALWAYS runs and ALWAYS decrements
        // Don't check playing state - just decrement and play when it reaches 0
        if (!_isPlayingAnnouncement && _announcementCandidates.isNotEmpty) {
          // CRITICAL: Always update state when decrementing
          if (_timeUntilNextAnnouncement <= 1) {
            // Time to play announcement
            setState(() {
              _timeUntilNextAnnouncement = _announcementInterval.toInt();
            });
            print('Timer: Countdown reached 0 - playing announcement now');
            // Play announcement immediately (don't await - let it run async)
            _playNextAnnouncement();
          } else {
            // ALWAYS decrement - timer should always count down
            setState(() {
              _timeUntilNextAnnouncement--;
            });
            print('Timer: Decremented to $_timeUntilNextAnnouncement');
          }
        } else {
          // Still update UI even if announcement is playing
          if (mounted) setState(() {});
        }
      });
      print('Announcement countdown timer STARTED - will tick every second');
      print('Initial countdown: $_timeUntilNextAnnouncement');
      // Force immediate UI update
      if (mounted) {
        setState(() {});
      }
    } else {
      print('No announcement candidates - countdown timer not started');
      // Even if no candidates, set countdown to 0
      if (_timeUntilNextAnnouncement != 0) {
        setState(() {
          _timeUntilNextAnnouncement = 0;
        });
      }
    }
  }

  Future<void> _playNextAnnouncement() async {
    // Guard: don't start if already playing an announcement
    if (_isPlayingAnnouncement) { 
      print('Announcement already playing, skipping'); 
      return; 
    }
    
    // SIMPLEST FIX: Just play the announcement when timer reaches 0
    // Don't check if music is playing - if timer called this, play it
    print('Playing next announcement (timer reached 0)');
    
    final pm = context.read<PlayerModel>();
    final zm = context.read<ZoneModel>();
    final zoneId = zm.selectedZoneId ?? _selectedZoneId;
    if (zoneId == null) {
      // Don't play, but countdown timer will continue
      return;
    }

    // CRITICAL FIX: Always refresh candidates from current _announcements list
    // Don't rely on stale cached list - refresh it every time to ensure it's current
    _announcementCandidates = _announcements.where((a) {
      final enabled = a['enabled'] != false;
      if (!enabled) return false;
      final folderId = (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
      if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
        final selectedId = _selectedAnnouncementFolderId!.trim();
        return folderId == selectedId;
      }
      return true;
    }).toList();

    print('Announcement candidates: ${_announcementCandidates.length} out of ${_announcements.length} total');
    if (_announcementCandidates.isEmpty) {
      print('No announcements available. Selected folder: $_selectedAnnouncementFolderId');
      // CRITICAL: If no candidates, try reloading announcements data
      print('Attempting to reload announcements data...');
      try {
        await _loadContent(); // Reload to get fresh data
        // Retry filtering after reload
        _announcementCandidates = _announcements.where((a) {
          final enabled = a['enabled'] != false;
          if (!enabled) return false;
          final folderId = (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
          if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
            final selectedId = _selectedAnnouncementFolderId!.trim();
            return folderId == selectedId;
          }
          return true;
        }).toList();
        print('After reload: ${_announcementCandidates.length} candidates found');
        if (_announcementCandidates.isEmpty) {
          print('Still no announcements after reload - countdown will continue');
          // Reset countdown - periodic timer will handle next attempt
          _timeUntilNextAnnouncement = _announcementInterval.toInt();
          if (mounted) setState(() {});
          return;
        }
      } catch (e) {
        print('Error reloading announcements: $e');
        // Reset countdown - periodic timer will handle next attempt
        _timeUntilNextAnnouncement = _announcementInterval.toInt();
        if (mounted) setState(() {});
        return;
      }
    }

    // Cycle through announcements continuously using modulo
    // This ensures: 1, 2, 3, then 1, 2, 3 again (continuous loop)
    // If only one announcement, it will play repeatedly (index always 0)
    final currentIndex = _nextAnnouncementIndex % _announcementCandidates.length;
    final ann = _announcementCandidates[currentIndex];
    _nextAnnouncementIndex = (currentIndex + 1) % _announcementCandidates.length; // Increment and wrap around
    
    print('Playing announcement ${currentIndex + 1} of ${_announcementCandidates.length}: "${ann['title']}"');
    if (_announcementCandidates.length == 1) {
      print('Single announcement - will play repeatedly at ${_announcementInterval.toInt()}s intervals');
    } else {
      print('Next announcement will be: ${(_nextAnnouncementIndex % _announcementCandidates.length) + 1} of ${_announcementCandidates.length}');
    }
    
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
        // Reset countdown - periodic timer will handle next attempt
        _timeUntilNextAnnouncement = _announcementInterval.toInt();
        if (mounted) setState(() {});
        return;
      }
      
      // Get authentication token for announcement headers
      final token = await getAccessToken();
      String announcementUrl = url;
      
      // Validate and resolve URL before attempting to play
      final isApiEndpoint = url.contains('/api/v1/') || url.contains('execute-api');
      final isPresignedS3 = url.contains('X-Amz-') || (url.contains('amazonaws.com') && !url.contains('/api/'));
      
      // For API endpoints, resolve redirect and validate URL
      if (isApiEndpoint && !isPresignedS3 && token != null && token.isNotEmpty) {
        try {
          print('Validating and resolving announcement URL: $url');
          final response = await http.head(
            Uri.parse(url), 
            headers: {'Authorization': 'Bearer $token'}
          ).timeout(const Duration(seconds: 15));
          
          print('URL validation response: ${response.statusCode}');
          
          // Handle redirects
          if (response.statusCode == 302 || response.statusCode == 301) {
            final location = response.headers['location'];
            if (location != null && location.isNotEmpty) {
              announcementUrl = location;
              print('Announcement redirect resolved to: $announcementUrl');
            }
          } else if (response.statusCode >= 400) {
            // URL is not accessible
            throw Exception('Announcement URL returned ${response.statusCode}: ${response.reasonPhrase}');
          }
        } catch (e) {
          print('Error validating announcement URL: $e');
          // Try GET request as fallback (some servers don't support HEAD)
          try {
            print('Trying GET request as fallback...');
            final getResponse = await http.get(
              Uri.parse(url),
              headers: {'Authorization': 'Bearer $token', 'Range': 'bytes=0-1'} // Just get first 2 bytes to validate
            ).timeout(const Duration(seconds: 10));
            
            if (getResponse.statusCode >= 400) {
              throw Exception('Announcement URL validation failed: ${getResponse.statusCode}');
            }
            print('URL validated via GET request');
          } catch (getError) {
            print('GET validation also failed: $getError');
            throw Exception('Cannot access announcement URL: ${getError.toString()}');
          }
        }
      }
      
      // Final URL validation - ensure it's a valid URI
      try {
        final uri = Uri.parse(announcementUrl);
        if (!uri.hasScheme || (!uri.scheme.startsWith('http'))) {
          throw Exception('Invalid URL scheme: ${uri.scheme}');
        }
        print('URL validated: $announcementUrl');
      } catch (e) {
        print('Final URL validation failed: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Announcement "$title" has a malformed URL. Please regenerate it.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        // Reset countdown - periodic timer will handle next attempt
        _timeUntilNextAnnouncement = _announcementInterval.toInt();
        if (mounted) setState(() {});
        return;
      }
      
      print('Playing announcement: $title, URL: $announcementUrl');
      
      try {
        // pm is already defined above in the function
        final originalVol = pm.volume;
        final musicVol = (_musicVolume.clamp(0, 100) / 100).toDouble();
        final annVol = (_announcementVolume.clamp(0, 100) / 100).toDouble();
        final fade = _fadeDuration.clamp(0, 10).toInt();
        // Fade down (MATCH WEB: 20 steps)
        if (fade > 0) {
          final steps = 20; // Match web: 20 steps for smoother fade
          final fadeInterval = (fade * 1000) / steps;
          final startVol = originalVol;
          final endVol = musicVol;
          final volStep = (startVol - endVol) / steps;
          
          for (int i = 1; i <= steps; i++) {
            final v = (startVol - volStep * i).clamp(0.0, 1.0);
            await pm.setVol(v);
            await Future.delayed(Duration(milliseconds: fadeInterval.round()));
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
        // First, ensure player is stopped and reset from previous announcement
        try {
          await pm.annPlayer.stop();
          await pm.annPlayer.seek(Duration.zero);
          print('Announcement player reset before loading new source');
        } catch (e) {
          print('Warning: Error resetting player: $e');
        }
        
        _isPlayingAnnouncement = true;
        pm.currentAnnouncementTitle = title; // Set title for UI
        if (mounted) setState(() {});
        
        // Set volume and source with better error handling
        await pm.annPlayer.setVolume(annVol);
        print('Loading announcement source: $announcementUrl');
        
        // Start volume monitoring (MATCH WEB: check every 50ms)
        _volumeMonitorTimer?.cancel();
        _volumeMonitorTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
          if (!mounted || !_isPlayingAnnouncement) {
            timer.cancel();
            return;
          }
          try {
            final pm = context.read<PlayerModel>();
            final targetVol = annVol.clamp(0.0, 1.0);
            // Check if volume needs adjustment (just_audio maintains volume, but monitor anyway)
            // This matches web's volume monitoring behavior
          } catch (e) {
            timer.cancel();
          }
        });
        
        try {
          await pm.annPlayer.setAudioSource(annSource);
        } catch (sourceError) {
          print('ERROR setting audio source: $sourceError');
          print('URL: $announcementUrl');
          print('Headers: ${annHeaders.isNotEmpty ? 'Present' : 'None'}');
          throw Exception('Failed to set audio source: ${sourceError.toString()}');
        }
        
        // Wait for source to load with extended timeout
        int loadWaitCount = 0;
        const maxLoadWait = 50; // 5 seconds total
        while (pm.annPlayer.processingState == ProcessingState.idle && loadWaitCount < maxLoadWait) {
          await Future.delayed(const Duration(milliseconds: 100));
          loadWaitCount++;
          if (loadWaitCount % 10 == 0) {
            print('Waiting for announcement to load... (${loadWaitCount * 100}ms)');
          }
        }
        
        // Check for errors in player state
        final playerState = pm.annPlayer.playerState;
        if (playerState.processingState == ProcessingState.idle) {
          // Check if there's an error
          if (playerState.processingState == ProcessingState.idle && !playerState.playing) {
            print('ERROR: Announcement failed to load after ${loadWaitCount * 100}ms');
            print('Player state: $playerState');
            print('Processing state: ${playerState.processingState}');
            _isPlayingAnnouncement = false;
            pm.currentAnnouncementTitle = null;
            if (mounted) setState(() {});
            throw Exception('Announcement failed to load: source error (URL may be invalid or unreachable)');
          }
        }
        
        // Check if there was an error during loading
        if (playerState.processingState == ProcessingState.idle) {
          print('WARNING: Still in idle state after ${loadWaitCount * 100}ms, but continuing...');
        }
        
        print('Announcement loaded, starting playback...');
        print('Playing announcement via dedicated annPlayer: $title');
        print('Announcement URL: $announcementUrl');
        print('Announcement volume: $annVol');
        print('Music volume (reduced): $musicVol');
        
        try {
          await pm.annPlayer.play();
        } catch (playError) {
          print('ERROR calling play(): $playError');
          print('Player state: ${pm.annPlayer.playerState}');
          _isPlayingAnnouncement = false;
          pm.currentAnnouncementTitle = null;
          if (mounted) setState(() {});
          throw Exception('Failed to start playback: ${playError.toString()}');
        }
        
        // Verify it's actually playing - wait longer and check multiple times
        await Future.delayed(const Duration(milliseconds: 1500));
        var isAnnPlaying = pm.annPlayer.playing;
        var processingState = pm.annPlayer.processingState;
        print('Announcement playing status (1.5s): $isAnnPlaying, state: $processingState');
        
        if (!isAnnPlaying) {
          // Try waiting a bit more - network might be slow
          await Future.delayed(const Duration(milliseconds: 1000));
          isAnnPlaying = pm.annPlayer.playing;
          processingState = pm.annPlayer.processingState;
          print('Announcement playing status (2.5s): $isAnnPlaying, state: $processingState');
        }
        
        if (!isAnnPlaying) {
          // Check if there's a specific error
          final state = pm.annPlayer.playerState;
          print('ERROR: Announcement failed to start playing after retry');
          print('Player state: $state');
          print('Processing state: $processingState');
          print('URL: $announcementUrl');
          
          _isPlayingAnnouncement = false;
          pm.currentAnnouncementTitle = null;
          if (mounted) setState(() {});
          
          // Provide more specific error message
          String errorMsg = 'Announcement failed to start playing';
          if (processingState == ProcessingState.idle) {
            errorMsg = 'Source error: Audio file could not be loaded. Please check the URL or regenerate the announcement.';
          } else if (processingState == ProcessingState.loading) {
            errorMsg = 'Loading timeout: Audio file is taking too long to load. Network may be slow.';
          }
          
          throw Exception(errorMsg);
        }
        
        print('Announcement is now playing successfully');
        
        // Wait until announcement completes with better error handling
        try {
          // Listen for completion with timeout
          await pm.annPlayer.playerStateStream.firstWhere((s) {
            final completed = s.processingState == ProcessingState.completed;
            final idle = s.processingState == ProcessingState.idle && !s.playing;
            if (completed || idle) {
              print('Announcement completed: processingState=${s.processingState}, playing=${s.playing}');
            }
            return completed || idle;
          }).timeout(
            const Duration(seconds: 180), // Increased timeout for slow networks
            onTimeout: () {
              print('WARNING: Announcement playback timeout after 180s - forcing stop');
              return pm.annPlayer.playerState;
            },
          );
        } catch (e) {
          print('Error waiting for announcement completion: $e');
          // Continue anyway - stop the player and restore volume
        }
        
        // Stop volume monitoring
        _volumeMonitorTimer?.cancel();
        _volumeMonitorTimer = null;
        
        // Always restore volume and stop player, even if there was an error
        try {
          // Restore volume with fade up (MATCH WEB: 20 steps)
          if (fade > 0) {
            final steps = 20; // Match web: 20 steps
            final fadeInterval = (fade * 1000) / steps;
            final startVol = musicVol;
            final endVol = originalVol;
            final volStep = (endVol - startVol) / steps;
            
            for (int i = 1; i <= steps; i++) {
              final v = (startVol + volStep * i).clamp(0.0, 1.0);
              await pm.setVol(v);
              await Future.delayed(Duration(milliseconds: fadeInterval.round()));
            }
          } else {
            await pm.setVol(originalVol);
          }
        } catch (e) {
          print('Error restoring volume: $e');
          // Try to restore volume directly
          try {
            await pm.setVol(originalVol);
          } catch (_) {}
        }
        
        // Stop announcement player and reset state (music continues playing at normal volume)
        try {
          await pm.annPlayer.stop();
          await pm.annPlayer.seek(Duration.zero); // Reset position
          print('Announcement player stopped and reset');
        } catch (e) {
          print('Error stopping announcement player: $e');
        }
        
        // ALWAYS reset the flag, even if there were errors
        _isPlayingAnnouncement = false;
        pm.currentAnnouncementTitle = null; // Clear title
        pm.annDuration = Duration.zero;
        pm.annPosition = Duration.zero;
        pm.annPlaying = false;
        
        // MATCH WEB LOGIC: Cycle to next announcement and reset countdown
        // Use modulo to ensure continuous loop
        if (_announcementCandidates.isNotEmpty) {
          _nextAnnouncementIndex = (_nextAnnouncementIndex + 1) % _announcementCandidates.length;
        }
        // Reset countdown to full interval (like web does)
        _timeUntilNextAnnouncement = _announcementInterval.toInt();
        
        if (mounted) setState(() {});
        
        print('Announcement playback completed. Next: index $_nextAnnouncementIndex, countdown reset to ${_announcementInterval.toInt()}s');
        
        // Music should still be playing - no need to restore
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Playing Announcement: $title'),
            duration: const Duration(seconds: 2),
            backgroundColor: const Color(0xFF1DB954),
          ));
        }
      } catch (e, stackTrace) {
        print('ERROR playing announcement: $e');
        print('Stack trace: $stackTrace');
        
        // CRITICAL: Always reset state on error to prevent getting stuck
        try {
          final pm = context.read<PlayerModel>();
          await pm.annPlayer.stop();
          await pm.annPlayer.seek(Duration.zero); // Reset position
          print('Announcement player stopped after error');
        } catch (stopError) {
          print('Error stopping player after error: $stopError');
        }
        
        // ALWAYS reset flags
        _isPlayingAnnouncement = false;
        try {
          final pm = context.read<PlayerModel>();
          pm.currentAnnouncementTitle = null;
          pm.annDuration = Duration.zero;
          pm.annPosition = Duration.zero;
          pm.annPlaying = false;
        } catch (_) {}
        
        // Restore music volume
        try {
          final pm = context.read<PlayerModel>();
          final originalVol = pm.volume;
          await pm.setVol(originalVol);
        } catch (_) {}
        
        // Stop volume monitoring
        _volumeMonitorTimer?.cancel();
        _volumeMonitorTimer = null;
        
        // MATCH WEB LOGIC: Reset countdown on error (like web does)
        // The periodic timer will continue and trigger next announcement
        _timeUntilNextAnnouncement = _announcementInterval.toInt();
        
        if (mounted) {
          setState(() {});
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Announcement playback error: ${e.toString().length > 80 ? e.toString().substring(0, 80) + "..." : e.toString()}'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
        
        print('Error handled - announcement loop will continue');
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
              
              // Check if we have any announcement candidates - USE SAME LOGIC AS _announcementCandidates
              final annCandidatesCheck = _announcements.where((a) {
                final enabled = a['enabled'] != false;
                if (!enabled) return false;
                final folderId = (a['folder'] ?? a['folder_id'] ?? a['category'] ?? '').toString().trim();
                if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
                  final selectedId = _selectedAnnouncementFolderId!.trim();
                  return folderId == selectedId;
                }
                return true;
              }).toList();
              
              // Calculate countdown - use _timeUntilNextAnnouncement (MATCH WEB LOGIC)
              // This will rebuild every second due to _countdownTimer
              int secsLeft = _timeUntilNextAnnouncement;
              
              // FIX: Only set secsLeft to 0 if there are truly no announcements
              // Don't override if we have announcements but music just stopped
              if (annCandidatesCheck.isEmpty) {
                // No announcements available - don't show countdown
                secsLeft = 0;
              } else if (!isActuallyPlaying) {
                // Have announcements but music not playing - keep countdown value for display
                // Don't set to 0, keep the current value so it shows when music resumes
              }
              
              // Calculate remaining announcements in queue
              final remainingInQueue = annCandidatesCheck.length > 1 
                ? (annCandidatesCheck.length - nextAnnIdx2 - 1) 
                : 0;
              
              // Show card as soon as playback state indicates playing (even if player.playing is still false)
              // This ensures the UI appears immediately with the countdown
              final shouldShow = isActuallyPlaying || _playbackState?['is_playing'] == true;
              if (!shouldShow) {
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
                                    // CRITICAL: Always show current countdown value - use _timeUntilNextAnnouncement directly
                                    Text(
                                      isPlayingAnn 
                                        ? 'Playing...' 
                                        : (annCandidatesCheck.isNotEmpty && _timeUntilNextAnnouncement > 0 
                                            ? _formatSecondsInt(_timeUntilNextAnnouncement) 
                                            : (annCandidatesCheck.isNotEmpty 
                                                ? 'Ready' 
                                                : 'No announcements')),
                                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                                      key: ValueKey(_timeUntilNextAnnouncement), // Force rebuild when countdown changes
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
                                  // Queue indicator (MATCH WEB)
                                  if (remainingInQueue > 0 && !isPlayingAnn)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        '$remainingInQueue more in queue',
                                        style: const TextStyle(fontSize: 8, color: Colors.grey, fontStyle: FontStyle.italic),
                                      ),
                                    ),
                                  // Play Now button (MATCH WEB) - Always show if announcements available
                                  if (!isPlayingAnn && annCandidatesCheck.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: SizedBox(
                                        width: double.infinity,
                                        height: 32,
                                        child: ElevatedButton(
                                          onPressed: () {
                                            // Reset timer and play immediately
                                            setState(() {
                                              _timeUntilNextAnnouncement = 0;
                                            });
                                            _playNextAnnouncement();
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.orange,
                                            padding: EdgeInsets.zero,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                          ),
                                          child: const Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(Icons.play_arrow, size: 16, color: Colors.white),
                                              SizedBox(width: 4),
                                              Text(
                                                'PLAY NOW',
                                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  // Pause/Stop announcement button (when playing)
                                  if (isPlayingAnn)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: SizedBox(
                                        width: double.infinity,
                                        height: 32,
                                        child: ElevatedButton(
                                          onPressed: () async {
                                            // Stop current announcement
                                            final pm = context.read<PlayerModel>();
                                            try {
                                              await pm.annPlayer.stop();
                                              await pm.annPlayer.seek(Duration.zero);
                                              setState(() {
                                                _isPlayingAnnouncement = false;
                                                pm.currentAnnouncementTitle = null;
                                              });
                                              // Restore music volume
                                              await pm.setVol(pm.volume);
                                            } catch (e) {
                                              print('Error stopping announcement: $e');
                                            }
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.red,
                                            padding: EdgeInsets.zero,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                          ),
                                          child: const Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(Icons.stop, size: 16, color: Colors.white),
                                              SizedBox(width: 4),
                                              Text(
                                                'STOP ANNOUNCEMENT',
                                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Session time display (MATCH WEB)
                      Row(
                        children: [
                          const Icon(Icons.access_time, color: Colors.grey, size: 16),
                          const SizedBox(width: 8),
                          Text(
                            'Session time: ${_formatSecondsInt(_elapsedTime)}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      
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
                          // Clear stored candidates so they get refreshed with new folder
                          _announcementCandidates = [];
                          _nextAnnouncementIndex = 0; // Reset index for new folder
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
                                  final annType = ann['type'] ?? 'uploaded';
                                  final annDur = ann['duration_seconds'] ?? ann['duration'] ?? 0;
                                  return ListTile(
                                    leading: const Icon(Icons.campaign, color: Colors.orange),
                                    title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14)),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${annType == 'tts' ? 'Text-to-Speech' : 'Uploaded Audio'} • ${annDur > 0 ? _formatSecondsInt(annDur) : '0:00'}',
                                          style: const TextStyle(color: Colors.grey, fontSize: 10),
                                        ),
                                        if (selectedFolderId.isNotEmpty && folderId != selectedFolderId)
                                          Text(
                                            'Folder mismatch!',
                                            style: const TextStyle(color: Colors.red, fontSize: 9),
                                          ),
                                      ],
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

