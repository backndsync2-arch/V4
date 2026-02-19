const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');
let n = 0;

function rep(desc, a, b) {
  if (c.includes(a)) { c = c.replace(a, b); n++; console.log('✓ ' + desc); }
  else console.log('✗ SKIP: ' + desc);
}

// FIX 1: Set loopMode to LoopMode.all for continuous looping
rep('Set loopMode to LoopMode.all',
  "  LoopMode loopMode = LoopMode.off;",
  "  LoopMode loopMode = LoopMode.all;"
);

// FIX 2: Fix announcement filtering to properly check enabled flag and folder
rep('Fix announcement filtering with enabled check',
  "    // Filter announcements\r\n    final candidates = _announcements.where((a) {\r\n      final folderId = (a['folder'] ?? a['folder_id'] ?? '').toString();\r\n      if (_selectedAnnouncementFolderId != null) {\r\n        return folderId == _selectedAnnouncementFolderId;\r\n      }\r\n      return true; // All enabled? Assuming 'enabled' field exists or all are enabled\r\n    }).toList();",
  "    // Filter announcements by selected folder and enabled status\r\n    final candidates = _announcements.where((a) {\r\n      final enabled = a['enabled'] != false; // respect enabled flag\r\n      if (!enabled) return false;\r\n      if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {\r\n        final folderId = (a['folder'] ?? a['folder_id'] ?? a['folderId'] ?? '').toString();\r\n        return folderId == _selectedAnnouncementFolderId;\r\n      }\r\n      return true; // If no folder selected, play all enabled announcements\r\n    }).toList();"
);

// FIX 3: Add debug logging for empty candidates
rep('Add debug logging for empty candidates',
  "    if (candidates.isEmpty) return;",
  "    if (candidates.isEmpty) {\r\n      print('No announcements available. Total: \${_announcements.length}, folder filter: \$_selectedAnnouncementFolderId');\r\n      // Reset index and skip\r\n      _nextAnnouncementIndex = 0;\r\n      return;\r\n    }"
);

// FIX 4: Ensure announcement index loops back properly
rep('Fix announcement index looping',
  "    if (_nextAnnouncementIndex >= candidates.length) {\r\n      _nextAnnouncementIndex = 0;\r\n    }",
  "    if (_nextAnnouncementIndex >= candidates.length) {\r\n      _nextAnnouncementIndex = 0; // loop back to first announcement in folder\r\n    }"
);

// FIX 5: Add listener to restart music playlist when it completes (if not looping)
// This is handled by LoopMode.all, but let's also add a safety check
// Actually, LoopMode.all should handle this, so we don't need this fix

// FIX 6: Ensure _startAnnouncementLoop waits for the first interval before playing
// Currently it plays immediately after 1 second, then every interval
// This is correct behavior - play first announcement after 1 sec, then every interval

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl, 'Parens:', op-cp);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

