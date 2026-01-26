/**
 * Email Notification Service
 *
 * Integrated with SendGrid for reliable email delivery
 *
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 */

// SendGrid integration
interface SendGridMessage {
  to: string | { email: string; name?: string } | Array<string | { email: string; name?: string }>;
  from: { email: string; name?: string };
  subject: string;
  text?: string;
  html?: string;
  template_id?: string;
  dynamic_template_data?: Record<string, any>;
  cc?: string | { email: string; name?: string } | Array<string | { email: string; name?: string }>;
  bcc?: string | { email: string; name?: string } | Array<string | { email: string; name?: string }>;
}

// Configuration
const SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY;
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const FROM_EMAIL = 'noreply@sync2gear.com';
const FROM_NAME = 'sync2gear';

export interface EmailData {
  to: string | string[];
  subject: string;
  template?: string;
  data: Record<string, any>;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface SignUpNotificationData {
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  timestamp: string;
}

/**
 * Send email notification using SendGrid
 *
 * @param emailData Email data to send
 * @returns Promise<boolean> Success status
 */
export async function sendEmailNotification(emailData: EmailData): Promise<boolean> {
  try {
    // Check if SendGrid API key is configured
    if (!SENDGRID_API_KEY) {
      // console.warn('📧 SendGrid API key not configured, logging email instead'); // Debug logging removed
      // console.log('📧 Email notification:', { // Debug logging removed
      //   to: emailData.to,
      //   subject: emailData.subject,
      //   template: emailData.template,
      //   data: emailData.data,
      //   cc: emailData.cc,
      //   bcc: emailData.bcc,
      // });
      return true; // Return true for development
    }

    // Prepare SendGrid message
    const message: SendGridMessage = {
      to: emailData.to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: emailData.subject,
    };

    // Add CC if provided
    if (emailData.cc) {
      message.cc = emailData.cc;
    }

    // Add BCC if provided
    if (emailData.bcc) {
      message.bcc = emailData.bcc;
    }

    // Use template if provided, otherwise use HTML rendering
    if (emailData.template) {
      message.template_id = emailData.template;
      message.dynamic_template_data = emailData.data;
    } else {
      // Render HTML from template
      message.html = renderEmailTemplate('default', emailData.data);
      message.text = renderTextVersion(emailData.data);
    }

    // Send email via SendGrid API
    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ personalizations: [message] }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`SendGrid API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    // console.log('📧 Email sent successfully:', result); // Debug logging removed

    return true;
  } catch (error) {
    console.error('Email notification error:', error);
    return false;
  }
}

/**
 * Send sign-up notification email
 * 
 * @param signUpData Sign-up form data
 * @returns Promise<boolean> Success status
 */
export async function sendSignUpNotification(signUpData: SignUpNotificationData): Promise<boolean> {
  const emailData: EmailData = {
    to: 'signups@sync2gear.com', // Configure this email address
    subject: `New User Sign Up: ${signUpData.companyName}`,
    template: 'signup_notification',
    data: {
      name: signUpData.name,
      email: signUpData.email,
      companyName: signUpData.companyName,
      phone: signUpData.phone || 'Not provided',
      timestamp: signUpData.timestamp,
      date: new Date(signUpData.timestamp).toLocaleString(),
    },
  };

  return sendEmailNotification(emailData);
}

/**
 * Send password reset email
 *
 * @param email User email address
 * @param resetToken Password reset token
 * @param resetUrl Password reset URL
 * @returns Promise<boolean> Success status
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string
): Promise<boolean> {
  const emailData: EmailData = {
    to: email,
    subject: 'Reset your sync2gear password',
    template: 'password_reset',
    data: {
      email,
      resetToken,
      resetUrl,
      expiryHours: 24,
      supportEmail: 'support@sync2gear.com',
    },
  };

  return sendEmailNotification(emailData);
}

/**
 * Send welcome email to new users
 *
 * @param userData User information
 * @returns Promise<boolean> Success status
 */
export async function sendWelcomeEmail(userData: {
  name: string;
  email: string;
  companyName?: string;
  loginUrl: string;
}): Promise<boolean> {
  const emailData: EmailData = {
    to: userData.email,
    subject: `Welcome to sync2gear${userData.companyName ? ` - ${userData.companyName}` : ''}`,
    template: 'welcome',
    data: {
      ...userData,
      supportEmail: 'support@sync2gear.com',
      docsUrl: 'https://docs.sync2gear.com',
    },
  };

  return sendEmailNotification(emailData);
}

/**
 * Send account activation email
 *
 * @param userData User information
 * @param activationUrl Activation URL
 * @returns Promise<boolean> Success status
 */
export async function sendAccountActivationEmail(
  userData: { name: string; email: string },
  activationUrl: string
): Promise<boolean> {
  const emailData: EmailData = {
    to: userData.email,
    subject: 'Activate your sync2gear account',
    template: 'account_activation',
    data: {
      ...userData,
      activationUrl,
      expiryHours: 72,
      supportEmail: 'support@sync2gear.com',
    },
  };

  return sendEmailNotification(emailData);
}

/**
 * Send notification to admins about system events
 *
 * @param eventType Type of event
 * @param eventData Event details
 * @param adminEmails List of admin email addresses
 * @returns Promise<boolean> Success status
 */
export async function sendAdminNotification(
  eventType: string,
  eventData: Record<string, any>,
  adminEmails: string[]
): Promise<boolean> {
  const emailData: EmailData = {
    to: adminEmails,
    subject: `sync2gear System Alert: ${eventType}`,
    template: 'admin_notification',
    data: {
      eventType,
      eventData,
      timestamp: new Date().toISOString(),
      dashboardUrl: 'https://app.sync2gear.com/admin',
    },
  };

  return sendEmailNotification(emailData);
}

/**
 * Send calendar booking confirmation
 *
 * @param bookingData Booking details
 * @returns Promise<boolean> Success status
 */
export async function sendBookingConfirmation(bookingData: {
  customerName: string;
  customerEmail: string;
  meetingType: string;
  meetingDate: string;
  meetingTime: string;
  meetingDuration: number;
  meetingUrl?: string;
}): Promise<boolean> {
  const emailData: EmailData = {
    to: bookingData.customerEmail,
    subject: `Confirmed: Your sync2gear ${bookingData.meetingType}`,
    template: 'booking_confirmation',
    data: {
      ...bookingData,
      supportEmail: 'support@sync2gear.com',
    },
  };

  return sendEmailNotification(emailData);
}

/**
 * Render email template with data
 *
 * @param templateName Template name to use
 * @param data Template data
 * @returns Rendered HTML string
 */
function renderEmailTemplate(templateName: string, data: Record<string, any>): string {
  switch (templateName) {
    case 'signup_notification':
      return renderSignUpTemplate(data);
    default:
      return renderDefaultTemplate(data);
  }
}

/**
 * Render text version of email
 *
 * @param data Template data
 * @returns Plain text version
 */
function renderTextVersion(data: Record<string, any>): string {
  return `
New sync2gear Sign Up

Name: ${data.name || 'N/A'}
Email: ${data.email || 'N/A'}
Company: ${data.companyName || 'N/A'}
Phone: ${data.phone || 'Not provided'}
Date: ${data.date || new Date().toLocaleString()}

Please contact this potential customer to complete their account setup.
  `.trim();
}

/**
 * Render sign-up notification template
 */
function renderSignUpTemplate(data: Record<string, any>): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New User Sign Up</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f6f9fc; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
      .content { padding: 40px 30px; }
      .field { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea; }
      .label { font-weight: 600; color: #667eea; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
      .value { font-size: 16px; color: #2d3748; margin-top: 5px; }
      .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #718096; font-size: 14px; }
      .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
      .highlight { background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🚀 New User Sign Up</h1>
        <p>A potential customer has signed up for sync2gear</p>
      </div>

      <div class="content">
        <div class="highlight">
          <strong>Action Required:</strong> Contact this customer within 24 hours to complete their account setup and answer any questions.
        </div>

        <div class="field">
          <div class="label">👤 Customer Name</div>
          <div class="value">${data.name || 'Not provided'}</div>
        </div>

        <div class="field">
          <div class="label">📧 Email Address</div>
          <div class="value">${data.email || 'Not provided'}</div>
        </div>

        <div class="field">
          <div class="label">🏢 Company Name</div>
          <div class="value">${data.companyName || 'Not provided'}</div>
        </div>

        <div class="field">
          <div class="label">📞 Phone Number</div>
          <div class="value">${data.phone || 'Not provided'}</div>
        </div>

        <div class="field">
          <div class="label">📅 Sign Up Date</div>
          <div class="value">${data.date || new Date().toLocaleString()}</div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${data.email}?subject=Welcome to sync2gear - Account Setup&body=Hi ${data.name},%0A%0AThank you for signing up for sync2gear! I'd be happy to help you get started.%0A%0APlease let me know a good time for us to discuss your audio setup requirements.%0A%0ABest regards,%0A[Your Name]%0Async2gear Support" class="button">
            📧 Contact Customer
          </a>
        </div>

        <div class="field">
          <div class="label">💡 Next Steps</div>
          <div class="value">
            1. Reply to this email within 24 hours<br>
            2. Schedule a product demo or consultation call<br>
            3. Help them complete their account setup<br>
            4. Answer any technical questions about their audio requirements
          </div>
        </div>
      </div>

      <div class="footer">
        <p>This notification was sent automatically by the sync2gear signup system.</p>
        <p>© 2025 sync2gear Ltd. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `.trim();
}

/**
 * Render default email template
 */
function renderDefaultTemplate(data: Record<string, any>): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #667eea; color: white; padding: 20px; text-align: center; }
      .content { background: #f8f9fa; padding: 20px; }
      .field { margin: 10px 0; }
      .label { font-weight: bold; color: #667eea; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>sync2gear Notification</h1>
      </div>
      <div class="content">
        ${Object.entries(data).map(([key, value]) => `
          <div class="field">
            <span class="label">${key}:</span> ${value}
          </div>
        `).join('')}
      </div>
    </div>
  </body>
  </html>
  `.trim();
}

/**
 * Email template for sign-up notifications
 *
 * This can be used with email service providers that support templates
 */
export const SIGNUP_EMAIL_TEMPLATE = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #667eea; color: white; padding: 20px; text-align: center; }
      .content { background: #f8f9fa; padding: 20px; }
      .field { margin: 10px 0; }
      .label { font-weight: bold; color: #667eea; }
      .value { margin-left: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>New User Sign Up</h1>
      </div>
      <div class="content">
        <div class="field">
          <span class="label">Name:</span>
          <span class="value">{{name}}</span>
        </div>
        <div class="field">
          <span class="label">Email:</span>
          <span class="value">{{email}}</span>
        </div>
        <div class="field">
          <span class="label">Company:</span>
          <span class="value">{{companyName}}</span>
        </div>
        <div class="field">
          <span class="label">Phone:</span>
          <span class="value">{{phone}}</span>
        </div>
        <div class="field">
          <span class="label">Date:</span>
          <span class="value">{{date}}</span>
        </div>
      </div>
    </div>
  </body>
  </html>
`;
