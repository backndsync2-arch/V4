import 'package:flutter/foundation.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';

class ZoneModel extends ChangeNotifier {
  List<dynamic> zones = [];
  String? _selectedZoneId;
  String? get selectedZoneId => _selectedZoneId;

  Future<void> loadZones() async {
    try {
      zones = await getZones().timeout(const Duration(seconds: 10), onTimeout: () {
        print('Load zones timeout');
        return <dynamic>[];
      });
      if (zones.isNotEmpty && _selectedZoneId == null) {
        _selectedZoneId = (zones.first['id'] ?? zones.first['zone_id']).toString();
        await setSelectedZoneId(_selectedZoneId);
      }
      notifyListeners();
    } catch (e) {
      print('Failed to load zones: $e');
      zones = [];
      notifyListeners();
    }
  }

  void selectZone(String? id) {
    _selectedZoneId = id;
    setSelectedZoneId(id);
    notifyListeners();
  }

  void clearZone() {
    _selectedZoneId = null;
    setSelectedZoneId(null);
    notifyListeners();
  }
}

