import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class FileBrowserModel extends ChangeNotifier {
  final String type;
  List<dynamic> files = [];
  List<dynamic> folders = [];
  bool loading = false;
  String? currentFolderId;
  List<Map<String, String>> breadcrumbs = [{'id': '', 'name': 'Home'}];

  FileBrowserModel({required this.type});

  Future<void> load({String? folderId}) async {
    loading = true;
    currentFolderId = folderId;
    notifyListeners();
    try {
      final zoneId = await getSelectedZoneId();
      print('[$type] Loading files and folders - folderId: $folderId, zoneId: $zoneId');
      if (type == 'music') {
        files = await getMusicFiles(folderId: folderId, zoneId: zoneId);
      } else {
        files = await getAnnouncements(folderId: folderId, zoneId: zoneId);
      }
      // Get all folders first, then filter by parentId on frontend
      // (Backend doesn't filter by parent, so we do it here)
      final allFolders = await getFolders(type: type, parentId: null, zoneId: zoneId);
      // Filter folders by parentId
      if (folderId == null || folderId.isEmpty) {
        // At root level: show only folders with no parent
        folders = allFolders.where((f) {
          final parentId = (f['parent_id'] ?? f['parentId'] ?? '').toString();
          return parentId.isEmpty || parentId == 'null';
        }).toList();
      } else {
        // Inside a folder: show only subfolders of current folder
        folders = allFolders.where((f) {
          final parentId = (f['parent_id'] ?? f['parentId'] ?? '').toString();
          return parentId == folderId;
        }).toList();
      }
      print('[$type] Loaded ${files.length} files and ${folders.length} folders (filtered from ${allFolders.length} total)');
    } catch (e) {
      print('[$type] Error loading: $e');
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void enterFolder(String id, String name) {
    breadcrumbs.add({'id': id, 'name': name});
    load(folderId: id);
  }

  void exitFolder() {
    if (breadcrumbs.length > 1) {
      breadcrumbs.removeLast();
      final prev = breadcrumbs.last;
      load(folderId: prev['id'] == '' ? null : prev['id']);
    }
  }
}

