// controllers/admin/adminController.js - MERGED FULL VERSION WITH 2FA
const User = require('../../models/User');
const Brand = require('../../models/Brand');
const Creator = require('../../models/Creator');
const Campaign = require('../../models/Campaign');
const Deal = require('../../models/Deal');
const Payment = require('../../models/Payment');
const Dispute = require('../../models/Dispute');
const Withdrawal = require('../../models/Withdrawal');
const Subscription = require('../../models/Subscription');
const AuditLog = require('../../models/AuditLog');
const Settings = require('../../models/Settings');
const FeaturedListing = require('../../models/FeaturedListing');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { sendEmail } = require('../../services/emailService');
const notificationService = require('../../services/notificationService');
const TwoFactorService = require('../../services/twoFactorService');

// ==================== ADMIN LOGIN WITH 2FA ====================


// ==================== ADMIN LOGIN WITH 2FA ====================
// adminController.js mein sirf yeh function replace karo

exports.adminLogin = async (req, res) => {
  try {
    const { email, password, two_factor_code } = req.body;
    const Admin = require('../../models/Admin');

    // ✅ FIX 1: email aur password dono validate karo pehle
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select(
      '+password +twoFactorSecret +twoFactorEnabled +twoFactorBackupCodes +loginAttempts +lockUntil'
    );

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // ✅ FIX 2: isActive check karo
    if (!admin.isActive) {
      return res.status(401).json({ success: false, error: 'Admin account is deactivated' });
    }

    // Account lock check
    if (admin.isLocked && admin.isLocked()) {
      const minutesLeft = Math.ceil((admin.lockUntil - Date.now()) / (60 * 1000));
      return res.status(401).json({
        success: false,
        error: `Account locked. Try again in ${minutesLeft} minutes.`
      });
    }

    // ✅ FIX 3: comparePassword use karo (Admin model ka method)
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      // increment attempts
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = Date.now() + 30 * 60 * 1000; // 30 min lock
      }
      await admin.save();
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // ✅ 2FA check
    if (admin.twoFactorEnabled) {
      if (!two_factor_code) {
        return res.status(200).json({
          success: true,
          require2FA: true,
          userId: admin._id,
          message: '2FA code required',
          expiresIn: 300
        });
      }

      const TwoFactorService = require('../../services/twoFactorService');
      const verification = await TwoFactorService.verifyToken(admin._id, two_factor_code);

      if (!verification.success) {
        admin.loginAttempts = (admin.loginAttempts || 0) + 1;
        if (admin.loginAttempts >= 5) {
          admin.lockUntil = Date.now() + 30 * 60 * 1000;
        }
        await admin.save();
        return res.status(401).json({ success: false, error: 'Invalid 2FA code' });
      }
    }

    // ✅ Login successful — reset attempts
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const jwt = require('jsonwebtoken');
 const token = jwt.sign(
  { id: admin._id, type: 'admin' }, 
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);

    const refreshToken = jwt.sign(
      { id: admin._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Audit log (optional — error hone pe ignore)
    try {
      const AuditLog = require('../../models/AuditLog');
      await AuditLog.create({
        adminId: admin._id,
        action: 'admin_login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { email: admin.email }
      });
    } catch (e) { /* ignore */ }

    // Response mein sensitive fields hata do
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    delete adminResponse.twoFactorSecret;
    delete adminResponse.twoFactorBackupCodes;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      admin: adminResponse
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

// ==================== ADMIN 2FA MANAGEMENT ====================

/**
 * Generate 2FA secret for admin
 */
exports.adminGenerate2FA = async (req, res) => {
  try {
    const result = await TwoFactorService.generateSecret(
      req.admin._id,
      req.admin.email
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log activity
    await AuditLog.create({
      adminId: req.admin._id,
      action: '2fa_generate',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        secret: result.secret,
        qrCode: result.qrCode,
        otpauth_url: result.otpauth_url
      }
    });
  } catch (error) {
    console.error('2FA generate error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate 2FA secret'
    });
  }
};

/**
 * Verify and enable 2FA for admin
 */
exports.adminVerify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await TwoFactorService.verifyAndEnable(req.admin._id, token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log activity
    await AuditLog.create({
      adminId: req.admin._id,
      action: '2fa_enable',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { success: true }
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        backupCodes: result.backupCodes
      }
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify 2FA'
    });
  }
};

