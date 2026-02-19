const fs = require('fs');
let c = fs.readFileSync('lib/main.dart.tmp', 'utf8');
const lines = c.split('\n');

// Find both player definitions and remove duplicate
let firstFound = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('final player = context.watch<PlayerModel>')) {
    if (firstFound) {
      // This is the second definition - remove it
      lines.splice(i, 1);
      console.log('Removed duplicate player def at line', i+1);
      break;
    } else {
      firstFound = true;
      console.log('First player def at line', i+1);
    }
  }
}

c = lines.join('\n');
const o=(c.match(/{/g)||[]).length;
const cl=(c.match(/}/g)||[]).length;
console.log('Braces:', o-cl);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
console.log('Done. Lines:', lines.length);

