const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');

// Fix 1: player not in scope at line 1320 - use context.read
c = c.replace(
  "    final isPlaying = player.player.playing || (_playbackState != null && _playbackState!['is_playing'] == true);\r",
  "    final isPlaying = context.watch<PlayerModel>().player.playing || (_playbackState != null && _playbackState!['is_playing'] == true);\r"
);

// Fix 2: onTap can't be null for required VoidCallback - use empty callback
c = c.replace(
  "onTap: fid.isEmpty ? null : () => music.enterFolder(fid, folder['name'] ?? 'Folder'),",
  "onTap: () { if (fid.isNotEmpty) music.enterFolder(fid, folder['name'] ?? 'Folder'); },"
);
c = c.replace(
  "onTap: fid.isEmpty ? null : () => model.enterFolder(fid, folder['name'] ?? 'Folder'),",
  "onTap: () { if (fid.isNotEmpty) model.enterFolder(fid, folder['name'] ?? 'Folder'); },"
);

fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('Braces:', o-cl, 'Parens:', op-cp);
console.log('Done');

