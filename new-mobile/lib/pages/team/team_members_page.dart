import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/auth_model.dart';
import '../../services/storage_service.dart';
import '../../services/api_service.dart';
import '../../widgets/common/user_avatar.dart';

String _generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#\$%^&*';
  final rnd = Random.secure();
  return List.generate(12, (_) => chars[rnd.nextInt(chars.length)]).join();
}

class TeamMembersPage extends StatefulWidget {
  const TeamMembersPage({super.key});
  @override
  State<TeamMembersPage> createState() => _TeamMembersPageState();
}

class _TeamMembersPageState extends State<TeamMembersPage> {
  String? _selectedClientId;
  bool _clientInitDone = false;
  Future<void> _refresh() async {
    setState(() {});
  }

  void _showAddUserDialog() {
    final emailCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    String role = 'client';
    String? clientId;
    bool autoGenerate = true;
    final passCtrl = TextEditingController();
    String generated = _generatePassword();
    String? avatarData;
    final auth = context.read<AuthModel>();
    final clientsFuture = auth.isAdmin ? getAdminClients() : Future.value([]);
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('Add Team Member', style: TextStyle(color: Colors.white)),
        content: StatefulBuilder(
          builder: (ctx, setState) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: emailCtrl, decoration: const InputDecoration(hintText: 'Email'), style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 12),
              TextField(controller: nameCtrl, decoration: const InputDecoration(hintText: 'Name'), style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 12),
              SwitchListTile(
                value: autoGenerate,
                onChanged: (v) => setState(() { autoGenerate = v; }),
                title: const Text('Auto-generate password', style: TextStyle(color: Colors.white)),
              ),
              if (!autoGenerate)
                TextField(controller: passCtrl, obscureText: true, decoration: const InputDecoration(hintText: 'Password'), style: const TextStyle(color: Colors.white)),
              if (autoGenerate)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFF1E1E1E), borderRadius: BorderRadius.circular(6)),
                  child: Row(
                    children: [
                      Expanded(child: Text('Generated: $generated', style: const TextStyle(color: Colors.grey))),
                      IconButton(
                        icon: const Icon(Icons.refresh, color: Colors.white),
                        onPressed: () => setState(() { generated = _generatePassword(); }),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: const Color(0xFF2A2A2A),
                    backgroundImage: avatarData != null && avatarData!.startsWith('data:')
                      ? MemoryImage(base64Decode(avatarData!.split(',').last))
                      : null,
                    child: (avatarData == null) ? const Icon(Icons.person, color: Colors.white) : null,
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
                          setState(() {
                            avatarData = 'data:image/$mime;base64,$b64';
                          });
                        }
                      }
                    },
                    child: const Text('Pick Profile Image'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: role,
                dropdownColor: const Color(0xFF2A2A2A),
                style: const TextStyle(color: Colors.white),
                items: const [
                  DropdownMenuItem(value: 'client', child: Text('Client')),
                  DropdownMenuItem(value: 'admin', child: Text('Admin')),
                  DropdownMenuItem(value: 'staff', child: Text('Staff')),
                ],
                onChanged: (v) => setState(() { role = v!; }),
                decoration: const InputDecoration(labelText: 'Role'),
              ),
              if (auth.isAdmin && role == 'client') ...[
                const SizedBox(height: 12),
                FutureBuilder<List<dynamic>>(
                  future: clientsFuture,
                  builder: (ctx, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const LinearProgressIndicator();
                    }
                    final clients = snap.data ?? [];
                    return DropdownButtonFormField<String>(
                      initialValue: clientId,
                      dropdownColor: const Color(0xFF2A2A2A),
                      style: const TextStyle(color: Colors.white),
                      items: clients.map((c) {
                        final id = (c['id'] ?? '').toString();
                        final name = (c['name'] ?? c['business_name'] ?? 'Client').toString();
                        return DropdownMenuItem(value: id, child: Text(name));
                      }).toList(),
                      onChanged: (v) => setState(() { clientId = v; }),
                      decoration: const InputDecoration(labelText: 'Client'),
                    );
                  },
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                if (auth.isAdmin && role == 'client' && (clientId == null || clientId!.isEmpty)) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a client for the new user')));
                  return;
                }
                final password = autoGenerate ? generated : passCtrl.text;
                final created = await createAdminUser(emailCtrl.text, nameCtrl.text, role, clientId: clientId, password: password);
                final newId = (created['id'] ?? '').toString();
                if (avatarData != null && newId.isNotEmpty) {
                  await updateAdminUser(newId, {'avatar': avatarData});
                }
                _refresh();
                if (mounted) {
                  showDialog(
                    context: context,
                    builder: (ctx2) => AlertDialog(
                      backgroundColor: const Color(0xFF2A2A2A),
                      title: const Text('User Created', style: TextStyle(color: Colors.white)),
                      content: SelectableText('Temporary Password:\n$password', style: const TextStyle(color: Colors.grey)),
                      actions: [TextButton(onPressed: () => Navigator.pop(ctx2), child: const Text('Close'))],
                    ),
                  );
                }
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to add user')));
              }
            },
            child: const Text('Add'),
          ),
        ],
      )
    );
  }

  void _showEditUserDialog(Map<String, dynamic> user) {
    final nameCtrl = TextEditingController(text: user['name']);
    final passCtrl = TextEditingController();
    bool changePassword = false;
    String? avatarData = user['avatar'];
    
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          backgroundColor: const Color(0xFF2A2A2A),
          title: const Text('Edit User', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
               TextField(controller: nameCtrl, decoration: const InputDecoration(hintText: 'Name'), style: const TextStyle(color: Colors.white)),
               const SizedBox(height: 12),
               Row(
                 children: [
                   CircleAvatar(
                     radius: 20,
                     backgroundColor: const Color(0xFF2A2A2A),
                     backgroundImage: (avatarData != null && avatarData!.startsWith('data:'))
                       ? MemoryImage(base64Decode(avatarData!.split(',').last))
                       : (avatarData != null && avatarData!.startsWith('http'))
                         ? NetworkImage(avatarData!)
                         : null as ImageProvider<Object>?,
                     child: (avatarData == null) ? const Icon(Icons.person, color: Colors.white) : null,
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
                           setState(() {
                             avatarData = 'data:image/$mime;base64,$b64';
                           });
                         }
                       }
                     },
                     child: const Text('Change Profile Image'),
                   ),
                 ],
               ),
               const SizedBox(height: 12),
               SwitchListTile(
                 value: changePassword,
                 onChanged: (v) => setState(() { changePassword = v; }),
                 title: const Text('Change password', style: TextStyle(color: Colors.white)),
               ),
               if (changePassword)
                 TextField(controller: passCtrl, obscureText: true, decoration: const InputDecoration(hintText: 'New Password'), style: const TextStyle(color: Colors.white)),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  final payload = {
                    'name': nameCtrl.text,
                    if (avatarData != null) 'avatar': avatarData,
                    if (changePassword && passCtrl.text.isNotEmpty) 'password': passCtrl.text,
                  };
                  await updateAdminUser((user['id'] ?? '').toString(), payload);
                  _refresh();
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User updated')));
                } catch (e) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update')));
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      )
    );
  }

  void _deleteUser(String id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('Confirm Delete', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to delete this user?', style: TextStyle(color: Colors.grey)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await deleteAdminUser(id);
                _refresh();
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User deleted')));
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete')));
              }
            },
            child: const Text('Delete'),
          ),
        ],
      )
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Team Members')),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddUserDialog,
        backgroundColor: const Color(0xFF1DB954),
        child: const Icon(Icons.add, color: Colors.black),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: SizedBox(
                width: 320,
                child: FutureBuilder<List<dynamic>>(
                  future: getAdminClients(),
                  builder: (ctx, snap) {
                    if (snap.connectionState == ConnectionState.waiting) return const LinearProgressIndicator();
                    final clients = snap.data ?? [];
                    final ids = clients.map((c) => (c['id'] ?? '').toString()).toSet();
                    final selected = ids.contains(_selectedClientId) ? _selectedClientId : null;
                  if (!_clientInitDone && selected == null && clients.isNotEmpty) {
                    final firstId = (clients.first['id'] ?? '').toString();
                    WidgetsBinding.instance.addPostFrameCallback((_) async {
                      _selectedClientId = firstId;
                      _clientInitDone = true;
                      setState(() {});
                      await setImpersonateClientId(firstId);
                      await setSelectedZoneId(null);
                      _refresh();
                    });
                  }
                    return DropdownButtonFormField<String>(
                      initialValue: selected,
                      dropdownColor: const Color(0xFF2A2A2A),
                      style: const TextStyle(color: Colors.white),
                      items: clients.map((c) {
                        final id = (c['id'] ?? '').toString();
                        final name = (c['name'] ?? c['business_name'] ?? 'Client').toString();
                        return DropdownMenuItem(value: id, child: Text(name, overflow: TextOverflow.ellipsis));
                      }).toList(),
                      onChanged: (v) async {
                        setState(() => _selectedClientId = v);
                        await setImpersonateClientId(v ?? '');
                        await setSelectedZoneId(null);
                        _refresh();
                      },
                      decoration: const InputDecoration(labelText: 'Client Context (Admin)'),
                    );
                  },
                ),
              ),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<dynamic>>(
              future: getAdminUsers(clientId: _selectedClientId),
              builder: (ctx, snap) {
                if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                if (snap.hasError) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Failed to load users'),
                        const SizedBox(height: 12),
                        FilledButton(onPressed: _refresh, child: const Text('Retry')),
                      ],
                    ),
                  );
                }
                final users = snap.data ?? [];
                return ListView.builder(
                  itemCount: users.length,
                  itemBuilder: (c, i) {
                    final u = users[i];
                    final id = (u['id'] ?? '').toString();
                    return ListTile(
                      leading: UserAvatar(u),
                      title: Text(u['email'] ?? 'User'),
                      subtitle: Text('${u['name'] ?? ''} • ${u['role'] ?? 'Member'}'),
                      trailing: PopupMenuButton(
                        icon: const Icon(Icons.more_vert, color: Colors.white),
                        color: const Color(0xFF2A2A2A),
                        itemBuilder: (context) => [
                          const PopupMenuItem(value: 'edit', child: Text('Edit', style: TextStyle(color: Colors.white))),
                          const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.white))),
                        ],
                        onSelected: (v) {
                          if (v == 'edit') _showEditUserDialog(u);
                          if (v == 'delete') _deleteUser(id);
                        },
                      ),
                    );
                  }
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

