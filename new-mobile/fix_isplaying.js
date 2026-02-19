const fs = require('fs');
let c = fs.readFileSync('lib/main.dart.tmp', 'utf8');
const lines = c.split('\n');

// Fix isPlaying at line 1320 (0-based 1319)
if (lines[1319] && lines[1319].includes('final isPlaying = _playbackState')) {
  lines[1319] = "    final isPlaying = player.player.playing || (_playbackState != null && _playbackState!['is_playing'] == true);\r";
  console.log('Fixed isPlaying');
} else {
  console.log('Line 1320:', lines[1319]);
}

// Check for duplicate 'final player = context.watch<PlayerModel>()' 
let count = 0;
lines.forEach((l, i) => {
  if (l.includes('final player = context.watch<PlayerModel>')) count++;
});
console.log('player defs:', count);

c = lines.join('\n');
const o = (c.match(/{/g)||[]).length;
const cl = (c.match(/}/g)||[]).length;
const op = (c.match(/\(/g)||[]).length;
const cp = (c.match(/\)/g)||[]).length;
console.log('Braces:', o-cl, 'Parens:', op-cp);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
console.log('Done');

