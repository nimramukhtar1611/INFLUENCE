// controllers/affiliateController.js
const Referral = require('../models/Referral');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Withdrawal = require('../models/Withdrawal');
const Notification = require('../models/Notification');
const EmailService = require('../services/emailService');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const { catchAsync } = require('../utils/catchAsync');

// ==================== REFERRAL LINK CREATION ====================

/**
 * Create referral link
 * @route POST /api/affiliate/create-link
 * @access Private
 */
exports.createReferralLink = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { email, commission_structure } = req.body;

  // Check if user is allowed to refer (minimum requirements)
  const user = await User.findById(req.user._id);
  
  // Check if user has completed minimum requirements
  const canRefer = await checkUserReferralEligibility(req.user._id);
  if (!canRefer.eligible) {
    return res.status(400).json({
      success: false,
      error: canRefer.reason
    });
  }

  // Check if referral already exists for this email
  const existingReferral = await Referral.findOne({
    referrer_id: req.user._id,
    referred_email: email,
    status: { $in: ['pending', 'active'] }
  });

  if (existingReferral) {
    return res.status(400).json({
      success: false,
      error: 'Referral already sent to this email'
    });
  }

  // Generate unique referral code
  const referralCode = generateReferralCode(req.user._id);

  // Create referral
  const referral = await Referral.create({
    referral_id: `REF-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    referrer_id: req.user._id,
    referrer_type: req.user.userType,
    referral_code: referralCode,
    referral_link: `${process.env.FRONTEND_URL}/signup?ref=${referralCode}`,
    referred_email: email,
    commission_structure: commission_structure || getDefaultCommissionStructure(req.user.userType),
    status: 'pending',
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
    expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  });

  // Send referral email
  await sendReferralEmail(email, user, referral);

  res.status(201).json({
    success: true,
    message: 'Referral link created and email sent',
    data: {
      referral_id: referral.referral_id,
      referral_link: referral.referral_link,
      referral_code: referral.referral_code,
      expires_at: referral.expiry_date
    }
  });
});

// ==================== TRACK REFERRAL CLICK ====================

/**
 * Track referral click
 * @route GET /api/affiliate/track/:code
 * @access Public
 */
exports.trackReferralClick = catchAsync(async (req, res) => {
  const { code } = req.params;

  const referral = await Referral.findOne({ referral_code: code });

  if (!referral) {
    return res.status(404).json({
      success: false,
      error: 'Invalid referral code'
    });
  }

  // Check if expired
  if (referral.expiry_date < new Date()) {
    referral.status = 'expired';
    await referral.save();
    
    return res.status(410).json({
      success: false,
      error: 'Referral link has expired'
    });
  }

  // Check if already converted (prevent multiple signups)
  if (referral.status === 'converted' || referral.status === 'active') {
    return res.redirect(`${process.env.FRONTEND_URL}/signup?ref=${code}&already_used=true`);
  }

  // Record click
  await referral.recordClick(req.ip, req.get('User-Agent'));

  // Set cookie for tracking
  res.cookie('referral_code', code, {
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  // Redirect to signup page with referral code
  res.redirect(`${process.env.FRONTEND_URL}/signup?ref=${code}`);
});

// ==================== GET REFERRAL STATS ====================

/**
 * Get referral stats
 * @route GET /api/affiliate/stats
 * @access Private
 */
exports.getReferralStats = catchAsync(async (req, res) => {
  const referrals = await Referral.find({ referrer_id: req.user._id })
    .sort('-created_at');

  // Calculate stats
  const stats = {
    total_referrals: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    clicked: referrals.filter(r => r.status === 'clicked').length,
    converted: referrals.filter(r => r.status === 'converted').length,
    active: referrals.filter(r => r.status === 'active').length,
    total_earned: referrals.reduce((sum, r) => sum + (r.total_earned || 0), 0),
    pending_earnings: referrals.reduce((sum, r) => sum + (r.pending_earnings || 0), 0),
    paid_earnings: referrals.reduce((sum, r) => sum + (r.paid_earnings || 0), 0),
    total_clicks: referrals.reduce((sum, r) => sum + (r.referral_stats?.clicks || 0), 0),
    conversion_rate: referrals.length > 0 
      ? (referrals.filter(r => r.status === 'active').length / referrals.length * 100).toFixed(1)
      : 0
  };

  // Get milestone progress
  const milestones = [
    { name: 'First Referral', threshold: 1, current: stats.active, bonus: 50 },
    { name: '5 Referrals', threshold: 5, current: stats.active, bonus: 100 },
    { name: '10 Referrals', threshold: 10, current: stats.active, bonus: 250 },
    { name: '25 Referrals', threshold: 25, current: stats.active, bonus: 500 },
    { name: '50 Referrals', threshold: 50, current: stats.active, bonus: 1000 }
  ].map(m => ({
    ...m,
    achieved: m.current >= m.threshold,
    progress: Math.min(100, (m.current / m.threshold) * 100)
  }));

  // Get recent referrals
  const recent = referrals.slice(0, 5).map(r => ({
    email: r.referred_email,
    status: r.status,
    date: r.created_at,
    earnings: r.total_earned
  }));

  res.json({
    success: true,
    data: {
      stats,
      milestones,
      recent
    }
  });
});

// ==================== GET COMMISSIONS ====================

/**
 * Get commission history
 * @route GET /api/affiliate/commissions
 * @access Private
 */
exports.getCommissions = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const referrals = await Referral.find({ 
    referrer_id: req.user._id,
    'commissions.0': { $exists: true }
  });

  // Flatten all commissions
  let commissions = [];
  referrals.forEach(referral => {
    referral.commissions.forEach(commission => {
      commissions.push({
        ...commission.toObject(),
        referral_id: referral._id,
        referred_email: referral.referred_email,
        referral_code: referral.referral_code
      });
    });
  });

  // Filter by status
  if (status) {
    commissions = commissions.filter(c => c.status === status);
  }

  // Sort by date (newest first)
  commissions.sort((a, b) => new Date(b.created_at || b.requested_at) - new Date(a.created_at || a.requested_at));

  // Paginate
  const startIndex = (page - 1) * limit;
  const paginatedCommissions = commissions.slice(startIndex, startIndex + parseInt(limit));

  // Calculate summaries
  const summary = {
    total: commissions.reduce((sum, c) => sum + c.amount, 0),
    pending: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
    approved: commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0),
    paid: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
  };

  res.json({
    success: true,
    data: {
      commissions: paginatedCommissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: commissions.length,
        pages: Math.ceil(commissions.length / limit)
      },
      summary
    }
  });
});

// ==================== GET REFERRALS ====================

/**
 * Get all referrals
 * @route GET /api/affiliate/referrals
 * @access Private
 */
exports.getReferrals = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { referrer_id: req.user._id };
  if (status) query.status = status;

  const referrals = await Referral.find(query)
    .sort({ created_at: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Referral.countDocuments(query);

  res.json({
    success: true,
    data: referrals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// ==================== GET REFERRAL DETAILS ====================

/**
 * Get single referral details
 * @route GET /api/affiliate/referrals/:referralId
 * @access Private
 */
exports.getReferralDetails = catchAsync(async (req, res) => {
  const { referralId } = req.params;

  const referral = await Referral.findOne({
    _id: referralId,
    referrer_id: req.user._id
  }).populate('referred_user_id', 'fullName email userType createdAt');

  if (!referral) {
    return res.status(404).json({
      success: false,
      error: 'Referral not found'
    });
  }

  res.json({
    success: true,
    data: referral
  });
});

// ==================== WITHDRAW EARNINGS ====================

/**
 * Request withdrawal of earnings
 * @route POST /api/affiliate/withdraw
 * @access Private
 */
exports.withdrawEarnings = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { amount, payment_method } = req.body;

  // Get pending earnings
  const referrals = await Referral.find({ referrer_id: req.user._id });
  const pendingEarnings = referrals.reduce((sum, r) => sum + r.pending_earnings, 0);

  if (pendingEarnings < amount) {
    return res.status(400).json({
      success: false,
      error: `Insufficient balance. Available: $${pendingEarnings.toFixed(2)}`
    });
  }

  if (amount < 50) {
    return res.status(400).json({
      success: false,
      error: 'Minimum withdrawal amount is $50'
    });
  }

  // Get user's payment method
  let paymentMethodDetails;
  if (payment_method === 'paypal') {
    const user = await User.findById(req.user._id);
    const paypalMethod = user.paymentMethods?.find(m => m.type === 'paypal' && m.isDefault);
    if (!paypalMethod) {
      return res.status(400).json({
        success: false,
        error: 'No default PayPal payment method found'
      });
    }
    paymentMethodDetails = {
      paypalEmail: paypalMethod.paypalEmail
    };
  }

  // Calculate fee (if any)
  const fee = calculateWithdrawalFee(amount, payment_method);
  const netAmount = amount - fee;

  // Create withdrawal request
  const withdrawal = await Withdrawal.create({
    withdrawalId: `WTH-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    userId: req.user._id,
    amount,
    fee,
    netAmount,
    paymentMethod: {
      type: payment_method,
      details: paymentMethodDetails
    },
    status: 'pending',
    userNotes: req.body.notes,
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // Notify admins
  const admins = await User.find({ userType: 'admin' });
  for (const admin of admins) {
    await Notification.create({
      userId: admin._id,
      type: 'payment',
      title: 'New Withdrawal Request',
      message: `Withdrawal request for $${amount} from ${req.user.fullName}`,
      data: { withdrawalId: withdrawal._id }
    });
  }

  res.json({
    success: true,
    message: 'Withdrawal request submitted',
    data: withdrawal
  });
});

