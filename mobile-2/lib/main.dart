import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/music_screen.dart';
import 'screens/announcements_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        title: 'Sync2Gear',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          primaryColor: Colors.blue,
          scaffoldBackgroundColor: const Color(0xFF1A1A1A),
          colorScheme: const ColorScheme.dark(
            primary: Colors.blue,
            surface: Color(0xFF2A2A2A),
          ),
        ),
        initialRoute: '/',
        routes: {
          '/': (context) => const LoginScreen(),
          '/home': (context) => const HomeScreen(),
          '/dashboard': (context) => const DashboardScreen(),
          '/music': (context) => const MusicScreen(),
          '/announcements': (context) => const AnnouncementsScreen(),
        },
      );
  }
}

