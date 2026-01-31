import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Settings, Plus, Grid3x3, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { zonesAPI } from '@/lib/api';

interface Zone {
  id: string;
  name: string;
  description?: string;
  floor?: { id: string; name: string } | null;
  default_volume: number;
  is_active: boolean;
}

export function Zones() {
  const { user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneSettingsOpen, setZoneSettingsOpen] = useState<Record<string, boolean>>({});
  const [zoneVolumeSettings, setZoneVolumeSettings] = useState<Record<string, number>>({});
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDescription, setNewZoneDescription] = useState('');

  // Load zones
  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const zonesData = await zonesAPI.getZones();
      
      setZones(zonesData);
      
      // Initialize zone volume settings
      const zoneVolumes: Record<string, number> = {};
      zonesData.forEach((z: Zone) => {
        zoneVolumes[z.id] = z.default_volume || 70;
      });
      setZoneVolumeSettings(zoneVolumes);
    } catch (error: any) {
      console.error('Failed to load zones data:', error);
      toast.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenZoneSettings = (zoneName: string) => {
    const zone = zones.find(z => z.name === zoneName);
    if (zone) {
      // Initialize zone volume setting when opening dialog
      setZoneVolumeSettings(prev => ({
        ...prev,
        [zone.id]: zone.default_volume || 70,
      }));
    }
    setZoneSettingsOpen(prev => ({
      ...prev,
      [zoneName]: true,
    }));
  };

  const handleCloseZoneSettings = (zoneName: string) => {
    setZoneSettingsOpen(prev => ({
      ...prev,
      [zoneName]: false,
    }));
  };

  const handleCreateZone = async () => {
    if (!newZoneName.trim()) {
      toast.error('Zone name is required');
      return;
    }
    
    try {
      await zonesAPI.createZone({
        name: newZoneName.trim(),
        description: newZoneDescription.trim() || undefined,
      });
      toast.success('Zone created successfully');
      setIsCreateZoneOpen(false);
      setNewZoneName('');
      setNewZoneDescription('');
      loadData();
    } catch (error: any) {
      console.error('Failed to create zone:', error);
      toast.error('Failed to create zone');
    }
  };

  const handleSaveZoneSettings = async (zoneId: string, zoneName: string) => {
    try {
      const volumeToSave = zoneVolumeSettings[zoneId];
      if (volumeToSave !== undefined) {
        await zonesAPI.updateZone(zoneId, {
          default_volume: volumeToSave,
        });
        toast.success(`Settings saved for ${zoneName}`);
        handleCloseZoneSettings(zoneName);
        loadData();
      } else {
        toast.info('No changes to save');
        handleCloseZoneSettings(zoneName);
      }
    } catch (error: any) {
      console.error('Failed to save zone settings:', error);
      toast.error('Failed to save zone settings');
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
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-slate-600">Manage zones across your business</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateZoneOpen} onOpenChange={setIsCreateZoneOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Zone</DialogTitle>
                <DialogDescription>
                  Create a new zone to organize your locations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Zone Name</Label>
                  <Input 
                    placeholder="e.g., Kitchen, Outdoor Patio" 
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input 
                    placeholder="Describe this zone..." 
                    value={newZoneDescription}
                    onChange={(e) => setNewZoneDescription(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleCreateZone}>
                  Create Zone
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Zone Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Zones</p>
                <p className="text-3xl font-bold mt-2">{zones.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-[#1db954]/20 to-[#1ed760]/10">
                <Grid3x3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Zones</p>
                <p className="text-3xl font-bold mt-2">
                  {zones.filter(z => z.is_active).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <Grid3x3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Inactive Zones</p>
                <p className="text-3xl font-bold mt-2">
                  {zones.filter(z => !z.is_active).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/10">
                <Grid3x3 className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones List */}
      {zones.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-gray-400">No zones found. Create your first zone to get started.</p>
          </CardContent>
        </Card>
      ) : (
        zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{zone.name}</CardTitle>
                  <CardDescription>
                    {zone.description || 'No description'}
                    {zone.floor && ` • Floor: ${zone.floor.name}`}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleOpenZoneSettings(zone.name)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Zone Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">Default Volume</p>
                      <p className="text-xs text-gray-400">{zone.default_volume}%</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className={`text-xs ${zone.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {zone.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Zone Settings Dialogs */}
      {zones.map((zone) => {
        const zoneName = zone.name;
        
        return (
          <Dialog 
            key={`settings-${zone.id}`}
            open={zoneSettingsOpen[zoneName] || false}
            onOpenChange={(open) => {
              if (!open) handleCloseZoneSettings(zoneName);
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{zoneName} Settings</DialogTitle>
                <DialogDescription>
                  Configure volume settings for this zone
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Default Volume */}
                <div className="space-y-3">
                  <Label>Default Volume</Label>
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <Slider
                      value={[zoneVolumeSettings[zone.id] ?? zone.default_volume ?? 70]}
                      max={100}
                      step={1}
                      onValueChange={(value) => {
                        // Update local state immediately for responsive UI
                        setZoneVolumeSettings(prev => ({
                          ...prev,
                          [zone.id]: value[0],
                        }));
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-10 text-right">
                      {zoneVolumeSettings[zone.id] ?? zone.default_volume ?? 70}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    This volume will be applied to this zone. Click "Save Settings" to apply changes.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => handleCloseZoneSettings(zoneName)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleSaveZoneSettings(zone.id, zoneName)}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
