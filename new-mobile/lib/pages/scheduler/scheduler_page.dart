import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/zone_model.dart';
import '../../services/api_service.dart';

class SchedulerPage extends StatelessWidget {
  const SchedulerPage({super.key});
  @override
  Widget build(BuildContext context) {
    final zoneId = context.watch<ZoneModel>().selectedZoneId;

    return Scaffold(
      appBar: AppBar(title: const Text('Scheduler')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Schedules', style: TextStyle(fontWeight: FontWeight.bold)),
                FilledButton(
                  onPressed: zoneId == null ? null : () {
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: const Color(0xFF2A2A2A),
                      builder: (ctx) {
                        String recurrence = 'daily';
                        String timeOfDay = '09:00';
                        int? dayOfMonth;
                        final days = <int>{1};
                        String? selectedAnnouncementId;
                        String? selectedFolderId;
                        return StatefulBuilder(
                          builder: (ctx, setState) => Padding(
                            padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(ctx).viewInsets.bottom + 16),
                            child: SingleChildScrollView(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Create Schedule', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                  const SizedBox(height: 12),
                                  DropdownButtonFormField<String>(
                                    initialValue: recurrence,
                                    items: const [
                                      DropdownMenuItem(value: 'once', child: Text('Once')),
                                      DropdownMenuItem(value: 'daily', child: Text('Daily')),
                                      DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                                      DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                                    ],
                                    onChanged: (v) => setState(() => recurrence = v ?? 'daily'),
                                    decoration: const InputDecoration(labelText: 'Recurrence'),
                                  ),
                                  const SizedBox(height: 8),
                                  TextFormField(
                                    initialValue: timeOfDay,
                                    decoration: const InputDecoration(labelText: 'Time (HH:mm)'),
                                    onChanged: (v) => timeOfDay = v,
                                  ),
                                  const SizedBox(height: 8),
                                  if (recurrence == 'weekly') Wrap(
                                    spacing: 8,
                                    children: List.generate(7, (i) {
                                      final d = i + 1;
                                      const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                                      return FilterChip(
                                        label: Text(labels[i]),
                                        selected: days.contains(d),
                                        onSelected: (v) { setState(() { if (v) { days.add(d); } else { days.remove(d); } }); },
                                      );
                                    }),
                                  ),
                                  if (recurrence == 'monthly') TextFormField(
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(labelText: 'Day of month (1-31)'),
                                    onChanged: (v) => dayOfMonth = int.tryParse(v),
                                  ),
                                  const SizedBox(height: 12),
                                  FutureBuilder<List<dynamic>>(
                                    future: getFolders(type: 'announcements', zoneId: zoneId),
                                    builder: (ctx, snap) {
                                      final folders = snap.data ?? [];
                                      final items = <DropdownMenuItem<String>>[
                                        const DropdownMenuItem(value: '', child: Text('No Folder (select announcement below)')),
                                        ...folders.map((f) {
                                          final id = (f['id'] ?? f['folder_id'] ?? '').toString();
                                          final name = (f['name'] ?? 'Folder').toString();
                                          return DropdownMenuItem(value: id, child: Text(name));
                                        }),
                                      ];
                                      return DropdownButtonFormField<String>(
                                        initialValue: selectedFolderId ?? '',
                                        items: items,
                                        onChanged: (v) => selectedFolderId = (v != null && v.isNotEmpty) ? v : null,
                                        decoration: const InputDecoration(labelText: 'Announcement Folder'),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 8),
                                  TextFormField(
                                    decoration: const InputDecoration(labelText: 'Announcement ID (optional if folder selected)'),
                                    onChanged: (v) => selectedAnnouncementId = v,
                                  ),
                                  const SizedBox(height: 16),
                                  FilledButton(
                                    onPressed: () async {
                                      try {
                                        await createSchedule(
                                          zoneId: zoneId!,
                                          announcementId: selectedAnnouncementId?.isNotEmpty == true ? selectedAnnouncementId : null,
                                          folderId: selectedFolderId,
                                          recurrence: recurrence,
                                          timeOfDay: timeOfDay,
                                          daysOfWeek: recurrence == 'weekly' ? days.toList() : null,
                                          dayOfMonth: recurrence == 'monthly' ? dayOfMonth : null,
                                        );
                                        if (ctx.mounted) {
                                          Navigator.pop(ctx);
                                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Schedule created')));
                                        }
                                      } catch (e) {
                                        if (ctx.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to create schedule')));
                                        }
                                      }
                                    },
                                    child: const Text('Create'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    );
                  },
                  child: const Text('Create'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Your schedules will appear here.', style: TextStyle(color: Colors.white70)),
          ],
        ),
      ),
    );
  }
}

