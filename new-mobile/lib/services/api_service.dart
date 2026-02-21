import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'storage_service.dart';

const apiBase = 'https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1';

// Helper function to normalize URLs - removes spaces, duplicates, and ensures proper format
String _normalizeUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  
  // Remove leading/trailing whitespace and URL-encoded spaces
  url = url.trim().replaceAll('%20', '').replaceAll(' ', '');
  
  // If URL already contains the base URL, check for duplication
  if (url.contains(apiBase)) {
    // Find all occurrences of the base URL
    final baseUrlPattern = apiBase.replaceAll('/', r'\/');
    final matches = RegExp(baseUrlPattern).allMatches(url);
    
    // If there are multiple occurrences, keep only the last one
    if (matches.length > 1) {
      final lastMatch = matches.last;
      url = url.substring(lastMatch.start);
    }
  }
  
  // If it's a relative URL starting with /api/, prepend base URL
  if (url.startsWith('/api/')) {
    return '$apiBase${url.substring(4)}';
  }
  
  // If it's a relative URL, prepend base URL
  if (url.startsWith('/')) {
    return '$apiBase$url';
  }
  
  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Otherwise return as-is (might be a path)
  return url;
}

Future<Map<String, String>> _authHeaders() async {
  final token = await getAccessToken();
  final h = <String, String>{'Content-Type': 'application/json'};
  if (token != null && token.isNotEmpty) h['Authorization'] = 'Bearer $token';
  final imp = await getImpersonateClientId();
  if (imp != null && imp.isNotEmpty) h['x-impersonate-client'] = imp;
  return h;
}

Future<Map<String, dynamic>> login(String email, String password) async {
  final url = Uri.parse('$apiBase/auth/login/');
  print('Attempting login to: $url');
  print('Email: ${email.isNotEmpty ? email.substring(0, email.indexOf('@')).padRight(email.length, '*') : 'empty'}');
  
  try {
    final res = await http.post(
      url, 
      headers: {'Content-Type': 'application/json'}, 
      body: jsonEncode({'email': email, 'password': password})
    ).timeout(const Duration(seconds: 15), onTimeout: () {
      print('Login timeout - no response from server');
      throw TimeoutException('Login request timeout - check your internet connection');
    });
    
    print('Login response status: ${res.statusCode}');
    print('Login response body: ${res.body.length > 200 ? res.body.substring(0, 200) + '...' : res.body}');
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final access = data['access'] as String? ?? '';
        final refresh = data['refresh'] as String? ?? '';
        if (access.isNotEmpty && refresh.isNotEmpty) {
          await setTokens(access, refresh);
          print('Login successful - tokens saved');
          return data;
        } else {
          print('Login response missing access or refresh token');
          throw Exception('Invalid login response: missing authentication tokens');
        }
      } catch (e) {
        print('Error parsing login response: $e');
        throw Exception('Invalid login response format: ${e.toString()}');
      }
    }
    
    // Parse error response for better error messages
    String errorMsg = 'Login failed: ${res.statusCode}';
    try {
      final errorData = jsonDecode(res.body) as Map<String, dynamic>;
      if (errorData.containsKey('detail')) {
        errorMsg = errorData['detail'].toString();
      } else if (errorData.containsKey('message')) {
        errorMsg = errorData['message'].toString();
      } else if (errorData.containsKey('error')) {
        errorMsg = errorData['error'].toString();
      } else if (errorData.containsKey('non_field_errors')) {
        final nonFieldErrors = errorData['non_field_errors'];
        if (nonFieldErrors is List && nonFieldErrors.isNotEmpty) {
          errorMsg = nonFieldErrors.first.toString();
        } else {
          errorMsg = nonFieldErrors.toString();
        }
      } else {
        errorMsg = 'Login failed: ${res.statusCode} - ${res.body.length > 100 ? res.body.substring(0, 100) + '...' : res.body}';
      }
    } catch (parseError) {
      print('Error parsing error response: $parseError');
      errorMsg = 'Login failed: ${res.statusCode} - ${res.body.length > 100 ? res.body.substring(0, 100) + '...' : res.body}';
    }
    print('Login error: $errorMsg');
    throw Exception(errorMsg);
  } on SocketException catch (e) {
    print('Login SocketException: $e');
    throw Exception('Network error: Unable to connect to server. Please check your internet connection. ${e.message}');
  } on FormatException catch (e) {
    print('Login FormatException: $e');
    throw Exception('Invalid server response. Please try again.');
  } on TimeoutException catch (e) {
    print('Login TimeoutException: $e');
    throw Exception('Login request timeout. Please check your internet connection and try again.');
  } catch (e, stackTrace) {
    print('Login unexpected error: $e');
    print('Stack trace: $stackTrace');
    final errorStr = e.toString();
    if (errorStr.contains('Exception:')) {
      // Already formatted as Exception, rethrow as-is
      rethrow;
    }
    throw Exception('Login failed: ${errorStr}');
  }
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

