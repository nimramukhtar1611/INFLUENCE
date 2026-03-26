// controllers/subscriptionController.js - COMPLETE FIXED VERSION
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const User = require('../models/User');
const stripe = require('../config/stripe');
const stripeService = require('../services/stripeService');
const subscriptionPlans = require('../config/subscriptionPlans');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const normalizePlanFeatures = (features = []) => {
  if (!Array.isArray(features)) return [];
  return features
    .map(feature => (typeof feature === 'string' ? feature : feature?.name))
    .filter(Boolean);
};

const resolveStripePriceId = (plan, interval) => {
  if (!plan?.stripePriceId) return null;

  if (typeof plan.stripePriceId === 'string') {
    return plan.stripePriceId;
  }

  if (plan.stripePriceId?.[interval]) {
    return plan.stripePriceId[interval];
  }

  if (plan.interval && plan.stripePriceId?.[plan.interval]) {
    return plan.stripePriceId[plan.interval];
  }

  return plan.stripePriceId?.month || plan.stripePriceId?.year || null;
};

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const getSubscriptionPathByUserType = (userType) => {
  if (userType === 'brand') return '/brand/subscription';
  if (userType === 'creator') return '/creator/subscription';
  return '/pricing';
};

let managedPlanChangePortalConfigId = process.env.STRIPE_PLAN_CHANGE_PORTAL_CONFIG_ID || null;

const collectPortalProductsFromPlans = (plans = []) => {
  const productPriceMap = new Map();

  for (const plan of plans) {
    const productId = plan?.stripeProductId;
    if (!productId) continue;

    if (!productPriceMap.has(productId)) {
      productPriceMap.set(productId, new Set());
    }

    const prices = [];
    if (typeof plan?.stripePriceId === 'string') {
      prices.push(plan.stripePriceId);
    } else if (plan?.stripePriceId && typeof plan.stripePriceId === 'object') {
      if (plan.stripePriceId.month) prices.push(plan.stripePriceId.month);
      if (plan.stripePriceId.year) prices.push(plan.stripePriceId.year);
    }

    for (const price of prices) {
      if (price) productPriceMap.get(productId).add(price);
    }
  }

  return Array.from(productPriceMap.entries())
    .map(([product, pricesSet]) => ({ product, prices: Array.from(pricesSet) }))
    .filter((entry) => entry.prices.length > 0);
};

const configIncludesPrice = (config, priceId) => {
  const products = config?.features?.subscription_update?.products || [];
  return products.some((entry) => Array.isArray(entry?.prices) && entry.prices.includes(priceId));
};

const ensurePlanChangePortalConfiguration = async ({ requiredPriceId, returnUrl }) => {
  const activePlans = await Plan.find({ isActive: true }).select('stripeProductId stripePriceId');
  const products = collectPortalProductsFromPlans(activePlans);

  if (!products.some((entry) => entry.prices.includes(requiredPriceId))) {
    throw new Error(`Selected plan price is not present in portal-allowed products: ${requiredPriceId}`);
  }

  const subscriptionUpdateFeatures = {
    enabled: true,
    default_allowed_updates: ['price', 'quantity', 'promotion_code'],
    proration_behavior: 'always_invoice',
    products
  };

  const configurationUpdatePayload = {
    default_return_url: returnUrl,
    features: {
      subscription_update: subscriptionUpdateFeatures
    }
  };

  if (managedPlanChangePortalConfigId) {
    try {
      const updated = await stripe.billingPortal.configurations.update(
        managedPlanChangePortalConfigId,
        configurationUpdatePayload
      );

      if (updated?.active && configIncludesPrice(updated, requiredPriceId)) {
        return updated;
      }
    } catch (error) {
      managedPlanChangePortalConfigId = null;
    }
  }

  const existingConfigs = await stripe.billingPortal.configurations.list({ active: true, limit: 50 });
  const managedExisting = existingConfigs.data.find(
    (config) => config?.metadata?.managed_by === 'influencex' && config?.metadata?.purpose === 'plan_change'
  );

  if (managedExisting) {
    const updated = await stripe.billingPortal.configurations.update(
      managedExisting.id,
      configurationUpdatePayload
    );
    managedPlanChangePortalConfigId = updated.id;
    return updated;
  }

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your subscription'
    },
    default_return_url: returnUrl,
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'name', 'address', 'phone', 'tax_id']
      },
      invoice_history: {
        enabled: true
      },
      payment_method_update: {
        enabled: true
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end'
      },
      subscription_update: subscriptionUpdateFeatures
    },
    metadata: {
      managed_by: 'influencex',
      purpose: 'plan_change'
    }
  });

  managedPlanChangePortalConfigId = created.id;
  return created;
};

// ============================================================
// PUBLIC ROUTES
// ============================================================

// @desc    Get all available plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getPlans = asyncHandler(async (req, res) => {
  const { userType, interval = 'month' } = req.query;

  const query = { isActive: true, isPublic: true };
  if (['brand', 'creator'].includes(userType)) {
    query.$or = [
      { userType: { $in: [userType, 'both'] } },
      { userType: { $exists: false } },
      { userType: null }
    ];
  }

  const plans = await Plan.find(query).sort('price');

  const formattedPlans = plans.map(plan => ({
    id: plan.planId,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features,
    limits: plan.limits,
    metadata: plan.metadata,
    priceCalculation: plan.calculatePrice ? plan.calculatePrice() : null
  }));

  res.json({ success: true, plans: formattedPlans });
});

// @desc    Get single plan details
// @route   GET /api/subscriptions/plans/:planId
// @access  Public
const getPlanDetails = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  const plan = await Plan.findOne({ planId, isActive: true });
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  res.json({
    success: true,
    plan: {
      id: plan.planId,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features,
      limits: plan.limits,
      metadata: plan.metadata,
      priceCalculation: plan.calculatePrice ? plan.calculatePrice() : null
    }
  });
});