/**
 * Disable 2FA for admin
 */
exports.adminDisable2FA = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await TwoFactorService.disable(req.admin._id, token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log activity
    await AuditLog.create({
      adminId: req.admin._id,
      action: '2fa_disable',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disable 2FA'
    });
  }
};

/**
 * Regenerate backup codes for admin
 */
exports.adminRegenerateBackupCodes = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await TwoFactorService.regenerateBackupCodes(req.admin._id, token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log activity
    await AuditLog.create({
      adminId: req.admin._id,
      action: '2fa_regenerate_codes',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        backupCodes: result.backupCodes
      }
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to regenerate backup codes'
    });
  }
};

/**
 * Get 2FA status for admin
 */
exports.adminGet2FAStatus = async (req, res) => {
  try {
    const result = await TwoFactorService.getStatus(req.admin._id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get 2FA status'
    });
  }
};

// ==================== DASHBOARD STATS ====================
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Run all queries in parallel for performance
    const [
      // User stats
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalBrands,
      totalCreators,
      pendingVerifications,
      verifiedUsers,
      suspendedUsers,
      
      // Campaign stats
      totalCampaigns,
      activeCampaigns,
      pendingCampaigns,
      completedCampaigns,
      totalCampaignBudget,
      
      // Deal stats
      totalDeals,
      activeDeals,
      completedDeals,
      pendingDeals,
      disputedDeals,
      totalDealValue,
      
      // Payment stats
      totalRevenue,
      todayRevenue,
      thisMonthRevenue,
      pendingPayouts,
      totalFees,
      
      // Dispute stats
      openDisputes,
      urgentDisputes,
      
      // Withdrawal stats
      pendingWithdrawals,
      pendingWithdrawalAmount,
      
      // Featured listings
      activeFeaturedListings,
      
      // Recent activity
      recentUsers,
      recentDeals,
      recentPayments,
      recentDisputes
      
    ] = await Promise.all([
      // User stats
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ userType: 'brand' }),
      User.countDocuments({ userType: 'creator' }),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ status: 'suspended' }),
      
      // Campaign stats
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({ status: 'pending' }),
      Campaign.countDocuments({ status: 'completed' }),
      Campaign.aggregate([
        { $group: { _id: null, total: { $sum: '$budget' } } }
      ]),
      
      // Deal stats
      Deal.countDocuments(),
      Deal.countDocuments({ status: { $in: ['accepted', 'in-progress'] } }),
      Deal.countDocuments({ status: 'completed' }),
      Deal.countDocuments({ status: 'pending' }),
      Deal.countDocuments({ status: 'disputed' }),
      Deal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$budget' } } }
      ]),
      
      // Payment stats
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'pending', type: 'withdrawal' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
      ]),
      
      // Dispute stats
      Dispute.countDocuments({ status: 'open' }),
      Dispute.countDocuments({ status: 'open', priority: 'urgent' }),
      
      // Withdrawal stats
      Withdrawal.countDocuments({ status: 'pending' }),
      Withdrawal.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      // Featured listings
      FeaturedListing.countDocuments({ status: 'active' }),
      
      // Recent activity (limited to 5 each)
      User.find().sort('-createdAt').limit(5).select('fullName email userType createdAt'),
      Deal.find().populate('brandId', 'brandName').populate('creatorId', 'displayName').sort('-createdAt').limit(5),
      Payment.find().populate('from.userId', 'fullName').populate('to.userId', 'fullName').sort('-createdAt').limit(5),
      Dispute.find().populate('raisedBy.userId', 'fullName').sort('-createdAt').limit(5)
    ]);

    // Calculate derived metrics
    const userGrowth = newUsersThisMonth > 0 
      ? ((newUsersThisMonth - (await User.countDocuments({ createdAt: { $lt: startOfMonth } })) / 100)) 
      : 0;

    const completionRate = totalDeals > 0 
      ? (completedDeals / totalDeals) * 100 
      : 0;

    const disputeRate = totalDeals > 0 
      ? (openDisputes / totalDeals) * 100 
      : 0;

    // Prepare response
    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
          brands: totalBrands,
          creators: totalCreators,
          pendingVerifications,
          verified: verifiedUsers,
          suspended: suspendedUsers,
          growth: parseFloat(userGrowth.toFixed(2))
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          pending: pendingCampaigns,
          completed: completedCampaigns,
          totalBudget: totalCampaignBudget[0]?.total || 0
        },
        deals: {
          total: totalDeals,
          active: activeDeals,
          completed: completedDeals,
          pending: pendingDeals,
          disputed: disputedDeals,
          totalValue: totalDealValue[0]?.total || 0,
          completionRate: parseFloat(completionRate.toFixed(2)),
          disputeRate: parseFloat(disputeRate.toFixed(2))
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          today: todayRevenue[0]?.total || 0,
          thisMonth: thisMonthRevenue[0]?.total || 0,
          pendingPayouts: pendingPayouts[0]?.total || 0,
          fees: totalFees[0]?.total || 0
        },
        disputes: {
          open: openDisputes,
          urgent: urgentDisputes
        },
        withdrawals: {
          pending: pendingWithdrawals,
          pendingAmount: pendingWithdrawalAmount[0]?.total || 0
        },
        featured: {
          active: activeFeaturedListings
        }
      },
      recent: {
        users: recentUsers,
        deals: recentDeals,
        payments: recentPayments,
        disputes: recentDisputes
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dashboard stats'
    });
  }
};

