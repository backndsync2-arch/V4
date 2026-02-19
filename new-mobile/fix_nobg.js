const fs = require('fs');

// 1. Fix pubspec.yaml - remove just_audio_background, keep audio_session
let p = fs.readFileSync('pubspec.yaml', 'utf8');
p = p.replace('  just_audio_background: ^0.0.1-beta.10\r\n', '');
p = p.replace('  just_audio_background: ^0.0.1-beta.10\n', '');
fs.writeFileSync('pubspec.yaml.tmp', p, 'utf8');
console.log('pubspec: has jab?', p.includes('just_audio_background'), '| has audio_session?', p.includes('audio_session'));

// 2. Fix main.dart - remove JustAudioBackground refs, keep audio_session
let c = fs.readFileSync('lib/main.dart', 'utf8');

// Remove just_audio_background import
c = c.replace("import 'package:just_audio_background/just_audio_background.dart';\n", '');
c = c.replace("import 'package:just_audio_background/just_audio_background.dart';\r\n", '');

// Remove JustAudioBackground.init() block
c = c.replace(
  "  // Initialize background audio for lock screen controls\r\n  try {\r\n    await JustAudioBackground.init(\r\n      androidNotificationChannelId: 'com.sync2gear.channel.audio',\r\n      androidNotificationChannelName: 'Sync2Gear Playback',\r\n      androidNotificationOngoing: true,\r\n      androidStopForegroundOnPause: true,\r\n    );\r\n  } catch (e) {\r\n    print('JustAudioBackground init skipped: $e');\r\n  }\r\n",
  "  // Background audio: just_audio plays in background by default on Android\r\n  // Lock screen controls will be added in a future update\r\n"
);

// Remove MediaItem tag from playUrls (it requires just_audio_background)
c = c.replace(
  "            tag: MediaItem(id: u, title: t.isEmpty ? 'Audio' : t, artUri: Uri.parse('asset:///assets/logo.png')),\r\n",
  ""
);
c = c.replace(
  "      tag: MediaItem(id: url, title: title, artUri: Uri.parse('asset:///assets/logo.png')),\r\n",
  ""
);

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length, cp=(c.match(/\)/g)||[]).length;
console.log('main.dart: Braces:', o-cl, 'Parens:', op-cp);
console.log('has JustAudioBackground:', c.includes('JustAudioBackground'));
console.log('has just_audio_background import:', c.includes("just_audio_background/just_audio_background"));
console.log('has audio_session:', c.includes('audio_session'));
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

