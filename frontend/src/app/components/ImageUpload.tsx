import React, { useRef, useState } from 'react';
import { Plus, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { toast } from 'sonner';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string | null) => void;
  variant?: 'profile' | 'cover' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ImageUpload({ 
  currentImage, 
  onImageChange, 
  variant = 'cover',
  size = 'md',
  className = '' 
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageChange(url);
    setShowDialog(false);
    toast.success('Image uploaded successfully');
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Image removed');
  };

  const handleClick = () => {
    if (previewUrl) {
      setShowDialog(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32'
  };

  const iconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const plusSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (variant === 'profile') {
    return (
      <>
        <div className={`relative ${sizeClasses[size]} ${className}`}>
          <button
            onClick={handleClick}
            className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 transition-all duration-200 flex items-center justify-center group"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className={`${iconSizeClasses[size]} text-blue-600`} />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
            title="Upload photo"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile Photo</DialogTitle>
              <DialogDescription>
                Update or remove your profile photo
              </DialogDescription>
            </DialogHeader>
            {previewUrl && (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="w-48 h-48 rounded-full object-cover"
                />
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowDialog(false);
                    }}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleRemoveImage();
                      setShowDialog(false);
                    }}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Cover art variant (for music files)
  if (variant === 'cover') {
    return (
      <>
        <div className={`relative group ${className}`}>
          <button
            onClick={handleClick}
            className="w-full aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 transition-all duration-200 flex items-center justify-center"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Cover art"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="h-12 w-12 text-slate-400" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
            title="Upload cover art"
          >
            <Plus className="h-4 w-4" />
          </button>
          {previewUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              className="absolute top-2 left-2 h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </>
    );
  }

  // Icon variant (for announcements - small inline)
  return (
    <>
      <button
        onClick={handleClick}
        className={`relative h-10 w-10 rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 transition-all duration-200 flex items-center justify-center group ${className}`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Icon"
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="h-5 w-5 text-slate-400" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Plus className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Announcement Icon</DialogTitle>
            <DialogDescription>
              Update or remove the icon for this announcement
            </DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={previewUrl}
                alt="Icon preview"
                className="w-32 h-32 rounded-lg object-cover"
              />
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowDialog(false);
                  }}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change Icon
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleRemoveImage();
                    setShowDialog(false);
                  }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