// @desc    Calculate subscription price
// @route   POST /api/subscriptions/calculate-price
// @access  Public
const calculatePrice = asyncHandler(async (req, res) => {
  const { planId, interval = 'month', couponCode } = req.body;

  const plan = await Plan.findOne({ planId, isActive: true });
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  let price = plan.price;
  let discount = null;

  // Apply yearly discount if applicable
  if (interval === 'year' && plan.yearlyDiscount) {
    const discountAmount = (price * 12 * plan.yearlyDiscount) / 100;
    price = price * 12 - discountAmount;
    discount = { type: 'yearly', percentage: plan.yearlyDiscount, savings: discountAmount };
  } else if (interval === 'year') {
    price = price * 12;
  }

  // Validate coupon if provided
  if (couponCode) {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);
      if (coupon.valid) {
        if (coupon.percent_off) {
          const couponSavings = (price * coupon.percent_off) / 100;
          price = price - couponSavings;
          discount = { type: 'coupon', percentage: coupon.percent_off, savings: couponSavings };
        } else if (coupon.amount_off) {
          const couponSavings = coupon.amount_off / 100;
          price = Math.max(0, price - couponSavings);
          discount = { type: 'coupon', fixed: couponSavings, savings: couponSavings };
        }
      }
    } catch (error) {
      res.status(400);
      throw new Error('Invalid coupon code');
    }
  }

  res.json({
    success: true,
    calculation: {
      planId,
      interval,
      basePrice: plan.price,
      finalPrice: parseFloat(price.toFixed(2)),
      currency: plan.currency,
      discount
    }
  });
});

// ============================================================
// USER ROUTES (Protected)
// ============================================================

// @desc    Get current user subscription
// @route   GET /api/subscriptions/current
// @access  Private
const getCurrentSubscription = asyncHandler(async (req, res) => {
  let subscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing', 'past_due'] }
  }).populate('planId');

  if (!subscription) {
    return res.json({ success: true, subscription: null, message: 'No active subscription' });
  }

  let upcomingInvoice = null;
  if (subscription.stripeSubscriptionId) {
    try {
      // Keep local plan snapshot in sync with Stripe in case webhooks were delayed or metadata was stale.
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId, {
        expand: ['items.data.price']
      });
      const synced = await stripeService.upsertSubscriptionFromStripe(stripeSubscription);
      if (synced?._id) {
        const refreshed = await Subscription.findById(synced._id).populate('planId');
        if (refreshed) subscription = refreshed;
      }

      const invoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscription.stripeSubscriptionId
      });
      upcomingInvoice = {
        amount: invoice.amount_due / 100,
        date: new Date(invoice.next_payment_attempt * 1000),
        currency: invoice.currency
      };
    } catch (error) {
      console.error('Stripe upcoming invoice error:', error.message);
    }
  }

  res.json({
    success: true,
    subscription: {
      ...subscription.toObject(),
      upcomingInvoice,
      daysRemaining: subscription.getDaysRemaining ? subscription.getDaysRemaining() : null,
      willCancel: subscription.willCancel ? subscription.willCancel() : subscription.cancelAtPeriodEnd
    }
  });
});

// @desc    Subscribe to a plan
// @route   POST /api/subscriptions/subscribe
// @access  Private
const subscribe = asyncHandler(async (req, res) => {
  const { planId, paymentMethodId, interval = 'month' } = req.body;

  const plan = await Plan.findOne({ planId, isActive: true });
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  const existingSubscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing', 'past_due'] }
  });

  if (existingSubscription) {
    // Cancel old Stripe subscription to prevent duplicates in billing portal
    if (existingSubscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(existingSubscription.stripeSubscriptionId);
        console.log(`🗑️ Cancelled old Stripe subscription before new subscribe: ${existingSubscription.stripeSubscriptionId}`);
      } catch (err) {
        // Subscription may already be cancelled/expired - continue anyway
        console.warn('⚠️ Could not cancel old Stripe subscription:', err.message);
      }
    }
    await Subscription.deleteOne({ _id: existingSubscription._id });
  }

  const normalizedFeatures = normalizePlanFeatures(plan.features);

  // Free plans are activated locally and do not require Stripe subscription setup.
  if (Number(plan.price) <= 0) {
    const billingStart = new Date();
    const billingEnd = new Date(billingStart);
    if (interval === 'year') {
      billingEnd.setFullYear(billingEnd.getFullYear() + 1);
    } else {
      billingEnd.setMonth(billingEnd.getMonth() + 1);
    }

    const freeSubscription = await Subscription.create({
      userId: req.user._id,
      planId: plan.planId,
      status: 'active',
      planDetails: {
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval,
        intervalCount: plan.intervalCount,
        features: normalizedFeatures,
        limits: plan.limits
      },
      billingPeriod: { start: billingStart, end: billingEnd },
      cancelAtPeriodEnd: false
    });

    return res.status(201).json({
      success: true,
      message: 'Free plan activated successfully',
      subscription: freeSubscription
    });
  }

  let stripeCustomerId = req.user.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.fullName,
      metadata: { userId: req.user._id.toString() }
    });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(req.user._id, { stripeCustomerId });
  }

  if (paymentMethodId) {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });
  }

  const stripePriceId = resolveStripePriceId(plan, interval);
  if (!stripePriceId) {
    res.status(500);
    throw new Error(`Payment configuration error: missing Stripe price for plan ${plan.planId}`);
  }

  const stripeSubscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: stripePriceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: { userId: req.user._id.toString(), planId: plan.planId }
  });
  const paymentIntent = stripeSubscription.latest_invoice?.payment_intent;
  if (paymentIntent && paymentIntent.status === 'requires_action') {
    // Return client secret for 3DS
    return res.json({
      success: true,
      requiresAction: true,
      clientSecret: paymentIntent.client_secret,
      subscriptionId: stripeSubscription.id
    });
  }

  const initialSubscriptionStatus = paymentIntent && paymentIntent.status === 'succeeded'
    ? 'active'
    : (stripeSubscription.status || 'incomplete');

  const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

  const subscription = await Subscription.create({
    userId: req.user._id,
    planId: plan.planId,
    status: initialSubscriptionStatus,
    stripeCustomerId,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId,
    planDetails: {
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      features: normalizedFeatures,
      limits: plan.limits
    },
    billingPeriod: { start: currentPeriodStart, end: currentPeriodEnd },
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
  });

  res.status(201).json({
    success: true,
    message: 'Subscription created successfully',
    subscription,
    clientSecret: stripeSubscription.latest_invoice?.payment_intent?.client_secret
  });
});

