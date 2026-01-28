import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Rocket,
  Music,
  Radio,
  Calendar,
  Grid3x3,
  Volume2,
  Clock,
  Users,
  CreditCard,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'setup' | 'content' | 'testing' | 'deployment';
  priority: 'critical' | 'recommended' | 'optional';
  subTasks?: string[];
}

const customerChecklist: ChecklistItem[] = [
  {
    id: 'devices',
    title: 'Connect Your Devices',
    description: 'Ensure all audio devices are connected and showing online status',
    icon: Grid3x3,
    category: 'setup',
    priority: 'critical',
    subTasks: [
      'Verify all devices appear in Zones & Devices page',
      'Check that devices show green "online" status',
      'Test audio output on each device',
      'Organize devices into logical zones (e.g., Ground Floor, Upstairs)',
      'Verify device names are clear and identifiable'
    ]
  },
  {
    id: 'zones',
    title: 'Configure Zones',
    description: 'Set up zones for different areas of your business',
    icon: Volume2,
    category: 'setup',
    priority: 'recommended',
    subTasks: [
      'Create zones based on physical locations',
      'Assign devices to appropriate zones',
      'Test zone selection in global header',
      'Verify you can control each zone independently'
    ]
  },
  {
    id: 'music',
    title: 'Upload Music Library',
    description: 'Add your background music and organize it',
    icon: Music,
    category: 'content',
    priority: 'critical',
    subTasks: [
      'Create folders for different music categories (Background, Peak Hours, etc.)',
      'Upload music files (MP3, WAV, or AAC)',
      'Verify files uploaded successfully and show correct duration',
      'Preview music files to ensure quality',
      'Delete any test files or duplicates',
      'Ensure you have rights to play all music commercially'
    ]
  },
  {
    id: 'announcements',
    title: 'Create Announcements',
    description: 'Build your announcement library',
    icon: Radio,
    category: 'content',
    priority: 'critical',
    subTasks: [
      'Create folders for different announcement types (Sales, Safety, Events)',
      'Write announcement scripts (keep under 30 seconds)',
      'Choose appropriate voice and tone for each announcement',
      'Generate TTS audio and preview quality',
      'Enable announcements you want to use immediately',
      'Disable or delete test announcements'
    ]
  },
  {
    id: 'test-instant',
    title: 'Test Instant Announcements',
    description: 'Verify immediate announcement delivery works',
    icon: Zap,
    category: 'testing',
    priority: 'critical',
    subTasks: [
      'Click "Instant Announcement" button',
      'Select a test announcement',
      'Choose one device/zone for testing',
      'Send announcement and verify it plays',
      'Check audio quality and volume level',
      'Test multiple devices to confirm all work'
    ]
  },
  {
    id: 'schedules',
    title: 'Set Up Schedules',
    description: 'Create automated announcement schedules',
    icon: Calendar,
    category: 'content',
    priority: 'recommended',
    subTasks: [
      'Decide between Interval or Timeline mode',
      'Create your first schedule with test announcements',
      'Assign schedule to specific zones/devices',
      'Set quiet hours if needed (e.g., outside business hours)',
      'Enable schedule and monitor first few plays',
      'Adjust timing or frequency based on results'
    ]
  },
  {
    id: 'test-schedule',
    title: 'Test Schedule Engine',
    description: 'Verify automated schedules work correctly',
    icon: Clock,
    category: 'testing',
    priority: 'critical',
    subTasks: [
      'Create a short-interval test schedule (every 2-3 minutes)',
      'Enable the schedule and wait for first play',
      'Verify announcement plays at expected time',
      'Check that quiet hours are respected',
      'Test with multiple devices/zones',
      'Delete test schedule when finished'
    ]
  },
  {
    id: 'volume',
    title: 'Optimize Audio Levels',
    description: 'Ensure proper volume and audio quality',
    icon: Volume2,
    category: 'testing',
    priority: 'recommended',
    subTasks: [
      'Test volume during quiet vs. busy periods',
      'Adjust device volume to comfortable listening level',
      'Ensure announcements are audible but not jarring',
      'Check that music doesn\'t overpower announcements',
      'Test in different areas of your business',
      'Get feedback from staff and customers'
    ]
  },
  {
    id: 'business-hours',
    title: 'Configure Operating Hours',
    description: 'Set up quiet hours and business schedules',
    icon: Clock,
    category: 'setup',
    priority: 'recommended',
    subTasks: [
      'Set quiet hours on schedules for overnight periods',
      'Verify no announcements play when closed',
      'Test schedule behavior across day/night boundaries',
      'Plan different schedules for weekdays vs. weekends if needed'
    ]
  },
  {
    id: 'backup',
    title: 'Backup Important Content',
    description: 'Keep copies of your custom announcements',
    icon: Shield,
    category: 'deployment',
    priority: 'optional',
    subTasks: [
      'Save copies of announcement scripts externally',
      'Keep original music files backed up',
      'Document your schedule configurations',
      'Note your zone and device setup'
    ]
  },
  {
    id: 'staff-training',
    title: 'Train Your Staff',
    description: 'Ensure your team knows how to use the system',
    icon: Users,
    category: 'deployment',
    priority: 'recommended',
    subTasks: [
      'Show staff how to send instant announcements',
      'Explain the difference between preview and live play',
      'Demonstrate how to check device status',
      'Share login credentials securely',
      'Set up team member accounts if needed'
    ]
  },
  {
    id: 'final-check',
    title: 'Final Pre-Launch Check',
    description: 'One last verification before going live',
    icon: Rocket,
    category: 'deployment',
    priority: 'critical',
    subTasks: [
      'All devices showing online and working',
      'Music library organized and complete',
      'Announcements tested and quality-checked',
      'Schedules configured and enabled',
      'Volume levels optimized for your space',
      'Staff trained and comfortable with system',
      'Contact support email saved: support@sync2gear.com'
    ]
  }
];

