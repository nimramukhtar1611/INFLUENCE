// server/controllers/verificationController.js
const SocialAccount = require('../models/SocialAccount');
const User = require('../models/User');
const axios = require('axios');
const { validationResult } = require('express-validator');
const qs = require('querystring');

// @desc    Get OAuth URL for Platform
// @route   GET /api/verification/:platform/auth-url
// @access  Private
exports.getAuthUrl = async (req, res) => {
  try {
    const { platform } = req.params;
    const { redirect_uri } = req.query;

    let authUrl;
    const state = Buffer.from(JSON.stringify({
      user_id: req.user.id,
      redirect_uri
    })).toString('base64');

    switch(platform) {
      case 'instagram':
        authUrl = `https://api.instagram.com/oauth/authorize?${qs.stringify({
          client_id: process.env.INSTAGRAM_CLIENT_ID,
          redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
          scope: 'user_profile,user_media',
          response_type: 'code',
          state
        })}`;
        break;

      case 'youtube':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${qs.stringify({
          client_id: process.env.YOUTUBE_CLIENT_ID,
          redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
          scope: 'https://www.googleapis.com/auth/youtube.readonly',
          response_type: 'code',
          access_type: 'offline',
          prompt: 'consent',
          state
        })}`;
        break;

      case 'tiktok':
        authUrl = `https://www.tiktok.com/auth/authorize/?${qs.stringify({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          redirect_uri: process.env.TIKTOK_REDIRECT_URI,
          scope: 'user.info.basic,video.list',
          response_type: 'code',
          state
        })}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported platform'
        });
    }

    res.json({
      success: true,
      data: {
        auth_url: authUrl,
        platform
      }
    });

  } catch (error) {
    console.error('Get auth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Handle OAuth Callback
// @route   GET /api/verification/:platform/callback
// @access  Public
exports.handleCallback = async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/verification?error=${error}`);
    }

    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { user_id, redirect_uri } = stateData;

    let accessToken, refreshToken, expiresIn, platformData;

    switch(platform) {
      case 'instagram':
        const instagramResult = await handleInstagramCallback(code);
        accessToken = instagramResult.access_token;
        expiresIn = instagramResult.expires_in;
        platformData = await getInstagramUserData(accessToken);
        break;

      case 'youtube':
        const youtubeResult = await handleYouTubeCallback(code);
        accessToken = youtubeResult.access_token;
        refreshToken = youtubeResult.refresh_token;
        expiresIn = youtubeResult.expires_in;
        platformData = await getYouTubeChannelData(accessToken);
        break;

      case 'tiktok':
        const tiktokResult = await handleTikTokCallback(code);
        accessToken = tiktokResult.access_token;
        refreshToken = tiktokResult.refresh_token;
        expiresIn = tiktokResult.expires_in;
        platformData = await getTikTokUserData(accessToken);
        break;
    }

    // Check if account already exists
    let socialAccount = await SocialAccount.findOne({
      platform,
      platform_user_id: platformData.id
    });

    if (socialAccount) {
      // Update existing account
      socialAccount.access_token = accessToken;
      if (refreshToken) socialAccount.refresh_token = refreshToken;
      socialAccount.token_expiry = new Date(Date.now() + expiresIn * 1000);
      socialAccount.status = 'connected';
    } else {
      // Create new social account
      socialAccount = new SocialAccount({
        creator_id: user_id,
        platform,
        platform_user_id: platformData.id,
        platform_username: platformData.username,
        platform_display_name: platformData.name,
        profile_url: platformData.profile_url,
        avatar_url: platformData.avatar_url,
        bio: platformData.bio,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: new Date(Date.now() + expiresIn * 1000),
        metrics: {
          followers: platformData.followers,
          following: platformData.following,
          posts_count: platformData.posts_count,
          engagement_rate: platformData.engagement_rate || 0
        },
        verified: true,
        verification_method: 'oauth',
        verified_at: new Date(),
        status: 'connected'
      });
    }

    await socialAccount.save();

    // Update user's verification status
    await User.findByIdAndUpdate(user_id, {
      'creator_profile.is_verified': true,
      'creator_profile.verified_at': new Date()
    });

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/verification/success?platform=${platform}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/verification?error=callback_failed`);
  }
};

