import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Download, Smartphone, Chrome, Apple, Shield, Volume2, Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import { backgroundAudio } from '@/lib/backgroundAudio';

export function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [permissions, setPermissions] = useState({
    notifications: false,
    wakeLock: false,
    backgroundAudio: false,
  });

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // @ts-ignore
    const isIOSStandalone = window.navigator.standalone === true;
    setIsInstalled(isStandalone || isIOSStandalone);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallDialog(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check permissions
    checkPermissions();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const checkPermissions = async () => {
    const status = backgroundAudio.getStatus();
    
    setPermissions({
      notifications: Notification.permission === 'granted',
      wakeLock: status.hasWakeLock,
      backgroundAudio: status.isSupported,
    });
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      toast.error('Install not available on this device');
      return;
    }

    // Show install prompt
    installPrompt.prompt();

    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success('sync2gear installed successfully!', {
        description: 'Background audio is now enabled',
      });
      setIsInstalled(true);
      setShowInstallDialog(false);
      setShowPermissionsDialog(true);
    } else {
      toast.error('Installation cancelled');
    }

    setInstallPrompt(null);
  };

  const requestNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled');
        setPermissions(prev => ({ ...prev, notifications: true }));
      } else {
        toast.error('Notification permission denied');
      }
    } catch (err) {
      console.error('Notification error:', err);
      toast.error('Could not request notifications');
    }
  };

  const enableBackgroundAudio = async () => {
    try {
      await backgroundAudio.enableBackground();
      toast.success('Background audio enabled!', {
        description: 'Music will play even when screen is off',
      });
      setPermissions(prev => ({ ...prev, wakeLock: true, backgroundAudio: true }));
      checkPermissions();
    } catch (err) {
      console.error('Background audio error:', err);
      toast.error('Could not enable background audio');
    }
  };

  const handleCompleteSetup = () => {
    setShowPermissionsDialog(false);
    toast.success('Setup complete!', {
      description: 'sync2gear is ready for 24/7 operation',
    });
  };

  if (isInstalled && permissions.notifications && permissions.wakeLock) {
    return null; // All set up, hide component
  }

  return (
    <>
      {/* Install Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              Install sync2gear App
            </DialogTitle>
            <DialogDescription>
              Install for background playback and offline access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
              <h3 className="font-semibold mb-4 text-center">Why Install?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Volume2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Background Playback</p>
                    <p className="text-sm text-slate-600">
                      Music continues even when screen is off or app is minimized
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Lock Screen Controls</p>
                    <p className="text-sm text-slate-600">
                      Control playback from your lock screen
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Works Offline</p>
                    <p className="text-sm text-slate-600">
                      Access your library even without internet
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium">24/7 Operation</p>
                    <p className="text-sm text-slate-600">
                      Perfect for business environments that need continuous audio
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform-specific instructions */}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                <strong>Note:</strong> After installing, you'll need to grant permissions for 
                background audio and notifications to work properly.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstallDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Setup Background Audio
            </DialogTitle>
            <DialogDescription>
              Grant permissions for 24/7 background playback
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Notifications */}
            <Card className={permissions.notifications ? 'border-green-200 bg-green-50' : 'border-slate-200'}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      permissions.notifications ? 'bg-green-100' : 'bg-slate-100'
                    }`}>
                      <Volume2 className={`h-5 w-5 ${
                        permissions.notifications ? 'text-green-600' : 'text-slate-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">Notifications</p>
                      <p className="text-sm text-slate-600">For scheduled announcements</p>
                    </div>
                  </div>
                  {permissions.notifications ? (
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Enabled
                    </div>
                  ) : (
                    <Button size="sm" onClick={requestNotifications}>
                      Enable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Background Audio */}
            <Card className={permissions.backgroundAudio ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      permissions.backgroundAudio ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <Lock className={`h-5 w-5 ${
                        permissions.backgroundAudio ? 'text-blue-600' : 'text-slate-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">Background Audio</p>
                      <p className="text-sm text-slate-600">Play with screen off</p>
                    </div>
                  </div>
                  {permissions.backgroundAudio ? (
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      Enabled
                    </div>
                  ) : (
                    <Button size="sm" onClick={enableBackgroundAudio}>
                      Enable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ✓ Background audio keeps music playing 24/7<br />
                ✓ Works even when phone is locked<br />
                ✓ Perfect for retail stores, gyms, and offices<br />
                ✓ Full control from lock screen
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCompleteSetup}
              className="w-full"
            >
              {permissions.notifications && permissions.backgroundAudio ? 'Complete Setup' : 'Skip for Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* iOS Install Instructions */}
      {!isInstalled && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Apple className="h-5 w-5" />
              Install on iOS
            </CardTitle>
            <CardDescription>
              For background audio on iPhone/iPad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>1. Tap the <strong>Share</strong> button in Safari</p>
            <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong></p>
            <p>3. Tap <strong>"Add"</strong> in the top right</p>
            <p className="text-blue-600 font-medium pt-2">
              Then grant permissions for 24/7 background playback!
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
