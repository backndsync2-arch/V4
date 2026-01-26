import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Progress } from '@/app/components/ui/progress';
import { Upload, X, FileAudio, Folder, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Array<{ id: string; name: string; type: 'music' | 'announcements' }>;
  uploadType: 'music' | 'announcements';
  onUploadComplete?: () => void;
  onUpload?: (files: File[], folderId: string | null, type: 'music' | 'announcements') => Promise<void>;
  allowTypeSelection?: boolean;
  onTypeChange?: (type: 'music' | 'announcements') => void;
}

export function UploadDialog({
  open,
  onOpenChange,
  folders,
  uploadType,
  onUploadComplete,
  onUpload,
  allowTypeSelection = false,
  onTypeChange,
}: UploadDialogProps) {
  console.log('UploadDialog render:', { open, folders: folders.length, uploadType });
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState<'music' | 'announcements'>(uploadType);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFolders = folders.filter(f => f.type === currentUploadType);
  
  const handleTypeChange = (type: 'music' | 'announcements') => {
    setCurrentUploadType(type);
    setSelectedFolder(null); // Reset folder when changing type
    onTypeChange?.(type);
  };
  const acceptedFormats = currentUploadType === 'music' 
    ? 'audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg,audio/flac'
    : 'audio/mp3,audio/wav,audio/m4a,audio/aac';

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(file => {
      return file.type.startsWith('audio/');
    });

    if (files.length === 0) {
      toast.error('Please drop audio files only');
      return;
    }

    addFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
  };

  const addFiles = (files: File[]) => {
    const newFiles: UploadFile[] = files.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'pending' as const,
      progress: 0,
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    // Folder selection is optional - can upload to root

    setIsUploading(true);

    try {
      if (onUpload) {
        await onUpload(
          uploadFiles.map(f => f.file),
          selectedFolder || null,
          currentUploadType
        );
        toast.success(`Successfully uploaded ${uploadFiles.length} file(s)`);
        handleClose();
        onUploadComplete?.();
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploadFiles([]);
      setSelectedFolder(null);
      setCurrentUploadType(uploadType);
      setIsUploading(false);
      onOpenChange(false);
    }
  };
  
  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setUploadFiles([]);
      setSelectedFolder(null);
      setCurrentUploadType(uploadType);
      setIsUploading(false);
    }
  }, [open, uploadType]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload {currentUploadType === 'music' ? 'Music' : 'Announcements'}
          </DialogTitle>
          <DialogDescription>
            Upload audio files to your {currentUploadType === 'music' ? 'music library' : 'announcements library'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Type Selection (for admin) */}
          {allowTypeSelection && (
            <div className="space-y-2">
              <Label>Upload Type</Label>
              <Select value={currentUploadType} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="music">Music Library</SelectItem>
                  <SelectItem value="announcements">Announcements</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {currentUploadType === 'music' 
                  ? 'Files will be added to the Music Library' 
                  : 'Files will be added to Announcements'}
              </p>
            </div>
          )}

          {/* Folder Selection */}
          {filteredFolders.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Select Folder
              </Label>
              <Select value={selectedFolder || ''} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a folder (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Folder (Root)</SelectItem>
                  {filteredFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Files will be organized in the selected folder. You can move them later.
              </p>
            </div>
          )}

          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className={`p-4 rounded-full ${dragActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <FileAudio className={`h-12 w-12 ${dragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-700 mb-2">
                  Drag and drop audio files here
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  or click to browse files
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Supported: MP3, WAV, M4A, AAC, OGG, FLAC • Max 20 files at once
              </p>
            </div>
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Selected Files ({uploadFiles.length})</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadFiles([])}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                {uploadFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <FileAudio className="h-5 w-5 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="h-1 mt-2" />
                      )}
                      {uploadFile.error && (
                        <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {uploadFile.status === 'success' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      {uploadFile.status === 'uploading' && (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      )}
                      {uploadFile.status === 'pending' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Uploading files...</span>
                <span className="text-slate-500">
                  {uploadFiles.filter(f => f.status === 'success').length} / {uploadFiles.length}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploadFiles.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {uploadFiles.length} File{uploadFiles.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
