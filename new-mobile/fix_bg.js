const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');
let n = 0;

function rep(desc, a, b) {
  if (c.includes(a)) { c = c.replace(a, b); n++; console.log('✓ ' + desc); }
  else console.log('✗ SKIP: ' + desc);
}

// FIX 1: Add imports for just_audio_background and audio_session
rep('Add bg imports',
  "import 'package:just_audio/just_audio.dart';",
  "import 'package:just_audio/just_audio.dart';\nimport 'package:just_audio_background/just_audio_background.dart';\nimport 'package:audio_session/audio_session.dart';"
);

// FIX 2: Add JustAudioBackground.init() in main()
rep('Add JustAudioBackground.init()',
  "  WidgetsFlutterBinding.ensureInitialized();\r\n  runApp(const App());",
  "  WidgetsFlutterBinding.ensureInitialized();\r\n  // Initialize background audio for lock screen controls\r\n  try {\r\n    await JustAudioBackground.init(\r\n      androidNotificationChannelId: 'com.sync2gear.channel.audio',\r\n      androidNotificationChannelName: 'Sync2Gear Playback',\r\n      androidNotificationOngoing: true,\r\n      androidStopForegroundOnPause: true,\r\n    );\r\n  } catch (e) {\r\n    print('JustAudioBackground init skipped: $e');\r\n  }\r\n  runApp(const App());"
);

// FIX 3: Add AudioSession configuration in PlayerModel._init()
rep('Add AudioSession config in _init',
  "  Future<void> _init() async {\r\n    try {\r\n      await player.setVolume(volume);",
  "  Future<void> _init() async {\r\n    try {\r\n      // Configure audio session for media playback\r\n      final session = await AudioSession.instance;\r\n      await session.configure(const AudioSessionConfiguration.music());\r\n      await player.setVolume(volume);"
);

// FIX 4: Add MediaItem tags to the single-song AudioSource.uri in playUrl
rep('Add MediaItem tag to playUrl AudioSource',
  "    final source = AudioSource.uri(\r\n      Uri.parse(url),\r\n      headers: useHeaders ? headers : null,\r\n    );",
  "    final source = AudioSource.uri(\r\n      Uri.parse(url),\r\n      headers: useHeaders ? headers : null,\r\n      tag: MediaItem(id: url, title: title, artUri: Uri.parse('asset:///assets/logo.png')),\r\n    );"
);

// FIX 5: Add MediaItem tags to playlist AudioSource in playUrls
rep('Add MediaItem tag to playUrls AudioSource',
  "          return AudioSource.uri(\r\n            uri,\r\n            headers: useHeaders ? headers : null,\r\n          );",
  "          return AudioSource.uri(\r\n            uri,\r\n            headers: useHeaders ? headers : null,\r\n            tag: MediaItem(id: u, title: t.isEmpty ? 'Audio' : t, artUri: Uri.parse('asset:///assets/logo.png')),\r\n          );"
);

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl, 'Parens:', op-cp);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

