import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles,
  Music,
  Radio,
  Calendar,
  Grid3x3,
  Users,
  Eye,
  Play,
  Volume2,
  Clock,
  Zap,
  Settings
} from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ElementType;
  details: string[];
  tips?: string[];
}

interface TutorialData {
  welcome: {
    title: string;
    description: string;
    features: string[];
  };
  steps: TutorialStep[];
  completion: {
    title: string;
    message: string;
    nextSteps: string[];
  };
}

const staffTutorial: TutorialData = {
  welcome: {
    title: "Welcome to sync2gear Staff Portal",
    description: "You're logged in as a sync2gear administrator. This tutorial will guide you through managing clients, monitoring the system, and ensuring smooth operations.",
    features: [
      "Manage multiple client accounts",
      "Impersonate clients for support",
      "Monitor system-wide activity",
      "Create and manage client subscriptions"
    ]
  },
  steps: [
    {
      title: "Admin Dashboard Overview",
      description: "Your command center for monitoring all client activity",
      icon: Eye,
      details: [
        "View real-time statistics across all clients",
        "Monitor system health and connectivity status",
        "Track recent activity and alerts",
        "Quick access to client support tools"
      ],
      tips: [
        "Dashboard refreshes automatically every 30 seconds",
        "Click any metric to drill down into details"
      ]
    },
    {
      title: "Managing Client Accounts",
      description: "Create and manage your client subscriptions",
      icon: Users,
      details: [
        "Click 'Add Client' to create new accounts",
        "Enter business details, contact info, and phone number",
        "Set free trial period (7, 14, 30, or 60 days)",
        "Configure monthly subscription price in £",
        "Stripe integration handles payment collection",
        "Suspend or activate accounts as needed"
      ],
      tips: [
        "Free trials automatically convert to paid subscriptions",
        "Always verify email addresses for client communications",
        "Use clear business names to avoid confusion"
      ]
    },
    {
      title: "Client Impersonation (Admin View)",
      description: "Log in as any client for support and troubleshooting",
      icon: Eye,
      details: [
        "Go to Admin > Clients tab",
        "Click the three-dot menu next to any client",
        "Select 'Impersonate' to view their account",
        "Orange banner shows you're in Admin View mode",
        "Make changes, upload music, or manage their content",
        "Click 'Exit Admin View' when finished"
      ],
      tips: [
        "Perfect for customer support and training",
        "All actions are logged in audit trail",
        "You can add/delete music on behalf of clients"
      ]
    },
    {
      title: "Audit Logs & Monitoring",
      description: "Track all system activity and changes",
      icon: Settings,
      details: [
        "View complete audit trail of all actions",
        "Filter by client to see specific account activity",
        "Search logs by action, resource, or user",
        "Export logs for compliance and reporting",
        "Monitor for suspicious or unusual activity"
      ],
      tips: [
        "Audit logs are immutable and can't be deleted",
        "Use filters to quickly find specific events"
      ]
    },
    {
      title: "System Monitoring",
      description: "Keep track of devices and connectivity",
      icon: Grid3x3,
      details: [
        "Monitor device online/offline status",
        "Track playback events and delivery",
        "View client subscription status",
        "Check payment and billing alerts",
        "Respond to support tickets and issues"
      ],
      tips: [
        "Set up notifications for critical events",
        "Regularly check device connectivity"
      ]
    }
  ],
  completion: {
    title: "You're Ready to Manage sync2gear!",
    message: "You now understand the core admin features. Remember, you can always revisit this tutorial from your profile settings.",
    nextSteps: [
      "Create your first client account",
      "Configure billing and subscription settings",
      "Set up monitoring alerts and notifications",
      "Review the pre-launch checklist"
    ]
  }
};

