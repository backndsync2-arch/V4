import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { musicAPI } from '@/lib/api';
import type { Folder } from '@/lib/types';

export function EditFolderDialog({
  open,
  onOpenChange,
  folder,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder | null;
  onUpdated: (folder: Folder) => void;
}) {
  const thumbInputId = React.useId();
  const [name, setName] = useState('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize form when folder changes or dialog opens
  useEffect(() => {
    if (open && folder) {
      setName(folder.name || '');
      setThumbFile(null);
      setThumbPreview(folder.coverImageUrl || null);
    } else if (!open) {
      setName('');
      setThumbFile(null);
      setThumbPreview(null);
      setIsUpdating(false);
    }
  }, [open, folder]);

  const canUpdate = useMemo(() => {
    return name.trim().length > 0 && !isUpdating && folder !== null;
  }, [name, isUpdating, folder]);

  const handleUpdate = async () => {
    if (!name.trim() || !folder) return;
    setIsUpdating(true);
    try {
      const updated = await musicAPI.updateFolder(folder.id, {
        name: name.trim(),
        cover_image: thumbFile || undefined,
      });
      onUpdated(updated);
      toast.success(`Folder "${updated.name}" updated`);
      onOpenChange(false);
    } catch (e: any) {
      console.error('Update folder failed:', e);
      toast.error(e?.message || 'Failed to update folder');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
          <DialogDescription>Update folder name and thumbnail</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                    {thumbPreview ? 'Change image' : 'Choose image'}
                  </label>
                </Button>
                {thumbPreview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setThumbFile(null);
                      // Reset to original image if it existed, otherwise clear
                      setThumbPreview(folder.coverImageUrl || null);
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Folder name</Label>
            <Input
              placeholder="Folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpdate} className="flex-1" disabled={!canUpdate}>
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