// ==================== GET WITHDRAWALS ====================

/**
 * Get withdrawal history
 * @route GET /api/affiliate/withdrawals
 * @access Private
 */
exports.getWithdrawals = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const withdrawals = await Withdrawal.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Withdrawal.countDocuments({ userId: req.user._id });

  res.json({
    success: true,
    data: withdrawals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// ==================== PAYOUT METHODS ====================

/**
 * Add payout method
 * @route POST /api/affiliate/payout-methods
 * @access Private
 */
exports.addPayoutMethod = catchAsync(async (req, res) => {
  const { type, details } = req.body;

  const user = await User.findById(req.user._id);

  if (!user.paymentMethods) {
    user.paymentMethods = [];
  }

  // Validate based on type
  if (type === 'paypal') {
    if (!details.paypalEmail || !isValidEmail(details.paypalEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Valid PayPal email is required'
      });
    }
  } else if (type === 'bank_account') {
    if (!details.bankName || !details.accountNumber || !details.routingNumber) {
      return res.status(400).json({
        success: false,
        error: 'Bank name, account number, and routing number are required'
      });
    }
  }

  const newMethod = {
    _id: new mongoose.Types.ObjectId(),
    type,
    ...details,
    isDefault: user.paymentMethods.length === 0, // First method is default
    createdAt: new Date()
  };

  user.paymentMethods.push(newMethod);
  await user.save();

  res.json({
    success: true,
    message: 'Payout method added',
    data: newMethod
  });
});

/**
 * Get payout methods
 * @route GET /api/affiliate/payout-methods
 * @access Private
 */
exports.getPayoutMethods = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('paymentMethods');
  
  res.json({
    success: true,
    data: user?.paymentMethods || []
  });
});

