import 'package:flutter/material.dart';

class AppTheme {
  static final ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xFFF7F7F7),
    primaryColor: const Color(0xFF1DB954),
    colorScheme: const ColorScheme.light(
      primary: Color(0xFF1DB954),
      onPrimary: Colors.black,
      secondary: Color(0xFF1DB954),
      onSecondary: Colors.black,
      surface: Colors.white,
      onSurface: Colors.black,
      error: Color(0xFFE22134),
    ),
    cardColor: Colors.white,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      titleTextStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black),
      iconTheme: IconThemeData(color: Colors.black),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: Color(0xFF1DB954),
      unselectedItemColor: Color(0xFF606770),
      type: BottomNavigationBarType.fixed,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFF1DB954),
        foregroundColor: Colors.black,
        textStyle: const TextStyle(fontWeight: FontWeight.bold),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(500)),
        padding: const EdgeInsets.symmetric(vertical: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFEDEDED),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide.none,
      ),
      hintStyle: const TextStyle(color: Color(0xFF606770)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
  );

  static final ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: Colors.black, // Pure black
    primaryColor: const Color(0xFF1DB954), // Green
    colorScheme: const ColorScheme.dark(
      primary: Color(0xFF1DB954), // Green accent
      onPrimary: Colors.black,
      secondary: Color(0xFF1DB954), // Green
      onSecondary: Colors.black,
      surface: Colors.black, // Pure black surfaces
      onSurface: Colors.white, // White text on black
      error: Color(0xFFE22134), // Black background
    ),
    cardColor: Colors.black, // Black cards
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.black, // Black app bar
      elevation: 0,
      titleTextStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
      iconTheme: IconThemeData(color: Colors.white),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.black, // Black nav bar
      selectedItemColor: Color(0xFF1DB954), // Green selected
      unselectedItemColor: Colors.white70, // Light gray unselected
      type: BottomNavigationBarType.fixed,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFF1DB954), // Green buttons
        foregroundColor: Colors.black, // Black text on green
        textStyle: const TextStyle(fontWeight: FontWeight.bold),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(500)),
        padding: const EdgeInsets.symmetric(vertical: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.transparent, // Transparent so Container color shows
      border: InputBorder.none, // No border, using Container border
      enabledBorder: InputBorder.none,
      focusedBorder: InputBorder.none,
      hintStyle: const TextStyle(color: Colors.white54), // Light gray hints
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.black, // Black dialogs
      titleTextStyle: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
      contentTextStyle: const TextStyle(color: Colors.white),
    ),
    listTileTheme: const ListTileThemeData(
      textColor: Colors.white, // White text
      iconColor: Colors.white, // White icons
    ),
    dividerTheme: const DividerThemeData(
      color: Colors.white24, // Subtle white dividers
    ),
  );
}

