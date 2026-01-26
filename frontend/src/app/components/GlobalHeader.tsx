import React, { useEffect, useMemo, useState } from 'react';
import { usePlayback } from '@/lib/playback';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Wifi, WifiOff, Radio, ChevronDown } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { zonesAPI } from '@/lib/api';

export function GlobalHeader() {
  const { activeTarget, setActiveTarget, targetDeviceCount, state } = usePlayback();
  const [lastSync, setLastSync] = useState(new Date());
  const [zones, setZones] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [z, d] = await Promise.all([zonesAPI.getZones(), zonesAPI.getDevices()]);
        if (!mounted) return;
        setZones(z || []);
        setDevices(d || []);
        setLastSync(new Date());
      } catch (e) {
        // keep header quiet
        console.warn('GlobalHeader load failed');
      }
    };
    load();
    const interval = window.setInterval(load, 10000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const computedZones = useMemo(() => {
    const countsByZoneId = new Map<string, { online: number; total: number }>();
    for (const dev of devices) {
      const zid = String((dev as any).zoneId ?? '');
      if (!zid) continue;
      const cur = countsByZoneId.get(zid) ?? { online: 0, total: 0 };
      cur.total += 1;
      if ((dev as any).status === 'online') cur.online += 1;
      countsByZoneId.set(zid, cur);
    }
    const all = { online: devices.filter((d: any) => d.status === 'online').length, total: devices.length };
    return [
      { id: 'all-zones', name: 'All Zones', deviceCount: all },
      ...zones.map((z: any) => ({
        id: String(z.id),
        name: String(z.name ?? 'Zone'),
        deviceCount: countsByZoneId.get(String(z.id)) ?? { online: 0, total: 0 },
      })),
    ];
  }, [zones, devices]);

  const currentZone = computedZones.find(z => z.id === activeTarget) || computedZones[0] || { id: 'all-zones', name: 'All Zones', deviceCount: targetDeviceCount };

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
              {computedZones.map((zone) => (
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