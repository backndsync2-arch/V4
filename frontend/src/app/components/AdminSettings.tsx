import React, { useState, useEffect } from 'react';
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
  Check, X, AlertCircle, Mail, Phone, Calendar, DollarSign, Shield, Key, Lock, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { adminAPI } from '@/lib/api';
import type { Client } from '@/lib/types';

// Helper function to map backend client to frontend format
const mapBackendClient = (backendClient: any): Client => {
  const premiumFeatures = backendClient.premium_features || {};
  return {
    id: backendClient.id,
    name: backendClient.name || '',
    businessName: backendClient.business_name || backendClient.name || '',
    email: backendClient.email || '',
    telephone: backendClient.telephone || '',
    description: backendClient.description || '',
    status: backendClient.is_active 
      ? (backendClient.subscription_status === 'trial' ? 'trial' : 'active')
      : 'suspended',
    trialDays: backendClient.trial_days || 0,
    trialEndsAt: backendClient.trial_ends_at ? new Date(backendClient.trial_ends_at) : undefined,
    subscriptionPrice: backendClient.subscription_price || 49.99,
    subscriptionStatus: backendClient.subscription_status || 'active',
    stripeCustomerId: backendClient.stripe_customer_id,
    stripeSubscriptionId: backendClient.stripe_subscription_id,
    premiumFeatures: {
      multiFloor: premiumFeatures.multiFloor || false,
      aiCredits: premiumFeatures.aiCredits || 0,
      maxFloors: premiumFeatures.maxFloors || backendClient.max_floors || 1,
    },
    createdAt: backendClient.created_at ? new Date(backendClient.created_at) : new Date(),
    updatedAt: backendClient.updated_at ? new Date(backendClient.updated_at) : new Date(),
  };
};

