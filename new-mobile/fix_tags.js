const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');
const lines = c.split('\n');

// Line 382-385: return AudioSource.uri without tag -> add MediaItem tag
if (lines[381] && lines[381].includes('return AudioSource.uri(')) {
  lines[383] = "            headers: useHeaders ? headers : null,\r";
  lines.splice(384, 0, "            tag: MediaItem(id: u, title: t.isEmpty ? 'Audio' : t, artUri: Uri.parse('asset:///assets/logo.png')),\r");
  console.log('Added MediaItem tag to playUrls AudioSource');
}

// Find playUrl single song source (around line 280)
for (let i = 270; i < 300; i++) {
  if (lines[i] && lines[i].includes('final source = AudioSource.uri(')) {
    // lines[i+1] = uri, lines[i+2] = headers line
    for (let j = i; j < i+6; j++) {
      if (lines[j] && lines[j].includes('headers: useHeaders') && !lines[j+1]?.includes('MediaItem')) {
        lines[j] = lines[j].replace('null,', 'null,').replace(/null\r?$/, 'null,\r');
        lines.splice(j+1, 0, "      tag: MediaItem(id: url, title: title, artUri: Uri.parse('asset:///assets/logo.png')),\r");
        console.log('Added MediaItem tag to playUrl AudioSource at line', j+1);
        break;
      }
    }
    break;
  }
}

c = lines.join('\n');
const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('Braces:', o-cl, 'Parens:', op-cp);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
console.log('Done. Lines:', lines.length);

