import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Radio } from 'lucide-react';
import { toast } from 'sonner';

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (announcement: { id: string; title: string; text: string; type: 'tts' | 'upload' }) => void;
}

export function CreateAnnouncementDialog({ open, onOpenChange, onCreated }: CreateAnnouncementDialogProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('female1');
  const [type, setType] = useState<'tts' | 'upload'>('tts');

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (type === 'tts' && !text.trim()) {
      toast.error('Please enter announcement text');
      return;
    }

    const newAnnouncement = {
      id: `instant-${Date.now()}`,
      title,
      text,
      type,
    };

    onCreated(newAnnouncement);
    toast.success('Announcement created!');
    
    // Reset form
    setTitle('');
    setText('');
    setVoice('female1');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Instant Announcement</DialogTitle>
          <DialogDescription>
            Create a new announcement to play immediately
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'tts' | 'upload')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tts">Text-to-Speech</SelectItem>
                <SelectItem value="upload">Upload Audio (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Flash Sale Announcement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {type === 'tts' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="text">Message Text</Label>
                <Textarea
                  id="text"
                  placeholder="Type your announcement message here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-slate-500">
                  Estimated duration: ~{Math.ceil(text.split(' ').length / 2.5)}s
                </p>
              </div>

              <div className="space-y-2">
                <Label>Voice</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female1">Female Voice 1</SelectItem>
                    <SelectItem value="female2">Female Voice 2</SelectItem>
                    <SelectItem value="male1">Male Voice 1</SelectItem>
                    <SelectItem value="male2">Male Voice 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            <Radio className="h-4 w-4 mr-2" />
            Create & Play
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
