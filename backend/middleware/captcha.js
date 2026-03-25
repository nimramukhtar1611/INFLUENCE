const CaptchaService = require('../services/captchaService');

// Verify captcha middleware
const verifyCaptcha = (action = null) => {
  return async (req, res, next) => {
    try {
      // Skip captcha in development if configured
      if (process.env.SKIP_RECAPTCHA === 'true') {
        console.log('⚠️ Skipping captcha verification (development mode)');
        req.captcha = { success: true, score: 1.0 };
        return next();
      }

      // Get captcha token from headers or body
      const token = req.headers['x-captcha-token'] || req.body.captchaToken;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Captcha token required'
        });
      }

      // Verify captcha
      const result = await CaptchaService.verifyRecaptcha(token, action);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Captcha verification failed',
          score: result.score
        });
      }

      // Attach captcha info to request
      req.captcha = result;
      next();

    } catch (error) {
      console.error('Captcha middleware error:', error);
      next();
    }
  };
};

// Rate limit based on captcha score
const captchaRateLimit = (req, res, next) => {
  const score = req.captcha?.score || 1.0;
  
  // If score is very low, block immediately
  if (score < 0.3) {
    return res.status(429).json({
      success: false,
      error: 'Request blocked due to suspicious activity'
    });
  }
  
  next();
};

module.exports = {
  verifyCaptcha,
  captchaRateLimit
};