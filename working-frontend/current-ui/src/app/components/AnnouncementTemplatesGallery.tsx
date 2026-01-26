import { useState } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { mockAnnouncementTemplates, type AnnouncementTemplate } from '@/lib/mockData';
import { Sparkles, Play, ChevronLeft, ChevronRight, Clock, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { formatDuration } from '@/lib/utils';

interface AnnouncementTemplatesGalleryProps {
  onUseTemplate?: (template: AnnouncementTemplate) => void;
}

export function AnnouncementTemplatesGallery({ onUseTemplate }: AnnouncementTemplatesGalleryProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AnnouncementTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const isAdmin = user?.role === 'admin';

  // Filter templates by availability and category
  const templates = mockAnnouncementTemplates.filter((template) => {
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
    { value: 'all', label: 'All Categories', icon: '🎯' },
    { value: 'retail', label: 'Retail', icon: '🛍️' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { value: 'office', label: 'Office', icon: '💼' },
    { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { value: 'gym', label: 'Gym', icon: '💪' },
    { value: 'general', label: 'General', icon: '📢' },
  ];

  const scrollLeft = () => {
    const container = document.getElementById('templates-scroll');
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('templates-scroll');
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handlePreview = (template: AnnouncementTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleUseTemplate = (template: AnnouncementTemplate) => {
    if (onUseTemplate) {
      onUseTemplate(template);
    }
    toast.success(`Using template: ${template.title}`);
    setIsPreviewOpen(false);
  };

  if (templates.length === 0) return null;

  return (
    <>
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Ready-Made Announcements</h3>
                  <p className="text-sm text-slate-600">Professional templates by sync2gear</p>
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
                id="templates-scroll"
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent px-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="flex-shrink-0 w-[280px] overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handlePreview(template)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={template.image}
                        alt={template.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                          {categories.find(c => c.value === template.category)?.icon} {template.category}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-full h-8 w-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(template);
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold truncate">{template.title}</h4>
                      <p className="text-sm text-slate-600 line-clamp-2 mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(template.duration)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.voiceType}
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
              Showing {templates.length} template{templates.length !== 1 ? 's' : ''} in {selectedCategory === 'all' ? 'all categories' : categories.find(c => c.value === selectedCategory)?.label}
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
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  {selectedTemplate.title}
                </DialogTitle>
                <DialogDescription>{selectedTemplate.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Template Image */}
                <div className="aspect-video relative overflow-hidden rounded-lg">
                  <img
                    src={selectedTemplate.image}
                    alt={selectedTemplate.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                        {categories.find(c => c.value === selectedTemplate.category)?.icon} {selectedTemplate.category}
                      </Badge>
                      <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(selectedTemplate.duration)}
                      </Badge>
                      <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                        {selectedTemplate.voiceType} voice
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Script Preview */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Script</Label>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedTemplate.script}</p>
                  </div>
                </div>

                {/* Template Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Duration</p>
                    <p className="text-sm font-semibold text-blue-900">{formatDuration(selectedTemplate.duration)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Voice Type</p>
                    <p className="text-sm font-semibold text-blue-900 capitalize">{selectedTemplate.voiceType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Category</p>
                    <p className="text-sm font-semibold text-blue-900 capitalize">{selectedTemplate.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Availability</p>
                    <p className="text-sm font-semibold text-blue-900">
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
                    className="flex-1"
                    onClick={() => handleUseTemplate(selectedTemplate)}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Use This Template
                  </Button>
                </div>

                <p className="text-xs text-center text-slate-500">
                  This template will be added to your announcements library and can be customized
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}