// @desc    Get Connected Accounts
// @route   GET /api/verification/accounts
// @access  Private
exports.getConnectedAccounts = async (req, res) => {
  try {
    const accounts = await SocialAccount.find({
      creator_id: req.user.id,
      is_active: true
    }).select('-access_token -refresh_token');

    res.json({
      success: true,
      data: accounts
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Refresh Account Data
// @route   POST /api/verification/accounts/:accountId/refresh
// @access  Private
exports.refreshAccountData = async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await SocialAccount.findOne({
      _id: accountId,
      creator_id: req.user.id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if token needs refresh
    if (account.isTokenExpired() && account.refresh_token) {
      await refreshPlatformToken(account);
    }

    // Fetch latest metrics
    const freshData = await fetchPlatformMetrics(account);
    await account.updateMetrics(freshData);

    res.json({
      success: true,
      message: 'Account data refreshed',
      data: account
    });

  } catch (error) {
    console.error('Refresh account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Disconnect Account
// @route   DELETE /api/verification/accounts/:accountId
// @access  Private
exports.disconnectAccount = async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await SocialAccount.findOneAndDelete({
      _id: accountId,
      creator_id: req.user.id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if user has any other verified accounts
    const otherAccounts = await SocialAccount.countDocuments({
      creator_id: req.user.id,
      is_active: true
    });

    if (otherAccounts === 0) {
      await User.findByIdAndUpdate(req.user.id, {
        'creator_profile.is_verified': false,
        'creator_profile.verified_at': null
      });
    }

    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });

  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get Verification Status
// @route   GET /api/verification/status
// @access  Private
exports.getVerificationStatus = async (req, res) => {
  try {
    const accounts = await SocialAccount.find({
      creator_id: req.user.id
    });

    const user = await User.findById(req.user.id);

    const status = {
      is_verified: user.creator_profile?.is_verified || false,
      verified_at: user.creator_profile?.verified_at,
      connected_platforms: accounts.map(a => a.platform),
      accounts: accounts.map(a => ({
        platform: a.platform,
        username: a.platform_username,
        verified: a.verified,
        status: a.status,
        last_synced: a.last_synced,
        metrics: {
          followers: a.metrics.followers,
          engagement_rate: a.metrics.engagement_rate
        }
      })),
      requirements: {
        minimum_followers: 1000,
        account_age_days: 30,
        required_platforms: ['instagram', 'youtube']
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Request Manual Verification
// @route   POST /api/verification/request-manual
// @access  Private
exports.requestManualVerification = async (req, res) => {
  try {
    const { notes } = req.body;

    // Check if user meets minimum requirements
    const accounts = await SocialAccount.find({
      creator_id: req.user.id,
      status: 'connected'
    });

    if (accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please connect at least one social account first'
      });
    }

    // Create verification request
    const verificationRequest = {
      user_id: req.user.id,
      accounts: accounts.map(a => a._id),
      notes,
      status: 'pending',
      requested_at: new Date()
    };

    // Save to database (you'll need a VerificationRequest model)
    // await VerificationRequest.create(verificationRequest);

    res.json({
      success: true,
      message: 'Manual verification request submitted'
    });

  } catch (error) {
    console.error('Request manual verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper Functions for OAuth
async function handleInstagramCallback(code) {
  const response = await axios.post('https://api.instagram.com/oauth/access_token', qs.stringify({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
    code
  }));

  return response.data;
}

async function handleYouTubeCallback(code) {
  const response = await axios.post('https://oauth2.googleapis.com/token', qs.stringify({
    client_id: process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI
  }));

  return response.data;
}

async function handleTikTokCallback(code) {
  const response = await axios.post('https://open-api.tiktok.com/oauth/access_token/', qs.stringify({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code'
  }));

  return response.data;
}

async function getInstagramUserData(accessToken) {
  // Get user info
  const userResponse = await axios.get(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`);
  
  // Get media for engagement calculation
  const mediaResponse = await axios.get(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token=${accessToken}&limit=25`);

  const posts = mediaResponse.data.data || [];
  const totalLikes = posts.reduce((sum, post) => sum + (post.like_count || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
  const totalEngagement = totalLikes + totalComments;
  const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0;
  
  // Get follower count (Instagram Basic Display API doesn't provide this)
  // You might need to use Instagram Graph API for business accounts

  return {
    id: userResponse.data.id,
    username: userResponse.data.username,
    name: userResponse.data.username,
    profile_url: `https://instagram.com/${userResponse.data.username}`,
    avatar_url: posts.find(p => p.media_type === 'IMAGE')?.media_url,
    bio: '',
    followers: 0, // Not available in Basic Display API
    following: 0,
    posts_count: userResponse.data.media_count,
    engagement_rate: posts.length > 0 ? (avgEngagement / (userResponse.data.media_count || 1)) * 100 : 0
  };
}

async function getYouTubeChannelData(accessToken) {
  const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: {
      part: 'snippet,statistics',
      mine: true,
      access_token: accessToken
    }
  });

  const channel = response.data.items[0];

  // Get recent videos for engagement
  const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'id',
      channelId: channel.id,
      maxResults: 25,
      order: 'date',
      type: 'video',
      access_token: accessToken
    }
  });

  const videoIds = videosResponse.data.items.map(v => v.id.videoId).join(',');

  const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'statistics',
      id: videoIds,
      access_token: accessToken
    }
  });

  const videos = statsResponse.data.items || [];
  const totalViews = videos.reduce((sum, v) => sum + parseInt(v.statistics.viewCount || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + parseInt(v.statistics.likeCount || 0), 0);
  const avgViews = videos.length > 0 ? totalViews / videos.length : 0;
  const engagementRate = videos.length > 0 ? (totalLikes / totalViews) * 100 : 0;

  return {
    id: channel.id,
    username: channel.snippet.customUrl?.replace('@', '') || channel.id,
    name: channel.snippet.title,
    profile_url: `https://youtube.com/channel/${channel.id}`,
    avatar_url: channel.snippet.thumbnails.default.url,
    bio: channel.snippet.description,
    followers: parseInt(channel.statistics.subscriberCount),
    following: 0,
    posts_count: parseInt(channel.statistics.videoCount),
    total_views: parseInt(channel.statistics.viewCount),
    engagement_rate: engagementRate,
    avg_views: avgViews
  };
}

async function getTikTokUserData(accessToken) {
  const response = await axios.get('https://open-api.tiktok.com/user/info/', {
    params: {
      access_token: accessToken,
      fields: 'open_id,union_id,avatar_url,avatar_url_100,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count'
    }
  });

  const user = response.data.data.user;

  return {
    id: user.open_id,
    username: user.display_name,
    name: user.display_name,
    profile_url: user.profile_deep_link,
    avatar_url: user.avatar_url_100,
    bio: user.bio_description,
    followers: user.follower_count,
    following: user.following_count,
    posts_count: user.video_count,
    engagement_rate: user.likes_count / user.follower_count * 100 || 0
  };
}

async function fetchPlatformMetrics(account) {
  // Implement platform-specific metric fetching
  switch(account.platform) {
    case 'instagram':
      return getInstagramUserData(account.access_token);
    case 'youtube':
      return getYouTubeChannelData(account.access_token);
    case 'tiktok':
      return getTikTokUserData(account.access_token);
    default:
      return {};
  }
}

async function refreshPlatformToken(account) {
  // Implement token refresh logic
  if (account.platform === 'youtube' && account.refresh_token) {
    const response = await axios.post('https://oauth2.googleapis.com/token', qs.stringify({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token'
    }));

    account.access_token = response.data.access_token;
    account.token_expiry = new Date(Date.now() + response.data.expires_in * 1000);
    await account.save();
  }
}

module.exports = exports;