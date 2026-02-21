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
  int _refreshKey = 0; // Key to force FutureBuilder refresh
  Future<List<dynamic>>? _usersFuture; // Cache the future for proper refresh
  
  @override
  void initState() {
    super.initState();
    _usersFuture = getAdminUsers(); // Initialize future
  }
  
  Future<void> _refresh() async {
    setState(() {
      _refreshKey++; // Increment key to force FutureBuilder to rebuild
      _usersFuture = getAdminUsers(); // Create new future to force refresh
    });
  }

  void _showAddUserDialog() async {
    final emailCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    String role = 'client';
    String? clientId;
    String? floorId;
    bool autoGenerate = true;
    final passCtrl = TextEditingController();
    String generated = _generatePassword();
    String? avatarData;
    final auth = context.read<AuthModel>();
    
    // Determine available roles based on current user's role
    List<String> availableRoles = [];
    if (auth.isAdmin || auth.isStaff) {
      // Admin/staff can create all roles
      availableRoles = ['client', 'floor_user', 'admin', 'staff'];
    } else if (auth.isClient) {
      // Client users can only create client and floor_user roles
      availableRoles = ['client', 'floor_user'];
    } else {
      // Default: only client
      availableRoles = ['client'];
    }
    
    // Don't auto-fill clientId - it will be set based on role requirements
    
    final clientsFuture = (auth.isAdmin || auth.isStaff) ? getAdminClients() : Future.value([]);
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('Add Team Member', style: TextStyle(color: Colors.white)),
        content: StatefulBuilder(
          builder: (ctx, setState) => SingleChildScrollView(
            child: Column(
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
                  TextField(
                    controller: passCtrl, 
                    obscureText: true, 
                    decoration: InputDecoration(
                      hintText: 'Password (min 8 characters)',
                      errorText: passCtrl.text.isNotEmpty && passCtrl.text.length < 8 
                        ? 'Password must be at least 8 characters' 
                        : null,
                    ), 
                    style: const TextStyle(color: Colors.white),
                    onChanged: (v) {
                      setState(() {}); // Trigger rebuild to show validation error
                    },
                  ),
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
                  value: role,
                  dropdownColor: const Color(0xFF2A2A2A),
                  style: const TextStyle(color: Colors.white),
                  items: availableRoles.map((r) {
                    String label = r;
                    if (r == 'client') label = 'Client';
                    else if (r == 'floor_user') label = 'Floor User';
                    else if (r == 'admin') label = 'Admin';
                    else if (r == 'staff') label = 'Staff';
                    return DropdownMenuItem(value: r, child: Text(label));
                  }).toList(),
                  onChanged: (v) => setState(() {
                    role = v!;
                    // Clear floorId when role changes (unless it's still floor_user)
                    if (v != 'floor_user') floorId = null;
                  }),
                  decoration: const InputDecoration(labelText: 'Role'),
                ),
                // Client selection - ONLY shown for 'staff' and 'floor_user' roles
                // When creating 'client' role: NO client selection (creating new client org)
                // When creating 'admin' role: NO client (global admin)
                if (role == 'staff' || role == 'floor_user') ...[
                  if (auth.isAdmin || auth.isStaff) ...[
                    // Admin/staff can select client for staff/floor_user members
                    const SizedBox(height: 12),
                    FutureBuilder<List<dynamic>>(
                      future: clientsFuture,
                      builder: (ctx, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return const LinearProgressIndicator();
                        }
                        final clients = snap.data ?? [];
                        return DropdownButtonFormField<String>(
                          value: clientId,
                          dropdownColor: const Color(0xFF2A2A2A),
                          style: const TextStyle(color: Colors.white),
                          items: [
                            if (role == 'staff') const DropdownMenuItem(value: null, child: Text('No Client (Global Staff)')),
                            ...clients.map((c) {
                              final id = (c['id'] ?? '').toString();
                              final name = (c['name'] ?? c['business_name'] ?? 'Client').toString();
                              return DropdownMenuItem(value: id, child: Text(name));
                            }).toList(),
                          ],
                          onChanged: (v) => setState(() {
                            clientId = v;
                            // Clear floorId when client changes for floor_user
                            if (role == 'floor_user') floorId = null;
                          }),
                          decoration: InputDecoration(
                            labelText: role == 'staff' ? 'Client (Optional)' : 'Client *',
                            hintText: role == 'staff' ? 'Assign staff to specific client' : 'Select client for floor user',
                          ),
                        );
                      },
                    ),
                  ] else ...[
                    // Non-admin users: auto-use their client (read-only display)
                    const SizedBox(height: 12),
                    FutureBuilder<String?>(
                      future: getUserClientId(),
                      builder: (ctx, snap) {
                        if (snap.hasData && snap.data != null) {
                          clientId = snap.data; // Auto-set for non-admin users
                          return TextField(
                            enabled: false,
                            controller: TextEditingController(text: 'Your Client (Auto-selected)'),
                            decoration: const InputDecoration(
                              labelText: 'Client',
                              hintText: 'Your client (auto-filled)',
                            ),
                            style: const TextStyle(color: Colors.grey),
                          );
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                  ],
                ],
                // Floor selection - ONLY shown for 'floor_user' role (after client is selected)
                if (role == 'floor_user' && clientId != null && clientId!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  FutureBuilder<List<dynamic>>(
                    future: getFloors(clientId: clientId),
                    builder: (ctx, snap) {
                      if (snap.connectionState == ConnectionState.waiting) {
                        return const LinearProgressIndicator();
                      }
                      final floors = snap.data ?? [];
                      if (floors.isEmpty) {
                        return const Text(
                          'No floors available for selected client',
                          style: TextStyle(color: Colors.orange, fontSize: 12),
                        );
                      }
                      return DropdownButtonFormField<String>(
                        value: floorId,
                        dropdownColor: const Color(0xFF2A2A2A),
                        style: const TextStyle(color: Colors.white),
                        items: floors.map((f) {
                          final id = (f['id'] ?? f['_id'] ?? '').toString();
                          final name = (f['name'] ?? 'Floor').toString();
                          return DropdownMenuItem(value: id, child: Text(name));
                        }).toList(),
                        onChanged: (v) => setState(() => floorId = v),
                        decoration: const InputDecoration(
                          labelText: 'Floor *',
                          hintText: 'Select floor (required)',
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                // Validation based on role
                // For 'client' role: NO client selection (creating new client organization)
                // For 'floor_user' role: Client AND floor required
                // For 'staff' role: Client is optional (can be null for global staff)
                // For 'admin' role: NO client (admins are global)
                
                if (role == 'floor_user') {
                  // Floor user needs both client and floor
                  if (clientId == null || clientId!.isEmpty) {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Client is required for floor user role'))
                    );
                    return;
                  }
                  if (floorId == null || floorId!.isEmpty) {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Floor is required for floor user role'))
                    );
                    return;
                  }
                } else if (role == 'client') {
                  // Client role: Need to create client organization first, then use that client_id
                  // Only admin/staff can create new client organizations
                  if (auth.isAdmin || auth.isStaff) {
                    try {
                      // Create client organization first
                      final createdClient = await createClient(
                        name: nameCtrl.text.trim(), // Organization name
                        email: emailCtrl.text.trim(), // Organization email (same as user email)
                        businessName: nameCtrl.text.trim(), // Business name (optional)
                      );
                      final newClientId = (createdClient['id'] ?? '').toString();
                      if (newClientId.isEmpty) {
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to create client organization: No ID returned'))
                        );
                        return;
                      }
                      clientId = newClientId; // Use the newly created client ID
                      floorId = null;
                      print('Created new client organization with ID: $clientId');
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to create client organization: ${e.toString().length > 100 ? e.toString().substring(0, 100) + "..." : e.toString()}'))
                      );
                      return;
                    }
                  } else {
                    // Non-admin users: use their own client
                    final userClientId = await getUserClientId();
                    if (userClientId != null && userClientId.isNotEmpty) {
                      clientId = userClientId;
                    } else {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('No client associated with your account'))
                      );
                      return;
                    }
                    floorId = null;
                  }
                } else if (role == 'admin') {
                  // Admin role: NO client (admins are global)
                  clientId = null;
                  floorId = null;
                } else if (role == 'staff') {
                  // Staff role: Client is optional (can be null for global staff)
                  floorId = null; // Staff don't have floors
                }
                
                // For non-admin users creating floor_user, ensure clientId is set
                if (!auth.isAdmin && !auth.isStaff && role == 'floor_user') {
                  final userClientId = await getUserClientId();
                  if (userClientId != null && userClientId.isNotEmpty) {
                    clientId = userClientId; // Use current user's client
                  }
                }
                
                final password = autoGenerate ? generated : passCtrl.text;
                
                // Add password validation
                if (!autoGenerate && (password.isEmpty || password.length < 8)) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Password must be at least 8 characters long'))
                  );
                  return;
                }
                
                final created = await createAdminUser(
                  emailCtrl.text, 
                  nameCtrl.text, 
                  role, 
                  clientId: clientId, 
                  floorId: floorId,
                  password: password
                );
                final newId = (created['id'] ?? '').toString();
                if (avatarData != null && newId.isNotEmpty) {
                  await updateAdminUser(newId, {'avatar': avatarData});
                }
                
                // Force refresh by recreating future BEFORE showing dialog
                if (mounted) {
                  setState(() {
                    _refreshKey++;
                    _usersFuture = getAdminUsers(); // Force new future to reload all users
                  });
                  
                  // Wait a moment for state to update, then show dialog
                  await Future.delayed(const Duration(milliseconds: 100));
                  
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
                }
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to add user: ${e.toString().length > 100 ? e.toString().substring(0, 100) + "..." : e.toString()}'))
                );
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
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User deleted')));
                  _refresh(); // Refresh after successful deletion
                }
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to delete: ${e.toString()}')));
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
      body: FutureBuilder<List<dynamic>>(
        key: ValueKey(_refreshKey), // Force rebuild when key changes
        future: _usersFuture, // Use cached future that gets recreated on refresh
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
            },
          );
        },
      ),
    );
  }
}

