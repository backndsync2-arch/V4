import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class ThemeModel extends ChangeNotifier {
  ThemeMode mode = ThemeMode.dark; // Always dark theme for consistent UI
  
  ThemeModel() {
    // Keep dark theme always - no auto-switching
    mode = ThemeMode.dark;
    notifyListeners();
  }
}