// ==================== GET ALL USERS ====================
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      user_type, 
      status, 
      verified,
      search,
      sort_by = 'createdAt',
      sort_order = 'desc'
    } = req.query;

    const query = {};

    // Apply filters
    if (user_type) query.userType = user_type;
    if (status) query.status = status;
    if (verified !== undefined) query.isVerified = verified === 'true';

    // Search by name or email
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { handle: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    const sort = {};
    sort[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken -resetPasswordToken -emailVerificationToken -twoFactorSecret')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let stats = {};
        
        if (user.userType === 'brand') {
          const brand = await Brand.findById(user._id).lean();
          stats = {
            campaigns: brand?.stats?.totalCampaigns || 0,
            spent: brand?.stats?.totalSpent || 0,
            creators: brand?.stats?.totalCreators || 0,
            rating: brand?.stats?.averageRating || 0
          };
        } else if (user.userType === 'creator') {
          const creator = await Creator.findById(user._id).lean();
          stats = {
            earnings: creator?.stats?.totalEarnings || 0,
            campaigns: creator?.stats?.completedCampaigns || 0,
            followers: creator?.totalFollowers || 0,
            engagement: creator?.averageEngagement || 0,
            rating: creator?.stats?.averageRating || 0
          };
        }

        return {
          ...user,
          stats
        };
      })
    );

    res.json({
      success: true,
      users: usersWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get users'
    });
  }
};

// ==================== GET USER DETAILS ====================
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -refreshToken -resetPasswordToken -emailVerificationToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let profile = null;
    let activity = {};

    // Get specific profile based on user type
    if (user.userType === 'brand') {
      profile = await Brand.findById(user._id)
        .populate('teamMembers.userId', 'fullName email profilePicture')
        .lean();

      // Get brand's campaigns and deals
      const [campaigns, deals] = await Promise.all([
        Campaign.find({ brandId: user._id })
          .sort('-createdAt')
          .limit(10)
          .lean(),
        Deal.find({ brandId: user._id })
          .populate('creatorId', 'displayName handle profilePicture')
          .sort('-createdAt')
          .limit(10)
          .lean()
      ]);

      activity = { campaigns, deals };
    } 
    else if (user.userType === 'creator') {
      profile = await Creator.findById(user._id).lean();

      // Get creator's deals
      const deals = await Deal.find({ creatorId: user._id })
        .populate('brandId', 'brandName logo')
        .populate('campaignId', 'title')
        .sort('-createdAt')
        .limit(10)
        .lean();

      activity = { deals };
    }

    // Get user's payment history
    const payments = await Payment.find({
      $or: [
        { 'from.userId': user._id },
        { 'to.userId': user._id }
      ]
    })
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Get user's disputes
    const disputes = await Dispute.find({
      $or: [
        { 'raisedBy.userId': user._id },
        { 'against.userId': user._id }
      ]
    })
      .sort('-createdAt')
      .limit(5)
      .lean();

    res.json({
      success: true,
      user: {
        ...user,
        profile,
        activity,
        payments,
        disputes
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user details'
    });
  }
};

