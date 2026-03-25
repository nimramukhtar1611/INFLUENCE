// services/smsService.js - SINGLE SOURCE OF TRUTH
const twilio = require('twilio');

class SMSService {
  constructor() {
    this.client = null;
    this.initialize();
  }

  initialize() {
    // Initialize Twilio client if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        console.log('✅ Twilio client initialized');
      } catch (error) {
        console.error('❌ Twilio initialization failed:', error);
        this.client = null;
      }
    } else {
      console.warn('⚠️ Twilio credentials not found. SMS will be logged only.');
    }
  }

  // ==================== SEND SMS ====================
  async sendSMS(options) {
    try {
      const { to, message, from } = options;
      
      if (!to) {
        return {
          success: false,
          error: 'Phone number is required'
        };
      }

      // Validate phone number format (basic)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanedNumber = to.replace(/[-\s]/g, '');
      if (!phoneRegex.test(cleanedNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format. Use international format (e.g., +1234567890)'
        };
      }

      // In development, just log the SMS
      if (process.env.NODE_ENV === 'development' || !this.client) {
        console.log('📱 SMS would be sent:', {
          to,
          from: from || process.env.TWILIO_PHONE_NUMBER || '+1234567890',
          message
        });
        
        // Log SMS for testing
        await this.logSMS({
          to,
          message,
          status: 'logged',
          createdAt: new Date()
        });

        return {
          success: true,
          message: 'SMS logged (development mode)',
          sid: `LOG-${Date.now()}`
        };
      }

      // In production, actually send the SMS
      const twilioMessage = await this.client.messages.create({
        body: message,
        from: from || process.env.TWILIO_PHONE_NUMBER,
        to: this.formatPhoneNumber(to)
      });

      console.log('✅ SMS sent:', twilioMessage.sid);

      // Log successful send
      await this.logSMS({
        to,
        message,
        status: 'sent',
        sid: twilioMessage.sid,
        createdAt: new Date()
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status
      };

    } catch (error) {
      console.error('❌ SMS sending error:', error);

      // Log error
      await this.logSMS({
        to: options.to,
        message: options.message,
        status: 'failed',
        error: error.message,
        createdAt: new Date()
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== SEND OTP ====================
  async sendOTP(phone, otp) {
    const message = `Your InfluenceX verification code is: ${otp}. Valid for 10 minutes.`;
    
    return this.sendSMS({
      to: phone,
      message
    });
  }

  // ==================== SEND NOTIFICATION ====================
  async sendNotification(phone, type, data) {
    let message = '';

    switch(type) {
      case 'deal_offer':
        message = `You have a new deal offer from ${data.brandName} for $${data.budget}. View on InfluenceX: ${process.env.FRONTEND_URL}/deals/${data.dealId}`;
        break;
      case 'deal_accepted':
        message = `Your deal has been accepted! Check it out on InfluenceX.`;
        break;
      case 'payment_received':
        message = `Payment of $${data.amount} received! View details on InfluenceX.`;
        break;
      case 'deadline_reminder':
        message = `Reminder: Deal deadline approaching in ${data.days} days. Submit your deliverables on InfluenceX.`;
        break;
      case 'verification':
        message = `Your InfluenceX verification code is: ${data.otp}`;
        break;
      case '2fa_code':
        message = `Your InfluenceX 2FA code is: ${data.code}. Valid for 5 minutes.`;
        break;
      case 'account_locked':
        message = `Your account has been locked due to multiple failed attempts. Please reset your password.`;
        break;
      default:
        message = `You have a new notification on InfluenceX. Check your dashboard.`;
    }

    return this.sendSMS({
      to: phone,
      message
    });
  }

  // ==================== BULK SMS ====================
  async sendBulkSMS(recipients, message) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS({
        to: recipient.phone,
        message
      });
      results.push({
        phone: recipient.phone,
        ...result
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: true,
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // ==================== CHECK BALANCE ====================
  async checkBalance() {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio not configured',
        balance: 0,
        currency: 'USD'
      };
    }

    try {
      // Get account balance
      const balance = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).balance.fetch();
      
      return {
        success: true,
        balance: parseFloat(balance.balance),
        currency: balance.currency
      };
    } catch (error) {
      console.error('❌ Balance check error:', error);
      return {
        success: false,
        error: error.message,
        balance: 0
      };
    }
  }

  // ==================== VERIFY PHONE NUMBER ====================
  async verifyPhoneNumber(phone) {
    try {
      // Basic validation
      const cleaned = this.formatPhoneNumber(phone);
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      
      if (!phoneRegex.test(cleaned)) {
        return {
          success: false,
          valid: false,
          error: 'Invalid phone number format'
        };
      }

      // In production, use Twilio Lookup API for carrier verification
      if (this.client) {
        try {
          const phoneNumber = await this.client.lookups.v1.phoneNumbers(cleaned).fetch({
            type: ['carrier', 'caller-name']
          });
          
          return {
            success: true,
            valid: true,
            countryCode: phoneNumber.countryCode,
            nationalFormat: phoneNumber.nationalFormat,
            carrier: phoneNumber.carrier?.name || 'Unknown',
            lineType: phoneNumber.carrier?.type || 'Unknown'
          };
        } catch (lookupError) {
          console.warn('⚠️ Twilio lookup failed:', lookupError.message);
          // Fallback to basic validation
          return {
            success: true,
            valid: true,
            formatted: cleaned,
            warning: 'Could not verify carrier information'
          };
        }
      }

      return {
        success: true,
        valid: true,
        formatted: cleaned
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        error: error.message
      };
    }
  }

  // ==================== HELPER METHODS ====================
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.replace(/^0+/, ''); // Remove leading zeros
    }
    
    return cleaned;
  }

  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  async logSMS(data) {
    // In production, you might want to store this in database
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 SMS Log:', data);
    }
    
    // Optional: Store in database for auditing
    // const SMSLog = require('../models/SMSLog');
    // await SMSLog.create(data);
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured() {
    return !!this.client;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: !!this.client,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      mode: process.env.NODE_ENV === 'development' ? 'development (logging)' : 'production'
    };
  }
}

// Create and export singleton instance
const smsService = new SMSService();
module.exports = smsService;