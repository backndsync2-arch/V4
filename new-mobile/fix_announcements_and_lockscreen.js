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

// FIX 1: Add more aggressive logging for announcement debugging
rep('Add aggressive announcement debugging',
  "        print('Playing announcement via dedicated annPlayer: $title');\n        await pm.annPlayer.play();\n        \n        // Verify it's actually playing",
  "        print('Playing announcement via dedicated annPlayer: $title');\n        print('Announcement URL: $announcementUrl');\n        print('Announcement volume: $annVol');\n        print('Music volume (reduced): $musicVol');\n        await pm.annPlayer.play();\n        \n        // Verify it's actually playing"
);

// FIX 2: Add error logging for URL issues
rep('Add URL error logging',
  "      // Resolve redirect if it's an API endpoint\n      final isApiEndpoint = url.contains('/api/v1/') || url.contains('execute-api');\n      final isPresignedS3 = url.contains('X-Amz-') || (url.contains('amazonaws.com') && !url.contains('/api/'));\n      if (isApiEndpoint && !isPresignedS3 && token != null && token.isNotEmpty) {\n        try {\n          print('Resolving announcement URL redirect: $url');\n          final response = await http.head(Uri.parse(url), headers: {'Authorization': 'Bearer $token'}).timeout(const Duration(seconds: 10));\n          if (response.statusCode == 302 || response.statusCode == 301) {\n            final location = response.headers['location'];\n            if (location != null && location.isNotEmpty) {\n              announcementUrl = location;\n              print('Announcement redirect resolved to: $announcementUrl');\n            }\n          }\n        } catch (e) {\n          print('Error resolving announcement redirect: $e, using original URL');\n        }\n      }",
  "      // Resolve redirect if it's an API endpoint\n      final isApiEndpoint = url.contains('/api/v1/') || url.contains('execute-api');\n      final isPresignedS3 = url.contains('X-Amz-') || (url.contains('amazonaws.com') && !url.contains('/api/'));\n      print('Announcement URL check - isApiEndpoint: $isApiEndpoint, isPresignedS3: $isPresignedS3, hasToken: ${token != null && token.isNotEmpty}');\n      if (isApiEndpoint && !isPresignedS3 && token != null && token.isNotEmpty) {\n        try {\n          print('Resolving announcement URL redirect: $url');\n          final response = await http.head(Uri.parse(url), headers: {'Authorization': 'Bearer $token'}).timeout(const Duration(seconds: 10));\n          print('Redirect response status: ${response.statusCode}');\n          if (response.statusCode == 302 || response.statusCode == 301) {\n            final location = response.headers['location'];\n            if (location != null && location.isNotEmpty) {\n              announcementUrl = location;\n              print('Announcement redirect resolved to: $announcementUrl');\n            } else {\n              print('WARNING: Redirect response but no location header');\n            }\n          } else {\n            print('No redirect - status code: ${response.statusCode}');\n          }\n        } catch (e) {\n          print('Error resolving announcement redirect: $e, using original URL');\n          print('Stack trace: ${StackTrace.current}');\n        }\n      } else {\n        print('Skipping redirect resolution - using original URL: $url');\n      }"
);

// FIX 3: Add lock screen controls using audio_session properly
rep('Configure audio session for lock screen',
  "  Future<void> _init() async {\n    try {\n      final session = await AudioSession.instance;",
  "  Future<void> _init() async {\n    try {\n      final session = await AudioSession.instance;\n      await session.configure(const AudioSessionConfiguration(\n        avAudioSessionCategory: AVAudioSessionCategory.playback,\n        avAudioSessionCategoryOptions: AVAudioSessionCategoryOptions.duckOthers,\n        avAudioSessionMode: AVAudioSessionMode.defaultMode,\n        avAudioSessionRouteSharingPolicy: AVAudioSessionRouteSharingPolicy.defaultPolicy,\n        avAudioSessionSetActiveOptions: AVAudioSessionSetActiveOptions.none,\n        androidAudioAttributes: const AndroidAudioAttributes(\n          contentType: AndroidAudioContentType.music,\n          flags: AndroidAudioFlags.none,\n          usage: AndroidAudioUsage.media,\n        ),\n        androidAudioFocusGainType: AndroidAudioFocusGainType.gain,\n        androidWillPauseWhenDucked: true,\n      ));"
);

// FIX 4: Add MediaItem for lock screen (using just_audio's built-in support)
rep('Add MediaItem to music playback',
  "        final source = AudioSource.uri(\n          Uri.parse(finalUrl),\n          headers: headers.isNotEmpty ? headers : null,\n        );",
  "        final source = AudioSource.uri(\n          Uri.parse(finalUrl),\n          headers: headers.isNotEmpty ? headers : null,\n          tag: MediaItem(\n            id: item['url'] ?? '',\n            title: item['title'] ?? 'Unknown',\n            artist: 'Sync2Gear',\n            album: 'Music Playlist',\n          ),\n        );"
);

const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length;
console.log('\nDone:', n, 'fixes | Braces:', o-cl);
fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