// @desc    Create Stripe Checkout session for subscription
// @route   POST /api/subscriptions/checkout-session
// @access  Private
const createCheckoutSession = asyncHandler(async (req, res) => {
  const { planId, interval = 'month' } = req.body;

  if (!['brand', 'creator'].includes(req.user.userType)) {
    res.status(403);
    throw new Error('Only brand and creator accounts can subscribe');
  }

  const plan = await Plan.findOne({ planId, isActive: true });
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  const stripePriceId = resolveStripePriceId(plan, interval);
  if (!stripePriceId) {
    res.status(500);
    throw new Error(`Payment configuration error: missing Stripe price for plan ${plan.planId}`);
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

  const existingSubscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing', 'past_due'] },
    stripeSubscriptionId: { $ne: null }
  });

  if (existingSubscription) {
    // Cancel old Stripe subscription to prevent duplicates in billing portal
    if (existingSubscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(existingSubscription.stripeSubscriptionId);
        console.log(`🗑️ Cancelled old Stripe subscription before new checkout: ${existingSubscription.stripeSubscriptionId}`);
      } catch (err) {
        console.warn('⚠️ Could not cancel old Stripe subscription:', err.message);
      }
    }
    await Subscription.deleteOne({ _id: existingSubscription._id });
  }

  const frontendBaseUrl = getFrontendBaseUrl();
  const subscriptionPath = getSubscriptionPathByUserType(req.user.userType);
  const successUrl = `${frontendBaseUrl}${subscriptionPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendBaseUrl}${subscriptionPath}?checkout=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: req.user._id.toString(),
    metadata: {
      userId: req.user._id.toString(),
      userType: req.user.userType,
      planId: plan.planId,
      interval
    },
    subscription_data: {
      metadata: {
        userId: req.user._id.toString(),
        userType: req.user.userType,
        planId: plan.planId,
        interval
      }
    }
  });

  res.json({
    success: true,
    url: session.url,
    sessionId: session.id
  });
});

// @desc    Create Stripe Billing Portal session
// @route   POST /api/subscriptions/billing-portal
// @access  Private
const createBillingPortalSession = asyncHandler(async (req, res) => {
  if (!req.user.stripeCustomerId) {
    res.status(400);
    throw new Error('No Stripe customer found');
  }

  const frontendBaseUrl = getFrontendBaseUrl();
  const subscriptionPath = getSubscriptionPathByUserType(req.user.userType);

  const session = await stripe.billingPortal.sessions.create({
    customer: req.user.stripeCustomerId,
    return_url: `${frontendBaseUrl}${subscriptionPath}`
  });

  res.json({ success: true, url: session.url });
});

// @desc    Create Stripe plan-change confirmation session
// @route   POST /api/subscriptions/plan-change-session
// @access  Private
const createPlanChangeSession = asyncHandler(async (req, res) => {
  const { planId, interval = 'month' } = req.body;

  if (!req.user.stripeCustomerId) {
    res.status(400);
    throw new Error('No Stripe customer found');
  }

  const plan = await Plan.findOne({ planId, isActive: true });
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  const stripePriceId = resolveStripePriceId(plan, interval);
  if (!stripePriceId) {
    res.status(500);
    throw new Error(`Payment configuration error: missing Stripe price for plan ${plan.planId}`);
  }

  const existingSubscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing', 'past_due'] },
    stripeSubscriptionId: { $ne: null }
  });

  if (!existingSubscription) {
    res.status(400);
    throw new Error('No active subscription to change');
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripeSubscriptionId, {
    expand: ['items.data.price']
  });

  const currentItem = stripeSubscription.items?.data?.[0];
  if (!currentItem?.id) {
    res.status(400);
    throw new Error('Unable to resolve current subscription item');
  }

  const frontendBaseUrl = getFrontendBaseUrl();
  const subscriptionPath = getSubscriptionPathByUserType(req.user.userType);
  const returnUrl = `${frontendBaseUrl}${subscriptionPath}`;
  const portalConfiguration = await ensurePlanChangePortalConfiguration({
    requiredPriceId: stripePriceId,
    returnUrl
  });

  if (currentItem.price?.id === stripePriceId) {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: returnUrl
    });

    return res.json({
      success: true,
      url: portalSession.url,
      message: 'You are already on this plan.'
    });
  }

  if (stripeSubscription.cancel_at_period_end) {
    await stripe.subscriptions.update(stripeSubscription.id, {
      cancel_at_period_end: false
    });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      configuration: portalConfiguration.id,
      return_url: returnUrl,
      flow_data: {
        type: 'subscription_update_confirm',
        after_completion: {
          type: 'redirect',
          redirect: {
            return_url: returnUrl
          }
        },
        subscription_update_confirm: {
          subscription: stripeSubscription.id,
          items: [{
            id: currentItem.id,
            price: stripePriceId,
            quantity: currentItem.quantity || 1
          }]
        }
      }
    });

    return res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error('Stripe plan change session error:', error.message);
    res.status(400);
    throw new Error(`Unable to open Stripe plan change confirmation. ${error.message}`);
  }
});

// @desc    Cancel subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
const cancelSubscription = asyncHandler(async (req, res) => {
  const { cancelAtPeriodEnd = true, reason } = req.body;

  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing'] }
  });

  if (!subscription) {
    res.status(404);
    throw new Error('No active subscription found');
  }

  if (subscription.stripeSubscriptionId) {
    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: { cancellationReason: reason }
      });
    } else {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }
  }

  subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
  subscription.cancellationReason = reason;
  subscription.cancellationFeedback = req.body.feedback;

  if (!cancelAtPeriodEnd) {
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
  }

  await subscription.save();

  res.json({
    success: true,
    message: cancelAtPeriodEnd
      ? 'Subscription will be cancelled at period end'
      : 'Subscription cancelled immediately',
    subscription
  });
});

// @desc    Change subscription plan
// @route   PUT /api/subscriptions/change
// @access  Private
const changePlan = asyncHandler(async (req, res) => {
  const { newPlanId, interval = 'month' } = req.body;

  const newPlan = await Plan.findOne({ planId: newPlanId, isActive: true });
  if (!newPlan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  const currentSubscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing'] }
  });

  if (!currentSubscription) {
    res.status(404);
    throw new Error('No active subscription found');
  }

  const stripePriceId = resolveStripePriceId(newPlan, interval);
  if (!stripePriceId) {
    res.status(500);
    throw new Error(`Payment configuration error: missing Stripe price for plan ${newPlan.planId}`);
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    currentSubscription.stripeSubscriptionId
  );

  const updatedStripeSubscription = await stripe.subscriptions.update(
    currentSubscription.stripeSubscriptionId,
    {
      items: [{ id: stripeSubscription.items.data[0].id, price: stripePriceId }],
      proration_behavior: 'always_invoice',
      metadata: { previousPlan: currentSubscription.planId?.toString(), newPlan: newPlan.planId }
    }
  );

  if (!currentSubscription.upgradeHistory) currentSubscription.upgradeHistory = [];
  currentSubscription.upgradeHistory.push({
    fromPlan: currentSubscription.planId,
    toPlan: newPlan.planId,
    date: new Date(),
    type: newPlan.price > currentSubscription.planDetails.price ? 'upgrade' : 'downgrade'
  });

  currentSubscription.planId = newPlan.planId;
  currentSubscription.stripePriceId = stripePriceId;
  currentSubscription.planDetails = {
    name: newPlan.name,
    price: newPlan.price,
    currency: newPlan.currency,
    interval: newPlan.interval,
    intervalCount: newPlan.intervalCount,
    features: normalizePlanFeatures(newPlan.features),
    limits: newPlan.limits
  };
  currentSubscription.billingPeriod = {
    start: new Date(updatedStripeSubscription.current_period_start * 1000),
    end: new Date(updatedStripeSubscription.current_period_end * 1000)
  };

  await currentSubscription.save();

  res.json({ success: true, message: 'Plan changed successfully', subscription: currentSubscription });
});

// @desc    Preview plan change (proration)
// @route   POST /api/subscriptions/preview-change
// @access  Private
const previewPlanChange = asyncHandler(async (req, res) => {
  const { newPlanId, interval = 'month' } = req.body;

  const newPlan = await Plan.findOne({ planId: newPlanId, isActive: true });
  if (!newPlan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  const currentSubscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing'] }
  });

  if (!currentSubscription) {
    res.status(404);
    throw new Error('No active subscription found');
  }

  const stripePriceId = resolveStripePriceId(newPlan, interval);
  if (!stripePriceId) {
    res.status(500);
    throw new Error(`Payment configuration error: missing Stripe price for plan ${newPlan.planId}`);
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    currentSubscription.stripeSubscriptionId
  );

  // Preview the upcoming invoice with proration
  const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
    customer: currentSubscription.stripeCustomerId,
    subscription: currentSubscription.stripeSubscriptionId,
    subscription_items: [{ id: stripeSubscription.items.data[0].id, price: stripePriceId }],
    subscription_proration_behavior: 'always_invoice'
  });

  res.json({
    success: true,
    preview: {
      amountDue: upcomingInvoice.amount_due / 100,
      currency: upcomingInvoice.currency,
      prorationDate: new Date(upcomingInvoice.subscription_proration_date * 1000),
      lines: upcomingInvoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount / 100,
        period: {
          start: new Date(line.period.start * 1000),
          end: new Date(line.period.end * 1000)
        }
      }))
    }
  });
});

// @desc    Reactivate canceled subscription
// @route   POST /api/subscriptions/reactivate
// @access  Private
const reactivateSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: 'active',
    cancelAtPeriodEnd: true
  });

  if (!subscription) {
    res.status(404);
    throw new Error('No subscription pending cancellation found');
  }

  if (subscription.stripeSubscriptionId) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    });
  }

  subscription.cancelAtPeriodEnd = false;
  await subscription.save();

  res.json({ success: true, message: 'Subscription reactivated', subscription });
});

// ============================================================
// PAYMENT METHODS
// ============================================================

// @desc    Get user payment methods
// @route   GET /api/subscriptions/payment-methods
// @access  Private
const getPaymentMethods = asyncHandler(async (req, res) => {
  if (!req.user.stripeCustomerId) {
    return res.json({ success: true, paymentMethods: [] });
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: req.user.stripeCustomerId,
    type: 'card'
  });

  // Get default payment method
  const customer = await stripe.customers.retrieve(req.user.stripeCustomerId);
  const defaultMethodId = customer.invoice_settings?.default_payment_method;

  const formattedMethods = paymentMethods.data.map(pm => ({
    id: pm.id,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    expiryMonth: pm.card?.exp_month,
    expiryYear: pm.card?.exp_year,
    isDefault: pm.id === defaultMethodId
  }));

  res.json({ success: true, paymentMethods: formattedMethods });
});

// @desc    Add new payment method
// @route   POST /api/subscriptions/payment-methods
// @access  Private
const addPaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId, setDefault = false } = req.body;

  const normalizedPaymentMethodId = String(paymentMethodId || '').trim();

  if (!normalizedPaymentMethodId) {
    res.status(400);
    throw new Error('Payment method ID is required');
  }

  if (!/^pm_[A-Za-z0-9_]+$/.test(normalizedPaymentMethodId)) {
    res.status(400);
    throw new Error('Invalid payment method ID format');
  }

  let stripeCustomerId = req.user.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.fullName,
      metadata: { userId: req.user._id.toString() }
    });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(req.user._id, { stripeCustomerId });
  }

  await stripe.paymentMethods.attach(normalizedPaymentMethodId, { customer: stripeCustomerId });

  if (setDefault) {
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: normalizedPaymentMethodId }
    });
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(normalizedPaymentMethodId);

  res.json({
    success: true,
    message: 'Payment method added successfully',
    paymentMethod: {
      id: paymentMethod.id,
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
      expiryMonth: paymentMethod.card?.exp_month,
      expiryYear: paymentMethod.card?.exp_year,
      isDefault: setDefault
    }
  });
});

// @desc    Set default payment method
// @route   PUT /api/subscriptions/payment-methods/:methodId/default
// @access  Private
const setDefaultPaymentMethod = asyncHandler(async (req, res) => {
  const { methodId } = req.params;

  if (!req.user.stripeCustomerId) {
    res.status(400);
    throw new Error('No Stripe customer found');
  }

  await stripe.customers.update(req.user.stripeCustomerId, {
    invoice_settings: { default_payment_method: methodId }
  });

  res.json({ success: true, message: 'Default payment method updated' });
});

// @desc    Delete payment method
// @route   DELETE /api/subscriptions/payment-methods/:methodId
// @access  Private
const deletePaymentMethod = asyncHandler(async (req, res) => {
  const { methodId } = req.params;

  // Verify payment method belongs to user before detaching
  const paymentMethod = await stripe.paymentMethods.retrieve(methodId);

  if (paymentMethod.customer !== req.user.stripeCustomerId) {
    res.status(403);
    throw new Error('Not authorized to delete this payment method');
  }

  await stripe.paymentMethods.detach(methodId);

  res.json({ success: true, message: 'Payment method deleted' });
});

// @desc    Update default payment method (legacy)
// @route   POST /api/subscriptions/payment-method
// @access  Private
const updatePaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.body;

  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing', 'past_due'] }
  });

  if (!subscription) {
    res.status(404);
    throw new Error('No active subscription found');
  }

  await stripe.paymentMethods.attach(paymentMethodId, { customer: subscription.stripeCustomerId });
  await stripe.customers.update(subscription.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });

  if (subscription.status === 'past_due') {
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { default_payment_method: paymentMethodId }
    );
    subscription.status = updatedSubscription.status;
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  subscription.paymentMethodDetails = {
    type: 'card',
    brand: paymentMethod.card?.brand,
    last4: paymentMethod.card?.last4,
    expiryMonth: paymentMethod.card?.exp_month,
    expiryYear: paymentMethod.card?.exp_year
  };

  await subscription.save();

  res.json({
    success: true,
    message: 'Payment method updated successfully',
    paymentMethod: subscription.paymentMethodDetails
  });
});

// ============================================================
// INVOICES
// ============================================================

// @desc    Get subscription history & invoices
// @route   GET /api/subscriptions/history
// @access  Private
const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const subscriptions = await Subscription.find({ userId: req.user._id })
    .populate('planId')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Subscription.countDocuments({ userId: req.user._id });

  let invoices = [];
  if (req.user.stripeCustomerId) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: req.user.stripeCustomerId,
        limit: 12
      });
      invoices = stripeInvoices.data.map(inv => ({
        id: inv.id,
        number: inv.number,
        amount: inv.amount_paid / 100,
        currency: inv.currency,
        status: inv.status,
        date: new Date(inv.created * 1000),
        pdf: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url
      }));
    } catch (error) {
      console.error('Stripe invoices error:', error.message);
    }
  }

  res.json({
    success: true,
    subscriptions,
    invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get invoice by ID
// @route   GET /api/subscriptions/invoices/:invoiceId
// @access  Private
const getInvoice = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);

    if (invoice.customer !== req.user.stripeCustomerId) {
      res.status(403);
      throw new Error('Not authorized');
    }

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: invoice.status,
        date: new Date(invoice.created * 1000),
        pdf: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
        lines: invoice.lines.data.map(line => ({
          description: line.description,
          amount: line.amount / 100,
          period: {
            start: new Date(line.period.start * 1000),
            end: new Date(line.period.end * 1000)
          }
        }))
      }
    });
  } catch (error) {
    if (error.statusCode === 404 || error.message === 'Not authorized') throw error;
    res.status(404);
    throw new Error('Invoice not found');
  }
});

// @desc    Download invoice PDF
// @route   GET /api/subscriptions/invoices/:invoiceId/download
// @access  Private
const downloadInvoice = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const invoice = await stripe.invoices.retrieve(invoiceId);

  if (invoice.customer !== req.user.stripeCustomerId) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (!invoice.invoice_pdf) {
    res.status(404);
    throw new Error('Invoice PDF not available');
  }

  const pdfResponse = await fetch(invoice.invoice_pdf);
  if (!pdfResponse.ok) {
    res.status(502);
    throw new Error('Failed to fetch invoice PDF from Stripe');
  }

  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  const safeFileBase = invoice.number || invoice.id || 'invoice';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileBase}.pdf"`);
  res.send(pdfBuffer);
});

