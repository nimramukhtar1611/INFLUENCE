// controllers/socialOAuthController.js - FULL VERSION
const Creator = require('../models/Creator');
const socialService = require('../services/socialService');
const fraudDetectionService = require('../services/fraudDetectionService');
const { featureFlags } = require('../config/featureFlags');

const maybeRefreshFraudAssessment = async (creatorId) => {
  if (!featureFlags.fraudDetection.enabled || !featureFlags.fraudDetection.autoScoreOnSocialSync) {
    return;
  }

  const creator = await Creator.findById(creatorId);
  if (!creator) return;

  const assessment = await fraudDetectionService.evaluateCreator(creator);
  creator.fraudDetection = fraudDetectionService.applySoftEnforcement(creator.fraudDetection, assessment);
  await creator.save();
};

// ==================== INSTAGRAM ====================

const jwt = require('jsonwebtoken');
exports.getInstagramAuthUrl = (req, res) => {
  const stateToken = jwt.sign(
    { userId: req.user._id, timestamp: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
    scope: 'user_profile,user_media',
    response_type: 'code',
    state: stateToken
  });

  const url = `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  res.json({ success: true, url });
};

exports.instagramCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    let userId;
    try {
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid state token' });
    }
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code missing' });
    }

    // Exchange code for token
    const tokenResult = await socialService.exchangeInstagramCode(code);
    if (!tokenResult.success) {
      return res.status(400).json({ success: false, error: tokenResult.error });
    }

    // Fetch stats using OAuth token
    const statsResult = await socialService.getInstagramOAuthStats(tokenResult.accessToken);
    if (!statsResult.success) {
      return res.status(400).json({ success: false, error: statsResult.error });
    }

    // Save to creator profile
    await Creator.findByIdAndUpdate(userId || req.user._id, {
      $set: {
        'socialMedia.instagram':          statsResult.data,
        'socialVerification.instagram':   true,
        'socialTokens.instagram':         tokenResult.accessToken, // store token for future syncs
        lastSocialSync:                   new Date()
      }
    });

    try {
      await maybeRefreshFraudAssessment(userId || req.user._id);
    } catch (fraudError) {
      console.error('Fraud assessment refresh error:', fraudError.message);
    }

    // If frontend is expecting redirect
    if (process.env.FRONTEND_URL) {
      return res.redirect(`${process.env.FRONTEND_URL}/creator/settings?connected=instagram`);
    }

    res.json({ success: true, message: 'Instagram connected', data: statsResult.data });
  } catch (error) {
    console.error('Instagram callback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== YOUTUBE ====================

exports.getYouTubeAuthUrl = (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile',
    access_type:   'offline',  // get refresh token too
    prompt:        'consent',
    state:         req.user._id.toString()
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ success: true, url });
};

exports.youtubeCallback = async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code missing' });
    }

    const tokenResult = await socialService.exchangeYouTubeCode(code);
    if (!tokenResult.success) {
      return res.status(400).json({ success: false, error: tokenResult.error });
    }

    const statsResult = await socialService.getYouTubeOAuthStats(tokenResult.accessToken);
    if (!statsResult.success) {
      return res.status(400).json({ success: false, error: statsResult.error });
    }

    await Creator.findByIdAndUpdate(userId || req.user._id, {
      $set: {
        'socialMedia.youtube':          statsResult.data,
        'socialVerification.youtube':   true,
        'socialTokens.youtube':         {
          accessToken:  tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken
        },
        lastSocialSync: new Date()
      }
    });

    try {
      await maybeRefreshFraudAssessment(userId || req.user._id);
    } catch (fraudError) {
      console.error('Fraud assessment refresh error:', fraudError.message);
    }

    if (process.env.FRONTEND_URL) {
      return res.redirect(`${process.env.FRONTEND_URL}/creator/settings?connected=youtube`);
    }

    res.json({ success: true, message: 'YouTube connected', data: statsResult.data });
  } catch (error) {
    console.error('YouTube callback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== TIKTOK ====================

exports.getTikTokAuthUrl = (req, res) => {
  const params = new URLSearchParams({
    client_key:    process.env.TIKTOK_CLIENT_KEY,
    redirect_uri:  process.env.TIKTOK_REDIRECT_URI,
    response_type: 'code',
    scope:         'user.info.basic,user.info.stats',
    state:         req.user._id.toString()
  });

  const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  res.json({ success: true, url });
};

exports.tikTokCallback = async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code missing' });
    }

    const tokenResult = await socialService.exchangeTikTokCode(code);
    if (!tokenResult.success) {
      return res.status(400).json({ success: false, error: tokenResult.error });
    }

    const statsResult = await socialService.getTikTokOAuthStats(tokenResult.accessToken);
    if (!statsResult.success) {
      return res.status(400).json({ success: false, error: statsResult.error });
    }

    await Creator.findByIdAndUpdate(userId || req.user._id, {
      $set: {
        'socialMedia.tiktok':          statsResult.data,
        'socialVerification.tiktok':   true,
        'socialTokens.tiktok':         tokenResult.accessToken,
        lastSocialSync:                new Date()
      }
    });

    try {
      await maybeRefreshFraudAssessment(userId || req.user._id);
    } catch (fraudError) {
      console.error('Fraud assessment refresh error:', fraudError.message);
    }

    if (process.env.FRONTEND_URL) {
      return res.redirect(`${process.env.FRONTEND_URL}/creator/settings?connected=tiktok`);
    }

    res.json({ success: true, message: 'TikTok connected', data: statsResult.data });
  } catch (error) {
    console.error('TikTok callback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== DISCONNECT ====================

exports.disconnectPlatform = async (req, res) => {
  try {
    const { platform } = req.params;
    const allowed = ['instagram', 'youtube', 'tiktok', 'twitter'];

    if (!allowed.includes(platform)) {
      return res.status(400).json({ success: false, error: 'Invalid platform' });
    }

    await Creator.findByIdAndUpdate(req.user._id, {
      $unset: {
        [`socialTokens.${platform}`]:       1,
      },
      $set: {
        [`socialVerification.${platform}`]: false
      }
    });

    res.json({ success: true, message: `${platform} disconnected` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SYNC (refresh stats) ====================

exports.syncPlatform = async (req, res) => {
  try {
    const { platform } = req.params;
    const creator = await Creator.findById(req.user._id).select('+socialTokens');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    const token = creator.socialTokens?.[platform];
    let result;

    if (token) {
      // Use OAuth token for accurate stats
      switch (platform) {
        case 'instagram': result = await socialService.getInstagramOAuthStats(token);         break;
        case 'youtube':   result = await socialService.getYouTubeOAuthStats(token.accessToken || token); break;
        case 'tiktok':    result = await socialService.getTikTokOAuthStats(token);            break;
      }
    } else {
      // Fallback: use handle for public stats
      const handle = creator.socialMedia?.[platform]?.handle;
      if (!handle) {
        return res.status(400).json({
          success: false,
          error: `No ${platform} account connected. Please connect first.`
        });
      }

      switch (platform) {
        case 'instagram': result = await socialService.verifyInstagram(handle); break;
        case 'youtube':   result = await socialService.verifyYouTube(handle);   break;
        case 'tiktok':    result = await socialService.verifyTikTok(handle);    break;
        case 'twitter':   result = await socialService.verifyTwitter(handle);   break;
      }
    }

    if (result?.success) {
      await Creator.findByIdAndUpdate(req.user._id, {
        $set: {
          [`socialMedia.${platform}`]: result.data,
          lastSocialSync:              new Date()
        }
      });

      try {
        await maybeRefreshFraudAssessment(req.user._id);
      } catch (fraudError) {
        console.error('Fraud assessment refresh error:', fraudError.message);
      }

      res.json({ success: true, message: `${platform} synced`, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result?.error || 'Sync failed' });
    }
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};