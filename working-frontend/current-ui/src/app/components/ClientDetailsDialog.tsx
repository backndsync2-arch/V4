import React, { useEffect, useMemo, useState } from 'react';
import type { Client as FrontendClient } from '@/lib/types';
import { adminAPI, authAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import { Mail, Phone, RefreshCcw, UserPlus, Copy } from 'lucide-react';

// NOTE:
// Backend client/user schemas differ from the frontend demo types.
// This dialog is intentionally tolerant and works with either:
// - backend objects (snake_case, uuid ids, nested client object on users)
// - demo objects (camelCase, simple ids)

type BackendClient = {
  id: string;
  name: string;
  business_name?: string;
  email: string;
  telephone?: string;
  description?: string;
  subscription_tier?: string;
  subscription_status?: string;
  subscription_price?: string;
  trial_days?: number;
  trial_ends_at?: string | null;
  max_devices?: number;
  max_storage_gb?: number;
  premium_multi_floor?: boolean;
  premium_ai_credits?: number;
  premium_max_floors?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type BackendUser = {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'staff' | 'admin' | string;
  is_active?: boolean;
  last_seen?: string | null;
  client?: { id: string; name: string; business_name?: string } | null;
};

function toBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  return undefined;
}

function getClientId(client: BackendClient | FrontendClient): string {
  return (client as any).id;
}

function getClientDisplayName(client: BackendClient | FrontendClient): string {
  return (
    (client as any).business_name ||
    (client as any).businessName ||
    (client as any).name ||
    'Client'
  );
}

function getClientEmail(client: BackendClient | FrontendClient): string {
  return (client as any).email || '';
}

function getClientPhone(client: BackendClient | FrontendClient): string | undefined {
  return (client as any).telephone;
}

function getClientActive(client: BackendClient | FrontendClient): boolean | undefined {
  // backend uses is_active; frontend demo uses status
  const isActive = toBool((client as any).is_active);
  if (isActive !== undefined) return isActive;
  const status = (client as any).status;
  if (status === 'active') return true;
  if (status === 'suspended') return false;
  return undefined;
}

export function ClientDetailsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: BackendClient | FrontendClient | null;
}) {
  const { open, onOpenChange, client } = props;
  const clientId = useMemo(() => (client ? getClientId(client) : null), [client]);

  const [users, setUsers] = useState<BackendUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<{ name: string; email: string; role: 'client' | 'staff' }>({
    name: '',
    email: '',
    role: 'staff',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ email: string; name?: string } | null>(null);
  const [resetSending, setResetSending] = useState(false);

  const loadUsers = async () => {
    if (!clientId) return;
    setUsersLoading(true);
    try {
      const data = await adminAPI.getUsers(clientId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Failed to load client users', { description: e?.message });
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId]);

  const handleSendPasswordReset = async (email: string) => {
    try {
      await authAPI.requestPasswordReset(email);
      toast.success('Password reset requested', { description: `Reset requested for ${email}` });
    } catch (e: any) {
      toast.error('Failed to request password reset', { description: e?.message });
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied', { description: value });
    } catch {
      // Best-effort fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('Copied', { description: value });
      } catch {
        toast.error('Copy failed');
      }
    }
  };

  const openReset = (u: { email: string; name?: string } | string) => {
    const target = typeof u === 'string' ? { email: u } : u;
    setResetTarget(target);
    setResetOpen(true);
  };

  const handleCreateUser = async () => {
    if (!clientId) return;
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Please enter name and email');
      return;
    }
    setCreatingUser(true);
    try {
      // Backend admin user create does not accept password; we create the user, then admin can trigger reset.
      await adminAPI.createUser({
        email: newUser.email.trim(),
        name: newUser.name.trim(),
        role: newUser.role,
        client_id: clientId,
      } as any);

      toast.success('User created', {
        description: 'User created. Use “Send password reset” to set a password.',
      });
      setAddUserOpen(false);
      setNewUser({ name: '', email: '', role: 'staff' });
      await loadUsers();
    } catch (e: any) {
      toast.error('Failed to create user', { description: e?.message });
    } finally {
      setCreatingUser(false);
    }
  };

  if (!client) return null;

  const displayName = getClientDisplayName(client);
  const email = getClientEmail(client);
  const phone = getClientPhone(client);
  const isActive = getClientActive(client);

  const createdAt = (client as any).created_at
    ? new Date((client as any).created_at)
    : (client as any).createdAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-4xl lg:max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="text-left">
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle className="flex items-start justify-between gap-4">
              <span className="truncate">{displayName}</span>
              {isActive !== undefined && (
                <Badge className="shrink-0" variant={isActive ? 'default' : 'secondary'}>
                  {isActive ? 'active' : 'suspended'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="mt-1 text-slate-500 leading-relaxed">
              View and manage client account, users, and security actions.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold">Contact</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="font-mono break-all">{email || 'N/A'}</span>
                      {!!email && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="ml-auto h-8 px-2"
                          onClick={() => handleCopy(email)}
                          title="Copy email"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="font-mono break-all">{phone || 'N/A'}</span>
                      {!!phone && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="ml-auto h-8 px-2"
                          onClick={() => handleCopy(phone)}
                          title="Copy phone"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-semibold">Subscription</p>
                  <div className="text-sm text-slate-700 space-y-1">
                    <div>
                      <span className="text-slate-500">Tier:</span>{' '}
                      <span className="font-mono">{(client as any).subscription_tier ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span>{' '}
                      <span className="font-mono">
                        {(client as any).subscription_status ?? (client as any).subscriptionStatus ?? 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Price:</span>{' '}
                      <span className="font-mono">
                        {(client as any).subscription_price ?? (client as any).subscriptionPrice ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold">Security</p>
                  <p className="text-sm text-slate-600">
                    Password resets send an email to the selected user so they can set a new password.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center gap-2"
                    onClick={() => openReset(email)}
                    disabled={!email}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reset primary contact password
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-semibold">Metadata</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                  <div>
                    <span className="text-slate-500">Client ID:</span>{' '}
                    <span className="font-mono break-all">{clientId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Created:</span>{' '}
                    <span className="font-mono">{createdAt instanceof Date ? formatDateTime(createdAt) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm text-slate-600">
                  {usersLoading ? 'Loading users…' : `${users.length} user(s)`}
                </div>
                <Button onClick={() => setAddUserOpen(true)} size="sm" className="gap-2 w-full sm:w-auto">
                  <UserPlus className="h-4 w-4" />
                  Add user
                </Button>
              </div>

              {/* Mobile cards */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {users.map((u) => (
                  <div key={u.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{u.name}</p>
                        <p className="text-sm font-mono text-slate-600 break-all">{u.email}</p>
                      </div>
                      <Badge className="shrink-0" variant={u.is_active === false ? 'secondary' : 'default'}>
                        {u.is_active === false ? 'inactive' : 'active'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">
                        {u.role}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Last seen: {u.last_seen ? formatDateTime(new Date(u.last_seen)) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto gap-2"
                        onClick={() => handleCopy(u.email)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy email
                      </Button>
                      <Button
                        type="button"
                        className="w-full sm:w-auto gap-2"
                        onClick={() => openReset({ email: u.email, name: u.name })}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Reset password
                      </Button>
                    </div>
                  </div>
                ))}

                {!usersLoading && users.length === 0 && (
                  <div className="text-center text-slate-500 py-8 rounded-lg border">
                    No users found for this client.
                  </div>
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-lg border">
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="font-mono">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active === false ? 'secondary' : 'default'}>
                            {u.is_active === false ? 'inactive' : 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {u.last_seen ? formatDateTime(new Date(u.last_seen)) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleCopy(u.email)}
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2 whitespace-nowrap"
                              onClick={() => openReset({ email: u.email, name: u.name })}
                              title="Reset password"
                            >
                              <RefreshCcw className="h-4 w-4" />
                              Reset
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!usersLoading && users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                          No users found for this client.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add user</DialogTitle>
                    <DialogDescription>
                      Create a user for this client. After creation, use “Reset password” to set a password.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={newUser.name}
                        onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                        placeholder="jane@client.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type="button"
                          className="w-full sm:w-auto"
                          variant={newUser.role === 'staff' ? 'default' : 'outline'}
                          onClick={() => setNewUser((p) => ({ ...p, role: 'staff' }))}
                        >
                          Staff
                        </Button>
                        <Button
                          type="button"
                          className="w-full sm:w-auto"
                          variant={newUser.role === 'client' ? 'default' : 'outline'}
                          onClick={() => setNewUser((p) => ({ ...p, role: 'client' }))}
                        >
                          Client
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setAddUserOpen(false)} disabled={creatingUser}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser} disabled={creatingUser}>
                      {creatingUser ? 'Creating…' : 'Create user'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Reset password confirm */}
              <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Reset password</DialogTitle>
                    <DialogDescription>
                      This sends a password reset email to the user. They will set a new password themselves.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>User</Label>
                      <div className="rounded-md border p-3">
                        <div className="font-medium">{resetTarget?.name || 'Selected user'}</div>
                        <div className="text-sm text-slate-600 font-mono break-all">{resetTarget?.email}</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto gap-2"
                        onClick={() => resetTarget?.email && handleCopy(resetTarget.email)}
                        disabled={!resetTarget?.email}
                      >
                        <Copy className="h-4 w-4" />
                        Copy email
                      </Button>
                      <Button
                        type="button"
                        className="w-full sm:w-auto gap-2"
                        disabled={!resetTarget?.email || resetSending}
                        onClick={async () => {
                          if (!resetTarget?.email) return;
                          setResetSending(true);
                          try {
                            await handleSendPasswordReset(resetTarget.email);
                            setResetOpen(false);
                          } finally {
                            setResetSending(false);
                          }
                        }}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        {resetSending ? 'Sending…' : 'Send reset email'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

