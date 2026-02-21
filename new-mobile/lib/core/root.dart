import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/auth_model.dart';
import '../models/zone_model.dart';
import '../pages/auth/login_page.dart';
import 'main_screen.dart';

class Root extends StatelessWidget {
  const Root({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthModel>();
    if (!auth.isLoggedIn) return const LoginPage();
    
    // Load zones once on login - do it safely
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        final zoneModel = context.read<ZoneModel>();
        if (zoneModel.zones.isEmpty) {
          zoneModel.loadZones().catchError((e) {
            print('Error loading zones after login: $e');
          });
        }
      } catch (e) {
        print('Error in Root post-frame callback: $e');
      }
    });
    
    return const MainScreen();
  }
}

