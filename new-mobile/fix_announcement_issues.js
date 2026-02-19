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

// FIX 1: Ensure announcement loop starts even if player state check fails
rep('Ensure announcement loop starts reliably',
  "          if (mounted) setState(() => _playbackState = {'is_playing': isActuallyPlaying});\n          if (isActuallyPlaying) {\n            _startAnnouncementLoop();\n          }",
  "          if (mounted) setState(() => _playbackState = {'is_playing': isActuallyPlaying});\n          // Always start announcement loop when playback starts\n          // The loop will check if music is actually playing before playing announcements\n          print('Starting announcement loop after playback start');\n          _startAnnouncementLoop();\n          print('Announcement loop start called');"
);

// FIX 2: Make _playNextAnnouncement more robust - don't skip if music check fails
rep('Make announcement play check more robust',
  "    final pm = context.read<PlayerModel>();\n    // Don't play announcements if music is not playing\n    if (!pm.player.playing && _playbackState?['is_playing'] != true) {\n      print('Skipping announcement - music is not playing');\n      return;\n    }",
  "    final pm = context.read<PlayerModel>();\n    // Check if music is playing - but be more lenient\n    final musicPlaying = pm.player.playing || _playbackState?['is_playing'] == true;\n    if (!musicPlaying) {\n      print('Skipping announcement - music is not playing (player.playing=${pm.player.playing}, state=${_playbackState?['is_playing']})');\n      return;\n    }\n    print('Music is playing, proceeding with announcement');"
);

// FIX 3: Add more logging to countdown calculation
rep('Add logging to countdown calculation',
  "              // Calculate countdown\n              int secsLeft = annInterval.toInt();\n              if (lastAnnTime != null && isActuallyPlaying) {\n                final elapsed = DateTime.now().difference(lastAnnTime).inSeconds;\n                secsLeft = (annInterval.toInt() - elapsed).clamp(0, annInterval.toInt());\n              }",
  "              // Calculate countdown\n              int secsLeft = annInterval.toInt();\n              if (lastAnnTime != null && isActuallyPlaying) {\n                final elapsed = DateTime.now().difference(lastAnnTime).inSeconds;\n                secsLeft = (annInterval.toInt() - elapsed).clamp(0, annInterval.toInt());\n                // Debug: log countdown every 10 seconds\n                if (elapsed % 10 == 0) {\n                  print('Countdown: $secsLeft seconds remaining (elapsed: $elapsed, interval: ${annInterval.toInt()})');\n                }\n              } else {\n                if (lastAnnTime == null) print('Countdown: lastAnnTime is null');\n                if (!isActuallyPlaying) print('Countdown: music not playing');\n              }"
);

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

