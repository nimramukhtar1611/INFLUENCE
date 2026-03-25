// routes/socialOAuthRoutes.js - OAuth login for Instagram, YouTube, TikTok
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const socialOAuthController = require('../controllers/socialOAuthController');

// All OAuth routes require user to be logged in
router.use(protect);

// ── Instagram ──────────────────────────────────────────────────────────────
// Step 1: Get OAuth URL to redirect user to Instagram login
router.get('/instagram/auth-url',  socialOAuthController.getInstagramAuthUrl);
// Step 2: Instagram redirects back with code — exchange for token + fetch stats
router.get('/instagram/callback',  socialOAuthController.instagramCallback);

// ── YouTube ────────────────────────────────────────────────────────────────
router.get('/youtube/auth-url',    socialOAuthController.getYouTubeAuthUrl);
router.get('/youtube/callback',    socialOAuthController.youtubeCallback);

// ── TikTok ─────────────────────────────────────────────────────────────────
router.get('/tiktok/auth-url',     socialOAuthController.getTikTokAuthUrl);
router.get('/tiktok/callback',     socialOAuthController.tikTokCallback);

// ── Disconnect ─────────────────────────────────────────────────────────────
router.delete('/:platform/disconnect', socialOAuthController.disconnectPlatform);

// ── Sync (refresh stats for connected account) ─────────────────────────────
router.post('/:platform/sync',     socialOAuthController.syncPlatform);

module.exports = router;