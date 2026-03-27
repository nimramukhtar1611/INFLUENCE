// controllers/paymentController.js - COMPLETE PRODUCTION-READY VERSION
const Payment = require('../models/Payment');
const Deal = require('../models/Deal');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const PerformancePayment = require('../models/PerformancePayment');
const PaymentCalculator = require('../services/paymentCalculator');
const stripeService = require('../services/stripeService');
const stripe = require('../config/stripe');
const mongoose = require('mongoose');
const { catchAsync } = require('../utils/catchAsync');
const { isValidObjectId, isValidBudget } = require('../utils/validators');

const CREATOR_WITHDRAWAL_STATUSES = ['pending', 'processing', 'completed'];
const CREATOR_EXCLUDED_EARNING_TYPES = ['withdrawal', 'refund', 'fee', 'penalty'];

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const getPaymentsPathByUserType = (userType) => {
  if (userType === 'brand') return '/brand/payments';
  if (userType === 'creator') return '/creator/earnings';
  return '/';
};

const getCreatorWithdrawalsPath = () => '/creator/withdrawals';

const getStripeConnectStatus = (account) => {
  if (account?.payouts_enabled && account?.details_submitted) {
    return 'active';
  }
  if (account?.details_submitted || account?.charges_enabled) {
    return 'pending';
  }
  return 'inactive';
};

