import React, { useEffect, useMemo, useState } from 'react';
import { usePlayback } from '@/lib/playback';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Wifi, WifiOff, Radio, ChevronDown } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { zonesAPI } from '@/lib/api';
import { cn } from '@/app/components/ui/utils';

export function GlobalHeader() {
  const { activeTarget, setActiveTarget, state } = usePlayback();
  const [lastSync, setLastSync] = useState(new Date());
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const z = await zonesAPI.getZones();
        if (!mounted) return;
        setZones(z || []);
        setLastSync(new Date());
        // Auto-select first zone if none selected
        if (z && z.length > 0 && !activeTarget) {
          setActiveTarget(String(z[0].id));
        }
      } catch (e) {
        // keep header quiet
        console.warn('GlobalHeader load failed');
      }
    };
    load();
    const interval = window.setInterval(load, 10000);
    
    // Listen for zones-updated event to refresh immediately
    const handleZonesUpdated = () => {
      load();
    };
    window.addEventListener('zones-updated', handleZonesUpdated);
    
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('zones-updated', handleZonesUpdated);
    };
  }, [activeTarget, setActiveTarget]);

  const computedZones = useMemo(() => {
    return zones.map((z: any) => ({
      id: String(z.id),
      name: String(z.name ?? 'Zone'),
    }));
  }, [zones]);

  const currentZone = computedZones.find(z => z.id === activeTarget) || computedZones[0] || { id: '', name: 'Select Zone' };

  return (
    <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border-b border-white/10 px-4 py-3 md:py-3.5 lg:px-6 shadow-lg">
      <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap sm:flex-nowrap">
        {/* Target Zone Selector */}
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <Select value={activeTarget} onValueChange={setActiveTarget}>
            <SelectTrigger className="h-auto border border-white/20 shadow-sm bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] hover:border-[#1db954] hover:shadow-md rounded-lg px-3 md:px-4 py-2.5 transition-all duration-200">
              <div className="flex items-center gap-2.5 min-w-0 w-full">
                <div className="p-1.5 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-sm shrink-0">
                  <Radio className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="font-semibold text-sm sm:text-base truncate text-white">{currentZone.name}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 ml-auto shrink-0" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#2a2a2a] border-white/10">
              {computedZones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id} className="text-base text-white hover:bg-white/10">
                  <span className="font-medium">{zone.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <Badge 
            variant={state === 'live' ? 'default' : state === 'offline' ? 'destructive' : 'secondary'}
            className={cn(
              "gap-1.5 font-semibold shadow-sm rounded-md",
              state === 'live' && "bg-gradient-to-r from-[#1db954] to-[#1ed760] text-white border-0",
              state === 'offline' && "bg-gray-600 text-white border-0",
              state === 'standby' && "bg-white/10 text-gray-300 border-white/20"
            )}
          >
            {state === 'offline' ? (
              <WifiOff className="h-3.5 w-3.5" />
            ) : (
              <Wifi className="h-3.5 w-3.5" />
            )}
            <span>{state === 'live' ? 'LIVE' : state === 'offline' ? 'OFFLINE' : 'STANDBY'}</span>
          </Badge>
          <span className="text-xs text-gray-400 hidden md:inline whitespace-nowrap font-medium">
            {state === 'offline' 
              ? 'Changes will sync when connected'
              : `Synced ${formatRelativeTime(lastSync)}`}
          </span>
        </div>
      </div>
    </div>
  );
}