// @desc    Get upcoming invoice
// @route   GET /api/subscriptions/upcoming-invoice
// @access  Private
const getUpcomingInvoice = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing'] }
  });

  if (!subscription || !subscription.stripeSubscriptionId) {
    return res.json({ success: true, upcomingInvoice: null });
  }

  try {
    const invoice = await stripe.invoices.retrieveUpcoming({
      subscription: subscription.stripeSubscriptionId
    });

    res.json({
      success: true,
      upcomingInvoice: {
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        date: new Date(invoice.next_payment_attempt * 1000),
        lines: invoice.lines.data.map(line => ({
          description: line.description,
          amount: line.amount / 100,
          period: {
            start: new Date(line.period.start * 1000),
            end: new Date(line.period.end * 1000)
          }
        }))
      }
    });
  } catch (error) {
    console.error('Upcoming invoice error:', error.message);
    res.json({ success: true, upcomingInvoice: null });
  }
});

// ============================================================
// COUPONS
// ============================================================

// @desc    Apply coupon
// @route   POST /api/subscriptions/apply-coupon
// @access  Private
const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  try {
    const coupon = await stripe.coupons.retrieve(couponCode);

    if (!coupon.valid) {
      res.status(400);
      throw new Error('Invalid or expired coupon');
    }

    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: { $in: ['active', 'trialing'] }
    });

    if (subscription && subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        coupon: couponCode
      });

      subscription.discount = {
        couponId: coupon.id,
        code: couponCode,
        type: coupon.percent_off ? 'percentage' : 'fixed',
        amount: coupon.percent_off || coupon.amount_off / 100,
        duration: coupon.duration,
        durationInMonths: coupon.duration_in_months,
        validUntil: coupon.redeem_by ? new Date(coupon.redeem_by * 1000) : null
      };

      await subscription.save();
    }

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      discount: {
        type: coupon.percent_off ? 'percentage' : 'fixed',
        value: coupon.percent_off || coupon.amount_off / 100,
        description: coupon.name
      }
    });
  } catch (error) {
    console.error('Coupon error:', error.message);
    res.status(400);
    throw new Error('Invalid coupon code');
  }
});

