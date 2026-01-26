import React from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { FileText, Sparkles, Upload, Mic, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { announcementsAPI } from '@/lib/api';
import { Folder, TTSVoice, GeneratedScript } from './announcements.types';

interface CreateAnnouncementDialogProps {
  folders: Folder[];
  ttsVoices: TTSVoice[];
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  newTitle: string;
  onTitleChange: (title: string) => void;
  newText: string;
  onTextChange: (text: string) => void;
  newCategory: string;
  onCategoryChange: (category: string) => void;
  uploadFile: File | null;
  onUploadFileChange: (file: File | null) => void;
  uploadInputId: string;
  isCreating: boolean;
  isUploading: boolean;
  isGenerating: boolean;
  aiTopic: string;
  onAiTopicChange: (topic: string) => void;
  aiTone: string;
  onAiToneChange: (tone: string) => void;
  aiKeyPoints: string;
  onAiKeyPointsChange: (points: string) => void;
  aiQuantity: string;
  onAiQuantityChange: (quantity: string) => void;
  generatedScripts: GeneratedScript[];
  onGeneratedScriptsChange: (scripts: GeneratedScript[]) => void;
  previewingVoice: string | null;
  previewAudio: HTMLAudioElement | null;
  onPreviewVoice: (voice: string) => void;
  onStopPreview: () => void;
  onCreateScript: () => void;
  onGenerateAI: () => void;
  onCreateBulk: () => void;
  onUpload: () => void;
}

export function CreateAnnouncementDialog({
  folders,
  ttsVoices,
  selectedVoice,
  onVoiceChange,
  newTitle,
  onTitleChange,
  newText,
  onTextChange,
  newCategory,
  onCategoryChange,
  uploadFile,
  onUploadFileChange,
  uploadInputId,
  isCreating,
  isUploading,
  isGenerating,
  aiTopic,
  onAiTopicChange,
  aiTone,
  onAiToneChange,
  aiKeyPoints,
  onAiKeyPointsChange,
  aiQuantity,
  onAiQuantityChange,
  generatedScripts,
  onGeneratedScriptsChange,
  previewingVoice,
  previewAudio,
  onPreviewVoice,
  onStopPreview,
  onCreateScript,
  onGenerateAI,
  onCreateBulk,
  onUpload,
}: CreateAnnouncementDialogProps) {
  const handlePreviewVoice = async () => {
    if (previewingVoice === selectedVoice && previewAudio) {
      onStopPreview();
      return;
    }
    
    onPreviewVoice(selectedVoice);
    try {
      const preview = await announcementsAPI.previewVoice({
        text: newText.trim() || 'Hello, this is a voice preview. How does this sound?',
        voice: selectedVoice,
      });
      
      const audio = new Audio(preview.preview_url);
      await audio.play();
      
      audio.addEventListener('ended', () => {
        onStopPreview();
      });
      
      audio.addEventListener('error', () => {
        toast.error('Failed to play voice preview');
        onStopPreview();
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to preview voice');
      onStopPreview();
    }
  };

  const toggleScriptSelection = (index: number) => {
    onGeneratedScriptsChange(
      generatedScripts.map((script, i) => 
        i === index ? { ...script, selected: !script.selected } : script
      )
    );
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Announcement</DialogTitle>
        <DialogDescription>Create announcements with text-to-speech, upload, or record</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="script" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="script">
            <FileText className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Script</span>
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="record">
            <Mic className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Record</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Announcement title"
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Script Text</Label>
            <Textarea
              placeholder="Enter the announcement text here..."
              value={newText}
              onChange={(e) => onTextChange(e.target.value)}
              rows={6}
            />
            <p className="text-sm text-slate-500">
              Approx. {Math.ceil(newText.length / 10)} seconds when spoken
            </p>
          </div>
          <div className="space-y-2">
            <Label>Voice</Label>
            <Select value={selectedVoice} onValueChange={onVoiceChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ttsVoices.map(voice => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreviewVoice}
                disabled={previewingVoice === selectedVoice}
              >
                {previewingVoice === selectedVoice ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Stop Preview
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Preview Voice
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-500">Test the voice before creating</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select value={newCategory} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder..." />
              </SelectTrigger>
              <SelectContent>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onCreateScript} className="w-full" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Announcement'}
          </Button>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="space-y-2">
            <Label>Topic / Prompt</Label>
            <Input
              placeholder="e.g., Store closing early today at 5pm"
              value={aiTopic}
              onChange={(e) => onAiTopicChange(e.target.value)}
            />
            <p className="text-xs text-slate-500">What should the announcement be about?</p>
          </div>
          
          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={aiTone} onValueChange={onAiToneChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Select value={aiQuantity} onValueChange={onAiQuantityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 script</SelectItem>
                <SelectItem value="5">5 scripts</SelectItem>
                <SelectItem value="10">10 scripts</SelectItem>
                <SelectItem value="20">20 scripts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Key Points (Optional)</Label>
            <Textarea
              placeholder="Enter key points, one per line..."
              value={aiKeyPoints}
              onChange={(e) => onAiKeyPointsChange(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-slate-500">Add specific details to include in the announcement</p>
          </div>

          <Button 
            type="button"
            onClick={onGenerateAI} 
            className="w-full" 
            disabled={isGenerating}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : `Generate ${aiQuantity} AI Script${parseInt(aiQuantity) > 1 ? 's' : ''}`}
          </Button>
          <p className="text-xs text-slate-500 text-center">
            AI generation uses OpenAI API key configured on the server
          </p>

          {generatedScripts.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <Label className="text-blue-900">Generated Scripts ({generatedScripts.filter(s => s.selected).length} selected)</Label>
                <Badge variant="default" className="bg-blue-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Generated
                </Badge>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {generatedScripts.map((script, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border-2 transition-all ${
                      script.selected 
                        ? 'bg-white border-blue-400' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={script.selected}
                        onChange={() => toggleScriptSelection(index)}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm mb-1">{script.title}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{script.text}</p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Voice</Label>
                <Select value={selectedVoice} onValueChange={onVoiceChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ttsVoices.map(voice => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Folder</Label>
                <Select value={newCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={onCreateBulk} className="w-full" disabled={isCreating}>
                {isCreating ? 'Creating...' : `Create ${generatedScripts.filter(s => s.selected).length} Announcement${generatedScripts.filter(s => s.selected).length > 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Announcement title"
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Upload Audio File</Label>
            <input
              id={uploadInputId}
              type="file"
              accept="audio/mp3,audio/wav,audio/m4a,audio/mpeg"
              className="sr-only"
              onChange={(e) => onUploadFileChange(e.target.files?.[0] || null)}
            />
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" asChild>
                <label htmlFor={uploadInputId} className="cursor-pointer">
                  Choose file
                </label>
              </Button>
              <span className="text-sm text-slate-600 truncate">
                {uploadFile ? uploadFile.name : 'No file selected'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Supported formats: MP3, WAV, M4A (max 10MB)</p>
          </div>
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select value={newCategory} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder..." />
              </SelectTrigger>
              <SelectContent>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={isUploading || !uploadFile} onClick={onUpload}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </TabsContent>

        <TabsContent value="record" className="space-y-4">
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
            <Mic className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500 mb-4">Click to start recording</p>
            <Button variant="outline" size="lg" className="rounded-full">
              <Mic className="h-5 w-5 mr-2" />
              Start Recording
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

