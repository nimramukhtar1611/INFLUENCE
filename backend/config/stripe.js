// config/stripe.js
const Stripe = require('stripe');

const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();

if (!stripeSecretKey) {
  throw new Error('❌ STRIPE_SECRET_KEY is not set in environment variables');
}

if (stripeSecretKey === 'sk_test_placeholder' || stripeSecretKey.includes('placeholder')) {
  throw new Error('❌ STRIPE_SECRET_KEY is using a placeholder value. Set a real Stripe secret key.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-08-16',
  timeout: 10000, // 10 second timeout
  maxNetworkRetries: 2, // Auto retry on network failures
});

module.exports = stripe;