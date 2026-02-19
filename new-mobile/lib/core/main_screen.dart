import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/player_model.dart';
import '../models/zone_model.dart';
import '../models/auth_model.dart';
import '../models/music_model.dart';
import '../models/announcements_model.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';
import '../pages/dashboard/dashboard_page.dart';
import '../pages/music/music_page.dart';
import '../pages/announcements/announcements_page.dart';
import '../pages/scheduler/scheduler_page.dart';
import '../pages/profile/profile_page.dart';
import '../widgets/common/mini_player.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  String? _selectedClientId;
  bool _clientInitDone = false;
  final List<Widget> _pages = [
    const DashboardPage(),
    const MusicPage(),
    const AnnouncementsPage(),
    const SchedulerPage(),
    const ProfilePage(),
  ];

  @override
  void initState() {
    super.initState();
    () async {
      _selectedClientId = await getImpersonateClientId();
      _clientInitDone = _selectedClientId != null && _selectedClientId!.isNotEmpty;
      if (mounted) setState(() {});
    }();
  }

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerModel>();
    final zoneModel = context.watch<ZoneModel>();
    final auth = context.watch<AuthModel>();
    final musicModel = context.watch<MusicModel>();
    final annModel = context.watch<AnnouncementsModel>();
    
    
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Expanded(
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: zoneModel.selectedZoneId,
                  icon: Icon(Icons.arrow_drop_down, color: Theme.of(context).colorScheme.onSurface),
                  dropdownColor: Theme.of(context).cardColor,
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16),
                  hint: Text('Select Zone', style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                  items: zoneModel.zones.map<DropdownMenuItem<String>>((z) {
                    final id = (z['id'] ?? z['zone_id']).toString();
                    return DropdownMenuItem<String>(value: id, child: Text(z['name'] ?? 'Unknown Zone'));
                  }).toList(),
                  onChanged: (v) async {
                    zoneModel.selectZone(v);
                    await context.read<MusicModel>().load();
                    await context.read<AnnouncementsModel>().load();
                  },
                ),
              ),
            ),
            if (auth.isAdmin)
              SizedBox(
                width: 280,
                child: FutureBuilder<List<dynamic>>(
                  future: getAdminClients(),
                  builder: (ctx, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const Center(child: LinearProgressIndicator());
                    }
                    final clients = snap.data ?? [];
                    final ids = clients.map((c) => (c['id'] ?? '').toString()).toSet();
                    final selected = ids.contains(_selectedClientId) ? _selectedClientId : null;
                    if (!_clientInitDone && selected == null && clients.isNotEmpty) {
                      final firstId = (clients.first['id'] ?? '').toString();
                      WidgetsBinding.instance.addPostFrameCallback((_) async {
                        _selectedClientId = firstId;
                        _clientInitDone = true;
                        if (mounted) setState(() {});
                        await setImpersonateClientId(firstId);
                        context.read<ZoneModel>().clearZone();
                        context.read<ZoneModel>().zones = [];
                        await context.read<ZoneModel>().loadZones();
                        await context.read<MusicModel>().load();
                        await context.read<AnnouncementsModel>().load();
                      });
                    }
                    return DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selected,
                        icon: Icon(Icons.arrow_drop_down, color: Theme.of(context).colorScheme.onSurface),
                        dropdownColor: Theme.of(context).cardColor,
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16),
                        hint: Text('Select Client', style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                        items: clients.map<DropdownMenuItem<String>>((c) {
                          final id = (c['id'] ?? '').toString();
                          final name = (c['name'] ?? c['business_name'] ?? 'Client').toString();
                          return DropdownMenuItem<String>(value: id, child: Text(name, overflow: TextOverflow.ellipsis));
                        }).toList(),
                        onChanged: (v) async {
                          _selectedClientId = v;
                          setState(() {});
                          await setImpersonateClientId(v ?? '');
                          context.read<ZoneModel>().clearZone();
                          context.read<ZoneModel>().zones = [];
                          await context.read<ZoneModel>().loadZones();
                          await context.read<MusicModel>().load();
                          await context.read<AnnouncementsModel>().load();
                        },
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
      body: Stack(
        children: [
          IndexedStack(
            index: _currentIndex,
            children: _pages,
          ),
          if (musicModel.loading || annModel.loading)
            const Positioned(
              top: 0, left: 0, right: 0,
              child: LinearProgressIndicator(minHeight: 3),
            ),
          if (player.currentTitle != null)
            Positioned(
              left: 8, right: 8, bottom: 8,
              child: const MiniPlayer(),
            ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.music_note), label: 'Music'),
          BottomNavigationBarItem(icon: Icon(Icons.campaign), label: 'Announce'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month), label: 'Scheduler'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

