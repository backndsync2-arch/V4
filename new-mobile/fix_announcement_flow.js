const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');
let n = 0;

function rep(desc, a, b) {
  if (c.includes(a)) { 
    c = c.replace(a, b); 
    n++; 
    console.log('✓ ' + desc); 
  } else {
    console.log('✗ SKIP: ' + desc);
  }
}

// FIX 1: Fix _startAnnouncementLoop to properly set _lastAnnouncementTime and start countdown
rep('Fix _startAnnouncementLoop to set _lastAnnouncementTime and start countdown',
  "  void _startAnnouncementLoop() {\r\n    _announcementTimer?.cancel();\r\n    _countdownTimer?.cancel();\r\n    _nextAnnouncementIndex = 0;\r\n    // Set _lastAnnouncementTime to NOW so countdown starts from full interval\r\n    _lastAnnouncementTime = DateTime.now();\r\n    _announcementTimer = Timer.periodic(Duration(seconds: _announcementInterval.toInt()), (timer) {\r\n      _playNextAnnouncement();\r\n    });\r\n    // Start countdown timer to update UI every second\r\n    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {\r\n      if (mounted) setState(() {});\r\n    });\r\n  }",
  "  void _startAnnouncementLoop() {\r\n    _announcementTimer?.cancel();\r\n    _countdownTimer?.cancel();\r\n    _nextAnnouncementIndex = 0;\r\n    // Set _lastAnnouncementTime to NOW so countdown starts from full interval\r\n    _lastAnnouncementTime = DateTime.now();\r\n    print('Starting announcement loop - interval: \${_announcementInterval.toInt()}s');\r\n    // Start periodic timer for announcements\r\n    _announcementTimer = Timer.periodic(Duration(seconds: _announcementInterval.toInt()), (timer) {\r\n      if (mounted) {\r\n        _playNextAnnouncement();\r\n      }\r\n    });\r\n    // Start countdown timer to update UI every second\r\n    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {\r\n      if (mounted) setState(() {});\r\n    });\r\n    // Play first announcement after 1 second (optional - can remove if you want to wait for full interval)\r\n    Timer(const Duration(seconds: 1), () {\r\n      if (mounted && pm.player.playing) {\r\n        _playNextAnnouncement();\r\n      }\r\n    });\r\n  }"
);

// FIX 2: Fix pause logic to properly cancel countdown and check if announcement is playing
rep('Fix pause logic to cancel countdown timer and stop announcements',
  "      if (isPlaying) {\r\n        await pm.pause();\r\n        _announcementTimer?.cancel();\r\n        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Playback paused (local)')));\r\n      } else {",
  "      if (isPlaying) {\r\n        // Stop any playing announcement first\r\n        if (_isPlayingAnnouncement) {\r\n          try {\r\n            await pm.annPlayer.stop();\r\n            _isPlayingAnnouncement = false;\r\n          } catch (_) {}\r\n        }\r\n        await pm.pause();\r\n        _announcementTimer?.cancel();\r\n        _countdownTimer?.cancel();\r\n        _lastAnnouncementTime = null;\r\n        if (mounted) setState(() => _playbackState = {'is_playing': false});\r\n        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Playback paused'), duration: Duration(seconds: 1)));\r\n      } else {"
);

// FIX 3: Fix _playNextAnnouncement to check if music is actually playing before playing announcement
rep('Add guard to _playNextAnnouncement to only play if music is playing',
  "  Future<void> _playNextAnnouncement() async {\r\n    final zm = context.read<ZoneModel>();\r\n    final zoneId = zm.selectedZoneId ?? _selectedZoneId;\r\n    if (zoneId == null) return;",
  "  Future<void> _playNextAnnouncement() async {\r\n    // Don't play announcements if music is not playing\r\n    final pm = context.read<PlayerModel>();\r\n    if (!pm.player.playing && _playbackState?['is_playing'] != true) {\r\n      print('Skipping announcement - music is not playing');\r\n      return;\r\n    }\r\n    \r\n    // Don't play if already playing an announcement\r\n    if (_isPlayingAnnouncement) {\r\n      print('Skipping announcement - one is already playing');\r\n      return;\r\n    }\r\n    \r\n    final zm = context.read<ZoneModel>();\r\n    final zoneId = zm.selectedZoneId ?? _selectedZoneId;\r\n    if (zoneId == null) return;"
);

