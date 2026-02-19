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

// FIX 1: Improve _startAnnouncementLoop with better logging
rep('Improve _startAnnouncementLoop with logging',
  "  void _startAnnouncementLoop() {\n    _announcementTimer?.cancel();\n    _countdownTimer?.cancel();\n    _nextAnnouncementIndex = 0;\n    // Set _lastAnnouncementTime to NOW so countdown starts from full interval\n    _lastAnnouncementTime = DateTime.now();\n    print('Starting announcement loop - interval: ${_announcementInterval.toInt()}s');\n    // Start periodic timer for announcements\n    _announcementTimer = Timer.periodic(Duration(seconds: _announcementInterval.toInt()), (timer) {\n      if (mounted) {\n        _playNextAnnouncement();\n      }\n    });\n    // Start countdown timer to update UI every second\n    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {\n      if (mounted) setState(() {});\n    });\n  }",
  "  void _startAnnouncementLoop() {\n    _announcementTimer?.cancel();\n    _countdownTimer?.cancel();\n    _nextAnnouncementIndex = 0;\n    // Set _lastAnnouncementTime to NOW so countdown starts from full interval\n    _lastAnnouncementTime = DateTime.now();\n    final interval = _announcementInterval.toInt();\n    print('=== Starting announcement loop ===');\n    print('Interval: ${interval}s');\n    print('Total announcements: ${_announcements.length}');\n    print('Selected folder: $_selectedAnnouncementFolderId');\n    \n    // Start periodic timer for announcements\n    _announcementTimer = Timer.periodic(Duration(seconds: interval), (timer) {\n      if (mounted) {\n        print('Announcement timer fired at ${DateTime.now()}');\n        _playNextAnnouncement();\n      } else {\n        timer.cancel();\n      }\n    });\n    // Start countdown timer to update UI every second\n    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {\n      if (mounted) {\n        setState(() {});\n      }\n    });\n    print('Announcement loop started successfully');\n  }"
);

// FIX 2: Improve announcement filtering with enabled check and better logging
rep('Fix announcement filtering with enabled check',
  "    // Filter announcements\n    final candidates = _announcements.where((a) {\n      final folderId = (a['folder'] ?? a['folder_id'] ?? '').toString();\n      if (_selectedAnnouncementFolderId != null) {\n        return folderId == _selectedAnnouncementFolderId;\n      }\n      return true; // All enabled? Assuming 'enabled' field exists or all are enabled\n    }).toList();\n\n    if (candidates.isEmpty) return;",
  "    // Filter announcements by enabled status and folder\n    final candidates = _announcements.where((a) {\n      final enabled = a['enabled'] != false; // respect enabled flag\n      if (!enabled) return false;\n      final folderId = (a['folder'] ?? a['folder_id'] ?? '').toString();\n      if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {\n        return folderId == _selectedAnnouncementFolderId;\n      }\n      return true;\n    }).toList();\n\n    print('Announcement candidates: ${candidates.length} out of ${_announcements.length} total');\n    if (candidates.isEmpty) {\n      print('No announcements available. Selected folder: $_selectedAnnouncementFolderId');\n      return;\n    }"
);

// FIX 3: Add URL resolution for announcements
rep('Add URL resolution for announcements',
  "      // Get authentication token for announcement headers\n      final token = await getAccessToken();\n      String announcementUrl = url;\n      // Don't add token to URL - headers will be used in AudioSource.uri below\n      \n      print('Playing announcement: $title, URL: $announcementUrl');",
  "      // Get authentication token for announcement headers\n      final token = await getAccessToken();\n      String announcementUrl = url;\n      \n      // Resolve redirect if it's an API endpoint\n      final isApiEndpoint = url.contains('/api/v1/') || url.contains('execute-api');\n      final isPresignedS3 = url.contains('X-Amz-') || (url.contains('amazonaws.com') && !url.contains('/api/'));\n      if (isApiEndpoint && !isPresignedS3 && token != null && token.isNotEmpty) {\n        try {\n          print('Resolving announcement URL redirect: $url');\n          final response = await http.head(Uri.parse(url), headers: {'Authorization': 'Bearer $token'}).timeout(const Duration(seconds: 10));\n          if (response.statusCode == 302 || response.statusCode == 301) {\n            final location = response.headers['location'];\n            if (location != null && location.isNotEmpty) {\n              announcementUrl = location;\n              print('Announcement redirect resolved to: $announcementUrl');\n            }\n          }\n        } catch (e) {\n          print('Error resolving announcement redirect: $e, using original URL');\n        }\n      }\n      \n      print('Playing announcement: $title, URL: $announcementUrl');"
);

// FIX 4: Add verification that annPlayer is actually playing
rep('Add annPlayer play verification',
  "        await pm.annPlayer.setVolume(annVol);\n        await pm.annPlayer.setAudioSource(annSource);\n        print('Playing announcement via dedicated annPlayer');\n        await pm.annPlayer.play();\n        \n        // Wait until announcement completes",
  "        await pm.annPlayer.setVolume(annVol);\n        await pm.annPlayer.setAudioSource(annSource);\n        print('Playing announcement via dedicated annPlayer: $title');\n        await pm.annPlayer.play();\n        \n        // Verify it's actually playing\n        await Future.delayed(const Duration(milliseconds: 500));\n        final isAnnPlaying = pm.annPlayer.playing;\n        print('Announcement playing status: $isAnnPlaying');\n        if (!isAnnPlaying) {\n          print('ERROR: Announcement failed to start playing');\n          _isPlayingAnnouncement = false;\n          if (mounted) setState(() {});\n          return;\n        }\n        \n        // Wait until announcement completes"
);

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

