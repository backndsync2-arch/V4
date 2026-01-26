import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { 
  Sparkles, 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2,
  Copy,
  Bot,
  RefreshCcw,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { adminAPI } from '@/lib/api';

type AIProvider = {
  id: string;
  name: string;
  vendor: 'openai' | string;
  purpose: 'chat' | 'tts' | 'both' | string;
  is_active: boolean;
  has_api_key: boolean;
  api_key_last4: string;
  api_key_masked?: string;
  chat_model: string;
  chat_temperature: string | number;
  chat_max_output_tokens: number;
  tts_model: string;
  tts_voice: string;
  tts_format: string;
  tts_speed: string | number;
  daily_request_limit: number;
  monthly_budget_usd: string | number;
  is_default_chat: boolean;
  is_default_tts: boolean;
  created_at?: string;
  updated_at?: string;
};

export function SuperAdminAI() {
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    vendor: 'openai',
    purpose: 'both' as 'chat' | 'tts' | 'both',
    api_key: '',
    is_active: true,
    is_default_chat: false,
    is_default_tts: false,
    chat_model: 'gpt-4o-mini',
    chat_temperature: 0.7,
    chat_max_output_tokens: 1024,
    tts_model: 'gpt-4o-mini-tts',
    tts_voice: 'alloy',
    tts_format: 'mp3',
    tts_speed: 1.0,
    daily_request_limit: 1000,
    monthly_budget_usd: 500,
  });

  const unwrapResults = (data: any): AIProvider[] => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  };

  const resetForm = () => {
    setFormData({
      name: '',
      vendor: 'openai',
      purpose: 'both',
      api_key: '',
      is_active: true,
      is_default_chat: false,
      is_default_tts: false,
      chat_model: 'gpt-4o-mini',
      chat_temperature: 0.7,
      chat_max_output_tokens: 1024,
      tts_model: 'gpt-4o-mini-tts',
      tts_voice: 'alloy',
      tts_format: 'mp3',
      tts_speed: 1.0,
      daily_request_limit: 1000,
      monthly_budget_usd: 500,
    });
    setEditingProvider(null);
  };

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const resp = await adminAPI.getAIProviders();
      setAiProviders(unwrapResults(resp));
    } catch (e: any) {
      toast.error('Failed to load AI providers', { description: e?.message });
      setAiProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProviders();
  }, []);

  const handleEditProvider = (provider: AIProvider) => {
    setFormData({
      name: provider.name,
      vendor: provider.vendor,
      purpose: (provider.purpose as any) || 'both',
      api_key: '',
      is_active: provider.is_active,
      is_default_chat: provider.is_default_chat,
      is_default_tts: provider.is_default_tts,
      chat_model: provider.chat_model,
      chat_temperature: Number(provider.chat_temperature ?? 0.7),
      chat_max_output_tokens: provider.chat_max_output_tokens ?? 1024,
      tts_model: provider.tts_model,
      tts_voice: provider.tts_voice,
      tts_format: provider.tts_format,
      tts_speed: Number(provider.tts_speed ?? 1.0),
      daily_request_limit: provider.daily_request_limit ?? 1000,
      monthly_budget_usd: Number(provider.monthly_budget_usd ?? 500),
    });
    setEditingProvider(provider);
    setIsCreateDialogOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a provider name');
      return;
    }
    if (!editingProvider && !formData.api_key.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    const payload: any = {
      name: formData.name.trim(),
      vendor: formData.vendor,
      purpose: formData.purpose,
      is_active: formData.is_active,
      is_default_chat: formData.is_default_chat,
      is_default_tts: formData.is_default_tts,
      chat_model: formData.chat_model,
      chat_temperature: formData.chat_temperature,
      chat_max_output_tokens: formData.chat_max_output_tokens,
      tts_model: formData.tts_model,
      tts_voice: formData.tts_voice,
      tts_format: formData.tts_format,
      tts_speed: formData.tts_speed,
      daily_request_limit: formData.daily_request_limit,
      monthly_budget_usd: formData.monthly_budget_usd,
    };
    if (formData.api_key.trim()) payload.api_key = formData.api_key.trim();

    try {
      if (editingProvider) {
        await adminAPI.updateAIProvider(editingProvider.id, payload);
        toast.success('AI provider updated');
      } else {
        await adminAPI.createAIProvider(payload);
        toast.success('AI provider created');
      }
      setIsCreateDialogOpen(false);
      resetForm();
      await loadProviders();
    } catch (e: any) {
      toast.error('Failed to save provider', { description: e?.message });
    }
  };

  const handleDeleteProvider = async (provider: AIProvider) => {
    if (!window.confirm(`Delete "${provider.name}"?`)) return;
    try {
      await adminAPI.deleteAIProvider(provider.id);
      toast.success('AI provider deleted');
      await loadProviders();
    } catch (e: any) {
      toast.error('Failed to delete provider', { description: e?.message });
    }
  };

  const handleToggleActive = async (provider: AIProvider) => {
    try {
      await adminAPI.updateAIProvider(provider.id, { is_active: !provider.is_active });
      await loadProviders();
    } catch (e: any) {
      toast.error('Failed to update provider', { description: e?.message });
    }
  };

  const handleTestProvider = async (provider: AIProvider) => {
    try {
      const result = await adminAPI.testAIProvider(provider.id);
      if (result.ok) toast.success('Provider test succeeded');
      else toast.error('Provider test failed', { description: result.error });
    } catch (e: any) {
      toast.error('Provider test failed', { description: e?.message });
    }
  };

  const providerIcon = <Bot className="h-5 w-5" />;
  const defaultsSummary = useMemo(() => {
    const chat = aiProviders.find((p) => p.is_default_chat);
    const tts = aiProviders.find((p) => p.is_default_tts);
    return { chat, tts };
  }, [aiProviders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Configuration</h1>
          <p className="text-slate-500 mt-1">
            Configure OpenAI for ChatGPT (chat) and OpenAI TTS (text-to-speech)
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? 'Edit AI Provider' : 'Add AI Provider'}
              </DialogTitle>
              <DialogDescription>
                API keys are stored encrypted in the backend. The UI only shows masked/last4.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Provider Name</Label>
                <Input
                  placeholder="e.g., OpenAI Chat + TTS (Production)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input value="OpenAI" readOnly />
              </div>

              <div className="space-y-2">
                <Label>{editingProvider ? 'New API key (optional)' : 'API key'}</Label>
                <Input
                  type="password"
                  placeholder={editingProvider ? 'Leave blank to keep existing key' : 'sk-...'}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  The backend stores this encrypted and never returns it in plaintext.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Select
                    value={formData.purpose}
                    onValueChange={(value) => setFormData({ ...formData, purpose: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat">Chat (ChatGPT)</SelectItem>
                      <SelectItem value="tts">Text-to-Speech (OpenAI)</SelectItem>
                      <SelectItem value="both">Chat + TTS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Active</Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm text-slate-600">
                      {formData.is_active ? 'Enabled' : 'Disabled'}
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default for Chat</Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm text-slate-600">Use for ChatGPT chat requests</div>
                    <Switch
                      checked={formData.is_default_chat}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default_chat: checked })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default for TTS</Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm text-slate-600">Use for OpenAI text-to-speech</div>
                    <Switch
                      checked={formData.is_default_tts}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default_tts: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Chat settings */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <p className="font-semibold">ChatGPT (Chat) defaults</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={formData.chat_model}
                      onChange={(e) => setFormData({ ...formData, chat_model: e.target.value })}
                      placeholder="gpt-4o-mini"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.chat_temperature}
                      onChange={(e) =>
                        setFormData({ ...formData, chat_temperature: parseFloat(e.target.value || '0.7') })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Max output tokens</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.chat_max_output_tokens}
                      onChange={(e) =>
                        setFormData({ ...formData, chat_max_output_tokens: parseInt(e.target.value || '1024', 10) })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* TTS settings */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" />
                  <p className="font-semibold">OpenAI TTS defaults</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={formData.tts_model}
                      onChange={(e) => setFormData({ ...formData, tts_model: e.target.value })}
                      placeholder="gpt-4o-mini-tts"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Voice</Label>
                    <Select
                      value={formData.tts_voice}
                      onValueChange={(v) => setFormData({ ...formData, tts_voice: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">alloy</SelectItem>
                        <SelectItem value="ash">ash</SelectItem>
                        <SelectItem value="coral">coral</SelectItem>
                        <SelectItem value="sage">sage</SelectItem>
                        <SelectItem value="verse">verse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select
                      value={formData.tts_format}
                      onValueChange={(v) => setFormData({ ...formData, tts_format: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp3">mp3</SelectItem>
                        <SelectItem value="wav">wav</SelectItem>
                        <SelectItem value="opus">opus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Speed</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.25"
                      max="4"
                      value={formData.tts_speed}
                      onChange={(e) =>
                        setFormData({ ...formData, tts_speed: parseFloat(e.target.value || '1.0') })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Soft limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Daily request limit (soft)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.daily_request_limit}
                    onChange={(e) => 
                      setFormData({ ...formData, daily_request_limit: parseInt(e.target.value) || 1000 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Monthly budget (USD, soft)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.monthly_budget_usd}
                    onChange={(e) => 
                      setFormData({ ...formData, monthly_budget_usd: parseInt(e.target.value) || 500 })
                    }
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border rounded-lg">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Security notes</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Keep OpenAI API keys server-side. Never paste secrets into end-user browsers in production.
                      This UI stores keys encrypted in the backend.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveProvider}>
                {editingProvider ? 'Save changes' : 'Create provider'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Providers</p>
                <p className="text-3xl font-bold mt-2">
                  {aiProviders.filter(p => p.is_active).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Default Chat</p>
                <p className="text-lg font-bold mt-2 truncate">
                  {defaultsSummary.chat?.name || 'Not set'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Default TTS</p>
                <p className="text-lg font-bold mt-2 truncate">
                  {defaultsSummary.tts?.name || 'Not set'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <Key className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Providers List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">Loading providers…</CardContent>
        </Card>
      ) : aiProviders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No AI providers configured</h3>
            <p className="text-slate-500 mb-6">
              Add an OpenAI provider to enable ChatGPT chat and OpenAI TTS.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add provider
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {aiProviders.map((provider) => (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${provider.is_active ? 'bg-green-100' : 'bg-slate-100'}`}>
                      {providerIcon}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.name}
                        {provider.is_active ? (
                          <Badge className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {provider.is_default_chat && <Badge variant="outline">Default Chat</Badge>}
                        {provider.is_default_tts && <Badge variant="outline">Default TTS</Badge>}
                      </CardTitle>
                      <CardDescription className="capitalize mt-1">
                        {provider.vendor} • {provider.purpose}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={provider.is_active}
                    onCheckedChange={() => handleToggleActive(provider)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">API key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={provider.has_api_key ? `••••••••••••••••••••${provider.api_key_last4}` : ''}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const v = provider.api_key_last4 ? provider.api_key_last4 : '';
                        navigator.clipboard.writeText(v);
                        toast.success('Copied last4');
                      }}
                      disabled={!provider.has_api_key}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {provider.has_api_key ? 'Key stored encrypted in backend' : 'No key set'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Daily Limit</span>
                    <span className="font-medium">
                      {provider.daily_request_limit?.toLocaleString?.() ?? provider.daily_request_limit} requests
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Monthly Budget</span>
                    <span className="font-medium">
                      ${Number(provider.monthly_budget_usd ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Defaults</Label>
                  <p className="text-sm text-slate-600">
                    Chat: <span className="font-mono">{provider.chat_model}</span> • TTS:{' '}
                    <span className="font-mono">{provider.tts_model}</span> ({provider.tts_voice})
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestProvider(provider)}
                    className="flex-1"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProvider(provider)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProvider(provider)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