// ==================== UPDATE USER STATUS ====================
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let message = '';
    let emailSubject = '';
    let emailMessage = '';

    switch(action) {
      case 'verify':
        user.isVerified = true;
        user.verifiedAt = new Date();
        user.verifiedBy = req.user._id;
        message = 'User verified successfully';
        emailSubject = 'Account Verified - InfluenceX';
        emailMessage = `
          <h2>Account Verified</h2>
          <p>Hi ${user.fullName},</p>
          <p>Your account has been verified successfully! You now have full access to all features.</p>
        `;
        break;

      case 'unverify':
        user.isVerified = false;
        user.verifiedAt = undefined;
        user.verifiedBy = undefined;
        message = 'User unverified successfully';
        emailSubject = 'Account Verification Removed - InfluenceX';
        emailMessage = `
          <h2>Verification Removed</h2>
          <p>Hi ${user.fullName},</p>
          <p>Your account verification has been removed. Please contact support for more information.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        `;
        break;

      case 'block':
        user.status = 'suspended';
        user.suspendedAt = new Date();
        user.suspendedBy = req.user._id;
        user.suspensionReason = reason;
        message = 'User blocked successfully';
        emailSubject = 'Account Suspended - InfluenceX';
        emailMessage = `
          <h2>Account Suspended</h2>
          <p>Hi ${user.fullName},</p>
          <p>Your account has been suspended.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you believe this is a mistake, please contact support.</p>
        `;
        break;

      case 'unblock':
        user.status = 'active';
        user.suspendedAt = undefined;
        user.suspendedBy = undefined;
        user.suspensionReason = undefined;
        message = 'User unblocked successfully';
        emailSubject = 'Account Reactivated - InfluenceX';
        emailMessage = `
          <h2>Account Reactivated</h2>
          <p>Hi ${user.fullName},</p>
          <p>Your account has been reactivated. You can now log in and use the platform normally.</p>
        `;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }

    await user.save();

    // Log the action
    await AuditLog.create({
      adminId: req.user._id,
      action: `user_${action}`,
      targetUser: user._id,
      reason,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send email notification
    try {
      await sendEmail({
        email: user.email,
        subject: emailSubject,
        html: emailMessage
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    // Send in-app notification
    await notificationService.createNotification(
      user._id,
      'system',
      'Account Update',
      emailSubject,
      { action, reason }
    );

    res.json({
      success: true,
      message,
      user: {
        id: user._id,
        status: user.status,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user status'
    });
  }
};

// ==================== GET ALL DISPUTES ====================
exports.getAllDisputes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority,
      type,
      search
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.dispute_type = type;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { dispute_id: { $regex: search, $options: 'i' } }
      ];
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('raised_by.user_id', 'fullName email')
        .populate('raised_against.user_id', 'fullName email')
        .populate('deal_id')
        .populate('assigned_admin', 'fullName email')
        .sort({ priority: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Dispute.countDocuments(query)
    ]);

    res.json({
      success: true,
      disputes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all disputes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get disputes'
    });
  }
};

// ==================== ASSIGN DISPUTE ====================
exports.assignDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { admin_id } = req.body;

    const dispute = await Dispute.findById(disputeId);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    const assignedAdminId = admin_id || req.user._id;

    dispute.assigned_admin = assignedAdminId;
    dispute.status = 'investigating';
    
    // Add to timeline
    dispute.timeline.push({
      action: 'admin_assigned',
      description: `Admin assigned to dispute`,
      performed_by: {
        user_id: req.user._id,
        user_type: 'admin'
      },
      timestamp: new Date()
    });

    await dispute.save();

    // Log the action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'dispute_assigned',
      targetResource: {
        type: 'dispute',
        id: dispute._id
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Notify assigned admin
    if (assignedAdminId !== req.user._id) {
      await notificationService.createNotification(
        assignedAdminId,
        'system',
        'Dispute Assigned',
        `A dispute has been assigned to you.`,
        { disputeId: dispute._id }
      );
    }

    res.json({
      success: true,
      message: 'Dispute assigned successfully',
      dispute
    });

  } catch (error) {
    console.error('Assign dispute error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign dispute'
    });
  }
};

