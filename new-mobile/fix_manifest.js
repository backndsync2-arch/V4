const fs = require('fs');
const p = 'android/app/src/main/AndroidManifest.xml';
let c = fs.readFileSync(p, 'utf8');

// Add FOREGROUND_SERVICE permissions after INTERNET
c = c.replace(
  '<uses-permission android:name="android.permission.INTERNET"/>',
  '<uses-permission android:name="android.permission.INTERNET"/>\r\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>\r\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"/>'
);

// Add AudioService before closing application tag (avoid duplicate)
if (!c.includes('AudioServicePlugin')) {
  c = c.replace(
    '    </application>',
    '        <!-- just_audio_background: background media playback service -->\r\n        <service\r\n            android:name="com.ryanheise.audioservice.AudioServicePlugin"\r\n            android:foregroundServiceType="mediaPlayback"\r\n            android:exported="false">\r\n            <intent-filter>\r\n                <action android:name="android.media.browse.MediaBrowserService" />\r\n            </intent-filter>\r\n        </service>\r\n    </application>'
  );
}

fs.writeFileSync(p + '.tmp', c, 'utf8');
console.log('FOREGROUND_SERVICE:', c.includes('FOREGROUND_SERVICE'));
console.log('AudioServicePlugin:', c.includes('AudioServicePlugin'));

