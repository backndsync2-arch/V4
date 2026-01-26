import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { User as UserIcon, Mail, Building2, Shield, Calendar, HelpCircle, BookOpen, CheckSquare, FileText } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { adminAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { LaunchChecklist } from '@/app/components/LaunchChecklist';
import { ImageUpload } from '@/app/components/ImageUpload';
import { CancellationPolicy } from '@/app/components/CancellationPolicy';
import { TermsAndConditions } from '@/app/components/TermsAndConditions';
import { PrivacyPolicy } from '@/app/components/PrivacyPolicy';
import type { Client } from '@/lib/types';

export function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [client, setClient] = useState<Client | null>(null);

  // Load client data
  React.useEffect(() => {
    const loadClient = async () => {
      if (!user?.clientId) {
        setClient(null);
        return;
      }

      try {
        const clientsData = await adminAPI.getClients();
        const clientsList = Array.isArray(clientsData) ? clientsData : (clientsData as any)?.results ?? [];
        const foundClient = clientsList.find((c: any) => c.id === user.clientId);
        setClient(foundClient || null);
      } catch (error) {
        console.error('Failed to load client data:', error);
        setClient(null);
      }
    };

    void loadClient();
  }, [user?.clientId]);

  const handleSave = () => {
    toast.success('Profile updated successfully');
  };

  const handleRestartTutorial = () => {
    localStorage.removeItem(`sync2gear_tutorial_${user?.role}`);
    // Use the global function to restart tutorial
    if ((window as any).restartTutorial) {
      (window as any).restartTutorial();
    }
    toast.success('Tutorial restarted!');
  };

  // If showing any legal document, render only that with back button
  if (showCancellationPolicy) {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setShowCancellationPolicy(false)}
          className="mb-4"
        >
          ← Back to Profile
        </Button>
        <CancellationPolicy />
      </div>
    );
  }

  if (showTerms) {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setShowTerms(false)}
          className="mb-4"
        >
          ← Back to Profile
        </Button>
        <TermsAndConditions onBack={() => setShowTerms(false)} />
      </div>
    );
  }

  if (showPrivacy) {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setShowPrivacy(false)}
          className="mb-4"
        >
          ← Back to Profile
        </Button>
        <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <UserIcon className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="tutorial">
            <BookOpen className="h-4 w-4 mr-2" />
            Tutorial
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <CheckSquare className="h-4 w-4 mr-2" />
            Checklist
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <ImageUpload
                  currentImage={profileImage || undefined}
                  onImageChange={setProfileImage}
                  variant="profile"
                  size="lg"
                />
                <div>
                  <CardTitle>{user?.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                      {user?.role}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>View and update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              {client && (
                <div className="space-y-2">
                  <Label>Client</Label>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>{client.name}</span>
                    <Badge variant="outline" className="ml-auto">{client.status}</Badge>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span className="capitalize">{user?.role}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Member Since</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{formatDate(user?.createdAt || new Date())}</span>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* API Access (for admins) */}
          {user?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>API Access</CardTitle>
                <CardDescription>Manage API keys and integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">API Key</p>
                  <code className="text-xs text-slate-600 break-all">
                    sk_live_51MxYz...ABC123
                  </code>
                </div>
                <Button variant="outline" className="w-full">
                  Regenerate API Key
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Legal & Policies */}
          <Card>
            <CardHeader>
              <CardTitle>Legal & Policies</CardTitle>
              <CardDescription>Review important legal documents and policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowCancellationPolicy(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Cancellation & Refund Policy
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowTerms(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Terms & Conditions
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowPrivacy(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Privacy Policy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tutorial Tab */}
        <TabsContent value="tutorial">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Tutorial</CardTitle>
              <CardDescription>
                Learn how to use sync2gear with our step-by-step guide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-600 rounded-xl">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      {user?.role === 'admin' ? 'Staff Tutorial' : 'Customer Tutorial'}
                    </h3>
                    <p className="text-sm text-slate-700 mb-4">
                      {user?.role === 'admin'
                        ? 'Learn how to manage clients, monitor the system, and provide support as a sync2gear administrator.'
                        : 'Master your music and announcements system with our comprehensive tutorial covering all features.'}
                    </p>
                    <ul className="space-y-2 mb-4 text-sm text-slate-600">
                      <li className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                        {user?.role === 'admin' ? 'Managing client accounts' : 'Setting up your music library'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                        {user?.role === 'admin' ? 'Client impersonation' : 'Creating announcements'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                        {user?.role === 'admin' ? 'System monitoring' : 'Scheduling automation'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                        {user?.role === 'admin' ? 'Audit logs' : 'Zone management'}
                      </li>
                    </ul>
                    <Button onClick={handleRestartTutorial}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start Tutorial
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-amber-900 mb-2">Tutorial Features</h4>
                <ul className="space-y-1 text-sm text-amber-800">
                  <li>• Interactive step-by-step guidance</li>
                  <li>• Real examples and use cases</li>
                  <li>• Pro tips for advanced features</li>
                  <li>• Pause and resume anytime</li>
                  <li>• ~{user?.role === 'admin' ? '10' : '14'} minutes to complete</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist">
          <LaunchChecklist />
        </TabsContent>
      </Tabs>
    </div>
  );
}