const customerTutorial: TutorialData = {
  welcome: {
    title: "Welcome to sync2gear",
    description: "Your complete music and announcements management system. This tutorial will show you how to create the perfect audio experience for your business.",
    features: [
      "Manage your music library with folders",
      "Create text-to-speech announcements",
      "Schedule announcements with precision",
      "Control multiple zones and devices"
    ]
  },
  steps: [
    {
      title: "Dashboard - Your Control Centre",
      description: "Everything you need at a glance",
      icon: Sparkles,
      details: [
        "View your music library statistics",
        "See active announcements and schedules",
        "Monitor all connected devices",
        "Quick access to instant announcements",
        "Real-time playback status"
      ],
      tips: [
        "Use the zone selector at the top to switch between locations",
        "Green indicators show devices are online and ready"
      ]
    },
    {
      title: "Music Library",
      description: "Organize and manage your music collection",
      icon: Music,
      details: [
        "Create folders to organize by genre, mood, or time of day",
        "Upload MP3, WAV, or AAC audio files",
        "Drag and drop files for quick uploads",
        "Preview music before sending to devices",
        "Move files between folders easily",
        "Delete music you no longer need"
      ],
      tips: [
        "Organize music by purpose: Background, Peak Hours, Quiet Times",
        "Keep file names clear and descriptive",
        "Preview button plays locally - it won't play on devices"
      ]
    },
    {
      title: "Announcements Studio",
      description: "Create professional announcements in seconds",
      icon: Radio,
      details: [
        "Write your announcement text (up to 500 characters)",
        "Choose from three natural-sounding voices: Sarah, James, or Alex",
        "Select the tone: Motivated, Enthusiastic, or Calm",
        "Generate instant text-to-speech audio",
        "Or upload your own pre-recorded announcements",
        "Organize in folders: Sales, Safety, Events, etc.",
        "Enable/disable announcements as needed"
      ],
      tips: [
        "Keep announcements under 30 seconds for best impact",
        "Use 'Enthusiastic' tone for promotions and sales",
        "Use 'Calm' tone for instructions or information",
        "Test announcements before scheduling"
      ]
    },
    {
      title: "Instant Announcements",
      description: "Play announcements immediately across your business",
      icon: Zap,
      details: [
        "Click the 'Instant Announcement' button on any page",
        "Select which announcement to play",
        "Choose target zones/devices",
        "Click 'Play Now' for immediate delivery",
        "Perfect for urgent messages or time-sensitive promos"
      ],
      tips: [
        "Instant announcements interrupt current audio",
        "Use for urgent messages, closing time, or special events",
        "Check device status before sending"
      ]
    },
    {
      title: "Scheduler - Automated Announcements",
      description: "Set it and forget it - announcements that run automatically",
      icon: Calendar,
      details: [
        "Two modes: Interval-Based and Timeline-Based",
        "Interval Mode: Play every X minutes (e.g., every 15 minutes)",
        "Timeline Mode: Precise control - play at exact times",
        "Set quiet hours to prevent nighttime announcements",
        "Assign schedules to specific zones/devices",
        "Enable/disable schedules without deleting them"
      ],
      tips: [
        "Use Interval mode for regular promotions (e.g., every 20 mins)",
        "Use Timeline mode for specific events (e.g., lunch specials at 12:00)",
        "Set quiet hours for outside business hours",
        "Test schedules on one device before deploying to all"
      ]
    },
    {
      title: "Zones & Device Management",
      description: "Control where your audio plays",
      icon: Grid3x3,
      details: [
        "View all connected devices and their status",
        "Organize devices into zones (e.g., Ground Floor, Patio)",
        "See which devices are online or offline",
        "Monitor what's currently playing on each device",
        "Control volume and settings per zone",
        "Track device last seen times"
      ],
      tips: [
        "Group devices by physical location for easier control",
        "Check device status before sending announcements",
        "Contact support if devices show offline repeatedly"
      ]
    },
    {
      title: "Preview vs. Live Play",
      description: "Understanding the three playback modes",
      icon: Play,
      details: [
        "PREVIEW PLAY: Plays locally on YOUR device only (for testing)",
        "LIVE OUTPUT: Plays on selected business devices (customer-facing)",
        "SCHEDULE ENGINE: Automated playback based on your schedules",
        "Preview buttons are for YOUR ears only",
        "Play buttons send to business devices",
        "Schedules run automatically 24/7"
      ],
      tips: [
        "Always preview before going live",
        "Use preview to test voice, tone, and timing",
        "Live play interrupts current audio on devices"
      ]
    }
  ],
  completion: {
    title: "You're Ready to Transform Your Audio!",
    message: "You now know how to use sync2gear effectively. Start small, experiment, and build your perfect audio experience.",
    nextSteps: [
      "Upload your first music tracks",
      "Create your first announcement",
      "Set up your first schedule",
      "Test everything before going live",
      "Review the pre-launch checklist"
    ]
  }
};

