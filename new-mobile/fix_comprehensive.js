const fs = require('fs');
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

// FIX 1: Add package_info_plus import
rep('Add package_info_plus import',
  "import 'package:http/http.dart' as http;\nimport 'api.dart';",
  "import 'package:http/http.dart' as http;\nimport 'package:package_info_plus/package_info_plus.dart';\nimport 'package:audio_session/audio_session.dart';\nimport 'api.dart';"
);

// FIX 2: Update login to use package_info for version
rep('Update login version to use package_info',
  "                Text(\n                  'Version 1.1.0 (Build 2)',\n                  textAlign: TextAlign.center,",
  "                FutureBuilder<PackageInfo>(\n                  future: PackageInfo.fromPlatform(),\n                  builder: (context, snapshot) {\n                    if (!snapshot.hasData) return const SizedBox.shrink();\n                    final info = snapshot.data!;\n                    return Text(\n                      'Version \${info.version} (Build \${info.buildNumber})',\n                      textAlign: TextAlign.center,"
);

rep('Close FutureBuilder',
  "                    fontSize: 12,\n                  ),\n                ),",
  "                      fontSize: 12,\n                    ),\n                  );\n                  },\n                ),"
);

// FIX 3: Add audio_session configuration in PlayerModel._init
rep('Add audio_session config',
  "  Future<void> _init() async {\n    try {\n      await player.setVolume(volume);",
  "  Future<void> _init() async {\n    try {\n      // Configure audio session for media playback and lock screen controls\n      final session = await AudioSession.instance;\n      await session.configure(const AudioSessionConfiguration.music());\n      await player.setVolume(volume);"
);

// FIX 4: Fix overflow - find Row with fixed width and make it Flexible
// This will be done manually for specific cases

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

