// server/middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Protect admin routes - verify JWT token
exports.adminProtect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.admin_token) {
      token = req.cookies.admin_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route (No token)'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is for admin
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      // Get admin from database
      const admin = await Admin.findById(decoded.id).select('-password_hash');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Check if admin is active
      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Admin account is deactivated'
        });
      }

      // Attach admin to request
      req.admin = admin;
      next();

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

// Check if admin has specific role
exports.hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Super admin only
exports.superAdminOnly = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin only.'
    });
  }

  next();
};

// Check if admin has specific permission
exports.hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    if (!req.admin.permissions || !req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

// Log admin activity middleware
exports.logActivity = (action) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.json;
    
    // Override json function
    res.json = function(data) {
      // Log activity if request was successful
      if (data.success && req.admin) {
        req.admin.logActivity(
          action || req.method + ' ' + req.baseUrl + req.path,
          req.ip,
          req.get('User-Agent'),
          {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            body: req.method === 'GET' ? undefined : req.body
          }
        ).catch(console.error);
      }
      
      // Call original send
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Rate limiting for admin actions
const rateLimit = require('express-rate-limit');

exports.adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  keyGenerator: (req) => {
    // Use admin ID if authenticated, otherwise IP
    return req.admin ? req.admin._id.toString() : req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for super admins
    return req.admin && req.admin.role === 'super_admin';
  }
});

// IP whitelist for admin routes (optional)
exports.ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Skip if no whitelist configured
    if (allowedIPs.length === 0) {
      return next();
    }
    
    // Check if IP is allowed
    if (allowedIPs.includes(clientIP)) {
      return next();
    }
    
    // Allow localhost in development
    if (process.env.NODE_ENV === 'development' && 
        (clientIP === '::1' || clientIP === '127.0.0.1')) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied from this IP address'
    });
  };
};

// Session validation middleware
exports.validateAdminSession = async (req, res, next) => {
  try {
    // Check if admin's last activity was within reasonable time
    const lastActivity = req.admin.last_activity || req.admin.last_login;
    const inactivityLimit = 30 * 60 * 1000; // 30 minutes
    
    if (lastActivity && (Date.now() - new Date(lastActivity).getTime() > inactivityLimit)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired due to inactivity'
      });
    }
    
    // Update last activity
    req.admin.last_activity = new Date();
    await req.admin.save();
    
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    next();
  }
};

// Two-factor authentication middleware
exports.requireTwoFactor = async (req, res, next) => {
  try {
    if (!req.admin.two_factor_enabled) {
      return next();
    }
    
    const twoFactorToken = req.headers['x-2fa-token'];
    
    if (!twoFactorToken) {
      return res.status(401).json({
        success: false,
        message: '2FA token required',
        require_2fa: true
      });
    }
    
    // Verify 2FA token (implement your verification logic)
    const isValid = await verify2FAToken(req.admin, twoFactorToken);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }
    
    next();
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA'
    });
  }
};

// Audit trail middleware
exports.auditTrail = (actionType) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original send
    const originalSend = res.json;
    
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Create audit log
      const auditLog = {
        admin_id: req.admin?._id,
        admin_email: req.admin?.email,
        action_type: actionType || 'admin_action',
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        body: req.method === 'GET' ? undefined : req.body,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        response_time: responseTime,
        status_code: res.statusCode,
        success: data?.success,
        timestamp: new Date()
      };
      
      // Save audit log (implement your audit log model)
      // AuditLog.create(auditLog).catch(console.error);
      
      console.log('Audit Log:', auditLog);
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Helper function to verify 2FA token
async function verify2FAToken(admin, token) {
  // Implement your 2FA verification logic here
  // This could use speakeasy, authenticator, etc.
  return true; // Placeholder
}

module.exports = exports;