/**
 * Delete payout method
 * @route DELETE /api/affiliate/payout-methods/:methodId
 * @access Private
 */
exports.deletePayoutMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;

  const user = await User.findById(req.user._id);
  
  const methodIndex = user.paymentMethods.findIndex(m => m._id.toString() === methodId);
  
  if (methodIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Payment method not found'
    });
  }

  const wasDefault = user.paymentMethods[methodIndex].isDefault;

  // Remove method
  user.paymentMethods.splice(methodIndex, 1);

  // If removed method was default and there are other methods, make first one default
  if (wasDefault && user.paymentMethods.length > 0) {
    user.paymentMethods[0].isDefault = true;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Payment method deleted'
  });
});

/**
 * Set default payout method
 * @route POST /api/affiliate/payout-methods/:methodId/default
 * @access Private
 */
exports.setDefaultPayoutMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;

  const user = await User.findById(req.user._id);

  // Remove default from all
  user.paymentMethods.forEach(m => m.isDefault = false);

  // Set new default
  const method = user.paymentMethods.find(m => m._id.toString() === methodId);
  if (!method) {
    return res.status(404).json({
      success: false,
      error: 'Payment method not found'
    });
  }

  method.isDefault = true;
  await user.save();

  res.json({
    success: true,
    message: 'Default payout method updated',
    data: method
  });
});

// ==================== ADMIN ROUTES ====================

