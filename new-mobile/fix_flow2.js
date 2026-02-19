const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');
const lines = c.split('\n');
let n = 0;

function rep(desc, a, b) {
  if (c.includes(a)) { c = c.replace(a, b); n++; console.log('✓ ' + desc); }
  else console.log('✗ SKIP: ' + desc);
}

// ═══════════════════════════════════════════════════════════
// FIX 1: _loadContent — filter music/announcements by zone+folder properly
// Also add getMusicFiles with folderId param for folder-based loading
// ═══════════════════════════════════════════════════════════
rep('Fix _loadContent to also load folder-specific music',
  "  Future<void> _loadContent() async {\r\n    try {\r\n      final zm = context.read<ZoneModel>();\r\n      final zoneId = zm.selectedZoneId ?? _selectedZoneId;\r\n      final m = await getMusicFiles(zoneId: zoneId);\r\n      final a = await getAnnouncements(zoneId: zoneId);\r\n      final af = await getFolders(type: 'announcements', zoneId: zoneId);\r\n      final mf = await getFolders(type: 'music', zoneId: zoneId);\r\n      final s = await getSchedules();\r\n      if (mounted) {\r\n        setState(() {\r\n          _allMusic = m;\r\n          _announcements = a;\r\n          _announcementFolders = af;\r\n          _musicFolders = mf;\r\n          _schedules = s;\r\n        });\r\n        // Auto-select music when folder is selected\r\n        _updateMusicSelectionFromFolder();\r\n      }\r\n    } catch (_) {}\r\n  }",
  "  Future<void> _loadContent({bool refreshFolder = false}) async {\r\n    try {\r\n      final zm = context.read<ZoneModel>();\r\n      final zoneId = zm.selectedZoneId ?? _selectedZoneId;\r\n      // Load ALL music (for individual selection) + folder list\r\n      final futures = await Future.wait([\r\n        getMusicFiles(zoneId: zoneId),\r\n        getAnnouncements(zoneId: zoneId),\r\n        getFolders(type: 'announcements', zoneId: zoneId),\r\n        getFolders(type: 'music', zoneId: zoneId),\r\n        getSchedules(),\r\n      ]);\r\n      if (mounted) {\r\n        setState(() {\r\n          _allMusic = futures[0] as List;\r\n          _announcements = futures[1] as List;\r\n          _announcementFolders = futures[2] as List;\r\n          _musicFolders = futures[3] as List;\r\n          _schedules = futures[4] as List;\r\n        });\r\n        _updateMusicSelectionFromFolder();\r\n      }\r\n    } catch (e) { print('Load content error: $e'); }\r\n  }"
);

// ═══════════════════════════════════════════════════════════
// FIX 2: _playNextAnnouncement — load announcements from the selected folder 
//         not from the globally loaded _announcements list
// ═══════════════════════════════════════════════════════════
rep('Fix announcement candidates to use selected folder announcements',
  "    // Filter announcements\r\n    final candidates = _announcements.where((a) {\r\n      final folderId = (a['folder'] ?? a['folder_id'] ?? '').toString();\r\n      if (_selectedAnnouncementFolderId != null) {\r\n        return folderId == _selectedAnnouncementFolderId;\r\n      }\r\n      return true; // All enabled? Assuming 'enabled' field exists or all are enabled\r\n    }).toList();",
  "    // Filter announcements by selected folder\r\n    final candidates = _announcements.where((a) {\r\n      final enabled = a['enabled'] != false; // respect enabled flag\r\n      if (!enabled) return false;\r\n      if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {\r\n        final folderId = (a['folder'] ?? a['folder_id'] ?? a['folderId'] ?? '').toString();\r\n        return folderId == _selectedAnnouncementFolderId;\r\n      }\r\n      return true;\r\n    }).toList();"
);

// ═══════════════════════════════════════════════════════════
// FIX 3: When no candidates found, show debug info (not silent return)
// ═══════════════════════════════════════════════════════════
rep('Fix empty candidates to log debug info',
  "    if (candidates.isEmpty) return;\r\n\r\n    if (_nextAnnouncementIndex >= candidates.length) {\r\n      _nextAnnouncementIndex = 0;\r\n    }",
  "    if (candidates.isEmpty) {\r\n      print('No announcements available. Total: \${_announcements.length}, folder filter: \$_selectedAnnouncementFolderId');\r\n      // Reset index and skip\r\n      _nextAnnouncementIndex = 0;\r\n      return;\r\n    }\r\n\r\n    if (_nextAnnouncementIndex >= candidates.length) {\r\n      _nextAnnouncementIndex = 0; // loop back to first\r\n    }"
);

fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl, 'Parens:', op-cp);