// ============================================================
// TAX INFO
// ============================================================

// @desc    Get tax information
// @route   GET /api/subscriptions/tax-info
// @access  Private
const getTaxInfo = asyncHandler(async (req, res) => {
  if (!req.user.stripeCustomerId) {
    return res.json({ success: true, taxInfo: null });
  }

  const customer = await stripe.customers.retrieve(req.user.stripeCustomerId);

  res.json({
    success: true,
    taxInfo: {
      taxIds: customer.tax_ids?.data || [],
      address: customer.address,
      taxExempt: customer.tax_exempt
    }
  });
});

// @desc    Update tax information
// @route   PUT /api/subscriptions/tax-info
// @access  Private
const updateTaxInfo = asyncHandler(async (req, res) => {
  const { taxId, taxType, address } = req.body;

  if (!req.user.stripeCustomerId) {
    res.status(400);
    throw new Error('No Stripe customer found');
  }

  // Update address if provided
  if (address) {
    await stripe.customers.update(req.user.stripeCustomerId, { address });
  }

  // Add tax ID if provided
  let taxIdObj = null;
  if (taxId && taxType) {
    taxIdObj = await stripe.customers.createTaxId(req.user.stripeCustomerId, {
      type: taxType,
      value: taxId
    });
  }

  res.json({
    success: true,
    message: 'Tax information updated',
    taxId: taxIdObj
  });
});