// ==================== RESOLVE DISPUTE ====================
exports.resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { type, amount, details } = req.body;

    const dispute = await Dispute.findById(disputeId)
      .populate('deal_id');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    // Update dispute status
    dispute.status = 'resolved';
    dispute.resolution = {
      type,
      amount: amount || 0,
      details,
      resolved_by: req.user._id,
      resolved_at: new Date()
    };

    // Add to timeline
    dispute.timeline.push({
      action: 'resolved',
      description: `Dispute resolved: ${type}`,
      performed_by: {
        user_id: req.user._id,
        user_type: 'admin'
      },
      timestamp: new Date()
    });

    await dispute.save();

    // Handle deal based on resolution type
    if (dispute.deal_id) {
      const deal = await Deal.findById(dispute.deal_id);
      
      if (deal) {
        switch(type) {
          case 'refund_brand':
            // Refund to brand
            await Payment.findOneAndUpdate(
              { dealId: deal._id },
              { 
                status: 'refunded',
                refundedAt: new Date(),
                refundReason: details
              }
            );
            deal.paymentStatus = 'refunded';
            deal.status = 'cancelled';
            break;

          case 'release_payment':
            // Release payment to creator
            await Payment.findOneAndUpdate(
              { dealId: deal._id },
              { 
                status: 'completed',
                paidAt: new Date()
              }
            );
            deal.paymentStatus = 'released';
            deal.status = 'completed';
            break;

          case 'split_funds':
            // Split funds between parties
            const splitAmount = amount || deal.budget / 2;
            // Implementation depends on payment system
            break;

          case 'cancel_contract':
            deal.status = 'cancelled';
            deal.paymentStatus = 'cancelled';
            break;
        }
        
        await deal.save();
      }
    }

    // Log the action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'dispute_resolved',
      targetResource: {
        type: 'dispute',
        id: dispute._id
      },
      changes: { resolution: { type, amount, details } },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Notify both parties
    const parties = [dispute.raised_by.user_id, dispute.raised_against.user_id];
    for (const userId of parties) {
      await notificationService.createNotification(
        userId,
        'system',
        'Dispute Resolved',
        `The dispute has been resolved. Resolution: ${type}`,
        { disputeId: dispute._id }
      );
    }

    res.json({
      success: true,
      message: 'Dispute resolved successfully',
      dispute
    });

  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve dispute'
    });
  }
};

// ==================== GET PENDING WITHDRAWALS ====================
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' })
      .populate('userId', 'fullName email')
      .populate('bankAccountId')
      .sort('-requestedAt')
      .lean();

    // Calculate total amount
    const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    res.json({
      success: true,
      withdrawals,
      summary: {
        count: withdrawals.length,
        totalAmount
      }
    });

  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending withdrawals'
    });
  }
};

// ==================== APPROVE WITHDRAWAL ====================
exports.approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { transaction_id, notes } = req.body;

    const withdrawal = await Withdrawal.findById(withdrawalId)
      .populate('userId', 'fullName email');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Withdrawal is already ${withdrawal.status}`
      });
    }

    // Update withdrawal status
    withdrawal.status = 'completed';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    withdrawal.transactionId = transaction_id;
    withdrawal.adminNotes = notes;
    await withdrawal.save();

    // Update user's balance
    const user = await User.findById(withdrawal.userId);
    if (user) {
      user.balance = (user.balance || 0) - withdrawal.amount;
      await user.save();
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { transactionId: withdrawal.transactionId },
      { 
        status: 'completed',
        completedAt: new Date()
      }
    );

    // Log the action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'withdrawal_approved',
      targetUser: withdrawal.userId,
      metadata: {
        amount: withdrawal.amount,
        transactionId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Notify user
    await notificationService.createNotification(
      withdrawal.userId,
      'payment',
      'Withdrawal Approved',
      `Your withdrawal of $${withdrawal.amount} has been approved and processed.`,
      { withdrawalId: withdrawal._id }
    );

    // Send email
    try {
      await sendEmail({
        email: withdrawal.userId.email,
        subject: 'Withdrawal Approved - InfluenceX',
        html: `
          <h2>Withdrawal Approved</h2>
          <p>Hi ${withdrawal.userId.fullName},</p>
          <p>Your withdrawal request for <strong>$${withdrawal.amount}</strong> has been approved and processed.</p>
          <p><strong>Transaction ID:</strong> ${transaction_id}</p>
          <p>Funds should appear in your account within 2-3 business days.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    res.json({
      success: true,
      message: 'Withdrawal approved successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve withdrawal'
    });
  }
};

