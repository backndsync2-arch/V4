const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');

// Add MediaItem import if not present
if (!c.includes('import \'package:just_audio_background/just_audio_background.dart\';')) {
  c = c.replace(
    "import 'package:audio_session/audio_session.dart';\nimport 'api.dart';",
    "import 'package:audio_session/audio_session.dart';\nimport 'package:just_audio_background/just_audio_background.dart';\nimport 'api.dart';"
  );
  console.log('✓ Added just_audio_background import');
}

// Add MediaItem to playUrl
c = c.replace(
  /final source = AudioSource\.uri\(\s*Uri\.parse\(url\),\s*headers: useHeaders \? headers : null,\s*\);/,
  "final source = AudioSource.uri(\n      Uri.parse(url),\n      headers: useHeaders ? headers : null,\n      tag: MediaItem(\n        id: url,\n        title: title,\n        artUri: Uri.parse('asset:///assets/logo.png'),\n      ),\n    );"
);

// Add MediaItem to playUrls (in the map function)
c = c.replace(
  /return AudioSource\.uri\(\s*uri,\s*headers: useHeaders \? headers : null,\s*\);/,
  "return AudioSource.uri(\n            uri,\n            headers: useHeaders ? headers : null,\n            tag: MediaItem(\n              id: u,\n              title: t.isEmpty ? 'Audio' : t,\n              artUri: Uri.parse('asset:///assets/logo.png'),\n            ),\n          );"
);

fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
console.log('✓ Added MediaItem tags for lock screen metadata');

