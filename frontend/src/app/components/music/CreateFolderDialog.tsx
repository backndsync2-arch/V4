import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { musicAPI } from '@/lib/api';
import type { Folder } from '@/lib/types';
import { usePlayback } from '@/lib/playback';
import { useAuth } from '@/lib/auth';
import { ClientSelector } from '@/app/components/admin/ClientSelector';

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (folder: Folder) => void;
}) {
  const { activeTarget } = usePlayback();
  const { user, impersonatingClient } = useAuth();
  const thumbInputId = React.useId();
  const [name, setName] = useState('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setName('');
      setThumbFile(null);
      setThumbPreview(null);
      setIsCreating(false);
      setSelectedClientId('');
    }
  }, [open]);

  const canCreate = useMemo(() => name.trim().length > 0 && !isCreating, [name, isCreating]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (!activeTarget) {
      toast.error('Please select a zone first');
      return;
    }
    
    // For admin, check if client is selected
    if (user?.role === 'admin' && !impersonatingClient && !user?.clientId && !selectedClientId) {
      toast.error('Please select a client for this folder');
      return;
    }
    
    setIsCreating(true);
    try {
      const folderData: any = {
        name: name.trim(),
        type: 'music',
        zone_id: activeTarget,
        cover_image: thumbFile || undefined,
      };
      
      // Add client_id for admin if needed
      if (user?.role === 'admin') {
        if (impersonatingClient) {
          folderData.client_id = impersonatingClient;
        } else if (selectedClientId) {
          folderData.client_id = selectedClientId;
        } else if (user?.clientId) {
          folderData.client_id = user.clientId;
        }
      }
      
      const created = await musicAPI.createFolder(folderData);
      onCreated(created);
      toast.success(`Folder "${created.name}" created`);
      onOpenChange(false);
    } catch (e: any) {
      console.error('Create folder failed:', e);
      toast.error(e?.message || 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
          <DialogDescription>Create a new folder to organise your music</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ClientSelector
            value={selectedClientId}
            onValueChange={setSelectedClientId}
            required={user?.role === 'admin' && !impersonatingClient && !user?.clientId}
            label="Client"
            description="Select which client this folder belongs to"
          />
          <div className="space-y-2">
            <Label>Thumbnail (optional)</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 border flex items-center justify-center">
                {thumbPreview ? (
                  <img src={thumbPreview} alt="Folder thumbnail" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-500">No image</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  id={thumbInputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!f.type.startsWith('image/')) {
                      toast.error('Please select an image file');
                      return;
                    }
                    if (f.size > 5 * 1024 * 1024) {
                      toast.error('Image must be less than 5MB');
                      return;
                    }
                    setThumbFile(f);
                    setThumbPreview(URL.createObjectURL(f));
                  }}
                />
                <Button type="button" variant="outline" asChild>
                  <label htmlFor={thumbInputId} className="cursor-pointer">
                    Choose image
                  </label>
                </Button>
                {thumbPreview ? (
                  <Button type="button" variant="ghost" onClick={() => { setThumbFile(null); setThumbPreview(null); }}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <Input
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Button onClick={handleCreate} className="w-full" disabled={!canCreate}>
            {isCreating ? 'Creating...' : 'Create Folder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


