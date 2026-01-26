import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Users as UsersIcon, UserPlus, Mail, Shield, Trash2, Edit, Search, CheckCircle2, XCircle, Key, Copy, RefreshCw } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@retailstore.com',
      role: 'owner',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 30),
      permissions: ['all'],
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike@retailstore.com',
      role: 'manager',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
      permissions: ['music', 'announcements', 'scheduler'],
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      email: 'emily@retailstore.com',
      role: 'operator',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 5),
      permissions: ['announcements'],
    },
    {
      id: '4',
      name: 'Tom Wilson',
      email: 'tom@retailstore.com',
      role: 'operator',
      status: 'inactive',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      permissions: ['music'],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'operator' as User['role'],
    password: '',
    autoGeneratePassword: true,
  });
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    autoGenerate: true,
  });

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleAddUser = () => {
    if (!newUserForm.name || !newUserForm.email) {
      toast.error('Please fill in all fields');
      return;
    }

    // Generate password if auto-generate is enabled
    const finalPassword = newUserForm.autoGeneratePassword 
      ? generatePassword() 
      : newUserForm.password;

    if (!finalPassword) {
      toast.error('Please enter a password or enable auto-generate');
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role,
      status: 'active',
      lastLogin: new Date(),
      permissions: newUserForm.role === 'owner' ? ['all'] : ['announcements'],
    };

    setUsers([...users, newUser]);
    setNewUserForm({ 
      name: '', 
      email: '', 
      role: 'operator',
      password: '',
      autoGeneratePassword: true,
    });
    setIsAddDialogOpen(false);
    
    toast.success(`${newUser.name} created successfully`, {
      description: newUserForm.autoGeneratePassword 
        ? `Password: ${finalPassword} (copied to clipboard)` 
        : `Account created with custom password`,
      duration: 8000,
    });
    
    // Auto-copy generated password to clipboard
    if (newUserForm.autoGeneratePassword) {
      copyToClipboard(finalPassword);
    }
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(
      users.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
          : u
      )
    );
    const user = users.find((u) => u.id === userId);
    toast.success(
      `${user?.name} ${user?.status === 'active' ? 'deactivated' : 'activated'}`
    );
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setUsers(users.filter((u) => u.id !== userId));
    toast.success(`${user?.name} has been removed`);
  };

  const handleResetPassword = () => {
    if (!userToReset) return;

    const finalPassword = resetPasswordForm.autoGenerate 
      ? generatePassword() 
      : resetPasswordForm.password;

    if (!finalPassword) {
      toast.error('Please enter a password or enable auto-generate');
      return;
    }

    setIsResetPasswordDialogOpen(false);
    setResetPasswordForm({
      password: '',
      autoGenerate: true,
    });
    
    toast.success(`Password reset for ${userToReset.name}`, {
      description: resetPasswordForm.autoGenerate 
        ? `New password: ${finalPassword} (copied to clipboard)` 
        : `Password updated successfully`,
      duration: 8000,
    });
    
    // Auto-copy generated password to clipboard
    if (resetPasswordForm.autoGenerate) {
      copyToClipboard(finalPassword);
    }
    
    setUserToReset(null);
  };

  const openResetPasswordDialog = (user: User) => {
    setUserToReset(user);
    setIsResetPasswordDialogOpen(true);
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new team member with immediate access
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={newUserForm.name}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={newUserForm.email}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
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
                  </div>
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Password</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoGenerate"
                          checked={newUserForm.autoGeneratePassword}
                          onChange={(e) =>
                            setNewUserForm({ 
                              ...newUserForm, 
                              autoGeneratePassword: e.target.checked,
                              password: e.target.checked ? '' : newUserForm.password
                            })
                          }
                          className="rounded border-slate-300"
                        />
                        <Label htmlFor="autoGenerate" className="text-sm font-normal cursor-pointer">
                          Auto-generate
                        </Label>
                      </div>
                    </div>
                    {!newUserForm.autoGeneratePassword && (
                      <Input
                        type="text"
                        placeholder="Enter password"
                        value={newUserForm.password}
                        onChange={(e) =>
                          setNewUserForm({ ...newUserForm, password: e.target.value })
                        }
                      />
                    )}
                    {newUserForm.autoGeneratePassword && (
                      <p className="text-xs text-slate-500">
                        A secure password will be generated and copied to your clipboard
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser}>Create User</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Password Reset Dialog */}
          <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Reset password for {userToReset?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>New Password</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoGenerateReset"
                        checked={resetPasswordForm.autoGenerate}
                        onChange={(e) =>
                          setResetPasswordForm({ 
                            ...resetPasswordForm, 
                            autoGenerate: e.target.checked,
                            password: e.target.checked ? '' : resetPasswordForm.password
                          })
                        }
                        className="rounded border-slate-300"
                      />
                      <Label htmlFor="autoGenerateReset" className="text-sm font-normal cursor-pointer">
                        Auto-generate
                      </Label>
                    </div>
                  </div>
                  {!resetPasswordForm.autoGenerate && (
                    <Input
                      type="text"
                      placeholder="Enter new password"
                      value={resetPasswordForm.password}
                      onChange={(e) =>
                        setResetPasswordForm({ ...resetPasswordForm, password: e.target.value })
                      }
                    />
                  )}
                  {resetPasswordForm.autoGenerate && (
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
                    setUserToReset(null);
                    setResetPasswordForm({ password: '', autoGenerate: true });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleResetPassword}>Reset Password</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {user.id !== currentUser?.id && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openResetPasswordDialog(user)}
                        className="gap-2"
                      >
                        <Key className="h-4 w-4" />
                        <span className="hidden sm:inline">Reset Password</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(user.id)}
                      >
                        {user.status === 'active' ? (
                          <>
                            <XCircle className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Deactivate</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Activate</span>
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
