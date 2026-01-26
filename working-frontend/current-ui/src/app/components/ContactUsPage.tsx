import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Phone, Mail, MessageSquare, Clock, CheckCircle2, ArrowLeft, Calendar, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from '@/assets/77e47cfb36e9b1e5ffd3ce20b4f723cd8ab924e0.png';

interface ContactUsPageProps {
  signUpData?: {
    name: string;
    email: string;
    companyName: string;
    phone?: string;
  };
  onBackToLanding?: () => void;
}

export function ContactUsPage({ signUpData, onBackToLanding }: ContactUsPageProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedBookingType, setSelectedBookingType] = useState<string>('demo');
  const [isCalendlyLoaded, setIsCalendlyLoaded] = useState(false);

  // Load Calendly script
  useEffect(() => {
    if (!window.Calendly && !isCalendlyLoaded) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.onload = () => setIsCalendlyLoaded(true);
      document.body.appendChild(script);
    }
  }, [isCalendlyLoaded]);

  const bookingTypes = [
    {
      id: 'demo',
      title: 'Product Demo',
      description: 'See sync2gear in action with a personalized demo',
      duration: '30 minutes',
      icon: Zap,
      calendlyUrl: 'https://calendly.com/sync2gear/product-demo'
    },
    {
      id: 'consultation',
      title: 'Technical Consultation',
      description: 'Discuss your specific audio setup requirements',
      duration: '45 minutes',
      icon: Users,
      calendlyUrl: 'https://calendly.com/sync2gear/technical-consultation'
    },
    {
      id: 'onboarding',
      title: 'Account Setup Call',
      description: 'Get help setting up your first sync2gear account',
      duration: '60 minutes',
      icon: CheckCircle2,
      calendlyUrl: 'https://calendly.com/sync2gear/account-setup'
    }
  ];

  const contactMethods = [
    {
      id: 'phone',
      title: 'Call Us',
      description: 'Speak directly with our team',
      icon: Phone,
      action: 'tel:+1-555-123-4567',
      details: '+1 (555) 123-4567',
      available: 'Mon-Fri, 9am-5pm EST',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'email',
      title: 'Email Us',
      description: 'Send us a message and we\'ll respond within 24 hours',
      icon: Mail,
      action: 'mailto:support@sync2gear.com?subject=New Account Inquiry',
      details: 'support@sync2gear.com',
      available: '24/7',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      id: 'schedule',
      title: 'Schedule a Call',
      description: 'Book a time that works for you',
      icon: Clock,
      action: '#',
      details: 'Book online',
      available: 'Available slots',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ];

  const handleContactMethod = (method: typeof contactMethods[0]) => {
    setSelectedMethod(method.id);
    
    if (method.id === 'phone') {
      window.location.href = method.action;
    } else if (method.id === 'email') {
      const subject = signUpData 
        ? `New Account Inquiry - ${signUpData.companyName}`
        : 'New Account Inquiry';
      const body = signUpData
        ? `Hello,\n\nI'm interested in creating an account for ${signUpData.companyName}.\n\nName: ${signUpData.name}\nEmail: ${signUpData.email}\nCompany: ${signUpData.companyName}${signUpData.phone ? `\nPhone: ${signUpData.phone}` : ''}\n\nPlease contact me to complete the account setup.\n\nThank you!`
        : 'Hello,\n\nI\'m interested in creating an account. Please contact me.\n\nThank you!';
      window.location.href = `mailto:${method.details}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (method.id === 'schedule') {
      setIsBookingDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4">
      {onBackToLanding && (
        <Button
          variant="ghost"
          onClick={onBackToLanding}
          className="absolute top-4 left-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      )}

      <Card className="w-full max-w-2xl shadow-xl border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={logoImage} alt="sync2gear" className="h-20 w-20" />
          </div>
          <CardTitle className="text-3xl font-bold">We'll Contact You Soon!</CardTitle>
          <CardDescription className="text-base">
            Thank you for your interest in sync2gear. Our team will reach out to you shortly to complete your account setup.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success Message */}
          {signUpData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900 mb-1">Request Received</p>
                  <p className="text-sm text-green-700">
                    We've received your information for <strong>{signUpData.companyName}</strong>. 
                    Our team will review your request and contact you within 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Methods */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 text-center">
              Prefer to reach out directly?
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {contactMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => handleContactMethod(method)}
                    className={`p-6 rounded-lg border-2 ${method.borderColor} ${method.bgColor} hover:shadow-lg transition-all text-left group ${
                      selectedMethod === method.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-3 rounded-full ${method.bgColor} border-2 ${method.borderColor} group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-6 w-6 ${method.color}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">{method.title}</h4>
                        <p className="text-xs text-slate-600 mb-2">{method.description}</p>
                        <p className={`text-sm font-medium ${method.color} mb-1`}>
                          {method.details}
                        </p>
                        <p className="text-xs text-slate-500">{method.available}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              What Happens Next?
            </h3>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">1.</span>
                <span>Our team reviews your request (usually within 24 hours)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">2.</span>
                <span>We'll contact you to discuss your needs and answer any questions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">3.</span>
                <span>We'll set up your account and provide access credentials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">4.</span>
                <span>You'll receive a welcome email with next steps</span>
              </li>
            </ol>
          </div>

          {/* Reference Number */}
          {signUpData && (
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Reference: <span className="font-mono font-semibold">{signUpData.email}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Schedule a Call
            </DialogTitle>
            <DialogDescription>
              Choose the type of meeting that best fits your needs. We'll send you a calendar invite with available times.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Booking Type Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                What would you like to discuss?
              </label>
              <div className="grid gap-3">
                {bookingTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedBookingType(type.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedBookingType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${
                          selectedBookingType === type.id ? 'text-blue-600' : 'text-slate-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-slate-900">{type.title}</h4>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {type.duration}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendly Integration */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-2">Available Times</h4>
              <p className="text-sm text-slate-600 mb-3">
                Select your preferred time slot. We'll send a confirmation email with meeting details.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleBookCall}
                  disabled={!isCalendlyLoaded}
                  className="flex-1"
                >
                  {!isCalendlyLoaded ? (
                    'Loading calendar...'
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      View Available Times
                    </>
                  )}
                </Button>
              </div>

              {signUpData && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-800">
                    <strong>Pre-filled information:</strong> {signUpData.name} from {signUpData.companyName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function handleBookCall() {
    const selectedType = bookingTypes.find(type => type.id === selectedBookingType);
    if (!selectedType) return;

    try {
      // Open Calendly with pre-filled information
      let calendlyUrl = selectedType.calendlyUrl;

      if (signUpData) {
        // Add UTM parameters for tracking
        calendlyUrl += `?name=${encodeURIComponent(signUpData.name)}&email=${encodeURIComponent(signUpData.email)}`;

        if (signUpData.companyName) {
          calendlyUrl += `&company=${encodeURIComponent(signUpData.companyName)}`;
        }

        if (signUpData.phone) {
          calendlyUrl += `&phone=${encodeURIComponent(signUpData.phone)}`;
        }

        // Add UTM tracking
        calendlyUrl += `&utm_source=signup&utm_medium=referral&utm_campaign=new_account`;
      }

      window.open(calendlyUrl, '_blank');

      toast.success('Calendar opened!', {
        description: 'Select your preferred time slot. We\'ll send a confirmation email.'
      });

      setIsBookingDialogOpen(false);

    } catch (error) {
      toast.error('Failed to open calendar', {
        description: 'Please try again or contact us directly'
      });
    }
  }
}
