import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminAPI } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';

interface ClientSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  label?: string;
  description?: string;
}

export function ClientSelector({ 
  value, 
  onValueChange, 
  required = false,
  label = 'Client',
  description 
}: ClientSelectorProps) {
  const { user, impersonatingClient } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' && !impersonatingClient) {
      loadClients();
    }
  }, [user?.role, impersonatingClient]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await adminAPI.getClients();
      setClients(clientsData || []);
      // Auto-select first client if available and no value set
      if (!value && clientsData && clientsData.length > 0) {
        onValueChange(clientsData[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show selector if:
  // 1. User is not admin
  // 2. Admin is impersonating (uses impersonated client automatically)
  // 3. Admin has a clientId (uses their own client)
  if (user?.role !== 'admin' || impersonatingClient || user?.clientId) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>{label}{required && ' *'}</Label>
        <div className="text-sm text-gray-400">Loading clients...</div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}{required && ' *'}</Label>
        <div className="text-sm text-red-400">No clients available. Please create a client first.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}{required && ' *'}</Label>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger>
          <SelectValue placeholder={`Select a ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name || client.businessName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}

