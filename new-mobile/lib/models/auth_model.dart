import 'package:flutter/foundation.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';

class AuthModel extends ChangeNotifier {
  bool isLoggedIn = false;
  String? email;
  bool get isAdmin => email?.toLowerCase().contains('admin') ?? false;

  AuthModel() {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    try {
      final token = await getAccessToken();
      if (token != null && token.isNotEmpty) {
        // Token exists, but don't auto-login - let user login manually
        // This prevents hanging on invalid tokens
        isLoggedIn = false;
      } else {
        isLoggedIn = false;
      }
      notifyListeners();
    } catch (e) {
      print('Auth check error: $e');
      isLoggedIn = false;
      notifyListeners();
    }
  }

  Future<void> loginWith(String e, String p) async {
    await login(e, p);
    email = e;
    isLoggedIn = true;
    notifyListeners();
  }
  
  Future<void> logout() async {
    await clearTokens();
    isLoggedIn = false;
    email = null;
    notifyListeners();
  }
}

