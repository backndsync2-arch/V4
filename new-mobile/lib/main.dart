import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'package:audio_session/audio_session.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'api.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.sync2gear.playback',
    androidNotificationChannelName: 'Media Playback',
    androidNotificationOngoing: true,
  );
  runApp(const App());
}

class ZoneModel extends ChangeNotifier {
  List<dynamic> zones = [];
  String? _selectedZoneId;
  String? get selectedZoneId => _selectedZoneId;

  Future<void> loadZones() async {
    try {
      zones = await getZones();
      if (zones.isNotEmpty && _selectedZoneId == null) {
        _selectedZoneId = (zones.first['id'] ?? zones.first['zone_id']).toString();
        await setSelectedZoneId(_selectedZoneId);
      }
      notifyListeners();
    } catch (e) {
      print('Failed to load zones: $e');
    }
  }

  void selectZone(String? id) {
    _selectedZoneId = id;
    setSelectedZoneId(id);
    notifyListeners();
  }
}

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthModel()),
        ChangeNotifierProvider(create: (_) => ZoneModel()),
        ChangeNotifierProvider(create: (_) => PlayerModel()),
        ChangeNotifierProvider(create: (_) => MusicModel()),
        ChangeNotifierProvider(create: (_) => AnnouncementsModel()),
        ChangeNotifierProvider(create: (_) => ThemeModel()),
      ],
      child: MaterialApp(
        title: 'Sync2Gear',
        debugShowCheckedModeBanner: false,
        theme: _lightTheme,
        darkTheme: _darkTheme,
        themeMode: context.watch<ThemeModel>().mode,
        home: const Root(),
      ),
    );
  }
}

class Root extends StatelessWidget {
  const Root({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthModel>();
    if (!auth.isLoggedIn) return const LoginPage();
    // Load zones once on login
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.read<ZoneModel>().zones.isEmpty) {
        context.read<ZoneModel>().loadZones();
      }
    });
    return const MainScreen();
  }
}

// --- Models ---

class AuthModel extends ChangeNotifier {
  bool isLoggedIn = false;
  String? email;
  bool get isAdmin => email?.toLowerCase().contains('admin') ?? false;

  Future<void> loginWith(String e, String p) async {
    await login(e, p);
    email = e;
    isLoggedIn = true;
    notifyListeners();
  }
  Future<void> logout() async {
    await clearTokens();
    isLoggedIn = false;
    notifyListeners();
  }
}

class FileBrowserModel extends ChangeNotifier {
  final String type;
  List<dynamic> files = [];
  List<dynamic> folders = [];
  bool loading = false;
  String? currentFolderId;
  List<Map<String, String>> breadcrumbs = [{'id': '', 'name': 'Home'}];

  FileBrowserModel({required this.type});