/**
 * Get all referrals (admin)
 * @route GET /api/affiliate/admin/all
 * @access Private/Admin
 */
exports.adminGetAllReferrals = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = {};
  if (status) query.status = status;

  const referrals = await Referral.find(query)
    .populate('referrer_id', 'fullName email')
    .populate('referred_user_id', 'fullName email')
    .sort({ created_at: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Referral.countDocuments(query);

  res.json({
    success: true,
    data: referrals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get affiliate stats (admin)
 * @route GET /api/affiliate/admin/stats
 * @access Private/Admin
 */
exports.adminGetStats = catchAsync(async (req, res) => {
  const stats = await Referral.aggregate([
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        totalClicks: { $sum: '$referral_stats.clicks' },
        totalSignups: { $sum: '$referral_stats.signups' },
        totalConversions: { $sum: '$referral_stats.conversions' },
        totalEarned: { $sum: '$total_earned' },
        pendingEarnings: { $sum: '$pending_earnings' },
        paidEarnings: { $sum: '$paid_earnings' }
      }
    }
  ]);

  const byStatus = await Referral.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      overall: stats[0] || {
        totalReferrals: 0,
        totalClicks: 0,
        totalSignups: 0,
        totalConversions: 0,
        totalEarned: 0,
        pendingEarnings: 0,
        paidEarnings: 0
      },
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    }
  });
});

/**
 * Approve commission (admin)
 * @route POST /api/affiliate/admin/commissions/:commissionId/approve
 * @access Private/Admin
 */
exports.adminApproveCommission = catchAsync(async (req, res) => {
  const { commissionId } = req.params;
  const { transaction_id } = req.body;

  // Find referral containing this commission
  const referral = await Referral.findOne({ 'commissions._id': commissionId });

  if (!referral) {
    return res.status(404).json({
      success: false,
      error: 'Commission not found'
    });
  }

  await referral.approveCommission(commissionId);

  // If transaction ID provided, mark as paid
  if (transaction_id) {
    await referral.markCommissionPaid(commissionId, transaction_id);
  }

  // Notify user
  await Notification.create({
    userId: referral.referrer_id,
    type: 'payment',
    title: 'Commission Approved',
    message: `Your commission has been approved and will be paid soon.`,
    data: { referralId: referral._id }
  });

  res.json({
    success: true,
    message: 'Commission approved'
  });
});

/**
 * Reject commission (admin)
 * @route POST /api/affiliate/admin/commissions/:commissionId/reject
 * @access Private/Admin
 */
exports.adminRejectCommission = catchAsync(async (req, res) => {
  const { commissionId } = req.params;
  const { reason } = req.body;

  const referral = await Referral.findOne({ 'commissions._id': commissionId });

  if (!referral) {
    return res.status(404).json({
      success: false,
      error: 'Commission not found'
    });
  }

  const commission = referral.commissions.id(commissionId);
  if (commission) {
    commission.status = 'cancelled';
    commission.cancellationReason = reason;
    
    // Update earnings totals
    referral.pending_earnings -= commission.amount;
    referral.total_earned -= commission.amount;
    
    await referral.save();
  }

  // Notify user
  await Notification.create({
    userId: referral.referrer_id,
    type: 'alert',
    title: 'Commission Rejected',
    message: `Your commission has been rejected. Reason: ${reason}`,
    data: { referralId: referral._id }
  });

  res.json({
    success: true,
    message: 'Commission rejected'
  });
});

/**
 * Process withdrawal (admin)
 * @route POST /api/affiliate/admin/withdrawals/:withdrawalId/process
 * @access Private/Admin
 */
