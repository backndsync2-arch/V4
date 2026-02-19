import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:audio_session/audio_session.dart';
import 'package:http/http.dart' as http;
import '../services/storage_service.dart';

class PlayerModel extends ChangeNotifier {
  final AudioPlayer player = AudioPlayer();
  final AudioPlayer annPlayer = AudioPlayer(); // dedicated for announcements
  String? currentTitle;
  Duration duration = Duration.zero;
  Duration position = Duration.zero;
  bool playing = false;
  List<String> _playlistTitles = [];
  double volume = 1.0;
  bool shuffleEnabled = false;
  LoopMode loopMode = LoopMode.off;
  double speed = 1.0;
  
  // Announcement playback state
  String? currentAnnouncementTitle;
  Duration annDuration = Duration.zero;
  Duration annPosition = Duration.zero;
  bool annPlaying = false;

  PlayerModel() {
    _init();
  }

  Future<void> _init() async {
    try {
      final session = await AudioSession.instance;
      await session.configure(const AudioSessionConfiguration(
        avAudioSessionCategory: AVAudioSessionCategory.playback,
        avAudioSessionCategoryOptions: AVAudioSessionCategoryOptions.duckOthers,
        avAudioSessionMode: AVAudioSessionMode.defaultMode,
        avAudioSessionRouteSharingPolicy: AVAudioSessionRouteSharingPolicy.defaultPolicy,
        avAudioSessionSetActiveOptions: AVAudioSessionSetActiveOptions.none,
        androidAudioAttributes: const AndroidAudioAttributes(
          contentType: AndroidAudioContentType.music,
          flags: AndroidAudioFlags.none,
          usage: AndroidAudioUsage.media,
        ),
        androidAudioFocusGainType: AndroidAudioFocusGainType.gain,
        androidWillPauseWhenDucked: true,
      ));
      await player.setVolume(volume);
      await player.setLoopMode(loopMode);
      await player.setShuffleModeEnabled(shuffleEnabled);
      await player.setSpeed(speed);
      
      // Add error handling and state monitoring
      player.playerStateStream.listen((state) {
        print('Player state: $state, processingState: ${state.processingState}');
        if (state.processingState == ProcessingState.idle && state.playing) {
          print('WARNING: Player is idle but marked as playing - may indicate loading issue');
        }
      });
      
      // Listen for playback errors
      player.playbackEventStream.listen((event) {
        duration = event.duration ?? Duration.zero;
        playing = player.playing;
        if (event.processingState == ProcessingState.idle && !playing) {
          print('WARNING: Player is idle and not playing - may indicate error');
        }
        notifyListeners();
      }, onError: (error) {
        print('ERROR in playbackEventStream: $error');
      });
      player.positionStream.listen((pos) {
        position = pos;
        notifyListeners();
      });
      player.currentIndexStream.listen((i) {
        if (i != null && i >= 0 && i < _playlistTitles.length) {
          currentTitle = _playlistTitles[i];
          notifyListeners();
        }
      });
      
      // Initialize announcement player listeners
      annPlayer.playbackEventStream.listen((event) {
        annDuration = event.duration ?? Duration.zero;
        annPlaying = annPlayer.playing;
        notifyListeners();
      }, onError: (error) {
        print('ERROR in annPlayer playbackEventStream: $error');
      });
      annPlayer.positionStream.listen((pos) {
        annPosition = pos;
        notifyListeners();
      });
      annPlayer.playerStateStream.listen((state) {
        if (state.processingState == ProcessingState.completed) {
          currentAnnouncementTitle = null;
          annDuration = Duration.zero;
          annPosition = Duration.zero;
          annPlaying = false;
          notifyListeners();
        } else {
          annPlaying = annPlayer.playing;
          notifyListeners();
        }
      });
    } catch (e) {
      print('Error initializing player: $e');
    }
  }

  List<String> get playlistTitles => _playlistTitles;

  Future<void> playUrl(String url, String title) async {
    currentTitle = title;
    final token = await getAccessToken();
    final headers = <String, String>{};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    // Check if this is an API endpoint URL (needs auth) or presigned S3 URL (doesn't need auth)
    final isApiEndpoint = url.contains('/api/v1/') || url.contains('execute-api');
    final isPresignedS3 = url.contains('X-Amz-') || (url.contains('amazonaws.com') && !url.contains('/api/'));
    final useHeaders = isApiEndpoint && !isPresignedS3 && headers.isNotEmpty;
    
    final source = AudioSource.uri(
      Uri.parse(url),
      headers: useHeaders ? headers : null,
    );
    await player.setAudioSource(source);
    await player.play();
  }

