import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { 
  Play, Radio, Music, Calendar, Grid3x3, 
  Volume2, Shuffle, CheckCircle2, ArrowRight, X 
} from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  tips: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to sync2gear',
    description: 'Your complete music and announcements management system for businesses.',
    icon: <Music className="h-12 w-12 text-blue-600" />,
    content: (
      <div className="text-center space-y-4">
        <p>Control live audio output to all your devices</p>
        <p>Manage music libraries and playlists</p>
        <p>Create and schedule announcements</p>
        <p>Monitor device status in real-time</p>
      </div>
    ),
    tips: [
      'Control live audio output to all your devices',
      'Manage music libraries and playlists',
      'Create and schedule announcements',
      'Monitor device status in real-time',
    ],
  },
  {
    title: 'Control Centre',
    description: 'Your mission control for all audio operations.',
    icon: <Play className="h-12 w-12 text-blue-600" />,
    content: (
      <div className="text-center space-y-4">
        <p>Start/Stop live output with one tap</p>
        <p>Control playback with play, pause, skip buttons</p>
        <p>Trigger instant announcements immediately</p>
        <p>View next scheduled announcement countdown</p>
      </div>
    ),
    tips: [
      'Start/Stop live output with one tap',
      'Control playback with play, pause, skip buttons',
      'Trigger instant announcements immediately',
      'View next scheduled announcement countdown',
    ],
  },
  {
    title: 'Zone Management',
    description: 'Organize and control devices by location.',
    icon: <Grid3x3 className="h-12 w-12 text-blue-600" />,
    content: (
      <div className="text-center space-y-4">
        <p>Group devices into zones (Sales Floor, Patio, etc.)</p>
        <p>Control volume per zone or device</p>
        <p>See which devices are online/offline</p>
        <p>Send announcements to specific zones</p>
      </div>
    ),
    tips: [
      'Group devices into zones (Sales Floor, Patio, etc.)',
      'Control volume per zone or device',
      'See which devices are online/offline',
      'Send announcements to specific zones',
    ],
  },
  {
    title: 'Music Library',
    description: 'Upload, organize, and play your music collection.',
    icon: <Music className="h-12 w-12 text-blue-600" />,
    content: (
      <div className="text-center space-y-4">
        <p>Upload music files with drag & drop</p>
        <p>Organize tracks into folders and playlists</p>
        <p>Preview tracks before playing live</p>
        <p>Set active playlist for each zone</p>
      </div>
    ),
    tips: [
      'Upload music files with drag & drop',
      'Organize tracks into folders and playlists',
      'Preview tracks before playing live',
      'Set active playlist for each zone',
    ],
  },
  {
    title: 'Announcements',
    description: 'Create text-to-speech or upload custom audio announcements.',
    icon: <Radio className="h-12 w-12 text-blue-600" />,
    content: (
      <div className="text-center space-y-4">
        <p>Write text announcements (auto-converts to speech)</p>
        <p>Upload pre-recorded audio files</p>
        <p>Play announcements instantly or schedule them</p>
        <p>Duck music volume during announcements</p>
      </div>
    ),
    tips: [
      'Write text announcements (auto-converts to speech)',
      'Upload pre-recorded audio files',
      'Play announcements instantly or schedule them',
      'Duck music volume during announcements',
    ],
  },
  {
    title: 'Scheduler',
    description: 'Automate announcements with interval or timeline modes.',
    icon: <Calendar className="h-12 w-12 text-blue-600" />,
    content: (
      <div className="text-center space-y-4">
        <p>Interval mode: play every X minutes</p>
        <p>Timeline mode: precise scheduling</p>
        <p>Set quiet hours to pause announcements</p>
        <p>Apply different schedules to different zones</p>
      </div>
    ),
    tips: [
      'Interval mode: play every X minutes',
      'Timeline mode: precise scheduling',
      'Set quiet hours to pause announcements',
      'Apply different schedules to different zones',
    ],
  },
  {
    title: 'Mobile Controls',
    description: 'Access key controls from anywhere on mobile.',
    icon: <Volume2 className="h-12 w-12 text-blue-600" />,
    content: (
      <div className="text-center space-y-4">
        <p>Global header shows active zone & status</p>
        <p>Mini player always visible above bottom nav</p>
        <p>Tap mini player to expand full controls</p>
        <p>Emergency announcement button always accessible</p>
      </div>
    ),
    tips: [
      'Global header shows active zone & status',
      'Mini player always visible above bottom nav',
      'Tap mini player to expand full controls',
      'Emergency announcement button always accessible',
    ],
  },
];

interface TutorialProps {
  onComplete: () => void;
}

export function Tutorial({ onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsOpen(false);
    onComplete();
  };

  const step = tutorialSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2">
            <Badge variant="secondary">
              Step {currentStep + 1} of {tutorialSteps.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Tutorial
            </Button>
          </div>
          <DialogTitle className="text-xl sm:text-2xl text-center">{step.title}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-center">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1 -mr-1">
          {/* Progress Bar */}
          <Progress value={progress} className="h-2" />

          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 sm:p-6 rounded-full bg-blue-50">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4 text-sm sm:text-base">
            {step.content}
          </div>

          {/* Tips */}
          <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
            <h4 className="font-semibold mb-3 flex items-center justify-center gap-2 text-sm sm:text-base">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              Key Features
            </h4>
            <ul className="space-y-2">
              {step.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-200 mt-4">
          <div className="flex-1 text-center sm:text-left order-2 sm:order-1">
            {currentStep > 0 && (
              <Button variant="ghost" onClick={handlePrevious} className="w-full sm:w-auto">
                Previous
              </Button>
            )}
          </div>
          <Button onClick={handleNext} className="w-full sm:w-auto order-1 sm:order-2">
            {currentStep < tutorialSteps.length - 1 ? (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Get Started
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('sync2gear_tutorial_completed');
    if (!hasSeenTutorial) {
      // Show tutorial after a short delay
      setTimeout(() => setShowTutorial(true), 1000);
    }
  }, []);

  const completeTutorial = () => {
    localStorage.setItem('sync2gear_tutorial_completed', 'true');
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem('sync2gear_tutorial_completed');
    setShowTutorial(true);
  };

  return {
    showTutorial,
    completeTutorial,
    resetTutorial,
  };
}