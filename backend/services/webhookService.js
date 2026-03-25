// services/webhookService.js
const stripe = require('../config/stripe');
const crypto = require('crypto');
class WebhookService {
  // Verify webhook signature
  static verifySignature(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Handle Stripe webhooks
  static async handleStripeWebhook(event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoiceSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoiceFailure(event.data.object);
        break;
    }
  }

  // Handle payment success
  static async handlePaymentSuccess(paymentIntent) {
    const Payment = require('../models/Payment');
    
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'completed',
        paidAt: new Date()
      }
    );
  }

  // Handle payment failure
  static async handlePaymentFailure(paymentIntent) {
    const Payment = require('../models/Payment');
    const notificationService = require('./notificationService');
    
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      { status: 'failed' },
      { new: true }
    );

    if (payment) {
      await notificationService.sendNotification({
        userId: payment.from.userId,
        type: 'payment',
        title: 'Payment Failed',
        message: `Payment of $${payment.amount} failed. Please try again.`,
        data: { paymentId: payment._id }
      });
    }
  }

  // Handle subscription created
  static async handleSubscriptionCreated(subscription) {
    const Subscription = require('../models/Subscription');
    
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status,
        billingPeriod: {
          start: new Date(subscription.current_period_start * 1000),
          end: new Date(subscription.current_period_end * 1000)
        }
      }
    );
  }

  // Handle subscription updated
  static async handleSubscriptionUpdated(subscription) {
    const Subscription = require('../models/Subscription');
    
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status,
        billingPeriod: {
          start: new Date(subscription.current_period_start * 1000),
          end: new Date(subscription.current_period_end * 1000)
        },
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    );
  }

  // Handle subscription deleted
  static async handleSubscriptionDeleted(subscription) {
    const Subscription = require('../models/Subscription');
    
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: 'canceled',
        canceledAt: new Date()
      }
    );
  }

  // Handle invoice success
  static async handleInvoiceSuccess(invoice) {
    const Transaction = require('../models/Transaction');
    const User = require('../models/User');
    
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    
    if (user) {
      await Transaction.create({
        userId: user._id,
        type: 'payment_succeeded',
        amount: invoice.amount_paid / 100,
        status: 'completed',
        stripeInvoiceId: invoice.id,
        invoiceNumber: invoice.number,
        invoiceUrl: invoice.hosted_invoice_url
      });
    }
  }

  // Handle invoice failure
  static async handleInvoiceFailure(invoice) {
    const User = require('../models/User');
    const notificationService = require('./notificationService');
    
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    
    if (user) {
      await notificationService.sendNotification({
        userId: user._id,
        type: 'alert',
        title: 'Payment Failed',
        message: 'Your subscription payment failed. Please update your payment method.',
        priority: 'high'
      });
    }
  }
}

module.exports = WebhookService;