const staffChecklist: ChecklistItem[] = [
  {
    id: 'client-setup',
    title: 'Create Client Accounts',
    description: 'Set up initial client accounts',
    icon: Users,
    category: 'setup',
    priority: 'critical',
    subTasks: [
      'Collect client business information',
      'Enter contact name, email, and telephone',
      'Configure trial period and subscription pricing',
      'Verify Stripe integration is working',
      'Send welcome email with login credentials'
    ]
  },
  {
    id: 'stripe',
    title: 'Configure Stripe Billing',
    description: 'Set up payment processing',
    icon: CreditCard,
    category: 'setup',
    priority: 'critical',
    subTasks: [
      'Connect Stripe account to backend',
      'Test subscription creation flow',
      'Verify webhook configuration',
      'Test trial-to-paid conversion',
      'Set up payment failure notifications',
      'Configure invoice email templates'
    ]
  },
  {
    id: 'monitoring',
    title: 'Set Up System Monitoring',
    description: 'Configure alerts and monitoring',
    icon: AlertCircle,
    category: 'setup',
    priority: 'critical',
    subTasks: [
      'Set up device offline alerts',
      'Configure payment failure notifications',
      'Enable audit log monitoring',
      'Set up uptime monitoring',
      'Create admin notification channels',
      'Test alert delivery'
    ]
  },
  {
    id: 'test-impersonate',
    title: 'Test Admin Impersonation',
    description: 'Verify you can access client accounts',
    icon: Shield,
    category: 'testing',
    priority: 'critical',
    subTasks: [
      'Impersonate a test client account',
      'Verify orange banner appears',
      'Test making changes as client',
      'Check audit logs record impersonation',
      'Exit admin view and verify return to normal',
      'Test with multiple client accounts'
    ]
  },
  {
    id: 'audit',
    title: 'Verify Audit Logging',
    description: 'Ensure all actions are tracked',
    icon: FileText,
    category: 'testing',
    priority: 'recommended',
    subTasks: [
      'Create test actions across the system',
      'Verify all actions appear in audit logs',
      'Test filtering and searching logs',
      'Confirm client-specific log filtering works',
      'Check log export functionality',
      'Verify timestamps are accurate'
    ]
  },
  {
    id: 'support',
    title: 'Prepare Support Documentation',
    description: 'Create resources for client support',
    icon: Users,
    category: 'deployment',
    priority: 'recommended',
    subTasks: [
      'Document common troubleshooting steps',
      'Create FAQ for clients',
      'Prepare tutorial videos or guides',
      'Set up support ticketing system',
      'Define support hours and SLAs',
      'Train support staff on the system'
    ]
  },
  {
    id: 'backup',
    title: 'Configure Backups',
    description: 'Set up data backup and recovery',
    icon: Shield,
    category: 'setup',
    priority: 'critical',
    subTasks: [
      'Configure automated database backups',
      'Test backup restoration process',
      'Set up file storage backups',
      'Document recovery procedures',
      'Schedule regular backup testing',
      'Store backups in separate location'
    ]
  },
  {
    id: 'security',
    title: 'Security Audit',
    description: 'Verify security measures are in place',
    icon: Shield,
    category: 'testing',
    priority: 'critical',
    subTasks: [
      'Review user authentication flow',
      'Test password reset functionality',
      'Verify API endpoints are secured',
      'Check for exposed sensitive data',
      'Test role-based access controls',
      'Review and update security policies'
    ]
  },
  {
    id: 'performance',
    title: 'Performance Testing',
    description: 'Ensure system can handle load',
    icon: Zap,
    category: 'testing',
    priority: 'recommended',
    subTasks: [
      'Test with multiple concurrent clients',
      'Verify device communication at scale',
      'Test with large music libraries',
      'Monitor database query performance',
      'Check API response times',
      'Optimize slow endpoints'
    ]
  },
  {
    id: 'launch',
    title: 'Final Launch Readiness',
    description: 'Complete pre-launch checklist',
    icon: Rocket,
    category: 'deployment',
    priority: 'critical',
    subTasks: [
      'All client accounts configured and tested',
      'Billing and subscription system working',
      'Monitoring and alerts operational',
      'Support resources prepared',
      'Security audit completed',
      'Backup systems verified',
      'Team trained and ready for launch',
      'Launch communication plan ready'
    ]
  }
];

