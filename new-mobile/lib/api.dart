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

// --- NEW S3 UPLOAD FUNCTIONS ---

Future<Map<String, dynamic>> getPresignedUploadUrl(String filename, String contentType, {String? folderId, String? zoneId}) async {
  final url = Uri.parse('$apiBase/music/upload-url/');
  final body = {
    'filename': filename,
    'contentType': contentType,
    if (folderId != null) 'folder_id': folderId,
    if (zoneId != null) 'zone_id': zoneId,
  };
  
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode >= 200 && res.statusCode < 300) {
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
  throw Exception('Failed to get upload URL: ${res.body}');
}

Future<Map<String, dynamic>> completeS3Upload(String s3Key, String title, {String? artist, String? album, String? genre, String? year, String? folderId, String? zoneId, int? duration, int? fileSize}) async {
  final url = Uri.parse('$apiBase/music/files/complete/');
  final body = {
    's3Key': s3Key,
    'title': title,
    if (artist != null) 'artist': artist,
    if (album != null) 'album': album,
    if (genre != null) 'genre': genre,
    if (year != null) 'year': year,
    if (folderId != null) 'folder_id': folderId,
    if (zoneId != null) 'zone_id': zoneId,
    if (duration != null) 'duration': duration,
    if (fileSize != null) 'fileSize': fileSize,
  };
  
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode >= 200 && res.statusCode < 300) {
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
  throw Exception('Failed to complete upload: ${res.body}');
}

// Upload file using S3 presigned URL (for large files)
Future<Map<String, dynamic>> uploadFileToS3(String filePath, String filename, {String? folderId, String? zoneId, String? title}) async {
  // Step 1: Get presigned upload URL
  final uploadInfo = await getPresignedUploadUrl(filename, 'audio/mpeg', folderId: folderId, zoneId: zoneId);
  final uploadUrl = uploadInfo['uploadUrl'] as String;
  final s3Key = uploadInfo['s3Key'] as String;
  
  // Step 2: Upload file directly to S3
  final file = File(filePath);
  final fileBytes = await file.readAsBytes();
  
  final uploadRes = await http.put(
    Uri.parse(uploadUrl),
    headers: {'Content-Type': 'audio/mpeg'},
    body: fileBytes,
  );
  
  if (uploadRes.statusCode != 200) {
    throw Exception('Failed to upload to S3: ${uploadRes.statusCode}');
  }
  
  // Step 3: Complete upload in database
  return await completeS3Upload(s3Key, title ?? filename, folderId: folderId, zoneId: zoneId, fileSize: fileBytes.length);
}

// --- Music & Folders ---

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

// Keep existing upload function for backward compatibility
Future<void> uploadFile(String filePath, String type, {String? folderId, String? title}) async {
  final url = Uri.parse('$apiBase/music/files/');
  final token = await getAccessToken();
  final request = http.MultipartRequest('POST', url);
  if (token != null) request.headers['Authorization'] = 'Bearer $token';

  request.fields['type'] = type; // 'music' or 'announcement'
  if (folderId != null) request.fields['folder'] = folderId;
  if (title != null) request.fields['title'] = title;
  
  request.files.add(await http.MultipartFile.fromPath('file', filePath));

  final streamedRes = await request.send();
  final res = await http.Response.fromStream(streamedRes);
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Upload failed: ${res.body}');
  }
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

Future<void> createFolder(String name, String type, {String? parentId, String? description}) async {
  final url = Uri.parse('$apiBase/music/folders/');
  final body = {
    'name': name,
    'type': type,
    if (parentId != null) 'parent': parentId,
    if (description != null) 'description': description,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to create folder: ${res.body}');
  }
}

// --- Announcements & AI ---

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

