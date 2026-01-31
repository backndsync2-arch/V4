import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { adminAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { X, Eye } from 'lucide-react';

export function ImpersonationBanner() {
  const { user, impersonatingClient, stopImpersonating } = useAuth();
  const [clientName, setClientName] = useState<string>('');

  useEffect(() => {
    if (impersonatingClient && user?.role === 'admin') {
      // Load client name from API
      const loadClient = async () => {
        try {
          const clients = await adminAPI.getClients();
          const client = clients.find((c: any) => c.id === impersonatingClient);
          if (client) {
            setClientName(client.name || client.business_name || 'Unknown Client');
          }
        } catch (error) {
          console.error('Failed to load client name:', error);
          setClientName('Client');
        }
      };
      loadClient();
    }
  }, [impersonatingClient, user?.role]);

  if (!impersonatingClient || user?.role !== 'admin') {
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
              Viewing as: <span className="font-medium">{clientName || 'Loading...'}</span>
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
