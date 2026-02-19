import 'package:flutter/material.dart';

class FolderCard extends StatelessWidget {
  final String name;
  final VoidCallback onTap;
  final VoidCallback? onPlay;
  const FolderCard({super.key, required this.name, required this.onTap, this.onPlay});
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

