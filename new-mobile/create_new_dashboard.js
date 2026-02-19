const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');

// Find the dashboard body section and replace it with new design
// The new design should show:
// 1. Current playing song with duration/progress at top
// 2. Upcoming songs queue below
// 3. Announcement section side-by-side

// We'll insert a new dashboard widget after the stats row
const insertPoint = c.indexOf('// 2. Live Playback Control Card');
if (insertPoint > -1) {
  const before = c.substring(0, insertPoint);
  const after = c.substring(insertPoint);
  
  // New dashboard section
  const newDashboard = `
            // 2. Now Playing & Queue Section
            Builder(builder: (ctx) {
              final pm = ctx.watch<PlayerModel>();
              final isActuallyPlaying = pm.player.playing;
              final currentIdx = pm.player.currentIndex ?? 0;
              final totalTracks = pm.player.sequence?.length ?? 0;
              final currentPos = pm.position;
              final currentDur = pm.duration;
              
              // Get upcoming songs from playlist
              final upcomingSongs = <Map<String, dynamic>>[];
              if (totalTracks > 0 && currentIdx < totalTracks - 1) {
                for (int i = currentIdx + 1; i < totalTracks && i < currentIdx + 6; i++) {
                  final title = i < pm.playlistTitles.length ? pm.playlistTitles[i] : 'Track \${i + 1}';
                  upcomingSongs.add({'title': title, 'index': i});
                }
              }
              
              // Get announcement info
              final annCandidates = _announcements.where((a) {
                final enabled = a['enabled'] != false;
                if (!enabled) return false;
                if (_selectedAnnouncementFolderId != null && _selectedAnnouncementFolderId!.isNotEmpty) {
                  final folderId = (a['folder'] ?? a['folder_id'] ?? '').toString();
                  return folderId == _selectedAnnouncementFolderId;
                }
                return true;
              }).toList();
              
              final nextAnnIdx = _nextAnnouncementIndex < annCandidates.length ? _nextAnnouncementIndex : 0;
              final nextAnn = annCandidates.isNotEmpty ? annCandidates[nextAnnIdx] : null;
              final nextAnnTitle = nextAnn?['title'] ?? 'None';
              final nextAnnDur = nextAnn?['duration_seconds'] ?? nextAnn?['duration'] ?? 0;
              
              // Calculate countdown
              int secsLeft = _announcementInterval.toInt();
              if (_lastAnnouncementTime != null && isActuallyPlaying) {
                final elapsed = DateTime.now().difference(_lastAnnouncementTime!).inSeconds;
                secsLeft = (_announcementInterval.toInt() - elapsed).clamp(0, _announcementInterval.toInt());
              }
              
              if (!isActuallyPlaying) {
                return const SizedBox.shrink();
              }
              
              return Card(
                color: const Color(0xFF181818),
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                margin: const EdgeInsets.only(bottom: 16),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      const Row(
                        children: [
                          Icon(Icons.queue_music, color: Color(0xFF1DB954), size: 20),
                          SizedBox(width: 8),
                          Text('Now Playing', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Current Song
                      Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1DB954).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.music_note, color: Color(0xFF1DB954), size: 32),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  pm.currentTitle ?? 'Unknown',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Text(
                                      '\${_formatSecondsInt(currentPos.inSeconds)} / \${_formatSecondsInt(currentDur.inSeconds)}',
                                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Track \${currentIdx + 1} of \$totalTracks',
                                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                LinearProgressIndicator(
                                  value: currentDur.inSeconds > 0 ? currentPos.inSeconds / currentDur.inSeconds : 0,
                                  backgroundColor: Colors.grey[800],
                                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1DB954)),
                                  minHeight: 4,
                                ),
                              ],
                            ),
                          ),
                          // Announcement Section (Side-by-side)
                          Container(
                            width: 140,
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(left: 12),
                            decoration: BoxDecoration(
                              color: _isPlayingAnnouncement ? Colors.orange.withOpacity(0.15) : const Color(0xFF1E3A2A),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: _isPlayingAnnouncement ? Colors.orange : const Color(0xFF1DB954).withOpacity(0.3),
                                width: 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      _isPlayingAnnouncement ? Icons.campaign : Icons.access_time,
                                      size: 14,
                                      color: _isPlayingAnnouncement ? Colors.orange : const Color(0xFF1DB954),
                                    ),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        _isPlayingAnnouncement ? 'Broadcasting' : 'Next Announcement',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: _isPlayingAnnouncement ? Colors.orange : const Color(0xFF1DB954),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _isPlayingAnnouncement ? 'Playing...' : '\${_formatSecondsInt(secsLeft)}',
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  nextAnnTitle,
                                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (nextAnnDur > 0)
                                  Text(
                                    _formatSecondsInt(nextAnnDur),
                                    style: const TextStyle(fontSize: 9, color: Colors.grey),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Upcoming Songs
                      if (upcomingSongs.isNotEmpty) ...[
                        const Divider(color: Colors.white10),
                        const SizedBox(height: 8),
                        const Text('Upcoming', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                        const SizedBox(height: 8),
                        ...upcomingSongs.map((song) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              children: [
                                Container(
                                  width: 4,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1DB954).withOpacity(0.5),
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Icon(Icons.music_note, color: Colors.grey, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        song['title'] ?? 'Unknown',
                                        style: const TextStyle(fontSize: 13, color: Colors.white),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        'Track \${song['index'] + 1}',
                                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ],
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 16),
            
            // 3. Live Playback Control Card
`;

  c = before + newDashboard + after;
  console.log('✓ Created new dashboard layout');
}

fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');

