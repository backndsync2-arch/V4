import 'package:flutter/material.dart';
import 'core/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Skip JustAudioBackground for now - just_audio works without it
  // Background playback will still work, just without lock screen controls
  runApp(const App());
}