interface TutorialOverlayProps {
  onComplete?: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);

  const tutorial = user?.role === 'admin' ? staffTutorial : customerTutorial;
  const totalSteps = tutorial.steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    // Check if user has seen tutorial
    const hasSeenTutorial = localStorage.getItem(`sync2gear_tutorial_${user?.role}`);
    if (!hasSeenTutorial && user) {
      setOpen(true);
    }
  }, [user]);

  const handleComplete = () => {
    localStorage.setItem(`sync2gear_tutorial_${user?.role}`, 'true');
    setOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(`sync2gear_tutorial_${user?.role}`, 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps completed, show completion screen
      setShowCompletion(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setShowWelcome(true);
    setShowCompletion(false);
    setOpen(true);
  };

  // Export restart function for use in Profile page
  useEffect(() => {
    (window as any).restartTutorial = handleRestart;
    return () => {
      delete (window as any).restartTutorial;
    };
  }, []);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        {showWelcome ? (
          <>
            <DialogHeader className="shrink-0">
              <div className="flex flex-col sm:flex-row items-start gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shrink-0">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl sm:text-2xl">{tutorial.welcome.title}</DialogTitle>
                  <DialogDescription className="mt-1 text-sm">
                    {tutorial.welcome.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1 -mr-1">
              {/* Features */}
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-3">What You'll Learn:</h3>
                <div className="grid gap-3">
                  {tutorial.welcome.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tutorial stats */}
              <div className="p-4 bg-slate-100 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Tutorial Length</p>
                  <p className="text-xs text-slate-500 mt-1">{totalSteps} interactive steps</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Time Required</p>
                  <p className="text-xs text-slate-500 mt-1">~{totalSteps * 2} minutes</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Difficulty</p>
                  <p className="text-xs text-slate-500 mt-1">Beginner-friendly</p>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 flex flex-row justify-between gap-2 pt-4 border-t border-slate-200 mt-4">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button onClick={() => setShowWelcome(false)}>
                Start Tutorial
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        ) : !showCompletion ? (
          <>
            <DialogHeader className="shrink-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    Step {currentStep + 1} of {totalSteps}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleSkip}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-3 pt-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shrink-0">
                  {React.createElement(tutorial.steps[currentStep].icon, {
                    className: "h-6 w-6 text-white"
                  })}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl">
                    {tutorial.steps[currentStep].title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm">
                    {tutorial.steps[currentStep].description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 pr-1 -mr-1">
              {/* Details */}
              <div>
                <h4 className="font-semibold mb-3 text-sm sm:text-base">Key Features:</h4>
                <div className="space-y-2">
                  {tutorial.steps[currentStep].details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-700">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {tutorial.steps[currentStep].tips && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    Pro Tips:
                  </h4>
                  <ul className="space-y-2">
                    {tutorial.steps[currentStep].tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-amber-900 flex items-start gap-2">
                        <span className="text-amber-600 shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 flex flex-row justify-between gap-2 pt-4 border-t border-slate-200 mt-4">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext}>
                {currentStep === totalSteps - 1 ? 'Complete Tutorial' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="shrink-0">
              <div className="flex flex-col sm:flex-row items-start gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg shrink-0">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl sm:text-2xl">
                    {tutorial.completion.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm">
                    {tutorial.completion.message}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1 -mr-1">
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-3">Recommended Next Steps:</h3>
                <div className="space-y-2">
                  {tutorial.completion.nextSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-sm font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-sm text-slate-700 mt-0.5">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Need Help?</h4>
                <p className="text-sm text-blue-800 mb-3">
                  You can restart this tutorial anytime from your Profile settings.
                  Our support team is also here to help!
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    support@sync2gear.com
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Live Chat Available
                  </Badge>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-slate-200 mt-4">
              <Button onClick={handleComplete} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Tutorial
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