exports.adminProcessWithdrawal = catchAsync(async (req, res) => {
  const { withdrawalId } = req.params;
  const { status, notes } = req.body;

  const withdrawal = await Withdrawal.findById(withdrawalId)
    .populate('userId', 'fullName email');

  if (!withdrawal) {
    return res.status(404).json({
      success: false,
      error: 'Withdrawal not found'
    });
  }

  if (status === 'approved') {
    withdrawal.status = 'processing';
    withdrawal.approvedBy = req.user._id;
    withdrawal.approvedAt = new Date();
    withdrawal.adminNotes = notes;
  } else if (status === 'rejected') {
    withdrawal.status = 'rejected';
    withdrawal.rejectedBy = req.user._id;
    withdrawal.rejectedAt = new Date();
    withdrawal.rejectionReason = notes;
  } else if (status === 'processed') {
    withdrawal.status = 'completed';
    withdrawal.processedBy = req.user._id;
    withdrawal.completedAt = new Date();
    withdrawal.transactionId = `TXN-${Date.now()}`;
    withdrawal.adminNotes = notes;
  }

  await withdrawal.save();

  // Notify user
  let title, message;
  if (status === 'approved') {
    title = 'Withdrawal Approved';
    message = 'Your withdrawal request has been approved and is being processed.';
  } else if (status === 'rejected') {
    title = 'Withdrawal Rejected';
    message = `Your withdrawal request has been rejected. Reason: ${notes}`;
  } else if (status === 'processed') {
    title = 'Withdrawal Processed';
    message = 'Your withdrawal has been processed successfully.';
  }

  await Notification.create({
    userId: withdrawal.userId._id,
    type: 'payment',
    title,
    message,
    data: { withdrawalId: withdrawal._id }
  });

  res.json({
    success: true,
    message: `Withdrawal ${status}`,
    data: withdrawal
  });
});

/**
 * Get pending payouts (admin)
 * @route GET /api/affiliate/admin/payouts/pending
 * @access Private/Admin
 */
exports.adminGetPendingPayouts = catchAsync(async (req, res) => {
  const pendingWithdrawals = await Withdrawal.find({ 
    status: { $in: ['pending', 'processing'] } 
  })
    .populate('userId', 'fullName email')
    .sort({ requestedAt: 1 });

  const totalAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  res.json({
    success: true,
    data: {
      count: pendingWithdrawals.length,
      totalAmount,
      withdrawals: pendingWithdrawals
    }
  });
});

/**
 * Update affiliate settings (admin)
 * @route POST /api/affiliate/admin/settings
 * @access Private/Admin (Super Admin only)
 */
exports.adminUpdateSettings = catchAsync(async (req, res) => {
  const { commission_rates, minimum_payout, cookie_duration } = req.body;

  // This would update a settings collection
  // For now, just acknowledge

  res.json({
    success: true,
    message: 'Affiliate settings updated',
    data: {
      commission_rates,
      minimum_payout,
      cookie_duration
    }
  });
});

/**
 * Export affiliate data (admin)
 * @route GET /api/affiliate/admin/export
 * @access Private/Admin
 */
exports.adminExportData = catchAsync(async (req, res) => {
  const { format = 'json', start_date, end_date } = req.query;

  const query = {};
  if (start_date || end_date) {
    query.created_at = {};
    if (start_date) query.created_at.$gte = new Date(start_date);
    if (end_date) query.created_at.$lte = new Date(end_date);
  }

  const referrals = await Referral.find(query)
    .populate('referrer_id', 'fullName email')
    .populate('referred_user_id', 'fullName email')
    .sort({ created_at: -1 });

  if (format === 'json') {
    return res.json({
      success: true,
      data: referrals
    });
  }

  if (format === 'csv') {
    const csvData = referrals.map(r => ({
      'Referral ID': r.referral_id,
      'Referrer Name': r.referrer_id?.fullName,
      'Referrer Email': r.referrer_id?.email,
      'Referred Email': r.referred_email,
      'Status': r.status,
      'Created At': r.created_at,
      'Total Earned': r.total_earned,
      'Clicks': r.referral_stats?.clicks || 0,
      'Conversions': r.referral_stats?.conversions || 0
    }));

    const json2csv = require('json2csv').parse;
    const csv = json2csv(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=affiliate-data.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: referrals
  });
});

// ==================== WEBHOOK ====================

/**
 * Signup webhook
 * @route POST /api/affiliate/webhook/signup
 * @access Public
 */
exports.signupWebhook = catchAsync(async (req, res) => {
  const { user_id, referral_code, user_type } = req.body;

  const referral = await Referral.findOne({ referral_code });

  if (referral && referral.status === 'pending') {
    await referral.markConverted(user_id, user_type);

    // Check milestones
    await referral.checkMilestones();

    // Notify referrer
    await Notification.create({
      userId: referral.referrer_id,
      type: 'system',
      title: 'Referral Signed Up!',
      message: `${req.body.email || 'Someone'} signed up using your referral link!`,
      data: { referralId: referral._id }
    });
  }

  res.json({ success: true });
});

