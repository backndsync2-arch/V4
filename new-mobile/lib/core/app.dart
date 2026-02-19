import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/auth_model.dart';
import '../models/zone_model.dart';
import '../models/player_model.dart';
import '../models/music_model.dart';
import '../models/announcements_model.dart';
import '../models/theme_model.dart';
import '../theme/app_theme.dart';
import 'root.dart';

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthModel()),
        ChangeNotifierProvider(create: (_) => ZoneModel()),
        ChangeNotifierProvider(create: (_) => PlayerModel()),
        ChangeNotifierProvider(create: (_) => MusicModel()),
        ChangeNotifierProvider(create: (_) => AnnouncementsModel()),
        ChangeNotifierProvider(create: (_) => ThemeModel()),
      ],
      child: MaterialApp(
        title: 'Sync2Gear',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme, // Force dark theme always
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark, // Force dark mode
        home: const Root(),
      ),
    );
  }
}

