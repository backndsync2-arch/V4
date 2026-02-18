import 'package:flutter/material.dart';
import 'dart:async';
import '../api.dart';
import '../services/audio_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String? _selectedZoneId;
  List<dynamic> _zones = [];
  List<dynamic> _music = [];
  final Set<String> _selectedMusicIds = {};
  Map<String, dynamic>? _playbackState;
  bool _loading = false;
  Timer? _pollTimer;
  final AudioService _audioService = AudioService();

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _initData() async {
    setState(() => _loading = true);
    try {
      final zones = await getZones();
      if (zones.isNotEmpty) {
        final zoneId = await getSelectedZoneId();
        _selectedZoneId = zoneId ?? zones.first['id']?.toString() ?? zones.first['zone_id']?.toString();
        if (_selectedZoneId != null) {
          await setSelectedZoneId(_selectedZoneId);
        }
        setState(() {
          _zones = zones;
        });
        await _loadMusic();
        await _loadPlaybackState();
        _startPolling();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted && _selectedZoneId != null) {
        _loadPlaybackState();
      }
    });
  }

  Future<void> _loadMusic() async {
    try {
      final music = await getMusicFiles(zoneId: _selectedZoneId);
      setState(() => _music = music);
    } catch (e) {
      print('Error loading music: $e');
    }
  }

  Future<void> _loadPlaybackState() async {
    if (_selectedZoneId == null) return;
    try {
      final state = await getPlaybackState(_selectedZoneId!);
      if (mounted) {
        setState(() => _playbackState = state);
      }
    } catch (e) {
      print('Error loading playback state: $e');
    }
  }

  Future<void> _startPlayback() async {
    if (_selectedZoneId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a zone')),
      );
      return;
    }

    if (_selectedMusicIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one music track')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      // Start backend playback
      await playbackPlay(_selectedZoneId!, musicFileIds: _selectedMusicIds.toList());
      
      // Also start local playback for preview
      final selectedMusic = _music.where((m) => _selectedMusicIds.contains(m['id']?.toString())).toList();
      final urls = selectedMusic
          .map((m) {
            final url = m['url']?.toString() ?? m['file_url']?.toString();
            if (url == null || url.isEmpty || url == '#') return null;
            // Ensure URL is absolute
            if (url.startsWith('http://') || url.startsWith('https://')) {
              return url;
            }
            // If relative, make it absolute
            const apiBase = 'https://02nn8drgsd.execute-api.us-east-1.amazonaws.com';
            return url.startsWith('/') ? '$apiBase$url' : '$apiBase/$url';
          })
          .whereType<String>()
          .toList();
      
      print('Starting playback with ${urls.length} URLs');
      for (var url in urls) {
        print('  - $url');
      }
      
      if (urls.isNotEmpty) {
        try {
          await _audioService.playUrls(urls);
          print('Audio service started successfully');
        } catch (e, stackTrace) {
          print('Error starting audio service: $e');
          print('Stack trace: $stackTrace');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Audio playback error: $e')),
            );
          }
        }
      } else {
        print('No valid URLs found for playback');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No valid audio URLs found')),
          );
        }
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Playback started')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start playback: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _pausePlayback() async {
    if (_selectedZoneId == null) return;
    try {
      await playbackPause(_selectedZoneId!);
      await _audioService.pause();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pause: $e')),
        );
      }
    }
  }

  Future<void> _resumePlayback() async {
    if (_selectedZoneId == null) return;
    try {
      await playbackResume(_selectedZoneId!);
      await _audioService.resume();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to resume: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
      ),
      body: _loading && _zones.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Zone selector
                if (_zones.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: DropdownButtonFormField<String>(
                      value: _selectedZoneId,
                      decoration: const InputDecoration(
                        labelText: 'Zone',
                        border: OutlineInputBorder(),
                      ),
                      items: _zones.map((zone) {
                        final id = zone['id']?.toString() ?? zone['zone_id']?.toString();
                        final name = zone['name']?.toString() ?? 'Unknown Zone';
                        return DropdownMenuItem(value: id, child: Text(name));
                      }).toList(),
                      onChanged: (value) async {
                        if (value != null) {
                          setState(() => _selectedZoneId = value);
                          await setSelectedZoneId(value);
                          await _loadMusic();
                          await _loadPlaybackState();
                        }
                      },
                    ),
                  ),
                
                // Playback controls
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      ElevatedButton.icon(
                        onPressed: _selectedMusicIds.isEmpty ? null : _startPlayback,
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('Start'),
                      ),
                      ElevatedButton.icon(
                        onPressed: _playbackState?['is_playing'] == true ? _pausePlayback : null,
                        icon: const Icon(Icons.pause),
                        label: const Text('Pause'),
                      ),
                      ElevatedButton.icon(
                        onPressed: _playbackState?['is_playing'] == false ? _resumePlayback : null,
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('Resume'),
                      ),
                    ],
                  ),
                ),
                
                // Playback status
                if (_playbackState != null)
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Status: ${_playbackState!['is_playing'] == true ? 'Playing' : 'Paused'}'),
                            if (_playbackState!['now_playing'] != null)
                              Text('Now Playing: ${_playbackState!['now_playing']['title'] ?? 'Unknown'}'),
                          ],
                        ),
                      ),
                    ),
                  ),
                
                const Divider(),
                
                // Music selection
                Expanded(
                  child: ListView.builder(
                    itemCount: _music.length,
                    itemBuilder: (context, index) {
                      final music = _music[index];
                      final id = music['id']?.toString() ?? '';
                      final title = music['title']?.toString() ?? music['name']?.toString() ?? 'Unknown';
                      final isSelected = _selectedMusicIds.contains(id);
                      
                      return CheckboxListTile(
                        title: Text(title),
                        subtitle: Text(music['artist']?.toString() ?? ''),
                        value: isSelected,
                        onChanged: (value) {
                          setState(() {
                            if (value == true) {
                              _selectedMusicIds.add(id);
                            } else {
                              _selectedMusicIds.remove(id);
                            }
                          });
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}

