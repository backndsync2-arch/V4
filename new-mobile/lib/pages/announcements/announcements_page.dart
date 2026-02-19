import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:just_audio/just_audio.dart';
import '../../models/announcements_model.dart';
import '../../models/player_model.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/music/folder_card.dart';
import '../../widgets/announcements/option_item.dart';
import '../../widgets/announcements/recorder_dialog.dart';
import '../../widgets/announcements/announcement_player.dart';

class AnnouncementsPage extends StatefulWidget {
  const AnnouncementsPage({super.key});
  @override
  State<AnnouncementsPage> createState() => _AnnouncementsPageState();
}

class _AnnouncementsPageState extends State<AnnouncementsPage> {
  
  // Helper function to normalize announcement URLs
  String _normalizeAnnouncementUrl(String url) {
    if (url.isEmpty) return '';
    
    // Remove leading/trailing whitespace and URL-encoded spaces
    url = url.trim().replaceAll('%20', '').replaceAll(' ', '');
    
    const apiBase = 'https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1';
    
    // If URL already contains the base URL, check for duplication
    if (url.contains(apiBase)) {
      // Find all occurrences of the base URL
      final baseUrlPattern = apiBase.replaceAll('/', r'\/');
      final matches = RegExp(baseUrlPattern).allMatches(url);
      
      // If there are multiple occurrences, keep only the last one
      if (matches.length > 1) {
        final lastMatch = matches.last;
        url = url.substring(lastMatch.start);
      }
    }
    
    // If it's a relative URL starting with /api/, prepend base URL
    if (url.startsWith('/api/')) {
      return '$apiBase${url.substring(4)}';
    }
    
    // If it's a relative URL, prepend base URL
    if (url.startsWith('/')) {
      return '$apiBase$url';
    }
    
    // If it's already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    return url;
  }
  
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
                OptionItem(icon: Icons.keyboard, label: 'Writing', onTap: () { Navigator.pop(ctx); _showWritingDialog(); }),
                OptionItem(icon: Icons.auto_awesome, label: 'AI', onTap: () { Navigator.pop(ctx); _showGenerateAIDialog(); }),
                OptionItem(icon: Icons.mic, label: 'Record', onTap: () { Navigator.pop(ctx); _showRecordDialog(); }),
                OptionItem(icon: Icons.upload_file, label: 'Upload', onTap: () { Navigator.pop(ctx); _uploadAnnouncement(); }),
              ],
            ),
          ],
        ),
      )
    );
  }

  void _showWritingDialog() async {
    final titleCtrl = TextEditingController();
    final textCtrl = TextEditingController();
    String? selectedVoice = 'fable';
    String? selectedFolderId = context.read<AnnouncementsModel>().currentFolderId;
    List<Map<String, dynamic>> voices = [];
    List<dynamic> folders = [];
    
    try {
      voices = await getTTSVoices();
      folders = await getFolders(type: 'announcements', parentId: selectedFolderId);
    } catch (e) {
      print('Error loading voices/folders: $e');
    }
    
    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            backgroundColor: const Color(0xFF2A2A2A),
            title: const Text('Text to Speech', style: TextStyle(color: Colors.white)),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: titleCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Title',
                      hintStyle: TextStyle(color: Colors.white54),
                    ),
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: textCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Text to speak',
                      hintStyle: TextStyle(color: Colors.white54),
                    ),
                    maxLines: 4,
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 16),
                  const Text('Select Voice', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: voices.map((voice) {
                      final isSelected = selectedVoice == voice['id'];
                      final gender = voice['gender'] ?? 'neutral';
                      return GestureDetector(
                        onTap: () => setDialogState(() => selectedVoice = voice['id']),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF1DB954).withOpacity(0.2) : Colors.transparent,
                            border: Border.all(
                              color: isSelected ? const Color(0xFF1DB954) : Colors.white24,
                              width: isSelected ? 2 : 1,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                gender == 'male' ? Icons.mic : Icons.mic_none,
                                color: isSelected ? const Color(0xFF1DB954) : Colors.white70,
                                size: 24,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                voice['name'] ?? voice['id'],
                                style: TextStyle(
                                  color: isSelected ? const Color(0xFF1DB954) : Colors.white70,
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  const Text('Select Folder', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      filled: true,
                      fillColor: Color(0xFF1E1E1E),
                    ),
                    value: selectedFolderId,
                    items: [
                      const DropdownMenuItem(value: null, child: Text('Root Folder', style: TextStyle(color: Colors.white))),
                      ...folders.map((f) => DropdownMenuItem(
                        value: (f['id'] ?? '').toString(),
                        child: Text(f['name'] ?? 'Folder', style: const TextStyle(color: Colors.white)),
                      )),
                    ],
                    onChanged: (v) => setDialogState(() => selectedFolderId = v),
                    style: const TextStyle(color: Colors.white),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _saveGeneratedAnnouncement(
                    titleCtrl.text,
                    textCtrl.text,
                    voice: selectedVoice,
                    folderId: selectedFolderId,
                  );
                },
                child: const Text('Create'),
              ),
            ],
          ),
        ),
      );
    }
  }

  void _showGenerateAIDialog() async {
    final topicCtrl = TextEditingController();
    final toneCtrl = TextEditingController();
    final keyPointsCtrl = TextEditingController();
    String? selectedVoice = 'fable';
    String? selectedFolderId = context.read<AnnouncementsModel>().currentFolderId;
    int quantity = 3;
    List<Map<String, dynamic>> voices = [];
    List<dynamic> folders = [];
    
    try {
      voices = await getTTSVoices();
      folders = await getFolders(type: 'announcements', parentId: selectedFolderId);
    } catch (e) {
      print('Error loading voices/folders: $e');
    }
    
    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            backgroundColor: const Color(0xFF2A2A2A),
            title: const Text('Generate with AI', style: TextStyle(color: Colors.white)),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: topicCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Topic (e.g. Closing Soon)',
                      hintStyle: TextStyle(color: Colors.white54),
                    ),
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: toneCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Tone (e.g. Friendly)',
                      hintStyle: TextStyle(color: Colors.white54),
                    ),
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: keyPointsCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Key Points',
                      hintStyle: TextStyle(color: Colors.white54),
                    ),
                    maxLines: 3,
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 16),
                  const Text('Number of Scripts', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle, color: Colors.white),
                        onPressed: quantity > 1 ? () => setDialogState(() => quantity--) : null,
                      ),
                      Text('$quantity', style: const TextStyle(color: Colors.white, fontSize: 18)),
                      IconButton(
                        icon: const Icon(Icons.add_circle, color: Colors.white),
                        onPressed: quantity < 10 ? () => setDialogState(() => quantity++) : null,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text('Select Voice', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: voices.map((voice) {
                      final isSelected = selectedVoice == voice['id'];
                      final gender = voice['gender'] ?? 'neutral';
                      return GestureDetector(
                        onTap: () => setDialogState(() => selectedVoice = voice['id']),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF1DB954).withOpacity(0.2) : Colors.transparent,
                            border: Border.all(
                              color: isSelected ? const Color(0xFF1DB954) : Colors.white24,
                              width: isSelected ? 2 : 1,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                gender == 'male' ? Icons.mic : Icons.mic_none,
                                color: isSelected ? const Color(0xFF1DB954) : Colors.white70,
                                size: 24,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                voice['name'] ?? voice['id'],
                                style: TextStyle(
                                  color: isSelected ? const Color(0xFF1DB954) : Colors.white70,
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  const Text('Select Folder', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      filled: true,
                      fillColor: Color(0xFF1E1E1E),
                    ),
                    value: selectedFolderId,
                    items: [
                      const DropdownMenuItem(value: null, child: Text('Root Folder', style: TextStyle(color: Colors.white))),
                      ...folders.map((f) => DropdownMenuItem(
                        value: (f['id'] ?? '').toString(),
                        child: Text(f['name'] ?? 'Folder', style: const TextStyle(color: Colors.white)),
                      )),
                    ],
                    onChanged: (v) => setDialogState(() => selectedFolderId = v),
                    style: const TextStyle(color: Colors.white),
                  ),
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
                    final results = await generateAIAnnouncement(topicCtrl.text, toneCtrl.text, keyPointsCtrl.text, quantity: quantity);
                    if (mounted) _showAIResults(results, voice: selectedVoice, folderId: selectedFolderId);
                  } catch (e) {
                    if (mounted) {
                      final errorMsg = e.toString().replaceAll('Exception: ', '');
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Generation failed: ${errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg}'),
                          duration: const Duration(seconds: 5),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                },
                child: const Text('Generate'),
              ),
            ],
          ),
        ),
      );
    }
  }

  void _showAIResults(List<Map<String, String>> results, {String? voice, String? folderId}) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A2A2A),
        title: const Text('AI Suggestions', style: TextStyle(color: Colors.white)),
        content: SizedBox(
          width: double.maxFinite,
          height: 400,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: results.length,
            separatorBuilder: (_, __) => const Divider(color: Colors.grey),
            itemBuilder: (c, i) => ListTile(
              title: Text(results[i]['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              subtitle: Text(results[i]['text'] ?? '', maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.grey)),
              onTap: () {
                Navigator.pop(ctx);
                _saveGeneratedAnnouncement(
                  results[i]['title']!,
                  results[i]['text']!,
                  voice: voice,
                  folderId: folderId,
                );
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
      builder: (ctx) => RecorderDialog(
            onSave: (path, title) async {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploading Recording to S3...')));
              try {
                 final zoneId = await getSelectedZoneId();
                 await uploadFileToS3(
                   path,
                   'announcement_${DateTime.now().millisecondsSinceEpoch}.mp3',
                   folderId: context.read<AnnouncementsModel>().currentFolderId,
                   zoneId: zoneId,
                   title: title,
                 );
                 if (context.mounted) {
                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploaded successfully to S3')));
                   // Add small delay to ensure backend has processed the upload
                   await Future.delayed(const Duration(milliseconds: 500));
                   context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
                 }
              } catch(e) {
                 if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to upload: ${e.toString()}')));
              }
            }
      )
    );
  }

  Future<void> _uploadAnnouncement() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.audio);
    if (result != null && result.files.single.path != null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploading to S3...')));
      try {
        final zoneId = await getSelectedZoneId();
        await uploadFileToS3(
          result.files.single.path!, 
          'announcement_${DateTime.now().millisecondsSinceEpoch}.mp3', 
          folderId: context.read<AnnouncementsModel>().currentFolderId,
          zoneId: zoneId,
          title: result.files.single.name,
        );
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploaded successfully to S3')));
           // Add small delay to ensure backend has processed the upload
           await Future.delayed(const Duration(milliseconds: 500));
           context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
        }
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: ${e.toString()}')));
      }
    }
  }

  Future<void> _saveGeneratedAnnouncement(String title, String text, {String? voice, String? folderId}) async {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Creating announcement...')));
    try {
      // Get zoneId to ensure announcement is created in the correct zone
      final zoneId = await getSelectedZoneId();
      // Determine the folderId to use - use the provided folderId, or currentFolderId if not provided
      // If folderId is explicitly null (user selected "Root Folder"), pass null to create in root
      final targetFolderId = folderId ?? context.read<AnnouncementsModel>().currentFolderId;
      print('Creating announcement - folderId: $targetFolderId (provided: $folderId, current: ${context.read<AnnouncementsModel>().currentFolderId})');
      
      // Step 1: Create the announcement (with placeholder URL)
      final created = await createTTSAnnouncement(
        title,
        text,
        voice: voice,
        folderId: targetFolderId, // Use the determined folderId
        zoneId: zoneId,
      );
      final announcementId = (created['id'] ?? '').toString();
      
      if (announcementId.isEmpty) {
        throw Exception('Failed to get announcement ID after creation');
      }
      
      // Step 2: Generate the actual audio file
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Generating audio... This may take a few seconds.'),
            duration: Duration(seconds: 3),
          ),
        );
      }
      
      try {
        await regenerateTTSAnnouncement(announcementId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Announcement created and audio generated successfully!'),
              backgroundColor: Color(0xFF1DB954),
              duration: Duration(seconds: 3),
            ),
          );
          // Add small delay to ensure backend has processed the creation
          await Future.delayed(const Duration(milliseconds: 500));
          // Reload the folder where the announcement was created (not necessarily the current folder)
          final targetFolderId = folderId ?? context.read<AnnouncementsModel>().currentFolderId;
          print('Reloading folder: $targetFolderId');
          context.read<AnnouncementsModel>().load(folderId: targetFolderId);
        }
      } catch (audioError) {
        // Announcement was created but audio generation failed
        if (mounted) {
          final errorMsg = audioError.toString().replaceAll('Exception: ', '');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Announcement created but audio generation failed: ${errorMsg.length > 80 ? errorMsg.substring(0, 80) + "..." : errorMsg}. You can regenerate audio later.'),
              duration: const Duration(seconds: 6),
              backgroundColor: Colors.orange,
            ),
          );
          // Add small delay to ensure backend has processed the creation
          await Future.delayed(const Duration(milliseconds: 500));
          // Reload the folder where the announcement was created (not necessarily the current folder)
          final targetFolderId = folderId ?? context.read<AnnouncementsModel>().currentFolderId;
          print('Reloading folder after audio error: $targetFolderId');
          context.read<AnnouncementsModel>().load(folderId: targetFolderId);
        }
      }
    } catch (e) {
      if (mounted) {
        final errorMsg = e.toString().replaceAll('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create: ${errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg}'),
            duration: const Duration(seconds: 5),
            backgroundColor: Colors.red,
          ),
        );
      }
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
                // Ensure type is 'announcements' (not 'announcement') and folder name is trimmed
                // Get zoneId to ensure folder is created in the correct zone
                final zoneId = await getSelectedZoneId();
                await createFolder(
                  ctrl.text.trim(),
                  'announcements',
                  parentId: context.read<AnnouncementsModel>().currentFolderId,
                  zoneId: zoneId,
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Folder created successfully'), backgroundColor: Color(0xFF1DB954)));
                  // Add small delay to ensure backend has processed the creation
                  await Future.delayed(const Duration(milliseconds: 500));
                  context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
                }
              } catch (e) {
                if (mounted) {
                  final errorMsg = e.toString().replaceAll('Exception: ', '');
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Failed to create folder: ${errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg}'),
                      backgroundColor: Colors.red,
                      duration: const Duration(seconds: 5),
                    ),
                  );
                }
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
        title: Text(canGoBack ? model.breadcrumbs.last['name'] ?? 'Announcements' : 'Announcements'),
        leading: canGoBack ? IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => model.exitFolder(),
          tooltip: 'Go back',
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
                        height: 400, // Fixed height to prevent overflow
                        child: ListView.separated(
                          shrinkWrap: true,
                          itemCount: templates.length,
                          separatorBuilder: (_, __) => const Divider(color: Color(0xFF1E1E1E)),
                          itemBuilder: (c, i) {
                            final t = templates[i];
                            return ListTile(
                              title: Text(t['title'] ?? 'Template', style: const TextStyle(color: Colors.white)),
                              subtitle: Text((t['script'] ?? t['text'] ?? '') as String, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.grey)),
                              trailing: FilledButton(
                                onPressed: () async {
                                  Navigator.pop(ctx);
                                  await _saveGeneratedAnnouncement(t['title'] ?? 'Announcement', (t['script'] ?? t['text'] ?? '') as String);
                                },
                                child: const Text('Create'),
                              ),
                            );
                          },
                        ),
                      ),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
                        FilledButton(
                          onPressed: () async {
                            Navigator.pop(ctx);
                            final zoneId = await getSelectedZoneId();
                            final items = templates.map((t) => {
                              'title': t['title'],
                              'script': t['script'] ?? t['text'] ?? '',
                            }).toList();
                            await batchCreateTTSAnnouncements(
                              items,
                              folderId: context.read<AnnouncementsModel>().currentFolderId,
                              zoneId: zoneId,
                            );
                            if (mounted) {
                              // Add small delay to ensure backend has processed the batch creation
                              await Future.delayed(const Duration(milliseconds: 500));
                              context.read<AnnouncementsModel>().load(folderId: context.read<AnnouncementsModel>().currentFolderId);
                            }
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
      body: Stack(
        children: [
          Column(
            children: [
              const AnnouncementPlayer(), // Show announcement player at top
              Expanded(
                child: model.loading 
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
                        return FolderCard(
                          name: folder['name'] ?? 'Folder',
                          onTap: () => model.enterFolder((folder['id'] ?? '').toString(), folder['name'] ?? 'Folder'),
                        );
                      }
                      
                      final item = model.files[i - model.folders.length];
                      final title = (item['title'] ?? item['name'] ?? 'Unknown').toString();
                      // Check all possible URL fields, including stream_url
                      final rawUrl = (item['file_url'] ?? item['fileUrl'] ?? item['stream_url'] ?? item['url'] ?? '').toString();
                      // Normalize URL - remove spaces, duplicates, etc.
                      final url = _normalizeAnnouncementUrl(rawUrl);
                      // Filter out placeholder/empty URLs
                      final isValidUrl = url.isNotEmpty && !url.contains('placeholder') && url != '#' && !url.contains('%20');
                      
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
                                        onPressed: !isValidUrl ? null : () async {
                                          // Use announcement player, not music player
                                          final pm = context.read<PlayerModel>();
                                          final token = await getAccessToken();
                                          
                                          // Resolve redirect if it's an API endpoint
                                          String announcementUrl = url;
                                          final isApiEndpoint = url.contains('/api/v1/') || url.contains('execute-api');
                                          final isPresignedS3 = url.contains('X-Amz-') || (url.contains('amazonaws.com') && !url.contains('/api/'));
                                          
                                          if (isApiEndpoint && !isPresignedS3 && token != null && token.isNotEmpty) {
                                            try {
                                              final response = await http.head(
                                                Uri.parse(url), 
                                                headers: {'Authorization': 'Bearer $token'}
                                              ).timeout(const Duration(seconds: 10));
                                              
                                              if (response.statusCode == 302 || response.statusCode == 301) {
                                                final location = response.headers['location'];
                                                if (location != null && location.isNotEmpty) {
                                                  announcementUrl = location;
                                                }
                                              }
                                            } catch (e) {
                                              print('Error resolving redirect: $e');
                                            }
                                          }
                                          
                                          // Play using announcement player
                                          try {
                                            final annHeaders = <String, String>{};
                                            if (token != null && token.isNotEmpty) {
                                              annHeaders['Authorization'] = 'Bearer $token';
                                            }
                                            
                                            final annSource = AudioSource.uri(
                                              Uri.parse(announcementUrl),
                                              headers: annHeaders.isNotEmpty ? annHeaders : null,
                                            );
                                            
                                            pm.currentAnnouncementTitle = title; // Set title for player widget
                                            await pm.annPlayer.setVolume(1.0); // Full volume for manual play
                                            await pm.annPlayer.setAudioSource(annSource);
                                            await pm.annPlayer.play();
                                            
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text('Playing: $title'),
                                                backgroundColor: const Color(0xFF1DB954),
                                              ),
                                            );
                                          } catch (e) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(content: Text('Failed to play: $e')),
                                            );
                                          }
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
              ),
            ],
          ),
          // FloatingActionButton positioned absolutely
          Positioned(
            right: 16,
            bottom: 80, // Above bottom navigation bar
            child: FloatingActionButton(
              onPressed: _showCreateOptions,
              backgroundColor: const Color(0xFF1DB954),
              tooltip: 'Create Announcement',
              child: const Icon(Icons.add, color: Colors.black),
            ),
          ),
        ],
      ),
    );
  }
}