// ==================== GET PLATFORM ANALYTICS ====================
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    let startDate = start_date ? new Date(start_date) : new Date();
    let endDate = end_date ? new Date(end_date) : new Date();

    if (!start_date) {
      startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
    }

    // User growth analytics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          brands: {
            $sum: { $cond: [{ $eq: ['$userType', 'brand'] }, 1, 0] }
          },
          creators: {
            $sum: { $cond: [{ $eq: ['$userType', 'creator'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Revenue analytics
    const revenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          amount: { $sum: '$amount' },
          fees: { $sum: '$fee' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Campaign performance
    const campaignPerformance = await Campaign.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' }
        }
      }
    ]);

    // Deal performance
    const dealPerformance = await Deal.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$budget' }
        }
      }
    ]);

    // Top brands by spend
    const topBrands = await Deal.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$brandId',
          totalSpent: { $sum: '$budget' },
          deals: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'brands',
          localField: '_id',
          foreignField: '_id',
          as: 'brand'
        }
      },
      { $unwind: '$brand' },
      {
        $project: {
          brandName: '$brand.brandName',
          logo: '$brand.logo',
          totalSpent: 1,
          deals: 1
        }
      }
    ]);

    // Top creators by earnings
    const topCreators = await Deal.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$creatorId',
          totalEarned: { $sum: '$netAmount' },
          deals: { $sum: 1 }
        }
      },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'creators',
          localField: '_id',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: '$creator' },
      {
        $project: {
          displayName: '$creator.displayName',
          handle: '$creator.handle',
          profilePicture: '$creator.profilePicture',
          totalEarned: 1,
          deals: 1
        }
      }
    ]);

    // Platform distribution
    const platformDistribution = await Deal.aggregate([
      { $unwind: '$deliverables' },
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$deliverables.platform',
          deals: { $sum: 1 },
          spend: { $sum: '$deliverables.budget' }
        }
      },
      { $sort: { spend: -1 } }
    ]);

    // Calculate summary statistics
    const summary = {
      totalUsers: await User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      totalRevenue: revenue.reduce((sum, r) => sum + r.amount, 0),
      totalFees: revenue.reduce((sum, r) => sum + r.fees, 0),
      totalCampaigns: campaignPerformance.reduce((sum, c) => sum + c.count, 0),
      totalDeals: dealPerformance.reduce((sum, d) => sum + d.count, 0),
      avgDealValue: dealPerformance.reduce((sum, d) => sum + d.totalValue, 0) / (dealPerformance.reduce((sum, d) => sum + d.count, 0) || 1)
    };

    res.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate
        },
        summary,
        userGrowth,
        revenue,
        campaignPerformance,
        dealPerformance,
        topBrands,
        topCreators,
        platformDistribution
      }
    });

  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get analytics'
    });
  }
};

// ==================== UPDATE SETTINGS ====================
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
    }

    // Update settings
    Object.assign(settings, updates);
    settings.updatedBy = req.user._id;
    settings.updatedAt = new Date();
    
    await settings.save();

    // Log the action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'settings_updated',
      changes: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // If maintenance mode changed, notify all admins
    if (updates.maintenance?.enabled !== undefined) {
      const admins = await User.find({ userType: 'admin' });
      
      for (const admin of admins) {
        await notificationService.createNotification(
          admin._id,
          'system',
          updates.maintenance.enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
          updates.maintenance.enabled 
            ? `Platform is now in maintenance mode. Message: ${updates.maintenance.message || 'No message'}`
            : 'Platform is now out of maintenance mode.',
          { maintenance: updates.maintenance }
        );
      }
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update settings'
    });
  }
};

