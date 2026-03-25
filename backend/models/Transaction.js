// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  type: {
    type: String,
    enum: [
      'subscription_created',
      'subscription_renewed',
      'subscription_upgraded',
      'subscription_downgraded',
      'subscription_canceled',
      'payment_succeeded',
      'payment_failed',
      'refund',
      'fee_charge'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'card']
  },
  stripePaymentIntentId: String,
  stripeInvoiceId: String,
  stripeSubscriptionId: String,
  
  // Fee breakdown
  fees: {
    platformFee: Number,
    stripeFee: Number,
    tax: Number,
    total: Number
  },

  // Invoice
  invoiceNumber: String,
  invoiceUrl: String,
  invoicePdf: String,

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  description: String,

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate invoice number
transactionSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Transaction').countDocuments({
      createdAt: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    });
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);