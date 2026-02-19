const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');

// Find and replace the pattern where _isPlayingAnnouncement is set to false after announcement finishes
// Pattern: "} catch (e) { print('Restore music error: $e'); }" followed by "_isPlayingAnnouncement = false;"
const pattern1 = /(\s+} catch \(e\) \{ print\('Restore music error: \$e'\); \}\s+)(\s+_isPlayingAnnouncement = false;)/;
const replacement1 = '$1        // Reset countdown timer - next announcement will be in _announcementInterval seconds\n        _lastAnnouncementTime = DateTime.now();\n$2';

if (pattern1.test(c)) {
  c = c.replace(pattern1, replacement1);
  console.log('✓ Added countdown reset after announcement finishes');
} else {
  // Try a simpler pattern
  const pattern2 = /(\s+_isPlayingAnnouncement = false;\s+if \(mounted\) \{)/;
  const replacement2 = '        // Reset countdown timer - next announcement will be in _announcementInterval seconds\n        _lastAnnouncementTime = DateTime.now();\n$1';
  if (pattern2.test(c)) {
    c = c.replace(pattern2, replacement2);
    console.log('✓ Added countdown reset (alternative pattern)');
  } else {
    console.log('✗ Pattern not found - trying line-by-line search');
    const lines = c.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('_isPlayingAnnouncement = false') && 
          i > 1250 && i < 1300 &&
          (lines[i-1]?.includes('catch') || lines[i-2]?.includes('Restore music'))) {
        lines.splice(i, 0, 
          '        // Reset countdown timer - next announcement will be in _announcementInterval seconds',
          '        _lastAnnouncementTime = DateTime.now();');
        c = lines.join('\n');
        console.log('✓ Added countdown reset at line', i+1);
        break;
      }
    }
  }
}

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
console.log('Braces:', o-cl);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
console.log('Done');

