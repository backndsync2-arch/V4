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
import { CreateClientDialog } from '@/app/components/CreateClientDialog';
import { SuperAdminAI } from '@/app/components/SuperAdminAI';
import { adminAPI, zonesAPI } from '@/lib/api';

export function Admin() {
  const navigate = useNavigate();
  const { user, impersonateClient } = useAuth();
  const [clients, setClients] = useState(mockClients);
  const [users, setUsers] = useState(mockUsers);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<any>(null);
  const [resetPasswordAutoGenerate, setResetPasswordAutoGenerate] = useState(true);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  // Load audit logs from API
  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        const params: any = {};
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
        setAuditLogs(logs);
      } catch (error: any) {
        console.error('Failed to load audit logs:', error);
        toast.error(error?.message || 'Failed to load audit logs');
      }
    };
    loadAuditLogs();
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

  const filteredLogs = auditLogs;

  const searchedLogs = searchQuery
    ? filteredLogs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredLogs;

  const handleAddClient = () => {
    if (!newClientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    const newClient = {
      id: `client_${Date.now()}`,
      name: newClientName,
      status: 'active' as const,
      createdAt: new Date(),
    };

    setClients([...clients, newClient]);
    setNewClientName('');
    setIsAddClientOpen(false);
    toast.success(`Client "${newClientName}" created`);

    // Add audit log
    const log = {
      id: `log_${Date.now()}`,
      userId: 'user1',
      userName: 'Admin User',
      action: 'create',
      resource: 'client',
      resourceId: newClient.id,
      details: `Created client: ${newClientName}`,
      timestamp: new Date(),
    };
    setAuditLogs([log, ...auditLogs]);
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
          <p className="text-slate-600">Manage clients and view system audit logs</p>
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
              <CardDescription>Manage all business clients</CardDescription>
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
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{formatDateTime(client.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => impersonateClient(client.id, client.name)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Impersonate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleClientStatus(client.id)}>
                              {client.status === 'active' ? (
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
                    <TableHead>Actions</TableHead>
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
                {user?.role === 'admin' ? 'System-wide activity log' : 'Your activity log'}
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
                      <TableHead className="text-white">Action</TableHead>
                      <TableHead className="text-white">Resource</TableHead>
                      <TableHead className="text-white">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchedLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      searchedLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-gray-300">
                            {formatDateTime(log.created_at || log.timestamp)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {log.user?.name || log.userName || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize bg-white/10 text-white border-white/20">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize text-gray-300">{log.resource_type || log.resource}</TableCell>
                          <TableCell className="text-sm text-gray-400">
                            {typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '—')}
                          </TableCell>
                        </TableRow>
                      ))
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
