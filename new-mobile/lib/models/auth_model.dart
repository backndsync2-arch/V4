import 'package:flutter/foundation.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';

class AuthModel extends ChangeNotifier {
  bool isLoggedIn = false;
  String? email;
  String? role; // Store actual role from backend
  String? clientId; // Store user's clientId
  
  // Use actual role instead of email-based guess
  bool get isAdmin => role == 'admin';
  bool get isStaff => role == 'staff' || role == 'admin';
  bool get isClient => role == 'client';
  bool get isFloorUser => role == 'floor_user';

  AuthModel() {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    try {
      final token = await getAccessToken();
      if (token != null && token.isNotEmpty) {
        // Load stored role and clientId
        role = await getUserRole();
        clientId = await getUserClientId();
        email = await getProfileName();
        
        // Token exists, but don't auto-login - let user login manually
        // This prevents hanging on invalid tokens
        isLoggedIn = false;
      } else {
        isLoggedIn = false;
        role = null;
        clientId = null;
        email = null;
      }
      notifyListeners();
    } catch (e) {
      print('Auth check error: $e');
      isLoggedIn = false;
      role = null;
      clientId = null;
      email = null;
      notifyListeners();
    }
  }

  Future<void> loginWith(String e, String p) async {
    final response = await login(e, p);
    email = e;
    
    // Extract role and clientId from login response
    // Handle different response structures safely
    try {
      if (response is Map<String, dynamic>) {
        // Check if user data is in 'user' key
        if (response.containsKey('user')) {
          final user = response['user'];
          if (user is Map<String, dynamic>) {
            role = user['role'] as String?;
            clientId = user['client_id'] as String? ?? user['clientId'] as String?;
          }
        }
        // Also check if role/client_id are directly in response
        if (role == null && response.containsKey('role')) {
          role = response['role'] as String?;
        }
        if (clientId == null) {
          clientId = response['client_id'] as String? ?? response['clientId'] as String?;
        }
        
        // Store in SharedPreferences
        if (role != null && role!.isNotEmpty) {
          await setUserRole(role!);
        }
        if (clientId != null && clientId!.isNotEmpty) {
          await setUserClientId(clientId!);
        }
        if (email != null && email!.isNotEmpty) {
          await setProfileName(email!);
        }
        
        print('Login successful - Role: $role, ClientId: $clientId');
      } else {
        print('Warning: Login response is not a Map');
      }
    } catch (e, stackTrace) {
      print('Error parsing login response: $e');
      print('Stack trace: $stackTrace');
      print('Response type: ${response.runtimeType}');
      print('Response: $response');
      // Continue anyway - tokens are saved, user can still login
    }
    
    isLoggedIn = true;
    notifyListeners();
  }
  
  Future<void> logout() async {
    await clearTokens();
    await setUserRole(null);
    await setUserClientId(null);
    isLoggedIn = false;
    email = null;
    role = null;
    clientId = null;
    notifyListeners();
  }
}