// ============================================================
// LIMITS
// ============================================================

// @desc    Check subscription limits
// @route   GET /api/subscriptions/limits
// @access  Private
const checkLimits = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: { $in: ['active', 'trialing'] }
  }).populate('planId');

  if (!subscription) {
    const freePlan = await Plan.findOne({ planId: 'free' });
    return res.json({
      success: true,
      hasSubscription: false,
      limits: freePlan?.limits || subscriptionPlans.plans[0].limits,
      usage: { campaignsUsed: 0, activeDealsUsed: 0, teamMembersUsed: 0, storageUsed: 0, apiCallsUsed: 0 },
      can: { createCampaign: true, createDeal: true, inviteTeam: false, useAnalytics: false, useAPI: false }
    });
  }

  const limits = subscription.planDetails.limits;
  const usage = subscription.usage;

  res.json({
    success: true,
    hasSubscription: true,
    plan: subscription.planDetails.name,
    limits,
    usage,
    can: {
      createCampaign: !subscription.hasReachedLimit('campaigns'),
      createDeal: !subscription.hasReachedLimit('activeDeals'),
      inviteTeam: !subscription.hasReachedLimit('teamMembers'),
      useAnalytics: limits.analytics,
      useAPI: limits.api_access
    },
    daysRemaining: subscription.getDaysRemaining ? subscription.getDaysRemaining() : null
  });
});

// ============================================================
// ADMIN ROUTES
// ============================================================

// @desc    Get all subscriptions (admin)
// @route   GET /api/subscriptions/admin/all
// @access  Private/Admin
const adminGetAllSubscriptions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, planId, userId } = req.query;

  const query = {};
  if (status) query.status = status;
  if (planId) query.planId = planId;
  if (userId) query.userId = userId;

  const subscriptions = await Subscription.find(query)
    .populate('userId', 'fullName email')
    .populate('planId', 'name planId price')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Subscription.countDocuments(query);

  res.json({
    success: true,
    subscriptions,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
});

// @desc    Get single subscription (admin)
// @route   GET /api/subscriptions/admin/:subscriptionId
// @access  Private/Admin
const adminGetSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.subscriptionId)
    .populate('userId', 'fullName email stripeCustomerId')
    .populate('planId');

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  res.json({ success: true, subscription });
});

