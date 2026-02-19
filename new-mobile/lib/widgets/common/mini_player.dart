import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:just_audio/just_audio.dart';
import '../../models/player_model.dart';

class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});
  
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