  Future<void> load({String? folderId}) async {
    loading = true;
    currentFolderId = folderId;
    notifyListeners();
    try {
      if (type == 'music') {
        files = await getMusicFiles(folderId: folderId);
      } else {
        files = await getAnnouncements(folderId: folderId);
      }
      folders = await getFolders(type: type, parentId: folderId);
    } catch (e) {
      print(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void enterFolder(String id, String name) {
    breadcrumbs.add({'id': id, 'name': name});
    load(folderId: id);
  }

  void exitFolder() {
    if (breadcrumbs.length > 1) {
      breadcrumbs.removeLast();
      final prev = breadcrumbs.last;
      load(folderId: prev['id'] == '' ? null : prev['id']);
    }
  }
}

class MusicModel extends FileBrowserModel {
  MusicModel() : super(type: 'music');
}

class AnnouncementsModel extends FileBrowserModel {
  AnnouncementsModel() : super(type: 'announcements');
}

class PlayerModel extends ChangeNotifier {
  final AudioPlayer player = AudioPlayer();
  String? currentTitle;
  Duration duration = Duration.zero;
  Duration position = Duration.zero;
  bool playing = false;
  List<String> _playlistTitles = [];
  double volume = 1.0;
  bool shuffleEnabled = false;
  LoopMode loopMode = LoopMode.off;
  double speed = 1.0;

  PlayerModel() {
    _init();
  }

  Future<void> _init() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
    await player.setVolume(volume);
    await player.setLoopMode(loopMode);
    await player.setShuffleModeEnabled(shuffleEnabled);
    await player.setSpeed(speed);
    player.playbackEventStream.listen((event) {
      duration = event.duration ?? Duration.zero;
      playing = player.playing;
      notifyListeners();
    });
    player.positionStream.listen((pos) {
      position = pos;
      notifyListeners();
    });
    player.currentIndexStream.listen((i) {
      if (i != null && i >= 0 && i < _playlistTitles.length) {
        currentTitle = _playlistTitles[i];
        notifyListeners();
      }
    });
  }

  List<String> get playlistTitles => _playlistTitles;

  Future<void> playUrl(String url, String title) async {
    currentTitle = title;
    final source = AudioSource.uri(
      Uri.parse(url),
      tag: MediaItem(
        id: url,
        title: title,
        artUri: Uri.parse('asset:///assets/logo.png'),
      ),
    );
    await player.setAudioSource(source);
    await player.play();
  }

  Future<void> playUrls(List<Map<String, String>> items) async {
    _playlistTitles = items.map((e) => e['title'] ?? '').toList();
    final sources = items.map((e) {
      final u = (e['url'] ?? '').toString();
      final t = (e['title'] ?? '').toString();
      if (u.isEmpty) return null;
      return AudioSource.uri(
        Uri.parse(u),
        tag: MediaItem(
          id: u,
          title: t.isEmpty ? 'Audio' : t,
          artUri: Uri.parse('asset:///assets/logo.png'),
        ),
      );
    }).whereType<AudioSource>().toList();
    if (sources.isEmpty) return;
    final playlist = ConcatenatingAudioSource(children: sources);
    await player.setAudioSource(playlist);
    currentTitle = _playlistTitles.isNotEmpty ? _playlistTitles.first : null;
    await player.play();
  }

  Future<void> pause() async {
    await player.pause();
  }

  Future<void> stop() async {
    await player.stop();
    duration = Duration.zero;
    position = Duration.zero;
    currentTitle = null;
    notifyListeners();
  }

  Future<void> seek(Duration d) async {
    await player.seek(d);
  }

  Future<void> setVol(double v) async {
    volume = v.clamp(0.0, 1.0);
    await player.setVolume(volume);
    notifyListeners();
  }

  Future<void> toggleShuffle() async {
    shuffleEnabled = !shuffleEnabled;
    await player.setShuffleModeEnabled(shuffleEnabled);
    notifyListeners();
  }

  Future<void> cycleLoopMode() async {
    if (loopMode == LoopMode.off) {
      loopMode = LoopMode.all;
    } else if (loopMode == LoopMode.all) {
      loopMode = LoopMode.one;
    } else {
      loopMode = LoopMode.off;
    }
    await player.setLoopMode(loopMode);
    notifyListeners();
  }

  Future<void> setPlaybackSpeed(double s) async {
    speed = s;
    await player.setSpeed(speed);
    notifyListeners();
  }

  Future<void> seekToIndex(int i) async {
    await player.seek(null, index: i);
  }
}

// --- Screens ---

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
      backgroundColor: Colors.black,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF121212), Color(0xFF000000)],
          ),
        ),
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
                    errorBuilder: (c, e, s) => const Icon(Icons.music_note, size: 80, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Sync2Gear',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 40),
                const Text('Email or Username', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextField(
                  controller: emailCtrl, 
                  decoration: const InputDecoration(hintText: 'Email or Username'),
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                const Text('Password', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextField(
                  controller: passCtrl, 
                  decoration: const InputDecoration(hintText: 'Password'), 
                  obscureText: true,
                  style: const TextStyle(color: Colors.white),
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
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Login failed')));
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
                      const Text('Quick Access (Tap to Copy)', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      const SizedBox(height: 12),
                      _demoRow('Admin', 'admin@sync2gear.com'),
                      const SizedBox(height: 8),
                      _demoRow('Client', 'client1@example.com'),
                    ],
                  ),
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
          Text('$label:', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(width: 8),
          Expanded(child: Text(email, style: const TextStyle(color: Color(0xFFB3B3B3), fontSize: 12))),
          const Icon(Icons.touch_app, size: 16, color: Color(0xFF1DB954)),
        ],
      ),
    );
  }
}

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
                  icon: const Icon(Icons.arrow_drop_down, color: Colors.white),
                  dropdownColor: const Color(0xFF2A2A2A),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  hint: const Text('Select Zone', style: TextStyle(color: Colors.white)),
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
                        await setSelectedZoneId(null);
                        context.read<ZoneModel>()._selectedZoneId = null;
                        context.read<ZoneModel>().zones = [];
                        await context.read<ZoneModel>().loadZones();
                        await context.read<MusicModel>().load();
                        await context.read<AnnouncementsModel>().load();
                      });
                    }
                    return DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selected,
                        icon: const Icon(Icons.arrow_drop_down, color: Colors.white),
                        dropdownColor: const Color(0xFF2A2A2A),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                        hint: const Text('Select Client', style: TextStyle(color: Colors.white)),
                        items: clients.map<DropdownMenuItem<String>>((c) {
                          final id = (c['id'] ?? '').toString();
                          final name = (c['name'] ?? c['business_name'] ?? 'Client').toString();
                          return DropdownMenuItem<String>(value: id, child: Text(name, overflow: TextOverflow.ellipsis));
                        }).toList(),
                        onChanged: (v) async {
                          _selectedClientId = v;
                          setState(() {});
                          await setImpersonateClientId(v ?? '');
                          await setSelectedZoneId(null);
                          context.read<ZoneModel>()._selectedZoneId = null;
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
              child: _MiniPlayer(),
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

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});
  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  String? _selectedZoneId;
  List<dynamic> _devices = [];
  Map<String, dynamic>? _playbackState;
  bool _loading = false;
  
  // Data
  List<dynamic> _allMusic = [];
  List<dynamic> _announcements = [];
  List<dynamic> _announcementFolders = [];
  List<dynamic> _schedules = [];
  
  // Selection State
  final Set<String> _selectedMusicIds = {};
  String? _selectedAnnouncementFolderId;
  
  // Sliders
  double _announcementInterval = 300; // seconds
  double _fadeDuration = 3;
  double _musicVolume = 20;
  double _announcementVolume = 100;

  // Announcement Logic
  Timer? _announcementTimer;
  int _nextAnnouncementIndex = 0;
  final AudioPlayer _metaPlayer = AudioPlayer();
  final Map<String, int> _durationCache = {};

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _announcementTimer?.cancel();
    _metaPlayer.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    setState(() => _loading = true);
    try {
      final zones = await getZones();
      if (zones.isNotEmpty) {
        _selectedZoneId = (zones.first['id'] ?? zones.first['zone_id']).toString();
        // Load initial data
        await Future.wait([
          _loadPlaybackState(),
          _loadContent(),
        ]);
      }
    } catch (e) {
      print(e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadPlaybackState() async {
    final zm = context.read<ZoneModel>();
    final zoneId = zm.selectedZoneId ?? _selectedZoneId;
    if (zoneId == null) return;
    try {
      final d = await getDevices(zoneId: zoneId);
      final s = await getPlaybackState(zoneId);
      if (mounted) {
        setState(() {
          _devices = d;
          _playbackState = s;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadContent() async {
    try {
      final zm = context.read<ZoneModel>();
      final zoneId = zm.selectedZoneId ?? _selectedZoneId;
      final m = await getMusicFiles(zoneId: zoneId);
      final a = await getAnnouncements(zoneId: zoneId);
      final f = await getFolders(type: 'announcements', zoneId: zoneId);
      final s = await getSchedules();
      if (mounted) {
        setState(() {
          _allMusic = m;
          _announcements = a;
          _announcementFolders = f;
          _schedules = s;
        });
      }
    } catch (_) {}
  }

  Future<void> _togglePlayback() async {
    final pm = context.read<PlayerModel>();
    final isPlaying = pm.player.playing || (_playbackState?['is_playing'] == true);
    if (!isPlaying && _selectedMusicIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select at least one music track')));
      return;
    }

    try {
      if (isPlaying) {
        await pm.pause();
        _announcementTimer?.cancel();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Playback paused (local)')));
      } else {
        final items = _allMusic.where((m) => _selectedMusicIds.contains((m['id'] ?? m['file_id'] ?? m['music_file_id'] ?? '').toString()))
          .map((m) => {
            'url': (m['stream_url'] ?? m['file_url'] ?? m['url'] ?? '').toString(),
            'title': (m['name'] ?? m['title'] ?? 'Unknown').toString(),
          }).where((e) => (e['url'] ?? '').isNotEmpty).toList();
        if (items.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Selected tracks have no URLs')));
          return;
        }
        await pm.playUrls(items);
        if (mounted) setState(() => _playbackState = {'is_playing': true});
        _startAnnouncementLoop();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Local playback started')));
      }
      // Refresh state
      await Future.delayed(const Duration(seconds: 1));
      await _loadPlaybackState();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e')));
    }
  }

  Future<String?> _pickZone(BuildContext context) async {
    final zones = context.read<ZoneModel>().zones;
    String? selected = zones.isNotEmpty ? (zones.first['id'] ?? zones.first['zone_id']).toString() : null;
    return await showDialog<String>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Select Target Zone'),
          content: DropdownButtonFormField<String>(
            value: selected,
            items: zones.map<DropdownMenuItem<String>>((z) {
              final id = (z['id'] ?? z['zone_id']).toString();
              return DropdownMenuItem(value: id, child: Text(z['name'] ?? 'Zone'));
            }).toList(),
            onChanged: (v) => selected = v,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, null), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, selected), child: const Text('Confirm')),
          ],
        );
      },
    );
  }

  Future<void> _transferSelectedMusicToZone(String targetZoneId) async {
    final ids = _selectedMusicIds.toList();
    for (final id in ids) {
      try {
        await updateMusicFile(id, zoneId: targetZoneId);
      } catch (_) {}
    }
    await _loadContent();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transferred selected music tracks')));
    }
  }

  Future<void> _copySelectedMusicToZone(String targetZoneId) async {
    final ids = _selectedMusicIds.toList();
    for (final id in ids) {
      try {
        await copyMusicFileToZone(id, targetZoneId);
      } catch (_) {}
    }
    await _loadContent();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied selected music tracks')));
    }
  }

  Future<void> _transferAnnouncementsFolderToZone(String targetZoneId, String folderId) async {
    try {
      final zm = context.read<ZoneModel>();
      final currentZoneId = zm.selectedZoneId ?? _selectedZoneId;
      final anns = await getAnnouncements(folderId: folderId, zoneId: currentZoneId);
      for (final a in anns) {
        final id = (a['id'] ?? a['announcement_id'] ?? '').toString();
        if (id.isEmpty) continue;
        try {
          await updateAnnouncement(id, zoneId: targetZoneId);
        } catch (_) {}
      }
      await _loadContent();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transferred announcements in selected folder')));
      }
    } catch (_) {}
  }

  Future<void> _copyAnnouncementsFolderToZone(String targetZoneId, String folderId) async {
    try {
      final zm = context.read<ZoneModel>();
      final currentZoneId = zm.selectedZoneId ?? _selectedZoneId;
      final anns = await getAnnouncements(folderId: folderId, zoneId: currentZoneId);
      for (final a in anns) {
        final title = (a['title'] ?? '').toString();
        final text = (a['text'] ?? '').toString();
        if (title.isEmpty || text.isEmpty) continue;
        try {
          await createTTSAnnouncement(title, text, folderId: folderId, zoneId: targetZoneId);
        } catch (_) {}
      }
      await _loadContent();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied announcements in selected folder')));
      }
    } catch (_) {}
  }

  void _startAnnouncementLoop() {
    _announcementTimer?.cancel();
    _nextAnnouncementIndex = 0;
    
    // Check for announcements immediately or wait for interval? 
    // Usually wait for interval.
    _announcementTimer = Timer.periodic(Duration(seconds: _announcementInterval.toInt()), (timer) {
      _playNextAnnouncement();
    });
    Timer(const Duration(seconds: 1), () {
      _playNextAnnouncement();
    });
  }

  Future<void> _playNextAnnouncement() async {
    final zm = context.read<ZoneModel>();
    final zoneId = zm.selectedZoneId ?? _selectedZoneId;
    if (zoneId == null) return;

    // Filter announcements
    final candidates = _announcements.where((a) {
      final folderId = (a['folder'] ?? a['folder_id'] ?? '').toString();
      if (_selectedAnnouncementFolderId != null) {
        return folderId == _selectedAnnouncementFolderId;
      }
      return true; // All enabled? Assuming 'enabled' field exists or all are enabled
    }).toList();

    if (candidates.isEmpty) return;

    if (_nextAnnouncementIndex >= candidates.length) {
      _nextAnnouncementIndex = 0;
    }
    
    final ann = candidates[_nextAnnouncementIndex];
    _nextAnnouncementIndex++;
    
    final annId = (ann['id'] ?? '').toString();
    final deviceIds = _devices.map((d) => (d['id'] ?? d['device_id'] ?? '').toString()).toList();
    if (deviceIds.isEmpty) {
      // Local announcement: duck music volume, play announcement, then restore
      final url = (ann['file_url'] ?? ann['url'] ?? '').toString();
      final title = (ann['title'] ?? 'Announcement').toString();
      if (url.isEmpty) return;
      try {
        final pm = context.read<PlayerModel>();
        final originalVol = pm.volume;
        final musicVol = (_musicVolume.clamp(0, 100) / 100).toDouble();
        final annVol = (_announcementVolume.clamp(0, 100) / 100).toDouble();
        final fade = _fadeDuration.clamp(0, 10).toInt();
        // Fade down
        if (fade > 0) {
          final steps = 6;
          for (int i = 1; i <= steps; i++) {
            final v = originalVol - (originalVol - musicVol) * (i / steps);
            await pm.setVol(v);
            await Future.delayed(Duration(milliseconds: (fade * 1000 / steps).round()));
          }
        } else {
          await pm.setVol(musicVol);
        }
        await _metaPlayer.setUrl(url);
        await _metaPlayer.setVolume(annVol);
        await _metaPlayer.play();
        // Wait until announcement completes
        await _metaPlayer.playerStateStream.firstWhere((s) => s.processingState == ProcessingState.completed);
        // Restore volume with fade up
        if (fade > 0) {
          final steps = 6;
          for (int i = 1; i <= steps; i++) {
            final v = musicVol + (originalVol - musicVol) * (i / steps);
            await pm.setVol(v);
            await Future.delayed(Duration(milliseconds: (fade * 1000 / steps).round()));
          }
        } else {
          await pm.setVol(originalVol);
        }
        await context.read<PlayerModel>().player.play();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Playing Announcement: $title'),
            duration: const Duration(seconds: 2),
            backgroundColor: const Color(0xFF1DB954),
          ));
        }
      } catch (e) {
        // Resume music if announcement fails
        await context.read<PlayerModel>().player.play();
      }
      return;
    }
    try {
      await playInstantAnnouncement(annId, deviceIds);
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(
           content: Text('Playing Announcement: ${ann['title'] ?? 'Unknown'}'),
           duration: const Duration(seconds: 3),
           backgroundColor: const Color(0xFF1DB954),
         ));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Announcement failed: $e')));
    }
  }

  String _formatDuration(double seconds) {
    if (seconds < 60) return '${seconds.toInt()}s';
    final mins = seconds ~/ 60;
    final secs = (seconds % 60).toInt();
    if (secs == 0) return '$mins min${mins != 1 ? 's' : ''}';
    return '${mins}m ${secs}s';
  }
  String _formatSecondsInt(int total) {
    if (total >= 3600) {
      final h = total ~/ 3600;
      final m = (total % 3600) ~/ 60;
      final s = total % 60;
      return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
    final m = total ~/ 60;
    final s = total % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
  Future<void> _probeDuration(String id, String url) async {
    if (id.isEmpty || url.isEmpty || _durationCache.containsKey(id)) return;
    try {
      await _metaPlayer.setUrl(url);
      final d = _metaPlayer.duration;
      if (d != null && mounted) {
        setState(() {
          _durationCache[id] = d.inSeconds;
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    
    // Sync with global zone
    final zoneModel = context.watch<ZoneModel>();
    if (zoneModel.selectedZoneId != _selectedZoneId && zoneModel.selectedZoneId != null) {
      _selectedZoneId = zoneModel.selectedZoneId;
      _loadPlaybackState();
      _selectedMusicIds.clear();
      _selectedAnnouncementFolderId = null;
      _loadContent();
    }

    final isPlaying = _playbackState?['is_playing'] == true;
    String zoneName = 'Selected Zone';
    if (_selectedZoneId != null && zoneModel.zones.isNotEmpty) {
       final z = zoneModel.zones.firstWhere((z) => (z['id'] ?? z['zone_id']).toString() == _selectedZoneId, orElse: () => {});
       if (z.isNotEmpty) zoneName = z['name'];
    }

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Stats Row
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _StatCard(title: 'Music Tracks', value: '${_allMusic.length}', icon: Icons.music_note, color: Colors.blue),
                  const SizedBox(width: 12),
                  _StatCard(title: 'Announcements', value: '${_announcements.length}', icon: Icons.campaign, color: Colors.green),
                  const SizedBox(width: 12),
                  _StatCard(title: 'Active Schedules', value: '${_schedules.length}', icon: Icons.calendar_today, color: Colors.purple), 
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 2. Live Playback Control Card
            Card(
              color: const Color(0xFF181818),
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.white.withOpacity(0.1))),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    const Row(
                      children: [
                        Icon(Icons.play_circle_filled, color: Color(0xFF1DB954)),
                        SizedBox(width: 8),
                        Text('Live Playback Control', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text('Control music and announcement playback across your zones', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    const SizedBox(height: 16),

                    // Zone Banner
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1DB954).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF1DB954).withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.speaker, color: Color(0xFF1DB954), size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Playing on: $zoneName', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                const Text('Change zone using the selector at the top of the page', style: TextStyle(color: Colors.grey, fontSize: 10)),
                                Text('Devices: ${_devices.length}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                Text('State: ${_playbackState?['is_playing'] == true ? 'PLAYING' : 'IDLE'}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                Text('Selected Tracks: ${_selectedMusicIds.length}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                Text('Announcement Folder: ${_selectedAnnouncementFolderId == null ? 'None' : (_announcementFolders.firstWhere((f) => (f['id'] ?? '').toString() == _selectedAnnouncementFolderId, orElse: () => {'name':'Unknown'})['name'] ?? 'Unknown')}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Music Selection
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Select Music Tracks', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        TextButton(
                          onPressed: () {
                            setState(() {
                              if (_selectedMusicIds.length == _allMusic.length) {
                                _selectedMusicIds.clear();
                              } else {
                                _selectedMusicIds.addAll(_allMusic.map((m) => (m['id'] ?? '').toString()));
                              }
                            });
                          },
                          child: Text(_selectedMusicIds.length == _allMusic.length ? 'Deselect All' : 'Select All'),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () async {
                            final targetZoneId = await _pickZone(context);
                            if (targetZoneId == null || _selectedMusicIds.isEmpty) return;
                            await _transferSelectedMusicToZone(targetZoneId);
                          },
                          icon: const Icon(Icons.redo, size: 18),
                          label: const Text('Transfer to Zone'),
                        ),
                        OutlinedButton.icon(
                          onPressed: () async {
                            final targetZoneId = await _pickZone(context);
                            if (targetZoneId == null || _selectedMusicIds.isEmpty) return;
                            await _copySelectedMusicToZone(targetZoneId);
                          },
                          icon: const Icon(Icons.copy_all, size: 18),
                          label: const Text('Copy to Zone'),
                        ),
                      ],
                    ),
                    Container(
                      height: 200,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2A2A2A),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: _allMusic.isEmpty 
                        ? const Center(child: Text('No music found', style: TextStyle(color: Colors.grey)))
                        : ListView.separated(
                            itemCount: _allMusic.length,
                            separatorBuilder: (_, __) => const Divider(height: 1, color: Colors.white10),
                            itemBuilder: (ctx, i) {
                              final m = _allMusic[i];
                            final id = (m['id'] ?? m['file_id'] ?? m['music_file_id'] ?? '').toString();
                              final url = (m['file_url'] ?? m['url'] ?? '').toString();
                              final isSelected = _selectedMusicIds.contains(id);
                              final rawDur = m['duration_seconds'] ?? m['duration'] ?? m['length_seconds'];
                              int? durSecs;
                              if (rawDur is int) {
                                durSecs = rawDur;
                              } else if (rawDur is String) {
                                durSecs = int.tryParse(rawDur);
                              } else {
                                durSecs = _durationCache[id];
                              }
                              if ((durSecs == null || durSecs == 0) && url.isNotEmpty) {
                                WidgetsBinding.instance.addPostFrameCallback((_) {
                                  _probeDuration(id, url);
                                });
                              }
                              return CheckboxListTile(
                                value: isSelected,
                                activeColor: const Color(0xFF1DB954),
                                checkColor: Colors.black,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                title: Text(m['name'] ?? 'Unknown', style: const TextStyle(color: Colors.white, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
                                subtitle: Text(durSecs == null ? '...' : _formatSecondsInt(durSecs), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                secondary: const Icon(Icons.music_note, color: Colors.grey),
                                onChanged: (v) {
                                  setState(() {
                                    if (v == true) {
                                      _selectedMusicIds.add(id);
                                    } else {
                                      _selectedMusicIds.remove(id);
                                    }
                                  });
                                },
                              );
                            },
                          ),
                    ),
                    const SizedBox(height: 24),

                    // Announcement Folder
                    const Text('Select Announcement Folder', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(filled: true, fillColor: Color(0xFF2A2A2A)),
                      initialValue: _selectedAnnouncementFolderId,
                      items: [
                        const DropdownMenuItem(value: null, child: Text('No Folder (All Enabled)')),
                        ..._announcementFolders.map((f) => DropdownMenuItem(
                          value: (f['id'] ?? '').toString(),
                          child: Text(f['name'] ?? 'Unknown'),
                        )),
                      ],
                      onChanged: (v) => setState(() => _selectedAnnouncementFolderId = v),
                      hint: const Text('No Folder (All Enabled)'),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () async {
                            if (_selectedAnnouncementFolderId == null) return;
                            final targetZoneId = await _pickZone(context);
                            if (targetZoneId == null) return;
                            await _transferAnnouncementsFolderToZone(targetZoneId, _selectedAnnouncementFolderId!);
                          },
                          icon: const Icon(Icons.redo, size: 18),
                          label: const Text('Transfer Folder to Zone'),
                        ),
                        OutlinedButton.icon(
                          onPressed: () async {
                            if (_selectedAnnouncementFolderId == null) return;
                            final targetZoneId = await _pickZone(context);
                            if (targetZoneId == null) return;
                            await _copyAnnouncementsFolderToZone(targetZoneId, _selectedAnnouncementFolderId!);
                          },
                          icon: const Icon(Icons.copy_all, size: 18),
                          label: const Text('Copy Folder to Zone'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Sliders
                    _buildSlider('Announcement Interval', _announcementInterval, 10, 1800, (v) => setState(() => _announcementInterval = v), _formatDuration(_announcementInterval)),
                    const SizedBox(height: 16),
                    _buildSlider('Fade Duration', _fadeDuration, 1, 10, (v) => setState(() => _fadeDuration = v), '${_fadeDuration.toInt()}s'),
                    const SizedBox(height: 16),
                    _buildSlider('Music Volume During Announcement', _musicVolume, 0, 100, (v) => setState(() => _musicVolume = v), '${_musicVolume.toInt()}%'),
                    const SizedBox(height: 16),
                    _buildSlider('Announcement Volume', _announcementVolume, 0, 100, (v) => setState(() => _announcementVolume = v), '${_announcementVolume.toInt()}%'),
                    const SizedBox(height: 32),

                    // Start/Stop Button
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton.icon(
                        onPressed: _togglePlayback,
                        icon: Icon(isPlaying ? Icons.pause : Icons.play_arrow),
                        label: Text(isPlaying ? 'Pause Playback' : 'Start Playback', style: const TextStyle(fontSize: 18)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isPlaying ? Colors.red : const Color(0xFF1DB954),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton(
                        onPressed: _playNextAnnouncement,
                        child: const Text('Play Announcement Now'),
                      ),
                    ),

                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSlider(String label, double value, double min, double max, ValueChanged<double> onChanged, String displayValue) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF2A2A2A), borderRadius: BorderRadius.circular(8)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFF1DB954), borderRadius: BorderRadius.circular(4)),
                child: Text(displayValue, style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: const Color(0xFF1DB954),
              inactiveTrackColor: Colors.grey[800],
              thumbColor: Colors.white,
              trackHeight: 4,
            ),
            child: Slider(
              value: value,
              min: min,
              max: max,
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF181818),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(title, style: const TextStyle(color: Colors.grey, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis)),
              Icon(icon, color: color, size: 16),
            ],
          ),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }
}

class MusicPage extends StatefulWidget {
  const MusicPage({super.key});
  @override
  State<MusicPage> createState() => _MusicPageState();
}

class _MusicPageState extends State<MusicPage> {
  String? _zoneId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MusicModel>().load();
      _loadZones();
    });
  }

  Future<void> _loadZones() async {
    try {
      final zones = await getZones();
      if (zones.isNotEmpty && mounted) {
        setState(() {
          _zoneId = (zones.first['id'] ?? zones.first['zone_id'] ?? '').toString();
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final music = context.watch<MusicModel>();
    final canGoBack = music.breadcrumbs.length > 1;
    final zoneModel = context.watch<ZoneModel>();
    final zoneId = zoneModel.selectedZoneId;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Music Library'),
        leading: canGoBack ? IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => music.exitFolder(),
        ) : null,
        actions: [
          IconButton(onPressed: () => music.load(folderId: music.currentFolderId), icon: const Icon(Icons.refresh)),
          IconButton(
            icon: const Icon(Icons.create_new_folder),
            onPressed: () => _showCreateFolderDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.upload_file),
            onPressed: () => _uploadFile(context),
          ),
        ],
      ),
      body: Column(
        children: [
          if (canGoBack)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFF181818),
              child: Text(
                music.breadcrumbs.map((e) => e['name']).join(' > '),
                style: const TextStyle(color: Colors.grey),
              ),
            ),
          
          Expanded(
            child: music.loading
                ? const Center(child: CircularProgressIndicator())
                : Padding(
                    padding: const EdgeInsets.all(16),
                    child: CustomScrollView(
                      slivers: [
                        // Folders Section (Grid)
                      if (music.folders.isNotEmpty) ...[
                        const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.only(bottom: 8), child: Text('FOLDERS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)))),
                        SliverGrid(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 1.2,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (ctx, i) {
                              final folder = music.folders[i];
                              return _FolderCard(
                                name: folder['name'] ?? 'Folder',
                                onTap: () => music.enterFolder((folder['id'] ?? '').toString(), folder['name'] ?? 'Folder'),
                                onPlay: zoneId == null ? null : () async {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Starting folder playback...')));
                                  try {
                                    final folderId = (folder['id'] ?? '').toString();
                                    final files = await getMusicFiles(folderId: folderId);
                                    final ids = files.map((f) => (f['id'] ?? '').toString()).toList();
                                    if (ids.isNotEmpty) {
                                      await playbackPlay(zoneId, musicFileIds: ids);
                                    } else {
                                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Folder is empty')));
                                    }
                                  } catch(e) {
                                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to play folder')));
                                  }
                                },
                              );
                            },
                            childCount: music.folders.length,
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 24)),
                      ],

                      // Files Section (List)
                      if (music.files.isNotEmpty) ...[
                        const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.only(bottom: 8), child: Text('SONGS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)))),
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (ctx, i) {
                              final file = music.files[i];
                              return _FileListItem(
                                file: file,
                                zoneId: zoneId,
                              );
                            },
                            childCount: music.files.length,
                          ),
                        ),
                      ]
                    ],
                  ),
                ),
          ),
        ],
      ),
    );
  }

  void _showCreateFolderDialog(BuildContext context) {
    final ctrl = TextEditingController();
    showDialog(
      context: context, 
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('New Music Folder', style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: ctrl,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(hintText: 'Folder Name'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await createFolder(ctrl.text, 'music', parentId: context.read<MusicModel>().currentFolderId);
                if (mounted) context.read<MusicModel>().load(folderId: context.read<MusicModel>().currentFolderId);
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to create folder')));
              }
            }, 
            child: const Text('Create')
          ),
        ],
      )
    );
  }

  Future<void> _uploadFile(BuildContext context) async {
    final result = await FilePicker.platform.pickFiles(type: FileType.audio);
    if (result != null && result.files.single.path != null) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploading...')));
      try {
        await uploadFile(
          result.files.single.path!, 
          'music', 
          folderId: context.read<MusicModel>().currentFolderId,
          title: result.files.single.name,
        );
        if (context.mounted) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploaded successfully')));
           context.read<MusicModel>().load(folderId: context.read<MusicModel>().currentFolderId);
        }
      } catch (e) {
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload failed')));
      }
    }
  }
}

