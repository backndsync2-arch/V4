import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Users as UsersIcon, UserPlus, Mail, Shield, Trash2, Edit, Search, CheckCircle2, XCircle, Key, Copy, RefreshCw, Loader2, Building2 } from 'lucide-react';
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
  lastSeen?: Date;
  permissions?: string[];
  client_id?: string;
  clientId?: string; // Backend may return either format
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
    client_id: '',
    floor_id: '',
    // Client creation fields (when creating a new client)
    createNewClient: false,
    businessName: '',
    telephone: '',
    description: '',
    trialDays: '14',
    subscriptionPrice: '49.99',
  });
  const [floors, setFloors] = useState<any[]>([]);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    autoGenerate: true,
  });

  // Load users and clients from API
  useEffect(() => {
    loadUsers();
    if (currentUser?.role === 'admin') {
      loadClients();
    } else if (currentUser?.clientId) {
      // Non-admin users: auto-set their client_id
      setNewUserForm(prev => ({ ...prev, client_id: currentUser.clientId || '' }));
    }
  }, [currentUser]);

  // Load floors when client is selected for floor_user role
  useEffect(() => {
    if (newUserForm.role === 'floor_user' && newUserForm.client_id) {
      loadFloorsForClient(newUserForm.client_id);
    } else {
      setFloors([]);
      setNewUserForm(prev => ({ ...prev, floor_id: '' }));
    }
  }, [newUserForm.client_id, newUserForm.role]);

  const loadFloorsForClient = async (clientId: string) => {
    try {
      setLoadingFloors(true);
      const { zonesAPI } = await import('@/lib/api');
      const allFloors = await zonesAPI.getFloors();
      // Filter floors by client
      const clientFloors = allFloors.filter((floor: any) => floor.client?.id === clientId || floor.client_id === clientId);
      setFloors(clientFloors);
    } catch (error: any) {
      console.error('Failed to load floors:', error);
      toast.error('Failed to load floors');
      setFloors([]);
    } finally {
      setLoadingFloors(false);
    }
  };
  
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
      // Users are already normalized by adminAPI.getUsers()
      // Filter to only show users from the same client (unless admin)
      const filtered = currentUser?.role === 'admin' 
        ? usersData  // Admin sees all users, including those without a client
        : usersData.filter((u: any) => {
            const userClientId = u.clientId || u.client_id;
            const currentClientId = (currentUser as any)?.clientId || (currentUser as any)?.client_id;
            return userClientId === currentClientId;
          });
      
      // Add additional fields for display
      const normalized = filtered.map((u: any) => ({
        ...u,
        status: (u.is_active !== false ? 'active' : 'inactive') as 'active' | 'inactive',
        lastLogin: u.lastSeen || u.last_login || new Date(0),
        client_id: u.clientId || u.client_id, // Ensure client_id is set for compatibility
        clientId: u.clientId || u.client_id, // Ensure clientId is also set
      }));
      
      setUsers(normalized);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load team members', {
        description: error?.message || 'Please try again later',
      });
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
    // Basic validation
    if (!newUserForm.name || !newUserForm.email) {
      toast.error('Please fill in name and email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = newUserForm.email.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Role-based validation
    if (newUserForm.role === 'client') {
      // Admin/staff always create new client organization for client role users
      if (currentUser?.role === 'admin' || currentUser?.role === 'staff') {
        if (!newUserForm.businessName.trim()) {
          toast.error('Business name is required');
      return;
        }
        if (!newUserForm.telephone.trim()) {
          toast.error('Telephone number is required');
          return;
        }
      } else {
        // Client users creating floor_user - they use their own client
        // No validation needed here as it's auto-set
      }
    }

    if (newUserForm.role === 'floor_user') {
      if (!newUserForm.client_id) {
        toast.error('Client field is required for floor user role');
      return;
      }
      if (!newUserForm.floor_id) {
        toast.error('Floor field is required for floor user role');
        return;
      }
    }

    try {
      let clientId: string | undefined = undefined;

      // Admin/staff creating client role user - always create new client organization
      if (newUserForm.role === 'client' && (currentUser?.role === 'admin' || currentUser?.role === 'staff')) {
        try {
          // Create the client organization first
          const trialDaysNum = parseInt(newUserForm.trialDays) || 14;
          const priceNum = parseFloat(newUserForm.subscriptionPrice) || 49.99;

          const clientData: any = {
            name: newUserForm.businessName.trim(),
            email: trimmedEmail,
            subscription_tier: 'basic',
          };

          const createdClient = await adminAPI.createClient(clientData);
          
          // CRITICAL: Log the full response to debug
          console.log('=== CLIENT CREATION RESPONSE ===');
          console.log('Full response:', createdClient);
          console.log('Response type:', typeof createdClient);
          console.log('Response keys:', createdClient ? Object.keys(createdClient) : 'null');
          console.log('createdClient.id:', createdClient?.id);
          console.log('createdClient.id type:', typeof createdClient?.id);
          console.log('================================');
          
          // CRITICAL: Ensure we have the client ID before proceeding
          // The API response should have an 'id' field (could be number or string)
          const clientIdValue = createdClient?.id;
          
          if (!createdClient) {
            console.error('Failed to create client - no response:', createdClient);
            toast.error('Failed to create client organization: No response from server');
            return;
          }
          
          if (clientIdValue === undefined || clientIdValue === null || clientIdValue === '') {
            console.error('Failed to create client - no ID in response. Full response:', JSON.stringify(createdClient, null, 2));
            toast.error('Failed to create client organization: No ID returned');
            return;
          }
          
          // Convert to string (handles both number and string IDs)
          clientId = String(clientIdValue).trim();
          
          // Double-check clientId is valid
          if (!clientId || clientId === 'undefined' || clientId === 'null' || clientId === '0' || clientId === '') {
            console.error('Invalid client ID after conversion:', { 
              clientIdValue, 
              clientId, 
              createdClient,
              stringified: JSON.stringify(createdClient, null, 2)
            });
            toast.error('Failed to create client organization: Invalid ID');
            return;
          }
          
          console.log('✓ Client created successfully with ID:', clientId, '(type:', typeof clientId, ')');
          
          // Update client with additional fields
          const { apiFetch } = await import('@/lib/api/core');
          await apiFetch(`/admin/clients/${clientId}/`, {
            method: 'PATCH',
            body: JSON.stringify({
              business_name: newUserForm.businessName.trim(),
              telephone: newUserForm.telephone.trim(),
              description: newUserForm.description.trim(),
              subscription_price: priceNum,
              subscription_status: 'trial',
              trial_days: trialDaysNum,
              premium_features: {
                multiFloor: false,
                aiCredits: 100,
                maxFloors: 1,
              },
              max_floors: 1,
            }),
          });
          
          // Reload clients list (don't await - do it in background)
          loadClients().catch(err => console.error('Failed to reload clients:', err));
          
          // Don't show success toast here - wait until user is also created
        } catch (error: any) {
          console.error('Failed to create client:', error);
          toast.error('Failed to create client organization', {
            description: error?.message || 'Please try again later',
          });
          return;
        }
      } else {
        // For non-client role users or when not creating new client, use form value
        clientId = newUserForm.client_id || undefined;
      }

      // Prepare user data (no password - backend uses invite tokens)
      const userData: any = {
        name: newUserForm.name.trim(),
        email: trimmedEmail,
        role: newUserForm.role,
      };
      
      // Add client_id based on role - CRITICAL: client role MUST have client_id
      if (newUserForm.role === 'client') {
        // Admin/staff creating client role - use the newly created client ID
        if (currentUser?.role === 'admin' || currentUser?.role === 'staff') {
          if (!clientId || clientId === 'undefined' || clientId === 'null' || clientId === '') {
            console.error('CRITICAL: Admin/staff creating client role but clientId is missing or invalid!', {
              clientId,
              clientIdType: typeof clientId,
              formClientId: newUserForm.client_id,
              currentUserRole: currentUser?.role,
              role: newUserForm.role
            });
            toast.error('Failed to create user: Client organization was not created properly. Please try again.');
            return;
          }
          // Explicitly set as string and ensure it's not empty
          const finalClientId = String(clientId).trim();
          if (!finalClientId) {
            console.error('CRITICAL: clientId is empty after conversion!', { clientId, finalClientId });
            toast.error('Failed to create user: Invalid client ID');
            return;
          }
          userData.client_id = finalClientId;
          console.log('✓ Setting client_id from newly created client:', finalClientId, 'Type:', typeof finalClientId);
          console.log('✓ Full userData before API call:', JSON.stringify(userData, null, 2));
        } 
        // Non-admin/staff creating client role - use their own client_id
        else if (currentUser?.clientId) {
          userData.client_id = String(currentUser.clientId);
          console.log('Setting client_id from current user:', currentUser.clientId);
        } 
        // Fallback: use client_id from form or clientId variable
        else if (clientId) {
          userData.client_id = String(clientId);
          console.log('Setting client_id from clientId variable:', clientId);
        } 
        // Last resort: use form value
        else if (newUserForm.client_id) {
          userData.client_id = String(newUserForm.client_id);
          console.log('Setting client_id from form:', newUserForm.client_id);
        } 
        else {
          // This should not happen if validation worked, but add safety check
          console.error('Missing client_id for client role user:', { 
            clientId, 
            formClientId: newUserForm.client_id, 
            currentUser,
            role: newUserForm.role
          });
          toast.error('Client ID is required for client role users');
          return;
        }
      } else if (newUserForm.role === 'floor_user') {
        // For floor_user role, also need client_id
        if (currentUser?.role !== 'admin' && currentUser?.role !== 'staff' && currentUser?.clientId) {
          userData.client_id = String(currentUser.clientId);
        } else if (clientId || newUserForm.client_id) {
          userData.client_id = String(clientId || newUserForm.client_id);
        } else {
          toast.error('Client ID is required for floor user role');
          return;
        }
      }
      
      // Add floor_id for floor_user role
      if (newUserForm.role === 'floor_user' && newUserForm.floor_id) {
        userData.floor_id = newUserForm.floor_id;
      }
      
      // Final safety check: ensure client_id is set for client role
      if (newUserForm.role === 'client' && !userData.client_id) {
        console.error('CRITICAL: client_id is missing for client role user', {
          clientId,
          formClientId: newUserForm.client_id,
          currentUserRole: currentUser?.role,
          userData
        });
        toast.error('Failed to create user: Client ID is missing');
        return;
      }
      
      // Final verification before sending - MUST have client_id for client role
      if (newUserForm.role === 'client') {
        // Triple-check: ensure client_id exists and is valid
        const finalClientId = userData.client_id;
        if (!finalClientId || finalClientId === '' || finalClientId === 'undefined' || finalClientId === 'null' || finalClientId === '0') {
          console.error('❌ FINAL CHECK FAILED: client_id missing or invalid before API call', {
            userData: JSON.stringify(userData, null, 2),
            clientId,
            formClientId: newUserForm.client_id,
            currentUserRole: currentUser?.role,
            client_id_value: finalClientId,
            client_id_type: typeof finalClientId,
            userDataKeys: Object.keys(userData)
          });
          toast.error('Failed to create user: Client ID is missing. Please try again.');
          return;
        }
        
        // Ensure it's a string (UUID format)
        userData.client_id = String(finalClientId).trim();
        console.log('✓ FINAL CHECK PASSED: client_id is set:', userData.client_id, '(type:', typeof userData.client_id, ')');
        console.log('✓ Full userData object:', JSON.stringify(userData, null, 2));
        console.log('✓ userData.client_id explicitly:', userData.client_id);
        console.log('✓ userData has client_id key?', 'client_id' in userData);
      }
      
      // ONE MORE CHECK: Verify the object structure
      console.log('=== FINAL PAYLOAD VERIFICATION ===');
      console.log('userData:', userData);
      console.log('userData.client_id:', userData.client_id);
      console.log('JSON.stringify(userData):', JSON.stringify(userData));
      console.log('===================================');
      
      const newUser = await adminAPI.createUser(userData);

      // Reset form
      setNewUserForm({ 
        name: '', 
        email: '', 
        role: currentUser?.role === 'client' ? 'floor_user' : 'client',
        client_id: currentUser?.clientId || '',
        floor_id: '',
        createNewClient: false,
        businessName: '',
        telephone: '',
        description: '',
        trialDays: '14',
        subscriptionPrice: '49.99',
      });
      setFloors([]);
      setIsAddDialogOpen(false);
      
      // Show success message (only one message for both client and user creation)
      if (newUserForm.role === 'client' && (currentUser?.role === 'admin' || currentUser?.role === 'staff')) {
        toast.success(`Client organization and user "${newUser.name}" created successfully`, {
          description: 'An invite email has been sent to set their password',
          duration: 5000,
        });
      } else {
      toast.success(`${newUser.name} created successfully`, {
          description: 'An invite email has been sent to set their password',
          duration: 5000,
        });
      }

      // Reload users to show the new user in the list
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      
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
        } else if (errorData.error && typeof errorData.error === 'object') {
          // Handle format: {error: {message: "...", details: {...}}}
          if (errorData.error.message) {
            // Try to parse the message if it's a stringified object
            try {
              const parsed = JSON.parse(errorData.error.message);
              if (parsed && typeof parsed === 'object') {
                details = parsed;
              }
            } catch {
              // If not JSON, use the message as-is
              errorMessages.push(errorData.error.message);
            }
          }
          if (errorData.error.details) {
            details = errorData.error.details;
          }
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
      } as any);
      
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
                  : currentUser?.role === 'client'
                  ? 'Manage users for your organization'
                  : 'View users in your organization (read-only)'
                }
              </CardDescription>
            </div>
            {/* Only show Add User button if user can create users */}
            {currentUser?.role !== 'floor_user' && (
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                // Reset form when dialog closes
                setNewUserForm({ 
                  name: '', 
                  email: '', 
                    role: currentUser?.role === 'client' ? 'floor_user' : 'client',
                    client_id: currentUser?.clientId || '',
                    floor_id: '',
                    createNewClient: false,
                    businessName: '',
                    telephone: '',
                    description: '',
                    trialDays: '14',
                    subscriptionPrice: '49.99',
                  });
                  setFloors([]);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new team member. They will receive an email invite to set their password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto flex-1 pr-2 min-h-0 py-4">
                  <div className="space-y-2">
                    <Label className="text-white">Full Name <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="John Doe"
                      value={newUserForm.name}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, name: e.target.value })
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[#1db954] focus:ring-[#1db954]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Email Address <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={newUserForm.email}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, email: e.target.value })
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[#1db954] focus:ring-[#1db954]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Role <span className="text-red-500">*</span></Label>
                    <Select
                      value={newUserForm.role}
                      onValueChange={(value: User['role']) => {
                        // Reset dependent fields when role changes
                        const isClientOrFloor = value === 'client' || value === 'floor_user';
                        setNewUserForm({ 
                          ...newUserForm, 
                          role: value,
                          client_id: isClientOrFloor && currentUser?.role !== 'admin' && currentUser?.role !== 'staff'
                            ? (currentUser?.clientId || '')
                            : (isClientOrFloor && (currentUser?.role === 'admin' || currentUser?.role === 'staff') ? '' : newUserForm.client_id),
                          floor_id: value !== 'floor_user' ? '' : newUserForm.floor_id,
                          // Reset client creation fields when role changes
                          createNewClient: false, // Always create new for admin/staff
                          businessName: (value === 'client' && (currentUser?.role === 'admin' || currentUser?.role === 'staff')) ? newUserForm.businessName : '',
                          telephone: (value === 'client' && (currentUser?.role === 'admin' || currentUser?.role === 'staff')) ? newUserForm.telephone : '',
                          description: (value === 'client' && (currentUser?.role === 'admin' || currentUser?.role === 'staff')) ? newUserForm.description : '',
                        });
                        if (value !== 'floor_user') {
                          setFloors([]);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-[#1db954] focus:ring-[#1db954]/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Role options based on current user's role */}
                        {currentUser?.role === 'admin' && (
                          <>
                            <SelectItem value="admin">Admin (System Access)</SelectItem>
                            <SelectItem value="staff">Staff (Support Access)</SelectItem>
                            <SelectItem value="client">Client User (Full Access)</SelectItem>
                            <SelectItem value="floor_user">Floor User (Restricted Access)</SelectItem>
                          </>
                        )}
                        {currentUser?.role === 'staff' && (
                          <>
                            <SelectItem value="client">Client User (Full Access)</SelectItem>
                            <SelectItem value="floor_user">Floor User (Restricted Access)</SelectItem>
                          </>
                        )}
                        {currentUser?.role === 'client' && (
                          <SelectItem value="floor_user">Floor User (Restricted Access)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Client Creation Section - shown when creating 'client' role user (admin/staff only) */}
                  {newUserForm.role === 'client' && (currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
                    <div className="space-y-4 p-4 bg-gradient-to-br from-[#1db954]/10 to-[#1ed760]/10 border border-[#1db954]/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-[#1db954]" />
                        <Label className="text-base font-semibold text-white">Client Organization Details</Label>
                      </div>
                      <p className="text-xs text-gray-400 mb-4">
                        A new client organization will be automatically created for this user.
                      </p>
                      
                      <div className="space-y-4">
                    <div className="space-y-2">
                          <Label className="text-white">Business/Cafe/Restaurant Name <span className="text-red-500">*</span></Label>
                          <Input
                            placeholder="Downtown Coffee Shop"
                            value={newUserForm.businessName}
                            onChange={(e) =>
                              setNewUserForm({ ...newUserForm, businessName: e.target.value })
                            }
                            className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[#1db954] focus:ring-[#1db954]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Telephone Number <span className="text-red-500">*</span></Label>
                          <Input
                            type="tel"
                            placeholder="+44 20 1234 5678"
                            value={newUserForm.telephone}
                            onChange={(e) =>
                              setNewUserForm({ ...newUserForm, telephone: e.target.value })
                            }
                            className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[#1db954] focus:ring-[#1db954]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Business Description</Label>
                          <Textarea
                            placeholder="Describe the business type (cafe, restaurant, retail, etc.)..."
                            rows={3}
                            value={newUserForm.description}
                            onChange={(e) =>
                              setNewUserForm({ ...newUserForm, description: e.target.value })
                            }
                            className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[#1db954] focus:ring-[#1db954]/20"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white">Trial Period (Days)</Label>
                            <Select
                              value={newUserForm.trialDays}
                              onValueChange={(value) =>
                                setNewUserForm({ ...newUserForm, trialDays: value })
                              }
                            >
                              <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-[#1db954] focus:ring-[#1db954]/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">No Trial</SelectItem>
                                <SelectItem value="7">7 Days</SelectItem>
                                <SelectItem value="14">14 Days</SelectItem>
                                <SelectItem value="30">30 Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white">Monthly Subscription (£)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="49.99"
                              value={newUserForm.subscriptionPrice}
                              onChange={(e) =>
                                setNewUserForm({ ...newUserForm, subscriptionPrice: e.target.value })
                              }
                              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[#1db954] focus:ring-[#1db954]/20"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[#1db954] flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3" />
                          A new client organization will be created along with this user account.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Client Selection - shown for 'floor_user' role */}
                  {newUserForm.role === 'floor_user' && (
                    <div className="space-y-2">
                      <Label className="text-white">
                        Client <span className="text-red-500">*</span>
                        {currentUser?.role !== 'admin' && (
                          <span className="text-xs text-gray-400 ml-2">(Your organization)</span>
                        )}
                      </Label>
                      {currentUser?.role === 'admin' ? (
                      <Select
                        value={newUserForm.client_id}
                        onValueChange={(value) =>
                            setNewUserForm({ ...newUserForm, client_id: value, floor_id: '' })
                        }
                      >
                          <SelectTrigger className={`bg-white/5 border-white/20 text-white focus:border-[#1db954] focus:ring-[#1db954]/20 ${!newUserForm.client_id ? 'border-red-500' : ''}`}>
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
                      ) : (
                        <Input
                          value={clients.find(c => c.id === newUserForm.client_id)?.name || 'Loading...'}
                          readOnly
                          className="bg-white/5 border-white/20 text-gray-400"
                        />
                      )}
                      <p className="text-xs text-gray-400">
                        Floor users must be assigned to a client
                      </p>
                    </div>
                  )}

                  {/* Floor Selection - shown only for 'floor_user' role */}
                  {newUserForm.role === 'floor_user' && newUserForm.client_id && (
                    <div className="space-y-2">
                      <Label className="text-white">
                        Floor <span className="text-red-500">*</span>
                        {loadingFloors && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
                        </Label>
                      <Select
                        value={newUserForm.floor_id}
                        onValueChange={(value) =>
                          setNewUserForm({ ...newUserForm, floor_id: value })
                        }
                        disabled={loadingFloors || floors.length === 0}
                      >
                        <SelectTrigger className={`bg-white/5 border-white/20 text-white focus:border-[#1db954] focus:ring-[#1db954]/20 ${!newUserForm.floor_id ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder={loadingFloors ? "Loading floors..." : "Select a floor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {floors.length === 0 ? (
                            <SelectItem value="" disabled>
                              {loadingFloors ? 'Loading floors...' : 'No floors available for this client'}
                            </SelectItem>
                          ) : (
                            floors.map((floor: any) => (
                              <SelectItem key={floor.id} value={floor.id}>
                                {floor.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">
                        Floor users are restricted to a single floor
                      </p>
                              </div>
                  )}

                  {/* Info message about invite email */}
                  <div className="p-3 bg-gradient-to-br from-[#1db954]/10 to-[#1ed760]/10 border border-[#1db954]/30 rounded-lg">
                    <p className="text-xs text-[#1db954] flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                      An invite email will be sent to {newUserForm.email || 'the user'} to set their password
                            </p>
                          </div>
                        </div>
                <DialogFooter className="flex-shrink-0 border-t border-white/10 pt-4 mt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-white/20 text-gray-300 hover:bg-white/10">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddUser}
                    className="bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-white shadow-lg shadow-[#1db954]/30"
                  >
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
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
            {loading ? (
              <div className="text-center py-8 text-slate-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1db954]"></div>
                  <span>Loading team members...</span>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {searchQuery ? (
                  <p>No users found matching "{searchQuery}"</p>
                ) : (
                  <p>No team members found. Add your first team member to get started.</p>
                )}
              </div>
            ) : (
              filteredUsers.map((user) => (
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
                  {/* Floor users can only view - no actions */}
                  {currentUser?.role !== 'floor_user' && user.id !== currentUser?.id && (
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
                  {currentUser?.role === 'floor_user' && user.id !== currentUser?.id && (
                    <Badge variant="outline" className="text-xs">View Only</Badge>
                  )}
                </div>
              </div>
            ))
            )}
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
