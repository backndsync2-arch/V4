import React from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Search, List, Grid } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface AnnouncementsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterEnabled: 'all' | 'enabled' | 'disabled';
  onFilterChange: (filter: 'all' | 'enabled' | 'disabled') => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

export function AnnouncementsToolbar({
  searchQuery,
  onSearchChange,
  filterEnabled,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: AnnouncementsToolbarProps) {
  return (
    <Card className="border-white/10 shadow-lg bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <Input
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-white/5 backdrop-blur-sm border-white/20 focus:border-[#1db954] focus:ring-[#1db954]/20 shadow-sm text-white placeholder:text-gray-500"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterEnabled} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[130px] bg-white/5 backdrop-blur-sm border-white/20 shadow-sm text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">All</SelectItem>
                <SelectItem value="enabled" className="text-white hover:bg-white/10">Enabled</SelectItem>
                <SelectItem value="disabled" className="text-white hover:bg-white/10">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-white/20 rounded-lg overflow-hidden shadow-sm bg-white/5 backdrop-blur-sm">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className={cn(
                  "rounded-none text-white",
                  viewMode === 'list' && "bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954]"
                )}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className={cn(
                  "rounded-none text-white",
                  viewMode === 'grid' && "bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954]"
                )}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

