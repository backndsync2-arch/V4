import React, { useState } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { mockMusicTemplates, type MusicTemplate } from '@/lib/mockData';
import { Sparkles, Play, ChevronLeft, ChevronRight, Clock, Music, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { formatDuration } from '@/lib/utils';

interface MusicTemplatesGalleryProps {
  onUseTemplate?: (template: MusicTemplate) => void;
}

export function MusicTemplatesGallery({ onUseTemplate }: MusicTemplatesGalleryProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MusicTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const isAdmin = user?.role === 'admin';

  // Filter templates by availability and category
  const templates = mockMusicTemplates.filter((template) => {
    if (!template.active) return false;
    
    // Admin sees all templates
    if (isAdmin) {
      if (selectedCategory === 'all') return true;
      return template.category === selectedCategory;
    }
    
    // Clients see templates available to them
    const isAvailableToClient =
      template.availableFor === 'all' ||
      (Array.isArray(template.availableFor) && user?.clientId && template.availableFor.includes(user.clientId));
    
    if (!isAvailableToClient) return false;
    
    if (selectedCategory === 'all') return true;
    return template.category === selectedCategory;
  });

  const categories = [
    { value: 'all', label: 'All Moods', icon: '🎵' },
    { value: 'ambient', label: 'Ambient', icon: '🌊' },
    { value: 'upbeat', label: 'Upbeat', icon: '⚡' },
    { value: 'jazz', label: 'Jazz', icon: '🎷' },
    { value: 'classical', label: 'Classical', icon: '🎻' },
    { value: 'corporate', label: 'Corporate', icon: '💼' },
    { value: 'workout', label: 'Workout', icon: '💪' },
    { value: 'chill', label: 'Chill', icon: '☕' },
  ];

  const moodColors: Record<string, string> = {
    relaxing: 'bg-blue-100 text-blue-700',
    energetic: 'bg-orange-100 text-orange-700',
    professional: 'bg-slate-100 text-slate-700',
    sophisticated: 'bg-purple-100 text-purple-700',
    motivating: 'bg-red-100 text-red-700',
  };

  const scrollLeft = () => {
    const container = document.getElementById('music-templates-scroll');
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('music-templates-scroll');
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handlePreview = (template: MusicTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleUseTemplate = (template: MusicTemplate) => {
    if (onUseTemplate) {
      onUseTemplate(template);
    }
    toast.success(`Added playlist: ${template.title}`);
    setIsPreviewOpen(false);
  };

  if (templates.length === 0) return null;

  return (
    <>
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Curated Music Collections</h3>
                  <p className="text-sm text-slate-600">Professional playlists by sync2gear</p>
                </div>
              </div>
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Templates Carousel */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg bg-white hidden sm:flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div
                id="music-templates-scroll"
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent px-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="flex-shrink-0 w-[280px] overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handlePreview(template)}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={template.image}
                        alt={template.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                          {categories.find(c => c.value === template.category)?.icon} {template.category}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-full h-10 w-10 p-0 bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(template);
                          }}
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <Badge className={`${moodColors[template.mood]} border-0`}>
                          {template.mood}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold truncate">{template.title}</h4>
                      <p className="text-sm text-slate-600 line-clamp-2 mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          <Music className="h-3 w-3 mr-1" />
                          {template.tracks.length} tracks
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(template.totalDuration)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg bg-white hidden sm:flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center text-sm text-slate-500">
              Showing {templates.length} collection{templates.length !== 1 ? 's' : ''} in {selectedCategory === 'all' ? 'all moods' : categories.find(c => c.value === selectedCategory)?.label}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  {selectedTemplate.title}
                </DialogTitle>
                <DialogDescription>{selectedTemplate.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Template Image */}
                <div className="aspect-square relative overflow-hidden rounded-lg max-h-[300px]">
                  <img
                    src={selectedTemplate.image}
                    alt={selectedTemplate.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                        {categories.find(c => c.value === selectedTemplate.category)?.icon} {selectedTemplate.category}
                      </Badge>
                      <Badge className={`${moodColors[selectedTemplate.mood]} border-0`}>
                        {selectedTemplate.mood}
                      </Badge>
                      <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                        <Music className="h-3 w-3 mr-1" />
                        {selectedTemplate.tracks.length} tracks
                      </Badge>
                      <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(selectedTemplate.totalDuration)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Track List */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Tracks in this Collection</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedTemplate.tracks.map((track, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <div className="h-10 w-10 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Music className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.name}</p>
                          <p className="text-xs text-slate-500 truncate">{track.artist}</p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          {formatDuration(track.duration)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Template Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div>
                    <p className="text-xs text-purple-700 font-medium">Total Duration</p>
                    <p className="text-sm font-semibold text-purple-900">{formatDuration(selectedTemplate.totalDuration)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 font-medium">Tracks</p>
                    <p className="text-sm font-semibold text-purple-900">{selectedTemplate.tracks.length} songs</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 font-medium">Mood</p>
                    <p className="text-sm font-semibold text-purple-900 capitalize">{selectedTemplate.mood}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 font-medium">Availability</p>
                    <p className="text-sm font-semibold text-purple-900">
                      {selectedTemplate.availableFor === 'all' ? 'All Clients' : `${(selectedTemplate.availableFor as string[]).length} Clients`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      toast.info(`Playing preview: ${selectedTemplate.title}`);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleUseTemplate(selectedTemplate)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Library
                  </Button>
                </div>

                <p className="text-xs text-center text-slate-500">
                  This collection will be added to your music library as a new folder
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
