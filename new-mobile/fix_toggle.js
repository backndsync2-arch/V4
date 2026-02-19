const fs = require('fs');
let c = fs.readFileSync('lib/main.dart.tmp', 'utf8');
const lines = c.split('\n');

// Find togglePlayback function boundaries
const start = lines.findIndex(l => l.includes('Future<void> _togglePlayback()'));
let depth = 0, end = -1;
for (let i = start; i < start + 100; i++) {
  for (const ch of (lines[i] || '')) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end > -1) break;
}
console.log('togglePlayback:', start+1, 'to', end+1);

// Replace the entire function
const newFn = [
  "  Future<void> _togglePlayback() async {\r",
  "    if (_isToggling) return;\r",
  "    _isToggling = true;\r",
  "    try {\r",
  "      final pm = context.read<PlayerModel>();\r",
  "      final actuallyPlaying = pm.player.playing;\r",
  "      final hasPlaylist = pm.player.sequence != null && (pm.player.sequence?.isNotEmpty ?? false);\r",
  "\r",
  "      if (actuallyPlaying) {\r",
  "        // ── PAUSE ──\r",
  "        await pm.pause();\r",
  "        _announcementTimer?.cancel();\r",
  "        _countdownTimer?.cancel();\r",
  "        if (mounted) setState(() => _playbackState = {'is_playing': false});\r",
  "        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Paused'), duration: Duration(seconds: 1)));\r",
  "      } else if (hasPlaylist && _currentPlaylist.isNotEmpty) {\r",
  "        // ── RESUME ──\r",
  "        await pm.player.play();\r",
  "        await pm.setLoopMode(LoopMode.all);\r",
  "        _playbackStartTime ??= DateTime.now();\r",
  "        _startAnnouncementLoop();\r",
  "        if (mounted) setState(() => _playbackState = {'is_playing': true});\r",
  "        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Resumed'), duration: Duration(seconds: 1)));\r",
  "      } else {\r",
  "        // ── FRESH START ──\r",
  "        if (_selectedMusicIds.isEmpty) {\r",
  "          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select at least one music track')));\r",
  "          return;\r",
  "        }\r",
  "        final items = _allMusic.where((m) => _selectedMusicIds.contains((m['id'] ?? m['file_id'] ?? m['music_file_id'] ?? '').toString()))\r",
  "          .map((m) => {'url': (m['stream_url'] ?? m['file_url'] ?? m['url'] ?? '').toString(), 'title': (m['name'] ?? m['title'] ?? 'Unknown').toString()})\r",
  "          .where((e) => (e['url'] ?? '').isNotEmpty).toList();\r",
  "        if (items.isEmpty) {\r",
  "          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Selected tracks have no URLs')));\r",
  "          return;\r",
  "        }\r",
  "        try {\r",
  "          _currentPlaylist = List<Map<String,String>>.from(items);\r",
  "          await pm.playUrls(items);\r",
  "          await pm.setLoopMode(LoopMode.all);\r",
  "          _playbackStartTime = DateTime.now();\r",
  "          _startAnnouncementLoop();\r",
  "          if (mounted) setState(() => _playbackState = {'is_playing': true});\r",
  "          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Playback started \u2713'), duration: Duration(seconds: 2)));\r",
  "        } catch (e) {\r",
  "          _currentPlaylist = [];\r",
  "          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: \$e')));\r",
  "        }\r",
  "      }\r",
  "    } finally {\r",
  "      _isToggling = false;\r",
  "    }\r",
  "  }",
];

lines.splice(start, end - start + 1, ...newFn);
c = lines.join('\n');

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('Braces:', o-cl, 'Parens:', op-cp, 'Lines:', lines.length);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
console.log('Done');

