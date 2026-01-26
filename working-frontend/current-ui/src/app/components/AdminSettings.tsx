import { useEffect, useMemo, useState } from 'react';
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
  Settings, Building2, Crown, CreditCard, Edit2, Trash2, Plus,
  Check, AlertCircle, Mail, Phone, Calendar, DollarSign, Shield, Key, Lock
} from 'lucide-react';
import { toast } from 'sonner';
// Mock data imports removed - using API only
import { ClientDetailsDialog } from '@/app/components/ClientDetailsDialog';
import { adminAPI } from '@/lib/api';

export function AdminSettings() {
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsClient, setDetailsClient] = useState<any | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    businessName: '',
    email: '',
    telephone: '',
    description: '',
    subscriptionPrice: 49.99,
    trialDays: 0,
    statusActive: true,
  });

  const editingClientObj = useMemo(
    () => clients.find((c) => c.id === editingClient) ?? null,
    [clients, editingClient]
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const deletingClientObj = useMemo(
    () => clients.find((c) => c.id === deleteClientId) ?? null,
    [clients, deleteClientId]
  );

  const [billingOpen, setBillingOpen] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingClientId, setBillingClientId] = useState<string | null>(null);
  const billingClientObj = useMemo(
    () => clients.find((c) => c.id === billingClientId) ?? null,
    [clients, billingClientId]
  );
  const [billingForm, setBillingForm] = useState({
    subscriptionTier: 'basic',
    subscriptionStatus: 'active',
    subscriptionPrice: 49.99,
    trialDays: 0,
  });

  const getBusinessName = (client: any) => client?.business_name || client?.businessName || client?.name || 'Client';
  const getContactName = (client: any) => client?.name || client?.contact_name || getBusinessName(client);
  const getClientStatus = (client: any): { label: string; variant: 'default' | 'secondary' } => {
    if (typeof client?.is_active === 'boolean') {
      return client.is_active ? { label: 'active', variant: 'default' } : { label: 'suspended', variant: 'secondary' };
    }
    const s = client?.status;
    if (s === 'active' || s === 'trial') return { label: s, variant: 'default' };
    if (s === 'suspended') return { label: s, variant: 'secondary' };
    return { label: 'unknown', variant: 'secondary' };
  };
  const getSubscriptionPrice = (client: any) => Number(client?.subscription_price ?? client?.subscriptionPrice ?? 0);
  const getCreatedAt = (client: any): Date | null => {
    if (client?.created_at) return new Date(client.created_at);
    if (client?.createdAt instanceof Date) return client.createdAt;
    return null;
  };
  const getPremiumMultiFloor = (client: any) =>
    Boolean(client?.premium_multi_floor ?? client?.premiumFeatures?.multiFloor ?? client?.premiumFeatures?.multi_floor);
  const getPremiumCredits = (client: any) =>
    Number(client?.premium_ai_credits ?? client?.premiumFeatures?.aiCredits ?? 0);
  const getPremiumMaxFloors = (client: any) =>
    Number(client?.premium_max_floors ?? client?.premiumFeatures?.maxFloors ?? 1);

  const openBilling = (client: any) => {
    setBillingClientId(client.id);
    setBillingForm({
      subscriptionTier: String(client?.subscription_tier ?? 'basic'),
      subscriptionStatus: String(client?.subscription_status ?? client?.subscriptionStatus ?? 'active'),
      subscriptionPrice: getSubscriptionPrice(client),
      trialDays: Number(client?.trial_days ?? client?.trialDays ?? 0),
    });
    setBillingOpen(true);
  };

  const [securityForm, setSecurityForm] = useState({
    strongPassword: true,
    sessionTimeoutMinutes: 30,
    loginAttemptLimit: 5,
    lockoutMinutes: 15,
  });

  useEffect(() => {
    // Local, enforceable security policies (used by auth + signup in this frontend).
    // Real org-wide security settings should live in the backend; until then we persist to localStorage.
    const sp = localStorage.getItem('sync2gear_security_strong_password');
    const stm = localStorage.getItem('sync2gear_security_session_timeout_minutes');
    const lal = localStorage.getItem('sync2gear_security_login_attempt_limit');
    const lom = localStorage.getItem('sync2gear_security_lockout_minutes');
    setSecurityForm({
      strongPassword: sp ? sp === 'true' : true,
      sessionTimeoutMinutes: stm ? Number(stm) : 30,
      loginAttemptLimit: lal ? Number(lal) : 5,
      lockoutMinutes: lom ? Number(lom) : 15,
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const resp = await adminAPI.getClients();
        const list = Array.isArray(resp) ? resp : (resp as any)?.results ?? [];
        setClients(list);
      } catch (e: any) {
        // Fallback for demo mode / missing permissions
        console.warn('Admin clients API unavailable, using mock data:', e);
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);
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

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.businessName || !newClient.email || !newClient.telephone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreateSaving(true);
    try {
      const created = await adminAPI.createClient({
        name: newClient.name.trim(),
        email: newClient.email.trim(),
        business_name: newClient.businessName.trim(),
        telephone: newClient.telephone.trim(),
        description: newClient.description.trim(),
        trial_days: newClient.trialDays,
        subscription_price: newClient.subscriptionPrice,
        subscription_status: 'trial',
        premium_multi_floor: newClient.multiFloor,
        premium_ai_credits: newClient.aiCredits,
        premium_max_floors: newClient.maxFloors,
        is_active: true,
      } as any);

      setClients((prev) => [created, ...prev]);
      toast.success(`Client "${newClient.businessName}" created`, {
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
    } catch (e: any) {
      toast.error('Failed to create client', { description: e?.message });
    } finally {
      setCreateSaving(false);
    }
  };

  const handleTogglePremium = async (clientId: string, enableMultiFloor: boolean) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    try {
      const updated = await adminAPI.updateClient(clientId, {
        premium_multi_floor: enableMultiFloor,
        premium_max_floors: enableMultiFloor ? 999 : 1,
      } as any);
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...updated } : c)));
      toast.success(`${enableMultiFloor ? 'Enabled' : 'Disabled'} multi-floor`, {
        description: `Client: ${getBusinessName(client)}`,
      });
    } catch (e: any) {
      toast.error('Failed to update premium', { description: e?.message });
    }
  };

  const handleAddCredits = async (clientId: string, amount: number = 100) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const current = getPremiumCredits(client);
    const next = current + amount;
    try {
      const updated = await adminAPI.updateClient(clientId, { premium_ai_credits: next } as any);
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...updated } : c)));
      toast.success(`Added ${amount} AI credits`, {
        description: `${getBusinessName(client)} now has ${next} credits`,
      });
    } catch (e: any) {
      toast.error('Failed to add credits', { description: e?.message });
    }
  };

  const openEdit = (client: any) => {
    setEditingClient(client.id);
    const businessName = client.business_name || client.businessName || client.name || '';
    setEditForm({
      businessName,
      email: client.email || '',
      telephone: client.telephone || '',
      description: client.description || '',
      subscriptionPrice: Number(client.subscription_price ?? client.subscriptionPrice ?? 0),
      trialDays: Number(client.trial_days ?? client.trialDays ?? 0),
      statusActive: typeof client.is_active === 'boolean' ? client.is_active : client.status !== 'suspended',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingClientObj) return;
    if (!editForm.businessName.trim() || !editForm.email.trim()) {
      toast.error('Business name and email are required');
      return;
    }

    setEditSaving(true);
    try {
      const id = editingClientObj.id;

      // Try backend PATCH first (works when client objects are from backend).
      try {
        const updated = await adminAPI.updateClient(id, {
          name: editForm.businessName.trim(),
          business_name: editForm.businessName.trim(),
          email: editForm.email.trim(),
          telephone: editForm.telephone.trim(),
          description: editForm.description.trim(),
          subscription_price: editForm.subscriptionPrice,
          trial_days: editForm.trialDays,
          is_active: editForm.statusActive,
        } as any);

        setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      } catch (e: any) {
        // Demo-mode fallback: update local list with camelCase fields.
        setClients((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  businessName: editForm.businessName.trim(),
                  email: editForm.email.trim(),
                  telephone: editForm.telephone.trim(),
                  description: editForm.description.trim(),
                  subscriptionPrice: editForm.subscriptionPrice,
                  trialDays: editForm.trialDays,
                  status: editForm.statusActive ? 'active' : 'suspended',
                  is_active: editForm.statusActive,
                }
              : c
          )
        );
      }

      toast.success('Client updated');
      setEditOpen(false);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <ClientDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} client={detailsClient} />
      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setDeleteClientId(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete client</DialogTitle>
            <DialogDescription>
              This will permanently delete the client record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-3">
            <div className="font-medium">{deletingClientObj ? getBusinessName(deletingClientObj) : 'Client'}</div>
            <div className="text-sm text-slate-600 font-mono break-all">{deletingClientObj?.email || ''}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteSaving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteClientId || deleteSaving}
              onClick={async () => {
                if (!deleteClientId) return;
                setDeleteSaving(true);
                try {
                  await adminAPI.deleteClient(deleteClientId);
                  setClients((prev) => prev.filter((c) => c.id !== deleteClientId));
                  toast.success('Client deleted');
                  setDeleteOpen(false);
                } catch (e: any) {
                  toast.error('Failed to delete client', { description: e?.message });
                } finally {
                  setDeleteSaving(false);
                }
              }}
            >
              {deleteSaving ? 'Deleting…' : 'Delete client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditingClient(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
            <DialogDescription>Update client contact, billing, and status.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business name *</Label>
                <Input
                  value={editForm.businessName}
                  onChange={(e) => setEditForm((p) => ({ ...p, businessName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input
                  value={editForm.telephone}
                  onChange={(e) => setEditForm((p) => ({ ...p, telephone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{editForm.statusActive ? 'Active' : 'Suspended'}</p>
                    <p className="text-xs text-slate-500">Suspend disables client access</p>
                  </div>
                  <Switch
                    checked={editForm.statusActive}
                    onCheckedChange={(checked) => setEditForm((p) => ({ ...p, statusActive: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trial days</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.trialDays}
                  onChange={(e) => setEditForm((p) => ({ ...p, trialDays: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly price (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.subscriptionPrice}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, subscriptionPrice: Number(e.target.value || 0) }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={editSaving} className="bg-blue-600 hover:bg-blue-700">
              {editSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={billingOpen}
        onOpenChange={(v) => {
          setBillingOpen(v);
          if (!v) setBillingClientId(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Billing & subscription</DialogTitle>
            <DialogDescription>Update client billing fields stored in the backend.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3">
              <div className="font-medium">{billingClientObj ? getBusinessName(billingClientObj) : 'Client'}</div>
              <div className="text-sm text-slate-600 font-mono break-all">{billingClientObj?.email || ''}</div>
              {(billingClientObj?.stripe_customer_id || billingClientObj?.stripeCustomerId) && (
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                  <div>
                    Stripe customer: <span className="font-mono break-all">{billingClientObj.stripe_customer_id || billingClientObj.stripeCustomerId}</span>
                  </div>
                  <div>
                    Stripe subscription:{' '}
                    <span className="font-mono break-all">{billingClientObj.stripe_subscription_id || billingClientObj.stripeSubscriptionId}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subscription tier</Label>
                <Select
                  value={billingForm.subscriptionTier}
                  onValueChange={(v) => setBillingForm((p) => ({ ...p, subscriptionTier: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">basic</SelectItem>
                    <SelectItem value="premium">premium</SelectItem>
                    <SelectItem value="enterprise">enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subscription status</Label>
                <Select
                  value={billingForm.subscriptionStatus}
                  onValueChange={(v) => setBillingForm((p) => ({ ...p, subscriptionStatus: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="trial">trial</SelectItem>
                    <SelectItem value="past_due">past_due</SelectItem>
                    <SelectItem value="cancelled">cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly price (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={billingForm.subscriptionPrice}
                  onChange={(e) => setBillingForm((p) => ({ ...p, subscriptionPrice: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Trial days</Label>
                <Input
                  type="number"
                  min="0"
                  value={billingForm.trialDays}
                  onChange={(e) => setBillingForm((p) => ({ ...p, trialDays: Number(e.target.value || 0) }))}
                />
              </div>
            </div>

            <div className="rounded-lg border p-3 bg-slate-50 text-sm text-slate-600">
              Stripe actions (cancel subscription, sync invoices, plan changes) require dedicated backend endpoints. This dialog
              updates the stored billing fields via `PATCH /api/admin/clients/{billingClientId}/`.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingOpen(false)} disabled={billingSaving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!billingClientId) return;
                setBillingSaving(true);
                try {
                  const updated = await adminAPI.updateClient(billingClientId, {
                    subscription_tier: billingForm.subscriptionTier,
                    subscription_status: billingForm.subscriptionStatus,
                    subscription_price: billingForm.subscriptionPrice,
                    trial_days: billingForm.trialDays,
                  } as any);
                  setClients((prev) => prev.map((c) => (c.id === billingClientId ? { ...c, ...updated } : c)));
                  toast.success('Billing updated');
                  setBillingOpen(false);
                } catch (e: any) {
                  toast.error('Failed to update billing', { description: e?.message });
                } finally {
                  setBillingSaving(false);
                }
              }}
              disabled={!billingClientId || billingSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {billingSaving ? 'Saving…' : 'Save billing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                {clients.map((client) => (
                  <Card
                    key={client.id}
                    className="border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      setDetailsClient(client);
                      setDetailsOpen(true);
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Client Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{getBusinessName(client)}</h3>
                              {(() => {
                                const s = getClientStatus(client);
                                return <Badge variant={s.variant}>{s.label}</Badge>;
                              })()}
                              {getPremiumMultiFloor(client) && (
                                <Badge className="bg-purple-600">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{getContactName(client)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(client);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteClientId(client.id);
                                setDeleteOpen(true);
                              }}
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
                              <p className="text-sm font-medium">{client.telephone || '—'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Subscription</p>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-slate-400" />
                              <p className="text-sm font-medium">
                                £{getSubscriptionPrice(client)}/mo
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Created</p>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <p className="text-sm font-medium">
                                {getCreatedAt(client)?.toLocaleDateString?.() || '—'}
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
                                  {getPremiumMultiFloor(client)
                                    ? `Unlimited floors (£29/mo)`
                                    : `Basic - ${getPremiumMaxFloors(client)} floor only`}
                                </p>
                              </div>
                              <Switch
                                checked={getPremiumMultiFloor(client)}
                                onCheckedChange={(checked) => handleTogglePremium(client.id, checked)}
                              />
                            </div>

                            {/* AI Credits */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">AI Credits</p>
                                <p className="text-xs text-slate-500">
                                  {getPremiumCredits(client)} credits remaining
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddCredits(client.id, 100)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add 100
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Stripe Info */}
                        {(client.stripe_customer_id || client.stripeCustomerId) && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-blue-800">
                              <strong>Stripe Customer:</strong> {client.stripe_customer_id || client.stripeCustomerId}<br />
                              <strong>Subscription:</strong> {client.stripe_subscription_id || client.stripeSubscriptionId}<br />
                              <strong>Status:</strong> {client.subscription_status || client.subscriptionStatus || 'N/A'}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {isLoading && (
                  <p className="text-sm text-slate-500">Loading clients from backend…</p>
                )}
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
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Client billing records</CardTitle>
                    <CardDescription>View and update each client’s stored billing fields.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {clients.map((c) => (
                      <div key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{getBusinessName(c)}</div>
                          <div className="text-xs text-slate-500 font-mono break-all">
                            {c.subscription_status || c.subscriptionStatus || 'N/A'} • £{getSubscriptionPrice(c)}/mo
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openBilling(c)}>
                            Manage
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                const updated = await adminAPI.updateClient(c.id, { subscription_status: 'cancelled' } as any);
                                setClients((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...updated } : x)));
                                toast.success('Subscription marked cancelled', { description: getBusinessName(c) });
                              } catch (e: any) {
                                toast.error('Failed to cancel', { description: e?.message });
                              }
                            }}
                          >
                            Mark cancelled
                          </Button>
                        </div>
                      </div>
                    ))}
                    {isLoading && <p className="text-sm text-slate-500">Loading clients…</p>}
                  </CardContent>
                </Card>

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
                      <Switch
                        checked={securityForm.strongPassword}
                        onCheckedChange={(checked) => setSecurityForm((p) => ({ ...p, strongPassword: checked }))}
                      />
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
                        <Input
                          type="number"
                          min="1"
                          value={securityForm.sessionTimeoutMinutes}
                          onChange={(e) =>
                            setSecurityForm((p) => ({ ...p, sessionTimeoutMinutes: Number(e.target.value || 0) }))
                          }
                          className="w-16"
                        />
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
                        <Input
                          type="number"
                          min="1"
                          value={securityForm.loginAttemptLimit}
                          onChange={(e) =>
                            setSecurityForm((p) => ({ ...p, loginAttemptLimit: Number(e.target.value || 0) }))
                          }
                          className="w-16"
                        />
                        <span className="text-sm text-slate-500">attempts</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-slate-700" />
                        <div>
                          <p className="font-medium">Lockout Duration</p>
                          <p className="text-sm text-slate-500">How long to lock after reaching attempt limit</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={securityForm.lockoutMinutes}
                          onChange={(e) =>
                            setSecurityForm((p) => ({ ...p, lockoutMinutes: Number(e.target.value || 0) }))
                          }
                          className="w-16"
                        />
                        <span className="text-sm text-slate-500">minutes</span>
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

                <Button
                  className="w-full md:w-auto"
                  onClick={() => {
                    localStorage.setItem('sync2gear_security_strong_password', String(!!securityForm.strongPassword));
                    localStorage.setItem(
                      'sync2gear_security_session_timeout_minutes',
                      String(Math.max(1, Number(securityForm.sessionTimeoutMinutes || 30)))
                    );
                    localStorage.setItem(
                      'sync2gear_security_login_attempt_limit',
                      String(Math.max(1, Number(securityForm.loginAttemptLimit || 5)))
                    );
                    localStorage.setItem(
                      'sync2gear_security_lockout_minutes',
                      String(Math.max(1, Number(securityForm.lockoutMinutes || 15)))
                    );
                    toast.success('Security settings saved', {
                      description: 'These policies are enforced by this frontend. For org-wide enforcement, add backend settings.',
                    });
                  }}
                >
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
            <Button onClick={handleCreateClient} disabled={createSaving} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              {createSaving ? 'Creating…' : 'Create Client Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}