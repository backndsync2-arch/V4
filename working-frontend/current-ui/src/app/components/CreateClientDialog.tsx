import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { CreditCard, User, Building2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { adminAPI } from '@/lib/api';

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: any) => void;
}

export function CreateClientDialog({ open, onOpenChange, onClientCreated }: CreateClientDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    telephone: '',
    description: '',
    trialDays: '14',
    subscriptionPrice: '49.99',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter a contact name');
      return;
    }
    if (!formData.businessName.trim()) {
      toast.error('Please enter a business name');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    if (!formData.telephone.trim()) {
      toast.error('Please enter a telephone number');
      return;
    }

    const trialDaysNum = parseInt(formData.trialDays) || 0;
    const priceNum = parseFloat(formData.subscriptionPrice) || 0;

    try {
      // Prefer real backend creation (admin only). Backend expects `name` as the client/business name.
      const created = await adminAPI.createClient({
        name: formData.businessName.trim(),
        business_name: formData.businessName.trim(),
        email: formData.email.trim(),
        telephone: formData.telephone.trim(),
        description: formData.description?.trim() || '',
        trial_days: trialDaysNum,
        subscription_price: priceNum,
        subscription_tier: 'basic',
        subscription_status: 'active',
        is_active: true,
      } as any);

      onClientCreated(created);
      toast.success(`Client "${formData.businessName}" created successfully`);
    } catch (e: any) {
      // Fallback to local-only creation in demo mode / if backend not available.
      const newClient = {
        id: `client_${Date.now()}`,
        name: formData.name,
        businessName: formData.businessName,
        email: formData.email,
        telephone: formData.telephone,
        description: formData.description,
        status: trialDaysNum > 0 ? 'trial' : 'active',
        trialDays: trialDaysNum,
        trialEndsAt: trialDaysNum > 0 ? new Date(Date.now() + trialDaysNum * 24 * 60 * 60 * 1000) : undefined,
        subscriptionPrice: priceNum,
        subscriptionStatus: trialDaysNum > 0 ? 'active' : 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onClientCreated(newClient);
      toast.success(`Client "${formData.name}" created locally (demo mode)`, { description: e?.message });
    }
    
    // Reset form
    setFormData({
      name: '',
      businessName: '',
      email: '',
      telephone: '',
      description: '',
      trialDays: '14',
      subscriptionPrice: '49.99',
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Client Account</DialogTitle>
          <DialogDescription>
            Enter client details and subscription information. Stripe integration will handle payments automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <User className="h-4 w-4 text-slate-500" />
              <h3 className="font-semibold">Contact Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Contact Name *</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone Number *</Label>
              <Input
                id="telephone"
                type="tel"
                placeholder="+44 20 1234 5678"
                value={formData.telephone}
                onChange={(e) => handleChange('telephone', e.target.value)}
              />
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Building2 className="h-4 w-4 text-slate-500" />
              <h3 className="font-semibold">Business Information</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                placeholder="Coffee Shop Ltd"
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the business type, industry, or specific requirements..."
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>
          </div>

          {/* Subscription & Billing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <CreditCard className="h-4 w-4 text-slate-500" />
              <h3 className="font-semibold">Subscription & Billing</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trialDays">Free Trial Period</Label>
                <Select value={formData.trialDays} onValueChange={(val) => handleChange('trialDays', val)}>
                  <SelectTrigger id="trialDays">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Trial</SelectItem>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                  </SelectContent>
                </Select>
                {parseInt(formData.trialDays) > 0 && (
                  <p className="text-xs text-slate-500">
                    Trial ends: {new Date(Date.now() + parseInt(formData.trialDays) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscriptionPrice">Monthly Subscription (£)</Label>
                <Input
                  id="subscriptionPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="49.99"
                  value={formData.subscriptionPrice}
                  onChange={(e) => handleChange('subscriptionPrice', e.target.value)}
                />
              </div>
            </div>

            {/* Stripe Integration Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Stripe Payment Integration</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Once created, the client will receive an email to set up their payment method via Stripe. 
                    Monthly billing will begin after the trial period ends.
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      Backend Integration Required
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Client Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