class _FolderCard extends StatelessWidget {
  final String name;
  final VoidCallback onTap;
  final VoidCallback? onPlay;
  const _FolderCard({required this.name, required this.onTap, this.onPlay});
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Card(
        color: const Color(0xFF2A2A2A),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.folder, size: 64, color: Color(0xFF1DB954)),
            const SizedBox(height: 12),
            Text(name, style: const TextStyle(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
            if (onPlay != null)
              IconButton(
                icon: const Icon(Icons.play_circle_fill, color: Colors.white),
                onPressed: onPlay,
                tooltip: 'Play All in Folder',
              )
          ],
        ),
      ),
    );
  }
}

class _FileListItem extends StatelessWidget {
  final dynamic file;
  final String? zoneId;
  const _FileListItem({required this.file, this.zoneId});
  @override
  Widget build(BuildContext context) {
    final title = (file['title'] ?? file['name'] ?? 'Unknown').toString();
    final url = (file['file_url'] ?? file['url'] ?? '').toString();
    final id = (file['id'] ?? '').toString();
    
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF181818),
        borderRadius: BorderRadius.circular(4),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 48, height: 48,
          decoration: BoxDecoration(color: const Color(0xFF282828), borderRadius: BorderRadius.circular(4)),
          child: const Icon(Icons.music_note, color: Color(0xFFB3B3B3)),
        ),
        title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: const Text('Audio File', style: TextStyle(color: Colors.grey, fontSize: 12)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.play_circle_fill, color: Color(0xFF1DB954)),
              onPressed: url.isEmpty ? null : () {
                context.read<PlayerModel>().playUrl(url, title);
              },
            ),
            if (zoneId != null)
              IconButton(
                icon: const Icon(Icons.cast, color: Colors.white),
                onPressed: () async {
                   await playbackPlay(zoneId!, musicFileIds: [id]);
                   if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sent to Zone')));
                },
              ),
          ],
        ),
      ),
    );
  }
}

