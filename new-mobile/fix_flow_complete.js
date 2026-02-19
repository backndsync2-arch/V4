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

// FIX 1: Fix _startAnnouncementLoop - remove the immediate 1-second timer, only use periodic
rep('Fix _startAnnouncementLoop to remove immediate timer and add proper logging',
  "  void _startAnnouncementLoop() {\r\n    _announcementTimer?.cancel();\r\n    _countdownTimer?.cancel();\r\n    _nextAnnouncementIndex = 0;\r\n    // Set _lastAnnouncementTime to NOW so countdown starts from full interval\r\n    _lastAnnouncementTime = DateTime.now();\r\n    _announcementTimer = Timer.periodic(Duration(seconds: _announcementInterval.toInt()), (timer) {\r\n      _playNextAnnouncement();\r\n    });\r\n    // Start countdown timer to update UI every second\r\n    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {\r\n      if (mounted) setState(() {});\r\n    });\r\n  }",
  "  void _startAnnouncementLoop() {\r\n    _announcementTimer?.cancel();\r\n    _countdownTimer?.cancel();\r\n    _nextAnnouncementIndex = 0;\r\n    // Set _lastAnnouncementTime to NOW so countdown starts from full interval\r\n    _lastAnnouncementTime = DateTime.now();\r\n    print('Starting announcement loop - interval: \${_announcementInterval.toInt()}s');\r\n    // Start periodic timer for announcements\r\n    _announcementTimer = Timer.periodic(Duration(seconds: _announcementInterval.toInt()), (timer) {\r\n      if (mounted) {\r\n        _playNextAnnouncement();\r\n      }\r\n    });\r\n    // Start countdown timer to update UI every second\r\n    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {\r\n      if (mounted) setState(() {});\r\n    });\r\n  }"
);

// FIX 2: Fix pause to cancel countdown and stop announcements
rep('Fix pause to cancel countdown timer',
  "        await pm.pause();\r\n        _announcementTimer?.cancel();\r\n        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Playback paused (local)')));",
  "        // Stop any playing announcement first\r\n        if (_isPlayingAnnouncement) {\r\n          try {\r\n            await pm.annPlayer.stop();\r\n            _isPlayingAnnouncement = false;\r\n          } catch (_) {}\r\n        }\r\n        await pm.pause();\r\n        _announcementTimer?.cancel();\r\n        _countdownTimer?.cancel();\r\n        _lastAnnouncementTime = null;\r\n        if (mounted) setState(() => _playbackState = {'is_playing': false});\r\n        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Playback paused'), duration: Duration(seconds: 1)));"
);

// FIX 3: Fix _playNextAnnouncement to check if music is playing
rep('Add guard to _playNextAnnouncement to check if music is playing',
  "  Future<void> _playNextAnnouncement() async {\r\n    // Guard: don't start if already playing an announcement or playback stopped\r\n    if (_isPlayingAnnouncement) { print('Ann: already playing, skipping'); return; }\r\n    final pm = context.read<PlayerModel>();\r\n    // Don't interrupt if music is not loaded at all",
  "  Future<void> _playNextAnnouncement() async {\r\n    // Guard: don't start if already playing an announcement\r\n    if (_isPlayingAnnouncement) { \r\n      print('Announcement already playing, skipping'); \r\n      return; \r\n    }\r\n    \r\n    final pm = context.read<PlayerModel>();\r\n    // Don't play announcements if music is not playing\r\n    if (!pm.player.playing && _playbackState?['is_playing'] != true) {\r\n      print('Skipping announcement - music is not playing');\r\n      return;\r\n    }\r\n    \r\n    // Don't interrupt if music is not loaded at all"
);

// FIX 4: Remove music restoration code since music should keep playing with annPlayer
rep('Remove music restoration since annPlayer keeps music playing',
  "        // Stop announcement player and restore music\r\n        await pm.annPlayer.stop();\r\n        // Restore music: if not playing, try to resume\r\n        if (!pm.player.playing && _wasPlayingBeforeAnnouncement) {",
  "        // Stop announcement player (music continues playing at normal volume)\r\n        await pm.annPlayer.stop();\r\n        _isPlayingAnnouncement = false;\r\n        // Reset countdown timer - next announcement will be in _announcementInterval seconds\r\n        _lastAnnouncementTime = DateTime.now();\r\n        if (mounted) setState(() {});\r\n        \r\n        // Music should still be playing - no need to restore\r\n        // Only restore if music somehow stopped (shouldn't happen with annPlayer)\r\n        if (!pm.player.playing) {"
);

// FIX 5: Fix error handler
rep('Fix error handler to reset state',
  "      } catch (e) {\r\n        print('Error playing announcement: $e');\r\n        // Resume music on error",
  "      } catch (e) {\n        print('Error playing announcement: $e');\n        // Stop announcement player on error\n        try {\n          await pm.annPlayer.stop();\n          _isPlayingAnnouncement = false;\n          if (mounted) setState(() {});\n        } catch (_) {}\n        // Music should still be playing - no need to restore\n        // Only restore if music somehow stopped (shouldn't happen with annPlayer)\n        if (!pm.player.playing) {"
);

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl, 'Parens:', op-cp);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

