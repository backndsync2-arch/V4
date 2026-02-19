import 'dart:convert';
import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class AuditLogsPage extends StatefulWidget {
  const AuditLogsPage({super.key});
  @override
  State<AuditLogsPage> createState() => _AuditLogsPageState();
}
class _AuditLogsPageState extends State<AuditLogsPage> {
  String? _actionFilter;
  String? _resourceFilter;
  final _searchCtrl = TextEditingController();

  Icon _iconForAction(String? action) {
    switch(action) {
      case 'create': return const Icon(Icons.add_circle, color: Colors.green);
      case 'update': return const Icon(Icons.edit, color: Colors.blue);
      case 'delete': return const Icon(Icons.delete, color: Colors.red);
      case 'login': return const Icon(Icons.login, color: Colors.orange);
      default: return const Icon(Icons.info, color: Colors.grey);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Audit Logs')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _searchCtrl,
                  decoration: InputDecoration(
                    hintText: 'Search logs...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(icon: const Icon(Icons.clear), onPressed: () => setState(() => _searchCtrl.clear())),
                  ),
                  onChanged: (v) => setState(() {}),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      FilterChip(
                        label: const Text('Login'),
                        selected: _actionFilter == 'login',
                        onSelected: (v) => setState(() => _actionFilter = v ? 'login' : null),
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        label: const Text('Create'),
                        selected: _actionFilter == 'create',
                        onSelected: (v) => setState(() => _actionFilter = v ? 'create' : null),
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        label: const Text('Update'),
                        selected: _actionFilter == 'update',
                        onSelected: (v) => setState(() => _actionFilter = v ? 'update' : null),
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        label: const Text('Delete'),
                        selected: _actionFilter == 'delete',
                        onSelected: (v) => setState(() => _actionFilter = v ? 'delete' : null),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _resourceFilter,
                  items: const [
                    DropdownMenuItem(value: null, child: Text('All Resources')),
                    DropdownMenuItem(value: 'announcement', child: Text('Announcement')),
                    DropdownMenuItem(value: 'folder', child: Text('Folder')),
                    DropdownMenuItem(value: 'user', child: Text('User')),
                    DropdownMenuItem(value: 'schedule', child: Text('Schedule')),
                    DropdownMenuItem(value: 'playback', child: Text('Playback')),
                  ],
                  onChanged: (v) => setState(() => _resourceFilter = v),
                  decoration: const InputDecoration(labelText: 'Resource Type'),
                )
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<dynamic>>(
              future: getAuditLogs(action: _actionFilter, resourceType: _resourceFilter),
              builder: (ctx, snap) {
                if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                if (snap.hasError) return const Center(child: Text('Failed to load logs'));
                var logs = snap.data ?? [];
                
                // Client-side search filtering if API doesn't fully support text search on all fields
                if (_searchCtrl.text.isNotEmpty) {
                  final q = _searchCtrl.text.toLowerCase();
                  logs = logs.where((l) => 
                    (l['action'] ?? '').toString().toLowerCase().contains(q) ||
                    (l['resource_type'] ?? '').toString().toLowerCase().contains(q) ||
                    (l['details'] ?? '').toString().toLowerCase().contains(q)
                  ).toList();
                }

                return ListView.separated(
                  itemCount: logs.length,
                  separatorBuilder: (_, __) => const Divider(color: Color(0xFF282828)),
                  itemBuilder: (c, i) {
                    final l = logs[i];
                    return ExpansionTile(
                      leading: _iconForAction(l['action']),
                      title: Text('${l['action']} ${l['resource_type']}'.toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: Text('${l['created_at'] ?? ''}${l['resource_id'] != null ? ' • ID: ${l['resource_id']}' : ''}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('User: ${l['user_email'] ?? 'System'}', style: const TextStyle(color: Colors.white70)),
                              if (l['client_id'] != null) ...[
                                const SizedBox(height: 4),
                                Text('Client: ${l['client_id']}', style: const TextStyle(color: Colors.white70)),
                              ],
                              if (l['ip_address'] != null) ...[
                                const SizedBox(height: 4),
                                Text('IP: ${l['ip_address']}', style: const TextStyle(color: Colors.white70)),
                              ],
                              if (l['user_agent'] != null) ...[
                                const SizedBox(height: 4),
                                Text('Agent: ${l['user_agent']}', style: const TextStyle(color: Colors.white70)),
                              ],
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Text('Status: ${l['status'] ?? 'success'}', style: const TextStyle(color: Colors.white)),
                                  if (l['error_message'] != null) ...[
                                    const SizedBox(width: 8),
                                    Expanded(child: Text('Error: ${l['error_message']}', style: const TextStyle(color: Colors.red))),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 8),
                              const Text('Details', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              Builder(
                                builder: (_) {
                                  final raw = l['details'];
                                  dynamic parsed;
                                  if (raw is Map<String, dynamic>) {
                                    parsed = raw;
                                  } else if (raw is String && raw.isNotEmpty) {
                                    try { parsed = jsonDecode(raw); } catch (_) {}
                                  }
                                  final pretty = const JsonEncoder.withIndent('  ').convert(parsed ?? {});
                                  return Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(color: const Color(0xFF1E1E1E), borderRadius: BorderRadius.circular(8)),
                                    child: SelectableText(pretty, style: const TextStyle(fontFamily: 'monospace', color: Colors.grey)),
                                  );
                                },
                              ),
                              const SizedBox(height: 8),
                              if (l['changes'] != null) ...[
                                const Text('Changes', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(color: const Color(0xFF1E1E1E), borderRadius: BorderRadius.circular(8)),
                                  child: SelectableText(const JsonEncoder.withIndent('  ').convert(l['changes']), style: const TextStyle(fontFamily: 'monospace', color: Colors.grey)),
                                ),
                              ],
                            ],
                          ),
                        )
                      ],
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

