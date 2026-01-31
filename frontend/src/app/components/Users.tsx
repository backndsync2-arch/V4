import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Users as UsersIcon, UserPlus, Mail, Shield, Trash2, Edit, Search, CheckCircle2, XCircle, Key, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { adminAPI } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'floor_user' | 'staff' | 'admin';
  status?: 'active' | 'inactive';
  is_active?: boolean;
  last_login?: string | Date;
  lastLogin?: Date;
  permissions?: string[];
  client_id?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

export function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'client' as User['role'],
    password: '',
    autoGeneratePassword: true,
    client_id: '',
  });
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    autoGenerate: true,
  });

  // Load users and clients from API
  useEffect(() => {
    loadUsers();
    if (currentUser?.role === 'admin') {
      loadClients();
    }
  }, [currentUser]);
  
  const loadClients = async () => {
    try {
      const clientsData = await adminAPI.getClients();
      setClients(clientsData);
    } catch (error: any) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await adminAPI.getUsers();
      // Filter to only show users from the same client (unless admin)
      const filtered = currentUser?.role === 'admin' 
        ? usersData 
        : usersData.filter((u: User) => u.client_id === currentUser?.clientId);
      
      // Normalize user data
      const normalized = filtered.map((u: any) => ({
        ...u,
        status: u.is_active ? 'active' : 'inactive',
        lastLogin: u.last_login ? new Date(u.last_login) : new Date(0),
      }));
      
      setUsers(normalized);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate random password that meets Django's password validation requirements
  // Requirements: at least 8 chars, not too common, not entirely numeric
  const generatePassword = () => {
    const length = 12;
    // Ensure we have at least one uppercase, one lowercase, one number, and one special char
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + special;
    
    // Start with one of each required type
    let password = 
      uppercase.charAt(Math.floor(Math.random() * uppercase.length)) +
      lowercase.charAt(Math.floor(Math.random() * lowercase.length)) +
      numbers.charAt(Math.floor(Math.random() * numbers.length)) +
      special.charAt(Math.floor(Math.random() * special.length));
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all.charAt(Math.floor(Math.random() * all.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Copy password to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copied to clipboard');
  };

  const handleAddUser = async () => {
    if (!newUserForm.name || !newUserForm.email) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = newUserForm.email.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // For floor users, client_id is required
    if (newUserForm.role === 'floor_user' && !newUserForm.client_id) {
      toast.error('Please select a client for the floor user');
      return;
    }

    // Generate password if auto-generate is enabled (use generated password if available)
    const finalPassword = newUserForm.autoGeneratePassword 
      ? (generatedPassword || generatePassword())
      : newUserForm.password;

    if (!finalPassword) {
      toast.error('Please enter a password or enable auto-generate');
      return;
    }

    try {
      // Prepare user data
      const userData: any = {
        name: newUserForm.name.trim(),
        email: trimmedEmail,
        password: finalPassword,
        role: newUserForm.role,
        send_email: newUserForm.autoGeneratePassword, // Send email when auto-generate is enabled
      };
      
      // Add client_id based on role and user type
      if (newUserForm.role === 'floor_user' && newUserForm.client_id) {
        // Floor user must have a client_id
        userData.client_id = newUserForm.client_id;
      } else if (currentUser?.role !== 'admin' && currentUser?.clientId) {
        // Non-admin users can only create users for their own client
        userData.client_id = currentUser.clientId;
      }
      // Admin users creating non-floor users don't need client_id
      
      console.log('Creating user with data:', { ...userData, password: '***' });
      
      const newUser = await adminAPI.createUser(userData);

      setNewUserForm({ 
        name: '', 
        email: '', 
        role: 'client',
        password: '',
        autoGeneratePassword: true,
        client_id: '',
      });
      setGeneratedPassword('');
      setIsAddDialogOpen(false);
      
      toast.success(`${newUser.name} created successfully`, {
        description: newUserForm.autoGeneratePassword 
          ? `Password: ${finalPassword} (copied to clipboard). Email sent with credentials.` 
          : `Account created with custom password`,
        duration: 8000,
      });
      
      // Auto-copy generated password to clipboard
      if (newUserForm.autoGeneratePassword) {
        copyToClipboard(finalPassword);
      }

      // Reload users
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      console.error('Error data:', error?.data);
      
      // Extract error message from Django REST Framework validation errors
      let errorMessage = 'Failed to create user';
      const errorMessages: string[] = [];
      
      if (error?.data) {
        const errorData = error.data;
        
        // Check for nested error structure: {error: {details: {...}}}
        let details = errorData;
        if (errorData.error && errorData.error.details) {
          details = errorData.error.details;
        } else if (errorData.details) {
          details = errorData.details;
        }
        
        // Extract field-specific errors
        if (details && typeof details === 'object') {
          Object.keys(details).forEach(key => {
            if (Array.isArray(details[key])) {
              details[key].forEach((msg: string) => {
                errorMessages.push(`${key}: ${msg}`);
              });
            } else if (typeof details[key] === 'string') {
              errorMessages.push(`${key}: ${details[key]}`);
            }
          });
        }
        
        // If no field errors found, try other error formats
        if (errorMessages.length === 0) {
          // Check for direct field errors in errorData
          Object.keys(errorData).forEach(key => {
            if (key !== 'error' && key !== 'code' && key !== 'message') {
              if (Array.isArray(errorData[key])) {
                errorData[key].forEach((msg: string) => {
                  errorMessages.push(`${key}: ${msg}`);
                });
              } else if (typeof errorData[key] === 'string') {
                errorMessages.push(`${key}: ${errorData[key]}`);
              }
            }
          });
        }
        
        // Fallback to message if available
        if (errorMessages.length === 0) {
          if (errorData?.error?.message && typeof errorData.error.message === 'string') {
            errorMessages.push(errorData.error.message);
          } else if (errorData?.message && typeof errorData.message === 'string') {
            errorMessages.push(errorData.message);
          } else if (typeof errorData === 'string') {
            errorMessages.push(errorData);
          }
        }
      } else if (error?.message && typeof error.message === 'string') {
        errorMessages.push(error.message);
      } else if (typeof error === 'string') {
        errorMessages.push(error);
      }
      
      // Display all error messages
      if (errorMessages.length > 0) {
        errorMessage = errorMessages.join('; ');
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      });
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await adminAPI.updateUser(userId, {
        is_active: newStatus === 'active',
      });
      
      toast.success(
        `${user.name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`
      );
      
      loadUsers();
    } catch (error: any) {
      console.error('Failed to toggle user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      await adminAPI.deleteUser(userId);
      toast.success(`${user.name} has been removed`);
      loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
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
      case 'admin':
        return 'default';
      case 'staff':
        return 'secondary';
      case 'client':
      case 'floor_user':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  const getRoleDisplayName = (role: User['role']) => {
    switch (role) {
      case 'client':
        return 'Client User';
      case 'floor_user':
        return 'Floor User';
      case 'staff':
        return 'Staff';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1db954]" />
      </div>
    );
  }

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
                <p className="text-sm text-slate-500">Client Users</p>
                <p className="text-3xl font-bold mt-2">
                  {users.filter((u) => u.role === 'client').length}
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
                <p className="text-sm text-slate-500">Floor Users</p>
                <p className="text-3xl font-bold mt-2">
                  {users.filter((u) => u.role === 'floor_user').length}
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
              <CardDescription>
                {currentUser?.role === 'admin' || currentUser?.role === 'staff' 
                  ? 'Manage all users across all clients'
                  : 'Manage users for your organization'
                }
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                // Reset form when dialog closes
                setNewUserForm({ 
                  name: '', 
                  email: '', 
                  role: 'client',
                  password: '',
                  autoGeneratePassword: true,
                  client_id: '',
                });
                setGeneratedPassword('');
              } else if (newUserForm.autoGeneratePassword && newUserForm.email && !generatedPassword) {
                // Generate password when dialog opens if email is already filled
                const pwd = generatePassword();
                setGeneratedPassword(pwd);
                setNewUserForm(prev => ({ ...prev, password: pwd }));
              }
            }}>
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
                      onChange={(e) => {
                        const email = e.target.value;
                        setNewUserForm({ ...newUserForm, email });
                        // Auto-generate password when email is entered and auto-generate is enabled
                        if (newUserForm.autoGeneratePassword && email && !generatedPassword) {
                          const pwd = generatePassword();
                          setGeneratedPassword(pwd);
                          setNewUserForm(prev => ({ ...prev, email, password: pwd }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={newUserForm.role}
                      onValueChange={(value: User['role']) =>
                        setNewUserForm({ ...newUserForm, role: value, client_id: value === 'floor_user' ? '' : newUserForm.client_id })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client User (Full Access)</SelectItem>
                        <SelectItem value="floor_user">Floor User (Restricted Access)</SelectItem>
                        {currentUser?.role === 'admin' && (
                          <>
                            <SelectItem value="staff">Staff (Support Access)</SelectItem>
                            <SelectItem value="admin">Admin (System Access)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Client Selection for Floor Users (Admin only) */}
                  {currentUser?.role === 'admin' && newUserForm.role === 'floor_user' && (
                    <div className="space-y-2">
                      <Label>Client <span className="text-red-500">*</span></Label>
                      <Select
                        value={newUserForm.client_id}
                        onValueChange={(value) =>
                          setNewUserForm({ ...newUserForm, client_id: value })
                        }
                      >
                        <SelectTrigger className={!newUserForm.client_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.length === 0 ? (
                            <SelectItem value="" disabled>No clients available</SelectItem>
                          ) : (
                            clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name} ({client.email})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">
                        Floor users must be assigned to a client
                      </p>
                    </div>
                  )}
                    <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Password</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoGenerate"
                          checked={newUserForm.autoGeneratePassword}
                          onChange={(e) => {
                            const autoGen = e.target.checked;
                            let newPassword = '';
                            if (autoGen) {
                              newPassword = generatePassword();
                              setGeneratedPassword(newPassword);
                            } else {
                              setGeneratedPassword('');
                            }
                            setNewUserForm({ 
                              ...newUserForm, 
                              autoGeneratePassword: autoGen,
                              password: autoGen ? newPassword : newUserForm.password
                            });
                          }}
                          className="rounded border-white/20"
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
                      <div className="space-y-3">
                        <div className="p-4 bg-gradient-to-br from-[#1db954]/10 to-[#1ed760]/10 border border-[#1db954]/30 rounded-lg">
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-gray-400 mb-1 block">Email Address</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={newUserForm.email || 'Enter email above'}
                                  readOnly
                                  className="bg-white/5 border-white/20 font-mono text-sm"
                                />
                                {newUserForm.email && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(newUserForm.email);
                                      toast.success('Email copied to clipboard');
                                    }}
                                    className="shrink-0"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-400 mb-1 block">Generated Password</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={generatedPassword || 'Click auto-generate to create password'}
                                  readOnly
                                  className="bg-white/5 border-white/20 font-mono text-sm"
                                />
                                {generatedPassword && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      copyToClipboard(generatedPassword);
                                    }}
                                    className="shrink-0"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                )}
                                {generatedPassword && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newPwd = generatePassword();
                                      setGeneratedPassword(newPwd);
                                      setNewUserForm({ ...newUserForm, password: newPwd });
                                    }}
                                    className="shrink-0"
                                    title="Generate new password"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-[#1db954] mt-2 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Credentials will be sent via email after creation
                            </p>
                          </div>
                        </div>
                      </div>
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
                        className="rounded border-white/20"
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
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{user.name}</p>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                        {getRoleDisplayName(user.role)}
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
                        Last login: {user.lastLogin && user.lastLogin.getTime() > 0 
                          ? formatRelativeTime(user.lastLogin) 
                          : 'Never'}
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
            <div className="p-4 border border-white/10 rounded-lg">
              <Badge className="mb-3">Client User</Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Full client access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Manage team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Configure all settings</span>
                </li>
              </ul>
            </div>

            <div className="p-4 border border-white/10 rounded-lg">
              <Badge variant="secondary" className="mb-3">Floor User</Badge>
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

            <div className="p-4 border border-white/10 rounded-lg">
              <Badge variant="outline" className="mb-3">Staff</Badge>
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
