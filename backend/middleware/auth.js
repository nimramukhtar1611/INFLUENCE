// middleware/auth.js - COMPLETE PRODUCTION-READY VERSION
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const mongoose = require('mongoose');
const Brand = require('../models/Brand');

// ==================== GENERATE TOKEN HELPERS (used only within middleware for token creation? no, these are for controller) ====================
// These are not used in middleware; they are placed in authController.
// Keeping only verification functions.

/**
 * Verify access token and attach user to request
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized, no token',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id || decoded.userId).select('-password -refreshToken');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      // Check if account is active (allow 'pending' as well? Only block suspended/deleted)
      if (user.status === 'suspended' || user.status === 'deleted') {
        return res.status(403).json({
          success: false,
          error: 'Account is not active',
        });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired', expired: true });
      }
      throw error;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

/**
 * Admin protection - verifies admin role from either Admin model or User model with admin type
 */
const adminProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized, no token',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired', expired: true });
      }
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Try to find admin in Admin model first
    let admin = await Admin.findById(decoded.id).select('-password -twoFactorSecret');

    // If not found, check if user has admin role in User model
    if (!admin) {
      const user = await User.findById(decoded.id).select('-password');
      if (user && (user.userType === 'admin' || user.role === 'admin' || user.role === 'super_admin')) {
        admin = user;
      }
    }

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found',
      });
    }

    // Check if admin is active (if Admin model has isActive field)
    if (admin.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Admin account is inactive',
      });
    }

    req.user = admin; // for compatibility with protect middleware
    req.admin = admin; // specific for admin routes
    req.token = token;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

/**
 * Super admin protection - only super_admin role allowed
 */
const superAdminProtect = async (req, res, next) => {
  await adminProtect(req, res, () => {});

  if (res.headersSent) {
    return;
  }

  const role = req.user?.role || req.user?.userType;
  if (role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Super admin access required' });
  }

  next();
};

/**
 * Role-based authorization
 * @param {...string} roles - Allowed roles (brand, creator, admin)
 * @returns {Function} Middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const userRole = req.user.userType || req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `User role ${userRole} is not authorized to access this resource`,
      });
    }
    next();
  };
};

/**
 * Optional authentication - does not block unauthenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id || decoded.userId).select('-password -refreshToken');
        if (user && !['suspended', 'deleted'].includes(user.status)) {
          req.user = user;
        }
      } catch (error) {
        // Silent fail, user remains unauthenticated
      }
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * Check if user has specific permission (for team members)
 * @param {string} permission - Permission to check
 * @returns {Function} Middleware
 */
const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authorized' });
      }

      // Admins have all permissions
      if (req.user.userType === 'admin' || req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      if (req.user.userType === 'brand') {
        const brandContextId = req.brandId || req.user._id;
        const isOwnerContext = brandContextId.toString() === req.user._id.toString();

        if (isOwnerContext) {
          return next();
        }

        const brand = await Brand.findById(brandContextId);
        if (!brand) {
          return res.status(404).json({ success: false, error: 'Brand not found' });
        }

        const hasRequiredPermission = brand.userHasPermission(req.user._id, permission);
        if (!hasRequiredPermission) {
          return res.status(403).json({ success: false, error: `You don't have permission: ${permission}` });
        }
      } else {
        // For creators, permissions are handled differently (maybe not needed)
        return next();
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ success: false, error: 'Error checking permissions' });
    }
  };
};

/**
 * Resolve active brand workspace context for brand users.
 * Supports owner context (default) and team context via x-brand-context header.
 */
const resolveBrandContext = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== 'brand') {
      return next();
    }

    const ownBrandId = req.user._id.toString();
    const requestedBrandContext = req.headers['x-brand-context'];

    const applyTeamContext = (teamBrandId) => {
      req.brandId = teamBrandId;
      req.brandContext = {
        brandId: req.brandId,
        isOwnerContext: false,
        isTeamContext: true,
      };
    };

    req.brandId = req.user._id;
    req.brandContext = {
      brandId: req.user._id,
      isOwnerContext: true,
      isTeamContext: false,
    };

    // Explicit context from frontend (preferred when available).
    if (requestedBrandContext && requestedBrandContext !== ownBrandId && mongoose.Types.ObjectId.isValid(requestedBrandContext)) {
      const teamBrand = await Brand.findOne({
        _id: requestedBrandContext,
        teamMembers: {
          $elemMatch: {
            userId: req.user._id,
            status: 'active',
          },
        },
      }).select('_id');

      if (teamBrand) {
        applyTeamContext(teamBrand._id);
        return next();
      }
    }

    // Fallback: if user is an active team member anywhere, default to that parent workspace.
    const fallbackTeamBrand = await Brand.findOne({
      _id: { $ne: req.user._id },
      teamMembers: {
        $elemMatch: {
          userId: req.user._id,
          status: 'active',
        },
      },
    })
      .sort({ updatedAt: -1 })
      .select('_id');

    if (fallbackTeamBrand) {
      applyTeamContext(fallbackTeamBrand._id);
    }

    next();
  } catch (error) {
    console.error('Brand context resolution error:', error);
    res.status(500).json({ success: false, error: 'Error resolving brand context' });
  }
};

/**
 * Check resource ownership
 * @param {Model} resourceModel - Mongoose model for the resource
 * @param {string} idParam - Parameter name for resource ID (default: 'id')
 * @param {Array} ownerFields - Fields that identify the owner (default: ['userId', 'brandId', 'creatorId'])
 * @returns {Function} Middleware
 */
const checkOwnership = (resourceModel, idParam = 'id', ownerFields = ['userId', 'brandId', 'creatorId']) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ success: false, error: 'Resource not found' });
      }

      if (req.user.userType === 'admin' || req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      const ownershipIds = [req.user._id.toString()];
      if (req.user.userType === 'brand' && req.brandId) {
        ownershipIds.push(req.brandId.toString());
      }

      const isOwner = ownerFields.some(field => {
        const fieldValue = resource[field];
        return fieldValue && ownershipIds.includes(fieldValue.toString());
      });

      if (!isOwner) {
        return res.status(403).json({ success: false, error: 'Not authorized to access this resource' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ success: false, error: 'Error checking resource ownership' });
    }
  };
};

// ==================== EXPORT ====================
module.exports = {
  protect,
  adminProtect,
  superAdminProtect,
  authorize,
  optionalAuth,
  hasPermission,
  resolveBrandContext,
  checkOwnership,
};