import 'package:flutter/material.dart';
import '../api.dart';

class MusicScreen extends StatefulWidget {
  const MusicScreen({super.key});

  @override
  State<MusicScreen> createState() => _MusicScreenState();
}

class _MusicScreenState extends State<MusicScreen> {
  List<dynamic> _music = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadMusic();
  }

  Future<void> _loadMusic() async {
    setState(() => _loading = true);
    try {
      final music = await getMusicFiles();
      setState(() => _music = music);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load music: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Music'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMusic,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _music.isEmpty
              ? const Center(child: Text('No music files found'))
              : ListView.builder(
                  itemCount: _music.length,
                  itemBuilder: (context, index) {
                    final music = _music[index];
                    final title = music['title']?.toString() ?? music['name']?.toString() ?? 'Unknown';
                    final artist = music['artist']?.toString() ?? '';
                    
                    return ListTile(
                      leading: const Icon(Icons.music_note),
                      title: Text(title),
                      subtitle: Text(artist),
                      trailing: IconButton(
                        icon: const Icon(Icons.play_arrow),
                        onPressed: () {
                          // Play preview
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Playing: $title')),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}

