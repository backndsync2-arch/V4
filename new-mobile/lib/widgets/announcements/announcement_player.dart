import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/player_model.dart';

class AnnouncementPlayer extends StatelessWidget {
  const AnnouncementPlayer({super.key});

  String _formatDuration(Duration d) {
    final mins = d.inMinutes;
    final secs = d.inSeconds % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final pm = context.watch<PlayerModel>();
    
    if (!pm.annPlaying && pm.currentAnnouncementTitle == null) {
      return const SizedBox.shrink();
    }

    return Card(
      color: const Color(0xFF181818),
      elevation: 4,
      margin: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(Icons.campaign, color: Color(0xFF1DB954), size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Now Playing Announcement',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () async {
                    await pm.annPlayer.stop();
                    pm.currentAnnouncementTitle = null;
                  },
                  tooltip: 'Stop',
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.campaign, color: Colors.orange, size: 32),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pm.currentAnnouncementTitle ?? 'Announcement',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_formatDuration(pm.annPosition)} / ${_formatDuration(pm.annDuration)}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: pm.annDuration.inSeconds > 0 
                          ? pm.annPosition.inSeconds / pm.annDuration.inSeconds 
                          : 0,
                        backgroundColor: Colors.grey[800],
                        valueColor: const AlwaysStoppedAnimation<Color>(Colors.orange),
                        minHeight: 4,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  icon: Icon(
                    pm.annPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
                    color: Colors.orange,
                    size: 40,
                  ),
                  onPressed: () async {
                    if (pm.annPlaying) {
                      await pm.annPlayer.pause();
                    } else {
                      await pm.annPlayer.play();
                    }
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