// ==================== PUBLIC ROUTES ====================

/**
 * Get affiliate program terms
 * @route GET /api/affiliate/terms
 * @access Public
 */
exports.getTerms = catchAsync(async (req, res) => {
  const terms = {
    commission_rates: {
      tier_1: '10% on first $1,000',
      tier_2: '15% on $1,001 - $5,000',
      tier_3: '20% on $5,000+'
    },
    milestones: [
      { name: 'First Referral', bonus: '$50' },
      { name: '5 Referrals', bonus: '$100' },
      { name: '10 Referrals', bonus: '$250' },
      { name: '25 Referrals', bonus: '$500' },
      { name: '50 Referrals', bonus: '$1,000' }
    ],
    payout_threshold: '$50',
    payout_methods: ['PayPal', 'Bank Transfer', 'Stripe'],
    cookie_duration: '90 days',
    terms_link: `${process.env.FRONTEND_URL}/affiliate-terms`
  };

  res.json({
    success: true,
    data: terms
  });
});

/**
 * Get leaderboard
 * @route GET /api/affiliate/leaderboard
 * @access Public
 */
exports.getLeaderboard = catchAsync(async (req, res) => {
  const { period = 'all', limit = 10 } = req.query;

  const dateFilter = {};
  if (period === 'month') {
    dateFilter.created_at = { $gte: new Date(new Date().setDate(1)) };
  } else if (period === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    dateFilter.created_at = { $gte: weekAgo };
  }

  const leaderboard = await Referral.aggregate([
    { $match: { status: { $ne: 'fraud' }, ...dateFilter } },
    {
      $group: {
        _id: '$referrer_id',
        total_referrals: { $sum: 1 },
        conversions: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        total_earned: { $sum: '$total_earned' }
      }
    },
    { $sort: { total_earned: -1, conversions: -1 } },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        'user.fullName': 1,
        'user.profilePicture': 1,
        total_referrals: 1,
        conversions: 1,
        total_earned: 1
      }
    }
  ]);

  res.json({
    success: true,
    data: leaderboard
  });
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user is eligible to refer others
 */
async function checkUserReferralEligibility(userId) {
  const user = await User.findById(userId);
  
  // Check if user has completed profile
  if (!user.fullName || !user.emailVerified) {
    return {
      eligible: false,
      reason: 'Please complete your profile and verify your email first.'
    };
  }

  // Check if user has completed at least one deal (for creators/brands)
  if (user.userType === 'creator') {
    const completedDeals = await mongoose.model('Deal').countDocuments({
      creatorId: userId,
      status: 'completed'
    });
    
    if (completedDeals === 0) {
      return {
        eligible: false,
        reason: 'You need to complete at least one deal before referring others.'
      };
    }
  } else if (user.userType === 'brand') {
    const campaigns = await mongoose.model('Campaign').countDocuments({
      brandId: userId
    });
    
    if (campaigns === 0) {
      return {
        eligible: false,
        reason: 'You need to create at least one campaign before referring others.'
      };
    }
  }

  return { eligible: true };
}

/**
 * Generate unique referral code
 */
function generateReferralCode(userId) {
  const userIdPart = userId.toString().slice(-6).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${userIdPart}${random}`;
}

/**
 * Get default commission structure based on user type
 */
function getDefaultCommissionStructure(userType) {
  return {
    type: 'percentage',
    rate: 10,
    tiers: [
      { level: 1, threshold: 0, rate: 10 },
      { level: 2, threshold: 1000, rate: 15 },
      { level: 3, threshold: 5000, rate: 20 }
    ]
  };
}

/**
 * Calculate withdrawal fee
 */
function calculateWithdrawalFee(amount, method) {
  const fees = {
    paypal: amount * 0.02, // 2%
    bank_account: 0,
    stripe: amount * 0.029 + 0.3
  };
  return fees[method] || 0;
}

/**
 * Validate email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Send referral email
 */
async function sendReferralEmail(email, referrer, referral) {
  const emailData = {
    to: email,
    subject: `${referrer.fullName} invited you to join InfluenceX!`,
    template: 'referralInvitation',
    data: {
      referrerName: referrer.fullName,
      referralLink: referral.referral_link,
      bonusAmount: '$50', // First signup bonus
      expiresIn: '90 days'
    }
  };

  await EmailService.sendEmail(emailData);
}