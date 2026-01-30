import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { FileText, ArrowLeft } from 'lucide-react';

interface TermsAndConditionsProps {
  onBack?: () => void;
  companyName?: string;
  lastUpdated?: string;
}

export function TermsAndConditions({ 
  onBack, 
  companyName = "sync2gear Ltd.",
  lastUpdated = "January 2025"
}: TermsAndConditionsProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Terms and Conditions</CardTitle>
                <p className="text-sm text-gray-300 mt-1">Last updated: {lastUpdated}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ScrollArea className="h-[70vh]">
              <div className="space-y-6 pr-4 text-gray-300">
                {/* 1. Agreement to Terms */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">1. Agreement to Terms</h2>
                  <p className="text-gray-300 leading-relaxed">
                    By accessing or using the sync2gear service ("Service"), you agree to be bound by these Terms and Conditions ("Terms"). 
                    If you disagree with any part of these terms, you may not access the Service.
                  </p>
                  <p className="text-gray-300 leading-relaxed mt-2">
                    The Service is provided by {companyName} ("Company", "we", "us", or "our"). These Terms apply to all users of the Service, 
                    including but not limited to business owners, administrators, and end users.
                  </p>
                </section>

                {/* 2. Service Description */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">2. Service Description</h2>
                  <p className="text-gray-300 leading-relaxed">
                    sync2gear is a business audio management platform that provides:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>Music library management and playback</li>
                    <li>Text-to-speech announcement creation</li>
                    <li>Scheduled and instant announcement delivery</li>
                    <li>Multi-zone audio distribution</li>
                    <li>Device and user management</li>
                    <li>AI-powered features (subject to credit availability)</li>
                  </ul>
                </section>

                {/* 3. Subscription Terms */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">3. Subscription Terms & Contract Period</h2>
                  
                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">3.1 Contract Duration</h3>
                  <p className="text-gray-300 leading-relaxed">
                    All subscriptions are subject to a <strong>minimum contract period of 6-12 months</strong> as selected at signup. 
                    The specific contract duration will be clearly stated in your subscription agreement.
                  </p>

                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">3.2 Free Trial Period</h3>
                  <p className="text-gray-300 leading-relaxed">
                    New customers may be eligible for a free trial period as specified during signup (typically 14-30 days). 
                    At the end of the trial period, your subscription will automatically convert to a paid subscription unless cancelled 
                    before the trial end date. Free trials are limited to one per business.
                  </p>

                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">3.3 Billing & Payment</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Monthly subscription fees are charged in British Pounds Sterling (£) on the date you signed up and on the same day each subsequent month. 
                    Payment is processed automatically via Stripe. You must provide valid payment information and authorize us to charge your payment method.
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>All fees are non-refundable except as required by law</li>
                    <li>Prices are subject to change with 30 days' notice</li>
                    <li>Failed payments may result in service suspension</li>
                    <li>You are responsible for all applicable taxes</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">3.4 Auto-Renewal</h3>
                  <p className="text-gray-300 leading-relaxed">
                    After the initial contract period, your subscription will automatically renew on a month-to-month basis at the current subscription rate 
                    unless you provide written notice of cancellation at least 30 days before the end of your contract period.
                  </p>
                </section>

                {/* 4. Cancellation & Termination */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">4. Cancellation & Termination Policy</h2>
                  
                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">4.1 Cancellation During Contract Period</h3>
                  <p className="text-gray-300 leading-relaxed">
                    If you wish to cancel during your minimum contract period (6-12 months):
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>You must provide 30 days' written notice via email to support@sync2gear.com</li>
                    <li>You remain liable for all monthly fees until the end of your contract period</li>
                    <li><strong>Early termination fee:</strong> You will be charged the remaining balance of your contract period</li>
                    <li>Example: If you cancel 3 months into a 12-month contract, you owe 9 months of subscription fees</li>
                    <li>Access to the Service will continue until the end of your paid period</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">4.2 Cancellation After Contract Period</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Once your minimum contract period has ended and you are on month-to-month billing:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>You may cancel at any time with 30 days' written notice</li>
                    <li>No early termination fees apply</li>
                    <li>Cancellation takes effect at the end of your current billing cycle</li>
                    <li>You will not be charged for the following month</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">4.3 How to Cancel</h3>
                  <p className="text-gray-300 leading-relaxed">
                    To cancel your subscription:
                  </p>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>Log into your account and go to Settings → Subscription</li>
                    <li>Click "Request Cancellation" and follow the prompts</li>
                    <li>OR email support@sync2gear.com with "Cancellation Request" in the subject line</li>
                    <li>You will receive confirmation via email within 2 business days</li>
                  </ol>

                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">4.4 Termination by Company</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We reserve the right to suspend or terminate your account immediately if:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>Payment fails and is not corrected within 7 days</li>
                    <li>You breach these Terms and Conditions</li>
                    <li>You engage in fraudulent or illegal activity</li>
                    <li>You upload prohibited content (see Section 7)</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4 text-white">4.5 Data After Cancellation</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Upon cancellation or termination:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>You have 30 days to export your data</li>
                    <li>After 30 days, all data may be permanently deleted</li>
                    <li>We are not responsible for data loss after cancellation</li>
                    <li>Backup your playlists, announcements, and schedules before cancelling</li>
                  </ul>
                </section>

                {/* 5. AI Credits & Premium Features */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">5. AI Credits & Premium Features</h2>
                  <p className="text-gray-300 leading-relaxed">
                    AI-powered text-to-speech features require AI credits. Credits are included in your subscription plan or can be purchased separately:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>Credits do not roll over month-to-month</li>
                    <li>Unused credits expire at the end of your billing cycle</li>
                    <li>Additional credits can be purchased via Stripe</li>
                    <li>Credit usage is tracked and displayed in your account</li>
                    <li>No refunds for unused credits</li>
                  </ul>
                  <p className="text-gray-300 leading-relaxed mt-2">
                    Multi-floor access is limited by your subscription plan. Upgrading to a higher tier is required to manage additional floors/zones.
                  </p>
                </section>

                {/* 6. User Responsibilities */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">6. User Responsibilities</h2>
                  <p className="text-gray-300 leading-relaxed">You agree to:</p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>Provide accurate account information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Not share your account with unauthorized users</li>
                    <li>Comply with all applicable music licensing laws (e.g., PRS, PPL in UK)</li>
                    <li>Not upload copyrighted music without proper licenses</li>
                    <li>Use the Service only for lawful business purposes</li>
                    <li>Not attempt to reverse engineer or hack the Service</li>
                  </ul>
                </section>

                {/* 7. Prohibited Content */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">7. Prohibited Content</h2>
                  <p className="text-gray-300 leading-relaxed">You may not upload or distribute:</p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>Copyrighted music without proper licensing</li>
                    <li>Illegal, harmful, or offensive content</li>
                    <li>Malware, viruses, or malicious code</li>
                    <li>Content that violates any third-party rights</li>
                    <li>Political or religious propaganda (unless approved for your specific use case)</li>
                  </ul>
                </section>

                {/* 8. Music Licensing */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">8. Music Licensing Compliance</h2>
                  <p className="text-gray-300 leading-relaxed">
                    <strong>You are responsible for obtaining all necessary music licenses.</strong> In the UK, this typically includes:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li><strong>PRS for Music</strong> - Public performance license</li>
                    <li><strong>PPL</strong> - Phonographic Performance License</li>
                  </ul>
                  <p className="text-gray-300 leading-relaxed mt-2">
                    sync2gear does not provide music licensing. We are a delivery platform only. Failure to obtain proper licenses may result in legal action 
                    by licensing authorities. We disclaim all liability for your licensing compliance.
                  </p>
                </section>

                {/* 9. Service Availability */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">9. Service Availability & Support</h2>
                  <p className="text-gray-300 leading-relaxed">
                    We strive for 99.5% uptime but cannot guarantee uninterrupted service. We are not liable for:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>Internet connectivity issues</li>
                    <li>Device hardware failures</li>
                    <li>Scheduled maintenance (announced in advance)</li>
                    <li>Force majeure events beyond our control</li>
                  </ul>
                  <p className="text-gray-300 leading-relaxed mt-2">
                    Support is provided via email during business hours (Monday-Friday, 9am-5pm GMT). Emergency support may be available for Enterprise plans.
                  </p>
                </section>

                {/* 10. Limitation of Liability */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">10. Limitation of Liability</h2>
                  <p className="text-gray-300 leading-relaxed">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2 ml-4">
                    <li>The Service is provided "AS IS" without warranties of any kind</li>
                    <li>We are not liable for indirect, incidental, or consequential damages</li>
                    <li>Our total liability is limited to the amount you paid in the last 12 months</li>
                    <li>We are not responsible for loss of business, revenue, or data</li>
                  </ul>
                </section>

                {/* 11. Intellectual Property */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">11. Intellectual Property</h2>
                  <p className="text-gray-300 leading-relaxed">
                    The sync2gear platform, including all software, design, text, and graphics, is owned by {companyName} and protected by copyright and trademark laws. 
                    You may not copy, modify, or distribute our platform without written permission.
                  </p>
                  <p className="text-gray-300 leading-relaxed mt-2">
                    Content you upload remains your property, but you grant us a license to store, process, and deliver it as part of the Service.
                  </p>
                </section>

                {/* 12. Governing Law */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">12. Governing Law & Disputes</h2>
                  <p className="text-gray-300 leading-relaxed">
                    These Terms are governed by the laws of England and Wales. Any disputes will be resolved in the courts of England and Wales.
                  </p>
                  <p className="text-gray-300 leading-relaxed mt-2">
                    Before initiating legal action, you agree to attempt to resolve disputes through good-faith negotiation for at least 30 days.
                  </p>
                </section>

                {/* 13. Changes to Terms */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">13. Changes to These Terms</h2>
                  <p className="text-gray-300 leading-relaxed">
                    We may modify these Terms at any time. Material changes will be communicated via email at least 30 days before taking effect. 
                    Continued use of the Service after changes constitute acceptance of the new Terms.
                  </p>
                </section>

                {/* 14. Contact Information */}
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-white">14. Contact Information</h2>
                  <p className="text-gray-300 leading-relaxed">
                    For questions about these Terms, contact us at:
                  </p>
                  <div className="bg-white/5 rounded-lg p-4 mt-3 border border-white/10">
                    <p className="font-semibold text-white">{companyName}</p>
                    <p className="text-gray-300">Email: <a href="mailto:support@sync2gear.com" className="text-[#1db954] underline hover:text-[#1ed760]">support@sync2gear.com</a></p>
                    <p className="text-gray-300">Website: <a href="https://www.sync2gear.com" className="text-[#1db954] underline hover:text-[#1ed760]">www.sync2gear.com</a></p>
                  </div>
                </section>

                {/* Acceptance */}
                <section className="bg-[#1db954]/20 rounded-lg p-4 border border-[#1db954]/30">
                  <h3 className="font-semibold text-[#1db954] mb-2">Acceptance of Terms</h3>
                  <p className="text-sm text-gray-300">
                    By using sync2gear, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions, 
                    including the 6-12 month minimum contract period and cancellation policy.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