Future<List<Map<String, String>>> generateAIAnnouncement(String topic, String tone, String keyPoints) async {
  final url = Uri.parse('$apiBase/announcements/generate-ai-text/');
  final body = {
    'topic': topic,
    'tone': tone,
    'key_points': keyPoints,
    'quantity': 3
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

Future<List<Map<String, dynamic>>> getAnnouncementTemplates({String category = 'general', int quantity = 8, String tone = 'professional'}) async {
  final url = Uri.parse('$apiBase/announcements/generate-templates/');
  final body = {
    'category': category,
    'quantity': quantity,
    'tone': tone,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is Map && data['templates'] is List) {
      return (data['templates'] as List).cast<Map<String, dynamic>>();
    }
    return [];
  }
  throw Exception('Failed to fetch templates');
}

Future<void> batchCreateTTSAnnouncements(List<Map<String, dynamic>> items, {String? voice, String? folderId, String? zoneId}) async {
  final url = Uri.parse('$apiBase/announcements/batch-tts/');
  final body = {
    'announcements': items.map((e) => {
      'title': e['title'],
      'text': e['script'] ?? e['text'] ?? '',
      if (e['folder_id'] != null) 'folder_id': e['folder_id'],
      if (e['zone_id'] != null) 'zone_id': e['zone_id'],
    }).toList(),
    if (voice != null) 'voice': voice,
    if (folderId != null) 'folder_id': folderId,
    if (zoneId != null) 'zone_id': zoneId,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to batch create announcements: ${res.body}');
  }
}

Future<void> updateMusicFile(String id, {String? title, String? folderId, String? zoneId}) async {
  final url = Uri.parse('$apiBase/music/files/$id/');
  final body = <String, dynamic>{};
  if (title != null) body['title'] = title;
  if (folderId != null) body['folder_id'] = folderId;
  if (zoneId != null) body['zone_id'] = zoneId;
  final res = await http.patch(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to update music file: ${res.body}');
  }
}

Future<Map<String, dynamic>> copyMusicFileToZone(String id, String targetZoneId, {String? folderId, String? newTitle}) async {
  final url = Uri.parse('$apiBase/music/files/$id/copy_to_zone/');
  final body = {
    'zone_id': targetZoneId,
    if (folderId != null) 'folder_id': folderId,
    if (newTitle != null) 'title': newTitle,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode >= 200 && res.statusCode < 300) {
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
  throw Exception('Failed to copy music file: ${res.body}');
}

Future<void> updateAnnouncement(String id, {String? title, String? folderId, String? zoneId, bool? enabled}) async {
  final url = Uri.parse('$apiBase/announcements/$id/');
  final body = <String, dynamic>{};
  if (title != null) body['title'] = title;
  if (folderId != null) body['folder_id'] = folderId;
  if (zoneId != null) body['zone_id'] = zoneId;
  if (enabled != null) body['enabled'] = enabled;
  final res = await http.patch(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to update announcement: ${res.body}');
  }
}

// --- Zones & Devices ---

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

Future<List<dynamic>> getDevices({String? zoneId}) async {
  // Try with zone_id first, then fallback to zone
  Future<List<dynamic>> fetch(String param) async {
    var urlStr = '$apiBase/zones/devices/';
    if (zoneId != null) urlStr += '?$param=$zoneId';
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
  final first = await fetch('zone_id');
  if (first.isNotEmpty) return first;
  return fetch('zone');
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

Future<void> playbackPlay(String zoneId, {List<String>? musicFileIds, List<String>? playlistIds, bool shuffle = false}) async {
  final url = Uri.parse('$apiBase/playback/control/play/');
  final body = {
    'zone_id': zoneId,
    'shuffle': shuffle,
    if (musicFileIds != null && musicFileIds.isNotEmpty) 'music_file_ids': musicFileIds,
    if (musicFileIds != null && musicFileIds.isNotEmpty) 'file_ids': musicFileIds,
    if (playlistIds != null && playlistIds.isNotEmpty) 'playlist_ids': playlistIds,
    if (playlistIds != null && playlistIds.isNotEmpty) 'playlists': playlistIds,
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

Future<void> playbackNext(String zoneId) async {
  final url = Uri.parse('$apiBase/playback/control/next/');
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode({'zone_id': zoneId}));
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to skip: ${res.body}');
}

Future<void> playbackPrevious(String zoneId) async {
  final url = Uri.parse('$apiBase/playback/control/previous/');
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode({'zone_id': zoneId}));
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to previous: ${res.body}');
}

Future<void> setVolume(String zoneId, int volume) async {
  final url = Uri.parse('$apiBase/playback/control/volume/');
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode({'zone_id': zoneId, 'volume': volume}));
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to set volume: ${res.body}');
}

Future<void> playInstantAnnouncement(String announcementId, List<String> deviceIds) async {
  final url = Uri.parse('$apiBase/announcements/$announcementId/play_instant/');
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode({'device_ids': deviceIds}));
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to play announcement: ${res.body}');
}

// --- Admin ---

Future<List<dynamic>> getAdminUsers({String? clientId}) async {
  try {
    final url = Uri.parse('$apiBase/admin/users/');
    final headers = await _authHeaders();
    if (clientId != null && clientId.isNotEmpty) {
      headers['x-impersonate-client'] = clientId;
    }
    final res = await http.get(url, headers: headers);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final data = jsonDecode(res.body);
      if (data is List) return data;
      if (data is Map && data['results'] is List) return data['results'] as List<dynamic>;
      return [];
    }
    return [];
  } catch (_) {
    return [];
  }
}

Future<List<dynamic>> getAdminClients() async {
  final url = Uri.parse('$apiBase/admin/clients/');
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'] as List<dynamic>;
    return [];
  }
  return [];
}

