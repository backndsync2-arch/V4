import 'package:shared_preferences/shared_preferences.dart';

Future<void> setTokens(String access, String refresh) async {
  final sp = await SharedPreferences.getInstance();
  await sp.setString('sync2gear_access_token', access);
  await sp.setString('sync2gear_refresh_token', refresh);
}

Future<String?> getAccessToken() async {
  final sp = await SharedPreferences.getInstance();
  return sp.getString('sync2gear_access_token');
}

Future<void> clearTokens() async {
  final sp = await SharedPreferences.getInstance();
  await sp.remove('sync2gear_access_token');
  await sp.remove('sync2gear_refresh_token');
}

Future<void> setImpersonateClientId(String? clientId) async {
  final sp = await SharedPreferences.getInstance();
  if (clientId == null || clientId.isEmpty) {
    await sp.remove('impersonate_client_id');
  } else {
    await sp.setString('impersonate_client_id', clientId);
  }
}

Future<String?> getImpersonateClientId() async {
  final sp = await SharedPreferences.getInstance();
  return sp.getString('impersonate_client_id');
}

Future<void> setSelectedZoneId(String? zoneId) async {
  final sp = await SharedPreferences.getInstance();
  if (zoneId == null || zoneId.isEmpty) {
    await sp.remove('selected_zone_id');
  } else {
    await sp.setString('selected_zone_id', zoneId);
  }
}

Future<String?> getSelectedZoneId() async {
  final sp = await SharedPreferences.getInstance();
  return sp.getString('selected_zone_id');
}

Future<void> setProfileName(String name) async {
  final sp = await SharedPreferences.getInstance();
  await sp.setString('profile_name', name);
}

Future<String?> getProfileName() async {
  final sp = await SharedPreferences.getInstance();
  return sp.getString('profile_name');
}

Future<void> setProfileAvatar(String? dataUrl) async {
  final sp = await SharedPreferences.getInstance();
  if (dataUrl == null || dataUrl.isEmpty) {
    await sp.remove('profile_avatar');
  } else {
    await sp.setString('profile_avatar', dataUrl);
  }
}

Future<String?> getProfileAvatar() async {
  final sp = await SharedPreferences.getInstance();
  return sp.getString('profile_avatar');
}

// Role storage
Future<void> setUserRole(String? role) async {
  final sp = await SharedPreferences.getInstance();
  if (role == null || role.isEmpty) {
    await sp.remove('user_role');
  } else {
    await sp.setString('user_role', role);
  }
}

Future<String?> getUserRole() async {
  final sp = await SharedPreferences.getInstance();
  return sp.getString('user_role');
}

// Client ID storage (user's own clientId, not impersonation)
Future<void> setUserClientId(String? clientId) async {
  final sp = await SharedPreferences.getInstance();
  if (clientId == null || clientId.isEmpty) {
    await sp.remove('user_client_id');
  } else {
    await sp.setString('user_client_id', clientId);
  }
}

Future<String?> getUserClientId() async {
  final sp = await SharedPreferences.getInstance();
  return sp.getString('user_client_id');
}