// ==================== GET ACTIVITY LOG ====================
exports.getActivityLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, admin_id } = req.query;

    const query = {};
    if (admin_id) query.adminId = admin_id;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('adminId', 'fullName email')
        .populate('targetUser', 'fullName email')
        .sort('-createdAt')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    // Get summary statistics
    const summary = await AuditLog.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      logs,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get activity log'
    });
  }
};

// ==================== GET SYSTEM HEALTH ====================
exports.getSystemHealth = async (req, res) => {
  try {
    const start = Date.now();

    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
    
    // Check Redis connection (if configured)
    let redisStatus = 'not_configured';
    try {
      const redis = require('../../config/redis');
      if (redis.getRedisClient()) {
        await redis.getRedisClient().ping();
        redisStatus = 'healthy';
      }
    } catch (error) {
      redisStatus = 'unhealthy';
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    // Get CPU usage
    const cpuUsage = process.cpuUsage();

    // Get uptime
    const uptime = process.uptime();

    // Get active connections
    const activeConnections = mongoose.connection.base?.connections?.length || 0;

    // Calculate response time
    const responseTime = Date.now() - start;

    // Get queue stats (if using Bull)
    let queueStats = {};
    try {
      const Queue = require('bull');
      const emailQueue = new Queue('email');
      const notificationQueue = new Queue('notification');
      
      const [emailCount, notificationCount] = await Promise.all([
        emailQueue.count(),
        notificationQueue.count()
      ]);

      queueStats = {
        email: emailCount,
        notification: notificationCount
      };
    } catch (error) {
      queueStats = { error: 'Queue not configured' };
    }

    res.json({
      success: true,
      status: dbStatus === 'healthy' && redisStatus !== 'unhealthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 3600) + 'h ' + Math.floor((uptime % 3600) / 60) + 'm',
      responseTime: responseTime + 'ms',
      database: {
        status: dbStatus,
        connections: activeConnections,
        name: mongoose.connection.name
      },
      redis: {
        status: redisStatus
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
      },
      cpu: {
        user: cpuUsage.user / 1000 + 'ms',
        system: cpuUsage.system / 1000 + 'ms'
      },
      queues: queueStats
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get system health'
    });
  }
};

// ==================== CLEAR CACHE ====================
exports.clearCache = async (req, res) => {
  try {
    const { type = 'all' } = req.body;

    const cacheService = require('../../services/cacheService');
    
    let cleared = false;

    switch(type) {
      case 'all':
        await cacheService.flush();
        cleared = true;
        break;
      case 'users':
        await cacheService.delPattern('user:*');
        cleared = true;
        break;
      case 'campaigns':
        await cacheService.delPattern('campaign:*');
        cleared = true;
        break;
      case 'deals':
        await cacheService.delPattern('deal:*');
        cleared = true;
        break;
      case 'search':
        await cacheService.delPattern('search:*');
        cleared = true;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid cache type'
        });
    }

    // Log the action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'cache_cleared',
      metadata: { type },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Cache cleared successfully (${type})`,
      cleared
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache'
    });
  }
};

// ==================== GET BACKUP STATUS ====================
exports.getBackupStatus = async (req, res) => {
  try {
    const backupService = require('../../services/backupService');
    
    const [backups, stats] = await Promise.all([
      backupService.listBackups(),
      backupService.getStats()
    ]);

    res.json({
      success: true,
      backups: backups.backups.slice(0, 10), // Last 10 backups
      stats
    });

  } catch (error) {
    console.error('Get backup status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get backup status'
    });
  }
};

// ==================== CREATE BACKUP ====================
exports.createBackup = async (req, res) => {
  try {
    const { type = 'full' } = req.body;

    const backupService = require('../../services/backupService');
    
    const result = await backupService.createBackup({ type });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Log the action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'backup_created',
      metadata: { type, filename: result.filename },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: result
    });

  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create backup'
    });
  }
};

// ==================== RESTORE BACKUP ====================
exports.restoreBackup = async (req, res) => {
  try {
    const { filename } = req.body;

    const backupService = require('../../services/backupService');
    const backupPath = require('path').join(backupService.backupDir, filename);

    const result = await backupService.restoreBackup(backupPath);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Log the action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'backup_restored',
      metadata: { filename },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Backup restored successfully',
      result
    });

  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to restore backup'
    });
  }
};