import React, { useState } from 'react';
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
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Bot,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface AIProvider {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'elevenlabs';
  apiKey: string;
  isActive: boolean;
  usage: {
    totalRequests: number;
    totalTokens: number;
    costUSD: number;
  };
  limits: {
    dailyRequests: number;
    monthlyBudget: number;
  };
  features: string[];
  createdAt: Date;
  lastUsed?: Date;
}

export function SuperAdminAI() {
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([
    {
      id: 'ai-1',
      name: 'OpenAI GPT-4',
      provider: 'openai',
      apiKey: 'sk-proj-xxxxxxxxxxxxxxxxxxxxx',
      isActive: true,
      usage: {
        totalRequests: 1250,
        totalTokens: 450000,
        costUSD: 12.50,
      },
      limits: {
        dailyRequests: 1000,
        monthlyBudget: 500,
      },
      features: ['Text Generation', 'Chat Completion', 'Embeddings'],
      createdAt: new Date('2025-01-01'),
      lastUsed: new Date(),
    },
    {
      id: 'ai-2',
      name: 'ElevenLabs TTS',
      provider: 'elevenlabs',
      apiKey: 'el_xxxxxxxxxxxxxxxxxxxxx',
      isActive: true,
      usage: {
        totalRequests: 850,
        totalTokens: 125000,
        costUSD: 8.50,
      },
      limits: {
        dailyRequests: 500,
        monthlyBudget: 200,
      },
      features: ['Text-to-Speech', 'Voice Cloning'],
      createdAt: new Date('2025-01-05'),
      lastUsed: new Date(),
    },
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai' as AIProvider['provider'],
    apiKey: '',
    dailyRequests: 1000,
    monthlyBudget: 500,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openai',
      apiKey: '',
      dailyRequests: 1000,
      monthlyBudget: 500,
    });
    setEditingProvider(null);
  };

  const handleCreateProvider = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a provider name');
      return;
    }

    if (!formData.apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    const newProvider: AIProvider = {
      id: `ai-${Date.now()}`,
      name: formData.name,
      provider: formData.provider,
      apiKey: formData.apiKey,
      isActive: true,
      usage: {
        totalRequests: 0,
        totalTokens: 0,
        costUSD: 0,
      },
      limits: {
        dailyRequests: formData.dailyRequests,
        monthlyBudget: formData.monthlyBudget,
      },
      features: getProviderFeatures(formData.provider),
      createdAt: new Date(),
    };

    setAiProviders([...aiProviders, newProvider]);
    toast.success('AI Provider added successfully');
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditProvider = (provider: AIProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      provider: provider.provider,
      apiKey: provider.apiKey,
      dailyRequests: provider.limits.dailyRequests,
      monthlyBudget: provider.limits.monthlyBudget,
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdateProvider = () => {
    if (!editingProvider) return;

    const updatedProvider: AIProvider = {
      ...editingProvider,
      name: formData.name,
      provider: formData.provider,
      apiKey: formData.apiKey,
      limits: {
        dailyRequests: formData.dailyRequests,
        monthlyBudget: formData.monthlyBudget,
      },
      features: getProviderFeatures(formData.provider),
    };

    setAiProviders(aiProviders.map(p => p.id === editingProvider.id ? updatedProvider : p));
    toast.success('AI Provider updated successfully');
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleDeleteProvider = (providerId: string) => {
    setAiProviders(aiProviders.filter(p => p.id !== providerId));
    toast.success('AI Provider deleted');
  };

  const handleToggleActive = (providerId: string) => {
    setAiProviders(aiProviders.map(p => 
      p.id === providerId ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API Key copied to clipboard');
  };

  const getProviderFeatures = (provider: AIProvider['provider']): string[] => {
    const features: Record<AIProvider['provider'], string[]> = {
      openai: ['Text Generation', 'Chat Completion', 'Embeddings', 'Image Generation'],
      anthropic: ['Claude Chat', 'Text Analysis', 'Code Generation'],
      google: ['Gemini AI', 'Translation', 'Vision AI'],
      elevenlabs: ['Text-to-Speech', 'Voice Cloning', 'Audio Generation'],
    };
    return features[provider];
  };

  const getProviderIcon = (provider: AIProvider['provider']) => {
    switch (provider) {
      case 'openai':
        return <Bot className="h-5 w-5" />;
      case 'anthropic':
        return <Sparkles className="h-5 w-5" />;
      case 'google':
        return <Zap className="h-5 w-5" />;
      case 'elevenlabs':
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const totalMonthlySpend = aiProviders.reduce((sum, p) => sum + p.usage.costUSD, 0);
  const totalRequests = aiProviders.reduce((sum, p) => sum + p.usage.totalRequests, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Configuration</h1>
          <p className="text-slate-500 mt-1">
            Manage AI providers, API keys, and activation codes
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add AI Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? 'Edit AI Provider' : 'Add AI Provider'}
              </DialogTitle>
              <DialogDescription>
                Configure AI provider credentials and limits
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Provider Name</Label>
                <Input
                  placeholder="e.g., OpenAI GPT-4 Production"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select 
                  value={formData.provider}
                  onValueChange={(value) => 
                    setFormData({ ...formData, provider: value as AIProvider['provider'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4, DALL-E)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="google">Google AI (Gemini)</SelectItem>
                    <SelectItem value="elevenlabs">ElevenLabs (TTS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key / Activation Code</Label>
                <Input
                  type="password"
                  placeholder="Enter API key or activation code"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  This key will be used to authenticate requests to the AI provider
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Daily Request Limit</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.dailyRequests}
                    onChange={(e) => 
                      setFormData({ ...formData, dailyRequests: parseInt(e.target.value) || 1000 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Monthly Budget (USD)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.monthlyBudget}
                    onChange={(e) => 
                      setFormData({ ...formData, monthlyBudget: parseInt(e.target.value) || 500 })
                    }
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Features Included:</p>
                <div className="flex flex-wrap gap-2">
                  {getProviderFeatures(formData.provider).map((feature) => (
                    <Badge key={feature} variant="outline" className="bg-white">
                      {feature}
                    </Badge>
                  ))}
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
              <Button onClick={editingProvider ? handleUpdateProvider : handleCreateProvider}>
                {editingProvider ? 'Update Provider' : 'Add Provider'}
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
                  {aiProviders.filter(p => p.isActive).length}
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
                <p className="text-sm text-slate-500">Total Requests</p>
                <p className="text-3xl font-bold mt-2">
                  {totalRequests.toLocaleString()}
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
                <p className="text-sm text-slate-500">Monthly Spend</p>
                <p className="text-3xl font-bold mt-2">
                  ${totalMonthlySpend.toFixed(2)}
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
      {aiProviders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No AI providers configured</h3>
            <p className="text-slate-500 mb-6">
              Add your first AI provider to enable AI features
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add AI Provider
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
                    <div className={`p-2 rounded-lg ${
                      provider.isActive ? 'bg-green-100' : 'bg-slate-100'
                    }`}>
                      {getProviderIcon(provider.provider)}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.name}
                        {provider.isActive ? (
                          <Badge className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="capitalize mt-1">
                        {provider.provider}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={provider.isActive}
                    onCheckedChange={() => handleToggleActive(provider.id)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showApiKey[provider.id] ? 'text' : 'password'}
                      value={provider.apiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey({
                        ...showApiKey,
                        [provider.id]: !showApiKey[provider.id],
                      })}
                    >
                      {showApiKey[provider.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyApiKey(provider.apiKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Requests</p>
                    <p className="text-lg font-bold">
                      {provider.usage.totalRequests.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Tokens</p>
                    <p className="text-lg font-bold">
                      {(provider.usage.totalTokens / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Cost</p>
                    <p className="text-lg font-bold">
                      ${provider.usage.costUSD.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Daily Limit</span>
                    <span className="font-medium">
                      {provider.limits.dailyRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Monthly Budget</span>
                    <span className="font-medium">
                      ${provider.limits.monthlyBudget.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Features</Label>
                  <div className="flex flex-wrap gap-2">
                    {provider.features.map((feature) => (
                      <Badge key={feature} variant="outline">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
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
                    onClick={() => handleDeleteProvider(provider.id)}
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
