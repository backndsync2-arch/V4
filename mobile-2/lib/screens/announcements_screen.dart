import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:record/record.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import '../api.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  List<dynamic> _announcements = [];
  bool _loading = false;
  final AudioRecorder _recorder = AudioRecorder();

  @override
  void initState() {
    super.initState();
    _loadAnnouncements();
  }

  @override
  void dispose() {
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _loadAnnouncements() async {
    setState(() => _loading = true);
    try {
      final announcements = await getAnnouncements();
      setState(() => _announcements = announcements);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load announcements: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
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
            const Text(
              'Create Announcement',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _OptionItem(
                  icon: Icons.keyboard,
                  label: 'Writing',
                  onTap: () {
                    Navigator.pop(ctx);
                    _showWritingDialog();
                  },
                ),
                _OptionItem(
                  icon: Icons.auto_awesome,
                  label: 'AI',
                  onTap: () {
                    Navigator.pop(ctx);
                    _showAIDialog();
                  },
                ),
                _OptionItem(
                  icon: Icons.mic,
                  label: 'Record',
                  onTap: () {
                    Navigator.pop(ctx);
                    _showRecordDialog();
                  },
                ),
                _OptionItem(
                  icon: Icons.upload_file,
                  label: 'Upload',
                  onTap: () {
                    Navigator.pop(ctx);
                    _uploadAnnouncement();
                  },
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showWritingDialog() {
    final titleCtrl = TextEditingController();
    final textCtrl = TextEditingController();
    bool creating = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create Announcement (Writing)'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Title'),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: textCtrl,
                  decoration: const InputDecoration(labelText: 'Text'),
                  maxLines: 5,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: creating ? null : () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: creating
                  ? null
                  : () async {
                      if (titleCtrl.text.isEmpty || textCtrl.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please fill in all fields')),
                        );
                        return;
                      }
                      setDialogState(() => creating = true);
                      try {
                        await createTTSAnnouncement(
                          titleCtrl.text,
                          textCtrl.text,
                          voice: 'fable',
                        );
                        if (mounted) {
                          Navigator.pop(ctx);
                          _loadAnnouncements();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Announcement created')),
                          );
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Failed to create: $e')),
                          );
                        }
                      } finally {
                        if (mounted) {
                          setDialogState(() => creating = false);
                        }
                      }
                    },
              child: creating ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ) : const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAIDialog() {
    final topicCtrl = TextEditingController();
    final keyPointsCtrl = TextEditingController();
    String selectedTone = 'professional';
    int quantity = 1;
    bool generating = false;
    List<Map<String, String>> generatedScripts = [];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create Announcement (AI)'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: topicCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Topic / Prompt',
                    hintText: 'e.g., Store closing early today at 5pm',
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedTone,
                  decoration: const InputDecoration(labelText: 'Tone'),
                  items: const [
                    DropdownMenuItem(value: 'professional', child: Text('Professional')),
                    DropdownMenuItem(value: 'friendly', child: Text('Friendly')),
                    DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                    DropdownMenuItem(value: 'casual', child: Text('Casual')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() => selectedTone = value);
                    }
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: keyPointsCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Key Points (Optional)',
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<int>(
                  value: quantity,
                  decoration: const InputDecoration(labelText: 'Quantity'),
                  items: const [
                    DropdownMenuItem(value: 1, child: Text('1 script')),
                    DropdownMenuItem(value: 5, child: Text('5 scripts')),
                    DropdownMenuItem(value: 10, child: Text('10 scripts')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() => quantity = value);
                    }
                  },
                ),
                if (generatedScripts.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const Text('Generated Scripts:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...generatedScripts.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final script = entry.value;
                    return Card(
                      child: ListTile(
                        title: Text(script['title'] ?? 'Untitled'),
                        subtitle: Text(script['text'] ?? ''),
                        trailing: IconButton(
                          icon: const Icon(Icons.check),
                          onPressed: () async {
                            try {
                              await createTTSAnnouncement(
                                script['title'] ?? 'Untitled',
                                script['text'] ?? '',
                                voice: 'fable',
                              );
                              if (mounted) {
                                Navigator.pop(ctx);
                                _loadAnnouncements();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Announcement created')),
                                );
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Failed to create: $e')),
                                );
                              }
                            }
                          },
                        ),
                      ),
                    );
                  }),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: generating ? null : () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: generating
                  ? null
                  : () async {
                      if (topicCtrl.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please enter a topic')),
                        );
                        return;
                      }
                      setDialogState(() => generating = true);
                      try {
                        final scripts = await generateAIAnnouncement(
                          topicCtrl.text,
                          selectedTone,
                          keyPoints: keyPointsCtrl.text.isEmpty ? null : keyPointsCtrl.text,
                          quantity: quantity,
                        );
                        setDialogState(() {
                          generatedScripts = scripts;
                          generating = false;
                        });
                      } catch (e) {
                        if (mounted) {
                          setDialogState(() => generating = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Failed to generate: $e')),
                          );
                        }
                      }
                    },
              child: generating
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Generate'),
            ),
          ],
        ),
      ),
    );
  }

  void _showRecordDialog() {
    String? recordingPath;
    bool isRecording = false;
    bool isPaused = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Record Announcement'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (recordingPath != null)
                const Text('Recording saved. Enter a title to upload.'),
              if (recordingPath == null)
                Text(isRecording ? 'Recording...' : 'Ready to record'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            if (recordingPath == null)
              ElevatedButton(
                onPressed: () async {
                  final status = await Permission.microphone.request();
                  if (!status.isGranted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Microphone permission denied')),
                    );
                    return;
                  }

                  try {
                    final dir = await getTemporaryDirectory();
                    final path = '${dir.path}/recording_${DateTime.now().millisecondsSinceEpoch}.m4a';
                    await _recorder.start(
                      const RecordConfig(),
                      path: path,
                    );
                    setDialogState(() => isRecording = true);
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to start recording: $e')),
                    );
                  }
                },
                child: const Text('Start Recording'),
              ),
            if (isRecording)
              ElevatedButton(
                onPressed: () async {
                  try {
                    final path = await _recorder.stop();
                    setDialogState(() {
                      isRecording = false;
                      recordingPath = path;
                    });
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to stop recording: $e')),
                    );
                  }
                },
                child: const Text('Stop & Save'),
              ),
            if (recordingPath != null)
              ElevatedButton(
                onPressed: () async {
                  final titleCtrl = TextEditingController();
                  showDialog(
                    context: context,
                    builder: (ctx2) => AlertDialog(
                      title: const Text('Enter Title'),
                      content: TextField(
                        controller: titleCtrl,
                        decoration: const InputDecoration(labelText: 'Title'),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx2),
                          child: const Text('Cancel'),
                        ),
                        ElevatedButton(
                          onPressed: () async {
                            if (titleCtrl.text.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please enter a title')),
                              );
                              return;
                            }
                            Navigator.pop(ctx2);
                            try {
                              await uploadAnnouncementFile(recordingPath!, titleCtrl.text);
                              if (mounted) {
                                Navigator.pop(ctx);
                                _loadAnnouncements();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Announcement uploaded')),
                                );
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Failed to upload: $e')),
                                );
                              }
                            }
                          },
                          child: const Text('Upload'),
                        ),
                      ],
                    ),
                  );
                },
                child: const Text('Upload'),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _uploadAnnouncement() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
      );

      if (result != null && result.files.single.path != null) {
        final filePath = result.files.single.path!;
        final fileName = result.files.single.name;

        final titleCtrl = TextEditingController(text: fileName);
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Upload Announcement'),
            content: TextField(
              controller: titleCtrl,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () async {
                  if (titleCtrl.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Please enter a title')),
                    );
                    return;
                  }
                  Navigator.pop(ctx);
                  try {
                    await uploadAnnouncementFile(filePath, titleCtrl.text);
                    _loadAnnouncements();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Announcement uploaded')),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to upload: $e')),
                      );
                    }
                  }
                },
                child: const Text('Upload'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick file: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Announcements'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showCreateOptions,
            tooltip: 'Create Announcement',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAnnouncements,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _announcements.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('No announcements found'),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _showCreateOptions,
                        icon: const Icon(Icons.add),
                        label: const Text('Create Announcement'),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _announcements.length,
                  itemBuilder: (context, index) {
                    final announcement = _announcements[index];
                    final title = announcement['title']?.toString() ?? 'Untitled';
                    final text = announcement['tts_text']?.toString() ?? announcement['text']?.toString() ?? '';
                    
                    return ListTile(
                      leading: const Icon(Icons.campaign),
                      title: Text(title),
                      subtitle: Text(text.isNotEmpty ? text : 'No text'),
                      trailing: IconButton(
                        icon: const Icon(Icons.play_arrow),
                        onPressed: () {
                          // Play announcement
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

class _OptionItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _OptionItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF3A3A3A),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 32, color: Colors.white),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }
}

