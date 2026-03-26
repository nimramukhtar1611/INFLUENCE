const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Admin = require('../models/Admin');
const Plan = require('../models/Plan');

const useTestDb = process.env.SEED_USE_TEST_DB === 'true' || process.env.NODE_ENV === 'test';
const mongoUri = useTestDb
  ? (process.env.MONGODB_TEST_URI || process.env.MONGODB_URI)
  : process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing MongoDB URI. Set MONGODB_URI (and optionally MONGODB_TEST_URI).');
  process.exit(1);
}

const qaBrands = [
  {
    email: 'qa.brand.owner1@influencex.com',
    password: 'QaBrand123',
    fullName: 'QA Brand Owner 1',
    userType: 'brand',
    brandName: 'QA Brand One',
    industry: 'Technology',
    website: 'https://qa-brand-one.com',
    emailVerified: true,
    status: 'active'
  },
  {
    email: 'qa.brand.owner2@influencex.com',
    password: 'QaBrand234',
    fullName: 'QA Brand Owner 2',
    userType: 'brand',
    brandName: 'QA Brand Two',
    industry: 'Fashion',
    website: 'https://qa-brand-two.com',
    emailVerified: true,
    status: 'active'
  }
];

const qaCreators = [
  {
    email: 'qa.creator.alpha@influencex.com',
    password: 'QaCreator123',
    fullName: 'QA Creator Alpha',
    userType: 'creator',
    displayName: 'QA Creator Alpha',
    handle: 'qa_creator_alpha',
    niches: ['Tech', 'Lifestyle'],
    emailVerified: true,
    status: 'active'
  },
  {
    email: 'qa.creator.beta@influencex.com',
    password: 'QaCreator234',
    fullName: 'QA Creator Beta',
    userType: 'creator',
    displayName: 'QA Creator Beta',
    handle: 'qa_creator_beta',
    niches: ['Beauty'],
    emailVerified: true,
    status: 'active'
  },
  {
    email: 'qa.suspended@influencex.com',
    password: 'QaSuspend123',
    fullName: 'QA Suspended Creator',
    userType: 'creator',
    displayName: 'QA Suspended Creator',
    handle: 'qa_suspended_creator',
    niches: ['Other'],
    emailVerified: true,
    status: 'suspended'
  }
];

const qaAdmins = [
  {
    email: 'qa.admin@influencex.com',
    password: 'QaAdmin123',
    fullName: 'QA Admin',
    role: 'admin',
    permissions: [
      'manage_users',
      'manage_campaigns',
      'manage_disputes',
      'manage_payments',
      'manage_settings',
      'view_analytics'
    ],
    isActive: true
  }
];

const qaPlans = [
  {
    planId: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    stripeProductId: null,
    stripePriceId: { month: null, year: null },
    features: ['Up to 3 campaigns', 'Basic creator search', 'Email support'],
    limits: {
      campaigns: 3,
      activeDeals: 2,
      teamMembers: 1,
      storage: 100,
      apiCalls: 1000,
      analytics: false,
      api_access: false,
      priority_support: false
    },
    metadata: { popular: false, color: '#6B7280' },
    isActive: true,
    isPublic: true
  },
  {
    planId: 'starter',
    name: 'Starter',
    description: 'For growing brands and creators',
    price: 49,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    stripeProductId: process.env.STRIPE_PRODUCT_STARTER || 'prod_REPLACE_STARTER',
    stripePriceId: {
      month: process.env.STRIPE_PRICE_STARTER_MONTH || 'price_REPLACE_STARTER_MONTHLY',
      year: process.env.STRIPE_PRICE_STARTER_YEAR || 'price_REPLACE_STARTER_YEARLY'
    },
    features: ['Up to 10 campaigns', 'Advanced creator search', 'Basic API access'],
    limits: {
      campaigns: 10,
      activeDeals: 5,
      teamMembers: 3,
      storage: 500,
      apiCalls: 5000,
      analytics: true,
      api_access: true,
      priority_support: false
    },
    metadata: { popular: false, color: '#3B82F6' },
    isActive: true,
    isPublic: true
  },
  {
    planId: 'professional',
    name: 'Professional',
    description: 'For serious marketers',
    price: 149,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    stripeProductId: process.env.STRIPE_PRODUCT_PROFESSIONAL || 'prod_REPLACE_PROFESSIONAL',
    stripePriceId: {
      month: process.env.STRIPE_PRICE_PROFESSIONAL_MONTH || 'price_REPLACE_PROFESSIONAL_MONTHLY',
      year: process.env.STRIPE_PRICE_PROFESSIONAL_YEAR || 'price_REPLACE_PROFESSIONAL_YEARLY'
    },
    features: ['Unlimited campaigns', 'AI matching', 'Priority support'],
    limits: {
      campaigns: -1,
      activeDeals: 20,
      teamMembers: 10,
      storage: 2000,
      apiCalls: 20000,
      analytics: true,
      api_access: true,
      priority_support: true
    },
    metadata: { popular: true, color: '#8B5CF6' },
    isActive: true,
    isPublic: true
  },
  {
    planId: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 499,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    stripeProductId: process.env.STRIPE_PRODUCT_ENTERPRISE || 'prod_REPLACE_ENTERPRISE',
    stripePriceId: {
      month: process.env.STRIPE_PRICE_ENTERPRISE_MONTH || 'price_REPLACE_ENTERPRISE_MONTHLY',
      year: process.env.STRIPE_PRICE_ENTERPRISE_YEAR || 'price_REPLACE_ENTERPRISE_YEARLY'
    },
    features: ['Everything in Professional', 'White-label', 'Dedicated manager'],
    limits: {
      campaigns: -1,
      activeDeals: -1,
      teamMembers: -1,
      storage: 10000,
      apiCalls: 100000,
      analytics: true,
      api_access: true,
      priority_support: true
    },
    metadata: { popular: false, color: '#EC4899' },
    isActive: true,
    isPublic: true
  }
];

