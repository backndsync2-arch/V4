import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { User as UserIcon, Mail, Building2, Shield, Calendar, HelpCircle, BookOpen, CheckSquare, FileText } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { mockClients } from '@/lib/mockData';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { LaunchChecklist } from '@/app/components/LaunchChecklist';
import { ImageUpload } from '@/app/components/ImageUpload';
import { CancellationPolicy } from '@/app/components/CancellationPolicy';
import { TermsAndConditions } from '@/app/components/TermsAndConditions';
import { PrivacyPolicy } from '@/app/components/PrivacyPolicy';

export function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const client = user?.clientId ? mockClients.find(c => c.id === user.clientId) : null;

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

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    // Clear password fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    toast.success('Password changed successfully', {
      description: 'Your password has been updated',
    });
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
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border-white/10">
          <TabsTrigger value="profile" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-white/10">
            <UserIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="tutorial" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-white/10">
            <BookOpen className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Tutorial</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-white/10">
            <CheckSquare className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Checklist</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Header */}
          <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <ImageUpload
                  currentImage={profileImage || undefined}
                  onImageChange={setProfileImage}
                  variant="profile"
                  size="lg"
                />
                <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
                  <CardTitle className="text-white text-xl sm:text-2xl">{user?.name}</CardTitle>
                  <CardDescription className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} className="bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 text-[#1db954] border-[#1db954]/30">
                      {user?.role}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Account Information */}
          <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Account Information</CardTitle>
              <CardDescription className="text-gray-400">View and update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              {client && (
                <div className="space-y-2">
                  <Label className="text-white">Client</Label>
                  <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{client.name}</span>
                    <Badge variant="outline" className="ml-auto bg-white/5 border-white/10 text-gray-300">{client.status}</Badge>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-white">Role</Label>
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="capitalize text-white">{user?.role}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Member Since</Label>
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-white">{formatDate(user?.createdAt || new Date())}</span>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-white shadow-lg shadow-[#1db954]/30">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Security</CardTitle>
              <CardDescription className="text-gray-400">Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-white">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-white">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-white">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <Button 
                variant="outline" 
                className="w-full border-white/10 hover:bg-white/10 text-white"
                onClick={handleChangePassword}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>


          {/* Legal & Policies */}
          <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Legal & Policies</CardTitle>
              <CardDescription className="text-gray-400">Review important legal documents and policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start border-white/10 hover:bg-white/10 text-white"
                onClick={() => setShowCancellationPolicy(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Cancellation & Refund Policy
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-white/10 hover:bg-white/10 text-white"
                onClick={() => setShowTerms(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Terms & Conditions
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-white/10 hover:bg-white/10 text-white"
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
          <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Interactive Tutorial</CardTitle>
              <CardDescription className="text-gray-400">
                Learn how to use sync2gear with our step-by-step guide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-[#1db954]/10 to-[#1ed760]/5 border border-[#1db954]/20 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-xl">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 text-white">
                      {user?.role === 'admin' ? 'Staff Tutorial' : 'Customer Tutorial'}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {user?.role === 'admin'
                        ? 'Learn how to manage clients, monitor the system, and provide support as a sync2gear administrator.'
                        : 'Master your music and announcements system with our comprehensive tutorial covering all features.'}
                    </p>
                    <ul className="space-y-2 mb-4 text-sm text-gray-300">
                      <li className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-[#1db954]" />
                        {user?.role === 'admin' ? 'Managing client accounts' : 'Setting up your music library'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-[#1db954]" />
                        {user?.role === 'admin' ? 'Client impersonation' : 'Creating announcements'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-[#1db954]" />
                        {user?.role === 'admin' ? 'System monitoring' : 'Scheduling automation'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-[#1db954]" />
                        {user?.role === 'admin' ? 'Audit logs' : 'Zone management'}
                      </li>
                    </ul>
                    <Button onClick={handleRestartTutorial} className="bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-white shadow-lg shadow-[#1db954]/30">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start Tutorial
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Tutorial Features</h4>
                <ul className="space-y-1 text-sm text-gray-400">
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