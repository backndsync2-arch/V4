const fs = require('fs');
const packageJson = require('./package.json');
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

// Get version from pubspec.yaml
let pubspec = fs.readFileSync('pubspec.yaml', 'utf8');
const versionMatch = pubspec.match(/version:\s*([\d.]+)\+(\d+)/);
const version = versionMatch ? `${versionMatch[1]} (Build ${versionMatch[2]})` : '1.1.0 (Build 2)';
console.log('Version:', version);

// FIX 1: Update version display in login (already done via search_replace)
console.log('Version display added to login screen');

// FIX 2: Add package_info_plus for version reading (will add to pubspec separately)
// FIX 3: Fix overflow - find Row widgets that might overflow and wrap with Flexible/Expanded
// Look for Row widgets in dashboard that don't have Flexible/Expanded children

// FIX 4: Add audio_session back and configure for lock screen
// This requires pubspec.yaml changes which we'll do separately

console.log('\nDone:', n, 'fixes');
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

