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

// FIX 1: In _startAnnouncementLoop, set _lastAnnouncementTime to NOW when loop starts
// This ensures countdown starts from the full interval
rep('Fix _startAnnouncementLoop to set _lastAnnouncementTime correctly',
  "  void _startAnnouncementLoop() {\r\n    _announcementTimer?.cancel();\r\n    _countdownTimer?.cancel();\r\n    _nextAnnouncementIndex = 0;\r\n    _lastAnnouncementTime = DateTime.now();\r\n    _announcementTimer = Timer.periodic(Duration(seconds: _announcementInterval.toInt()), (timer) {\r\n      _playNextAnnouncement();\r\n    });\r\n    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {\r\n      if (mounted) setState(() {});\r\n    });\r\n  }",
  "  void _startAnnouncementLoop() {\r\n    _announcementTimer?.cancel();\r\n    _countdownTimer?.cancel();\r\n    _nextAnnouncementIndex = 0;\r\n    // Set _lastAnnouncementTime to NOW so countdown starts from full interval\r\n    _lastAnnouncementTime = DateTime.now();\r\n    _announcementTimer = Timer.periodic(Duration(seconds: _announcementInterval.toInt()), (timer) {\r\n      _playNextAnnouncement();\r\n    });\r\n    // Start countdown timer to update UI every second\r\n    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {\r\n      if (mounted) setState(() {});\r\n    });\r\n  }"
);

// FIX 2: Reset _lastAnnouncementTime AFTER announcement finishes, not when it starts
// Find where _lastAnnouncementTime is set when announcement starts playing
rep('Move _lastAnnouncementTime reset to AFTER announcement finishes',
  "      print('Playing announcement: $title, URL: $announcementUrl');\r\n      _lastAnnouncementTime = DateTime.now();\r\n      _isPlayingAnnouncement = true;\r\n      if (mounted) setState(() {});",
  "      print('Playing announcement: $title, URL: $announcementUrl');\r\n      // Don't reset _lastAnnouncementTime here - reset it AFTER announcement finishes\r\n      _isPlayingAnnouncement = true;\r\n      if (mounted) setState(() {});"
);

// FIX 3: Reset _lastAnnouncementTime after announcement completes (in the local announcement path)
// Find the place where announcement finishes and restore music
rep('Reset _lastAnnouncementTime after announcement finishes (local path)',
  "        // Restore music playback if it was playing before\r\n        if (_wasPlayingBeforeAnnouncement) {",
  "        // Reset countdown timer - next announcement will be in _announcementInterval seconds\r\n        _lastAnnouncementTime = DateTime.now();\r\n        \r\n        // Restore music playback if it was playing before\r\n        if (_wasPlayingBeforeAnnouncement) {"
);

// FIX 4: Also reset after announcement finishes in the device path (if it exists)
// This might be in a different location, let's check if there's another path

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl, 'Parens:', op-cp);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

