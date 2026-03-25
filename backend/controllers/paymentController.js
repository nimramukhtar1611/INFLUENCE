// controllers/paymentController.js - COMPLETE PRODUCTION-READY VERSION
const Payment = require('../models/Payment');
const Deal = require('../models/Deal');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const PerformancePayment = require('../models/PerformancePayment');
const PaymentCalculator = require('../services/paymentCalculator');
const stripeService = require('../services/stripeService');
const stripe = require('../config/stripe');
const mongoose = require('mongoose');
const { catchAsync } = require('../utils/catchAsync');
const { isValidObjectId, isValidBudget } = require('../utils/validators');

// ==================== GET BALANCE ====================
exports.getBalance = catchAsync(async (req, res) => {
  let balance = 0;
  let pending = 0;
  let available = 0;

  if (req.user.userType === 'brand') {
    // For brands: amount in escrow or pending
    const payments = await Payment.aggregate([
      { $match: { 'from.userId': req.user._id, status: { $in: ['in-escrow', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    balance = payments[0]?.total || 0;
  } else if (req.user.userType === 'creator') {
    // For creators: completed earnings, pending in escrow, available balance
    const [earnings, pendingEarnings, availableEarnings] = await Promise.all([
      Payment.aggregate([
        { $match: { 'to.userId': req.user._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
      Payment.aggregate([
        { $match: { 'to.userId': req.user._id, status: 'in-escrow' } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
      Payment.aggregate([
        { $match: { 'to.userId': req.user._id, status: 'available' } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
    ]);

    balance = earnings[0]?.total || 0;
    pending = pendingEarnings[0]?.total || 0;
    available = availableEarnings[0]?.total || 0;
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
exports.requestWithdrawal = catchAsync(async (req, res) => {
  const { amount, methodId } = req.body;

  if (!amount || !methodId) {
    return res.status(400).json({ success: false, error: 'Amount and methodId are required' });
  }

  if (!isValidBudget(amount) || amount < 50) {
    return res.status(400).json({ success: false, error: 'Minimum withdrawal amount is $50' });
  }

  // Get available balance
  const available = await Payment.aggregate([
    { $match: { 'to.userId': req.user._id, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$netAmount' } } },
  ]);

  const availableBalance = available[0]?.total || 0;
  if (amount > availableBalance) {
    return res.status(400).json({
      success: false,
      error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
    });
  }

  // Get payment method details
  let paymentMethod;
  if (req.user.userType === 'brand') {
    const brand = await Brand.findById(req.user._id);
    paymentMethod = brand?.paymentMethods?.id(methodId);
  } else {
    const creator = await Creator.findById(req.user._id);
    paymentMethod = creator?.paymentMethods?.id(methodId);
  }

  if (!paymentMethod) {
    return res.status(404).json({ success: false, error: 'Payment method not found' });
  }

  const fees = await PaymentCalculator.calculateWithdrawalFees(amount, paymentMethod.type);

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
      type: paymentMethod.type,
      last4: paymentMethod.last4,
      details: paymentMethod,
    },
    description: `Withdrawal to ${paymentMethod.type}`,
    metadata: { fees, requestedAt: new Date() },
  });

  await withdrawal.save();

  res.json({ success: true, message: 'Withdrawal request submitted', withdrawal });
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