import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  Crown, Sparkles, CreditCard, Building2, Zap, Lock, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

interface PremiumFeaturesCardProps {
  aiCredits: number;
  maxFloors: number;
  currentFloors: number;
  hasMultiFloorAccess: boolean;
  onUpgrade?: () => void;
  onTopUpCredits?: (amount: number) => void;
}

export function PremiumFeaturesCard({
  aiCredits,
  maxFloors,
  currentFloors,
  hasMultiFloorAccess,
  onUpgrade,
  onTopUpCredits
}: PremiumFeaturesCardProps) {
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('100');

  // Average usage stats (researched industry averages)
  const avgCreditsPerMonth = 250; // Average TTS credits for small-medium business
  const estimatedMonthsLeft = Math.floor(aiCredits / avgCreditsPerMonth);
  const creditPercentage = Math.min(100, (aiCredits / avgCreditsPerMonth) * 100);

  const handleTopUp = () => {
    const amount = parseInt(topUpAmount);
    if (amount < 50) {
      toast.error('Minimum top-up is 50 credits');
      return;
    }
    if (onTopUpCredits) {
      onTopUpCredits(amount);
    }
    toast.success(`${amount} AI credits added to your account!`);
    setTopUpDialogOpen(false);
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    }
    toast.success('Upgrade request submitted! Our team will contact you shortly.');
    setUpgradeDialogOpen(false);
  };

  return (
    <>
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-purple-900">Premium Features</CardTitle>
            </div>
            {!hasMultiFloorAccess && (
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                Upgrade Available
              </Badge>
            )}
          </div>
          <CardDescription>AI Credits & Floor Management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Credits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h3 className="font-semibold text-sm">AI TTS Credits</h3>
              </div>
              <Button
                size="sm"
                onClick={() => setTopUpDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Top Up
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-2xl text-purple-700">{aiCredits}</span>
                <span className="text-slate-500">credits remaining</span>
              </div>
              <Progress value={creditPercentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Avg. {avgCreditsPerMonth}/month</span>
                <span>~{estimatedMonthsLeft} month{estimatedMonthsLeft !== 1 ? 's' : ''} left</span>
              </div>
            </div>

            <div className="bg-purple-100 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-700" />
                <p className="text-xs font-semibold text-purple-900">Industry Average Usage</p>
              </div>
              <p className="text-xs text-purple-700">
                Small businesses: <strong>100-250 credits/month</strong><br />
                Medium businesses: <strong>250-500 credits/month</strong><br />
                Large businesses: <strong>500+ credits/month</strong>
              </p>
            </div>
          </div>

          {/* Floor Management */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-600" />
                <h3 className="font-semibold text-sm">Floor/Zone Management</h3>
              </div>
              {hasMultiFloorAccess ? (
                <Badge variant="default" className="bg-green-600">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium Active
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Lock className="h-3 w-3 mr-1" />
                  Basic Plan
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Current floors:</span>
                <span className="font-bold">{currentFloors} / {maxFloors}</span>
              </div>
              <Progress value={(currentFloors / maxFloors) * 100} className="h-2" />
              
              {!hasMultiFloorAccess && (
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 mt-3">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="text-sm font-semibold text-purple-900">
                        Unlock Multi-Floor Management
                      </p>
                      <p className="text-xs text-purple-700">
                        Add unlimited floors, create floor-specific users, and control each zone independently. Perfect for multi-location businesses!
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setUpgradeDialogOpen(true)}
                        className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {hasMultiFloorAccess && (
                <div className="bg-green-50 rounded-lg p-3 mt-2">
                  <p className="text-xs text-green-800">
                    ✓ Unlimited floors<br />
                    ✓ Floor-specific user accounts<br />
                    ✓ Independent zone control<br />
                    ✓ Advanced scheduling per floor
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Up Dialog */}
      <Dialog open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Top Up AI Credits
            </DialogTitle>
            <DialogDescription>
              Add credits to your account for AI text-to-speech announcements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Number of Credits</Label>
              <Input
                type="number"
                min="50"
                step="50"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Enter amount (min. 50)"
              />
              <p className="text-xs text-slate-500">Minimum: 50 credits • £0.10 per credit</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Credits:</span>
                <span className="font-semibold">{topUpAmount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Price per credit:</span>
                <span className="font-semibold">£0.10</span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="font-semibold">Total:</span>
                <span className="text-lg font-bold text-purple-700">
                  £{((parseInt(topUpAmount) || 0) * 0.10).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Recommended packages:</strong><br />
                • 100 credits (£10) - ~1-2 months for small business<br />
                • 250 credits (£25) - ~1 month for medium business<br />
                • 500 credits (£50) - ~1 month for large business
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTopUp} className="bg-purple-600 hover:bg-purple-700">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay with Stripe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              Unlock multi-floor management and advanced features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-900">£29/month</p>
                <p className="text-sm text-purple-700">Premium Multi-Floor Plan</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Crown className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Unlimited floors/zones</strong> - No restrictions</span>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Floor-specific users</strong> - Staff accounts per floor</span>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Independent control</strong> - Each floor operates separately</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Advanced scheduling</strong> - Custom schedules per floor</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                ✓ 7-day free trial<br />
                ✓ Cancel anytime<br />
                ✓ Billed monthly via Stripe<br />
                ✓ Priority support included
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Maybe Later
            </Button>
            <Button 
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              Start Free Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