class AnnouncementsPage extends StatefulWidget {
  const AnnouncementsPage({super.key});
  @override
  State<AnnouncementsPage> createState() => _AnnouncementsPageState();
}

class _AnnouncementsPageState extends State<AnnouncementsPage> {
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AnnouncementsModel>().load();
    });
  }

  void _showCreateOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF2A2A2A),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Create Announcement', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _OptionItem(icon: Icons.keyboard, label: 'Writing', onTap: () { Navigator.pop(ctx); _showWritingDialog(); }),
                _OptionItem(icon: Icons.auto_awesome, label: 'AI', onTap: () { Navigator.pop(ctx); _showGenerateAIDialog(); }),
                _OptionItem(icon: Icons.mic, label: 'Record', onTap: () { Navigator.pop(ctx); _showRecordDialog(); }),
                _OptionItem(icon: Icons.upload_file, label: 'Upload', onTap: () { Navigator.pop(ctx); _uploadAnnouncement(); }),
              ],
            ),
          ],
        ),
      )
    );
  }

  void _showWritingDialog() {
    final titleCtrl = TextEditingController();
    final textCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('Text to Speech', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleCtrl, decoration: const InputDecoration(hintText: 'Title'), style: const TextStyle(color: Colors.white)),
            const SizedBox(height: 12),
            TextField(controller: textCtrl, decoration: const InputDecoration(hintText: 'Text to speak'), maxLines: 4, style: const TextStyle(color: Colors.white)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () { Navigator.pop(ctx); _saveGeneratedAnnouncement(titleCtrl.text, textCtrl.text); }, child: const Text('Create')),
        ],
      )
    );
  }

  void _showGenerateAIDialog() {
    final topicCtrl = TextEditingController();
    final toneCtrl = TextEditingController();
    final keyPointsCtrl = TextEditingController();
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('Generate with AI', style: TextStyle(color: Colors.white)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: topicCtrl, decoration: const InputDecoration(hintText: 'Topic (e.g. Closing Soon)'), style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 12),
              TextField(controller: toneCtrl, decoration: const InputDecoration(hintText: 'Tone (e.g. Friendly)'), style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 12),
              TextField(controller: keyPointsCtrl, decoration: const InputDecoration(hintText: 'Key Points'), maxLines: 3, style: const TextStyle(color: Colors.white)),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Generating...')));
              try {
                final results = await generateAIAnnouncement(topicCtrl.text, toneCtrl.text, keyPointsCtrl.text);
                if (mounted) _showAIResults(results);
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Generation failed')));
              }
            },
            child: const Text('Generate'),
          ),
        ],
      )
    );
  }

  void _showAIResults(List<Map<String, String>> results) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('AI Suggestions', style: TextStyle(color: Colors.white)),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: results.length,
            separatorBuilder: (_, __) => const Divider(color: Colors.grey),
            itemBuilder: (c, i) => ListTile(
              title: Text(results[i]['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(results[i]['text'] ?? '', maxLines: 3, overflow: TextOverflow.ellipsis),
              onTap: () {
                Navigator.pop(ctx);
                _saveGeneratedAnnouncement(results[i]['title']!, results[i]['text']!);
              },
            ),
          ),
        ),
      )
    );
  }

  void _showRecordDialog() {
    showDialog(
      context: context,
      builder: (ctx) => _RecorderDialog(
        onSave: (path, title) async {
          Navigator.pop(ctx);
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploading Recording...')));
          try {
             await uploadFile(path, 'announcement', folderId: context.read<AnnouncementsModel>().currentFolderId, title: title);
             if (context.mounted) {
               ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploaded successfully')));
               context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
             }
          } catch(e) {
             if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to upload')));
          }
        }
      )
    );
  }

  Future<void> _uploadAnnouncement() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.audio);
    if (result != null && result.files.single.path != null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploading...')));
      try {
        await uploadFile(
          result.files.single.path!, 
          'announcement', 
          folderId: context.read<AnnouncementsModel>().currentFolderId,
          title: result.files.single.name,
        );
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploaded successfully')));
           context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
        }
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload failed')));
      }
    }
  }

  Future<void> _saveGeneratedAnnouncement(String title, String text) async {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Creating TTS Announcement...')));
    try {
      await createTTSAnnouncement(title, text, folderId: context.read<AnnouncementsModel>().currentFolderId);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Created successfully')));
      if (mounted) context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save')));
    }
  }

  void _showCreateFolderDialog(BuildContext context) {
    final ctrl = TextEditingController();
    showDialog(
      context: context, 
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('New Announcement Folder', style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: ctrl,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(hintText: 'Folder Name'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await createFolder(ctrl.text, 'announcements', parentId: context.read<AnnouncementsModel>().currentFolderId);
                if (mounted) context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to create folder')));
              }
            }, 
            child: const Text('Create')
          ),
        ],
      )
    );
  }

  @override
  Widget build(BuildContext context) {
    final model = context.watch<AnnouncementsModel>();
    final canGoBack = model.breadcrumbs.length > 1;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Announcements'),
        leading: canGoBack ? IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => model.exitFolder(),
        ) : null,
        actions: [
           IconButton(onPressed: () => model.load(folderId: model.currentFolderId), icon: const Icon(Icons.refresh)),
           IconButton(
            icon: const Icon(Icons.create_new_folder),
            onPressed: () => _showCreateFolderDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.library_music),
            tooltip: 'Prebuilt',
            onPressed: () async {
              showDialog(
                context: context,
                builder: (ctx) => FutureBuilder<List<Map<String, dynamic>>>(
                  future: getAnnouncementTemplates(category: 'general', quantity: 8, tone: 'professional'),
                  builder: (ctx, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const AlertDialog(
                        backgroundColor: Color(0xFF2A2A2A),
                        title: Text('Loading...', style: TextStyle(color: Colors.white)),
                        content: LinearProgressIndicator(),
                      );
                    }
                    if (snap.hasError) {
                      return const AlertDialog(
                        backgroundColor: Color(0xFF2A2A2A),
                        title: Text('Failed to load', style: TextStyle(color: Colors.white)),
                        content: Text('Could not fetch templates', style: TextStyle(color: Colors.grey)),
                      );
                    }
                    final templates = snap.data ?? [];
                    return AlertDialog(
                      backgroundColor: const Color(0xFF2A2A2A),
                      title: const Text('Prebuilt Announcements', style: TextStyle(color: Colors.white)),
                      content: SizedBox(
                        width: 480,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            for (final t in templates) ...[
                              ListTile(
                                title: Text(t['title'] ?? 'Template', style: const TextStyle(color: Colors.white)),
                                subtitle: Text((t['script'] ?? t['text'] ?? '') as String, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.grey)),
                                trailing: FilledButton(
                                  onPressed: () async {
                                    Navigator.pop(ctx);
                                    await _saveGeneratedAnnouncement(t['title'] ?? 'Announcement', (t['script'] ?? t['text'] ?? '') as String);
                                  },
                                  child: const Text('Create'),
                                ),
                              ),
                              const Divider(color: Color(0xFF1E1E1E)),
                            ],
                          ],
                        ),
                      ),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
                        FilledButton(
                          onPressed: () async {
                            Navigator.pop(ctx);
                            final items = templates.map((t) => {
                              'title': t['title'],
                              'script': t['script'] ?? t['text'] ?? '',
                            }).toList();
                            await batchCreateTTSAnnouncements(items, folderId: context.read<AnnouncementsModel>().currentFolderId);
                            if (mounted) context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
                          },
                          child: const Text('Create All'),
                        ),
                      ],
                    );
                  },
                ),
              );
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateOptions,
        backgroundColor: const Color(0xFF1DB954),
        child: const Icon(Icons.add, color: Colors.black),
      ),
      body: model.loading 
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (canGoBack)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    color: const Color(0xFF181818),
                    child: Text(
                      model.breadcrumbs.map((e) => e['name']).join(' > '),
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ),
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.8,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: model.folders.length + model.files.length,
                    itemBuilder: (ctx, i) {
                      if (i < model.folders.length) {
                        final folder = model.folders[i];
                        return _FolderCard(
                          name: folder['name'] ?? 'Folder',
                          onTap: () => model.enterFolder((folder['id'] ?? '').toString(), folder['name'] ?? 'Folder'),
                        );
                      }
                      
                      final item = model.files[i - model.folders.length];
                      final title = (item['title'] ?? item['name'] ?? 'Unknown').toString();
                      final url = (item['file_url'] ?? item['url'] ?? '').toString();
                      
                      return Card(
                        clipBehavior: Clip.antiAlias,
                        color: const Color(0xFF181818),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Container(
                                color: const Color(0xFF282828),
                                width: double.infinity,
                                child: const Icon(Icons.campaign, size: 48, color: Colors.white),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.play_circle_fill, color: Color(0xFF1DB954), size: 28),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        onPressed: url.isEmpty ? null : () {
                                          context.read<PlayerModel>().playUrl(url, title);
                                        },
                                      ),
                                    ],
                                  )
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}

