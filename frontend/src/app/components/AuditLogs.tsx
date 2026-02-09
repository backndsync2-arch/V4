import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { adminAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { FileText, Search, Filter, Calendar, User, Activity, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  user_id: string;
  user_email: string;
  user_name: string;
  client_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, any>;
  changes: Record<string, { before: any; after: any }> | null;
  status: 'success' | 'failure' | 'error';
  error_message: string | null;
  created_at: string;
}

export function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 50,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }
      if (actionFilter !== 'all') {
        params.action = actionFilter;
      }
      if (resourceTypeFilter !== 'all') {
        params.resource_type = resourceTypeFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateFrom) {
        params.start_date = dateFrom;
      }
      if (dateTo) {
        params.end_date = dateTo;
      }

      const response = await adminAPI.getAuditLogs(params);
      
      // Handle both array and paginated response
      if (Array.isArray(response)) {
        setLogs(response);
        setTotal(response.length);
        setTotalPages(1);
      } else if (response.results) {
        setLogs(response.results);
        setTotal(response.count || 0);
        setTotalPages(response.total_pages || 1);
      } else {
        setLogs([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (error: any) {
      console.error('Failed to load audit logs:', error);
      toast.error(error.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page]);

  const handleFilter = () => {
    setPage(1);
    loadLogs();
  };

  const handleReset = () => {
    setSearchQuery('');
    setActionFilter('all');
    setResourceTypeFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setTimeout(() => loadLogs(), 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Success</Badge>;
      case 'failure':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failure</Badge>;
      case 'error':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      update: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      delete: 'bg-red-500/20 text-red-400 border-red-500/30',
      login: 'bg-green-500/20 text-green-400 border-green-500/30',
      logout: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return (
      <Badge className={colors[action] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
        {action}
      </Badge>
    );
  };

  // Get unique actions and resource types for filters (from all logs, not just current page)
  // For now, we'll use a static list or fetch separately if needed
  const commonActions = ['create', 'update', 'delete', 'login', 'logout', 'view', 'upload', 'download'];
  const commonResourceTypes = ['user', 'client', 'music_file', 'announcement', 'schedule', 'zone', 'folder'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400 mt-1">
            Track all system activities and user actions
          </p>
        </div>
        <Button
          onClick={loadLogs}
          variant="outline"
          className="border-white/20 hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#1a1a1a] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#2a2a2a] border-white/10 text-white"
              />
            </div>

            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="bg-[#2a2a2a] border-white/10 text-white">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-white/10">
                <SelectItem value="all">All Actions</SelectItem>
                {commonActions.map((action) => (
                  <SelectItem key={action} value={action} className="text-white">
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Resource Type Filter */}
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="bg-[#2a2a2a] border-white/10 text-white">
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-white/10">
                <SelectItem value="all">All Resources</SelectItem>
                {commonResourceTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-white">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#2a2a2a] border-white/10 text-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-white/10">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success" className="text-white">Success</SelectItem>
                <SelectItem value="failure" className="text-white">Failure</SelectItem>
                <SelectItem value="error" className="text-white">Error</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[#2a2a2a] border-white/10 text-white"
            />

            {/* Date To */}
            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[#2a2a2a] border-white/10 text-white"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleFilter} className="bg-[#1db954] hover:bg-[#1ed760]">
              Apply Filters
            </Button>
            <Button onClick={handleReset} variant="outline" className="border-white/20 hover:bg-white/10">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card className="bg-[#1a1a1a] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Logs ({total})
          </CardTitle>
          <CardDescription className="text-gray-400">
            Showing {logs.length} of {total} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1db954]"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#2a2a2a] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusIcon(log.status)}
                        {getActionBadge(log.action)}
                        {getStatusBadge(log.status)}
                        <Badge variant="outline" className="border-white/20">
                          {log.resource_type}
                        </Badge>
                        <span className="text-gray-400 text-sm flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user_name} ({log.user_email})
                        </span>
                        <span className="text-gray-500 text-sm flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatRelativeTime(new Date(log.created_at))}
                        </span>
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-sm text-gray-400 mt-2">
                          <strong>Details:</strong>{' '}
                          <span className="font-mono text-xs">
                            {JSON.stringify(log.details, null, 2)}
                          </span>
                        </div>
                      )}

                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="text-sm text-gray-400 mt-2">
                          <strong>Changes:</strong>
                          <div className="mt-1 space-y-1">
                            {Object.entries(log.changes).map(([key, change]) => (
                              <div key={key} className="ml-4 font-mono text-xs">
                                <span className="text-red-400">{key}:</span>{' '}
                                <span className="text-gray-500">
                                  {JSON.stringify(change.before)}
                                </span>{' '}
                                →{' '}
                                <span className="text-green-400">
                                  {JSON.stringify(change.after)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {log.error_message && (
                        <div className="text-sm text-red-400 mt-2">
                          <strong>Error:</strong> {log.error_message}
                        </div>
                      )}

                      {log.ip_address && (
                        <div className="text-xs text-gray-500 mt-2">
                          IP: {log.ip_address}
                          {log.user_agent && ` • ${log.user_agent}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                className="border-white/20 hover:bg-white/10"
              >
                Previous
              </Button>
              <span className="text-gray-400">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
                className="border-white/20 hover:bg-white/10"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

