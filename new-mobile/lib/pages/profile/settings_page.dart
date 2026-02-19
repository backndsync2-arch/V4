import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../models/zone_model.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});
  @override
  State<SettingsPage> createState() => _SettingsPageState();
}
class _SettingsPageState extends State<SettingsPage> {
  bool _notifications = false;
  bool _microphone = false;
  bool _storage = false;
  bool _camera = false;
  @override
  void initState() {
    super.initState();
    () async {
      final notif = await Permission.notification.status;
      final mic = await Permission.microphone.status;
      final storage = await Permission.storage.status;
      final cam = await Permission.camera.status;
      if (mounted) {
        setState(() {
          _notifications = notif.isGranted;
          _microphone = mic.isGranted;
          _storage = storage.isGranted;
          _camera = cam.isGranted;
        });
      }
    }();
  }
  Future<void> _requestPermissions() async {
    final notif = await Permission.notification.request();
    final mic = await Permission.microphone.request();
    final storage = await Permission.storage.request();
    final cam = await Permission.camera.request();
    setState(() {
      _notifications = notif.isGranted;
      _microphone = mic.isGranted;
      _storage = storage.isGranted;
      _camera = cam.isGranted;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Permissions updated')));
    }
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Permissions', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SwitchListTile(value: _notifications, onChanged: null, title: const Text('Notifications'), subtitle: const Text('Allow playback status notifications')),
            SwitchListTile(value: _microphone, onChanged: null, title: const Text('Microphone'), subtitle: const Text('Required for recording announcements')),
            SwitchListTile(value: _storage, onChanged: null, title: const Text('Storage'), subtitle: const Text('Required to pick and upload files')),
            SwitchListTile(value: _camera, onChanged: null, title: const Text('Camera'), subtitle: const Text('Optional: pick profile photo')),
            const SizedBox(height: 12),
            FilledButton(onPressed: _requestPermissions, child: const Text('Request Permissions')),
            const SizedBox(height: 8),
            TextButton(onPressed: () => openAppSettings(), child: const Text('Open App Settings')),
            const SizedBox(height: 24),
            const Text('Zone Preferences', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Builder(builder: (ctx) {
              final zones = context.read<ZoneModel>().zones;
              final selectedZoneId = context.read<ZoneModel>().selectedZoneId;
              final selectedZoneName = () {
                if (selectedZoneId == null) return 'None';
                final z = zones.firstWhere((e) => (e['id'] ?? e['zone_id']).toString() == selectedZoneId, orElse: () => {});
                return z.isEmpty ? 'None' : (z['name'] ?? 'Zone');
              }();
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFF2A2A2A), borderRadius: BorderRadius.circular(8)),
                child: Row(
                  children: [
                    const Icon(Icons.speaker_group, color: Colors.white),
                    const SizedBox(width: 12),
                    Expanded(child: Text('Current Zone: $selectedZoneName')),
                  ],
                ),
              );
            }),
            const SizedBox(height: 24),
            const Text('Background Playback', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Playback is controlled on devices. The app can run in the background; ensure battery optimizations are disabled for reliable push updates.'),
          ],
        ),
      ),
    );
  }
}

