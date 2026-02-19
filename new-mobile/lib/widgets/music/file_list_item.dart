import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/player_model.dart';
import '../../services/api_service.dart';

class FileListItem extends StatelessWidget {
  final dynamic file;
  final String? zoneId;
  const FileListItem({super.key, required this.file, this.zoneId});
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

