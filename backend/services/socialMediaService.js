// services/socialMediaService.js
const axios = require('axios');

// Instagram API
const getInstagramData = async (accessToken) => {
  try {
    const response = await axios.get(`https://graph.instagram.com/me`, {
      params: {
        fields: 'id,username,account_type,media_count,followers_count',
        access_token: accessToken
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Instagram API error: ${error.message}`);
  }
};

const getInstagramMedia = async (accessToken, limit = 20) => {
  try {
    const response = await axios.get(`https://graph.instagram.com/me/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        limit,
        access_token: accessToken
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Instagram media error: ${error.message}`);
  }
};

// YouTube API
const getYouTubeData = async (apiKey, channelId) => {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: apiKey
      }
    });
    return response.data.items[0];
  } catch (error) {
    throw new Error(`YouTube API error: ${error.message}`);
  }
};

const getYouTubeVideos = async (apiKey, channelId, limit = 20) => {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        channelId,
        maxResults: limit,
        order: 'date',
        type: 'video',
        key: apiKey
      }
    });
    return response.data.items;
  } catch (error) {
    throw new Error(`YouTube videos error: ${error.message}`);
  }
};

// TikTok API
const getTikTokData = async (accessToken) => {
  try {
    const response = await axios.get(`https://open-api.tiktok.com/user/info/`, {
      params: {
        access_token: accessToken,
        fields: 'open_id,union_id,avatar_url,display_name,bio,follower_count,following_count,likes_count,video_count'
      }
    });
    return response.data.data;
  } catch (error) {
    throw new Error(`TikTok API error: ${error.message}`);
  }
};

const getTikTokVideos = async (accessToken, limit = 20) => {
  try {
    const response = await axios.get(`https://open-api.tiktok.com/video/list/`, {
      params: {
        access_token: accessToken,
        fields: 'id,title,cover_url,share_url,view_count,like_count,comment_count,share_count,create_time',
        max_count: limit
      }
    });
    return response.data.data.videos;
  } catch (error) {
    throw new Error(`TikTok videos error: ${error.message}`);
  }
};

// Calculate engagement rate
const calculateEngagement = (likes, comments, shares, followers) => {
  if (!followers || followers === 0) return 0;
  const total = (likes || 0) + (comments || 0) + (shares || 0);
  return (total / followers) * 100;
};

// Verify social media account
const verifyAccount = async (platform, handle) => {
  // This would connect to the platform's API to verify the account
  return true;
};

// Get follower count
const getFollowerCount = async (platform, handle) => {
  // This would fetch actual follower count from platform API
  return 0;
};

module.exports = {
  getInstagramData,
  getInstagramMedia,
  getYouTubeData,
  getYouTubeVideos,
  getTikTokData,
  getTikTokVideos,
  calculateEngagement,
  verifyAccount,
  getFollowerCount
};