const fs = require('fs');
const p = 'lib/main.dart';
let c = fs.readFileSync(p, 'utf8');
const lines = c.split('\n');
let changes = 0;

function replace(desc, oldStr, newStr) {
  if (c.includes(oldStr)) { c = c.replace(oldStr, newStr); changes++; console.log('✓ ' + desc); }
  else console.log('✗ SKIP: ' + desc);
}

// ═══════════════════════════════════════════════════════════
// FIX 1: Status cards - Move ABOVE sliders so they show at top
// Also fix isPlaying to check actual player state
// ═══════════════════════════════════════════════════════════
// Move status cards from after sliders to BEFORE sliders
// Current order: Sliders → Status Cards → Start Button
// New order: Status Cards → Sliders → Start Button

// Remove cards from current location (after sliders)
replace('Remove status cards from below sliders',
  "                    const SizedBox(height: 32),\r\n\r\n                    // ── Status Cards: Now Playing + Next Announcement ──\r\n                    if (isPlaying) ...[",
  "                    const SizedBox(height: 32),\r\n\r\n                    // STATUS_CARDS_PLACEHOLDER\r\n                    if (false) ...[  // placeholder removed"
);

// Insert status cards ABOVE sliders  
replace('Insert status cards above sliders',
  "                    // Sliders\r\n                    _buildSlider('Announcement Interval',",
  "                    // ── Status Cards: Now Playing + Next Announcement ──\r\n                    Builder(builder: (ctx2) {\r\n                      final pmWatch = ctx2.watch<PlayerModel>();\r\n                      final actuallyPlaying = pmWatch.player.playing;\r\n                      if (!actuallyPlaying) return const SizedBox.shrink();\r\n                      final idx2 = pmWatch.player.currentIndex ?? 0;\r\n                      final total2 = pmWatch.player.sequence?.length ?? 0;\r\n                      final nowTitle2 = pmWatch.currentTitle ?? 'Playing...';\r\n                      final elapsed2 = _playbackStartTime != null ? DateTime.now().difference(_playbackStartTime!) : Duration.zero;\r\n                      final hh2 = elapsed2.inHours.toString().padLeft(2,'0');\r\n                      final mm2s = (elapsed2.inMinutes % 60).toString().padLeft(2,'0');\r\n                      final ss2 = (elapsed2.inSeconds % 60).toString().padLeft(2,'0');\r\n                      final candidates2 = _announcements.where((a) { final fid2=(a['folder']??a['folder_id']??'').toString(); return _selectedAnnouncementFolderId==null||fid2==_selectedAnnouncementFolderId; }).toList();\r\n                      final nextAnnName2 = candidates2.isNotEmpty ? (candidates2[_nextAnnouncementIndex<candidates2.length?_nextAnnouncementIndex:0]['title']??'Announcement').toString() : 'None';\r\n                      int secsLeft2 = _announcementInterval.toInt();\r\n                      if (_lastAnnouncementTime != null) { final el=DateTime.now().difference(_lastAnnouncementTime!).inSeconds; secsLeft2=(_announcementInterval.toInt()-el).clamp(0,_announcementInterval.toInt()); }\r\n                      final mm2c = (secsLeft2~/60).toString().padLeft(2,'0');\r\n                      final ss2c = (secsLeft2%60).toString().padLeft(2,'0');\r\n                      return Column(children: [\r\n                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [\r\n                          Expanded(child: Container(\r\n                            padding: const EdgeInsets.all(12),\r\n                            decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF1DB954).withOpacity(0.4))),\r\n                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [\r\n                              Row(children: [Container(width:22,height:22,decoration:BoxDecoration(color:const Color(0xFF1DB954),borderRadius:BorderRadius.circular(5)),child:const Icon(Icons.music_note,color:Colors.black,size:13)), const SizedBox(width:6), const Text('Now Playing',style:TextStyle(fontWeight:FontWeight.bold,fontSize:12,color:Colors.white))]),\r\n                              const SizedBox(height:6),\r\n                              Text(nowTitle2,style:const TextStyle(fontSize:13,color:Colors.white,fontWeight:FontWeight.w500),maxLines:2,overflow:TextOverflow.ellipsis),\r\n                              const SizedBox(height:3),\r\n                              Text('Track \${idx2+1} of \$total2 · Looping',style:const TextStyle(fontSize:11,color:Color(0xFF1DB954))),\r\n                              const SizedBox(height:4),\r\n                              Row(children:[const Icon(Icons.timer_outlined,size:12,color:Colors.grey),const SizedBox(width:3),Text('\$hh2:\$mm2s:\$ss2',style:const TextStyle(fontSize:11,color:Colors.grey))]),\r\n                            ]),\r\n                          )),\r\n                          const SizedBox(width:10),\r\n                          Expanded(child: Container(\r\n                            padding: const EdgeInsets.all(12),\r\n                            decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(10), border: Border.all(color: _isPlayingAnnouncement?Colors.orange.withOpacity(0.5):const Color(0xFF2A5A3A).withOpacity(0.5))),\r\n                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [\r\n                              Row(children: [Container(width:22,height:22,decoration:BoxDecoration(color:_isPlayingAnnouncement?Colors.orange:const Color(0xFF2A5A3A),borderRadius:BorderRadius.circular(5)),child:const Icon(Icons.campaign,color:Colors.white,size:13)), const SizedBox(width:6), Expanded(child:Text(_isPlayingAnnouncement?'Broadcasting':'Next Ann.',overflow:TextOverflow.ellipsis,style:const TextStyle(fontWeight:FontWeight.bold,fontSize:12,color:Colors.white)))]),\r\n                              const SizedBox(height:6),\r\n                              Text(nextAnnName2,style:const TextStyle(fontSize:12,color:Colors.white),maxLines:2,overflow:TextOverflow.ellipsis),\r\n                              const SizedBox(height:4),\r\n                              Container(padding:const EdgeInsets.symmetric(horizontal:6,vertical:3),decoration:BoxDecoration(color:_isPlayingAnnouncement?Colors.orange.withOpacity(0.15):const Color(0xFF1E3A2A),borderRadius:BorderRadius.circular(5)),\r\n                                child:Row(mainAxisSize:MainAxisSize.min,children:[Icon(_isPlayingAnnouncement?Icons.volume_up:Icons.access_time,size:11,color:_isPlayingAnnouncement?Colors.orange:const Color(0xFF1DB954)),const SizedBox(width:3),Text(_isPlayingAnnouncement?'Playing...':'In \$mm2c:\$ss2c',style:TextStyle(fontSize:11,color:_isPlayingAnnouncement?Colors.orange:const Color(0xFF1DB954),fontWeight:FontWeight.bold))])),\r\n                              if (candidates2.length>1) ...[const SizedBox(height:3),Text('\${candidates2.length-1} more',style:const TextStyle(fontSize:10,color:Colors.grey))],\r\n                              const SizedBox(height:6),\r\n                              SizedBox(width:double.infinity,height:28,child:OutlinedButton(onPressed:_isPlayingAnnouncement?null:_playNextAnnouncement,style:OutlinedButton.styleFrom(foregroundColor:const Color(0xFF1DB954),side:const BorderSide(color:Color(0xFF1DB954)),padding:EdgeInsets.zero),child:const Text('Play Now',style:TextStyle(fontSize:11)))),\r\n                            ]),\r\n                          )),\r\n                        ]),\r\n                        const SizedBox(height:16),\r\n                      ]);\r\n                    }),\r\n\r\n                    // Sliders\r\n                    _buildSlider('Announcement Interval',"
);

