import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Phone, Mail, LogIn, CheckCircle2, Music, Radio, Calendar, Building2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from '@/assets/77e47cfb36e9b1e5ffd3ce20b4f723cd8ab924e0.png';

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToCancellation?: () => void;
}

export function LandingPage({ onNavigateToLogin, onNavigateToTerms, onNavigateToPrivacy, onNavigateToCancellation }: LandingPageProps) {
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    telephone: '',
    message: '',
  });

  const handleCallbackSubmit = () => {
    if (!formData.businessName || !formData.contactName || !formData.email || !formData.telephone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // In production: Send to backend API
    toast.success('Thank you! Our team will call you within 24 hours.', {
      description: `We'll contact ${formData.contactName} at ${formData.telephone}`,
    });
    
    setCallbackDialogOpen(false);
    setFormData({
      businessName: '',
      contactName: '',
      email: '',
      telephone: '',
      message: '',
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImage} alt="sync2gear" className="h-12 w-12" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">sync2gear</h1>
                  <p className="text-xs text-slate-500">Music & Announcements Platform</p>
                </div>
              </div>
              <Button onClick={onNavigateToLogin} variant="outline" className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <img src={logoImage} alt="sync2gear" className="h-24 w-24 md:h-32 md:w-32" />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-4">
              Transform Your Business<br />Through Audio Management
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
              Scientifically proven audio solutions that boost employee wellbeing, enhance customer experience, 
              and increase workplace productivity. Professional music and announcement systems designed for 
              modern businesses.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-slate-700">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Improve Staff Wellbeing
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Boost Performance
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                Enhance Customer Experience
              </div>
            </div>
          </div>

          {/* Business Solutions - Key Benefits */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-center mb-8">The Business Impact of Professional Audio</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                <CardContent className="pt-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Health & Wellbeing</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Reduce workplace stress by up to 65% with curated ambient music. Improve mental wellbeing 
                    and create a calmer environment that employees actually enjoy working in.
                  </p>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-xs text-green-700 font-semibold">
                      ✓ Lower stress levels<br />
                      ✓ Better mood & morale<br />
                      ✓ Reduced sick days
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="pt-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Performance & Productivity</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Increase employee productivity by 20% with the right audio environment. Background music 
                    helps teams focus, work faster, and maintain energy throughout the day.
                  </p>
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold">
                      ✓ 20% productivity boost<br />
                      ✓ Enhanced focus<br />
                      ✓ Higher work quality
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                <CardContent className="pt-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Customer Experience</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Customers stay 30% longer in stores with optimized audio. Create the perfect atmosphere 
                    to increase dwell time, improve brand perception, and drive sales.
                  </p>
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <p className="text-xs text-purple-700 font-semibold">
                      ✓ 30% longer dwell time<br />
                      ✓ Improved brand image<br />
                      ✓ Increased sales conversion
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Key Features */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center mb-8">Complete Audio Management Solution</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-slate-200 bg-white/80 backdrop-blur hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <Music className="h-10 w-10 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">Smart Music Library</h3>
                  <p className="text-sm text-slate-600">
                    Curated playlists proven to enhance wellbeing and productivity across multiple zones
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/80 backdrop-blur hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <Radio className="h-10 w-10 text-orange-600 mb-3" />
                  <h3 className="font-semibold mb-2">AI-Powered Announcements</h3>
                  <p className="text-sm text-slate-600">
                    Professional text-to-speech for safety messages, promotions, and staff communication
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/80 backdrop-blur hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <Calendar className="h-10 w-10 text-purple-600 mb-3" />
                  <h3 className="font-semibold mb-2">Intelligent Scheduling</h3>
                  <p className="text-sm text-slate-600">
                    Automated scheduling that adapts to business hours, peak times, and quiet periods
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/80 backdrop-blur hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <Building2 className="h-10 w-10 text-green-600 mb-3" />
                  <h3 className="font-semibold mb-2">Multi-Location Control</h3>
                  <p className="text-sm text-slate-600">
                    Manage unlimited locations with independent control and centralized management
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Call to Action Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Call Us */}
            <Card className="border-blue-300 bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Phone className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-center">Call Us</CardTitle>
                <CardDescription className="text-center">
                  Speak with our team directly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <a 
                    href="tel:+442012345678" 
                    className="text-2xl font-bold text-blue-600 hover:text-blue-700"
                  >
                    +44 20 1234 5678
                  </a>
                  <p className="text-xs text-slate-500 mt-1">Mon-Fri, 9am-6pm GMT</p>
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.location.href = 'tel:+442012345678'}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </Button>
              </CardContent>
            </Card>

            {/* Request Callback */}
            <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-white hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <CardTitle className="text-center">Request Callback</CardTitle>
                <CardDescription className="text-center">
                  We'll call you back within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Free consultation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Custom pricing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    7-day free trial
                  </li>
                </ul>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => setCallbackDialogOpen(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Request Callback
                </Button>
              </CardContent>
            </Card>

            {/* Existing Customer */}
            <Card className="border-green-300 bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <LogIn className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-center">Existing Customer</CardTitle>
                <CardDescription className="text-center">
                  Sign in to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Access dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Manage content
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Control zones
                  </li>
                </ul>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={onNavigateToLogin}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <p className="text-sm text-slate-500 mb-4">Trusted by businesses across the UK</p>
            <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
              <div className="text-slate-400 font-semibold">Retail Chains</div>
              <div className="text-slate-400 font-semibold">Coffee Shops</div>
              <div className="text-slate-400 font-semibold">Gyms & Spas</div>
              <div className="text-slate-400 font-semibold">Corporate Offices</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-sm text-slate-500">
              <p>© 2025 sync2gear. All rights reserved.</p>
              <p className="mt-1">Professional music and announcement management for businesses.</p>
              <div className="flex items-center justify-center gap-4 mt-4">
                {onNavigateToTerms && (
                  <button
                    onClick={onNavigateToTerms}
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Terms & Conditions
                  </button>
                )}
                {onNavigateToPrivacy && (
                  <button
                    onClick={onNavigateToPrivacy}
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Privacy Policy
                  </button>
                )}
                {onNavigateToCancellation && (
                  <button
                    onClick={onNavigateToCancellation}
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Cancellation Policy
                  </button>
                )}
                <span className="text-slate-300">|</span>
                <a href="mailto:support@sync2gear.com" className="text-blue-600 hover:text-blue-700 hover:underline">
                  support@sync2gear.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Callback Request Dialog */}
      <Dialog open={callbackDialogOpen} onOpenChange={setCallbackDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              Request a Callback
            </DialogTitle>
            <DialogDescription>
              Fill in your details and we'll call you within 24 hours to discuss your requirements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="Your Business Ltd"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  placeholder="John Smith"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@business.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Telephone *</Label>
                <Input
                  id="telephone"
                  type="tel"
                  placeholder="+44 20 1234 5678"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Input
                id="message"
                placeholder="Tell us about your requirements..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ✓ Free consultation with no obligation<br />
                ✓ Custom pricing based on your needs<br />
                ✓ 7-day free trial available<br />
                ✓ Setup support included
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCallbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCallbackSubmit} className="bg-purple-600 hover:bg-purple-700">
              <Mail className="h-4 w-4 mr-2" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}