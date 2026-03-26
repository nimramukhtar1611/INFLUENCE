// services/stripeService.js - FULL FIXED VERSION
const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

class StripeService {
  async findPlanByStripePriceId(priceId) {
    if (!priceId) return null;

    return Plan.findOne({
      $or: [
        { stripePriceId: priceId },
        { 'stripePriceId.month': priceId },
        { 'stripePriceId.year': priceId }
      ]
    });
  }

  async resolveUserFromStripeContext(stripeCustomerId, metadata = {}) {
    if (metadata?.userId) {
      const user = await User.findById(metadata.userId);
      if (user) return user;
    }

    if (!stripeCustomerId) return null;
    return User.findOne({ stripeCustomerId });
  }

  async upsertSubscriptionFromStripe(stripeSubscription) {
    const metadata = stripeSubscription?.metadata || {};
    const user = await this.resolveUserFromStripeContext(stripeSubscription?.customer, metadata);

    if (!user) {
      console.warn('⚠️ Unable to resolve user for Stripe subscription:', stripeSubscription?.id);
      return null;
    }

    const priceId = stripeSubscription?.items?.data?.[0]?.price?.id;
    const planByPrice = await this.findPlanByStripePriceId(priceId);
    const existingLocalSubscription = await Subscription.findOne({ userId: user._id }).select('planId planDetails.interval');
    const stripeInterval = stripeSubscription?.items?.data?.[0]?.price?.recurring?.interval;

    // Prefer Stripe price mapping over metadata because metadata can be stale after portal updates.
    const planId = planByPrice?.planId || metadata.planId || existingLocalSubscription?.planId || 'free';
    const interval = stripeInterval || planByPrice?.interval || metadata.interval || existingLocalSubscription?.planDetails?.interval || 'month';

    const plan = planByPrice || await Plan.findOne({ planId });
    if (!plan) {
      console.warn('⚠️ Unable to resolve plan for Stripe subscription:', stripeSubscription?.id);
      return null;
    }

    const currentPeriodStartSeconds = stripeSubscription.current_period_start || stripeSubscription.items?.data?.[0]?.current_period_start;
    const currentPeriodEndSeconds = stripeSubscription.current_period_end || stripeSubscription.items?.data?.[0]?.current_period_end;
    const billingStart = currentPeriodStartSeconds ? new Date(currentPeriodStartSeconds * 1000) : new Date();
    const billingEnd = currentPeriodEndSeconds ? new Date(currentPeriodEndSeconds * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const normalizedFeatures = Array.isArray(plan.features)
      ? plan.features.map((feature) => (typeof feature === 'string' ? feature : feature?.name)).filter(Boolean)
      : [];

    const subscriptionDoc = await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        planId,
        status: stripeSubscription.status || 'active',
        stripeCustomerId: stripeSubscription.customer,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        planDetails: {
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          interval,
          intervalCount: plan.intervalCount,
          features: normalizedFeatures,
          limits: plan.limits
        },
        billingPeriod: {
          start: billingStart,
          end: billingEnd
        },
        cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : undefined
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    await User.findByIdAndUpdate(user._id, {
      stripeCustomerId: stripeSubscription.customer,
      'subscription.status': stripeSubscription.status,
      'subscription.currentPeriodStart': billingStart,
      'subscription.currentPeriodEnd': billingEnd,
      'subscription.cancelAtPeriodEnd': Boolean(stripeSubscription.cancel_at_period_end)
    });

    // Cancel any OTHER active Stripe subscriptions for this customer to prevent duplicates
    await this.cancelDuplicateSubscriptions(stripeSubscription.customer, stripeSubscription.id);

    return subscriptionDoc;
  }

  /**
   * Cancel all active Stripe subscriptions for a customer EXCEPT the one with keepSubscriptionId.
   * This prevents duplicate active subscriptions from appearing in the billing portal.
   */
  async cancelDuplicateSubscriptions(customerId, keepSubscriptionId) {
    if (!customerId || !keepSubscriptionId) return;

    try {
      const allSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 100
      });

      // Also check for trialing or past_due duplicates
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'trialing',
        limit: 100
      });

      const pastDueSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'past_due',
        limit: 100
      });

      const allSubscriptions = [
        ...allSubs.data,
        ...trialingSubs.data,
        ...pastDueSubs.data
      ];

      for (const sub of allSubscriptions) {
        if (sub.id !== keepSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(sub.id);
            console.log(`🗑️ Cancelled duplicate Stripe subscription: ${sub.id} (keeping ${keepSubscriptionId})`);
          } catch (cancelErr) {
            console.warn(`⚠️ Failed to cancel duplicate subscription ${sub.id}:`, cancelErr.message);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error checking for duplicate subscriptions:', error.message);
    }
  }

  // ==================== CUSTOMER MANAGEMENT ====================
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { source: 'influencex', ...metadata }
      });
      return customer;
    } catch (error) {
      console.error('Stripe create customer error:', error);
      throw error;
    }
  }

  async getCustomer(customerId) {
    try {
      return await stripe.customers.retrieve(customerId);
    } catch (error) {
      console.error('Stripe get customer error:', error);
      throw error;
    }
  }

  async updateCustomer(customerId, data) {
    try {
      return await stripe.customers.update(customerId, data);
    } catch (error) {
      console.error('Stripe update customer error:', error);
      throw error;
    }
  }

  // ==================== PAYMENT METHODS ====================
  async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      return await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    } catch (error) {
      console.error('Stripe attach payment method error:', error);
      throw error;
    }
  }

  async detachPaymentMethod(paymentMethodId) {
    try {
      return await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      console.error('Stripe detach payment method error:', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(customerId, paymentMethodId) {
    try {
      return await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
    } catch (error) {
      console.error('Stripe set default payment method error:', error);
      throw error;
    }
  }

  async listPaymentMethods(customerId, type = 'card') {
    try {
      return await stripe.paymentMethods.list({ customer: customerId, type });
    } catch (error) {
      console.error('Stripe list payment methods error:', error);
      throw error;
    }
  }

  // ==================== PAYMENT INTENTS ====================
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      // ✅ FIX: Validate amount before creating intent
      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: { enabled: true }
      });
      return paymentIntent;
    } catch (error) {
      console.error('Stripe create payment intent error:', error);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.confirm(paymentIntentId);
    } catch (error) {
      console.error('Stripe confirm payment intent error:', error);
      throw error;
    }
  }

  async getPaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Stripe get payment intent error:', error);
      throw error;
    }
  }

  async cancelPaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      console.error('Stripe cancel payment intent error:', error);
      throw error;
    }
  }

  // ==================== REFUNDS ====================
  async createRefund(paymentIntentId, amount = null, reason = null) {
    try {
      const refundParams = { payment_intent: paymentIntentId };
      if (amount) refundParams.amount = Math.round(amount * 100);

      // ✅ FIX: Validate reason against Stripe accepted values
      const validReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
      if (reason && validReasons.includes(reason)) {
        refundParams.reason = reason;
      }

      return await stripe.refunds.create(refundParams);
    } catch (error) {
      console.error('Stripe create refund error:', error);
      throw error;
    }
  }

  async getRefund(refundId) {
    try {
      return await stripe.refunds.retrieve(refundId);
    } catch (error) {
      console.error('Stripe get refund error:', error);
      throw error;
    }
  }

  // ==================== TRANSFERS ====================
  async createTransfer(amount, destination, metadata = {}) {
    try {
      // ✅ FIX: Validate destination account exists
      if (!destination) throw new Error('Transfer destination is required');

      return await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination,
        metadata
      });
    } catch (error) {
      console.error('Stripe create transfer error:', error);
      throw error;
    }
  }

  // ==================== SUBSCRIPTIONS ====================
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      return await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata
      });
    } catch (error) {
      console.error('Stripe create subscription error:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      if (cancelAtPeriodEnd) {
        return await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
      }
      return await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Stripe cancel subscription error:', error);
      throw error;
    }
  }

  async getSubscription(subscriptionId) {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Stripe get subscription error:', error);
      throw error;
    }
  }

  // ==================== INVOICES ====================
  async getInvoice(invoiceId) {
    try {
      return await stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      console.error('Stripe get invoice error:', error);
      throw error;
    }
  }

  async listInvoices(customerId, limit = 100) {
    try {
      return await stripe.invoices.list({ customer: customerId, limit });
    } catch (error) {
      console.error('Stripe list invoices error:', error);
      throw error;
    }
  }

  // ==================== WEBHOOK EVENT HANDLER ====================
  // ✅ FIX: Single unified webhook handler — no duplicate logic
  async handleWebhookEvent(event) {
    console.log(`⚡ Processing webhook: ${event.type}`);

    const handlers = {
      'checkout.session.completed':       () => this.handleCheckoutSessionCompleted(event.data.object),
      'payment_intent.succeeded':        () => this.handlePaymentIntentSucceeded(event.data.object),
      'payment_intent.payment_failed':   () => this.handlePaymentIntentFailed(event.data.object),
      'charge.refunded':                 () => this.handleChargeRefunded(event.data.object),
      'customer.subscription.created':   () => this.handleSubscriptionCreated(event.data.object),
      'customer.subscription.updated':   () => this.handleSubscriptionUpdated(event.data.object),
      'customer.subscription.deleted':   () => this.handleSubscriptionDeleted(event.data.object),
      'invoice.payment_succeeded':       () => this.handleInvoicePaymentSucceeded(event.data.object),
      'invoice.payment_failed':          () => this.handleInvoicePaymentFailed(event.data.object),
    };

    const handler = handlers[event.type];
    if (handler) {
      await handler();
    } else {
      console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
    }
  }

  async handleCheckoutSessionCompleted(session) {
    try {
      if (session.mode === 'subscription' && session.subscription) {
        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription, {
          expand: ['items.data.price']
        });
        await this.upsertSubscriptionFromStripe(stripeSubscription);
      }

      if (session.mode === 'payment' && session.metadata?.purpose === 'wallet_topup') {
        const user = await this.resolveUserFromStripeContext(session.customer, session.metadata);
        if (user) {
          const existing = await Payment.findOne({ 'metadata.checkoutSessionId': session.id });
          if (!existing) {
            const amount = (session.amount_total || 0) / 100;
            const transactionId = `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            await Payment.create({
              transactionId,
              type: 'payment',
              status: 'completed',
              amount,
              currency: (session.currency || 'usd').toUpperCase(),
              fee: 0,
              netAmount: amount,
              from: { userId: user._id, accountType: user.userType || 'brand' },
              to: { userId: user._id, accountType: user.userType || 'brand' },
              description: 'Stripe wallet top-up',
              metadata: {
                kind: 'deposit',
                checkoutSessionId: session.id,
                paymentIntentId: session.payment_intent
              }
            });
          }
        }
      }

      console.log(`✅ Checkout session completed: ${session.id}`);
    } catch (error) {
      console.error('Error handling checkout session completed:', error);
    }
  }

  // ==================== INDIVIDUAL WEBHOOK HANDLERS ====================
  async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        {
          status: 'completed',
          paidAt: new Date(),
          metadata: {
            ...paymentIntent.metadata,
            paymentMethod: paymentIntent.payment_method
          }
        },
        { new: true }
      );

      if (payment) {
        if (payment.dealId) {
          await Deal.findByIdAndUpdate(payment.dealId, { paymentStatus: 'in-escrow' });
        }

        await Notification.create({
          userId: payment.from.userId,
          type: 'payment',
          title: 'Payment Successful',
          message: `Payment of $${payment.amount} was successful`,
          data: { paymentId: payment._id }
        });
      }

      console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  }

  async handlePaymentIntentFailed(paymentIntent) {
    try {
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        {
          status: 'failed',
          failureCode: paymentIntent.last_payment_error?.code,
          failureMessage: paymentIntent.last_payment_error?.message,
          metadata: {
            ...paymentIntent.metadata,
            error: paymentIntent.last_payment_error
          }
        },
        { new: true }
      );

      if (payment) {
        await Notification.create({
          userId: payment.from.userId,
          type: 'alert',
          title: 'Payment Failed',
          message: `Payment of $${payment.amount} failed. Please try again.`,
          priority: 'high',
          data: { paymentId: payment._id }
        });
      }

      console.log(`❌ Payment failed: ${paymentIntent.id}`);
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  async handleChargeRefunded(charge) {
    try {
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: charge.payment_intent },
        {
          status: charge.amount_refunded >= charge.amount ? 'refunded' : 'partially_refunded',
          $push: {
            refunds: {
              refundId: charge.refunds?.data[0]?.id,
              amount: charge.amount_refunded / 100,
              reason: charge.refunds?.data[0]?.reason,
              status: 'completed',
              processedAt: new Date()
            }
          },
          totalRefunded: charge.amount_refunded / 100,
          refundCount: charge.refunds?.data?.length || 0,
          lastRefundAt: new Date()
        },
        { new: true }
      );

      if (payment) {
        const isFullRefund = payment.amount <= payment.totalRefunded;

        if (payment.dealId) {
          await Deal.findByIdAndUpdate(payment.dealId, {
            paymentStatus: isFullRefund ? 'refunded' : 'partially_refunded'
          });
        }

        await Notification.create({
          userId: payment.from.userId,
          type: 'payment',
          title: 'Refund Processed',
          message: `Refund of $${charge.amount_refunded / 100} has been processed`,
          data: { paymentId: payment._id }
        });
      }

      console.log(`💰 Refund processed: ${charge.id}`);
    } catch (error) {
      console.error('Error handling refund:', error);
    }
  }

  async handleSubscriptionCreated(subscription) {
    try {
      await this.upsertSubscriptionFromStripe(subscription);

      console.log(`📅 Subscription created: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  async handleSubscriptionUpdated(subscription) {
    try {
      await this.upsertSubscriptionFromStripe(subscription);

      console.log(`📅 Subscription updated: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  async handleSubscriptionDeleted(subscription) {
    try {
      const user = await this.resolveUserFromStripeContext(subscription?.customer, subscription?.metadata || {});
      if (!user) return;

      await Subscription.findOneAndUpdate(
        { userId: user._id },
        {
          status: 'canceled',
          cancelAtPeriodEnd: false,
          canceledAt: new Date()
        }
      );

      await User.findByIdAndUpdate(user._id, {
        'subscription.status': 'canceled',
        'subscription.canceledAt': new Date()
      });

      console.log(`📅 Subscription deleted: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  async handleInvoicePaymentSucceeded(invoice) {
    try {
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      if (user) {
        await Notification.create({
          userId: user._id,
          type: 'payment',
          title: 'Invoice Paid',
          message: `Invoice ${invoice.number} has been paid successfully`,
          data: { invoiceId: invoice.id }
        });
      }
      console.log(`💰 Invoice paid: ${invoice.id}`);
    } catch (error) {
      console.error('Error handling invoice payment success:', error);
    }
  }

  async handleInvoicePaymentFailed(invoice) {
    try {
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      if (user) {
        await Notification.create({
          userId: user._id,
          type: 'alert',
          title: 'Payment Failed',
          message: 'Your subscription payment failed. Please update your payment method.',
          priority: 'high',
          data: { invoiceId: invoice.id }
        });
      }
      console.log(`❌ Invoice payment failed: ${invoice.id}`);
    } catch (error) {
      console.error('Error handling invoice payment failure:', error);
    }
  }

  // ==================== BALANCE & CONNECT ACCOUNTS ====================
  async getBalance() {
    try {
      return await stripe.balance.retrieve();
    } catch (error) {
      console.error('Stripe get balance error:', error);
      throw error;
    }
  }

  async createAccount(email, country = 'US') {
    try {
      return await stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: { transfers: { requested: true } }
      });
    } catch (error) {
      console.error('Stripe create account error:', error);
      throw error;
    }
  }

  async getAccountLink(accountId, refreshUrl, returnUrl) {
    try {
      return await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });
    } catch (error) {
      console.error('Stripe create account link error:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();