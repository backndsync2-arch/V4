import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { 
  Settings, Users, Building2, Crown, CreditCard, Edit2, Trash2, Plus, 
  Check, X, AlertCircle, Mail, Phone, Calendar, DollarSign, Shield, Key, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { mockClients } from '@/lib/mockData';

export function AdminSettings() {
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    businessName: '',
    email: '',
    telephone: '',
    description: '',
    trialDays: 7,
    subscriptionPrice: 49.99,
    multiFloor: false,
    aiCredits: 100,
    maxFloors: 1,
  });

  const handleCreateClient = () => {
    if (!newClient.name || !newClient.businessName || !newClient.email || !newClient.telephone) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success(`Client "${newClient.businessName}" created successfully!`, {
      description: `Trial: ${newClient.trialDays} days | £${newClient.subscriptionPrice}/month`,
    });

    setCreateClientOpen(false);
    setNewClient({
      name: '',
      businessName: '',
      email: '',
      telephone: '',
      description: '',
      trialDays: 7,
      subscriptionPrice: 49.99,
      multiFloor: false,
      aiCredits: 100,
      maxFloors: 1,
    });
  };

  const handleTogglePremium = (clientId: string, currentStatus: boolean) => {
    const client = mockClients.find(c => c.id === clientId);
    if (client) {
      toast.success(
        `${currentStatus ? 'Disabled' : 'Enabled'} multi-floor for ${client.businessName}`,
        {
          description: currentStatus 
            ? 'Client downgraded to Basic plan' 
            : 'Client upgraded to Premium plan',
        }
      );
    }
  };

  const handleAddCredits = (clientId: string) => {
    const client = mockClients.find(c => c.id === clientId);
    if (client) {
      toast.success(`Added 100 AI credits to ${client.businessName}`, {
        description: `New balance: ${client.premiumFeatures.aiCredits + 100} credits`,
      });
    }
  };

  return (
    <>
      <div className="space-y-6 pb-24 md:pb-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-slate-500 mt-1">Manage client accounts and system settings</p>
          </div>
          <Button onClick={() => setCreateClientOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Client Account
          </Button>
        </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="clients">
              <Building2 className="h-4 w-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Accounts</CardTitle>
                <CardDescription>
                  Manage customer accounts, subscriptions, and premium features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockClients.map((client) => (
                  <Card key={client.id} className="border-slate-200">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Client Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{client.businessName}</h3>
                              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                {client.status}
                              </Badge>
                              {client.premiumFeatures.multiFloor && (
                                <Badge className="bg-purple-600">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{client.name}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingClient(client.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => toast.error('Delete functionality coming soon')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Client Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Email</p>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <p className="text-sm font-medium truncate">{client.email}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Telephone</p>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <p className="text-sm font-medium">{client.telephone}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Subscription</p>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-slate-400" />
                              <p className="text-sm font-medium">£{client.subscriptionPrice}/mo</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Created</p>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <p className="text-sm font-medium">
                                {client.createdAt.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Premium Features Controls */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700">Premium Features</h4>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Multi-Floor Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">Multi-Floor Access</p>
                                <p className="text-xs text-slate-500">
                                  {client.premiumFeatures.multiFloor 
                                    ? `Unlimited floors (£29/mo)` 
                                    : `Basic - ${client.premiumFeatures.maxFloors} floor only`}
                                </p>
                              </div>
                              <Switch
                                checked={client.premiumFeatures.multiFloor}
                                onCheckedChange={(checked) => handleTogglePremium(client.id, !checked)}
                              />
                            </div>

                            {/* AI Credits */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">AI Credits</p>
                                <p className="text-xs text-slate-500">
                                  {client.premiumFeatures.aiCredits} credits remaining
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddCredits(client.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add 100
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Stripe Info */}
                        {client.stripeCustomerId && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-blue-800">
                              <strong>Stripe Customer:</strong> {client.stripeCustomerId}<br />
                              <strong>Subscription:</strong> {client.stripeSubscriptionId}<br />
                              <strong>Status:</strong> {client.subscriptionStatus}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscriptions</CardTitle>
                <CardDescription>
                  Manage pricing, Stripe integration, and payment settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-4">Basic Plan</h3>
                      <div className="text-3xl font-bold mb-2">£49.99</div>
                      <p className="text-sm text-slate-600 mb-4">per month</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          1 floor/zone
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          Unlimited devices
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          Music library
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          AI announcements
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Crown className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold">Premium Plan</h3>
                      </div>
                      <div className="text-3xl font-bold mb-2">£29.99</div>
                      <p className="text-sm text-slate-600 mb-4">per month (add-on)</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-purple-600" />
                          Unlimited floors
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-purple-600" />
                          Floor-specific users
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-purple-600" />
                          Advanced scheduling
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-purple-600" />
                          Priority support
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-green-200">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4">AI Credits Pricing</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold">£0.10</p>
                        <p className="text-sm text-slate-600">per credit</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold">100-500</p>
                        <p className="text-sm text-slate-600">avg. monthly usage</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold">50</p>
                        <p className="text-sm text-slate-600">minimum top-up</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Authentication & Security</CardTitle>
                <CardDescription>
                  Configure authentication providers and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OAuth Providers */}
                <div>
                  <h3 className="font-semibold mb-4">OAuth Providers (Firebase Auth)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-white flex items-center justify-center border">
                          <svg className="h-6 w-6" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Google Workspace</p>
                          <p className="text-sm text-slate-500">OAuth 2.0 for business accounts</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-white flex items-center justify-center border">
                          <svg className="h-6 w-6" viewBox="0 0 23 23">
                            <path fill="#f35325" d="M1 1h10v10H1z"/>
                            <path fill="#81bc06" d="M12 1h10v10H12z"/>
                            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                            <path fill="#ffba08" d="M12 12h10v10H12z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Microsoft 365 / Azure AD</p>
                          <p className="text-sm text-slate-500">Enterprise SSO integration</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">Email & Password</p>
                          <p className="text-sm text-slate-500">Traditional authentication</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Security Features */}
                <div>
                  <h3 className="font-semibold mb-4">Security Features</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Require Email Verification</p>
                          <p className="text-sm text-slate-500">Users must verify email before access</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Two-Factor Authentication (2FA)</p>
                          <p className="text-sm text-slate-500">Admin accounts require 2FA</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Strong Password Requirements</p>
                          <p className="text-sm text-slate-500">Min 8 chars, uppercase, number, symbol</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">Session Timeout</p>
                          <p className="text-sm text-slate-500">Auto logout after inactivity</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue="30" className="w-16" />
                        <span className="text-sm text-slate-500">minutes</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium">Login Attempt Limit</p>
                          <p className="text-sm text-slate-500">Block after failed attempts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue="5" className="w-16" />
                        <span className="text-sm text-slate-500">attempts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Firebase Configuration */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Firebase Auth Configuration
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <Label className="text-xs text-slate-600">API Key</Label>
                      <Input 
                        type="password" 
                        defaultValue="AIzaSyC..." 
                        className="font-mono text-xs mt-1" 
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Auth Domain</Label>
                      <Input 
                        defaultValue="sync2gear.firebaseapp.com" 
                        className="font-mono text-xs mt-1" 
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Project ID</Label>
                      <Input 
                        defaultValue="sync2gear-prod" 
                        className="font-mono text-xs mt-1" 
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      <Key className="h-3 w-3 mr-2" />
                      Update Firebase Config
                    </Button>
                  </div>
                </div>

                {/* Security Status */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-green-700">256-bit</p>
                          <p className="text-xs text-green-600">Encryption</p>
                        </div>
                        <Lock className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-blue-700">HTTPS</p>
                          <p className="text-xs text-blue-600">SSL/TLS</p>
                        </div>
                        <Shield className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-purple-700">GDPR</p>
                          <p className="text-xs text-purple-600">Compliant</p>
                        </div>
                        <Check className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button className="w-full md:w-auto">
                  <Shield className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure global application settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Default Trial Period</p>
                      <p className="text-sm text-slate-500">Days for new client trials</p>
                    </div>
                    <Input type="number" defaultValue="7" className="w-20" />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Default AI Credits</p>
                      <p className="text-sm text-slate-500">Starting credits for new clients</p>
                    </div>
                    <Input type="number" defaultValue="100" className="w-20" />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Stripe Test Mode</p>
                      <p className="text-sm text-slate-500">Use Stripe test keys</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Auto-Approve New Signups</p>
                      <p className="text-sm text-slate-500">Automatically activate new clients</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Button className="w-full md:w-auto">
                  Save System Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Create New Client Account
            </DialogTitle>
            <DialogDescription>
              Set up a new customer account with trial and subscription settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name *</Label>
                <Input
                  placeholder="John Smith"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input
                  placeholder="ABC Ltd"
                  value={newClient.businessName}
                  onChange={(e) => setNewClient({ ...newClient, businessName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="contact@business.com"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telephone *</Label>
                <Input
                  type="tel"
                  placeholder="+44 20 1234 5678"
                  value={newClient.telephone}
                  onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Business Description</Label>
              <Input
                placeholder="E.g., Coffee shop in downtown London"
                value={newClient.description}
                onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Trial Days</Label>
                <Input
                  type="number"
                  min="0"
                  value={newClient.trialDays}
                  onChange={(e) => setNewClient({ ...newClient, trialDays: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Price (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newClient.subscriptionPrice}
                  onChange={(e) => setNewClient({ ...newClient, subscriptionPrice: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Starting AI Credits</Label>
                <Input
                  type="number"
                  min="0"
                  value={newClient.aiCredits}
                  onChange={(e) => setNewClient({ ...newClient, aiCredits: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="font-medium">Enable Multi-Floor Premium</p>
                <p className="text-sm text-slate-600">Unlimited floors + floor users</p>
              </div>
              <Switch
                checked={newClient.multiFloor}
                onCheckedChange={(checked) => setNewClient({ 
                  ...newClient, 
                  multiFloor: checked,
                  maxFloors: checked ? 999 : 1
                })}
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ✓ Account will be created in "trial" status<br />
                ✓ Client will receive welcome email with login details<br />
                ✓ Stripe customer and subscription will be created automatically<br />
                ✓ Trial ends after {newClient.trialDays} days
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateClientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClient} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Client Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}