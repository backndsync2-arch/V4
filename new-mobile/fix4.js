const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');
const lines = c.split('\n');

// Fix lines 997-1009 (0-based 996-1008) to always start announcement loop
// Line 997: "          // Wait a bit and check if actually playing\r"
// through line 1009: "          }\r"
// Replace with: always start loop, don't gate on player.playing

if (lines[996].includes('Wait a bit and check')) {
  const newLines = [
    "          // Always start announcement loop - player may still be buffering\r",
    "          _playbackStartTime = DateTime.now();\r",
    "          _startAnnouncementLoop();\r",
    "          if (mounted) setState(() => _playbackState = {'is_playing': true});\r",
    "          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Playback started'), duration: Duration(seconds: 2)));\r",
    "          // Log player state after delay\r",
    "          await Future.delayed(const Duration(milliseconds: 1500));\r",
    "          print('Player state check: \${pm.player.playing}, \${pm.player.playerState.processingState}');\r",
  ];
  lines.splice(996, 13, ...newLines); // remove 13 lines (996-1008), insert new
  console.log('Fixed announcement loop start');
} else {
  console.log('Pattern not found at 997:', lines[996]);
}

c = lines.join('\n');
const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('Braces:', o-cl, 'Parens:', op-cp);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
console.log('Done. Lines:', lines.length);

