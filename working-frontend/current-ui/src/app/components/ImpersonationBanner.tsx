import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { adminAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { X, Eye } from 'lucide-react';
import type { Client } from '@/lib/types';

export function ImpersonationBanner() {
  const { user, impersonatingClient, stopImpersonating } = useAuth();
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    const loadClient = async () => {
      if (!impersonatingClient || user?.role !== 'admin') {
        setClient(null);
        return;
      }

      try {
        const clientsData = await adminAPI.getClients();
        const clientsList = Array.isArray(clientsData) ? clientsData : (clientsData as any)?.results ?? [];
        const foundClient = clientsList.find((c: any) => c.id === impersonatingClient);
        setClient(foundClient || null);
      } catch (error) {
        console.error('Failed to load client data:', error);
        setClient(null);
      }
    };

    void loadClient();
  }, [impersonatingClient, user?.role]);

  if (!impersonatingClient || user?.role !== 'admin' || !client) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Admin View Mode</p>
            <p className="text-xs opacity-90">
              Viewing as: <span className="font-medium">{client.name}</span> ({client.businessName})
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={stopImpersonating}
          className="bg-white/10 border-white/20 hover:bg-white/20 text-white hover:text-white"
        >
          <X className="h-4 w-4 mr-2" />
          Exit Admin View
        </Button>
      </div>
    </div>
  );
}
