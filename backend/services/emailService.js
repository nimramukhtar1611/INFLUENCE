// services/emailService.js - FULL FIXED VERSION
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initialize(); // ✅ FIX: Auto-initialize on startup
  }

  // ==================== INITIALIZE ====================
  initialize() {
    if (this.initialized) return;

    try {
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email service not configured. Using console logging instead.');
        this.initialized = true;
        return;
      }

      const config = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      };

      this.transporter = nodemailer.createTransport(config);

      this.transporter.verify((error) => {
        if (error) {
          console.warn('⚠️ Email server connection warning:', error.message);
        } else {
          console.log('✅ Email server is ready');
        }
      });

      this.initialized = true;
      console.log('✅ Email service initialized');
    } catch (error) {
      console.warn('⚠️ Email service initialization warning:', error.message);
      this.initialized = true;
    }
  }

  isInitialized() {
    return this.initialized;
  }

  // ==================== SEND EMAIL ====================
  async sendEmail(options) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.transporter) {
      console.log('📧 Email would be sent (logging mode):', {
        to: options.to || options.email,
        subject: options.subject,
        template: options.template
      });
      return {
        success: true,
        messageId: 'logged',
        message: 'Email logged (no transporter configured)'
      };
    }

    try {
      const mailOptions = {
        from: `"${options.fromName || process.env.EMAIL_FROM_NAME || 'InfluenceX'}" <${options.from || process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.to || options.email,
        subject: options.subject,
        html: options.html || this.getTemplate(options.template, options.data),
        text: options.text,
        attachments: options.attachments || []
      };

      if (options.replyTo) mailOptions.replyTo = options.replyTo;
      if (options.cc)      mailOptions.cc      = options.cc;
      if (options.bcc)     mailOptions.bcc     = options.bcc;

      const info = await this.transporter.sendMail(mailOptions);

      const accepted = Array.isArray(info.accepted) ? info.accepted : [];
      const rejected = Array.isArray(info.rejected) ? info.rejected : [];
      const pending = Array.isArray(info.pending) ? info.pending : [];

      // Some SMTP providers return messageId even when recipients are rejected/pending.
      if (accepted.length === 0 && (rejected.length > 0 || pending.length > 0)) {
        console.error('❌ Email not accepted by SMTP server:', {
          to: mailOptions.to,
          rejected,
          pending,
          response: info.response,
        });

        return {
          success: false,
          error: 'SMTP server did not accept recipient',
          messageId: info.messageId,
          accepted,
          rejected,
          pending,
          response: info.response,
        };
      }

      console.log(`✅ Email sent: ${info.messageId}`, {
        to: mailOptions.to,
        accepted,
        rejected,
        pending,
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted,
        rejected,
        pending,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== TEMPLATES ====================
  getTemplate(template, data = {}) {
    // ✅ FIX: Log error if template not found
    const baseStyles = `
      body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .content { padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px; }
      .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    `;

    const primaryHeader = `background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);`;
    const successHeader  = `background: linear-gradient(135deg, #10B981 0%, #059669 100%);`;
    const warningHeader  = `background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);`;

    const headerBlock = (title, style = primaryHeader) => `
      <div style="${style} color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${title}</h1>
      </div>
    `;

    const buttonBlock = (url, label, color = '#4F46E5') => `
      <p style="text-align: center; margin: 25px 0;">
        <a href="${url}"
           style="display:inline-block;padding:12px 30px;background:${color};color:white;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
          ${label}
        </a>
      </p>
    `;

    const footer = `
      <div class="footer">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} InfluenceX. All rights reserved.</p>
        <p style="margin: 5px 0 0;">If you have questions, contact us at <a href="mailto:support@influencex.com" style="color: #4F46E5;">support@influencex.com</a></p>
      </div>
    `;

    const wrap = (headerHtml, contentHtml) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          ${headerHtml}
          <div class="content">${contentHtml}</div>
          ${footer}
        </div>
      </body>
      </html>
    `;

    const templates = {

      // ── Welcome ──────────────────────────────────────────────────────────
      welcome: wrap(
        headerBlock('Welcome to InfluenceX! 🎉'),
        `
          <p>Hi <strong>${data.name || 'there'}</strong>,</p>
          <p>Thank you for joining InfluenceX! We're excited to have you on board.</p>
          <p>Get started by completing your profile and exploring opportunities:</p>
          ${buttonBlock(data.url || process.env.FRONTEND_URL || '#', 'Get Started')}
          <p style="color: #6b7280; font-size: 14px;">If you have any questions, feel free to reply to this email.</p>
        `
      ),

      // ── Email Verification ────────────────────────────────────────────────
      verifyEmail: wrap(
        headerBlock('Verify Your Email ✉️'),
        `
          <p>Hi <strong>${data.name || 'there'}</strong>,</p>
          <p>Please verify your email address by clicking the button below:</p>
          ${buttonBlock(data.url || '#', 'Verify Email')}
          <p>This link will expire in <strong>24 hours</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with us, please ignore this email.</p>
        `
      ),

      // ── Password Reset ────────────────────────────────────────────────────
      // ✅ FIX: Both 'resetPassword' and 'forgotPassword' work now
      resetPassword: wrap(
        headerBlock('Reset Your Password 🔐'),
        `
          <p>Hi <strong>${data.name || 'there'}</strong>,</p>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          ${buttonBlock(data.url || '#', 'Reset Password')}
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
        `
      ),

      // ✅ FIX: Alias for 'forgotPassword' — authController uses this name
      forgotPassword: wrap(
        headerBlock('Reset Your Password 🔐'),
        `
          <p>Hi <strong>${data.name || 'there'}</strong>,</p>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          ${buttonBlock(data.url || '#', 'Reset Password')}
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
        `
      ),

      // ── OTP Code ──────────────────────────────────────────────────────────
      otpCode: wrap(
        headerBlock('Your Verification Code 🔢'),
        `
          <p>Hi <strong>${data.name || 'there'}</strong>,</p>
          <p>Your verification code is:</p>
          <div style="font-size:36px;font-weight:bold;color:#4F46E5;text-align:center;padding:25px;background:white;border-radius:10px;margin:20px 0;letter-spacing:8px;border: 2px solid #E5E7EB;">
            ${data.otp || '000000'}
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        `
      ),

      // ── New Deal Offer ────────────────────────────────────────────────────
      newDeal: wrap(
        headerBlock('New Deal Offer! 🤝'),
        `
          <p>Hi <strong>${data.name || 'there'}</strong>,</p>
          <p>You have received a new deal offer from <strong>${data.brandName || 'a brand'}</strong>.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5;">
            <p style="margin: 5px 0;"><strong>Campaign:</strong> ${data.campaign || 'Campaign'}</p>
            <p style="margin: 5px 0;"><strong>Budget:</strong> $${data.budget || '0'}</p>
            <p style="margin: 5px 0;"><strong>Deadline:</strong> ${data.deadline || 'TBD'}</p>
          </div>
          ${buttonBlock(data.url || '#', 'View Deal')}
        `
      ),

      // ── Payment Received ──────────────────────────────────────────────────
      paymentReceived: wrap(
        headerBlock('Payment Received! 💰', successHeader),
        `
          <p>Hi <strong>${data.name || 'there'}</strong>,</p>
          <p>You have received a payment of <strong>$${data.amount || '0'}</strong> from <strong>${data.from || 'a brand'}</strong>.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
            <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${data.transactionId || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> $${data.amount || '0'}</p>
            <p style="margin: 5px 0;"><strong>From:</strong> ${data.from || 'N/A'}</p>
          </div>
          ${buttonBlock(data.url || '#', 'View Details', '#10B981')}
        `
      ),

      // ── Referral Invitation ───────────────────────────────────────────────
      referralInvitation: wrap(
        headerBlock("You've Been Invited! 🎁"),
        `
          <p>Hi there,</p>
          <p><strong>${data.referrerName || 'Someone'}</strong> has invited you to join InfluenceX!</p>
          <p>As a special bonus, you'll receive <strong>${data.bonusAmount || '$50'}</strong> when you sign up and complete your first deal.</p>
          ${buttonBlock(data.referralLink || '#', 'Accept Invitation')}
          <p style="color: #6b7280; font-size: 14px;">This invitation expires in ${data.expiresIn || '90 days'}.</p>
        `
      ),

      // ── 2FA Login Alert ───────────────────────────────────────────────────
      twoFAAlert: wrap(
        headerBlock('New Login Attempt 🔔', warningHeader),
        `
          <p>Hi <strong>${data.name || 'there'}</strong>,</p>
          <p>A login attempt was made to your InfluenceX account.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 5px 0;"><strong>Time:</strong> ${data.time || new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>IP:</strong> ${data.ip || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Device:</strong> ${data.device || 'Unknown'}</p>
          </div>
          <p>If this was you, no action is needed. If not, please secure your account immediately.</p>
          ${buttonBlock(data.url || '#', 'Secure My Account', '#F59E0B')}
        `
      )
    };

    // ✅ FIX: Proper error logging if template not found
    if (!templates[template]) {
      console.error(`❌ Email template not found: "${template}". Available: ${Object.keys(templates).join(', ')}`);
      return `
        <!DOCTYPE html><html><body>
          <p>Email content unavailable. Please contact support at support@influencex.com</p>
        </body></html>
      `;
    }

    return templates[template];
  }

  // ==================== CONVENIENCE METHODS ====================

  async sendWelcome(email, name) {
    return this.sendEmail({
      to: email,
      subject: 'Welcome to InfluenceX! 🎉',
      template: 'welcome',
      data: { name }
    });
  }

  // Backward-compatible alias used by older controllers
  async sendWelcomeEmail(email, name) {
    return this.sendWelcome(email, name);
  }

  async sendVerification(email, name, token) {
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - InfluenceX',
      template: 'verifyEmail',
      data: { name, url }
    });
  }

  async sendPasswordReset(email, name, token) {
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - InfluenceX',
      template: 'resetPassword',
      data: { name, url }
    });
  }

  // Backward-compatible alias supports both signatures:
  // (email, token) and (email, name, token)
  async sendPasswordResetEmail(email, arg2, arg3) {
    const hasName = typeof arg3 === 'string';
    const name = hasName ? arg2 : undefined;
    const token = hasName ? arg3 : arg2;
    return this.sendPasswordReset(email, name || 'there', token);
  }

  // ✅ FIX: Use otpCode template instead of plain HTML
  async sendOTP(email, name, otp) {
    return this.sendEmail({
      to: email,
      subject: 'Your Verification Code - InfluenceX',
      template: 'otpCode',
      data: { name, otp }
    });
  }

  async sendDealOffer(email, name, data) {
    return this.sendEmail({
      to: email,
      subject: 'New Deal Offer - InfluenceX',
      template: 'newDeal',
      data: { name, ...data }
    });
  }

  async sendPaymentNotification(email, name, data) {
    return this.sendEmail({
      to: email,
      subject: 'Payment Received - InfluenceX',
      template: 'paymentReceived',
      data: { name, ...data }
    });
  }

  async sendReferralInvitation(email, referrerName, referralLink, bonusAmount = '$50') {
    return this.sendEmail({
      to: email,
      subject: `${referrerName} invited you to join InfluenceX!`,
      template: 'referralInvitation',
      data: {
        referrerName,
        referralLink,
        bonusAmount,
        expiresIn: '90 days'
      }
    });
  }

  async send2FAAlert(email, name, data) {
    return this.sendEmail({
      to: email,
      subject: 'New Login Attempt Detected - InfluenceX',
      template: 'twoFAAlert',
      data: { name, ...data }
    });
  }
}

module.exports = new EmailService();