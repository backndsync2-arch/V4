import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { usePlayback } from '@/lib/playback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Users as UsersIcon, UserPlus, Mail, Shield, Trash2, Search, CheckCircle2, XCircle, UserCheck, Send, Play, Pause } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { adminAPI } from '@/lib/api';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'operator';
  status: 'active' | 'inactive';
  lastLogin: Date;
  permissions: string[];
}

export function Users() {
  const { user: currentUser } = useAuth();
  const { state: playbackState, startOutput, stopOutput, setMode } = usePlayback();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'operator' as User['role'],
    password: '',
    passwordConfirm: '',
  });
  const [creationMode, setCreationMode] = useState<'create' | 'invite' | 'both'>('invite');
  const [isCreating, setIsCreating] = useState(false);

  // Load users from backend API
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        // Get users for current user's client (or all users if admin)
        const clientId = currentUser?.role === 'admin' ? undefined : currentUser?.clientId;
        const data = await adminAPI.getUsers(clientId);
        const usersList = Array.isArray(data) ? data : (data as any)?.results ?? [];
        
        // Convert backend users to frontend format
        const roleMapBack: Record<string, User['role']> = {
          'client': 'owner',
          'staff': 'manager',
          'floor_user': 'operator',
          'admin': 'owner',
        };
        const convertedUsers: User[] = usersList.map((u: any) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: roleMapBack[u.role] || 'operator',
          status: u.is_active ? 'active' : 'inactive',
          lastLogin: u.last_seen ? new Date(u.last_seen) : (u.last_login ? new Date(u.last_login) : new Date()),
          permissions: u.role === 'client' || u.role === 'admin' ? ['all'] : ['announcements'],
        }));
        
        setUsers(convertedUsers);
      } catch (error: any) {
        console.error('Failed to load users:', error);
        // Keep empty array - no fallback to dummy data
        setUsers([]);
        if (error?.status !== 403) {
          // Don't show error if it's a permission issue (non-admin users)
          toast.error('Failed to load users', { description: error?.message || 'Please try again' });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    void loadUsers();
  }, [currentUser]);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = async () => {
    // Validate required fields
    if (!newUserForm.name?.trim()) {
      toast.error('Please enter a name', { description: 'Full name is required' });
      return;
    }
    
    if (!newUserForm.email?.trim()) {
      toast.error('Please enter an email address', { description: 'Email is required' });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserForm.email.trim())) {
      toast.error('Invalid email address', { description: 'Please enter a valid email format' });
      return;
    }

    // Validate password if creating account
    if (creationMode === 'create' || creationMode === 'both') {
      if (!newUserForm.password) {
        toast.error('Password is required', { description: 'Please set a password for the new account' });
        return;
      }
      if (newUserForm.password.length < 8) {
        toast.error('Password too short', { description: 'Password must be at least 8 characters' });
        return;
      }
      if (newUserForm.password !== newUserForm.passwordConfirm) {
        toast.error('Passwords do not match', { description: 'Please ensure both password fields match' });
        return;
      }
    }
    
    // Validate client_id for non-admin users
    if (currentUser?.role !== 'admin' && !currentUser?.clientId) {
      toast.error('Cannot create user', { description: 'You must be associated with a client to create users' });
      return;
    }

    setIsCreating(true);
    try {
      // Map frontend roles to backend roles
      const roleMap: Record<string, string> = {
        'owner': 'client',      // Business owner/client user
        'manager': 'staff',      // sync2gear staff/manager
        'operator': 'floor_user', // Floor user with limited access
      };
      const backendRole = roleMap[newUserForm.role] || 'client';
      
      const userData: any = {
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        role: backendRole,
        client_id: currentUser?.role === 'admin' ? undefined : currentUser?.clientId,
      };

      if (creationMode === 'create' || creationMode === 'both') {
        userData.password = newUserForm.password;
        userData.password_confirm = newUserForm.passwordConfirm;
      }

      // Send invitation flag for invite or both modes
      if (creationMode === 'invite' || creationMode === 'both') {
        userData.send_invitation = true;
      }

      const newUser = await adminAPI.createUser(userData);

      // Reload users from API to ensure consistency
      try {
        const clientId = currentUser?.role === 'admin' ? undefined : currentUser?.clientId;
        const data = await adminAPI.getUsers(clientId);
        const usersList = Array.isArray(data) ? data : (data as any)?.results ?? [];
        const roleMapBack: Record<string, User['role']> = {
          'client': 'owner',
          'staff': 'manager',
          'floor_user': 'operator',
          'admin': 'owner',
        };
        const convertedUsers: User[] = usersList.map((u: any) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: roleMapBack[u.role] || 'operator',
          status: u.is_active ? 'active' : 'inactive',
          lastLogin: u.last_seen ? new Date(u.last_seen) : (u.last_login ? new Date(u.last_login) : new Date()),
          permissions: u.role === 'client' || u.role === 'admin' ? ['all'] : ['announcements'],
        }));
        setUsers(convertedUsers);
      } catch (reloadError) {
        console.warn('Failed to reload users after creation:', reloadError);
        // Fallback: add manually
        const roleMapBack: Record<string, User['role']> = {
          'client': 'owner',
          'staff': 'manager',
          'floor_user': 'operator',
        };
        const frontendUser: User = {
          id: newUser.id,
          name: newUser.name || newUser.email,
          email: newUser.email,
          role: roleMapBack[newUser.role] || 'operator',
          status: newUser.is_active ? 'active' : 'inactive',
          lastLogin: new Date(),
          permissions: newUser.role === 'client' || newUser.role === 'admin' ? ['all'] : ['announcements'],
        };
        setUsers([...users, frontendUser]);
      }
      setNewUserForm({ name: '', email: '', role: 'operator', password: '', passwordConfirm: '' });
      setCreationMode('invite');
      setIsAddDialogOpen(false);

      if (creationMode === 'create') {
        toast.success(`Account created for ${newUser.name}`, {
          description: `User can now log in with the password you set`,
        });
      } else if (creationMode === 'invite') {
        toast.success(`${newUser.name} has been invited`, {
          description: `An invitation email has been sent to ${newUser.email}`,
        });
      } else {
        toast.success(`Account created and invitation sent`, {
          description: `${newUser.name} can log in with the password, and also received an invitation email`,
        });
      }
    } catch (error: any) {
      // Provide detailed error messages
      let errorMessage = 'Failed to create user';
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.email) {
          errorMessage = `Email: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}`;
        } else if (errorData.password) {
          errorMessage = `Password: ${Array.isArray(errorData.password) ? errorData.password[0] : errorData.password}`;
        } else if (errorData.role) {
          errorMessage = `Role: ${Array.isArray(errorData.role) ? errorData.role[0] : errorData.role}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error('Failed to create user', {
        description: errorMessage,
        duration: 5000,
      });
      console.error('Create user error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      // Update user status via API
      await adminAPI.updateUser(userId, {
        is_active: user.status === 'active' ? false : true,
      } as any);

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === userId
            ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
            : u
        )
      );
      
      toast.success(
        `${user.name} ${user.status === 'active' ? 'deactivated' : 'activated'}`
      );
    } catch (error: any) {
      toast.error('Failed to update user status', { description: error?.message || 'Please try again' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      toast.success(`${user.name} has been removed`);
    } catch (error: any) {
      toast.error('Failed to delete user', { description: error?.message || 'Please try again' });
    }
  };

  const getRoleBadgeVariant = (role: User['role']) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'operator':
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Primary Play Control (key feature) */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-blue-50 to-white">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 truncate">Live Playback</h2>
              <p className="text-sm text-slate-600 mt-1">
                Start playing <span className="font-semibold">music + announcements</span> across your selected zones.
              </p>
            </div>
            <Button
              size="lg"
              className={
                playbackState === 'live'
                  ? 'h-16 w-full lg:w-auto px-10 text-lg font-bold bg-red-600 hover:bg-red-700'
                  : 'h-16 w-full lg:w-auto px-10 text-lg font-bold bg-green-600 hover:bg-green-700'
              }
              onClick={async () => {
                // Ensure combined mode as requested
                setMode('music+announcements');
                if (playbackState === 'live') {
                  await stopOutput();
                } else {
                  await startOutput();
                }
              }}
            >
              {playbackState === 'live' ? (
                <>
                  <Pause className="h-7 w-7 mr-3 fill-current" />
                  STOP
                </>
              ) : (
                <>
                  <Play className="h-7 w-7 mr-3 fill-current ml-1" />
                  PLAY
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-3xl font-bold mt-2">{users.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-3xl font-bold mt-2">
                  {users.filter((u) => u.status === 'active').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Managers</p>
                <p className="text-3xl font-bold mt-2">
                  {users.filter((u) => u.role === 'manager').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Operators</p>
                <p className="text-3xl font-bold mt-2">
                  {users.filter((u) => u.role === 'operator').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100">
                <UsersIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Add */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage user access and permissions</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create an account or send an invitation to a new team member.
                    {currentUser?.role === 'admin' && ' As admin, you can create users for any client.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Creation Mode Selection */}
                  <div className="space-y-3">
                    <Label>How would you like to add this user?</Label>
                    <RadioGroup value={creationMode} onValueChange={(value: 'create' | 'invite' | 'both') => setCreationMode(value)}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                        <RadioGroupItem value="create" id="create" />
                        <label htmlFor="create" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="font-medium text-sm">Create Account Now</p>
                              <p className="text-xs text-slate-500">Set password immediately, user can log in right away</p>
                            </div>
                          </div>
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                        <RadioGroupItem value="invite" id="invite" />
                        <label htmlFor="invite" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="font-medium text-sm">Send Invitation Only</p>
                              <p className="text-xs text-slate-500">User will set their own password via email link</p>
                            </div>
                          </div>
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                        <RadioGroupItem value="both" id="both" />
                        <label htmlFor="both" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-purple-600" />
                            <Send className="h-4 w-4 text-purple-600" />
                            <div>
                              <p className="font-medium text-sm">Both: Create & Send Invitation</p>
                              <p className="text-xs text-slate-500">Create account with password and send invitation email</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="John Doe"
                        value={newUserForm.name}
                        onChange={(e) =>
                          setNewUserForm({ ...newUserForm, name: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-slate-500">The user's full name</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address <span className="text-red-500">*</span></Label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={newUserForm.email}
                        onChange={(e) =>
                          setNewUserForm({ ...newUserForm, email: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-slate-500">Used for login and notifications</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Role <span className="text-red-500">*</span></Label>
                      <Select
                        value={newUserForm.role}
                        onValueChange={(value: User['role']) =>
                          setNewUserForm({ ...newUserForm, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner (Full Access)</SelectItem>
                          <SelectItem value="manager">Manager (Most Features)</SelectItem>
                          <SelectItem value="operator">Operator (Limited Access)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">Select the user's access level</p>
                    </div>

                    {/* Password fields - shown when creating account */}
                    {(creationMode === 'create' || creationMode === 'both') && (
                      <>
                        <div className="space-y-2">
                          <Label>Password <span className="text-red-500">*</span></Label>
                          <Input
                            type="password"
                            placeholder="At least 8 characters"
                            value={newUserForm.password}
                            onChange={(e) =>
                              setNewUserForm({ ...newUserForm, password: e.target.value })
                            }
                            required
                          />
                          <p className="text-xs text-slate-500">User will use this password to log in</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Confirm Password <span className="text-red-500">*</span></Label>
                          <Input
                            type="password"
                            placeholder="Re-enter password"
                            value={newUserForm.passwordConfirm}
                            onChange={(e) =>
                              setNewUserForm({ ...newUserForm, passwordConfirm: e.target.value })
                            }
                            required
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false);
                    setNewUserForm({ name: '', email: '', role: 'operator', password: '', passwordConfirm: '' });
                    setCreationMode('invite');
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser} disabled={isCreating}>
                    {isCreating ? (
                      'Processing...'
                    ) : creationMode === 'create' ? (
                      'Create Account'
                    ) : creationMode === 'invite' ? (
                      'Send Invitation'
                    ) : (
                      'Create & Send Invitation'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users List */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No users found</p>
              <p className="text-sm mt-1">Start by adding your first team member</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{user.name}</p>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                      {user.status === 'inactive' && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 flex-wrap">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user.email}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-xs">
                        Last login {formatRelativeTime(user.lastLogin)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {user.id !== currentUser?.id && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(user.id)}
                      >
                        {user.status === 'active' ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {user.id === currentUser?.id && (
                    <Badge variant="secondary">You</Badge>
                  )}
                </div>
              </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understanding access levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg">
              <Badge className="mb-3">Owner</Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Full system access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Manage users & billing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Configure all settings</span>
                </li>
              </ul>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <Badge variant="secondary" className="mb-3">Manager</Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Music & announcements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Schedule management</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-500">User management</span>
                </li>
              </ul>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <Badge variant="outline" className="mb-3">Operator</Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Play announcements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>View schedules</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-500">Edit content</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
