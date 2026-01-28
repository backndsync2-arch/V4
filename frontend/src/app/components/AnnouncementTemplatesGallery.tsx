import React, { useState } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import { type AnnouncementTemplateFolder, type AnnouncementTemplate } from '@/lib/mockData';
import { Sparkles, Play, ChevronLeft, ChevronRight, Clock, Volume2, FolderOpen, FileText, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { formatDuration } from '@/lib/utils';
import { announcementsAPI } from '@/lib/api';
import { useEffect } from 'react';

interface AnnouncementTemplatesGalleryProps {
  onUseTemplate?: (template: AnnouncementTemplate, folderInfo?: { name: string; image?: string }) => void;
  onAnnouncementsCreated?: () => void; // Callback to refresh announcements list
}

export function AnnouncementTemplatesGallery({ onUseTemplate, onAnnouncementsCreated }: AnnouncementTemplatesGalleryProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<AnnouncementTemplateFolder | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplates, setGeneratedTemplates] = useState<Array<{
    title: string;
    description: string;
    script: string;
    category: string;
    duration: number;
    voiceType: string;
  }>>([]);
  const [selectedGeneratedTemplateIds, setSelectedGeneratedTemplateIds] = useState<number[]>([]);
  const [isVoiceSelectionOpen, setIsVoiceSelectionOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string; language: string }>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isCreatingAnnouncements, setIsCreatingAnnouncements] = useState(false);
  const [generateCategory, setGenerateCategory] = useState<string>('general');
  const [useCustomCategory, setUseCustomCategory] = useState<boolean>(false);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [generateQuantity, setGenerateQuantity] = useState<string>('5');
  const [generateTone, setGenerateTone] = useState<string>('friendly');
  const [folders, setFolders] = useState<AnnouncementTemplateFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  
  const isAdmin = user?.role === 'admin';

  // Load template folders from backend
  useEffect(() => {
    const loadFolders = async () => {
      try {
        setIsLoadingFolders(true);
        const category = selectedCategory === 'all' ? undefined : selectedCategory;
        const backendFolders = await announcementsAPI.getTemplateFolders(category);
        
        // Convert backend format to frontend format
        const convertedFolders: AnnouncementTemplateFolder[] = backendFolders.map(folder => ({
          id: folder.id,
          name: folder.name,
          description: folder.description,
          category: folder.category as any,
          image: folder.image_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop',
          templates: folder.templates.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            category: t.category as any,
            image: folder.image_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop',
            script: t.script,
            duration: t.duration,
            voiceType: (t.voice_type || t.voiceType || 'friendly') as any,
            availableFor: 'all' as const,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            active: t.active,
          })),
          availableFor: 'all' as const,
          active: folder.active,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        
        setFolders(convertedFolders);
      } catch (error: any) {
        console.error('Failed to load template folders:', error);
        toast.error('Failed to load templates');
        setFolders([]);
      } finally {
        setIsLoadingFolders(false);
      }
    };
    
    loadFolders();
  }, [selectedCategory]);

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

  const handlePreview = (folder: AnnouncementTemplateFolder) => {
    setSelectedFolder(folder);
    setSelectedTemplateIds([]);
    setIsPreviewOpen(true);
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const selectAllTemplates = () => {
    if (selectedFolder) {
      setSelectedTemplateIds(selectedFolder.templates.map(t => t.id));
    }
  };

  const deselectAllTemplates = () => {
    setSelectedTemplateIds([]);
  };

  const handleUseSelectedTemplates = async () => {
    if (!selectedFolder || !onUseTemplate) return;
    
    const selectedTemplates = selectedFolder.templates.filter(t => 
      selectedTemplateIds.includes(t.id)
    );

    if (selectedTemplates.length === 0) {
      toast.error('Please select at least one announcement');
      return;
    }

    try {
      // Process templates sequentially to avoid overwhelming the API
      let successCount = 0;
      let errorCount = 0;
      
      // Pass folder information with each template
      const folderInfo = {
        name: selectedFolder.name,
        image: selectedFolder.image,
      };
      
      for (const template of selectedTemplates) {
        try {
          await onUseTemplate(template, folderInfo);
          successCount++;
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to create announcement from template ${template.title}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} announcement${successCount > 1 ? 's' : ''} to your library${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      } else {
        toast.error(`Failed to add announcements. Please try again.`);
      }
      
      setIsPreviewOpen(false);
      setSelectedTemplateIds([]);
    } catch (error) {
      console.error('Error adding templates to library:', error);
      toast.error('An error occurred while adding templates. Please try again.');
    }
  };

  const getTotalDuration = (folder: AnnouncementTemplateFolder) => {
    return folder.templates.reduce((sum, t) => sum + t.duration, 0);
  };

  // Load voices when voice selection dialog opens
  const loadVoices = async () => {
    if (availableVoices.length > 0) return; // Already loaded
    setIsLoadingVoices(true);
    try {
      const voices = await announcementsAPI.getTTSVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !selectedVoice) {
        setSelectedVoice(voices[0].id);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      toast.error('Failed to load voices');
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleUseSelectedGeneratedTemplates = async () => {
    if (selectedGeneratedTemplateIds.length === 0) {
      toast.error('Please select at least one template');
      return;
    }
    
    // Open voice selection dialog
    await loadVoices();
    setIsVoiceSelectionOpen(true);
  };

  const handleConfirmVoiceAndSave = async () => {
    if (!selectedVoice) {
      toast.error('Please select a voice');
      return;
    }

    setIsVoiceSelectionOpen(false);
    setIsCreatingAnnouncements(true);
    
    const selectedTemplates = generatedTemplates.filter((_, index) => 
      selectedGeneratedTemplateIds.includes(index)
    );

    if (selectedTemplates.length === 0) {
      toast.error('No templates selected');
      setIsCreatingAnnouncements(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const template of selectedTemplates) {
      try {
        await announcementsAPI.createTTSAnnouncement({
          title: template.title,
          text: template.script,
          voice: selectedVoice,
          folder_id: undefined,
        });
        
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to create announcement from template "${template.title}":`, error);
        errorCount++;
        toast.error(`Failed to add "${template.title}"`);
      }
    }

    if (successCount > 0) {
      toast.success(`Added ${successCount} announcement${successCount > 1 ? 's' : ''} to your library.`);
      // Clear selections
      setSelectedGeneratedTemplateIds([]);
      // Reload announcements if callback is available
      if (onAnnouncementsCreated) {
        onAnnouncementsCreated();
      }
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} announcement${errorCount > 1 ? 's' : ''} failed to add.`);
    }
    
    setIsCreatingAnnouncements(false);
  };

  const handleToggleGeneratedTemplate = (index: number) => {
    if (selectedGeneratedTemplateIds.includes(index)) {
      setSelectedGeneratedTemplateIds(selectedGeneratedTemplateIds.filter(i => i !== index));
    } else {
      setSelectedGeneratedTemplateIds([...selectedGeneratedTemplateIds, index]);
    }
  };


  // Show generated templates if available
  // Handle custom categories (they start with "custom-")
  const showGeneratedTemplates = generatedTemplates.length > 0 && (
    selectedCategory === generateCategory || 
    (generateCategory.startsWith('custom-') && selectedCategory === generateCategory)
  );

  if (isLoadingFolders) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-400">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (folders.length === 0 && !showGeneratedTemplates) return null;

  return (
    <>
      <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#1db954] to-[#1ed760] flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Ready-Made Announcements</h3>
                  <p className="text-sm text-gray-400">Professional template packs by sync2gear</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {/* Generate Templates Button */}
                <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Wand2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Generate Templates</span>
                      <span className="sm:hidden">Generate</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Generate AI Templates</DialogTitle>
                      <DialogDescription>
                        Create custom announcement templates using AI. Specify how many you want and the category.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Category</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="useCustomCategory"
                              checked={useCustomCategory}
                              onChange={(e) => {
                                setUseCustomCategory(e.target.checked);
                                if (!e.target.checked) {
                                  setCustomCategory('');
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            <Label htmlFor="useCustomCategory" className="text-xs font-normal cursor-pointer">
                              Custom category
                            </Label>
                          </div>
                        </div>
                        {useCustomCategory ? (
                          <Input
                            placeholder="e.g., Coffee Shop, Hotel, Spa..."
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                          />
                        ) : (
                          <Select value={generateCategory} onValueChange={setGenerateCategory}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.filter(c => c.value !== 'all').map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.icon} {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {useCustomCategory && (
                          <p className="text-xs text-gray-400">Enter your custom category name</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={generateQuantity}
                          onChange={(e) => setGenerateQuantity(e.target.value)}
                          placeholder="5"
                        />
                        <p className="text-xs text-gray-400">Number of templates to generate (1-50)</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tone</Label>
                        <Select value={generateTone} onValueChange={setGenerateTone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="energetic">Energetic</SelectItem>
                            <SelectItem value="calm">Calm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={async () => {
                          const quantity = parseInt(generateQuantity) || 5;
                          if (quantity < 1 || quantity > 50) {
                            toast.error('Quantity must be between 1 and 50');
                            return;
                          }
                          
                          if (useCustomCategory && !customCategory.trim()) {
                            toast.error('Please enter a custom category name');
                            return;
                          }
                          
                          setIsGenerating(true);
                          try {
                            const categoryToUse = useCustomCategory ? customCategory.trim().toLowerCase().replace(/\s+/g, '-') : generateCategory;
                            
                            const result = await announcementsAPI.generateTemplates({
                              category: categoryToUse as any,
                              quantity,
                              tone: generateTone as any,
                            });
                            
                            setGeneratedTemplates(result.templates);
                            toast.success(`Generated ${result.count} templates!`);
                            setIsGenerateDialogOpen(false);
                            // Show generated templates by setting category to a custom identifier
                            setSelectedCategory(useCustomCategory ? `custom-${categoryToUse}` : generateCategory);
                            // Store custom category for display
                            if (useCustomCategory) {
                              setGenerateCategory(`custom-${categoryToUse}`);
                            }
                          } catch (error: any) {
                            toast.error(error?.message || 'Failed to generate templates');
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                        disabled={isGenerating || (useCustomCategory && !customCategory.trim())}
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        {isGenerating ? 'Generating...' : `Generate ${generateQuantity} Templates`}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
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
            </div>

            {/* Folders Carousel */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-lg shadow-lg bg-white/10 hidden sm:flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div
                id="templates-scroll"
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent px-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                {folders.map((folder) => (
                  <Card
                    key={folder.id}
                    className="flex-shrink-0 w-[280px] overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handlePreview(folder)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={folder.image}
                        alt={folder.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-white/10 backdrop-blur-sm">
                          {categories.find(c => c.value === folder.category)?.icon} {folder.category}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-lg h-8 w-8 p-0 bg-white/10 backdrop-blur-sm hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(folder);
                          }}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold truncate text-white">{folder.name}</h4>
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1">{folder.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {folder.templates.length} announcements
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(getTotalDuration(folder))}
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
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-lg shadow-lg bg-white/10 hidden sm:flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center text-sm text-gray-400">
              Showing {folders.length} pack{folders.length !== 1 ? 's' : ''} in {selectedCategory === 'all' ? 'all categories' : categories.find(c => c.value === selectedCategory)?.label}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Folder Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
          {selectedFolder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <FolderOpen className="h-5 w-5 text-[#1db954]" />
                  {selectedFolder.name}
                </DialogTitle>
                <DialogDescription className="text-gray-400">{selectedFolder.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 flex-1 overflow-y-auto">
                {/* Folder Image */}
                <div className="aspect-video relative overflow-hidden rounded-lg">
                  <img
                    src={selectedFolder.image}
                    alt={selectedFolder.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="bg-white/10 backdrop-blur-sm">
                        {categories.find(c => c.value === selectedFolder.category)?.icon} {selectedFolder.category}
                      </Badge>
                      <Badge variant="outline" className="bg-white/10 backdrop-blur-sm">
                        <FileText className="h-3 w-3 mr-1" />
                        {selectedFolder.templates.length} announcements
                      </Badge>
                      <Badge variant="outline" className="bg-white/10 backdrop-blur-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(getTotalDuration(selectedFolder))} total
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Selection Controls */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 rounded-lg border border-[#1db954]/30">
                  <p className="text-sm font-medium text-[#1db954]">
                    {selectedTemplateIds.length > 0 
                      ? `${selectedTemplateIds.length} of ${selectedFolder.templates.length} selected`
                      : 'Select announcements to add to your library'
                    }
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllTemplates}
                      disabled={selectedTemplateIds.length === selectedFolder.templates.length}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAllTemplates}
                      disabled={selectedTemplateIds.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Templates List */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-white">Announcements in this pack:</Label>
                  {selectedFolder.templates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`overflow-hidden cursor-pointer transition-all ${
                        selectedTemplateIds.includes(template.id) 
                          ? 'ring-2 ring-[#1db954] bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10' 
                          : 'hover:bg-white/5'
                      }`}
                      onClick={() => toggleTemplateSelection(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedTemplateIds.includes(template.id)}
                            onCheckedChange={() => toggleTemplateSelection(template.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-white">{template.title}</h4>
                                <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.info(`Playing preview: ${template.title}`);
                                }}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDuration(template.duration)}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {template.voiceType}
                              </Badge>
                            </div>
                            <div className="mt-2 p-2 bg-white/5 rounded text-xs text-gray-300 leading-relaxed">
                              {template.script}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-4 space-y-3 flex-shrink-0">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleUseSelectedTemplates}
                  disabled={selectedTemplateIds.length === 0}
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Add Selected to Library ({selectedTemplateIds.length})
                </Button>
                <p className="text-xs text-center text-gray-400">
                  Selected announcements will be added to your library and can be customized
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Generated Templates Section */}
      {showGeneratedTemplates && (
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10 mt-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">AI-Generated Templates</h3>
                    <p className="text-sm text-gray-400">
                      {generatedTemplates.length} templates generated for {
                        generateCategory.startsWith('custom-') 
                          ? generateCategory.replace('custom-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : categories.find(c => c.value === generateCategory)?.label || generateCategory
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGeneratedTemplates([])}
                >
                  Clear
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedTemplates.map((template, index) => {
                  const isSelected = selectedGeneratedTemplateIds.includes(index);
                  return (
                    <Card 
                      key={index} 
                      className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => handleToggleGeneratedTemplate(index)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm text-white">{template.title}</h4>
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                            </div>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleGeneratedTemplate(index)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDuration(template.duration)}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {template.voiceType}
                            </Badge>
                          </div>
                          <div className="p-2 bg-white/5 rounded text-xs text-gray-300 leading-relaxed line-clamp-3">
                            {template.script}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Action buttons */}
              {generatedTemplates.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                      {selectedGeneratedTemplateIds.length} of {generatedTemplates.length} selected
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedGeneratedTemplateIds.length === generatedTemplates.length) {
                          setSelectedGeneratedTemplateIds([]);
                        } else {
                          setSelectedGeneratedTemplateIds(generatedTemplates.map((_, i) => i));
                        }
                      }}
                    >
                      {selectedGeneratedTemplateIds.length === generatedTemplates.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleUseSelectedGeneratedTemplates}
                    disabled={selectedGeneratedTemplateIds.length === 0 || isCreatingAnnouncements}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    {isCreatingAnnouncements 
                      ? 'Creating...' 
                      : `Use Selected Templates (${selectedGeneratedTemplateIds.length})`
                    }
                  </Button>
                  <p className="text-xs text-center text-gray-400">
                    Selected templates will be converted to announcements with your chosen voice
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Selection Dialog */}
      <Dialog open={isVoiceSelectionOpen} onOpenChange={setIsVoiceSelectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Voice</DialogTitle>
            <DialogDescription>
              Choose a voice for your selected announcements. You can preview voices before selecting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingVoices ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading voices...</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVoices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name || voice.id} {voice.language ? `(${voice.language})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      try {
                        const result = await announcementsAPI.previewVoice({
                          text: 'Hello, this is a preview of the selected voice.',
                          voice: selectedVoice,
                        });
                        if (result.preview_url) {
                          const audio = new Audio(result.preview_url);
                          await audio.play();
                          toast.success('Playing voice preview...');
                        }
                      } catch (error) {
                        console.error('Preview error:', error);
                        toast.error('Failed to preview voice');
                      }
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleConfirmVoiceAndSave}
                    disabled={!selectedVoice || isCreatingAnnouncements}
                  >
                    {isCreatingAnnouncements ? 'Creating...' : 'Confirm & Create'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
