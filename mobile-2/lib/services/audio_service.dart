import 'package:just_audio/just_audio.dart';
import 'dart:async';
import '../api.dart' show getAccessToken;

class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;
  AudioService._internal();

  final AudioPlayer _player = AudioPlayer();
  List<String> _currentUrls = [];
  int _currentIndex = 0;
  bool _isPlaying = false;
  bool _isPaused = false;

  AudioPlayer get player => _player;

  bool get isPlaying => _isPlaying && !_isPaused;
  bool get isPaused => _isPaused;
  Duration? get position => _player.position;
  Duration? get duration => _player.duration;
  int get currentIndex => _currentIndex;

  Stream<Duration> get positionStream => _player.positionStream;
  Stream<Duration?> get durationStream => _player.durationStream;
  Stream<bool> get playingStream => _player.playingStream;
  Stream<PlayerState> get playerStateStream => _player.playerStateStream;

  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await getAccessToken();
    final headers = <String, String>{};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  bool _needsAuthHeaders(String url) {
    // Check if this is an API endpoint URL (needs auth) or presigned S3 URL (doesn't need auth)
    final isApiEndpoint = url.contains('/api/v1/') || url.contains('execute-api');
    final isPresignedS3 = url.contains('X-Amz-') || 
                          (url.contains('amazonaws.com') && !url.contains('/api/'));
    return isApiEndpoint && !isPresignedS3;
  }

  Future<void> playUrls(List<String> urls, {int startIndex = 0}) async {
    if (urls.isEmpty) {
      print('playUrls called with empty list');
      return;
    }
    
    _currentUrls = urls;
    _currentIndex = startIndex;
    
    try {
      final headers = await _getAuthHeaders();
      print('Auth headers: ${headers.isNotEmpty ? "Present" : "Missing"}');
      
      // Create a playlist from URLs with proper headers
      final sources = <AudioSource>[];
      for (var url in urls) {
        try {
          final needsAuth = _needsAuthHeaders(url);
          print('Processing URL: $url');
          print('  - Needs auth: $needsAuth');
          
          final uri = Uri.parse(url);
          print('  - Parsed URI: $uri');
          
          if (needsAuth && headers.isNotEmpty) {
            print('  - Using headers for authentication');
            sources.add(AudioSource.uri(uri, headers: headers));
          } else {
            print('  - No headers needed');
            sources.add(AudioSource.uri(uri));
          }
        } catch (e) {
          print('Error creating AudioSource for $url: $e');
          // Continue with other URLs
        }
      }
      
      if (sources.isEmpty) {
        throw Exception('No valid audio sources created');
      }
      
      print('Creating playlist with ${sources.length} sources');
      final playlist = ConcatenatingAudioSource(children: sources);
      
      print('Setting audio source...');
      await _player.setAudioSource(playlist, initialIndex: startIndex);
      print('Audio source set, starting playback...');
      
      await _player.play();
      _isPlaying = true;
      _isPaused = false;
      print('Playback started successfully');
      
      // Handle player state changes
      _player.playerStateStream.listen((state) {
        print('Player state: ${state.processingState}, playing: ${state.playing}');
        if (state.processingState == ProcessingState.completed) {
          _isPlaying = false;
          print('Playback completed');
        } else if (state.processingState == ProcessingState.loading) {
          print('Loading audio...');
        } else if (state.processingState == ProcessingState.ready) {
          print('Audio ready');
        }
      });
      
      // Handle errors
      _player.playerStateStream.listen((state) {
        if (state.processingState == ProcessingState.idle && state.playing == false) {
          print('Player is idle');
        }
      });
    } catch (e, stackTrace) {
      print('Error playing URLs: $e');
      print('Stack trace: $stackTrace');
      _isPlaying = false;
      rethrow;
    }
  }

  Future<void> playSingle(String url) async {
    try {
      final headers = await _getAuthHeaders();
      final needsAuth = _needsAuthHeaders(url);
      
      if (needsAuth && headers.isNotEmpty) {
        await _player.setUrl(
          Uri.parse(url),
          headers: headers,
        );
      } else {
        await _player.setUrl(url);
      }
      
      await _player.play();
      _isPlaying = true;
      _isPaused = false;
    } catch (e) {
      print('Error playing single URL: $e');
      _isPlaying = false;
      rethrow;
    }
  }

  Future<void> pause() async {
    await _player.pause();
    _isPaused = true;
  }

  Future<void> resume() async {
    await _player.play();
    _isPaused = false;
  }

  Future<void> stop() async {
    await _player.stop();
    _isPlaying = false;
    _isPaused = false;
  }

  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  Future<void> skipToNext() async {
    await _player.seekToNext();
  }

  Future<void> skipToPrevious() async {
    await _player.seekToPrevious();
  }

  Future<void> setVolume(double volume) async {
    await _player.setVolume(volume.clamp(0.0, 1.0));
  }

  Future<void> setLoopMode(LoopMode mode) async {
    await _player.setLoopMode(mode);
  }

  Future<void> dispose() async {
    await _player.dispose();
  }
}

