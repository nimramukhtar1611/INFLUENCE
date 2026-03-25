// server.js - FULL FIXED VERSION
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('./models');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 DEBUG: Server starting...');
console.log('🔍 DEBUG: MONGODB_URI exists?', process.env.MONGODB_URI ? '✅ YES' : '❌ NO');

// ─── IMPORTS ──────────────────────────────────────────────────────────────────

const authRoutes = require('./routes/authRoutes');
const brandRoutes = require('./routes/brandRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const dealRoutes = require('./routes/dealRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const searchRoutes = require('./routes/searchRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const disputeRoutes = require('./routes/disputeRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const contractRoutes = require('./routes/contractRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const featuredRoutes = require('./routes/featuredRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const socialOAuthRoutes = require('./routes/socialOAuthRoutes');
const twoFARoutes = require('./routes/twoFARoutes');
const adminTwoFARoutes = require('./routes/adminTwoFARoutes');

const { initializeSocket } = require('./socket/chatSocket');
const cronJobManager = require('./utils/cronJobs');
const { connectRedis, cache } = require('./config/redis');
const { initializeSentry, captureException } = require('./utils/sentry');

// ─── APP SETUP ────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const isTestEnv = process.env.NODE_ENV === 'test';

if (!isTestEnv) {
  initializeSentry();
}

// ─── PROCESS ERROR HANDLERS ───────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  // Don't exit — log and continue for non-critical async errors
});

process.on('uncaughtException', (err) => {
  // ✅ FIX: Exit on uncaughtException — server is in unknown state
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await mongoose.connection.close();
    if (cache && typeof cache.flush === 'function') await cache.flush();
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close();
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────

if (!isTestEnv) {
  try {
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
      },
    });

    initializeSocket(io);
    app.set('io', io);
    console.log('✅ Socket.io initialized');
  } catch (err) {
    console.error('❌ Socket.io error:', err.message);
  }
} else {
  console.log('🧪 Test mode: Skipping Socket.io initialization');
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// ✅ FIX: Stripe webhook raw body — MUST be before express.json()
// Stripe signature verify karne ke liye raw Buffer chahiye
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// Normal JSON parsing for all other routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(morgan(isTestEnv ? 'silent' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Redis attach to request
app.use((req, res, next) => {
  req.redis = cache;
  req.cache = cache;
  next();
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// ✅ FIX: Routes registered BEFORE DB connect — Express queues requests,
//    controllers handle DB errors individually if DB is not ready yet.

app.use('/api/auth/2fa', twoFARoutes);
app.use('/api/auth', authRoutes);

app.use('/api/admin/2fa', adminTwoFARoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/brands', brandRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/featured', featuredRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/social-oauth', socialOAuthRoutes);

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────

// ✅ Must have 4 params for Express to treat it as error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  captureException(err, {
    tags: {
      method: req.method,
      path: req.path
    },
    extra: {
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user?._id
    }
  });

  console.error('🔥 Error:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ─── DATABASE CONNECTION & BOOTSTRAP ─────────────────────────────────────────

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing from environment variables');
  process.exit(1);
}

const mongoUri = isTestEnv
  ? (process.env.MONGODB_TEST_URI || process.env.MONGODB_URI + '_test')
  : process.env.MONGODB_URI;

console.log('🔍 Connecting to MongoDB...');

async function startServer() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB connected${isTestEnv ? ' (test database)' : ''}`);

    // Redis
    if (!isTestEnv) {
      try {
        await connectRedis();
      } catch (err) {
        console.warn('⚠️ Redis connection failed:', err.message);
      }
    }

    // Email
    try {
      const emailService = require('./services/emailService');
      if (!emailService.isInitialized()) {
        emailService.initialize();
      }
      console.log('✅ Email service ready');
    } catch (error) {
      console.error('❌ Email service error:', error.message);
    }

    // Cron jobs
    if (!isTestEnv) {
      try {
        if (cronJobManager?.initializeAll) {
          cronJobManager.initializeAll();
          console.log('✅ Cron jobs initialized');
        }
      } catch (err) {
        console.error('❌ Cron job error:', err.message);
      }
    }

    // Server start
    if (!isTestEnv) {
      const PORT = process.env.PORT || 5000;
      server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    }

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    setTimeout(startServer, 5000); // retry
  }
}

startServer();

module.exports = { app, server };