class _OptionItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _OptionItem({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          CircleAvatar(radius: 24, backgroundColor: const Color(0xFF282828), child: Icon(icon, color: Colors.white)),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
        ],
      ),
    );
  }
}

class _RecorderDialog extends StatefulWidget {
  final Function(String path, String title) onSave;
  const _RecorderDialog({required this.onSave});
  @override
  State<_RecorderDialog> createState() => _RecorderDialogState();
}

class _RecorderDialogState extends State<_RecorderDialog> {
  final AudioRecorder _recorder = AudioRecorder();
  bool _isRecording = false;
  String? _path;
  final _titleCtrl = TextEditingController(text: 'New Recording');

  @override
  void dispose() {
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_isRecording) {
      final path = await _recorder.stop();
      setState(() {
        _isRecording = false;
        _path = path;
      });
    } else {
      if (await Permission.microphone.request().isGranted) {
        final dir = await getApplicationDocumentsDirectory();
        final path = '${dir.path}/rec_${DateTime.now().millisecondsSinceEpoch}.m4a';
        await _recorder.start(const RecordConfig(), path: path);
        setState(() => _isRecording = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF2A2A2A),
      title: const Text('Record Audio', style: TextStyle(color: Colors.white)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(controller: _titleCtrl, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Recording Title')),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: _toggle,
            child: CircleAvatar(
              radius: 32,
              backgroundColor: _isRecording ? Colors.red : Colors.grey,
              child: Icon(_isRecording ? Icons.stop : Icons.mic, size: 32, color: Colors.white),
            ),
          ),
          const SizedBox(height: 12),
          Text(_isRecording ? 'Recording...' : (_path != null ? 'Recorded!' : 'Tap to Record'), style: const TextStyle(color: Colors.grey)),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          onPressed: _path != null ? () => widget.onSave(_path!, _titleCtrl.text) : null,
          child: const Text('Save & Upload'),
        ),
      ],
    );
  }
}

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
                                        }).toList(),
                                      ];
                                      return DropdownButtonFormField<String>(
                                        value: selectedFolderId ?? '',
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
                                          zoneId: zoneId,
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
            final profileName = (snap.data?[0] ?? auth.email ?? 'User')!;
            final avatarData = snap.data?[1];
            ImageProvider<Object>? avatarImage;
            if (avatarData != null) {
              if (avatarData.startsWith('data:')) {
                avatarImage = MemoryImage(base64Decode(avatarData.split(',').last));
              } else if (avatarData.startsWith('http')) {
                avatarImage = NetworkImage(avatarData);
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
                                  ? MemoryImage(base64Decode(newAvatar!.split(',').last))
                                  : (newAvatar != null && newAvatar!.startsWith('http'))
                                    ? NetworkImage(newAvatar!)
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
                                  final payload = {'name': nameCtrl.text.trim()};
                                  if (newAvatar != null) { payload['avatar'] = newAvatar; }
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
        ),
      ),
    );
  }
}

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
                value: role,
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
                      value: clientId,
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
                      value: selected,
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
                      leading: _UserAvatar(u),
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