// @desc    Update subscription (admin)
// @route   PUT /api/subscriptions/admin/:subscriptionId
// @access  Private/Admin
const adminUpdateSubscription = asyncHandler(async (req, res) => {
  const { status, planId, metadata } = req.body;

  const subscription = await Subscription.findById(req.params.subscriptionId);
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  if (status) subscription.status = status;
  if (metadata) subscription.metadata = { ...subscription.metadata, ...metadata };

  if (planId) {
    const newPlan = await Plan.findOne({ planId });
    if (newPlan) {
      subscription.planId = newPlan.planId;
      subscription.planDetails = {
        name: newPlan.name,
        price: newPlan.price,
        currency: newPlan.currency,
        interval: newPlan.interval,
        intervalCount: newPlan.intervalCount,
        features: normalizePlanFeatures(newPlan.features),
        limits: newPlan.limits
      };
    }
  }

  await subscription.save();
  res.json({ success: true, message: 'Subscription updated', subscription });
});

// @desc    Cancel subscription (admin)
// @route   POST /api/subscriptions/admin/:subscriptionId/cancel
// @access  Private/Admin
const adminCancelSubscription = asyncHandler(async (req, res) => {
  const { reason, immediate = false } = req.body;

  const subscription = await Subscription.findById(req.params.subscriptionId);
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  if (subscription.stripeSubscriptionId) {
    if (immediate) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
    } else {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: { adminCancellationReason: reason }
      });
      subscription.cancelAtPeriodEnd = true;
    }
  } else {
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
  }

  subscription.cancellationReason = reason;
  await subscription.save();

  res.json({ success: true, message: 'Subscription cancelled', subscription });
});

// @desc    Get subscription stats (admin)
// @route   GET /api/subscriptions/admin/stats
// @access  Private/Admin
const adminGetStats = asyncHandler(async (req, res) => {
  const stats = await Subscription.getStats ? await Subscription.getStats() : {};

  const revenueByPlan = await Subscription.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$planId', count: { $sum: 1 }, revenue: { $sum: '$planDetails.price' } } },
    { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' } }
  ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const canceledLast30Days = await Subscription.countDocuments({
    status: 'canceled',
    canceledAt: { $gte: thirtyDaysAgo }
  });

  const activeAtStart = await Subscription.countDocuments({
    status: 'active',
    createdAt: { $lt: thirtyDaysAgo }
  });

  const churnRate = activeAtStart > 0 ? (canceledLast30Days / activeAtStart) * 100 : 0;

  res.json({
    success: true,
    stats: {
      ...stats,
      revenueByPlan: revenueByPlan.map(item => ({
        planName: item.plan[0]?.name || 'Unknown',
        count: item.count,
        revenue: item.revenue
      })),
      churnRate: parseFloat(churnRate.toFixed(2))
    }
  });
});

// @desc    Get revenue analytics (admin)
// @route   GET /api/subscriptions/admin/revenue
// @access  Private/Admin
const adminGetRevenue = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'month' } = req.query;

  const matchStage = { status: { $in: ['active', 'canceled'] } };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const groupFormats = {
    day: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
    week: { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } },
    month: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
  };

  const revenueData = await Subscription.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupFormats[groupBy] || groupFormats.month,
        revenue: { $sum: '$planDetails.price' },
        count: { $sum: 1 },
        newSubscriptions: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        cancellations: { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0] } }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  const totalRevenue = revenueData.reduce((acc, item) => acc + item.revenue, 0);
  const totalSubscriptions = await Subscription.countDocuments({ status: 'active' });

  res.json({
    success: true,
    revenue: {
      total: totalRevenue,
      activeSubscriptions: totalSubscriptions,
      data: revenueData
    }
  });
});

// ============================================================
// PLAN MANAGEMENT (Admin)
// ============================================================

// @desc    Get all plans (admin)
// @route   GET /api/subscriptions/admin/plans/all
// @access  Private/Admin
const adminGetAllPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find().sort('price');
  res.json({ success: true, plans });
});

// @desc    Get single plan (admin)
// @route   GET /api/subscriptions/admin/plans/:planId
// @access  Private/Admin
const adminGetPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ planId: req.params.planId });
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }
  res.json({ success: true, plan });
});

// @desc    Create plan (admin)
// @route   POST /api/subscriptions/admin/plans
// @access  Private/Admin
const adminCreatePlan = asyncHandler(async (req, res) => {
  const { planId, name, description, price, currency = 'usd', interval = 'month', features, limits } = req.body;

  const existingPlan = await Plan.findOne({ planId });
  if (existingPlan) {
    res.status(400);
    throw new Error('Plan with this ID already exists');
  }

  // Create Stripe product and price
  const stripeProduct = await stripe.products.create({
    name,
    description,
    metadata: { planId }
  });

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.round(price * 100),
    currency,
    recurring: { interval }
  });

  const plan = await Plan.create({
    planId,
    name,
    description,
    price,
    currency,
    interval,
    features: features || [],
    limits: limits || {},
    stripeProductId: stripeProduct.id,
    stripePriceId: { [interval]: stripePrice.id },
    isActive: true,
    isPublic: true
  });

  res.status(201).json({ success: true, message: 'Plan created', plan });
});

// @desc    Update plan (admin)
// @route   PUT /api/subscriptions/admin/plans/:planId
// @access  Private/Admin
const adminUpdatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ planId: req.params.planId });
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  const allowedUpdates = ['name', 'description', 'features', 'limits', 'isActive', 'isPublic', 'metadata'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) plan[field] = req.body[field];
  });

  // Update Stripe product name/description if changed
  if ((req.body.name || req.body.description) && plan.stripeProductId) {
    await stripe.products.update(plan.stripeProductId, {
      ...(req.body.name && { name: req.body.name }),
      ...(req.body.description && { description: req.body.description })
    });
  }

  await plan.save();
  res.json({ success: true, message: 'Plan updated', plan });
});

