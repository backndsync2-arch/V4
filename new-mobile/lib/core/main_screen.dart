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
    
    // Ensure _currentIndex is always valid to prevent RangeError
    // This must be done synchronously, not in post-frame callback
    if (_currentIndex < 0 || _currentIndex >= _pages.length) {
      _currentIndex = 0; // Reset to first page if invalid
    }
    
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Expanded(
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: zoneModel.selectedZoneId != null && zoneModel.zones.isNotEmpty && zoneModel.zones.any((z) => ((z['id'] ?? z['zone_id']).toString() == zoneModel.selectedZoneId))
                    ? zoneModel.selectedZoneId
                    : null, // Set to null if selected zone doesn't exist in list or zones is empty
                  icon: Icon(Icons.arrow_drop_down, color: Theme.of(context).colorScheme.onSurface),
                  dropdownColor: Theme.of(context).cardColor,
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16),
                  hint: Text(zoneModel.zones.isEmpty ? 'Loading zones...' : 'Select Zone', style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                  items: zoneModel.zones.isEmpty 
                    ? [DropdownMenuItem<String>(value: null, child: Text('No zones available', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5))))]
                    : zoneModel.zones
                        .where((z) {
                          final id = (z['id'] ?? z['zone_id']).toString();
                          return id.isNotEmpty; // Only include zones with valid IDs
                        })
                        .map<DropdownMenuItem<String>>((z) {
                          final id = (z['id'] ?? z['zone_id']).toString();
                          return DropdownMenuItem<String>(value: id, child: Text(z['name'] ?? 'Unknown Zone'));
                        }).toList(),
                  onChanged: (v) async {
                    zoneModel.selectZone(v);
                    // Load both in parallel instead of sequentially for faster loading
                    await Future.wait([
                      context.read<MusicModel>().load(),
                      context.read<AnnouncementsModel>().load(),
                    ]);
                  },
                ),
              ),
            ),
            if (auth.isAdmin)
              Flexible(  // Changed from SizedBox(width: 280) to Flexible for mobile compatibility
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
                      // Safely get first client ID
                      final firstClient = clients.first;
                      final firstId = (firstClient['id'] ?? firstClient['_id'] ?? '').toString();
                      if (firstId.isEmpty) return const SizedBox.shrink(); // Don't render if no valid ID
                      WidgetsBinding.instance.addPostFrameCallback((_) async {
                        _selectedClientId = firstId;
                        _clientInitDone = true;
                        if (mounted) setState(() {});
                        await setImpersonateClientId(firstId);
                        context.read<ZoneModel>().clearZone();
                        context.read<ZoneModel>().zones = [];
                        await context.read<ZoneModel>().loadZones();
                        // Load both in parallel for faster loading
                        await Future.wait([
                          context.read<MusicModel>().load(),
                          context.read<AnnouncementsModel>().load(),
                        ]);
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
                          // Load zones first, then load music/announcements in parallel
                          await context.read<ZoneModel>().loadZones();
                          await Future.wait([
                            context.read<MusicModel>().load(),
                            context.read<AnnouncementsModel>().load(),
                          ]);
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
            index: _currentIndex.clamp(0, _pages.length - 1), // Ensure valid index
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
        currentIndex: _currentIndex.clamp(0, _pages.length - 1), // Ensure valid range
        onTap: (index) {
          if (index >= 0 && index < _pages.length) {
            setState(() => _currentIndex = index);
          }
        },
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

