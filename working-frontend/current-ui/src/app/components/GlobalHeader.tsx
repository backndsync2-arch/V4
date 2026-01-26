import React, { useState, useEffect } from 'react';
import { usePlayback } from '@/lib/playback';
import { useAuth } from '@/lib/auth';
import { zonesAPI } from '@/lib/api';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Wifi, WifiOff, Radio, ChevronDown } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Zone } from '@/lib/types';

export function GlobalHeader() {
  const { user } = useAuth();
  const { activeTarget, setActiveTarget, targetDeviceCount, state } = usePlayback();
  const [lastSync] = useState(new Date());
  const [zones, setZones] = useState<Array<{ id: string; name: string; deviceCount: { online: number; total: number } }>>([
    { id: 'all-zones', name: 'All Zones', deviceCount: targetDeviceCount },
  ]);

  // Load zones from API
  useEffect(() => {
    const loadZones = async () => {
      if (!user) return;

      try {
        const zonesData = await zonesAPI.getZones();
        const zonesList = Array.isArray(zonesData) ? zonesData : [];
        
        // Transform zones to include device counts
        const zonesWithCounts = zonesList.map((zone: Zone) => ({
          id: zone.id,
          name: zone.name,
          deviceCount: { online: 0, total: 0 }, // Will be updated with actual device counts
        }));

        setZones([
          { id: 'all-zones', name: 'All Zones', deviceCount: targetDeviceCount },
          ...zonesWithCounts,
        ]);
      } catch (error) {
        console.error('Failed to load zones:', error);
        // Keep default zones on error
      }
    };

    void loadZones();
  }, [user, targetDeviceCount]);

  const currentZone = zones.find(z => z.id === activeTarget) || zones[0];

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 md:py-3 lg:px-6">
      <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap sm:flex-nowrap">
        {/* Target Zone Selector */}
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <Select value={activeTarget} onValueChange={setActiveTarget}>
            <SelectTrigger className="h-auto border-none shadow-none p-0 gap-2 hover:bg-slate-50 rounded-lg px-2 md:px-3 py-2">
              <div className="flex items-center gap-2 min-w-0 w-full">
                <Radio className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{currentZone.name}</div>
                  <div className="text-xs text-slate-500">
                    {currentZone.deviceCount.online}/{currentZone.deviceCount.total} devices online
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 ml-auto shrink-0" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{zone.name}</span>
                    <span className="text-xs text-slate-500">
                      {zone.deviceCount.online}/{zone.deviceCount.total}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <Badge 
            variant={state === 'live' ? 'default' : state === 'offline' ? 'destructive' : 'secondary'}
            className="gap-1.5"
          >
            {state === 'offline' ? (
              <WifiOff className="h-3 w-3" />
            ) : (
              <Wifi className="h-3 w-3" />
            )}
            <span className="font-medium">{state === 'live' ? 'LIVE' : state === 'offline' ? 'OFFLINE' : 'STANDBY'}</span>
          </Badge>
          <span className="text-xs text-slate-500 hidden md:inline whitespace-nowrap">
            {state === 'offline' 
              ? 'Changes will sync when connected'
              : `Synced ${formatRelativeTime(lastSync)}`}
          </span>
        </div>
      </div>
    </div>
  );
}