// @desc    Delete plan (admin)
// @route   DELETE /api/subscriptions/admin/plans/:planId
// @access  Private/Admin
const adminDeletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ planId: req.params.planId });
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  // Check if any active subscriptions use this plan
  const activeSubscriptions = await Subscription.countDocuments({
    planId: plan.planId,
    status: { $in: ['active', 'trialing'] }
  });

  if (activeSubscriptions > 0) {
    res.status(400);
    throw new Error(`Cannot delete plan with ${activeSubscriptions} active subscription(s). Deactivate it instead.`);
  }

  // Archive Stripe product instead of deleting
  if (plan.stripeProductId) {
    await stripe.products.update(plan.stripeProductId, { active: false });
  }

  await plan.deleteOne();
  res.json({ success: true, message: 'Plan deleted' });
});

// ============================================================
// CUSTOMER MANAGEMENT (Admin)
// ============================================================

// @desc    Get all customers (admin)
// @route   GET /api/subscriptions/admin/customers
// @access  Private/Admin
const adminGetCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const customers = await User.find({ stripeCustomerId: { $exists: true, $ne: null } })
    .select('fullName email stripeCustomerId createdAt')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await User.countDocuments({ stripeCustomerId: { $exists: true, $ne: null } });

  // Enrich with subscription data
  const enrichedCustomers = await Promise.all(
    customers.map(async customer => {
      const subscription = await Subscription.findOne({
        userId: customer._id,
        status: { $in: ['active', 'trialing'] }
      }).populate('planId', 'name price');

      return {
        ...customer.toObject(),
        subscription: subscription ? {
          status: subscription.status,
          plan: subscription.planDetails?.name,
          price: subscription.planDetails?.price
        } : null
      };
    })
  );

  res.json({
    success: true,
    customers: enrichedCustomers,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
});

// @desc    Get single customer (admin)
// @route   GET /api/subscriptions/admin/customers/:userId
// @access  Private/Admin
const adminGetCustomer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const subscriptions = await Subscription.find({ userId: user._id })
    .populate('planId')
    .sort({ createdAt: -1 });

  let stripeCustomer = null;
  if (user.stripeCustomerId) {
    try {
      stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
    } catch (error) {
      console.error('Stripe customer retrieve error:', error.message);
    }
  }

  res.json({
    success: true,
    customer: {
      user,
      subscriptions,
      stripeCustomer: stripeCustomer ? {
        id: stripeCustomer.id,
        email: stripeCustomer.email,
        balance: stripeCustomer.balance / 100,
        currency: stripeCustomer.currency,
        delinquent: stripeCustomer.delinquent,
        created: new Date(stripeCustomer.created * 1000)
      } : null
    }
  });
});

// ============================================================
// PAYMENT OPERATIONS (Admin)
// ============================================================

// @desc    Refund payment (admin)
// @route   POST /api/subscriptions/admin/refund/:paymentId
// @access  Private/Admin
const adminRefundPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const { amount, reason = 'requested_by_customer' } = req.body;

  const refundData = { payment_intent: paymentId, reason };
  if (amount) refundData.amount = Math.round(amount * 100);

  const refund = await stripe.refunds.create(refundData);

  res.json({
    success: true,
    message: 'Refund processed successfully',
    refund: {
      id: refund.id,
      amount: refund.amount / 100,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason
    }
  });
});

// ============================================================
// EXPORT DATA (Admin)
// ============================================================

// @desc    Export subscription data (admin)
// @route   GET /api/subscriptions/admin/export
// @access  Private/Admin
const adminExportData = asyncHandler(async (req, res) => {
  const { format = 'json', dateRange } = req.query;

  const query = {};
  if (dateRange) {
    const [start, end] = dateRange.split(',');
    query.createdAt = { $gte: new Date(start), $lte: new Date(end) };
  }

  const subscriptions = await Subscription.find(query)
    .populate('userId', 'fullName email')
    .populate('planId', 'name planId price')
    .sort({ createdAt: -1 });

  const exportData = subscriptions.map(sub => ({
    subscriptionId: sub._id,
    userId: sub.userId?._id,
    userEmail: sub.userId?.email,
    userName: sub.userId?.fullName,
    plan: sub.planDetails?.name,
    price: sub.planDetails?.price,
    currency: sub.planDetails?.currency,
    interval: sub.planDetails?.interval,
    status: sub.status,
    createdAt: sub.createdAt,
    canceledAt: sub.canceledAt,
    currentPeriodEnd: sub.billingPeriod?.end
  }));

  if (format === 'csv') {
    const headers = Object.keys(exportData[0] || {}).join(',');
    const rows = exportData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
    return res.send(csv);
  }

  res.json({ success: true, total: exportData.length, data: exportData });
});

// ============================================================
// MODULE EXPORTS — all functions used in subscriptionRoutes.js
// ============================================================
module.exports = {
  // Public
  getPlans,
  getPlanDetails,
  calculatePrice,

  // User
  getCurrentSubscription,
  subscribe,
  createCheckoutSession,
  createBillingPortalSession,
  createPlanChangeSession,
  cancelSubscription,
  changePlan,
  updatePaymentMethod,
  getSubscriptionHistory,
  checkLimits,
  reactivateSubscription,
  getInvoice,
  applyCoupon,
  getUpcomingInvoice,
  previewPlanChange,
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  getTaxInfo,
  updateTaxInfo,
  downloadInvoice,

  // Admin
  adminGetAllSubscriptions,
  adminGetSubscription,
  adminUpdateSubscription,
  adminCancelSubscription,
  adminGetStats,
  adminGetRevenue,
  adminCreatePlan,
  adminUpdatePlan,
  adminDeletePlan,
  adminGetAllPlans,
  adminGetPlan,
  adminGetCustomers,
  adminGetCustomer,
  adminRefundPayment,
  adminExportData
};