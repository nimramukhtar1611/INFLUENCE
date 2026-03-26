// services/socialService.js - FULL FIXED VERSION
// Supports:
//   1. Handle/username se public stats fetch karna (no login)
//   2. OAuth login se verified stats fetch karna
const axios = require('axios');

class SocialService {

  // ==================== INSTAGRAM ====================
  // Instagram Graph API requires OAuth — public handle pe limited data milta hai
  // Best approach: Creator apna account connect kare via OAuth
  
  async verifyInstagram(handle) {
    try {
      const username = handle.replace('@', '').trim();
      if (!username) return { success: false, error: 'Invalid username' };

      // METHOD 1: Instagram Graph API (if user connected OAuth token)
      // Ye creatorController mein OAuth flow se call hota hai
      // Direct handle se followers nahi milte officially

      // METHOD 2: RapidAPI Instagram scraper (paid but reliable)
      if (process.env.RAPIDAPI_KEY) {
        try {
          const response = await axios.get('https://instagram-scraper-20251.p.rapidapi.com/userinfo/', {
            params: { username_or_id: username },
            headers: {
              'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'instagram-scraper-20251.p.rapidapi.com'
            },
            timeout: 8000
          });

          const data = response.data?.data || response.data?.result || response.data;
          if (data) {
            const followers =
              data.follower_count ||
              data.followers_count ||
              data.followers ||
              data.edge_followed_by?.count ||
              0;
            const following =
              data.following_count ||
              data.following ||
              data.edge_follow?.count ||
              0;
            const posts =
              data.media_count ||
              data.posts_count ||
              data.post_count ||
              data.edge_owner_to_timeline_media?.count ||
              0;
            const avgLikes = data.avg_likes || data.average_likes || 0;
            const engagement = followers > 0 ? parseFloat(((avgLikes / followers) * 100).toFixed(2)) : 0;

            return {
              success: true,
              data: {
                handle:         username,
                fullName:       data.full_name || data.username || username,
                followers,
                following,
                posts,
                profilePicture: data.profile_pic_url || data.profile_pic_url_hd || this._avatar(username, '833AB4'),
                isVerified:     data.is_verified || data.verified || false,
                isBusiness:     data.is_business || data.is_professional_account || false,
                engagement,
                bio:            data.biography || data.bio || '',
                source:         'rapidapi'
              }
            };
          }
        } catch (e) {
          console.log('RapidAPI Instagram failed:', e.message);
        }
      }

      // METHOD 3: oEmbed (free, no followers — basic existence check)
      try {
        const res = await axios.get('https://api.instagram.com/oembed', {
          params: { url: `https://www.instagram.com/${username}/` },
          timeout: 5000
        });

        if (res.data) {
          return {
            success: true,
            data: {
              handle:         username,
              fullName:       res.data.author_name || username,
              followers:      0,
              following:      0,
              posts:          0,
              profilePicture: res.data.thumbnail_url || this._avatar(username, '833AB4'),
              isVerified:     false,
              isBusiness:     false,
              engagement:     0,
              source:         'oembed',
              note:           'Connect Instagram account for full stats'
            }
          };
        }
      } catch (e) {
        console.log('Instagram oEmbed failed:', e.message);
      }

      // FALLBACK
      return {
        success: true,
        data: {
          handle:         username,
          fullName:       username,
          followers:      0,
          profilePicture: this._avatar(username, '833AB4'),
          source:         'fallback',
          note:           'Connect Instagram account for full stats'
        }
      };

    } catch (error) {
      return { success: false, error: error.message, data: { handle, followers: 0 } };
    }
  }