const getBrandFinancials = async (userId) => {
  const normalizedUserId = userId instanceof mongoose.Types.ObjectId
    ? userId
    : (mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null);

  if (!normalizedUserId) {
    return {
      inflows: 0,
      outflows: 0,
      reserved: 0,
      totalCampaignBudgets: 0,
      remainingCommitment: 0,
      available: 0
    };
  }

  const [completedInflows, completedOutflows, reservedOutflows, activeCampaigns, dealCommitmentsRes, spentInActiveRes] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          'to.userId': normalizedUserId,
          status: 'completed'
        }
      },
      { $group: { _id: null, total: { $sum: '$netAmount' } } }
    ]),
    Payment.aggregate([
      {
        $match: {
          'from.userId': normalizedUserId,
          status: 'completed',
          type: { $nin: ['refund'] }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Payment.aggregate([
      {
        $match: {
          'from.userId': normalizedUserId,
          status: { $in: ['pending', 'processing', 'in-escrow'] },
          type: { $nin: ['refund'] }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Campaign.find({
      brandId: normalizedUserId,
      status: { $in: ['draft', 'pending', 'active', 'paused'] }
    })
      .select('_id budget')
      .lean(),
    Deal.aggregate([
      {
        $match: {
          brandId: normalizedUserId,
          campaignId: { $exists: true, $ne: null },
          status: { $nin: ['cancelled', 'declined'] }
        }
      },
      {
        $group: {
          _id: '$campaignId',
          committed: { $sum: { $ifNull: ['$budget', 0] } }
        }
      }
    ]),
    Payment.aggregate([
      {
        $match: {
          'from.userId': normalizedUserId,
          status: { $in: ['completed', 'pending', 'processing', 'in-escrow'] },
          campaignId: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'campaigns',
          localField: 'campaignId',
          foreignField: '_id',
          as: 'campaign'
        }
      },
      { $unwind: '$campaign' },
      {
        $match: {
          'campaign.status': { $in: ['draft', 'pending', 'active', 'paused'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const inflows = completedInflows[0]?.total || 0;
  const outflows = completedOutflows[0]?.total || 0;
  const reserved = reservedOutflows[0]?.total || 0;
  const campaignBudgetById = new Map(
    (activeCampaigns || []).map((campaign) => [String(campaign._id), Number(campaign.budget || 0)])
  );
  const totalCampaignBudgets = Array.from(campaignBudgetById.values()).reduce((sum, value) => sum + value, 0);

  const dealCommitmentByCampaignId = new Map(
    (dealCommitmentsRes || []).map((row) => [String(row._id), Number(row.committed || 0)])
  );

  let noDealCampaignBudgets = 0;
  let dealCommittedBudgets = 0;

  for (const [campaignId, campaignBudget] of campaignBudgetById.entries()) {
    const rawCommitted = dealCommitmentByCampaignId.get(campaignId) || 0;
    const cappedCommitted = Math.min(Math.max(rawCommitted, 0), campaignBudget);

    if (cappedCommitted > 0) {
      dealCommittedBudgets += cappedCommitted;
    } else {
      noDealCampaignBudgets += campaignBudget;
    }
  }

  const alreadySpentOrReservedInActive = spentInActiveRes[0]?.total || 0;

  // Keep budgets fully reserved for campaigns without deals, and only lock the unpaid part of committed deals.
  const unpaidCommittedBudgets = Math.max(dealCommittedBudgets - alreadySpentOrReservedInActive, 0);
  const remainingCommitment = noDealCampaignBudgets + unpaidCommittedBudgets;

  // Available balance = Cash (Inflows - Outflows - Reserved) - Remaining Commitment
  const available = Math.max(inflows - outflows - reserved - remainingCommitment, 0);

  return {
    inflows,
    outflows,
    reserved,
    totalCampaignBudgets,
    noDealCampaignBudgets,
    dealCommittedBudgets,
    remainingCommitment,
    available
  };
};
exports.getBrandFinancials = getBrandFinancials;

const getCreatorFinancials = async (userId) => {
  const [completedEarnings, pendingEscrow, reservedWithdrawals, completedReleasedDeals] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          'to.userId': userId,
          status: { $in: ['completed', 'available'] },
          type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          'to.userId': userId,
          status: { $in: ['pending', 'in-escrow'] },
          type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          'from.userId': userId,
          type: 'withdrawal',
          status: { $in: CREATOR_WITHDRAWAL_STATUSES }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Deal.aggregate([
      {
        $match: {
          creatorId: userId,
          status: 'completed',
          paymentStatus: 'released'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$netAmount', '$budget'] } }
        }
      }
    ])
  ]);

  const earningsFromPayments = completedEarnings[0]?.total || 0;
  const releasedDealTotal = completedReleasedDeals[0]?.total || 0;
  const earningsTotal = earningsFromPayments > 0 ? earningsFromPayments : releasedDealTotal;
  const pendingTotal = pendingEscrow[0]?.total || 0;
  const reservedTotal = reservedWithdrawals[0]?.total || 0;
  const withdrawable = Math.max(earningsTotal - reservedTotal, 0);

  return {
    earningsTotal,
    pendingTotal,
    reservedTotal,
    withdrawable,
  };
};
exports.getCreatorFinancials = getCreatorFinancials;

// ==================== GET BALANCE ====================
exports.getBalance = catchAsync(async (req, res) => {
  let balance = 0;
  let pending = 0;
  let available = 0;

  if (req.user.userType === 'brand') {
    const brandFinancials = await getBrandFinancials(req.user._id);
    balance = brandFinancials.available;
    pending = brandFinancials.reserved;
    available = brandFinancials.available;
  } else if (req.user.userType === 'creator') {
    // For creators: withdrawable = completed earnings - requested/completed withdrawals.
    const creatorFinancials = await getCreatorFinancials(req.user._id);
    balance = creatorFinancials.withdrawable;
    pending = creatorFinancials.pendingTotal;
    available = creatorFinancials.withdrawable;
  }

  res.json({ success: true, balance, pending, available });
});

// ==================== GET TRANSACTIONS ====================
exports.getTransactions = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, type, status, startDate, endDate } = req.query;

  const query = req.user.userType === 'brand'
    ? { 'from.userId': req.user._id }
    : { 'to.userId': req.user._id };

  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [transactions, total, summary] = await Promise.all([
    Payment.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('from.userId', 'fullName brandName email')
      .populate('to.userId', 'fullName displayName email')
      .populate('dealId', 'campaignId budget')
      .lean(),
    Payment.countDocuments(query),
    Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$fee' },
          totalNet: { $sum: '$netAmount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    transactions,
    summary: summary[0] || { totalAmount: 0, totalFees: 0, totalNet: 0, count: 0 },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ==================== GET PAYMENT METHODS ====================
exports.getPaymentMethods = catchAsync(async (req, res) => {
  let paymentMethods = [];

  if (req.user.userType === 'brand') {
    const brand = await Brand.findById(req.user._id).select('paymentMethods');
    paymentMethods = brand?.paymentMethods || [];
  } else if (req.user.userType === 'creator') {
    const creator = await Creator.findById(req.user._id).select('paymentMethods');
    paymentMethods = creator?.paymentMethods || [];
  }

  res.json({ success: true, paymentMethods });
});

// ==================== ADD PAYMENT METHOD ====================
exports.addPaymentMethod = catchAsync(async (req, res) => {
  const { type, ...details } = req.body;

  if (!type) {
    return res.status(400).json({ success: false, error: 'Payment method type is required' });
  }

  const newMethod = {
    _id: new mongoose.Types.ObjectId(),
    type,
    ...details,
    isDefault: false,
    createdAt: new Date(),
  };

  let updatedUser;
  if (req.user.userType === 'brand') {
    updatedUser = await Brand.findByIdAndUpdate(
      req.user._id,
      { $push: { paymentMethods: newMethod } },
      { new: true }
    ).select('paymentMethods');
  } else if (req.user.userType === 'creator') {
    updatedUser = await Creator.findByIdAndUpdate(
      req.user._id,
      { $push: { paymentMethods: newMethod } },
      { new: true }
    ).select('paymentMethods');
  }

  res.json({
    success: true,
    message: 'Payment method added',
    paymentMethods: updatedUser?.paymentMethods || [],
  });
});

// ==================== SET DEFAULT PAYMENT METHOD ====================
exports.setDefaultMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;

  // Reset default flag on all methods
  if (req.user.userType === 'brand') {
    await Brand.updateOne({ _id: req.user._id }, { $set: { 'paymentMethods.$[].isDefault': false } });
    await Brand.findOneAndUpdate(
      { _id: req.user._id, 'paymentMethods._id': methodId },
      { $set: { 'paymentMethods.$.isDefault': true } }
    );
  } else if (req.user.userType === 'creator') {
    await Creator.updateOne({ _id: req.user._id }, { $set: { 'paymentMethods.$[].isDefault': false } });
    await Creator.findOneAndUpdate(
      { _id: req.user._id, 'paymentMethods._id': methodId },
      { $set: { 'paymentMethods.$.isDefault': true } }
    );
  }

  res.json({ success: true, message: 'Default payment method updated' });
});

// ==================== DELETE PAYMENT METHOD ====================
exports.deletePaymentMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;

  if (req.user.userType === 'brand') {
    await Brand.findByIdAndUpdate(req.user._id, { $pull: { paymentMethods: { _id: methodId } } });
  } else if (req.user.userType === 'creator') {
    await Creator.findByIdAndUpdate(req.user._id, { $pull: { paymentMethods: { _id: methodId } } });
  }

  res.json({ success: true, message: 'Payment method deleted' });
});

// ==================== CREATE ESCROW ====================
exports.createEscrow = catchAsync(async (req, res) => {
  const { dealId } = req.body;

  if (!dealId || !isValidObjectId(dealId)) {
    return res.status(400).json({ success: false, error: 'Valid dealId is required' });
  }

  const deal = await Deal.findOne({ _id: dealId, brandId: req.user._id });
  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or not owned by you' });
  }

  const existingPayment = await Payment.findOne({ dealId });
  if (existingPayment) {
    return res.status(400).json({ success: false, error: 'Payment already exists for this deal' });
  }

  const fees = await PaymentCalculator.calculateFees(deal.budget, req.user.userType);

  const payment = new Payment({
    transactionId: `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: 'escrow',
    status: 'pending',
    amount: deal.budget,
    fee: fees.total,
    netAmount: deal.budget - fees.total,
    from: { userId: req.user._id, accountType: 'brand' },
    to: { userId: deal.creatorId, accountType: 'creator' },
    dealId: deal._id,
    campaignId: deal.campaignId,
    description: `Escrow payment for deal ${deal._id}`,
    metadata: { fees },
  });

  await payment.save();

  deal.paymentStatus = 'pending';
  deal.paymentId = payment._id;
  await deal.save();

  res.json({ success: true, message: 'Escrow created', payment });
});

// ==================== CREATE ESCROW CHECKOUT INTENT ====================
exports.createEscrowCheckoutIntent = catchAsync(async (req, res) => {
  const { dealId, currency } = req.body;

  if (!dealId || !isValidObjectId(dealId)) {
    return res.status(400).json({ success: false, error: 'Valid dealId is required' });
  }

  const deal = await Deal.findOne({ _id: dealId, brandId: req.user._id });
  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or not owned by you' });
  }

  const existingPayment = await Payment.findOne({ dealId, type: 'escrow' });
  if (existingPayment) {
    return res.status(400).json({ success: false, error: 'Payment already exists for this deal' });
  }

  const fees = await PaymentCalculator.calculateFees(deal.budget, req.user.userType);
  const normalizedCurrency = (currency || deal.currency || 'USD').toUpperCase();

  const payment = new Payment({
    transactionId: `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: 'escrow',
    status: 'pending',
    amount: deal.budget,
    currency: normalizedCurrency,
    fee: fees.total,
    netAmount: deal.budget - fees.total,
    from: { userId: req.user._id, accountType: 'brand' },
    to: { userId: deal.creatorId, accountType: 'creator' },
    dealId: deal._id,
    campaignId: deal.campaignId,
    description: `Escrow payment for deal ${deal._id}`,
    metadata: { fees, gateway: 'stripe', checkoutStatus: 'created' }
  });

  let checkout = null;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(deal.budget * 100),
    currency: normalizedCurrency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    capture_method: 'manual',
    metadata: {
      dealId: deal._id.toString(),
      brandId: req.user._id.toString(),
      creatorId: deal.creatorId.toString()
    }
  });

  payment.stripePaymentIntentId = paymentIntent.id;
  checkout = {
    provider: 'stripe',
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    status: paymentIntent.status
  };

  await payment.save();
  deal.paymentStatus = 'pending';
  deal.paymentId = payment._id;
  await deal.save();

  res.status(201).json({
    success: true,
    message: 'Escrow checkout intent created',
    payment,
    checkout
  });
});

// ==================== CONFIRM ESCROW CHECKOUT ====================
exports.confirmEscrowCheckout = catchAsync(async (req, res) => {
  const { paymentId } = req.params;

  if (!isValidObjectId(paymentId)) {
    return res.status(400).json({ success: false, error: 'Valid paymentId is required' });
  }

  const payment = await Payment.findOne({
    _id: paymentId,
    type: 'escrow',
    'from.userId': req.user._id
  });

  if (!payment) {
    return res.status(404).json({ success: false, error: 'Escrow payment not found' });
  }

  if (payment.status === 'in-escrow' || payment.status === 'completed') {
    return res.json({ success: true, message: 'Payment already confirmed', payment });
  }

  if (!payment.stripePaymentIntentId) {
    return res.status(400).json({ success: false, error: 'Missing Stripe payment intent id' });
  }

  let intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
  if (intent.status === 'requires_capture') {
    intent = await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
  }

  if (!['succeeded', 'processing'].includes(intent.status)) {
    return res.status(400).json({
      success: false,
      error: `Stripe payment is not confirmable yet (status: ${intent.status})`
    });
  }

  payment.metadata = { ...payment.metadata, processorStatus: intent.status };

  payment.status = 'in-escrow';
  payment.paidAt = new Date();
  payment.metadata = { ...payment.metadata, checkoutStatus: 'confirmed' };
  await payment.save();

  await Deal.findByIdAndUpdate(payment.dealId, {
    paymentStatus: 'in-escrow',
    paymentId: payment._id
  });

  res.json({ success: true, message: 'Escrow payment confirmed', payment });
});

// ==================== CREATE PERFORMANCE PAYMENT ====================
exports.createPerformancePayment = catchAsync(async (req, res) => {
  const { dealId, paymentType, metrics } = req.body;

  if (!dealId || !paymentType || !metrics) {
    return res.status(400).json({ success: false, error: 'dealId, paymentType, and metrics are required' });
  }

  if (!['cpe', 'cpa', 'cpm'].includes(paymentType)) {
    return res.status(400).json({ success: false, error: 'paymentType must be cpe, cpa, or cpm' });
  }

  const deal = await Deal.findOne({ _id: dealId, brandId: req.user._id }).populate('creatorId');
  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found' });
  }

  const calculation = await PaymentCalculator.calculatePerformancePayment(deal, paymentType, metrics);

  const performancePayment = await PerformancePayment.create({
    dealId: deal._id,
    type: paymentType,
    metrics: calculation.metrics,
    baseRate: calculation.baseAmount,
    finalAmount: calculation.finalAmount,
    bonus: calculation.bonus,
    breakdown: calculation.breakdown,
    status: 'pending',
  });

  const payment = new Payment({
    transactionId: `PERF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: 'performance',
    status: 'in-escrow',
    amount: calculation.finalAmount,
    fee: calculation.fees.total,
    netAmount: calculation.finalAmount - calculation.fees.total,
    from: { userId: req.user._id, accountType: 'brand' },
    to: { userId: deal.creatorId, accountType: 'creator' },
    dealId: deal._id,
    campaignId: deal.campaignId,
    performancePaymentId: performancePayment._id,
    description: `${paymentType.toUpperCase()} payment for deal ${deal._id}`,
    metadata: { calculation, metrics },
  });

  await payment.save();

  deal.paymentStatus = 'in-escrow';
  deal.paymentId = payment._id;
  deal.performancePaymentId = performancePayment._id;
  await deal.save();

  res.json({ success: true, message: 'Performance payment created', payment, calculation });
});

// ==================== UPDATE PERFORMANCE METRICS ====================
exports.updatePerformanceMetrics = catchAsync(async (req, res) => {
  const { dealId } = req.params;
  const { metrics, finalize = false } = req.body;

  if (!metrics) {
    return res.status(400).json({ success: false, error: 'metrics are required' });
  }

  const deal = await Deal.findById(dealId).populate('performancePaymentId');
  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found' });
  }

  if (!deal.performancePaymentId) {
    return res.status(400).json({ success: false, error: 'Not a performance-based deal' });
  }

  const calculation = await PaymentCalculator.calculatePerformancePayment(
    deal,
    deal.paymentType,
    metrics,
    finalize
  );

  await PerformancePayment.findByIdAndUpdate(deal.performancePaymentId, {
    $set: {
      metrics,
      finalAmount: calculation.finalAmount,
      bonus: calculation.bonus,
      breakdown: calculation.breakdown,
      tracking: { date: new Date(), metrics, calculation },
    },
  });

  await Payment.findByIdAndUpdate(deal.paymentId, {
    $set: {
      amount: calculation.finalAmount,
      netAmount: calculation.finalAmount - calculation.fees.total,
      metadata: { ...calculation, updatedAt: new Date() },
    },
  });

  if (finalize) {
    deal.paymentStatus = 'in-escrow';
    await deal.save();
  }

  res.json({ success: true, message: 'Performance metrics updated', calculation });
});

// ==================== RELEASE PAYMENT ====================
exports.releasePayment = catchAsync(async (req, res) => {
  const { dealId } = req.params;

  const payment = await Payment.findOne({ dealId, status: 'in-escrow' });
  if (!payment) {
    return res.status(404).json({ success: false, error: 'Payment not found or not in escrow' });
  }

  // Final calculation for performance payments
  if (payment.type === 'performance') {
    const deal = await Deal.findById(dealId);
    const performancePayment = await PerformancePayment.findById(payment.performancePaymentId);
    const finalCalculation = await PaymentCalculator.calculatePerformancePayment(
      deal,
      performancePayment.type,
      performancePayment.metrics,
      true
    );

    payment.amount = finalCalculation.finalAmount;
    payment.netAmount = finalCalculation.finalAmount - finalCalculation.fees.total;
  }

  payment.status = 'completed';
  payment.paidAt = new Date();
  await payment.save();

  await Deal.findByIdAndUpdate(dealId, { paymentStatus: 'released' });

  await Creator.findByIdAndUpdate(payment.to.userId, {
    $inc: { 'stats.totalEarnings': payment.netAmount },
  });

  res.json({ success: true, message: 'Payment released' });
});

// ==================== REQUEST WITHDRAWAL ====================
exports.getPayoutAccountStatus = catchAsync(async (req, res) => {
  if (req.user.userType !== 'creator') {
    return res.status(403).json({ success: false, error: 'Only creators can access payout account status' });
  }

  const creatorUser = await User.findById(req.user._id).select('stripeAccountId stripeAccountStatus');
  if (!creatorUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  if (!creatorUser.stripeAccountId) {
    return res.json({
      success: true,
      connected: false,
      status: 'not_connected',
      stripeAccountId: null,
      payoutsEnabled: false,
      detailsSubmitted: false,
      currentlyDue: []
    });
  }

  let account;
  try {
    account = await stripe.accounts.retrieve(creatorUser.stripeAccountId);
  } catch (error) {
    if (error?.code === 'resource_missing') {
      creatorUser.stripeAccountId = undefined;
      creatorUser.stripeAccountStatus = 'pending';
      await creatorUser.save();

      return res.json({
        success: true,
        connected: false,
        status: 'not_connected',
        stripeAccountId: null,
        payoutsEnabled: false,
        detailsSubmitted: false,
        currentlyDue: []
      });
    }

    throw error;
  }

  const derivedStatus = getStripeConnectStatus(account);
  if (creatorUser.stripeAccountStatus !== derivedStatus) {
    creatorUser.stripeAccountStatus = derivedStatus;
    await creatorUser.save();
  }

  res.json({
    success: true,
    connected: Boolean(account.payouts_enabled && account.details_submitted),
    status: derivedStatus,
    stripeAccountId: creatorUser.stripeAccountId,
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
    currentlyDue: account.requirements?.currently_due || []
  });
});

exports.createPayoutOnboardingLink = catchAsync(async (req, res) => {
  if (req.user.userType !== 'creator') {
    return res.status(403).json({ success: false, error: 'Only creators can connect a payout account' });
  }

  const creatorUser = await User.findById(req.user._id).select('email fullName stripeAccountId stripeAccountStatus userType');
  if (!creatorUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  let stripeAccountId = creatorUser.stripeAccountId;
  if (stripeAccountId) {
    try {
      await stripe.accounts.retrieve(stripeAccountId);
    } catch (error) {
      if (error?.code === 'resource_missing') {
        stripeAccountId = null;
      } else {
        throw error;
      }
    }
  }

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: (process.env.STRIPE_CONNECT_COUNTRY || 'US').toUpperCase(),
      email: creatorUser.email,
      business_type: 'individual',
      metadata: {
        userId: creatorUser._id.toString(),
        userType: creatorUser.userType
      }
    });

    stripeAccountId = account.id;
    creatorUser.stripeAccountId = stripeAccountId;
    creatorUser.stripeAccountStatus = 'pending';
    await creatorUser.save();
  }

  const requestedReturnPath = typeof req.body?.returnPath === 'string' ? req.body.returnPath.trim() : '';
  const allowedReturnPaths = new Set(['/creator/withdrawals', '/creator/earnings']);
  const returnPath = allowedReturnPaths.has(requestedReturnPath)
    ? requestedReturnPath
    : getCreatorWithdrawalsPath();

  const frontendBaseUrl = getFrontendBaseUrl();
  const returnUrl = `${frontendBaseUrl}${returnPath}?stripe_connect=return`;
  const refreshUrl = `${frontendBaseUrl}${returnPath}?stripe_connect=refresh`;

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });

  res.json({
    success: true,
    url: accountLink.url,
    stripeAccountId
  });
});

exports.requestWithdrawal = catchAsync(async (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ success: false, error: 'Amount is required' });
  }

  if (req.user.userType !== 'creator') {
    return res.status(403).json({ success: false, error: 'Only creators can request withdrawals' });
  }

  if (!isValidBudget(amount) || amount < 50) {
    return res.status(400).json({ success: false, error: 'Minimum withdrawal amount is $50' });
  }

  const creatorFinancials = await getCreatorFinancials(req.user._id);
  const availableBalance = creatorFinancials.withdrawable;
  if (amount > availableBalance) {
    return res.status(400).json({
      success: false,
      error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
    });
  }

  const creatorUser = await User.findById(req.user._id).select('stripeAccountId stripeAccountStatus');
  const destinationAccount = creatorUser?.stripeAccountId || null;

  const fees = await PaymentCalculator.calculateWithdrawalFees(amount, 'stripe');

  const withdrawal = new Payment({
    transactionId: `WTH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: 'withdrawal',
    status: 'pending',
    amount,
    fee: fees.total,
    netAmount: amount - fees.total,
    from: { userId: req.user._id, accountType: req.user.userType },
    to: { userId: req.user._id, accountType: req.user.userType },
    paymentMethod: {
      type: 'stripe',
      details: {
        destinationAccount
      },
    },
    description: 'Stripe withdrawal request (pending admin approval)',
    metadata: {
      fees,
      requestedAt: new Date(),
      approvalRequired: true,
      destinationAccount,
      payoutAccountConnected: Boolean(destinationAccount)
    },
  });

  await withdrawal.save();

  res.json({
    success: true,
    message: destinationAccount
      ? 'Withdrawal request submitted for admin approval'
      : 'Withdrawal request submitted. Connect Stripe payout account before admin approval.',
    withdrawal
  });
});

// ==================== GET WITHDRAWALS ====================
exports.getWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = { 'to.userId': req.user._id, type: 'withdrawal' };
    const withdrawals = await Payment.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Payment.countDocuments(query);
    res.json({ success: true, withdrawals, pagination: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET INVOICES ====================
exports.getInvoices = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const query = {
    'from.userId': req.user._id,
    status: 'completed',
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [invoices, total] = await Promise.all([
    Payment.find(query)
      .select('transactionId amount status createdAt invoiceNumber invoiceUrl')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Payment.countDocuments(query),
  ]);

  res.json({
    success: true,
    invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ==================== CREATE DEPOSIT CHECKOUT SESSION ====================
exports.createDepositCheckoutSession = catchAsync(async (req, res) => {
  const { amount, currency = 'usd' } = req.body;

  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 10) {
    return res.status(400).json({ success: false, error: 'Minimum deposit amount is $10' });
  }

  if (!['brand', 'creator'].includes(req.user.userType)) {
    return res.status(403).json({ success: false, error: 'Only brand and creator accounts can add funds' });
  }

  let stripeCustomerId = req.user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.fullName,
      metadata: { userId: req.user._id.toString(), userType: req.user.userType }
    });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(req.user._id, { stripeCustomerId });
  }

  const frontendBaseUrl = getFrontendBaseUrl();
  const paymentsPath = getPaymentsPathByUserType(req.user.userType);
  const successUrl = `${frontendBaseUrl}${paymentsPath}?deposit=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendBaseUrl}${paymentsPath}?deposit=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: String(currency).toLowerCase(),
          product_data: {
            name: 'Wallet Top-up',
            description: 'Add funds via Stripe Checkout'
          },
          unit_amount: Math.round(normalizedAmount * 100)
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: req.user._id.toString(),
    metadata: {
      purpose: 'wallet_topup',
      userId: req.user._id.toString(),
      userType: req.user.userType,
      amount: String(normalizedAmount)
    }
  });

  res.json({ success: true, url: session.url, sessionId: session.id });
});

// ==================== GET PERFORMANCE SUMMARY ====================
exports.getPerformanceSummary = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { period = '30d' } = req.query;

  const startDate = new Date();
  switch (period) {
    case '7d': startDate.setDate(startDate.getDate() - 7); break;
    case '30d': startDate.setDate(startDate.getDate() - 30); break;
    case '90d': startDate.setDate(startDate.getDate() - 90); break;
    default: startDate.setDate(startDate.getDate() - 30);
  }

  const performance = await PerformancePayment.aggregate([
    {
      $lookup: {
        from: 'deals',
        localField: 'dealId',
        foreignField: '_id',
        as: 'deal',
      },
    },
    { $unwind: '$deal' },
    {
      $match: {
        $or: [{ 'deal.brandId': userId }, { 'deal.creatorId': userId }],
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$finalAmount' },
        avgAmount: { $avg: '$finalAmount' },
        totalBonus: { $sum: '$bonus' },
      },
    },
  ]);

  res.json({ success: true, performance });
});

// ==================== STRIPE WEBHOOK HANDLER ====================
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    // req.body is already raw buffer from express.raw() middleware
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await stripeService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};