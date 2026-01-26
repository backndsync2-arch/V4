import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
// Mock data imports removed - using API only
import { Plus, Building2, FileText, MoreVertical, Ban, CheckCircle, Eye, Settings, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { CreateClientDialog } from '@/app/components/CreateClientDialog';
import { SuperAdminAI } from '@/app/components/SuperAdminAI';
import { ClientDetailsDialog } from '@/app/components/ClientDetailsDialog';
import { adminAPI } from '@/lib/api';

export function Admin() {
  const { impersonateClient } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  // const [newClientName, setNewClientName] = useState(''); // Not used
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsClient, setDetailsClient] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredLogs = selectedClient
    ? auditLogs.filter(log => log.clientId === selectedClient)
    : auditLogs;

  const searchedLogs = searchQuery
    ? filteredLogs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredLogs;

  const unwrapResults = (data: any) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [clientsResp, usersResp] = await Promise.all([
          adminAPI.getClients(),
          adminAPI.getUsers(),
        ]);
        setClients(unwrapResults(clientsResp));
        setUsers(unwrapResults(usersResp));
      } catch (e: any) {
        // Keep empty arrays - no fallback to mock data
        console.warn('Admin API unavailable:', e);
        setClients([]);
        setUsers([]);
        if (e?.status !== 403) {
          toast.error('Failed to load admin data', { description: e?.message || 'Please try again' });
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);


  const isClientActive = (client: any): boolean => {
    if (typeof client?.is_active === 'boolean') return client.is_active;
    if (client?.status) return client.status === 'active';
    // default to active for unknown legacy rows
    return true;
  };

  const handleToggleClientStatus = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    const currentlyActive = isClientActive(client);
    const nextActive = !currentlyActive;

    setClients(
      clients.map(c => {
        if (c.id !== clientId) return c;
        const next: any = { ...c };
        // Keep backend and demo fields in sync for UI
        if (typeof next.is_active === 'boolean') next.is_active = nextActive;
        if (typeof next.status === 'string') next.status = nextActive ? 'active' : 'suspended';
        return next;
      })
    );

    toast.success(`Client "${getClientDisplayName(client)}" ${nextActive ? 'activated' : 'suspended'}`);

    // Add audit log
    const log = {
      id: `log_${Date.now()}`,
      userId: 'user1',
      userName: 'Admin User',
      action: nextActive ? 'activate' : 'suspend',
      resource: 'client',
      resourceId: clientId,
      clientId,
      details: `${nextActive ? 'Activated' : 'Suspended'} client: ${getClientDisplayName(client)}`,
      timestamp: new Date(),
    };
    setAuditLogs([log, ...auditLogs]);
  };

  const getClientDisplayName = (client: any) =>
    client?.business_name || client?.businessName || client?.name || 'Client';

  const getClientStatusBadge = (client: any) => {
    if (typeof client?.is_active === 'boolean') {
      return client.is_active ? { label: 'active', variant: 'default' as const } : { label: 'suspended', variant: 'secondary' as const };
    }
    if (client?.status) {
      return client.status === 'active'
        ? { label: client.status, variant: 'default' as const }
        : { label: client.status, variant: 'secondary' as const };
    }
    return { label: 'unknown', variant: 'secondary' as const };
  };

  const getClientCreatedAt = (client: any): Date => {
    if (client?.created_at) return new Date(client.created_at);
    if (client?.createdAt instanceof Date) return client.createdAt;
    return new Date(NaN);
  };

  return (
    <div className="space-y-6">
      <ClientDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        client={detailsClient}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600">Manage clients and view system audit logs</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // Navigate to admin-settings
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'admin-settings' }));
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Admin Settings
          </Button>
          <Button onClick={() => setIsAddClientOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={isAddClientOpen}
        onOpenChange={setIsAddClientOpen}
        onClientCreated={(newClient) => {
          setClients([newClient, ...clients]);
          
          // Add audit log
          const log = {
            id: `log_${Date.now()}`,
            userId: 'user1',
            userName: 'Admin User',
            action: 'create',
            resource: 'client',
            resourceId: newClient.id,
            details: `Created client: ${newClient.name}`,
            timestamp: new Date(),
          };
          setAuditLogs([log, ...auditLogs]);
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Clients</p>
                <p className="text-3xl font-bold mt-2">{clients.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-3xl font-bold mt-2">{users.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Audit Logs</p>
                <p className="text-3xl font-bold mt-2">{auditLogs.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="ai-config">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Configuration
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Clients</CardTitle>
              <CardDescription>Manage all business clients (click a row to view full details)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => {
                        setDetailsClient(client);
                        setDetailsOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{getClientDisplayName(client)}</TableCell>
                      <TableCell>
                        {(() => {
                          const s = getClientStatusBadge(client);
                          return <Badge variant={s.variant}>{s.label}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{formatDateTime(getClientCreatedAt(client))}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                impersonateClient(client.id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Impersonate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleClientStatus(client.id);
                              }}
                            >
                              {isClientActive(client) ? (
                                <>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {isLoading && (
                <p className="text-sm text-slate-500 mt-3">Loading from backend…</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>All users across all clients</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const client = clients.find(c => c.id === user.clientId);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{client?.name || 'N/A'}</TableCell>
                        <TableCell>{formatDateTime(user.lastSeen)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Configuration Tab */}
        <TabsContent value="ai-config">
          <SuperAdminAI />
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>System-wide activity log</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={selectedClient || 'all'} onValueChange={(v) => setSelectedClient(v === 'all' ? null : v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                        <TableCell>{log.userName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.resource}</TableCell>
                        <TableCell className="text-sm text-slate-600">{log.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
