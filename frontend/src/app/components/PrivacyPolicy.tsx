import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Shield, ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
  companyName?: string;
  lastUpdated?: string;
}

export function PrivacyPolicy({ 
  onBack, 
  companyName = "sync2gear Ltd.",
  lastUpdated = "January 2025"
}: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-2xl">Privacy Policy</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Last updated: {lastUpdated}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ScrollArea className="h-[70vh]">
              <div className="space-y-6 pr-4">
                {/* Introduction */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">Introduction</h2>
                  <p className="text-slate-700 leading-relaxed">
                    {companyName} ("we", "us", or "our") operates the sync2gear business audio management platform ("Service"). 
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
                  </p>
                  <p className="text-slate-700 leading-relaxed mt-2">
                    We are committed to protecting your privacy and complying with the UK General Data Protection Regulation (GDPR) and 
                    Data Protection Act 2018.
                  </p>
                </section>

                {/* 1. Information We Collect */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
                  
                  <h3 className="text-lg font-semibold mb-2 mt-4">1.1 Account Information</h3>
                  <p className="text-slate-700 leading-relaxed">When you create an account, we collect:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li>Business name and contact person</li>
                    <li>Email address</li>
                    <li>Phone number</li>
                    <li>Business address</li>
                    <li>Password (encrypted)</li>
                    <li>Subscription plan and billing information</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4">1.2 Usage Data</h3>
                  <p className="text-slate-700 leading-relaxed">We automatically collect:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li>Device information (type, operating system, browser)</li>
                    <li>IP address and location data</li>
                    <li>Login times and activity logs</li>
                    <li>Features used and settings configured</li>
                    <li>Error logs and performance data</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4">1.3 Content Data</h3>
                  <p className="text-slate-700 leading-relaxed">When you use the Service, we store:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li>Uploaded music files and playlists</li>
                    <li>Announcement audio (text-to-speech or uploaded)</li>
                    <li>Schedules and automation settings</li>
                    <li>Device and zone configurations</li>
                    <li>User preferences and settings</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4">1.4 Payment Information</h3>
                  <p className="text-slate-700 leading-relaxed">
                    Payment processing is handled by Stripe. We do not store your full credit card details. We receive from Stripe:
                  </p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li>Last 4 digits of your card</li>
                    <li>Card expiry date</li>
                    <li>Billing address</li>
                    <li>Transaction history</li>
                  </ul>
                </section>

                {/* 2. How We Use Your Information */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
                  <p className="text-slate-700 leading-relaxed">We use your information to:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li><strong>Provide the Service:</strong> Deliver audio content to your devices, process announcements, manage schedules</li>
                    <li><strong>Account Management:</strong> Authenticate users, manage subscriptions, provide customer support</li>
                    <li><strong>Billing:</strong> Process payments, send invoices, manage subscriptions</li>
                    <li><strong>Communication:</strong> Send service updates, security alerts, and marketing (with consent)</li>
                    <li><strong>Improvement:</strong> Analyze usage patterns to improve features and performance</li>
                    <li><strong>Security:</strong> Detect fraud, prevent abuse, ensure system security</li>
                    <li><strong>Legal Compliance:</strong> Comply with legal obligations and enforce our Terms</li>
                  </ul>
                </section>

                {/* 3. Legal Basis for Processing */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">3. Legal Basis for Processing (GDPR)</h2>
                  <p className="text-slate-700 leading-relaxed">Under GDPR, we process your data based on:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li><strong>Contract Performance:</strong> To provide the Service you subscribed to</li>
                    <li><strong>Legitimate Interests:</strong> To improve our Service and ensure security</li>
                    <li><strong>Legal Obligation:</strong> To comply with tax and accounting laws</li>
                    <li><strong>Consent:</strong> For marketing communications (you can opt-out anytime)</li>
                  </ul>
                </section>

                {/* 4. Data Sharing */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">4. Data Sharing and Disclosure</h2>
                  <p className="text-slate-700 leading-relaxed">We share your data with:</p>
                  
                  <h3 className="text-lg font-semibold mb-2 mt-4">4.1 Service Providers</h3>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li><strong>Stripe:</strong> Payment processing (PCI-DSS compliant)</li>
                    <li><strong>Firebase:</strong> Authentication and data storage (Google Cloud)</li>
                    <li><strong>AI Providers:</strong> Text-to-speech services for announcements</li>
                    <li><strong>Email Service:</strong> Transactional emails and notifications</li>
                    <li><strong>Analytics:</strong> Anonymous usage statistics (if enabled)</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4">4.2 Legal Requirements</h3>
                  <p className="text-slate-700 leading-relaxed">We may disclose your information if required to:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li>Comply with legal process (court orders, subpoenas)</li>
                    <li>Enforce our Terms and Conditions</li>
                    <li>Protect rights, property, or safety of our company, users, or public</li>
                    <li>Investigate fraud or security incidents</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4">4.3 Business Transfers</h3>
                  <p className="text-slate-700 leading-relaxed">
                    If we are acquired or merge with another company, your data may be transferred to the new owner. 
                    You will be notified of any such change.
                  </p>

                  <h3 className="text-lg font-semibold mb-2 mt-4">4.4 We Do NOT Sell Your Data</h3>
                  <p className="text-slate-700 leading-relaxed font-semibold">
                    We never sell your personal information to third parties for marketing purposes.
                  </p>
                </section>

                {/* 5. Data Security */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
                  <p className="text-slate-700 leading-relaxed">We protect your data using:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li><strong>Encryption:</strong> 256-bit SSL/TLS for data in transit, AES-256 for data at rest</li>
                    <li><strong>Authentication:</strong> Password hashing, optional 2FA for admin accounts</li>
                    <li><strong>Access Controls:</strong> Role-based permissions, least privilege principle</li>
                    <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
                    <li><strong>Backups:</strong> Regular encrypted backups with disaster recovery</li>
                    <li><strong>Updates:</strong> Regular security patches and vulnerability assessments</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed mt-2">
                    However, no system is 100% secure. You are responsible for maintaining the confidentiality of your account credentials.
                  </p>
                </section>

                {/* 6. Data Retention */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
                  <p className="text-slate-700 leading-relaxed">We retain your data:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li><strong>Active Accounts:</strong> For the duration of your subscription</li>
                    <li><strong>Cancelled Accounts:</strong> 30 days after cancellation (for data recovery)</li>
                    <li><strong>Billing Records:</strong> 7 years (UK tax law requirement)</li>
                    <li><strong>Support Tickets:</strong> 3 years for quality assurance</li>
                    <li><strong>Backups:</strong> Up to 90 days in encrypted backups</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed mt-2">
                    After these periods, data is securely deleted unless we have a legal obligation to retain it.
                  </p>
                </section>

                {/* 7. Your Rights (GDPR) */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">7. Your Rights Under GDPR</h2>
                  <p className="text-slate-700 leading-relaxed">You have the right to:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                    <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                    <li><strong>Restriction:</strong> Limit how we process your data</li>
                    <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                    <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
                    <li><strong>Withdraw Consent:</strong> Opt-out of marketing at any time</li>
                    <li><strong>Complain:</strong> Lodge a complaint with the UK Information Commissioner's Office (ICO)</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed mt-2">
                    To exercise these rights, email us at privacy@sync2gear.com. We will respond within 30 days.
                  </p>
                </section>

                {/* 8. Cookies and Tracking */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking Technologies</h2>
                  <p className="text-slate-700 leading-relaxed">We use cookies to:</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li><strong>Essential:</strong> Session management, authentication (required)</li>
                    <li><strong>Functional:</strong> Remember your preferences and settings</li>
                    <li><strong>Analytics:</strong> Understand how you use the Service (optional)</li>
                    <li><strong>Security:</strong> Detect fraudulent activity and abuse</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed mt-2">
                    You can control cookies through your browser settings. Disabling essential cookies may affect Service functionality.
                  </p>
                </section>

                {/* 9. Third-Party Links */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">9. Third-Party Links</h2>
                  <p className="text-slate-700 leading-relaxed">
                    Our Service may contain links to third-party websites (e.g., music licensing providers). We are not responsible for 
                    their privacy practices. Please review their privacy policies before providing any information.
                  </p>
                </section>

                {/* 10. Children's Privacy */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
                  <p className="text-slate-700 leading-relaxed">
                    sync2gear is a B2B service intended for businesses. We do not knowingly collect data from children under 16. 
                    If you believe a child has provided us with personal information, please contact us immediately.
                  </p>
                </section>

                {/* 11. International Data Transfers */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">11. International Data Transfers</h2>
                  <p className="text-slate-700 leading-relaxed">
                    Your data is primarily stored in the UK/EU. Some service providers (e.g., Google Cloud, Stripe) may process data 
                    in other countries. We ensure adequate safeguards through:
                  </p>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2 ml-4">
                    <li>EU-US Data Privacy Framework compliance</li>
                    <li>Standard Contractual Clauses (SCCs)</li>
                    <li>Data Processing Agreements with all providers</li>
                  </ul>
                </section>

                {/* 12. Changes to Privacy Policy */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">12. Changes to This Privacy Policy</h2>
                  <p className="text-slate-700 leading-relaxed">
                    We may update this Privacy Policy from time to time. Material changes will be communicated via email at least 30 days 
                    before taking effect. The "Last updated" date at the top will reflect the most recent revision.
                  </p>
                </section>

                {/* 13. Contact & Data Protection Officer */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">13. Contact Information</h2>
                  <p className="text-slate-700 leading-relaxed">
                    For privacy-related questions or to exercise your rights:
                  </p>
                  <div className="bg-slate-50 rounded-lg p-4 mt-3 border">
                    <p className="font-semibold">{companyName}</p>
                    <p className="text-slate-600">Data Protection Officer</p>
                    <p className="text-slate-600">Email: privacy@sync2gear.com</p>
                    <p className="text-slate-600">Email (Support): support@sync2gear.com</p>
                    <p className="text-slate-600">Website: www.sync2gear.com</p>
                  </div>
                  <p className="text-slate-700 leading-relaxed mt-3">
                    <strong>UK Information Commissioner's Office (ICO):</strong><br />
                    If you are not satisfied with our response, you can complain to the ICO at www.ico.org.uk
                  </p>
                </section>

                {/* Summary */}
                <section className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">Privacy Summary</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ We collect only necessary data to provide the Service</li>
                    <li>✓ Your data is encrypted and securely stored</li>
                    <li>✓ We never sell your personal information</li>
                    <li>✓ You have full control over your data (access, delete, export)</li>
                    <li>✓ We comply with UK GDPR and Data Protection Act 2018</li>
                    <li>✓ Payment processing is handled by Stripe (PCI-DSS compliant)</li>
                  </ul>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