interface LaunchChecklistProps {
  onComplete?: () => void;
}

export function LaunchChecklist({ onComplete }: LaunchChecklistProps) {
  const { user } = useAuth();
  const checklist = user?.role === 'admin' ? staffChecklist : customerChecklist;
  
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem(`sync2gear_checklist_${user?.role}`);
    if (saved) {
      setCompleted(new Set(JSON.parse(saved)));
    }
  }, [user?.role]);

  const handleToggle = (id: string) => {
    const newCompleted = new Set(completed);
    if (completed.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompleted(newCompleted);
    localStorage.setItem(`sync2gear_checklist_${user?.role}`, JSON.stringify([...newCompleted]));
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const progress = (completed.size / checklist.length) * 100;
  const criticalItems = checklist.filter(item => item.priority === 'critical');
  const criticalCompleted = criticalItems.filter(item => completed.has(item.id)).length;

  const categories = [
    { id: 'setup', label: 'Initial Setup', icon: Grid3x3 },
    { id: 'content', label: 'Content Creation', icon: Music },
    { id: 'testing', label: 'Testing & QA', icon: Zap },
    { id: 'deployment', label: 'Deployment', icon: Rocket }
  ];

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {user.role === 'admin' ? 'System Launch Checklist' : 'Go-Live Checklist'}
        </h2>
        <p className="text-gray-400 mt-1">
          Complete these steps to ensure a smooth {user.role === 'admin' ? 'system deployment' : 'launch'}
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Overall Progress</p>
                <p className="text-3xl font-bold mt-1 text-white">
                  {completed.size} / {checklist.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-400">Critical Tasks</p>
                <p className="text-3xl font-bold mt-1 text-white">
                  {criticalCompleted} / {criticalItems.length}
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex gap-2 flex-wrap">
              <Badge variant={criticalCompleted === criticalItems.length ? 'default' : 'destructive'}>
                Critical: {criticalCompleted}/{criticalItems.length}
              </Badge>
              <Badge variant="secondary">
                Recommended: {checklist.filter(i => i.priority === 'recommended' && completed.has(i.id)).length}/
                {checklist.filter(i => i.priority === 'recommended').length}
              </Badge>
              <Badge variant="outline">
                Optional: {checklist.filter(i => i.priority === 'optional' && completed.has(i.id)).length}/
                {checklist.filter(i => i.priority === 'optional').length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {categories.map(category => {
        const items = checklist.filter(item => item.category === category.id);
        const categoryCompleted = items.filter(item => completed.has(item.id)).length;

        return (
          <Card key={category.id} className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {React.createElement(category.icon, {
                    className: "h-5 w-5 text-[#1db954]"
                  })}
                  <div>
                    <CardTitle className="text-white">{category.label}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {categoryCompleted} of {items.length} completed
                    </CardDescription>
                  </div>
                </div>
                <Progress value={(categoryCompleted / items.length) * 100} className="w-24 h-2" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map(item => {
                  const isCompleted = completed.has(item.id);
                  const isExpanded = expandedItems.has(item.id);

                  return (
                    <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
                      <div className={`border rounded-lg p-4 transition-colors ${
                        isCompleted ? 'bg-[#1db954]/10 border-[#1db954]/30' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => handleToggle(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {React.createElement(item.icon, {
                                className: `h-4 w-4 ${isCompleted ? 'text-[#1db954]' : 'text-gray-400'}`
                              })}
                              <h4 className={`font-semibold ${isCompleted ? 'text-[#1db954]' : 'text-white'}`}>
                                {item.title}
                              </h4>
                              <Badge
                                variant={
                                  item.priority === 'critical' ? 'destructive' :
                                  item.priority === 'recommended' ? 'default' : 'outline'
                                }
                                className="text-xs"
                              >
                                {item.priority}
                              </Badge>
                            </div>
                            <p className={`text-sm ${isCompleted ? 'text-[#1db954]/80' : 'text-gray-400'}`}>
                              {item.description}
                            </p>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-white hover:text-white">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>

                        <CollapsibleContent>
                          {item.subTasks && (
                            <div className="mt-4 ml-8 space-y-2">
                              {item.subTasks.map((task, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <Circle className="h-3 w-3 text-gray-400 mt-1 shrink-0" />
                                  <span className="text-sm text-gray-400">{task}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Completion Message */}
      {progress === 100 && (
        <Card className="border-white/10 shadow-lg bg-gradient-to-r from-[#1db954] to-[#1ed760] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-xl">
                <Rocket className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">
                  {user.role === 'admin' ? 'System Ready for Launch!' : 'You\'re Ready to Go Live!'}
                </h3>
                <p className="mt-1 opacity-90">
                  {user.role === 'admin' 
                    ? 'All critical tasks completed. The system is ready for production use.'
                    : 'All tasks completed! Your audio system is ready to transform your business.'}
                </p>
              </div>
              {onComplete && (
                <Button variant="secondary" onClick={onComplete} className="bg-white text-[#1db954] hover:bg-white/90">
                  Continue
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}