import 'package:flutter/material.dart';
import '../api.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _user;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      final user = await getCurrentUser();
      setState(() {
        _user = user;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load user: $e')),
        );
        Navigator.of(context).pushReplacementNamed('/');
      }
    }
  }

  Future<void> _logout() async {
    await clearTokens();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sync2Gear'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                ListTile(
                  leading: const Icon(Icons.dashboard, size: 32),
                  title: const Text('Dashboard', style: TextStyle(fontSize: 18)),
                  subtitle: const Text('Control playback and view status'),
                  onTap: () => Navigator.pushNamed(context, '/dashboard'),
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.music_note, size: 32),
                  title: const Text('Music', style: TextStyle(fontSize: 18)),
                  subtitle: const Text('Browse and manage music files'),
                  onTap: () => Navigator.pushNamed(context, '/music'),
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.campaign, size: 32),
                  title: const Text('Announcements', style: TextStyle(fontSize: 18)),
                  subtitle: const Text('Create and manage announcements'),
                  onTap: () => Navigator.pushNamed(context, '/announcements'),
                ),
                const Divider(),
                if (_user != null)
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('User: ${_user!['email'] ?? 'Unknown'}'),
                        Text('Role: ${_user!['role'] ?? 'Unknown'}'),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }
}

