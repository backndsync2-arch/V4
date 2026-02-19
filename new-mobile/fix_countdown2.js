const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');
const lines = c.split('\n');

// Find the line where _isPlayingAnnouncement = false is set after announcement finishes
// It should be after "Restore music error" or similar
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('_isPlayingAnnouncement = false') && 
      i > 1200 && i < 1300 &&
      lines[i-1]?.includes('} catch') || lines[i-2]?.includes('Restore music')) {
    // Add the reset right before this line
    lines.splice(i, 0, '        // Reset countdown timer - next announcement will be in _announcementInterval seconds',
                  '        _lastAnnouncementTime = DateTime.now();');
    console.log('Added countdown reset at line', i+1);
    break;
  }
}

// Also check if _lastAnnouncementTime was removed when announcement starts
// We already fixed that in the previous script, but let's verify
const hasResetOnStart = c.includes("// Don't reset _lastAnnouncementTime here - reset it AFTER announcement finishes");
console.log('Has reset prevention on start:', hasResetOnStart);

c = lines.join('\n');
const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
console.log('Braces:', o-cl);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

