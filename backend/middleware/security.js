// middleware/security.js - COMPLETE FIXED VERSION
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

// ==================== CORS CONFIGURATION ====================
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Captcha-Token',
    'X-Refresh-Token'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 hours
};

// ==================== HELMET CONFIGURATION ====================
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'",
        'https://js.stripe.com',
        'https://www.google.com',
        'https://www.gstatic.com'
      ],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: [
        "'self'", 
        'https://api.stripe.com',
        'https://www.google-analytics.com',
        ...ALLOWED_ORIGINS
      ],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: true },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
};

// ==================== CORS MIDDLEWARE ====================
const corsMiddleware = cors(corsOptions);

// ==================== HELMET MIDDLEWARE ====================
const helmetMiddleware = helmet(helmetConfig);

// ==================== XSS CLEAN MIDDLEWARE ====================
const xssCleanMiddleware = xss();

// ==================== HPP MIDDLEWARE (Prevent Parameter Pollution) ====================
const hppMiddleware = hpp();

// ==================== MONGO SANITIZE MIDDLEWARE ====================
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Potential NoSQL injection attempt detected on ${key}`);
  }
});

// ==================== CUSTOM SECURITY HEADERS ====================
const securityHeaders = (req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Add cache control for API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  next();
};

// ==================== RATE LIMIT HEADERS ====================
const rateLimitHeaders = (req, res, next) => {
  // Add rate limit info to response headers
  if (req.rateLimit) {
    res.setHeader('X-RateLimit-Limit', req.rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', req.rateLimit.resetTime);
  }
  next();
};

// ==================== REQUEST ID MIDDLEWARE ====================
const requestId = (req, res, next) => {
  req.id = require('crypto').randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
};

// ==================== REQUEST SIZE LIMITER ====================
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseMaxSize(maxSize);
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        success: false,
        error: `Request entity too large. Maximum size is ${maxSize}.`
      });
    }
    next();
  };
};

// Helper to parse size string (e.g., '10mb' -> bytes)
const parseMaxSize = (size) => {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+)([a-z]+)$/);
  if (!match) return 10 * 1024 * 1024; // default 10MB
  
  const [, value, unit] = match;
  return parseInt(value) * (units[unit] || units.mb);
};

// ==================== IP WHITELIST MIDDLEWARE ====================
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Access denied from this IP address'
      });
    }
  };
};

// ==================== USER AGENT BLOCKLIST ====================
const blockUserAgents = (blockedAgents = []) => {
  return (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    
    for (const agent of blockedAgents) {
      if (userAgent.toLowerCase().includes(agent.toLowerCase())) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }
    next();
  };
};

// ==================== SENSITIVE DATA FILTER ====================
const filterSensitiveData = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method
  res.json = function(data) {
    if (data && data.success !== undefined) {
      // Remove sensitive fields from response
      if (data.user) {
        delete data.user.password;
        delete data.user.refreshToken;
        delete data.user.twoFactorSecret;
        delete data.user.resetPasswordToken;
        delete data.user.emailVerificationToken;
      }
      if (data.data?.user) {
        delete data.data.user.password;
        delete data.data.user.refreshToken;
      }
    }
    return originalJson.call(this, data);
  };
  
  next();
};

// ==================== SQL INJECTION PREVENTION ====================
const preventSQLInjection = (req, res, next) => {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|WHERE)\b)|('--)|(\bOR\b\s+\d+\s*=\s*\d+)/i;
  
  const checkValue = (value) => {
    if (typeof value === 'string' && sqlPattern.test(value)) {
      return true;
    }
    return false;
  };

  const checkObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (checkValue(obj[key])) {
          return true;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkObject(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }

  next();
};

// ==================== COMPOSE ALL SECURITY MIDDLEWARE ====================
const securityMiddleware = (app) => {
  // Apply security middleware in correct order
  app.use(requestId);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(securityHeaders);
  app.use(requestSizeLimiter('10mb'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(xssCleanMiddleware);
  app.use(hppMiddleware);
  app.use(mongoSanitizeMiddleware);
  app.use(preventSQLInjection);
  app.use(filterSensitiveData);
  app.use(rateLimitHeaders);
  
  // Block common bad user agents
  app.use(blockUserAgents([
    'bot',
    'crawler',
    'scraper',
    'curl',
    'wget',
    'python',
    'java',
    'perl',
    'ruby',
    'php'
  ]));
};

// ==================== EXPORTS ====================
module.exports = {
  // Main middleware composer
  securityMiddleware,
  
  // Individual middleware
  corsMiddleware,
  helmetMiddleware,
  xssCleanMiddleware,
  hppMiddleware,
  mongoSanitizeMiddleware,
  securityHeaders,
  rateLimitHeaders,
  requestId,
  requestSizeLimiter,
  ipWhitelist,
  blockUserAgents,
  filterSensitiveData,
  preventSQLInjection,
  
  // Configuration
  corsOptions,
  helmetConfig,
  ALLOWED_ORIGINS
};