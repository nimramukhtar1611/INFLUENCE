// services/stripeService.js - FULL FIXED VERSION
const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');

class StripeService {

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
      const { userId } = subscription.metadata;
      if (!userId) return console.warn('⚠️ No userId in subscription metadata');

      await User.findByIdAndUpdate(userId, {
        'subscription.status': subscription.status,
        'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000)
      });

      console.log(`📅 Subscription created: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  async handleSubscriptionUpdated(subscription) {
    try {
      const { userId } = subscription.metadata;
      if (!userId) return console.warn('⚠️ No userId in subscription metadata');

      await User.findByIdAndUpdate(userId, {
        'subscription.status': subscription.status,
        'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
        'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end
      });

      console.log(`📅 Subscription updated: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  async handleSubscriptionDeleted(subscription) {
    try {
      const { userId } = subscription.metadata;
      if (!userId) return console.warn('⚠️ No userId in subscription metadata');

      await User.findByIdAndUpdate(userId, {
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