const axios = require('axios');

class CaptchaService {
  // Verify reCAPTCHA v3
  static async verifyRecaptcha(token, expectedAction = null) {
    try {
      // Skip in development/test mode
      if (process.env.SKIP_RECAPTCHA === 'true' || process.env.NODE_ENV === 'development') {
        console.log('⚠️ Skipping reCAPTCHA verification (dev mode)');
        return { success: true, score: 1.0 };
      }

      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      if (!secretKey) {
        console.error('❌ reCAPTCHA secret key not configured');
        return { success: false, error: 'reCAPTCHA not configured' };
      }

      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: secretKey,
            response: token
          },
          timeout: 5000
        }
      );

      const data = response.data;

      // Check if verification was successful
      if (!data.success) {
        console.error('❌ reCAPTCHA verification failed:', data['error-codes']);
        return { 
          success: false, 
          error: 'reCAPTCHA verification failed',
          errorCodes: data['error-codes']
        };
      }

const threshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD) || 0.5;      
      if (data.score < threshold) {
        console.warn(`⚠️ Low reCAPTCHA score: ${data.score} (threshold: ${threshold})`);
        return { 
          success: false, 
          error: 'Suspicious activity detected',
          score: data.score 
        };
      }

      // Check action matches expected action
      if (expectedAction && data.action !== expectedAction) {
        console.warn(`⚠️ reCAPTCHA action mismatch: expected ${expectedAction}, got ${data.action}`);
        return { 
          success: false, 
          error: 'Invalid request',
          action: data.action 
        };
      }

      console.log(`✅ reCAPTCHA verified successfully (score: ${data.score})`);
      
      return {
        success: true,
        score: data.score,
        action: data.action,
        hostname: data.hostname,
        timestamp: data.challenge_ts
      };

    } catch (error) {
      console.error('❌ reCAPTCHA verification error:', error.message);
      return { 
        success: false, 
        error: 'reCAPTCHA verification failed' 
      };
    }
  }

  // Get captcha configuration for frontend
  static getConfig() {
    return {
      siteKey: process.env.RECAPTCHA_SITE_KEY,
      version: 'v3',
      threshold: process.env.RECAPTCHA_SCORE_THRESHOLD || 0.5
    };
  }
}

module.exports = CaptchaService;