Future<Map<String, dynamic>> createAdminUser(String email, String name, String role, {String? clientId, String? password}) async {
  final url = Uri.parse('$apiBase/admin/users/');
  final body = {
    'email': email,
    'name': name,
    'role': role,
    if (clientId != null) 'client_id': clientId,
    if (password != null && password.isNotEmpty) 'password': password,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to create user: ${res.body}');
  }
  final data = jsonDecode(res.body);
  if (data is Map<String, dynamic>) return data;
  return {};
}

Future<void> updateAdminUser(String id, Map<String, dynamic> data) async {
  final url = Uri.parse('$apiBase/admin/users/$id/');
  final res = await http.patch(url, headers: await _authHeaders(), body: jsonEncode(data));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to update user: ${res.body}');
  }
}

Future<void> deleteAdminUser(String id) async {
  final url = Uri.parse('$apiBase/admin/users/$id/');
  final res = await http.delete(url, headers: await _authHeaders());
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to delete user');
  }
}

Future<List<dynamic>> getAuditLogs({String? action, String? resourceType, String? userId}) async {
  var urlStr = '$apiBase/admin/audit-logs/?';
  if (action != null && action.isNotEmpty) urlStr += '&action=$action';
  if (resourceType != null && resourceType.isNotEmpty) urlStr += '&resource_type=$resourceType';
  if (userId != null && userId.isNotEmpty) urlStr += '&user_id=$userId';
  
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

// --- Scheduler ---

Future<List<dynamic>> getSchedules() async {
  final url = Uri.parse('$apiBase/schedules/schedules/');
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'] as List<dynamic>;
    return [];
  }
  return [];
}

Future<void> createSchedule({
  required String zoneId,
  String? announcementId,
  String? folderId,
  required String recurrence, // once|daily|weekly|monthly
  required String timeOfDay,  // HH:mm in 24h
  List<int>? daysOfWeek,      // 1-7 (Mon-Sun)
  int? dayOfMonth,            // 1-31
}) async {
  final url = Uri.parse('$apiBase/schedules/schedules/');
  final body = {
    'zone_id': zoneId,
    if (announcementId != null) 'announcement_id': announcementId,
    if (folderId != null) 'folder_id': folderId,
    'recurrence': recurrence,
    'time': timeOfDay,
    if (daysOfWeek != null && daysOfWeek.isNotEmpty) 'days_of_week': daysOfWeek,
    if (dayOfMonth != null) 'day_of_month': dayOfMonth,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to create schedule: ${res.body}');
  }
}