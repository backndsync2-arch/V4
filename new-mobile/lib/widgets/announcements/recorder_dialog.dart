import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

class RecorderDialog extends StatefulWidget {
  final Function(String path, String title) onSave;
  const RecorderDialog({super.key, required this.onSave});
  @override
  State<RecorderDialog> createState() => _RecorderDialogState();
}

class _RecorderDialogState extends State<RecorderDialog> {
  final AudioRecorder _recorder = AudioRecorder();
  bool _isRecording = false;
  String? _path;
  final _titleCtrl = TextEditingController(text: 'New Recording');

  @override
  void dispose() {
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_isRecording) {
      final path = await _recorder.stop();
      setState(() {
        _isRecording = false;
        _path = path;
      });
    } else {
      if (await Permission.microphone.request().isGranted) {
        final dir = await getApplicationDocumentsDirectory();
        final path = '${dir.path}/rec_${DateTime.now().millisecondsSinceEpoch}.m4a';
        await _recorder.start(const RecordConfig(), path: path);
        setState(() => _isRecording = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF2A2A2A),
      title: const Text('Record Audio', style: TextStyle(color: Colors.white)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(controller: _titleCtrl, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Recording Title')),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: _toggle,
            child: CircleAvatar(
              radius: 32,
              backgroundColor: _isRecording ? Colors.red : Colors.grey,
              child: Icon(_isRecording ? Icons.stop : Icons.mic, size: 32, color: Colors.white),
            ),
          ),
          const SizedBox(height: 12),
          Text(_isRecording ? 'Recording...' : (_path != null ? 'Recorded!' : 'Tap to Record'), style: const TextStyle(color: Colors.grey)),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          onPressed: _path != null ? () => widget.onSave(_path!, _titleCtrl.text) : null,
          child: const Text('Save & Upload'),
        ),
      ],
    );
  }
}

