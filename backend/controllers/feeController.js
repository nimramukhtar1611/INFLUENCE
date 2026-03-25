// controllers/feeController.js
const Fee = require('../models/Fee');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const subscriptionPlans = require('../config/subscriptionPlans');
const asyncHandler = require('express-async-handler');

// @desc    Calculate platform fees for a deal
// @route   POST /api/fees/calculate
// @access  Private
const calculateFees = asyncHandler(async (req, res) => {
  const { amount, userType, planId = 'free' } = req.body;

  // Get base commission rate
  let commissionRate = subscriptionPlans.commissions.default;
  
  // Adjust based on plan
  if (planId === 'professional') {
    commissionRate = subscriptionPlans.commissions.premium;
  } else if (planId === 'enterprise') {
    commissionRate = subscriptionPlans.commissions.enterprise;
  }

  // Calculate platform fee
  const platformFee = (amount * commissionRate) / 100;

  // Calculate transaction fees (Stripe)
  const stripeFee = (amount * subscriptionPlans.transactionFees.stripe) / 100 + 
                    subscriptionPlans.transactionFees.stripeFixed;

  // Total fees
  const totalFees = platformFee + stripeFee;

  // Net amount for creator
  const netAmount = amount - totalFees;

  // Breakdown
  const breakdown = {
    originalAmount: amount,
    platformFee: {
      rate: commissionRate,
      amount: platformFee
    },
    transactionFee: {
      rate: subscriptionPlans.transactionFees.stripe,
      fixed: subscriptionPlans.transactionFees.stripeFixed,
      amount: stripeFee
    },
    totalFees,
    netAmount
  };

  res.json({
    success: true,
    fees: breakdown
  });
});

// @desc    Apply platform fees to a deal
// @route   POST /api/fees/apply
// @access  Private/Admin
const applyFees = asyncHandler(async (req, res) => {
  const { dealId } = req.body;

  const deal = await Deal.findById(dealId)
    .populate('brandId')
    .populate('creatorId');

  if (!deal) {
    res.status(404);
    throw new Error('Deal not found');
  }

  // Get user plans
  const brandPlan = await Subscription.findOne({ userId: deal.brandId._id }) || { planId: 'free' };
  const creatorPlan = await Subscription.findOne({ userId: deal.creatorId._id }) || { planId: 'free' };

  // Calculate fees
  const commissionRate = subscriptionPlans.commissions[brandPlan.planId] || 
                        subscriptionPlans.commissions.default;

  const platformFee = (deal.budget * commissionRate) / 100;
  const stripeFee = (deal.budget * subscriptionPlans.transactionFees.stripe) / 100 + 
                    subscriptionPlans.transactionFees.stripeFixed;
  const totalFees = platformFee + stripeFee;
  const netAmount = deal.budget - totalFees;

  // Update deal with fee information
  deal.platformFee = platformFee;
  deal.stripeFee = stripeFee;
  deal.totalFees = totalFees;
  deal.netAmount = netAmount;
  await deal.save();

  // Create fee records
  await Fee.create({
    type: 'platform_commission',
    calculationType: 'percentage',
    percentage: commissionRate,
    fixedAmount: platformFee,
    payerType: 'brand',
    applicableTo: ['all_deals'],
    isActive: true
  });

  res.json({
    success: true,
    fees: {
      platformFee,
      stripeFee,
      totalFees,
      netAmount,
      commissionRate
    }
  });
});

// @desc    Get fee configuration
// @route   GET /api/fees/config
// @access  Private/Admin
const getFeeConfig = asyncHandler(async (req, res) => {
  const fees = await Fee.find({ isActive: true });

  res.json({
    success: true,
    fees,
    defaults: {
      commissions: subscriptionPlans.commissions,
      transactionFees: subscriptionPlans.transactionFees,
      withdrawalFees: subscriptionPlans.withdrawalFees
    }
  });
});

// @desc    Update fee configuration
// @route   PUT /api/fees/config
// @access  Private/Admin
const updateFeeConfig = asyncHandler(async (req, res) => {
  const { type, ...feeData } = req.body;

  let fee = await Fee.findOne({ type });

  if (fee) {
    Object.assign(fee, feeData);
    fee.updatedBy = req.user._id;
    await fee.save();
  } else {
    fee = await Fee.create({
      ...feeData,
      type,
      createdBy: req.user._id
    });
  }

  res.json({
    success: true,
    message: 'Fee configuration updated',
    fee
  });
});

// @desc    Get revenue analytics
// @route   GET /api/fees/revenue
// @access  Private/Admin
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  let startDate = new Date();
  if (period === '30d') {
    startDate.setDate(startDate.getDate() - 30);
  } else if (period === '90d') {
    startDate.setDate(startDate.getDate() - 90);
  } else if (period === '12m') {
    startDate.setMonth(startDate.getMonth() - 12);
  }

  // Revenue by source
  const revenueBySource = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Revenue by month
  const revenueByMonth = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$amount' },
        fees: { $sum: '$fee' },
        net: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Commission breakdown
  const commissionBreakdown = await Deal.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDeals: { $sum: 1 },
        totalBudget: { $sum: '$budget' },
        totalFees: { $sum: '$platformFee' }
      }
    }
  ]);

  res.json({
    success: true,
    analytics: {
      period,
      revenueBySource,
      revenueByMonth: revenueByMonth.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        ...item
      })),
      commissionBreakdown: commissionBreakdown[0] || {
        totalDeals: 0,
        totalBudget: 0,
        totalFees: 0
      }
    }
  });
});

module.exports = {
  calculateFees,
  applyFees,
  getFeeConfig,
  updateFeeConfig,
  getRevenueAnalytics
};