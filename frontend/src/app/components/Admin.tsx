import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { mockClients, mockUsers, mockAuditLogs } from '@/lib/mockData';
import { Users, Plus, Building2, FileText, Search, MoreVertical, Ban, CheckCircle, Eye, Mail, Phone, CreditCard, Settings, Sparkles, Key } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { SuperAdminAI } from '@/app/components/SuperAdminAI';
import { adminAPI, zonesAPI } from '@/lib/api';

export function Admin() {
  const navigate = useNavigate();
  const { user, impersonateClient } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<any>(null);
  const [resetPasswordAutoGenerate, setResetPasswordAutoGenerate] = useState(true);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  // Load clients and users
  useEffect(() => {
    if (user?.role === 'admin') {
      loadClients();
      loadUsers();
    }
  }, [user?.role]);

  const loadClients = async () => {
    try {
      const clientsData = await adminAPI.getClients();
      // Ensure it's always an array - clients are already normalized by adminAPI.getClients()
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error: any) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients', {
        description: error?.message || 'Please try again later',
      });
      setClients([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await adminAPI.getUsers();
      // Ensure it's always an array
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
      setUsers([]); // Set to empty array on error
    }
  };

  // Load audit logs from API
  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        const params: any = {};
        // Admin can optionally filter by client, but by default sees all logs
        if (user?.role === 'admin' && selectedClient) {
          params.client = selectedClient;
        }
        if (user?.role === 'client' && selectedFloor) {
          params.floor = selectedFloor;
        }
        if (user?.role === 'client' && selectedRole) {
          params.role = selectedRole;
        }
        const logs = await adminAPI.getAuditLogs(params);
        // Ensure logs is always an array
        setAuditLogs(Array.isArray(logs) ? logs : []);
      } catch (error: any) {
        console.error('Failed to load audit logs:', error);
        toast.error(error?.message || 'Failed to load audit logs');
        setAuditLogs([]);
      }
    };
    loadAuditLogs();
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(loadAuditLogs, 10000);
    return () => clearInterval(interval);
  }, [user?.role, selectedClient, selectedFloor, selectedRole]);

  // Load floors for client users
  useEffect(() => {
    if (user?.role === 'client') {
      const loadFloors = async () => {
        try {
          const floorsData = await zonesAPI.getFloors();
          setFloors(floorsData);
        } catch (error: any) {
          console.error('Failed to load floors:', error);
        }
      };
      loadFloors();
    }
  }, [user?.role]);

  // Ensure auditLogs is always an array
  const filteredLogs = Array.isArray(auditLogs) ? auditLogs : [];

  const searchedLogs = searchQuery
    ? filteredLogs.filter(log => {
        if (!log) return false;
        const query = searchQuery.toLowerCase();
        const action = (log.action || '').toString().toLowerCase();
        const resource = (log.resource_type || log.resource || '').toString().toLowerCase();
        const details = (log.details || '').toString().toLowerCase();
        const userName = (log.user?.name || log.userName || '').toString().toLowerCase();
        return action.includes(query) ||
               resource.includes(query) ||
               details.includes(query) ||
               userName.includes(query);
      })
    : filteredLogs;

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }
    
    try {
      await adminAPI.createClient({
        name: newClientName.trim(),
        email: `${newClientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        subscription_tier: 'trial',
      });
      toast.success('Client created successfully');
      setNewClientName('');
      setIsAddClientOpen(false);
      loadClients();
    } catch (error: any) {
      console.error('Failed to create client:', error);
      toast.error(error?.message || 'Failed to create client');
    }
  };

  const handleToggleClientStatus = (clientId: string) => {
    setClients(clients.map(c =>
      c.id === clientId
        ? { ...c, status: c.status === 'active' ? 'suspended' : 'active' }
        : c
    ));
    const client = clients.find(c => c.id === clientId);
    toast.success(`Client "${client?.name}" ${client?.status === 'active' ? 'suspended' : 'activated'}`);

    // Add audit log
    const log = {
      id: `log_${Date.now()}`,
      userId: 'user1',
      userName: 'Admin User',
      action: client?.status === 'active' ? 'suspend' : 'activate',
      resource: 'client',
      resourceId: clientId,
      clientId,
      details: `${client?.status === 'active' ? 'Suspended' : 'Activated'} client: ${client?.name}`,
      timestamp: new Date(),
    };
    setAuditLogs([log, ...auditLogs]);
  };

  // Generate random password
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Copy password to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copied to clipboard');
  };

  // Handle password reset
  const handleResetPassword = () => {
    if (!userToResetPassword) return;

    const finalPassword = resetPasswordAutoGenerate 
      ? generatePassword() 
      : resetPasswordValue;

    if (!finalPassword) {
      toast.error('Please enter a password or enable auto-generate');
      return;
    }

    setIsResetPasswordDialogOpen(false);
    setResetPasswordValue('');
    setResetPasswordAutoGenerate(true);
    
    toast.success(`Password reset for ${userToResetPassword.name}`, {
      description: resetPasswordAutoGenerate 
        ? `New password: ${finalPassword} (copied to clipboard)` 
        : `Password updated successfully`,
      duration: 8000,
    });
    
    // Auto-copy generated password to clipboard
    if (resetPasswordAutoGenerate) {
      copyToClipboard(finalPassword);
    }

    // Add audit log
    const log = {
      id: `log_${Date.now()}`,
      userId: 'user1',
      userName: 'Admin User',
      action: 'reset_password',
      resource: 'user',
      resourceId: userToResetPassword.id,
      clientId: userToResetPassword.clientId,
      details: `Reset password for user: ${userToResetPassword.name}`,
      timestamp: new Date(),
    };
    setAuditLogs([log, ...auditLogs]);
    
    setUserToResetPassword(null);
  };

  const openResetPasswordDialog = (user: any) => {
    setUserToResetPassword(user);
    setIsResetPasswordDialogOpen(true);
  };

  // Show loading state
  if (loading && user?.role === 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1db954] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Reset Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {userToResetPassword?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>New Password</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoGenerateResetAdmin"
                    checked={resetPasswordAutoGenerate}
                    onChange={(e) => {
                      setResetPasswordAutoGenerate(e.target.checked);
                      if (e.target.checked) setResetPasswordValue('');
                    }}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="autoGenerateResetAdmin" className="text-sm font-normal cursor-pointer">
                    Auto-generate
                  </Label>
                </div>
              </div>
              {!resetPasswordAutoGenerate && (
                <Input
                  type="text"
                  placeholder="Enter new password"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                />
              )}
              {resetPasswordAutoGenerate && (
                <p className="text-xs text-slate-500">
                  A secure password will be generated and copied to your clipboard
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsResetPasswordDialogOpen(false);
                setUserToResetPassword(null);
                setResetPasswordValue('');
                setResetPasswordAutoGenerate(true);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Admin Panel</h1>
          <p className="text-slate-600">
            Manage <strong>Clients</strong> (businesses/organizations) and view system audit logs.
            <br />
            <span className="text-sm text-slate-500">
              <strong>Important:</strong> User and Client creation is only available in the "Team Members" page. 
              The Users tab here is read-only for viewing purposes.
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // Navigate to admin-settings
              navigate('/admin-settings');
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Admin Settings
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/users')}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Users & Clients
          </Button>
        </div>
      </div>


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
          <TabsTrigger value="clients">Clients (Businesses)</TabsTrigger>
          <TabsTrigger value="users">Users (People)</TabsTrigger>
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
              <CardTitle>Clients (Businesses)</CardTitle>
              <CardDescription>
                Manage business organizations that subscribe to sync2gear.
                <br />
                <span className="text-sm text-slate-500">
                  Each client can have multiple users (people) - manage users in the "Team Members" page.
                </span>
              </CardDescription>
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1db954]"></div>
                          <span className="text-slate-500">Loading clients...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !Array.isArray(clients) || clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No clients found. Create your first client to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => {
                      const status = client.status || 'active';
                      const createdAt = client.createdAt;
                      const displayName = client.businessName || client.name || 'Unnamed Client';
                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{displayName}</TableCell>
                          <TableCell>
                            <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{createdAt ? formatDateTime(createdAt) : 'N/A'}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={async () => {
                                  try {
                                    await impersonateClient(client.id, displayName);
                                    toast.success(`Now viewing as ${displayName}`);
                                  } catch (error: any) {
                                    toast.error(error?.message || 'Failed to start impersonation');
                                  }
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Impersonate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleClientStatus(client.id)}>
                                  {status === 'active' ? (
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Users (People) - View Only</CardTitle>
                  <CardDescription>
                    Quick view of all users across all clients. 
                    <br />
                    <span className="text-sm text-slate-500">
                      <strong>Note:</strong> This is a read-only view. To create, edit, or manage users, use the "Team Members" page in the sidebar.
                    </span>
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/users')}
                  className="ml-4"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Go to Team Members
                </Button>
              </div>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(users) && users.map((user) => {
                    const client = Array.isArray(clients) ? clients.find(c => c.id === user.clientId) : null;
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
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openResetPasswordDialog(user)}
                            className="gap-2"
                          >
                            <Key className="h-4 w-4" />
                            Reset Password
                          </Button>
                        </TableCell>
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
          <Card className="border-white/10 shadow-lg bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Audit Logs</CardTitle>
              <CardDescription className="text-gray-400">
                {user?.role === 'admin' 
                  ? 'System-wide activity log (includes admin actions)' 
                  : 'Your activity log'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  {user?.role === 'admin' && (
                    <Select value={selectedClient || 'all'} onValueChange={(v) => setSelectedClient(v === 'all' ? null : v)}>
                      <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
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
                  )}
                  {user?.role === 'client' && floors.length > 0 && (
                    <Select value={selectedFloor || 'all'} onValueChange={(v) => setSelectedFloor(v === 'all' ? null : v)}>
                      <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="All Floors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Floors</SelectItem>
                        {floors.map((floor) => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {user?.role === 'client' && (
                    <Select value={selectedRole || 'all'} onValueChange={(v) => setSelectedRole(v === 'all' ? null : v)}>
                      <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="client">Client Users</SelectItem>
                        <SelectItem value="floor_user">Floor Users</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">Timestamp</TableHead>
                      <TableHead className="text-white">User</TableHead>
                      <TableHead className="text-white">Role</TableHead>
                      <TableHead className="text-white">Client</TableHead>
                      <TableHead className="text-white">Action</TableHead>
                      <TableHead className="text-white">Resource</TableHead>
                      <TableHead className="text-white">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!Array.isArray(searchedLogs) || searchedLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      searchedLogs.map((log: any) => {
                        const userRole = log.user_role || log.user?.role || 'unknown';
                        const roleBadgeVariant = userRole === 'admin' ? 'default' : 
                                                userRole === 'client' ? 'secondary' : 
                                                userRole === 'staff' ? 'outline' : 'secondary';
                        const roleDisplayName = userRole === 'admin' ? 'Admin' :
                                               userRole === 'client' ? 'Client' :
                                               userRole === 'staff' ? 'Staff' :
                                               userRole === 'floor_user' ? 'Floor User' : userRole;
                        
                        // Format details nicely
                        let detailsText = '—';
                        if (log.details) {
                          if (typeof log.details === 'string') {
                            detailsText = log.details;
                          } else if (typeof log.details === 'object') {
                            // Extract meaningful details
                            const detailParts: string[] = [];
                            if (log.details.path) detailParts.push(`Path: ${log.details.path}`);
                            if (log.details.method) detailParts.push(`Method: ${log.details.method}`);
                            if (log.details.status_code) detailParts.push(`Status: ${log.details.status_code}`);
                            if (log.details.body && Object.keys(log.details.body).length > 0) {
                              const bodyStr = JSON.stringify(log.details.body);
                              if (bodyStr.length < 100) {
                                detailParts.push(`Body: ${bodyStr}`);
                              } else {
                                detailParts.push(`Body: ${bodyStr.substring(0, 100)}...`);
                              }
                            }
                            detailsText = detailParts.length > 0 ? detailParts.join(' • ') : JSON.stringify(log.details);
                          }
                        }
                        
                        return (
                          <TableRow key={log.id || log.timestamp} className="hover:bg-white/5">
                            <TableCell className="text-gray-300 text-sm">
                              {formatDateTime(log.created_at || log.timestamp)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-white font-medium">{log.user_name || log.user?.name || 'Unknown User'}</span>
                                {log.user_email || log.user?.email ? (
                                  <span className="text-xs text-gray-400">{log.user_email || log.user?.email}</span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={roleBadgeVariant} className="capitalize">
                                {roleDisplayName}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {log.client_name || log.client?.name || (userRole === 'admin' ? 'System' : '—')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize bg-white/10 text-white border-white/20">
                                {log.action || 'unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize text-gray-300">
                              {log.resource_type || log.resource || '—'}
                            </TableCell>
                            <TableCell className="text-xs text-gray-400 max-w-md">
                              <div className="truncate" title={detailsText}>
                                {detailsText}
                              </div>
                              {log.ip_address && (
                                <div className="text-xs text-gray-500 mt-1">
                                  IP: {log.ip_address}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
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
