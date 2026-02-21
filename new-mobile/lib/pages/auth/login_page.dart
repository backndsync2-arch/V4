import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../models/auth_model.dart';
import '../../models/music_model.dart';
import '../../models/announcements_model.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final emailCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  bool loading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Force black
      body: Container(
        color: Colors.black, // Force black
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Center(
          child: SingleChildScrollView(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Image.asset(
                    'assets/logo.png',
                    height: 80,
                    errorBuilder: (c, e, s) => Icon(Icons.music_note, size: 80, color: Theme.of(context).colorScheme.onSurface),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Sync2Gear',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                ),
                const SizedBox(height: 40),
                Text('Email or Username', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 8),
                Material(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF1DB954), width: 1),
                    ),
                    child: TextField(
                      controller: emailCtrl, 
                      decoration: const InputDecoration(
                        hintText: 'Email or Username',
                        hintStyle: TextStyle(color: Colors.white54),
                        filled: false,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      ),
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Password', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 8),
                Material(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF1DB954), width: 1),
                    ),
                    child: TextField(
                      controller: passCtrl, 
                      decoration: const InputDecoration(
                        hintText: 'Password',
                        hintStyle: TextStyle(color: Colors.white54),
                        filled: false,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        errorBorder: InputBorder.none, // No error border
                        focusedErrorBorder: InputBorder.none, // No error border when focused
                        errorText: null, // Explicitly no error text
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      ), 
                      obscureText: true,
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                      // No validator - login page should not validate password format
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                FilledButton(
                  onPressed: loading ? null : () async {
                    setState(() => loading = true);
                    try {
                      await context.read<AuthModel>().loginWith(emailCtrl.text.trim(), passCtrl.text.trim());
                      await context.read<MusicModel>().load();
                      await context.read<AnnouncementsModel>().load();
                    } catch (e) {
                      final errorMsg = e.toString().replaceAll('Exception: ', '');
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(errorMsg.length > 100 ? '${errorMsg.substring(0, 100)}...' : errorMsg),
                            duration: const Duration(seconds: 5),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    } finally {
                      if (mounted) setState(() => loading = false);
                    }
                  },
                  child: Text(loading ? 'LOGGING IN...' : 'LOG IN'),
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2A2A2A),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text('Quick Access (Tap to Copy)', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7), fontSize: 12)),
                      const SizedBox(height: 12),
                      _demoRow('Admin', 'admin@sync2gear.com'),
                      const SizedBox(height: 8),
                      _demoRow('Client', 'client1@example.com'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                FutureBuilder<PackageInfo>(
                  future: PackageInfo.fromPlatform(),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) return const SizedBox.shrink();
                    final info = snapshot.data!;
                    return Text(
                      'Version ${info.version} (Build ${info.buildNumber})',
                      textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                      fontSize: 12,
                    ),
                  );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _demoRow(String label, String email) {
    return GestureDetector(
      onTap: () {
        emailCtrl.text = email;
        passCtrl.text = label == 'Admin' ? 'Admin@Sync2Gear2025!' : 'Client@Example2025!';
      },
      child: Row(
        children: [
          Text('$label:', style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(width: 8),
          Expanded(child: Text(email, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7), fontSize: 12))),
          Icon(Icons.touch_app, size: 16, color: Theme.of(context).colorScheme.primary),
        ],
      ),
    );
  }
}