String _generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#\$%^&*';
  final rnd = Random.secure();
  return List.generate(12, (_) => chars[rnd.nextInt(chars.length)]).join();
}

class _UserAvatar extends StatelessWidget {
  final Map<String, dynamic> user;
  const _UserAvatar(this.user);
  @override
  Widget build(BuildContext context) {
    final avatar = (user['avatar'] ?? '') as String;
    ImageProvider? img;
    if (avatar.startsWith('data:')) {
      try {
        final b64 = avatar.split(',').last;
        img = MemoryImage(base64Decode(b64));
      } catch (_) {}
    } else if (avatar.startsWith('http')) {
      img = NetworkImage(avatar);
    }
    return CircleAvatar(
      backgroundColor: const Color(0xFF2A2A2A),
      backgroundImage: img,
      child: img == null ? const Icon(Icons.person, color: Colors.white) : null,
    );
  }
}

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

class _MiniPlayer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerModel>();
    return GestureDetector(
      onTap: () {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: const Color(0xFF121212),
          builder: (ctx) {
            final p = ctx.watch<PlayerModel>();
            final total = p.duration.inSeconds;
            final pos = p.position.inSeconds.clamp(0, total);
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
              child: Container(
                height: MediaQuery.of(ctx).size.height * 0.9,
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: double.infinity,
                      height: 240,
                      decoration: BoxDecoration(
                        color: const Color(0xFF282828),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.album, color: Colors.white, size: 64),
                    ),
                    const SizedBox(height: 24),
                    Text(p.currentTitle ?? 'Now Playing', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Slider(
                      value: pos.toDouble(),
                      min: 0,
                      max: total > 0 ? total.toDouble() : 1.0,
                      onChanged: (v) => p.seek(Duration(seconds: v.toInt())),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('${p.position.inMinutes}:${(p.position.inSeconds % 60).toString().padLeft(2,'0')}', style: const TextStyle(color: Colors.white70)),
                        Text('${p.duration.inMinutes}:${(p.duration.inSeconds % 60).toString().padLeft(2,'0')}', style: const TextStyle(color: Colors.white70)),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(onPressed: () => p.player.seekToPrevious(), icon: const Icon(Icons.skip_previous, color: Colors.white, size: 32)),
                        const SizedBox(width: 24),
                        ElevatedButton(
                          onPressed: () => p.playing ? p.pause() : p.player.play(),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1DB954), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
                          child: Row(children: [Icon(p.playing ? Icons.pause : Icons.play_arrow), const SizedBox(width: 8), Text(p.playing ? 'Pause' : 'Play')]),
                        ),
                        const SizedBox(width: 24),
                        IconButton(onPressed: () => p.player.seekToNext(), icon: const Icon(Icons.skip_next, color: Colors.white, size: 32)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          onPressed: () => p.toggleShuffle(),
                          icon: Icon(Icons.shuffle, color: p.shuffleEnabled ? const Color(0xFF1DB954) : Colors.white),
                        ),
                        IconButton(
                          onPressed: () => p.cycleLoopMode(),
                          icon: Icon(
                            p.loopMode == LoopMode.one ? Icons.repeat_one : Icons.repeat,
                            color: p.loopMode == LoopMode.off ? Colors.white : const Color(0xFF1DB954),
                          ),
                        ),
                        PopupMenuButton<double>(
                          initialValue: p.speed,
                          onSelected: (v) => p.setPlaybackSpeed(v),
                          itemBuilder: (c) => [
                            const PopupMenuItem(value: 0.75, child: Text('0.75x')),
                            const PopupMenuItem(value: 1.0, child: Text('1.0x')),
                            const PopupMenuItem(value: 1.25, child: Text('1.25x')),
                            const PopupMenuItem(value: 1.5, child: Text('1.5x')),
                          ],
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(color: const Color(0xFF2A2A2A), borderRadius: BorderRadius.circular(6)),
                            child: Text('${p.speed.toStringAsFixed(2)}x'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        const Icon(Icons.volume_up, color: Colors.white),
                        Expanded(
                          child: Slider(
                            value: p.volume,
                            min: 0.0,
                            max: 1.0,
                            onChanged: (v) => p.setVol(v),
                          ),
                        ),
                        Text('${(p.volume*100).round()}%', style: const TextStyle(color: Colors.white70)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: Container(
                        width: double.infinity,
                        decoration: BoxDecoration(color: const Color(0xFF181818), borderRadius: BorderRadius.circular(8)),
                        child: ListView.builder(
                          itemCount: p.playlistTitles.length,
                          itemBuilder: (ctx2, i) {
                            final title = p.playlistTitles[i];
                            final isCurrent = p.player.currentIndex == i;
                            return ListTile(
                              leading: Icon(isCurrent ? Icons.play_arrow : Icons.music_note, color: isCurrent ? const Color(0xFF1DB954) : Colors.white),
                              title: Text(title.isEmpty ? 'Audio' : title, maxLines: 1, overflow: TextOverflow.ellipsis),
                              onTap: () => p.seekToIndex(i),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF282828),
          borderRadius: BorderRadius.circular(4),
        ),
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              color: const Color(0xFF121212),
              child: const Icon(Icons.music_note, color: Colors.white),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(player.currentTitle ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                  Text('${player.position.inMinutes}:${(player.position.inSeconds % 60).toString().padLeft(2,'0')}', style: const TextStyle(color: Color(0xFFB3B3B3), fontSize: 11)),
                ],
              ),
            ),
            IconButton(
              icon: Icon(player.playing ? Icons.pause : Icons.play_arrow, color: Colors.white),
              onPressed: () => player.playing ? player.pause() : player.player.play(),
            ),
          ],
        ),
      ),
    );
  }
}

class ThemeModel extends ChangeNotifier {
  ThemeMode mode = ThemeMode.dark;
  Timer? _timer;
  ThemeModel() {
    _apply();
  }
  void _apply() {
    final h = DateTime.now().hour;
    mode = (h >= 7 && h < 19) ? ThemeMode.light : ThemeMode.dark;
    _scheduleNext();
    notifyListeners();
  }
  void _scheduleNext() {
    _timer?.cancel();
    final now = DateTime.now();
    final next = () {
      if (mode == ThemeMode.light) {
        return DateTime(now.year, now.month, now.day, 19);
      } else {
        final tomorrow = now.add(const Duration(days: 1));
        return DateTime(tomorrow.year, tomorrow.month, tomorrow.day, 7);
      }
    }();
    final diff = next.difference(now);
    _timer = Timer(diff, _apply);
  }
}

final ThemeData _lightTheme = ThemeData(
  useMaterial3: true,
  brightness: Brightness.light,
  scaffoldBackgroundColor: const Color(0xFFF7F7F7),
  primaryColor: const Color(0xFF1DB954),
  colorScheme: const ColorScheme.light(
    primary: Color(0xFF1DB954),
    onPrimary: Colors.black,
    secondary: Color(0xFF1DB954),
    onSecondary: Colors.black,
    surface: Colors.white,
    onSurface: Colors.black,
    error: Color(0xFFE22134),
  ),
  cardColor: Colors.white,
  appBarTheme: const AppBarTheme(
    backgroundColor: Colors.white,
    elevation: 0,
    titleTextStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black),
    iconTheme: IconThemeData(color: Colors.black),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: Colors.white,
    selectedItemColor: Color(0xFF1DB954),
    unselectedItemColor: Color(0xFF606770),
    type: BottomNavigationBarType.fixed,
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: const Color(0xFF1DB954),
      foregroundColor: Colors.black,
      textStyle: const TextStyle(fontWeight: FontWeight.bold),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(500)),
      padding: const EdgeInsets.symmetric(vertical: 16),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: const Color(0xFFEDEDED),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide.none,
    ),
    hintStyle: const TextStyle(color: Color(0xFF606770)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
  ),
);

