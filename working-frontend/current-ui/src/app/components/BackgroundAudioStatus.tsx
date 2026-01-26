import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Volume2, Lock, Smartphone, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { usePlayback } from '@/lib/playback';
import { toast } from 'sonner';

export function BackgroundAudioStatus() {
  const { backgroundAudioStatus, enableBackgroundPlayback } = usePlayback();

  if (!backgroundAudioStatus) return null;

  const handleEnable = async () => {
    try {
      await enableBackgroundPlayback();
      toast.success('Background audio enabled!', {
        description: 'Music will continue playing with screen off',
      });
    } catch (err) {
      toast.error('Failed to enable background audio');
    }
  };

  const isFullyEnabled = backgroundAudioStatus.isBackgroundEnabled && 
                         backgroundAudioStatus.hasMediaSession;
  
  // Wake Lock is optional (iOS doesn't support it)
  const isWakeLockSupported = 'wakeLock' in navigator;

  return (
    <Card className={isFullyEnabled ? 'border-green-200 bg-gradient-to-br from-green-50 to-white' : 'border-orange-200 bg-gradient-to-br from-orange-50 to-white'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className={`h-5 w-5 ${isFullyEnabled ? 'text-green-600' : 'text-orange-600'}`} />
              Background Playback
            </CardTitle>
            <CardDescription>
              {isFullyEnabled ? '24/7 operation ready' : 'Enable for continuous playback'}
            </CardDescription>
          </div>
          {isFullyEnabled ? (
            <Badge className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="border-orange-600 text-orange-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              Setup Required
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-lg border ${
            backgroundAudioStatus.hasMediaSession 
              ? 'bg-green-50 border-green-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Lock className={`h-4 w-4 ${
                backgroundAudioStatus.hasMediaSession ? 'text-green-600' : 'text-slate-400'
              }`} />
              <span className="text-xs font-medium">Lock Screen</span>
            </div>
            <p className="text-xs text-slate-600">
              {backgroundAudioStatus.hasMediaSession ? 'Enabled' : 'Disabled'}
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${
            isWakeLockSupported && backgroundAudioStatus.hasWakeLock 
              ? 'bg-green-50 border-green-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className={`h-4 w-4 ${
                isWakeLockSupported && backgroundAudioStatus.hasWakeLock ? 'text-green-600' : 'text-slate-400'
              }`} />
              <span className="text-xs font-medium">Wake Lock</span>
            </div>
            <p className="text-xs text-slate-600">
              {isWakeLockSupported && backgroundAudioStatus.hasWakeLock ? 'Active' : 'N/A'}
            </p>
            {!isWakeLockSupported && (
              <p className="text-xs text-slate-500 mt-1">
                iOS doesn't support
              </p>
            )}
          </div>

          <div className={`p-3 rounded-lg border ${
            backgroundAudioStatus.audioContextState === 'running' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className={`h-4 w-4 ${
                backgroundAudioStatus.audioContextState === 'running' ? 'text-green-600' : 'text-slate-400'
              }`} />
              <span className="text-xs font-medium">Audio Engine</span>
            </div>
            <p className="text-xs text-slate-600 capitalize">
              {backgroundAudioStatus.audioContextState || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {isFullyEnabled ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-slate-400" />
            )}
            <span className={isFullyEnabled ? 'text-slate-700' : 'text-slate-500'}>
              Plays with screen off
            </span>
          </div>
          <div className="flex items-center gap-2">
            {backgroundAudioStatus.hasMediaSession ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-slate-400" />
            )}
            <span className={backgroundAudioStatus.hasMediaSession ? 'text-slate-700' : 'text-slate-500'}>
              Lock screen controls
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isFullyEnabled ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-slate-400" />
            )}
            <span className={isFullyEnabled ? 'text-slate-700' : 'text-slate-500'}>
              24/7 continuous playback
            </span>
          </div>
        </div>

        {/* Action Button */}
        {!isFullyEnabled && (
          <Button 
            onClick={handleEnable} 
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Enable Background Audio
          </Button>
        )}

        {isFullyEnabled && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-sm text-green-800">
              ✓ Your system is configured for 24/7 operation<br />
              ✓ Audio will play continuously even with screen off<br />
              ✓ Perfect for retail, gyms, offices, and public spaces
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}