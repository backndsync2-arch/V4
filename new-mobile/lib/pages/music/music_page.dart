import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/music_model.dart';
import '../../models/zone_model.dart';
import '../../services/api_service.dart';
import '../../widgets/music/folder_card.dart';
import '../../widgets/music/file_list_item.dart';

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
                              return FolderCard(
                                name: folder['name'] ?? 'Folder',
                                onTap: () => music.enterFolder((folder['id'] ?? '').toString(), folder['name'] ?? 'Folder'),
                                onPlay: zoneId == null ? null : () async {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Starting folder playback...')));
                                  try {
                                    final folderId = (folder['id'] ?? '').toString();
                                    final zoneIdForFiles = zoneModel.selectedZoneId;
                                    final files = await getMusicFiles(folderId: folderId, zoneId: zoneIdForFiles);
                                    final ids = files.map((f) => (f['id'] ?? '').toString()).toList();
                                    if (ids.isNotEmpty) {
                                      await playbackPlay(zoneId!, musicFileIds: ids);
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
                              return FileListItem(
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploading to S3...')));
      try {
        // Use S3 upload flow instead of direct upload
        await uploadFileToS3(
          result.files.single.path!, 
          result.files.single.name,
          folderId: context.read<MusicModel>().currentFolderId,
          title: result.files.single.name,
        );
        if (context.mounted) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploaded successfully to S3')));
           context.read<MusicModel>().load(folderId: context.read<MusicModel>().currentFolderId);
        }
      } catch (e) {
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: ${e.toString()}')));
      }
    }
  }
}