final ThemeData _darkTheme = ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  scaffoldBackgroundColor: const Color(0xFF121212),
  primaryColor: const Color(0xFF1DB954),
  colorScheme: const ColorScheme.dark(
    primary: Color(0xFF1DB954),
    onPrimary: Colors.black,
    secondary: Color(0xFF1DB954),
    onSecondary: Colors.black,
    surface: Color(0xFF121212),
    onSurface: Colors.white,
    error: Color(0xFFE22134),
  ),
  cardColor: const Color(0xFF181818),
  appBarTheme: const AppBarTheme(
    backgroundColor: Color(0xFF121212),
    elevation: 0,
    titleTextStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
    iconTheme: IconThemeData(color: Colors.white),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: Color(0xFA121212),
    selectedItemColor: Color(0xFF1DB954),
    unselectedItemColor: Color(0xFFB3B3B3),
    type: BottomNavigationBarType.fixed,
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: const Color(0xFF1DB954),
      foregroundColor: Colors.black,
      textStyle: const TextStyle(fontWeight: FontWeight.bold),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(500)),
      padding: const EdgeInsets.symmetric(vertical: 16),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: const Color(0xFF2A2A2A),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide.none,
    ),
    hintStyle: const TextStyle(color: Color(0xFFB3B3B3)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
  ),
);