  Future<void> playUrls(List<Map<String, String>> items) async {
    try {
      print('playUrls called with ${items.length} items');
      _playlistTitles = items.map((e) => e['title'] ?? '').toList();
      
      // Get token for headers
      final token = await getAccessToken();
      final headers = <String, String>{};
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
      
      // Use URLs directly - they should already be presigned S3 URLs
      // Skip redirect resolution to avoid hanging/timeouts
      final resolvedItems = items.map((e) {
        final u = (e['url'] ?? '').toString();
        if (u.isEmpty) return null;
        print('Using URL: $u');
        return {
          'url': u,
          'title': e['title'] ?? '',
        };
      }).whereType<Map<String, String>>().toList();
      
      // Resolve redirects for API endpoints to get final S3 URLs
      final resolvedUrls = await Future.wait(resolvedItems.map((e) async {
        final u = (e['url'] ?? '').toString();
        if (u.isEmpty) return {'url': u, 'title': e['title'] ?? ''};
        
        final isApiEndpoint = u.contains('/api/v1/') || u.contains('execute-api');
        final isPresignedS3 = u.contains('X-Amz-') || (u.contains('amazonaws.com') && !u.contains('/api/'));
        
        // For API endpoints that redirect to S3, resolve the redirect
        String finalUrl = u;
        if (isApiEndpoint && !isPresignedS3 && headers.isNotEmpty) {
          try {
            print('Resolving redirect for API endpoint: $u');
            final response = await http.head(Uri.parse(u), headers: headers).timeout(const Duration(seconds: 10));
            if (response.statusCode == 302 || response.statusCode == 301) {
              final location = response.headers['location'];
              if (location != null && location.isNotEmpty) {
                finalUrl = location;
                print('Redirect resolved to: $finalUrl');
              }
            }
          } catch (e) {
            print('Error resolving redirect: $e, using original URL');
          }
        }
        
        return {'url': finalUrl, 'title': e['title'] ?? ''};
      }));
      
      final sources = resolvedUrls.map((e) {
        final u = (e['url'] ?? '').toString();
        print('Processing final URL: $u');
        if (u.isEmpty) {
          print('Skipping empty URL');
          return null;
        }
        try {
          final uri = Uri.parse(u);
          print('Parsed URI: $uri');
          
          // Check if this is an API endpoint URL (needs auth) or presigned S3 URL (doesn't need auth)
          final isApiEndpoint = u.contains('/api/v1/') || u.contains('execute-api');
          final isPresignedS3 = u.contains('X-Amz-') || (u.contains('amazonaws.com') && !u.contains('/api/'));
          
          // Use headers only for API endpoints that don't redirect (direct streaming)
          // For presigned S3 URLs (including resolved redirects), no headers needed
          final useHeaders = isApiEndpoint && !isPresignedS3 && headers.isNotEmpty;
          
          print('URL type - API endpoint: $isApiEndpoint, Presigned S3: $isPresignedS3, Using headers: $useHeaders');
          
          return AudioSource.uri(
            uri,
            headers: useHeaders ? headers : null,
          );
        } catch (e) {
          print('Error creating AudioSource for $u: $e');
          return null;
        }
      }).whereType<AudioSource>().toList();
      
      if (sources.isEmpty) {
        print('No valid audio sources found');
        return;
      }
      
      print('Setting audio source with ${sources.length} sources');
      final playlist = ConcatenatingAudioSource(children: sources);
      
      print('About to set audio source...');
      try {
        await player.setAudioSource(playlist);
        print('Audio source set successfully');
      } catch (e) {
        print('ERROR setting audio source: $e');
        rethrow;
      }
      
      currentTitle = _playlistTitles.isNotEmpty ? _playlistTitles.first : null;
      
      // Wait for source to start loading
      print('Waiting for source to load...');
      int waitCount = 0;
      while (player.playerState.processingState == ProcessingState.idle && waitCount < 10) {
        await Future.delayed(const Duration(milliseconds: 200));
        waitCount++;
        print('Waiting for load... state: ${player.playerState.processingState}');
      }
      
      print('Current state before play: ${player.playerState.processingState}');
      print('Calling player.play()');
      
      try {
        await player.play();
        print('player.play() call completed');
      } catch (e) {
        print('ERROR calling player.play(): $e');
        rethrow;
      }
      
      // Wait and check state
      await Future.delayed(const Duration(milliseconds: 1500));
      final finalState = player.playerState;
      final isPlaying = player.playing;
      print('After play() - playing: $isPlaying, state: $finalState');
      print('Processing state: ${finalState.processingState}');
      
      // If not playing, check for errors
      if (!isPlaying) {
        print('WARNING: Player not playing after play() call');
        if (finalState.processingState == ProcessingState.idle) {
          print('ERROR: Player is idle - source may not have loaded or URL is invalid');
        } else if (finalState.processingState == ProcessingState.loading) {
          print('INFO: Player is still loading, may need more time');
        } else if (finalState.processingState == ProcessingState.idle && !isPlaying) {
          print('ERROR: Player is idle and not playing - likely an error');
        }
      } else {
        print('SUCCESS: Player is playing!');
      }
    } catch (e, stackTrace) {
      print('Error in playUrls: $e');
      print('Stack trace: $stackTrace');
      rethrow;
    }
  }

  Future<void> pause() async {
    await player.pause();
  }

  Future<void> stop() async {
    await player.stop();
    duration = Duration.zero;
    position = Duration.zero;
    currentTitle = null;
    notifyListeners();
  }

  Future<void> seek(Duration d) async {
    await player.seek(d);
  }

  Future<void> setVol(double v) async {
    volume = v.clamp(0.0, 1.0);
    await player.setVolume(volume);
    notifyListeners();
  }

  Future<void> toggleShuffle() async {
    shuffleEnabled = !shuffleEnabled;
    await player.setShuffleModeEnabled(shuffleEnabled);
    notifyListeners();
  }

  Future<void> cycleLoopMode() async {
    if (loopMode == LoopMode.off) {
      loopMode = LoopMode.all;
    } else if (loopMode == LoopMode.all) {
      loopMode = LoopMode.one;
    } else {
      loopMode = LoopMode.off;
    }
    await player.setLoopMode(loopMode);
    notifyListeners();
  }

  Future<void> setLoopMode(LoopMode mode) async {
    loopMode = mode;
    await player.setLoopMode(loopMode);
    notifyListeners();
  }

  Future<void> setPlaybackSpeed(double s) async {
    speed = s;
    await player.setSpeed(speed);
    notifyListeners();
  }

  Future<void> seekToIndex(int i) async {
    await player.seek(null, index: i);
  }
}