async function upsertByEmail(Model, payload) {
  let doc = await Model.findOne({ email: payload.email });

  if (!doc) {
    doc = new Model(payload);
  } else {
    Object.assign(doc, payload);
  }

  await doc.save();
  return doc;
}

async function seedUsers() {
  const brands = [];
  const creators = [];
  const admins = [];

  for (const brandData of qaBrands) {
    const brand = await upsertByEmail(Brand, brandData);
    brands.push(brand.email);
  }

  for (const creatorData of qaCreators) {
    const creator = await upsertByEmail(Creator, creatorData);
    creators.push(creator.email);
  }

  for (const adminData of qaAdmins) {
    const admin = await upsertByEmail(Admin, adminData);
    admins.push(admin.email);
  }

  return { brands, creators, admins };
}

async function seedPlans() {
  const planIds = [];

  for (const plan of qaPlans) {
    await Plan.findOneAndUpdate(
      { planId: plan.planId },
      { $set: plan },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    planIds.push(plan.planId);
  }

  return planIds;
}

async function run() {
  console.log('Seeding QA data...');
  console.log(`Database: ${useTestDb ? 'TEST' : 'DEFAULT'} (${mongoUri})`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

    const { brands, creators, admins } = await seedUsers();
    const plans = await seedPlans();

    console.log('');
    console.log('QA seeding completed successfully.');
    console.log('');
    console.log('Users (plain passwords for login):');
    console.log('  qa.brand.owner1@influencex.com / QaBrand123');
    console.log('  qa.brand.owner2@influencex.com / QaBrand234');
    console.log('  qa.creator.alpha@influencex.com / QaCreator123');
    console.log('  qa.creator.beta@influencex.com / QaCreator234');
    console.log('  qa.suspended@influencex.com / QaSuspend123');
    console.log('  qa.admin@influencex.com / QaAdmin123');
    console.log('');
    console.log(`Seeded brands: ${brands.length}`);
    console.log(`Seeded creators: ${creators.length}`);
    console.log(`Seeded admins: ${admins.length}`);
    console.log(`Seeded plans: ${plans.length} (${plans.join(', ')})`);
    console.log('');
    console.log('If Stripe IDs are still placeholders, set these env vars and re-run:');
    console.log('  STRIPE_PRODUCT_STARTER, STRIPE_PRICE_STARTER_MONTH, STRIPE_PRICE_STARTER_YEAR');
    console.log('  STRIPE_PRODUCT_PROFESSIONAL, STRIPE_PRICE_PROFESSIONAL_MONTH, STRIPE_PRICE_PROFESSIONAL_YEAR');
    console.log('  STRIPE_PRODUCT_ENTERPRISE, STRIPE_PRICE_ENTERPRISE_MONTH, STRIPE_PRICE_ENTERPRISE_YEAR');
  } catch (error) {
    console.error('QA seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
