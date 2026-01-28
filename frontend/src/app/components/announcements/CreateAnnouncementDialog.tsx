import React from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { FileText, Sparkles, Upload, Mic, Play, Pause, Plus } from 'lucide-react';
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
  newFolderName?: string;
  onNewFolderNameChange?: (name: string) => void;
  onCreateFolder?: () => Promise<Folder | null>;
  isCreatingFolder?: boolean;
  activeTarget?: string | null;
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
  newFolderName = '',
  onNewFolderNameChange,
  onCreateFolder,
  isCreatingFolder = false,
  activeTarget,
}: CreateAnnouncementDialogProps) {
  const [showCreateFolderInput, setShowCreateFolderInput] = React.useState(false);
  const [newFolderNameLocal, setNewFolderNameLocal] = React.useState('');

  const handleFolderSelectChange = (value: string) => {
    if (value === '__create_new__') {
      setShowCreateFolderInput(true);
      setNewFolderNameLocal('');
    } else {
      setShowCreateFolderInput(false);
      onCategoryChange(value);
    }
  };

  const handleCreateFolderInline = async () => {
    if (!newFolderNameLocal.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    if (!activeTarget) {
      toast.error('Please select a zone first');
      return;
    }
    if (onNewFolderNameChange) {
      onNewFolderNameChange(newFolderNameLocal.trim());
    }
    if (onCreateFolder) {
      const newFolder = await onCreateFolder();
      // After creating, select the new folder
      if (newFolder && newFolder.id) {
        onCategoryChange(newFolder.id);
      }
      setShowCreateFolderInput(false);
      setNewFolderNameLocal('');
    }
  };
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
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
      <DialogHeader>
        <DialogTitle className="text-white">Create Announcement</DialogTitle>
        <DialogDescription className="text-gray-400">Create announcements with text-to-speech, upload, or record</DialogDescription>
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
            <p className="text-sm text-gray-400">
              Approx. {Math.ceil(newText.length / 10)} seconds when spoken
            </p>
          </div>
          <div className="space-y-2">
            <Label>Voice</Label>
            <div className="grid grid-cols-3 gap-2">
              {ttsVoices.map(voice => {
                const getAvatarUrl = (voiceId: string) => {
                  const avatars: Record<string, string> = {
                    'fable': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fable&backgroundColor=b6e3f4',
                    'alloy': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alloy&backgroundColor=c7d2fe',
                    'echo': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Echo&backgroundColor=ffd5db',
                    'onyx': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Onyx&backgroundColor=ffdfbf',
                    'nova': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova&backgroundColor=d1fae5',
                    'shimmer': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shimmer&backgroundColor=fce7f3',
                  };
                  return avatars[voiceId] || avatars['alloy'];
                };
                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => onVoiceChange(voice.id)}
                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      selectedVoice === voice.id
                        ? 'border-[#1db954] bg-[#1db954]/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]">
                      <img 
                        src={getAvatarUrl(voice.id)}
                        alt={voice.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedVoice === voice.id && (
                        <div className="absolute inset-0 bg-[#1db954]/20" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-white text-center">{voice.name.split('(')[0].trim()}</span>
                    <span className="text-xs text-gray-400">{voice.accent || 'UK'}</span>
                  </button>
                );
              })}
            </div>
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
              <p className="text-xs text-gray-400">Test the voice before creating</p>
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
            <p className="text-xs text-gray-400">Enter a brief topic or instruction. The AI will generate an announcement that plays during music.</p>
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
            <p className="text-xs text-gray-400">Add specific details to include in the announcement</p>
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
          <p className="text-xs text-gray-400 text-center">
            AI generation uses OpenAI API key configured on the server
          </p>

          {generatedScripts.length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border border-white/10 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <Label className="text-white">Generated Scripts ({generatedScripts.filter(s => s.selected).length} selected)</Label>
                <Badge variant="default" className="bg-gradient-to-r from-[#1db954] to-[#1ed760] text-white">
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
                        ? 'bg-white/5 border-[#1db954]' 
                        : 'bg-white/5 border-white/10'
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
                        <p className="font-medium text-sm mb-1 text-white">{script.title}</p>
                        <p className="text-sm text-gray-400 line-clamp-2">{script.text}</p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Voice</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ttsVoices.map(voice => {
                    const getAvatarUrl = (voiceId: string) => {
                      const avatars: Record<string, string> = {
                        'fable': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fable&backgroundColor=b6e3f4',
                        'alloy': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alloy&backgroundColor=c7d2fe',
                        'echo': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Echo&backgroundColor=ffd5db',
                        'onyx': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Onyx&backgroundColor=ffdfbf',
                        'nova': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova&backgroundColor=d1fae5',
                        'shimmer': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shimmer&backgroundColor=fce7f3',
                      };
                      return avatars[voiceId] || avatars['alloy'];
                    };
                    return (
                      <button
                        key={voice.id}
                        type="button"
                        onClick={() => onVoiceChange(voice.id)}
                        className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          selectedVoice === voice.id
                            ? 'border-[#1db954] bg-[#1db954]/10'
                            : 'border-white/10 hover:border-white/30 bg-white/5'
                        }`}
                      >
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]">
                          <img 
                            src={getAvatarUrl(voice.id)}
                            alt={voice.name}
                            className="w-full h-full object-cover"
                          />
                          {selectedVoice === voice.id && (
                            <div className="absolute inset-0 bg-[#1db954]/20" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-white text-center">{voice.name.split('(')[0].trim()}</span>
                        <span className="text-xs text-gray-400">{voice.accent || 'UK'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Folder</Label>
                {!showCreateFolderInput ? (
                  <Select value={newCategory} onValueChange={handleFolderSelectChange}>
                    <SelectTrigger className="bg-white/5">
                      <SelectValue placeholder="Select folder..." />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map(folder => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__create_new__" className="text-[#1db954]">
                        <Plus className="h-4 w-4 inline mr-2" />
                        Create New Folder
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Folder name"
                        value={newFolderNameLocal}
                        onChange={(e) => setNewFolderNameLocal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateFolderInline();
                          } else if (e.key === 'Escape') {
                            setShowCreateFolderInput(false);
                            setNewFolderNameLocal('');
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCreateFolderInput(false);
                          setNewFolderNameLocal('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateFolderInline}
                      disabled={!newFolderNameLocal.trim() || isCreatingFolder}
                      className="w-full"
                    >
                      {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                    </Button>
                  </div>
                )}
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
              <span className="text-sm text-gray-400 truncate">
                {uploadFile ? uploadFile.name : 'No file selected'}
              </span>
            </div>
            <p className="text-xs text-gray-400">Supported formats: MP3, WAV, M4A (max 10MB)</p>
          </div>
          <div className="space-y-2">
            <Label>Folder</Label>
            {!showCreateFolderInput ? (
              <Select value={newCategory} onValueChange={handleFolderSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder..." />
                </SelectTrigger>
                <SelectContent>
                  {folders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__create_new__" className="text-[#1db954]">
                    <Plus className="h-4 w-4 inline mr-2" />
                    Create New Folder
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Folder name"
                    value={newFolderNameLocal}
                    onChange={(e) => setNewFolderNameLocal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateFolderInline();
                      } else if (e.key === 'Escape') {
                        setShowCreateFolderInput(false);
                        setNewFolderNameLocal('');
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreateFolderInput(false);
                      setNewFolderNameLocal('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateFolderInline}
                  disabled={!newFolderNameLocal.trim() || isCreatingFolder}
                  className="w-full"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </Button>
              </div>
            )}
          </div>
          <Button className="w-full" disabled={isUploading || !uploadFile} onClick={onUpload}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </TabsContent>

        <TabsContent value="record" className="space-y-4">
          <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-lg">
            <Mic className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-400 mb-4">Click to start recording</p>
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