// FIX 4: Fix announcement playback to use annPlayer consistently (not pm.player)
// Find the old code that uses pm.player for announcements
rep('Fix announcement playback to use annPlayer instead of main player',
  "        // Pause music and play announcement using the same player\r\n        await pm.pause();\r\n        \r\n        // Create announcement source with headers\r\n        final annHeaders = <String, String>{};\r\n        if (token != null && token.isNotEmpty) {\r\n          annHeaders['Authorization'] = 'Bearer $token';\r\n        }\r\n        final annSource = AudioSource.uri(\r\n          Uri.parse(announcementUrl),\r\n          headers: annHeaders.isNotEmpty ? annHeaders : null,\r\n        );\r\n        \r\n        // Play announcement\r\n        await pm.player.setAudioSource(annSource);\r\n        await pm.player.setVolume(annVol);\r\n        print('Playing announcement audio');\r\n        await pm.player.play();\r\n        print('Announcement play() called, checking if playing...');\r\n        \r\n        // Wait until announcement completes\r\n        await pm.player.playerStateStream.firstWhere((s) => s.processingState == ProcessingState.completed);",
  "        // Use DEDICATED annPlayer - music player keeps playing at reduced volume\r\n        // Create announcement source with headers\r\n        final annHeaders = <String, String>{};\r\n        if (token != null && token.isNotEmpty) {\r\n          annHeaders['Authorization'] = 'Bearer $token';\r\n        }\r\n        final annSource = AudioSource.uri(\r\n          Uri.parse(announcementUrl),\r\n          headers: annHeaders.isNotEmpty ? annHeaders : null,\r\n        );\r\n        \r\n        // Play announcement using dedicated player (music continues at reduced volume)\r\n        _isPlayingAnnouncement = true;\r\n        if (mounted) setState(() {});\r\n        await pm.annPlayer.setVolume(annVol);\r\n        await pm.annPlayer.setAudioSource(annSource);\r\n        print('Playing announcement via dedicated annPlayer');\r\n        await pm.annPlayer.play();\r\n        \r\n        // Wait until announcement completes\r\n        await pm.annPlayer.playerStateStream.firstWhere((s) => s.processingState == ProcessingState.completed || (!s.playing && s.processingState == ProcessingState.idle)).timeout(const Duration(seconds: 120), onTimeout: () => pm.annPlayer.playerState);"
);

// FIX 5: Remove the music restoration code since we're not pausing music anymore
rep('Remove music restoration since we use annPlayer',
  "        // Restore music playback if it was playing before\r\n        if (_wasPlayingBeforeAnnouncement) {\r\n          // Reload the original playlist\r\n          final items = _allMusic.where((m) => _selectedMusicIds.contains((m['id'] ?? m['file_id'] ?? m['music_file_id'] ?? '').toString()))\r\n            .map((m) {\r\n              String url = (m['stream_url'] ?? m['file_url'] ?? m['url'] ?? '').toString();\r\n              // Don't add token to URL - playUrls() will handle auth via headers\r\n              return {\r\n                'url': url,\r\n                'title': (m['name'] ?? m['title'] ?? 'Unknown').toString(),\r\n              };\r\n            }).where((e) => (e['url'] ?? '').isNotEmpty).toList();\r\n          \r\n          if (items.isNotEmpty) {\r\n            await pm.playUrls(items);\r\n            await pm.setLoopMode(LoopMode.all);\r\n            // Seek to previous position if available\r\n            if (_previousIndex != null && _previousIndex! > 0) {\r\n              await pm.player.seek(Duration.zero, index: _previousIndex);\r\n            }\r\n          }\r\n        }",
  "        // Music continues playing at reduced volume - no need to restore"
);

// FIX 6: Fix the error handler to also use annPlayer
rep('Fix error handler to use annPlayer',
  "        // Resume music if announcement fails\r\n        if (_wasPlayingBeforeAnnouncement) {\r\n          try {\r\n            final items = _allMusic.where((m) => _selectedMusicIds.contains((m['id'] ?? m['file_id'] ?? m['music_file_id'] ?? '').toString()))\r\n              .map((m) {\r\n                String url = (m['stream_url'] ?? m['file_url'] ?? m['url'] ?? '').toString();\r\n                // Don't add token to URL - playUrls() will handle auth via headers\r\n                return {\r\n                  'url': url,\r\n                  'title': (m['name'] ?? m['title'] ?? 'Unknown').toString(),\r\n                };\r\n              }).where((e) => (e['url'] ?? '').isNotEmpty).toList();\r\n            if (items.isNotEmpty) {\r\n              final pm = context.read<PlayerModel>();\r\n              await pm.playUrls(items);\r\n              await pm.setLoopMode(LoopMode.all);\r\n            }\r\n          } catch (_) {}\r\n        }",
  "        // Stop announcement player on error\r\n        try {\r\n          await pm.annPlayer.stop();\r\n          _isPlayingAnnouncement = false;\r\n          if (mounted) setState(() {});\r\n        } catch (_) {}"
);

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl, 'Parens:', op-cp);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