  // ==================== INSTAGRAM OAUTH ====================
  async getInstagramOAuthStats(accessToken) {
    try {
      // Instagram Graph API — requires Business/Creator account connected via Facebook
      const meRes = await axios.get('https://graph.instagram.com/me', {
        params: {
          fields:       'id,username,account_type,media_count',
          access_token: accessToken
        },
        timeout: 8000
      });

      const { id, username, media_count } = meRes.data;

      // Get follower count (requires instagram_manage_insights permission)
      let followers = 0;
      let engagement = 0;
      try {
        const insightsRes = await axios.get(`https://graph.instagram.com/${id}`, {
          params: {
            fields:       'followers_count,follows_count',
            access_token: accessToken
          }
        });
        followers  = insightsRes.data.followers_count || 0;
        const following = insightsRes.data.follows_count || 0;
      } catch (e) {
        console.log('Instagram insights failed (needs business account):', e.message);
      }

      return {
        success: true,
        data: {
          handle:         username,
          followers,
          posts:          media_count || 0,
          profilePicture: this._avatar(username, '833AB4'),
          source:         'oauth'
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== YOUTUBE ====================
  async verifyYouTube(handle) {
    try {
      const channelHandle = handle.replace('@', '').trim();
      const apiKey = process.env.YOUTUBE_API_KEY;

      // METHOD 1: YouTube Data API v3 (requires free API key)
      if (apiKey) {
        try {
          // Search by handle
          const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
              part:       'snippet',
              q:          channelHandle,
              type:       'channel',
              maxResults: 1,
              key:        apiKey
            },
            timeout: 8000
          });

          const channelId = searchRes.data?.items?.[0]?.id?.channelId;
          if (channelId) {
            const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
              params: {
                part: 'statistics,snippet',
                id:   channelId,
                key:  apiKey
              },
              timeout: 8000
            });

            const ch = statsRes.data?.items?.[0];
            if (ch) {
              const subscribers = parseInt(ch.statistics?.subscriberCount) || 0;
              const views       = parseInt(ch.statistics?.viewCount) || 0;
              const engagement  = subscribers > 0
                ? parseFloat(((views / subscribers) / 100).toFixed(2))
                : 0;

              return {
                success: true,
                data: {
                  handle:         channelHandle,
                  channelId,
                  title:          ch.snippet?.title || channelHandle,
                  subscribers,
                  views,
                  videos:         parseInt(ch.statistics?.videoCount) || 0,
                  profilePicture: ch.snippet?.thumbnails?.high?.url || this._avatar(channelHandle, 'FF0000'),
                  country:        ch.snippet?.country,
                  joinedDate:     ch.snippet?.publishedAt,
                  engagement,
                  verified:       false,
                  source:         'youtube-api'
                }
              };
            }
          }
        } catch (e) {
          console.log('YouTube API failed:', e.message);
        }
      }

      // METHOD 2: oEmbed (free, no stats)
      try {
        const res = await axios.get('https://www.youtube.com/oembed', {
          params: { url: `https://www.youtube.com/@${channelHandle}`, format: 'json' },
          timeout: 5000
        });

        if (res.data) {
          return {
            success: true,
            data: {
              handle:         channelHandle,
              title:          res.data.author_name || channelHandle,
              subscribers:    0,
              views:          0,
              videos:         0,
              profilePicture: res.data.thumbnail_url || this._avatar(channelHandle, 'FF0000'),
              engagement:     0,
              source:         'oembed',
              note:           'Add YOUTUBE_API_KEY env var for full stats'
            }
          };
        }
      } catch (e) {
        console.log('YouTube oEmbed failed:', e.message);
      }

      return {
        success: true,
        data: {
          handle:         channelHandle,
          title:          channelHandle,
          subscribers:    0,
          profilePicture: this._avatar(channelHandle, 'FF0000'),
          source:         'fallback'
        }
      };

    } catch (error) {
      return { success: false, error: error.message, data: { handle, subscribers: 0 } };
    }
  }

  // ==================== YOUTUBE OAUTH ====================
  async getYouTubeOAuthStats(accessToken) {
    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part:  'snippet,statistics',
          mine:  true,
          key:   process.env.YOUTUBE_API_KEY
        },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 8000
      });

      const ch = res.data?.items?.[0];
      if (!ch) return { success: false, error: 'Channel not found' };

      const subscribers = parseInt(ch.statistics?.subscriberCount) || 0;
      const views       = parseInt(ch.statistics?.viewCount) || 0;

      return {
        success: true,
        data: {
          handle:         ch.snippet?.customUrl?.replace('@', '') || '',
          channelId:      ch.id,
          title:          ch.snippet?.title,
          subscribers,
          views,
          videos:         parseInt(ch.statistics?.videoCount) || 0,
          profilePicture: ch.snippet?.thumbnails?.high?.url,
          country:        ch.snippet?.country,
          engagement:     subscribers > 0 ? parseFloat(((views / subscribers) / 100).toFixed(2)) : 0,
          source:         'oauth'
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== TIKTOK ====================
  // TikTok official API requires app approval — use reliable free method
  async verifyTikTok(handle) {
    try {
      const username = handle.replace('@', '').trim();
      if (!username) return { success: false, error: 'Invalid username' };

      // METHOD 1: RapidAPI TikTok scraper (most reliable)
      if (process.env.RAPIDAPI_KEY) {
        try {
          const res = await axios.get('https://tiktok-api23.p.rapidapi.com/api/user/info', {
            params: { uniqueId: username },
            headers: {
              'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'tiktok-api23.p.rapidapi.com'
            },
            timeout: 8000
          });

          const user  = res.data?.userInfo?.user;
          const stats = res.data?.userInfo?.stats;

          if (user && stats) {
            const followers  = stats.followerCount || 0;
            const likes      = stats.heartCount || 0;
            const videos     = stats.videoCount || 0;
            const engagement = followers > 0
              ? parseFloat(((likes / videos || 1) / followers * 100).toFixed(2))
              : 0;

            return {
              success: true,
              data: {
                handle:         username,
                nickname:       user.nickname || username,
                followers,
                following:      stats.followingCount || 0,
                likes,
                videos,
                profilePicture: user.avatarLarger || this._avatar(username, '010101'),
                isVerified:     user.verified || false,
                bio:            user.signature || '',
                engagement,
                source:         'rapidapi'
              }
            };
          }
        } catch (e) {
          console.log('RapidAPI TikTok failed:', e.message);
        }
      }

      // METHOD 2: TikWM (free, sometimes works)
      try {
        const res = await axios.get('https://www.tikwm.com/api/user/info', {
          params:  { unique_id: username },
          timeout: 6000
        });

        const user  = res.data?.data?.user;
        const stats = res.data?.data?.stats;

        if (user && stats) {
          const followers  = stats.followerCount || 0;
          const likes      = stats.heartCount || 0;
          const videos     = stats.videoCount || 0;
          const engagement = followers > 0
            ? parseFloat(((likes / (videos || 1)) / followers * 100).toFixed(2))
            : 0;

          return {
            success: true,
            data: {
              handle:         username,
              nickname:       user.nickname || username,
              followers,
              following:      stats.followingCount || 0,
              likes,
              videos,
              profilePicture: user.avatarLarger || this._avatar(username, '010101'),
              isVerified:     user.verified || false,
              bio:            user.signature || '',
              engagement,
              source:         'tikwm'
            }
          };
        }
      } catch (e) {
        console.log('TikWM failed:', e.message);
      }

      // METHOD 3: oEmbed (free, basic)
      try {
        const res = await axios.get('https://www.tiktok.com/oembed', {
          params:  { url: `https://www.tiktok.com/@${username}` },
          timeout: 5000
        });

        if (res.data) {
          return {
            success: true,
            data: {
              handle:         username,
              nickname:       res.data.author_name || username,
              followers:      0,
              profilePicture: res.data.thumbnail_url || this._avatar(username, '010101'),
              source:         'oembed',
              note:           'Connect TikTok account for full stats'
            }
          };
        }
      } catch (e) {
        console.log('TikTok oEmbed failed:', e.message);
      }

      return {
        success: true,
        data: {
          handle:         username,
          nickname:       username,
          followers:      0,
          profilePicture: this._avatar(username, '010101'),
          source:         'fallback',
          note:           'Connect TikTok account for full stats'
        }
      };

    } catch (error) {
      return { success: false, error: error.message, data: { handle, followers: 0 } };
    }
  }

  // ==================== TIKTOK OAUTH ====================
  // TikTok Login Kit v2 (2024 API)
  async getTikTokOAuthStats(accessToken) {
    try {
      const res = await axios.post('https://open.tiktokapis.com/v2/user/info/', {}, {
        params: {
          fields: 'open_id,union_id,avatar_url,display_name,bio_description,follower_count,following_count,likes_count,video_count,username'
        },
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      const user = res.data?.data?.user;
      if (!user) return { success: false, error: 'User data not found' };

      const followers  = user.follower_count || 0;
      const likes      = user.likes_count || 0;
      const videos     = user.video_count || 0;
      const engagement = followers > 0
        ? parseFloat(((likes / (videos || 1)) / followers * 100).toFixed(2))
        : 0;

      return {
        success: true,
        data: {
          handle:         user.username || user.open_id,
          nickname:       user.display_name,
          followers,
          following:      user.following_count || 0,
          likes,
          videos,
          profilePicture: user.avatar_url,
          bio:            user.bio_description || '',
          engagement,
          source:         'oauth'
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== TWITTER (kept for completeness) ====================
  async verifyTwitter(handle) {
    try {
      const username = handle.replace('@', '').trim();

      // Twitter API v2 (requires Bearer token)
      if (process.env.TWITTER_BEARER_TOKEN) {
        try {
          const res = await axios.get(`https://api.twitter.com/2/users/by/username/${username}`, {
            params: { 'user.fields': 'public_metrics,profile_image_url,verified,description' },
            headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
            timeout: 8000
          });

          const user    = res.data?.data;
          const metrics = user?.public_metrics;

          if (user) {
            const followers  = metrics?.followers_count || 0;
            const tweets     = metrics?.tweet_count || 0;
            const engagement = followers > 0
              ? parseFloat(((metrics?.like_count || 0) / (tweets || 1) / followers * 100).toFixed(2))
              : 0;

            return {
              success: true,
              data: {
                handle:         username,
                name:           user.name,
                followers,
                following:      metrics?.following_count || 0,
                tweets,
                profilePicture: user.profile_image_url?.replace('_normal', '_400x400') || this._avatar(username, '1DA1F2'),
                description:    user.description || '',
                isVerified:     user.verified || false,
                engagement,
                source:         'twitter-api'
              }
            };
          }
        } catch (e) {
          console.log('Twitter API failed:', e.message);
        }
      }

      return {
        success: true,
        data: {
          handle:         username,
          name:           username,
          followers:      0,
          profilePicture: this._avatar(username, '1DA1F2'),
          source:         'fallback',
          note:           'Add TWITTER_BEARER_TOKEN for stats'
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== BATCH VERIFY ====================
  async batchVerify(platforms) {
    // platforms = [{ platform: 'instagram', handle: 'user123' }, ...]
    const results = {};

    await Promise.allSettled(
      platforms.map(async ({ platform, handle }) => {
        try {
          switch (platform) {
            case 'instagram': results[platform] = await this.verifyInstagram(handle); break;
            case 'youtube':   results[platform] = await this.verifyYouTube(handle);   break;
            case 'tiktok':    results[platform] = await this.verifyTikTok(handle);    break;
            case 'twitter':   results[platform] = await this.verifyTwitter(handle);   break;
          }
        } catch (e) {
          results[platform] = { success: false, error: e.message };
        }
      })
    );

    return results;
  }

  // ==================== OAUTH TOKEN EXCHANGE ====================
  
  async exchangeInstagramCode(code) {
    try {
      const res = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id:     process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type:    'authorization_code',
        redirect_uri:  process.env.INSTAGRAM_REDIRECT_URI,
        code
      }, { timeout: 8000 });

      return { success: true, accessToken: res.data.access_token, userId: res.data.user_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async exchangeYouTubeCode(code) {
    try {
      const res = await axios.post('https://oauth2.googleapis.com/token', {
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
        grant_type:    'authorization_code',
        code
      }, { timeout: 8000 });

      return { success: true, accessToken: res.data.access_token, refreshToken: res.data.refresh_token };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async exchangeTikTokCode(code) {
    try {
      const res = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
        client_key:    process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  process.env.TIKTOK_REDIRECT_URI
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 8000
      });

      return { success: true, accessToken: res.data.access_token, openId: res.data.open_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== HELPERS ====================
  _avatar(name, color) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff`;
  }

  parseNumber(str) {
    if (!str) return 0;
    const num = parseFloat(str);
    if (str.includes('K')) return Math.round(num * 1000);
    if (str.includes('M')) return Math.round(num * 1000000);
    if (str.includes('B')) return Math.round(num * 1000000000);
    return Math.round(num) || 0;
  }
}

module.exports = new SocialService();