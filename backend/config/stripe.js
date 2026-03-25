// config/stripe.js
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('❌ STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
  timeout: 10000, // 10 second timeout
  maxNetworkRetries: 2, // Auto retry on network failures
});

module.exports = stripe;