Future<void> createFolder(String name, String type, {String? parentId, String? description, String? zoneId}) async {
  final url = Uri.parse('$apiBase/music/folders/');
  zoneId ??= await getSelectedZoneId();
  final body = {
    'name': name,
    'type': type,
    if (parentId != null) 'parent': parentId,
    if (description != null) 'description': description,
    if (zoneId != null && zoneId.isNotEmpty) 'zone_id': zoneId,
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
  // If folderId is null or empty, we want announcements with no folder (null folderId)
  // If folderId is provided, filter by that folder
  if (folderId != null && folderId.isNotEmpty) {
    params.add('folder_id=$folderId');
  } else {
    // When folderId is null, we want to show announcements with no folder
    // Backend should return announcements where folderId is null
    // We'll filter on frontend if needed
  }
  if (params.isNotEmpty) urlStr += '?${params.join('&')}';
  final url = Uri.parse(urlStr);
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    List<dynamic> announcements = [];
    if (data is List) {
      announcements = data;
    } else if (data is Map && data['results'] is List) {
      announcements = data['results'] as List<dynamic>;
    }
    // If folderId is null, filter to show only announcements with no folder
    if (folderId == null || folderId.isEmpty) {
      announcements = announcements.where((a) {
        final annFolderId = (a['folder_id'] ?? a['folderId'] ?? a['category'] ?? '').toString();
        return annFolderId.isEmpty || annFolderId == 'null';
      }).toList();
    }
    return announcements;
  }
  throw Exception('Failed to load announcements');
}

Future<List<Map<String, String>>> generateAIAnnouncement(String topic, String tone, String keyPoints, {int quantity = 3}) async {
  final url = Uri.parse('$apiBase/announcements/generate-ai-text/');
  final body = {
    'topic': topic,
    'tone': tone,
    'key_points': keyPoints,
    'quantity': quantity
  };
  try {
    final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body)).timeout(const Duration(seconds: 30));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final data = jsonDecode(res.body);
      if (data is Map && data['scripts'] is List) {
        return (data['scripts'] as List).map<Map<String, String>>((e) => {
          'title': (e['title'] ?? '').toString(),
          'text': (e['text'] ?? '').toString(),
        }).toList();
      }
      throw Exception('Invalid response format: expected scripts array');
    }
    // Parse error response
    String errorMsg = 'Failed to generate AI text: ${res.statusCode}';
    try {
      final errorData = jsonDecode(res.body) as Map<String, dynamic>;
      if (errorData.containsKey('detail')) {
        errorMsg = errorData['detail'].toString();
      } else {
        errorMsg = 'Failed to generate AI text: ${res.statusCode} - ${res.body}';
      }
    } catch (_) {
      errorMsg = 'Failed to generate AI text: ${res.statusCode} - ${res.body}';
    }
    throw Exception(errorMsg);
  } on SocketException catch (e) {
    throw Exception('Network error: Unable to connect to server. Please check your internet connection. ${e.message}');
  } on TimeoutException catch (e) {
    throw Exception('Request timeout: The AI generation is taking too long. Please try again.');
  } catch (e) {
    if (e.toString().contains('Exception:')) {
      rethrow;
    }
    throw Exception('Failed to generate AI text: ${e.toString()}');
  }
}

Future<Map<String, dynamic>> createTTSAnnouncement(String title, String text, {String? voice, String? folderId, String? zoneId}) async {
  final url = Uri.parse('$apiBase/announcements/tts/');
  final body = {
    'title': title,
    'text': text,
    if (voice != null) 'voice': voice,
    if (folderId != null && folderId.isNotEmpty) 'folder_id': folderId, // Use folder_id (backend expects this)
    if (zoneId != null) 'zone_id': zoneId,
  };
  print('Creating TTS announcement - body: ${jsonEncode(body)}');
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to create TTS announcement: ${res.body}');
  }
  // Parse response to get announcement ID
  final data = jsonDecode(res.body) as Map<String, dynamic>;
  return data;
}