export function AdminSettings() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Load clients from API
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await adminAPI.getClients();
      const mappedClients = Array.isArray(clientsData) 
        ? clientsData.map(mapBackendClient)
        : [];
      setClients(mappedClients);
    } catch (error: any) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients', {
        description: error?.message || 'Please try again later',
      });
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.businessName || !newClient.email || !newClient.telephone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Map frontend format to backend format
      // Note: adminAPI.createClient expects: name, email, subscription_tier
      // But we'll use updateClient after creation to set all other fields
      const backendData: any = {
        name: newClient.businessName,
        email: newClient.email,
        subscription_tier: newClient.multiFloor ? 'enterprise' : 'basic',
      };

      const createdClient = await adminAPI.createClient(backendData);
      
      // Now update with all the additional fields
      // Note: We need to send snake_case to backend, but updateClient expects Client type
      // So we'll use apiFetch directly for the update
      const { apiFetch } = await import('@/lib/api/core');
      await apiFetch(`/admin/clients/${createdClient.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          business_name: newClient.businessName,
          telephone: newClient.telephone,
          description: newClient.description,
          subscription_price: newClient.subscriptionPrice,
          subscription_status: 'trial',
          trial_days: newClient.trialDays,
          premium_features: {
            multiFloor: newClient.multiFloor,
            aiCredits: newClient.aiCredits,
            maxFloors: newClient.multiFloor ? 999 : 1,
          },
          max_floors: newClient.multiFloor ? 999 : 1,
        }),
      });
      
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
      
      // Reload clients
      await loadClients();
    } catch (error: any) {
      console.error('Failed to create client:', error);
      toast.error('Failed to create client', {
        description: error?.message || 'Please try again later',
      });
    }
  };

  const handleTogglePremium = async (clientId: string, currentStatus: boolean) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const updatedPremiumFeatures = {
        ...client.premiumFeatures,
        multiFloor: !currentStatus,
        maxFloors: !currentStatus ? 999 : 1,
      };

      // Use apiFetch directly to send snake_case to backend
      const { apiFetch } = await import('@/lib/api/core');
      await apiFetch(`/admin/clients/${clientId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          premium_features: updatedPremiumFeatures,
          max_floors: !currentStatus ? 999 : 1,
        }),
      });

      toast.success(
        `${!currentStatus ? 'Enabled' : 'Disabled'} multi-floor for ${client.businessName}`,
        {
          description: !currentStatus 
            ? 'Client upgraded to Premium plan' 
            : 'Client downgraded to Basic plan',
        }
      );

      await loadClients();
    } catch (error: any) {
      console.error('Failed to update client:', error);
      toast.error('Failed to update client', {
        description: error?.message || 'Please try again later',
      });
    }
  };

  const handleAddCredits = async (clientId: string) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const newCredits = client.premiumFeatures.aiCredits + 100;
      // Use apiFetch directly to send snake_case to backend
      const { apiFetch } = await import('@/lib/api/core');
      await apiFetch(`/admin/clients/${clientId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          premium_features: {
            ...client.premiumFeatures,
            aiCredits: newCredits,
          },
        }),
      });

      toast.success(`Added 100 AI credits to ${client.businessName}`, {
        description: `New balance: ${newCredits} credits`,
      });

      await loadClients();
    } catch (error: any) {
      console.error('Failed to update credits:', error);
      toast.error('Failed to add credits', {
        description: error?.message || 'Please try again later',
      });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    if (!confirm(`Are you sure you want to delete ${client.businessName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminAPI.deleteClient(clientId);
      toast.success(`Client "${client.businessName}" deleted successfully`);
      await loadClients();
    } catch (error: any) {
      console.error('Failed to delete client:', error);
      toast.error('Failed to delete client', {
        description: error?.message || 'Please try again later',
      });
    }
  };

  return (
    <>
      <div className="space-y-6 pb-24 md:pb-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Settings</h1>
            <p className="text-slate-400 mt-1">Manage client accounts and system settings</p>
          </div>
          <Button 
            onClick={() => setCreateClientOpen(true)} 
            className="gap-2 bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1aa34a] hover:to-[#1db954] text-white"
          >
            <Plus className="h-4 w-4" />
            Create Client Account
          </Button>
        </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="clients" className="data-[state=active]:bg-[#1db954] data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-[#1db954] data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-[#1db954] data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-[#1db954] data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Client Accounts</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage customer accounts, subscriptions, and premium features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1db954]" />
                    <span className="ml-3 text-slate-400">Loading clients...</span>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                    <p className="text-slate-400">No clients found</p>
                    <Button 
                      onClick={() => setCreateClientOpen(true)} 
                      className="mt-4 bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1aa34a] hover:to-[#1db954] text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Client
                    </Button>
                  </div>
                ) : (
                  clients.map((client) => (
                    <Card key={client.id} className="border-slate-700 bg-slate-900/50">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {/* Client Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg text-white">{client.businessName}</h3>
                                <Badge 
                                  variant={client.status === 'active' ? 'default' : 'secondary'}
                                  className={
                                    client.status === 'active' 
                                      ? 'bg-green-600 text-white' 
                                      : client.status === 'trial'
                                      ? 'bg-yellow-600 text-white'
                                      : 'bg-red-600 text-white'
                                  }
                                >
                                  {client.status}
                                </Badge>
                                {client.premiumFeatures.multiFloor && (
                                  <Badge className="bg-purple-600 text-white">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Premium
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-400">{client.name}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                onClick={() => setEditingClient(client.id)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-400 border-red-600/50 hover:bg-red-900/20 hover:text-red-300"
                                onClick={() => handleDeleteClient(client.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Client Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-slate-700">
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Email</p>
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-slate-500" />
                                <p className="text-sm font-medium text-slate-300 truncate">{client.email}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Telephone</p>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-500" />
                                <p className="text-sm font-medium text-slate-300">{client.telephone}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Subscription</p>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-slate-500" />
                                <p className="text-sm font-medium text-slate-300">£{client.subscriptionPrice}/mo</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Created</p>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-500" />
                                <p className="text-sm font-medium text-slate-300">
                                  {client.createdAt.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Premium Features Controls */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-300">Premium Features</h4>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Multi-Floor Toggle */}
                              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div>
                                  <p className="font-medium text-sm text-white">Multi-Floor Access</p>
                                  <p className="text-xs text-slate-400">
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
                              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div>
                                  <p className="font-medium text-sm text-white">AI Credits</p>
                                  <p className="text-xs text-slate-400">
                                    {client.premiumFeatures.aiCredits} credits remaining
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
                            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-800/50">
                              <p className="text-xs text-blue-300">
                                <strong>Stripe Customer:</strong> {client.stripeCustomerId}<br />
                                <strong>Subscription:</strong> {client.stripeSubscriptionId || 'N/A'}<br />
                                <strong>Status:</strong> {client.subscriptionStatus}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Billing & Subscriptions</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage pricing, Stripe integration, and payment settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-blue-600/50 bg-blue-900/20">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-4 text-white">Basic Plan</h3>
                      <div className="text-3xl font-bold mb-2 text-blue-300">£49.99</div>
                      <p className="text-sm text-slate-400 mb-4">per month</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2 text-slate-300">
                          <Check className="h-4 w-4 text-green-500" />
                          1 floor/zone
                        </li>
                        <li className="flex items-center gap-2 text-slate-300">
                          <Check className="h-4 w-4 text-green-500" />
                          Unlimited devices
                        </li>
                        <li className="flex items-center gap-2 text-slate-300">
                          <Check className="h-4 w-4 text-green-500" />
                          Music library
                        </li>
                        <li className="flex items-center gap-2 text-slate-300">
                          <Check className="h-4 w-4 text-green-500" />
                          AI announcements
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-600/50 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Crown className="h-5 w-5 text-purple-400" />
                        <h3 className="font-semibold text-white">Premium Plan</h3>
                      </div>
                      <div className="text-3xl font-bold mb-2 text-purple-300">£29.99</div>
                      <p className="text-sm text-slate-400 mb-4">per month (add-on)</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2 text-slate-300">
                          <Check className="h-4 w-4 text-purple-400" />
                          Unlimited floors
                        </li>
                        <li className="flex items-center gap-2 text-slate-300">
                          <Check className="h-4 w-4 text-purple-400" />
                          Floor-specific users
                        </li>
                        <li className="flex items-center gap-2 text-slate-300">
                          <Check className="h-4 w-4 text-purple-400" />
                          Advanced scheduling
                        </li>
                        <li className="flex items-center gap-2 text-slate-300">
                          <Check className="h-4 w-4 text-purple-400" />
                          Priority support
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-green-600/50 bg-green-900/20">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 text-white">AI Credits Pricing</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-2xl font-bold text-green-400">£0.10</p>
                        <p className="text-sm text-slate-400">per credit</p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-2xl font-bold text-green-400">100-500</p>
                        <p className="text-sm text-slate-400">avg. monthly usage</p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-2xl font-bold text-green-400">50</p>
                        <p className="text-sm text-slate-400">minimum top-up</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Authentication & Security</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure authentication providers and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OAuth Providers */}
                <div>
                  <h3 className="font-semibold mb-4 text-white">OAuth Providers (Firebase Auth)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-white flex items-center justify-center border border-slate-600">
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
                          <p className="font-medium text-white">Google Workspace</p>
                          <p className="text-sm text-slate-400">OAuth 2.0 for business accounts</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-white flex items-center justify-center border border-slate-600">
                          <svg className="h-6 w-6" viewBox="0 0 23 23">
                            <path fill="#f35325" d="M1 1h10v10H1z"/>
                            <path fill="#81bc06" d="M12 1h10v10H12z"/>
                            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                            <path fill="#ffba08" d="M12 12h10v10H12z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-white">Microsoft 365 / Azure AD</p>
                          <p className="text-sm text-slate-400">Enterprise SSO integration</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center border border-slate-600">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">Email & Password</p>
                          <p className="text-sm text-slate-400">Traditional authentication</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Security Features */}
                <div>
                  <h3 className="font-semibold mb-4 text-white">Security Features</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-white">Require Email Verification</p>
                          <p className="text-sm text-slate-400">Users must verify email before access</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-white">Two-Factor Authentication (2FA)</p>
                          <p className="text-sm text-slate-400">Admin accounts require 2FA</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="font-medium text-white">Strong Password Requirements</p>
                          <p className="text-sm text-slate-400">Min 8 chars, uppercase, number, symbol</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-medium text-white">Session Timeout</p>
                          <p className="text-sm text-slate-400">Auto logout after inactivity</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue="30" className="w-16 bg-slate-800 border-slate-600 text-white" />
                        <span className="text-sm text-slate-400">minutes</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium text-white">Login Attempt Limit</p>
                          <p className="text-sm text-slate-400">Block after failed attempts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue="5" className="w-16 bg-slate-800 border-slate-600 text-white" />
                        <span className="text-sm text-slate-400">attempts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Firebase Configuration */}
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5 text-blue-400" />
                    Firebase Auth Configuration
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <Label className="text-xs text-slate-400">API Key</Label>
                      <Input 
                        type="password" 
                        defaultValue="AIzaSyC..." 
                        className="font-mono text-xs mt-1 bg-slate-800 border-slate-600 text-white" 
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Auth Domain</Label>
                      <Input 
                        defaultValue="sync2gear.firebaseapp.com" 
                        className="font-mono text-xs mt-1 bg-slate-800 border-slate-600 text-white" 
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Project ID</Label>
                      <Input 
                        defaultValue="sync2gear-prod" 
                        className="font-mono text-xs mt-1 bg-slate-800 border-slate-600 text-white" 
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2 border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Key className="h-3 w-3 mr-2" />
                      Update Firebase Config
                    </Button>
                  </div>
                </div>

                {/* Security Status */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-green-600/50 bg-green-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-green-400">256-bit</p>
                          <p className="text-xs text-green-500">Encryption</p>
                        </div>
                        <Lock className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-600/50 bg-blue-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-blue-400">HTTPS</p>
                          <p className="text-xs text-blue-500">SSL/TLS</p>
                        </div>
                        <Shield className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-600/50 bg-purple-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-purple-400">GDPR</p>
                          <p className="text-xs text-purple-500">Compliant</p>
                        </div>
                        <Check className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button className="w-full md:w-auto bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1aa34a] hover:to-[#1db954] text-white">
                  <Shield className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">System Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure global application settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-700">
                    <div>
                      <p className="font-medium text-white">Default Trial Period</p>
                      <p className="text-sm text-slate-400">Days for new client trials</p>
                    </div>
                    <Input type="number" defaultValue="7" className="w-20 bg-slate-800 border-slate-600 text-white" />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-700">
                    <div>
                      <p className="font-medium text-white">Default AI Credits</p>
                      <p className="text-sm text-slate-400">Starting credits for new clients</p>
                    </div>
                    <Input type="number" defaultValue="100" className="w-20 bg-slate-800 border-slate-600 text-white" />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-700">
                    <div>
                      <p className="font-medium text-white">Stripe Test Mode</p>
                      <p className="text-sm text-slate-400">Use Stripe test keys</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-700">
                    <div>
                      <p className="font-medium text-white">Auto-Approve New Signups</p>
                      <p className="text-sm text-slate-400">Automatically activate new clients</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Button className="w-full md:w-auto bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1aa34a] hover:to-[#1db954] text-white">
                  Save System Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5 text-blue-400" />
              Create New Client Account
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Set up a new customer account with trial and subscription settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Contact Name *</Label>
                <Input
                  placeholder="John Smith"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Business Name *</Label>
                <Input
                  placeholder="ABC Ltd"
                  value={newClient.businessName}
                  onChange={(e) => setNewClient({ ...newClient, businessName: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Email Address *</Label>
                <Input
                  type="email"
                  placeholder="contact@business.com"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Telephone *</Label>
                <Input
                  type="tel"
                  placeholder="+44 20 1234 5678"
                  value={newClient.telephone}
                  onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Business Description</Label>
              <Input
                placeholder="E.g., Coffee shop in downtown London"
                value={newClient.description}
                onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Trial Days</Label>
                <Input
                  type="number"
                  min="0"
                  value={newClient.trialDays}
                  onChange={(e) => setNewClient({ ...newClient, trialDays: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Monthly Price (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newClient.subscriptionPrice}
                  onChange={(e) => setNewClient({ ...newClient, subscriptionPrice: parseFloat(e.target.value) })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Starting AI Credits</Label>
                <Input
                  type="number"
                  min="0"
                  value={newClient.aiCredits}
                  onChange={(e) => setNewClient({ ...newClient, aiCredits: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-900/20 rounded-lg border border-purple-800/50">
              <div>
                <p className="font-medium text-white">Enable Multi-Floor Premium</p>
                <p className="text-sm text-slate-400">Unlimited floors + floor users</p>
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

            <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800/50">
              <p className="text-sm text-blue-300">
                ✓ Account will be created in "trial" status<br />
                ✓ Client will receive welcome email with login details<br />
                ✓ Stripe customer and subscription will be created automatically<br />
                ✓ Trial ends after {newClient.trialDays} days
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateClientOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClient} 
              className="bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1aa34a] hover:to-[#1db954] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Client Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}