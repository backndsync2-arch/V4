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
    // Load zones once on login
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.read<ZoneModel>().zones.isEmpty) {
        context.read<ZoneModel>().loadZones();
      }
    });
    return const MainScreen();
  }
}