Future<Map<String, dynamic>> regenerateTTSAnnouncement(String announcementId, {String? voice, String? provider}) async {
  final url = Uri.parse('$apiBase/announcements/$announcementId/regenerate_tts/');
  final body = <String, dynamic>{};
  if (voice != null) body['voice'] = voice;
  if (provider != null) body['provider'] = provider;
  
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body)).timeout(const Duration(seconds: 60));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    String errorMsg = 'Failed to generate audio: ${res.statusCode}';
    try {
      final errorData = jsonDecode(res.body) as Map<String, dynamic>;
      if (errorData.containsKey('detail')) {
        errorMsg = errorData['detail'].toString();
      }
    } catch (_) {
      errorMsg = 'Failed to generate audio: ${res.statusCode} - ${res.body}';
    }
    throw Exception(errorMsg);
  }
  final data = jsonDecode(res.body) as Map<String, dynamic>;
  return data;
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

Future<Map<String, dynamic>> createClient({
  required String name,
  required String email,
  String? businessName,
  String? telephone,
  String? description,
  String subscriptionTier = 'basic',
  String subscriptionStatus = 'trial',
}) async {
  final url = Uri.parse('$apiBase/admin/clients/');
  final body = {
    'name': name, // Required: Client organization name
    'email': email, // Required: Client organization email
    if (businessName != null && businessName.isNotEmpty) 'business_name': businessName,
    if (telephone != null && telephone.isNotEmpty) 'telephone': telephone,
    if (description != null && description.isNotEmpty) 'description': description,
    'subscription_tier': subscriptionTier,
    'subscription_status': subscriptionStatus,
  };
  final res = await http.post(url, headers: await _authHeaders(), body: jsonEncode(body));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Failed to create client: ${res.body}');
  }
  final data = jsonDecode(res.body);
  if (data is Map<String, dynamic>) return data;
  return {};
}

Future<List<dynamic>> getFloors({String? clientId}) async {
  var urlStr = '$apiBase/zones/floors/';
  final headers = await _authHeaders();
  
  // If clientId provided, set impersonation header to get floors for that client
  if (clientId != null && clientId.isNotEmpty) {
    headers['x-impersonate-client'] = clientId;
  }
  
  final res = await http.get(Uri.parse(urlStr), headers: headers);
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'] as List<dynamic>;
    return [];
  }
  return [];
}

Future<Map<String, dynamic>> createAdminUser(String email, String name, String role, {String? clientId, String? floorId, String? password}) async {
  final url = Uri.parse('$apiBase/admin/users/');
  final body = {
    'email': email,
    'name': name,
    'role': role,
    if (clientId != null) 'client_id': clientId,
    if (floorId != null) 'floor_id': floorId,
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

Future<void> deleteMusicFile(String id) async {
  final res = await http.delete(Uri.parse('$apiBase/music/files/$id/'), headers: await _authHeaders());
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to delete music file');
}

Future<void> deleteAnnouncementFile(String id) async {
  final res = await http.delete(Uri.parse('$apiBase/announcements/$id/'), headers: await _authHeaders());
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to delete announcement');
}

Future<void> deleteFolder(String id) async {
  final res = await http.delete(Uri.parse('$apiBase/music/folders/$id/'), headers: await _authHeaders());
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to delete folder');
}

Future<void> renameFolder(String id, String name) async {
  final res = await http.patch(Uri.parse('$apiBase/music/folders/$id/'), headers: await _authHeaders(), body: jsonEncode({'name': name}));
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to rename folder');
}

Future<void> deleteSchedule(String id) async {
  final res = await http.delete(Uri.parse('$apiBase/schedules/schedules/$id/'), headers: await _authHeaders());
  if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to delete schedule');
}

// Get TTS voices
Future<List<Map<String, dynamic>>> getTTSVoices() async {
  final url = Uri.parse('$apiBase/announcements/tts-voices/');
  final res = await http.get(url, headers: await _authHeaders());
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (data['voices'] is List) {
      return (data['voices'] as List).map((v) => v as Map<String, dynamic>).toList();
    }
  }
  // Return default voices if API fails
  return [
    {'id': 'fable', 'name': 'Fable', 'gender': 'male', 'accent': 'UK English'},
    {'id': 'echo', 'name': 'Echo', 'gender': 'male', 'accent': 'US English'},
    {'id': 'shimmer', 'name': 'Shimmer', 'gender': 'female', 'accent': 'US English'},
    {'id': 'nova', 'name': 'Nova', 'gender': 'female', 'accent': 'US English'},
    {'id': 'onyx', 'name': 'Onyx', 'gender': 'male', 'accent': 'US English'},
    {'id': 'alloy', 'name': 'Alloy', 'gender': 'female', 'accent': 'US English'},
  ];
}

