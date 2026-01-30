import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { AlertCircle, FileText, Scale, Clock, CreditCard, XCircle, Shield, ArrowLeft } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

interface CancellationPolicyProps {
  onBack?: () => void;
}

export function CancellationPolicy({ onBack }: CancellationPolicyProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a] max-w-4xl mx-auto space-y-6 pb-24 md:pb-6 p-4">
      {/* Back Button */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4 text-white hover:bg-white/10">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      {/* Header */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl text-white">Cancellation & Refund Policy</CardTitle>
              <CardDescription className="text-gray-300 mt-2">
                sync2gear Limited - Business Subscription Terms
              </CardDescription>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="border-white/20 text-gray-300">Last Updated: January 20, 2026</Badge>
                <Badge variant="outline" className="border-white/20 text-gray-300">Version 1.2</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Important Notice */}
      <Card className="border-yellow-500/30 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-semibold mb-1 text-yellow-400">Important Legal Notice</p>
              <p>
                This Cancellation & Refund Policy forms an integral part of your Service Agreement with sync2gear Limited. 
                By subscribing to our services, you acknowledge and agree to be bound by these terms. Please read carefully 
                before committing to any subscription plan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Definitions */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Scale className="h-5 w-5 text-[#1db954]" />
            1. Definitions & Interpretation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">1.1 In this Policy:</p>
            <ul className="space-y-2 ml-4 text-gray-300">
              <li><strong className="text-white">"Company", "We", "Us", "Our"</strong> means sync2gear Limited, registered in England and Wales</li>
              <li><strong className="text-white">"Customer", "You", "Your"</strong> means the business entity or individual who has entered into a Service Agreement</li>
              <li><strong className="text-white">"Service Agreement"</strong> means the binding contract for provision of sync2gear services</li>
              <li><strong className="text-white">"Subscription Period"</strong> means the recurring billing cycle (monthly or annual) selected by Customer</li>
              <li><strong className="text-white">"Service Commencement Date"</strong> means the date on which access to the Platform is first provided</li>
              <li><strong className="text-white">"Platform"</strong> means the sync2gear software application and associated services</li>
              <li><strong className="text-white">"Content"</strong> means all data, music files, announcements, schedules, and configurations uploaded by Customer</li>
              <li><strong className="text-white">"Device(s)"</strong> means hardware units registered to Customer's account for audio playback</li>
              <li><strong className="text-white">"Notice Period"</strong> means the period specified in Section 3 for termination notification</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 2. Subscription Commitment */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="h-5 w-5 text-[#1db954]" />
            2. Subscription Commitment & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">2.1 Minimum Term</p>
            <p>All subscriptions are subject to a minimum initial term of thirty (30) days from the Service Commencement Date ("Minimum Term"). Customer acknowledges that this Minimum Term is a material condition of the Service Agreement.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">2.2 Automatic Renewal</p>
            <p>Unless terminated in accordance with Section 3, subscriptions automatically renew for successive periods equal to the original Subscription Period. By subscribing, Customer authorises recurring charges to the payment method on file.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">2.3 Payment Terms</p>
            <p>Subscription fees are:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Payable in advance for each Subscription Period</li>
              <li>Non-refundable except as expressly provided in Section 5</li>
              <li>Exclusive of applicable taxes, duties, or levies which shall be Customer's responsibility</li>
              <li>Subject to annual price reviews with sixty (60) days' notice</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">2.4 Device Add-ons</p>
            <p>Additional devices may be added mid-cycle. Charges for new devices are pro-rated to align with the current billing cycle and are non-refundable upon activation.</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Cancellation Procedures */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <XCircle className="h-5 w-5 text-[#1db954]" />
            3. Cancellation Procedures & Notice Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">3.1 Notice Period</p>
            <p>Customer must provide written notice of cancellation no less than thirty (30) days prior to the next renewal date ("Notice Period"). Cancellation requests submitted with less than thirty (30) days' notice will take effect at the end of the subsequent billing period.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">3.2 Method of Cancellation</p>
            <p>Cancellation requests must be submitted through one of the following approved methods:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Via the "Cancel Subscription" function in your Account Settings (preferred method)</li>
              <li>Email to: <strong>cancellations@sync2gear.com</strong> from the registered account email address</li>
              <li>Written notice to: sync2gear Limited, Legal Department, [Address]</li>
            </ul>
            <p className="mt-2 text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 p-3 rounded">
              <strong className="text-yellow-400">Important:</strong> Verbal cancellation requests, social media messages, or requests to support staff 
              via chat do NOT constitute valid cancellation notice.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">3.3 Cancellation Confirmation</p>
            <p>Upon receipt of valid cancellation notice, We will provide email confirmation within five (5) business days containing:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Cancellation request reference number</li>
              <li>Effective cancellation date</li>
              <li>Final billing date and amount</li>
              <li>Data export deadline (see Section 6)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">3.4 Cancellation During Minimum Term</p>
            <p>Customer may cancel during the Minimum Term; however, Customer remains liable for all fees for the remainder of the Minimum Term. No refund shall be provided for early termination within the Minimum Term.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">3.5 No Cancellation of Device Purchases</p>
            <p>Hardware devices purchased from sync2gear are subject to a separate returns policy and cannot be cancelled or refunded as part of subscription cancellation. Device returns must comply with our Hardware Returns Policy (available separately).</p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Effect of Cancellation */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-[#1db954]" />
            4. Effect of Cancellation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">4.1 Service Continuation</p>
            <p>Upon submission of cancellation notice, services will continue uninterrupted until the effective cancellation date. Customer remains responsible for all fees through this date.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">4.2 Access Termination</p>
            <p>At 23:59:59 UTC on the effective cancellation date:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Platform access will be immediately revoked</li>
              <li>All scheduled playback will cease</li>
              <li>Devices will be de-registered from Your account</li>
              <li>API access keys will be invalidated</li>
              <li>Mobile application access will be disabled</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">4.3 No Partial Month Credits</p>
            <p>No credits, refunds, or pro-rata adjustments will be provided for any unused portion of the final billing period. Customer acknowledges that subscription fees cover access to the Platform for the entire billing period, regardless of actual usage.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">4.4 Outstanding Obligations</p>
            <p>Cancellation does not absolve Customer of:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Any outstanding payment obligations</li>
              <li>Obligations arising from breach of Terms of Service prior to cancellation</li>
              <li>Indemnification obligations which survive termination</li>
              <li>Confidentiality obligations</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 5. Refund Policy */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CreditCard className="h-5 w-5 text-[#1db954]" />
            5. Refund Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">5.1 No Refunds Policy</p>
            <p className="bg-white/5 p-3 rounded border border-white/10 font-semibold text-white">
              All subscription fees are strictly non-refundable except as expressly provided in Sections 5.2, 5.3, and 5.4 below.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">5.2 Money-Back Guarantee (New Customers Only)</p>
            <p>First-time subscribers are entitled to a full refund if:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Refund request is made within fourteen (14) calendar days of the Service Commencement Date</li>
              <li>Customer has not exceeded fair usage limits (defined as: uploading more than 1000 music files, creating more than 50 announcements, or registering more than 5 devices)</li>
              <li>No breach of Terms of Service has occurred</li>
              <li>Request is submitted via email to refunds@sync2gear.com with subject "Money-Back Guarantee Request"</li>
            </ul>
            <p className="mt-2 text-gray-300">
              This guarantee applies once per business entity. Customers who have previously subscribed (including under a different account or business name at the same location) are not eligible.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">5.3 Service Failure Refunds</p>
            <p>Refunds may be granted at Our sole discretion where:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Platform uptime falls below 95% in a calendar month (excluding scheduled maintenance)</li>
              <li>Core functionality is unavailable for more than seventy-two (72) consecutive hours</li>
              <li>Customer has submitted support tickets documenting the issue and allowed Us reasonable time to remedy</li>
            </ul>
            <p className="mt-2 text-gray-300">
              Any refund under this section shall be limited to a pro-rata credit for the period of service disruption and shall not exceed one (1) month's subscription fee. This is Customer's sole remedy for service failures.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">5.4 Erroneous Billing</p>
            <p>If We incorrectly bill Customer (e.g., charging for a cancelled subscription, duplicate charges, or incorrect pricing), We will refund the erroneous amount within thirty (30) days of written notice. Customer must report billing errors within ninety (90) days of the charge date; claims beyond this period will not be considered.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">5.5 Refund Processing</p>
            <p>Approved refunds will be processed to the original payment method within fourteen (14) business days. Customer is responsible for any currency conversion fees, transaction fees, or charges imposed by their financial institution.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">5.6 No Refunds For</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Change of mind or business circumstances</li>
              <li>Failure to use the service or incorrect usage</li>
              <li>Customer's technical issues (internet connectivity, incompatible devices, etc.)</li>
              <li>Third-party service failures (cloud storage, music licensing, payment processors)</li>
              <li>Suspension or termination due to breach of Terms of Service</li>
              <li>Dissatisfaction with features, performance, or functionality after the 14-day guarantee period</li>
              <li>Business closure, relocation, or sale</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 6. Data Retention & Export */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">6. Data Retention & Export Upon Cancellation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">6.1 Data Export Period</p>
            <p>Upon cancellation, Customer has thirty (30) days from the effective cancellation date to export all Content via the Platform's export functionality. We are under no obligation to provide data in any specific format or to assist with data migration.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">6.2 Data Deletion</p>
            <p>All Customer Content will be permanently and irrevocably deleted from Our systems thirty (30) days after the effective cancellation date. This includes but is not limited to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Music library files and metadata</li>
              <li>Announcement recordings and text-to-speech configurations</li>
              <li>Playlists and schedules</li>
              <li>Zone configurations and device settings</li>
              <li>User accounts and permissions</li>
              <li>Historical playback logs and analytics</li>
            </ul>
            <p className="mt-2 bg-red-500/20 border border-red-500/30 p-3 rounded text-red-300">
              <strong className="text-red-400">Warning:</strong> Data deletion is automatic and irreversible. We do not maintain backups of cancelled accounts. 
              Customer is solely responsible for exporting all required data before the deletion deadline.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">6.3 Retained Information</p>
            <p>Notwithstanding Section 6.2, We reserve the right to retain:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Billing records and transaction history (retained for 7 years for tax compliance)</li>
              <li>Communications and support tickets (retained for 2 years)</li>
              <li>Anonymised usage analytics and system logs</li>
              <li>Information required to comply with legal obligations or defend legal claims</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">6.4 Reactivation</p>
            <p>Customers who reactivate subscriptions after data deletion must rebuild their Content library from scratch. We cannot and will not restore previously deleted data under any circumstances.</p>
          </div>
        </CardContent>
      </Card>

      {/* 7. Downgrades & Plan Changes */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">7. Downgrades & Plan Modifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">7.1 Downgrade Option</p>
            <p>Instead of cancellation, Customer may downgrade to a lower-tier subscription plan. Downgrades take effect at the next renewal date. No refunds will be provided for the difference between plan prices.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">7.2 Feature Restrictions</p>
            <p>Downgrading may result in loss of access to certain features, reduced device limits, or storage restrictions. Customer is responsible for ensuring compliance with the new plan's limits prior to the downgrade date. Content exceeding the new plan's limits may be automatically archived or deleted.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">7.3 Annual to Monthly Conversion</p>
            <p>Customers on annual plans may request conversion to monthly billing at the end of the current annual period. Early conversion from annual to monthly billing is not permitted, and no pro-rata refunds will be provided.</p>
          </div>
        </CardContent>
      </Card>

      {/* 8. Suspension vs Cancellation */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">8. Account Suspension (Alternative to Cancellation)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">8.1 Temporary Suspension Option</p>
            <p>Customers may request temporary account suspension for a maximum period of ninety (90) days per calendar year. During suspension:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>A reduced suspension fee of 50% of the monthly subscription rate applies</li>
              <li>All Content is preserved and accessible upon reactivation</li>
              <li>Platform access and device functionality are disabled</li>
              <li>Minimum 14 days' notice required to activate or reactivate</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">8.2 Suspension Limitations</p>
            <p>Suspension is only available to accounts in good standing with no outstanding payment obligations. Suspended accounts that are not reactivated within ninety (90) days will be automatically cancelled with data deletion per Section 6.</p>
          </div>
        </CardContent>
      </Card>

      {/* 9. Forced Termination */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">9. Termination by sync2gear</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">9.1 Termination for Breach</p>
            <p>We reserve the right to immediately suspend or terminate Customer's account without notice or refund if:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Payment fails or is reversed (chargeback)</li>
              <li>Customer breaches Terms of Service, Acceptable Use Policy, or this Cancellation Policy</li>
              <li>Customer engages in fraudulent activity or provides false information</li>
              <li>Customer uses the Platform for illegal purposes or uploads infringing content</li>
              <li>Customer's usage threatens system stability or security</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">9.2 Service Discontinuation</p>
            <p>We reserve the right to discontinue the sync2gear service entirely with ninety (90) days' written notice. In such event, Customer will receive a pro-rata refund for any prepaid fees covering the post-discontinuation period. This refund shall be Customer's sole remedy.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">9.3 No Liability</p>
            <p>We shall not be liable for any damages, losses, or expenses arising from termination for breach, including but not limited to loss of data, business interruption, or reputational harm.</p>
          </div>
        </CardContent>
      </Card>

      {/* 10. Disputes & Chargebacks */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">10. Payment Disputes & Chargebacks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">10.1 Dispute Resolution</p>
            <p>Before initiating a chargeback with your payment provider, Customer must contact Our billing department at billing@sync2gear.com to resolve the dispute. We commit to good-faith resolution within fifteen (15) business days.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">10.2 Chargeback Consequences</p>
            <p>Initiating a chargeback without first attempting to resolve the matter with Us may result in:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Immediate account suspension</li>
              <li>Loss of Money-Back Guarantee eligibility</li>
              <li>Administrative fees (£50 or actual costs, whichever is greater)</li>
              <li>Permanent ban from future sync2gear services</li>
              <li>Referral to debt collection agencies for amounts owing</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">10.3 Legal Costs</p>
            <p>Customer agrees to reimburse Us for all reasonable legal costs and expenses incurred in defending or responding to unjustified chargebacks or payment disputes.</p>
          </div>
        </CardContent>
      </Card>

      {/* 11. Jurisdiction & Governing Law */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">11. Governing Law & Jurisdiction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">11.1 Governing Law</p>
            <p>This Cancellation & Refund Policy shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">11.2 Jurisdiction</p>
            <p>Customer irrevocably submits to the exclusive jurisdiction of the courts of England and Wales for any dispute arising from or relating to this Policy, the Service Agreement, or use of the Platform.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">11.3 Consumer Rights (UK/EU Customers)</p>
            <p>Nothing in this Policy affects statutory rights that cannot be excluded or limited by contract, including consumer rights under the Consumer Rights Act 2015 (UK) or equivalent EU directives. If you are a consumer (purchasing for non-business purposes), you may have additional cancellation and refund rights under applicable consumer protection laws.</p>
          </div>
        </CardContent>
      </Card>

      {/* 12. Modifications */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">12. Policy Modifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">12.1 Right to Modify</p>
            <p>We reserve the right to modify this Cancellation & Refund Policy at any time. Material changes will be notified via:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-300">
              <li>Email to the registered account email address (minimum 30 days' notice)</li>
              <li>In-app notification upon next login</li>
              <li>Prominent notice on the sync2gear website</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">12.2 Acceptance of Changes</p>
            <p>Continued use of the Platform after the effective date of policy changes constitutes acceptance of the modified Policy. Customers who do not agree to the changes must cancel their subscription before the effective date.</p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">12.3 Grandfathering</p>
            <p>Existing customers on annual plans at the time of a policy change will continue under the previous policy terms until their current annual period expires, after which the new policy will apply.</p>
          </div>
        </CardContent>
      </Card>

      {/* 13. Contact Information */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">13. Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold mb-2 text-white">For Cancellation Requests:</p>
            <p>Email: <a href="mailto:cancellations@sync2gear.com" className="text-[#1db954] underline hover:text-[#1ed760]">cancellations@sync2gear.com</a></p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">For Refund Requests:</p>
            <p>Email: <a href="mailto:refunds@sync2gear.com" className="text-[#1db954] underline hover:text-[#1ed760]">refunds@sync2gear.com</a></p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">For Billing Disputes:</p>
            <p>Email: <a href="mailto:billing@sync2gear.com" className="text-[#1db954] underline hover:text-[#1ed760]">billing@sync2gear.com</a></p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">Postal Address:</p>
            <p>
              sync2gear Limited<br />
              Legal Department<br />
              [Your Registered Office Address]<br />
              United Kingdom
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2 text-white">Company Registration:</p>
            <p>Company Number: [Your Companies House Number]</p>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgment */}
      <Card className="border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-300">
            <p className="font-semibold mb-3 text-white">ACKNOWLEDGMENT</p>
            <p className="mb-3">
              By subscribing to sync2gear services, you acknowledge that you have read, understood, and agree to be bound 
              by this Cancellation & Refund Policy. You confirm that you have authority to bind your business entity to 
              these terms and that you have consulted independent legal advice if necessary.
            </p>
            <p className="text-xs text-gray-300 mt-4">
              This policy was drafted to comply with UK consumer protection law, Google Play Store requirements, 
              and industry best practices for B2B SaaS agreements. It is designed to be legally enforceable while 
              providing fair and transparent terms to customers.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={() => window.print()}>
          <FileText className="h-4 w-4 mr-2" />
          Print Policy
        </Button>
        <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={() => window.history.back()}>
          Back to Settings
        </Button>
      </div>
    </div>
  );
}