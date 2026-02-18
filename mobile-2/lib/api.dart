import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBase = 'https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1';

Future<Map<String, String>> _authHeaders() async {
  final token = await getAccessToken();
  final h = <String, String>{'Content-Type': 'application/json'};
  if (token != null && token.isNotEmpty) h['Authorization'] = 'Bearer $token';
  final imp = await getImpersonateClientId();
  if (imp != null && imp.isNotEmpty) h['x-impersonate-client'] = imp;
  return h;
}

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

// --- Authentication ---

Future<Map<String, dynamic>> login(String email, String password) async {
  final url = Uri.parse('$apiBase/auth/login/');
  final res = await http.post(
    url, 
    headers: {'Content-Type': 'application/json'}, 
    body: jsonEncode({'email': email, 'password': password})
  ).timeout(const Duration(seconds: 15), onTimeout: () {
    throw Exception('Login request timeout - check your internet connection');
  });
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final access = data['access'] as String? ?? '';
    final refresh = data['refresh'] as String? ?? '';
    if (access.isNotEmpty && refresh.isNotEmpty) {
      await setTokens(access, refresh);
    }
    return data;
  }
  throw Exception('Login failed: ${res.statusCode}');
}

Future<Map<String, dynamic>> getCurrentUser() async {
  final url = Uri.parse('$apiBase/auth/me/');
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
  throw Exception('Failed to get user');
}

// --- Music ---

Future<List<dynamic>> getMusicFiles({String? folderId, String? zoneId, String? search}) async {
  var urlStr = '$apiBase/music/files/';
  final params = <String>[];
  if (folderId != null && folderId.isNotEmpty) params.add('folder=$folderId');
  zoneId ??= await getSelectedZoneId();
  if (zoneId != null && zoneId.isNotEmpty) params.add('zone=$zoneId');
  if (search != null && search.isNotEmpty) params.add('search=$search');
  if (params.isNotEmpty) urlStr += '?${params.join('&')}';
  final url = Uri.parse(urlStr);
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'] as List<dynamic>;
    return [];
  }
  throw Exception('Failed to load music');
}

Future<List<dynamic>> getFolders({String type = 'music', String? parentId, String? zoneId}) async {
  var urlStr = '$apiBase/music/folders/?type=$type';
  if (parentId != null && parentId.isNotEmpty) urlStr += '&parent=$parentId';
  zoneId ??= await getSelectedZoneId();
  if (zoneId != null && zoneId.isNotEmpty) urlStr += '&zone=$zoneId';
  final url = Uri.parse(urlStr);
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'] as List<dynamic>;
    return [];
  }
  return [];
}

// --- Announcements ---

Future<List<dynamic>> getAnnouncements({String? folderId, String? zoneId}) async {
  var urlStr = '$apiBase/announcements/';
  final params = <String>[];
  zoneId ??= await getSelectedZoneId();
  if (zoneId != null && zoneId.isNotEmpty) params.add('zone_id=$zoneId');
  if (folderId != null && folderId.isNotEmpty) params.add('folder_id=$folderId');
  if (params.isNotEmpty) urlStr += '?${params.join('&')}';
  final url = Uri.parse(urlStr);
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'] as List<dynamic>;
    return [];
  }
  throw Exception('Failed to load announcements');
}

Future<List<Map<String, String>>> generateAIAnnouncement(String topic, String tone, {String? keyPoints, int quantity = 1}) async {
  final url = Uri.parse('$apiBase/announcements/generate-ai-text/');
  final body = {
    'topic': topic,
    'tone': tone,
    if (keyPoints != null && keyPoints.isNotEmpty) 'key_points': keyPoints,
    'quantity': quantity
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is Map && data['scripts'] is List) {
      return (data['scripts'] as List).map<Map<String, String>>((e) => {
        'title': (e['title'] ?? '').toString(),
        'text': (e['text'] ?? '').toString(),
      }).toList();
    }
  }
  throw Exception('Failed to generate AI text');
}

Future<void> createTTSAnnouncement(String title, String text, {String? voice, String? folderId, String? zoneId}) async {
  final url = Uri.parse('$apiBase/announcements/tts/');
  final body = {
    'title': title,
    'text': text,
    if (voice != null) 'voice': voice,
    if (folderId != null) 'folder': folderId,
    if (zoneId != null) 'zone_id': zoneId,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to create TTS announcement: ${res.body}');
  }
}

Future<void> uploadAnnouncementFile(String filePath, String title, {String? folderId, String? zoneId}) async {
  final url = Uri.parse('$apiBase/announcements/upload/');
  final token = await getAccessToken();
  final request = http.MultipartRequest('POST', url);
  if (token != null) request.headers['Authorization'] = 'Bearer $token';
  
  request.fields['title'] = title;
  if (folderId != null) request.fields['folder'] = folderId;
  if (zoneId != null) request.fields['zone_id'] = zoneId;
  
  request.files.add(await http.MultipartFile.fromPath('file', filePath));

  final streamedRes = await request.send();
  final res = await http.Response.fromStream(streamedRes);
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Upload failed: ${res.body}');
  }
}

// --- Zones ---

Future<List<dynamic>> getZones() async {
  final url = Uri.parse('$apiBase/zones/zones/');
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'] as List<dynamic>;
    return [];
  }
  throw Exception('Failed to load zones');
}

// --- Playback ---

Future<Map<String, dynamic>> getPlaybackState(String zoneId) async {
  final url = Uri.parse('$apiBase/playback/state/by_zone/?zone_id=$zoneId');
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
  return {};
}

Future<void> playbackPlay(String zoneId, {List<String>? musicFileIds, bool shuffle = false}) async {
  final url = Uri.parse('$apiBase/playback/control/play/');
  final body = {
    'zone_id': zoneId,
    'shuffle': shuffle,
    if (musicFileIds != null && musicFileIds.isNotEmpty) 'music_file_ids': musicFileIds,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to start playback: ${res.body}');
}

Future<void> playbackPause(String zoneId) async {
  final url = Uri.parse('$apiBase/playback/control/pause/');
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode({'zone_id': zoneId}));
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to pause playback: ${res.body}');
}

Future<void> playbackResume(String zoneId) async {
  final url = Uri.parse('$apiBase/playback/control/resume/');
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode({'zone_id': zoneId}));
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to resume playback: ${res.body}');
}

