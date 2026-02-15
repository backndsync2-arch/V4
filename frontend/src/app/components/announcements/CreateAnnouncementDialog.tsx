import React from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { FileText, Sparkles, Upload, Mic, Play, Pause, Plus, Volume2, StopCircle, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { announcementsAPI } from '@/lib/api';
import { Folder, TTSVoice, GeneratedScript } from './announcements.types';
import { useAuth } from '@/lib/auth';
import { ClientSelector } from '@/app/components/admin/ClientSelector';

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
  onClose?: () => void;
  onAnnouncementsCreated?: () => void;
  newFolderName?: string;
  onNewFolderNameChange?: (name: string) => void;
  onCreateFolder?: (selectedClientId?: string) => Promise<Folder | null>;
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
  onClose,
  onAnnouncementsCreated,
  newFolderName = '',
  onNewFolderNameChange,
  onCreateFolder,
  isCreatingFolder = false,
  activeTarget,
}: CreateAnnouncementDialogProps) {
  const { user, impersonatingClient } = useAuth();
  const [selectedClientId, setSelectedClientId] = React.useState<string>('');
  const [showCreateFolderInput, setShowCreateFolderInput] = React.useState(false);
  const [newFolderNameLocal, setNewFolderNameLocal] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [recordedAudio, setRecordedAudio] = React.useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = React.useState<string | null>(null);
  const [editingScriptIndex, setEditingScriptIndex] = React.useState<number | null>(null);
  const [editedScript, setEditedScript] = React.useState<{ title: string; text: string }>({ title: '', text: '' });
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleVoiceClick = async (voiceId: string) => {
    // Select the voice
    onVoiceChange(voiceId);
    
    // If already previewing this voice, stop it
    if (previewingVoice === voiceId && previewAudio) {
      previewAudio.pause();
      onStopPreview();
      return;
    }
    
    // Stop any currently playing preview
    if (previewAudio) {
      previewAudio.pause();
      onStopPreview();
    }
    
    // Start preview for the clicked voice
    // The onPreviewVoice handler will manage the API call and audio playback
    onPreviewVoice(voiceId);
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported MIME type
      let mimeType = 'audio/webm';
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      const options: MediaRecorderOptions = { mimeType };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording error occurred');
        handleStopRecording();
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length === 0) {
          toast.error('No audio data recorded');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedAudio(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        toast.success('Recording completed');
      };

      // Start recording with timeslice to ensure data is captured
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast.error('Failed to start recording: ' + (error.message || 'Microphone access denied'));
      console.error('Recording error:', error);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping recorder:', error);
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleClearRecording = () => {
    setRecordedAudio(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordingTime(0);
  };

  const handleSaveRecording = async () => {
    if (!recordedAudio || !newTitle.trim()) {
      toast.error('Please provide a title and ensure recording is complete');
      return;
    }

    try {
      // Determine file extension based on blob type
      let extension = 'webm';
      let mimeType = recordedAudio.type || 'audio/webm';
      
      if (mimeType.includes('ogg')) {
        extension = 'ogg';
      } else if (mimeType.includes('mp4')) {
        extension = 'm4a';
        mimeType = 'audio/mp4';
      } else if (mimeType.includes('wav')) {
        extension = 'wav';
      }
      
      // Convert blob to file
      const audioFile = new File([recordedAudio], `${newTitle}.${extension}`, { type: mimeType });
      
      // Upload directly
      await announcementsAPI.uploadAnnouncement(
        audioFile,
        {
          title: newTitle.trim(),
          folder_id: newCategory || undefined,
          zone_id: activeTarget || undefined,
          is_recording: true,
        },
        () => {}
      );
      
      toast.success(`Recording saved: ${newTitle}`);
      
      // Reload announcements if callback provided
      if (onAnnouncementsCreated) {
        await onAnnouncementsCreated();
      }
      
      // Clear recording and reset form
      handleClearRecording();
      onTitleChange('');
      onCategoryChange('');
      
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      toast.error('Failed to save recording: ' + (error.message || 'Unknown error'));
      console.error('Save recording error:', error);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

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
      const newFolder = await onCreateFolder(selectedClientId);
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
      toast.info('Generating voice preview...');
      const preview = await announcementsAPI.previewVoice({
        text: newText.trim() || 'Hello, this is a voice preview. How does this sound?',
        voice: selectedVoice,
      });
      
      if (preview.error || preview.detail) {
        throw new Error(preview.error || preview.detail || 'Failed to generate preview');
      }
      
      if (!preview.preview_url) {
        throw new Error('No preview URL returned from server');
      }
      
      // Ensure the preview URL is absolute using the normalizeUrl utility
      const { normalizeUrl } = await import('@/lib/api/core');
      const previewUrl = normalizeUrl(preview.preview_url);
      const audio = new Audio(previewUrl);
      
      audio.addEventListener('canplay', () => {
        toast.dismiss();
        toast.success(preview.cached ? 'Playing cached preview' : 'Voice preview playing');
      });
      
      audio.addEventListener('ended', () => {
        onStopPreview();
      });
      
      audio.addEventListener('error', async () => {
        // Try to regenerate if audio fails
        try {
          toast.info('Regenerating voice preview...');
          const regenerated = await announcementsAPI.previewVoice({
            text: newText.trim() || 'Hello, this is a voice preview. How does this sound?',
            voice: selectedVoice,
          });
          
          if (regenerated.preview_url) {
            const newUrl = normalizeUrl(regenerated.preview_url);
            audio.src = newUrl;
            audio.load();
            await audio.play();
            toast.success('Voice preview playing');
            return;
          }
        } catch (regenError) {
          console.error('Failed to regenerate:', regenError);
        }
        
        toast.error('Failed to play voice preview');
        onStopPreview();
      });
      
      await audio.play();
    } catch (error: any) {
      const errorMessage = error?.error || error?.detail || error?.message || 'Failed to preview voice';
      
      if (errorMessage.includes('OpenAI API key')) {
        toast.error('Voice preview generation is not configured. Please contact your administrator.');
      } else {
        toast.error(errorMessage);
      }
      
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

  const handleEditScript = (index: number, script: GeneratedScript) => {
    setEditingScriptIndex(index);
    setEditedScript({ title: script.title, text: script.text });
  };

  const handleSaveScript = (index: number) => {
    if (!editedScript.title.trim() || !editedScript.text.trim()) {
      toast.error('Title and text cannot be empty');
      return;
    }
    onGeneratedScriptsChange(
      generatedScripts.map((script, i) => 
        i === index ? { ...script, title: editedScript.title, text: editedScript.text } : script
      )
    );
    setEditingScriptIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingScriptIndex(null);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
      <DialogHeader>
        <DialogTitle className="text-white">Create Announcement</DialogTitle>
        <DialogDescription className="text-gray-400">Create announcements with text-to-speech, upload, or record</DialogDescription>
      </DialogHeader>
      <div className="mb-4">
        <ClientSelector
          value={selectedClientId}
          onValueChange={setSelectedClientId}
          required={user?.role === 'admin' && !impersonatingClient && !user?.clientId}
          label="Client"
          description="Select which client this announcement belongs to"
        />
      </div>
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
            <div className="grid grid-cols-3 gap-3">
              {ttsVoices.map(voice => {
                // Use professional image from API or fallback to Unsplash
                const getAvatarUrl = (voice: any) => {
                  if (voice.image_url) {
                    return voice.image_url;
                  }
                  // Fallback professional images - matched to voice genders
                  // Male voices: echo, fable, onyx
                  // Female voices: nova, shimmer, alloy
                  const fallbackImages: Record<string, string> = {
                    // Male voices - professional male headshots
                    'echo': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
                    'fable': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
                    'onyx': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
                    // Female voices - professional female headshots
                    'nova': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
                    'shimmer': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
                    'alloy': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
                  };
                  return fallbackImages[voice.id] || fallbackImages['alloy'];
                };
                const isPreviewing = previewingVoice === voice.id;
                const isSelected = selectedVoice === voice.id;
                
                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => handleVoiceClick(voice.id)}
                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-[#1db954] bg-[#1db954]/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    } ${isPreviewing ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                  >
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] ring-2 ring-white/10">
                      <img 
                        src={getAvatarUrl(voice)}
                        alt={voice.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#1db954]/20" />
                      )}
                      {isPreviewing && (
                        <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                          <Volume2 className="h-6 w-6 text-white animate-pulse" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-white text-center">{voice.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{voice.gender || 'neutral'}</span>
                    {voice.description && (
                      <span className="text-xs text-gray-500 text-center px-1 line-clamp-2">{voice.description}</span>
                    )}
                    {isPreviewing && (
                      <span className="text-xs text-blue-400 font-medium">Playing...</span>
                    )}
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
                disabled={!selectedVoice || previewingVoice === selectedVoice}
              >
                {previewingVoice === selectedVoice ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Stop Preview
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Preview Selected
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-400">💡 Click any voice to preview instantly</p>
            </div>
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
          <Button onClick={() => {
            // Store selectedClientId temporarily for handler to use
            if (selectedClientId) {
              (window as any).__tempSelectedClientId = selectedClientId;
            }
            onCreateScript();
          }} className="w-full" disabled={isCreating}>
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
                    {editingScriptIndex === index ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-400">Title</Label>
                          <Input
                            value={editedScript.title}
                            onChange={(e) => setEditedScript(prev => ({ ...prev, title: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-400">Script</Label>
                          <Textarea
                            value={editedScript.text}
                            onChange={(e) => setEditedScript(prev => ({ ...prev, text: e.target.value }))}
                            className="min-h-[80px] text-sm"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 px-2">
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleSaveScript(index)} className="h-7 px-2">
                            <Save className="h-3 w-3 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <label className="flex items-start gap-3 cursor-pointer min-h-[44px] flex-1">
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                          onClick={() => handleEditScript(index, script)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Voice</Label>
                <div className="grid grid-cols-3 gap-3">
                  {ttsVoices.map(voice => {
                    // Use professional image from API or fallback
                    const getAvatarUrl = (voice: any) => {
                      if (voice.image_url) {
                        return voice.image_url;
                      }
                      const fallbackImages: Record<string, string> = {
                        'echo': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
                        'fable': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
                        'onyx': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
                        'nova': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
                        'shimmer': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
                        'alloy': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
                      };
                      return fallbackImages[voice.id] || fallbackImages['alloy'];
                    };
                    const isPreviewing = previewingVoice === voice.id;
                    const isSelected = selectedVoice === voice.id;
                    
                    return (
                      <button
                        key={voice.id}
                        type="button"
                        onClick={() => handleVoiceClick(voice.id)}
                        className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-[#1db954] bg-[#1db954]/10'
                            : 'border-white/10 hover:border-white/30 bg-white/5'
                        } ${isPreviewing ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                      >
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] ring-2 ring-white/10">
                          <img 
                            src={getAvatarUrl(voice)}
                            alt={voice.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#1db954]/20" />
                          )}
                          {isPreviewing && (
                            <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                              <Volume2 className="h-6 w-6 text-white animate-pulse" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-white text-center">{voice.name}</span>
                        <span className="text-xs text-gray-400 capitalize">{voice.gender || 'neutral'}</span>
                        {isPreviewing && (
                          <span className="text-xs text-blue-400 font-medium">Playing...</span>
                        )}
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
                    disabled={!selectedVoice || previewingVoice === selectedVoice}
                  >
                    {previewingVoice === selectedVoice ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Stop Preview
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Preview Selected
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-400">Click any voice to preview instantly</p>
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

              <Button onClick={() => {
                // Store selectedClientId temporarily for handler to use
                if (selectedClientId) {
                  (window as any).__tempSelectedClientId = selectedClientId;
                }
                onCreateBulk();
              }} className="w-full" disabled={isCreating}>
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
          <Button className="w-full" disabled={isUploading || !uploadFile} onClick={() => {
            // Store selectedClientId temporarily for handler to use
            if (selectedClientId) {
              (window as any).__tempSelectedClientId = selectedClientId;
            }
            onUpload();
          }}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </TabsContent>

        <TabsContent value="record" className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Announcement title"
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>
          <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-lg space-y-4">
            <Mic className={`h-12 w-12 mx-auto mb-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
            <div className="space-y-2">
              {isRecording ? (
                <>
                  <p className="text-red-400 font-medium">Recording in progress...</p>
                  <p className="text-sm text-gray-400">{recordingTime}s</p>
                  <Button 
                    variant="destructive" 
                    size="lg" 
                    className="rounded-full"
                    onClick={handleStopRecording}
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Stop Recording
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-400 mb-4">Click to start recording</p>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="rounded-full"
                    onClick={handleStartRecording}
                    disabled={!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia}
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Start Recording
                  </Button>
                  {(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) && (
                    <p className="text-xs text-red-400 mt-2">Recording not supported in this browser</p>
                  )}
                </>
              )}
            </div>
          </div>
          {recordedAudio && (
            <div className="space-y-2 p-4 bg-white/5 rounded-lg">
              <Label>Recorded Audio</Label>
              {recordedAudioUrl ? (
                <audio 
                  src={recordedAudioUrl} 
                  controls 
                  className="w-full"
                  onError={(e) => {
                    console.error('Audio playback error:', e);
                    toast.error('Failed to play recorded audio. The file may still be saved.');
                  }}
                  onLoadedMetadata={() => {
                    console.log('Audio loaded successfully');
                  }}
                />
              ) : (
                <div className="p-4 text-center text-red-400">
                  Error: Audio URL not available
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClearRecording}>
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveRecording}
                  disabled={!newTitle.trim() || isCreating || !recordedAudio}
                >
                  {isCreating ? 'Saving...' : 'Save Recording'}
                </Button>
              </div>
            </div>
          )}
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
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

