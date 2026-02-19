const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');
let n = 0;

// Remove most SnackBar messages (keep only critical errors)
const snackBarPatterns = [
  /ScaffoldMessenger\.of\(context\)\.showSnackBar\([^)]*Text\(['"]Local playback started['"][^)]*\);/g,
  /ScaffoldMessenger\.of\(context\)\.showSnackBar\([^)]*Text\(['"]Playback started but not playing[^)]*\);/g,
  /ScaffoldMessenger\.of\(context\)\.showSnackBar\([^)]*Text\(['"]Playback paused \(local\)['"][^)]*\);/g,
  /ScaffoldMessenger\.of\(context\)\.showSnackBar\([^)]*Text\(['"]Playback paused['"][^)]*\);/g,
  /ScaffoldMessenger\.of\(context\)\.showSnackBar\([^)]*Text\(['"]Resumed['"][^)]*\);/g,
  /ScaffoldMessenger\.of\(context\)\.showSnackBar\([^)]*Text\(['"]Playback started ✓['"][^)]*\);/g,
  /ScaffoldMessenger\.of\(context\)\.showSnackBar\([^)]*Text\(['"]Refreshed music list['"][^)]*\);/g,
  /ScaffoldMessenger\.of\(context\)\.showSnackBar\([^)]*Text\(['"]Playing Announcement:[^)]*\);/g,
];

let removed = 0;
snackBarPatterns.forEach(pattern => {
  const matches = c.match(pattern);
  if (matches) {
    removed += matches.length;
    c = c.replace(pattern, '');
  }
});

console.log(`Removed ${removed} unnecessary toast messages`);

fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

