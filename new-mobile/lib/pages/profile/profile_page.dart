import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/auth_model.dart';
import '../../services/storage_service.dart';
import '../../services/api_service.dart';
import 'settings_page.dart';
import '../team/team_members_page.dart';
import '../audit/audit_logs_page.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthModel>();
    final nameFuture = getProfileName();
    final avatarFuture = getProfileAvatar();
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: FutureBuilder<List<String?>>(
          future: Future.wait([nameFuture, avatarFuture]),
          builder: (ctx, snap) {
            final profileName = snap.data?[0] ?? auth.email ?? 'User';
            final avatarData = snap.data?[1];
            ImageProvider<Object>? avatarImage;
            if (avatarData != null) {
              if (avatarData.startsWith('data:')) {
                avatarImage = MemoryImage(base64Decode(avatarData.split(',').last)) as ImageProvider<Object>;
              } else if (avatarData.startsWith('http')) {
                avatarImage = NetworkImage(avatarData) as ImageProvider<Object>;
              }
            }
            return Column(
              children: [
                CircleAvatar(radius: 40, backgroundColor: const Color(0xFF2A2A2A), backgroundImage: avatarImage, child: avatarImage == null ? const Icon(Icons.person, size: 40, color: Colors.white) : null),
                const SizedBox(height: 16),
                Text(profileName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 8),
                Text(auth.email ?? '', style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 32),
                FilledButton(
                  onPressed: () async {
                    final nameCtrl = TextEditingController(text: profileName);
                    String? newAvatar = avatarData;
                    await showDialog(
                  context: context,
                  builder: (dctx) => StatefulBuilder(
                    builder: (dctx, setState) => AlertDialog(
                      backgroundColor: const Color(0xFF2A2A2A),
                      title: const Text('Edit Profile', style: TextStyle(color: Colors.white)),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          TextField(controller: nameCtrl, decoration: const InputDecoration(hintText: 'Display Name'), style: const TextStyle(color: Colors.white)),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 20,
                                backgroundColor: const Color(0xFF2A2A2A),
                                backgroundImage: (newAvatar != null && newAvatar!.startsWith('data:'))
                                  ? MemoryImage(base64Decode(newAvatar!.split(',').last)) as ImageProvider<Object>?
                                  : (newAvatar != null && newAvatar!.startsWith('http'))
                                    ? NetworkImage(newAvatar!) as ImageProvider<Object>?
                                    : null,
                                child: (newAvatar == null) ? const Icon(Icons.person, color: Colors.white) : null,
                              ),
                              const SizedBox(width: 12),
                              FilledButton(
                                onPressed: () async {
                                  final res = await FilePicker.platform.pickFiles(type: FileType.image);
                                  if (res != null && res.files.isNotEmpty) {
                                    final file = res.files.first;
                                    if (file.bytes != null) {
                                      final b64 = base64Encode(file.bytes!);
                                      final mime = (file.extension ?? 'png').toLowerCase() == 'jpg' ? 'jpeg' : (file.extension ?? 'png');
                                      setState(() { newAvatar = 'data:image/$mime;base64,$b64'; });
                                    }
                                  }
                                },
                                child: const Text('Change Photo'),
                              ),
                            ],
                          ),
                        ],
                      ),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(dctx), child: const Text('Cancel')),
                        FilledButton(
                          onPressed: () async {
                            Navigator.pop(dctx);
                            await setProfileName(nameCtrl.text.trim());
                            await setProfileAvatar(newAvatar);
                            if (auth.isAdmin && (auth.email?.isNotEmpty ?? false)) {
                              try {
                                final users = await getAdminUsers();
                                final me = users.firstWhere((u) => (u['email'] ?? '').toString().toLowerCase() == auth.email!.toLowerCase(), orElse: () => {});
                                final myId = (me['id'] ?? '').toString();
                                if (myId.isNotEmpty) {
                                  final payload = <String, dynamic>{'name': nameCtrl.text.trim()};
                                  if (newAvatar != null) { payload['avatar'] = newAvatar!; }
                                  await updateAdminUser(myId, payload);
                                }
                              } catch (_) {}
                            }
                            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
                          },
                          child: const Text('Save'),
                        ),
                      ],
                    ),
                  ),
                );
                  },
                  child: const Text('Edit Profile'),
                ),
                const SizedBox(height: 24),
            
            // Admin Features
            if (auth.isAdmin) ...[
              const Align(alignment: Alignment.centerLeft, child: Text('ADMINISTRATION', style: TextStyle(color: Color(0xFF1DB954), fontWeight: FontWeight.bold, fontSize: 12))),
              const SizedBox(height: 8),
              ListTile(
                leading: const Icon(Icons.people, color: Colors.white),
                title: const Text('Team Members', style: TextStyle(color: Colors.white)),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TeamMembersPage())),
              ),
              ListTile(
                leading: const Icon(Icons.history, color: Colors.white),
                title: const Text('Audit Logs', style: TextStyle(color: Colors.white)),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AuditLogsPage())),
              ),
              const Divider(color: Color(0xFF282828)),
            ],

            ListTile(
              leading: const Icon(Icons.settings, color: Colors.white),
              title: const Text('Settings', style: TextStyle(color: Colors.white)),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsPage())),
            ),
            const Divider(color: Color(0xFF282828)),
            ListTile(
              leading: const Icon(Icons.logout, color: Color(0xFFE22134)),
              title: const Text('Log Out', style: TextStyle(color: Color(0xFFE22134))),
              onTap: () => auth.logout(),
            ),
          ],
            );
          },
        ),
      ),
    );
  }
}