// ═══════════════════════════════════════════════════════════
// FIX 2: Folder loop - guard against empty fid in Music page
// ═══════════════════════════════════════════════════════════
replace('Music: guard empty fid in enterFolder',
  "                              return _FolderListTile(\r\n                                name: folder['name'] ?? 'Folder',\r\n                                onTap: () => music.enterFolder(fid, folder['name'] ?? 'Folder'),",
  "                              return _FolderListTile(\r\n                                name: folder['name'] ?? 'Folder',\r\n                                onTap: fid.isEmpty ? null : () => music.enterFolder(fid, folder['name'] ?? 'Folder'),"
);

// ═══════════════════════════════════════════════════════════
// FIX 3: Folder loop - guard in Announcements page  
// ═══════════════════════════════════════════════════════════
replace('Announcements: guard empty fid in enterFolder',
  "                          return _FolderListTile(\r\n                            name: folder['name'] ?? 'Folder',\r\n                            onTap: () => model.enterFolder(fid, folder['name'] ?? 'Folder'),",
  "                          return _FolderListTile(\r\n                            name: folder['name'] ?? 'Folder',\r\n                            onTap: fid.isEmpty ? null : () => model.enterFolder(fid, folder['name'] ?? 'Folder'),"
);

// ═══════════════════════════════════════════════════════════
// FIX 4: isPlaying for Start/Stop buttons - use actual player state
// ═══════════════════════════════════════════════════════════
replace('Dashboard: isPlaying uses actual player state',
  "    final isPlaying = _playbackState?['is_playing'] == true;\r\n    final player = context.watch<PlayerModel>();",
  "    final player = context.watch<PlayerModel>();\r\n    final isPlaying = player.player.playing || (_playbackState?['is_playing'] == true);"
);

// ═══════════════════════════════════════════════════════════  
// FIX 5: Remove old status cards placeholder
// ═══════════════════════════════════════════════════════════
replace('Remove placeholder',
  "                    // STATUS_CARDS_PLACEHOLDER\r\n                    if (false) ...[  // placeholder removed",
  ""
);

// Also need to close the old if block that was replaced
// Find and remove the leftover closing from old status cards
// The old cards end with:  ], const SizedBox(height: 20),  ],
replace('Remove old status cards closing brackets',
  "                      const SizedBox(height: 20),\r\n                    ],\r\n                    // Start/Stop Button",
  "                    // Start/Stop Button"
);

// ═══════════════════════════════════════════════════════════
// FIX 6: TTS announcement - ensure createTTSAnnouncement dialog works
// The issue is that after patching, the zone context might be missing
// ═══════════════════════════════════════════════════════════

fs.writeFileSync(p + '.tmp', c, 'utf8');
console.log('\n=== DONE: ' + changes + ' changes ===');
const o=(c.match(/{/g)||[]).length;
const cl=(c.match(/}/g)||[]).length;
const op=(c.match(/\(/g)||[]).length;
const cp=(c.match(/\)/g)||[]).length;
console.log('Braces:', o-cl, 'Parens:', op-cp);

