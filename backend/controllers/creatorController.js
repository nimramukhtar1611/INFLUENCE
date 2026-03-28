// controllers/creatorController.js - FULL FIXED VERSION
// Facebook removed. Instagram/YouTube/TikTok supported via handle + OAuth
const Creator = require('../models/Creator');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Campaign = require('../models/Campaign');
const Subscription = require('../models/Subscription');
const axios = require('axios');
const socialService = require('../services/socialService'); // ✅ FIX: singleton instance
const fraudDetectionService = require('../services/fraudDetectionService');
const { featureFlags } = require('../config/featureFlags');

const CREATOR_EXCLUDED_EARNING_TYPES = ['withdrawal', 'refund', 'fee', 'penalty'];

const PLATFORM_POSTING_WINDOWS = {
  instagram: [
    { label: '12:00 PM - 2:00 PM', reason: 'Midday sessions tend to drive stronger short-form engagement.' },
    { label: '7:00 PM - 9:00 PM', reason: 'Evening leisure windows are usually strongest for reach.' }
  ],
  youtube: [
    { label: '4:00 PM - 6:00 PM', reason: 'Publishing before prime time helps collect early watch signals.' },
    { label: '8:00 PM - 10:00 PM', reason: 'Long-form watch time is often higher in evening blocks.' }
  ],
  tiktok: [
    { label: '6:00 PM - 9:00 PM', reason: 'After-work hours usually show stronger velocity for short videos.' },
    { label: '11:00 AM - 1:00 PM', reason: 'Lunchtime windows often produce reliable repeat views.' }
  ],
  twitter: [
    { label: '8:00 AM - 10:00 AM', reason: 'Morning scrolling windows can improve early conversation.' },
    { label: '5:00 PM - 7:00 PM', reason: 'Commute/evening windows often increase reply rates.' }
  ]
};

const PLATFORM_POSTING_WINDOWS_BY_TIER = {
  instagram: {
    starter: [
      { label: '11:00 AM - 1:00 PM', reason: 'Consistent midday posting helps smaller profiles build predictable reach.' },
      { label: '6:30 PM - 8:30 PM', reason: 'Evening windows are usually strongest for discovery and saves.' }
    ],
    growth: [
      { label: '12:00 PM - 2:00 PM', reason: 'Midday sessions tend to drive stronger short-form engagement.' },
      { label: '7:00 PM - 9:00 PM', reason: 'Evening leisure windows are usually strongest for reach.' }
    ],
    scale: [
      { label: '9:00 AM - 11:00 AM', reason: 'Larger profiles often benefit from earlier momentum accumulation.' },
      { label: '7:30 PM - 10:00 PM', reason: 'Prime-time windows help maximize shares and comment velocity.' }
    ]
  },
  youtube: {
    starter: [
      { label: '3:00 PM - 5:00 PM', reason: 'Publishing before peak hours improves early session signals.' },
      { label: '8:00 PM - 9:30 PM', reason: 'Evening view sessions tend to improve average watch time.' }
    ],
    growth: [
      { label: '4:00 PM - 6:00 PM', reason: 'Publishing before prime time helps collect early watch signals.' },
      { label: '8:00 PM - 10:00 PM', reason: 'Long-form watch time is often higher in evening blocks.' }
    ],
    scale: [
      { label: '2:00 PM - 4:00 PM', reason: 'Established channels can seed browse recommendations earlier.' },
      { label: '7:00 PM - 9:00 PM', reason: 'Peak concurrent sessions can amplify high-retention uploads.' }
    ]
  },
  tiktok: {
    starter: [
      { label: '10:30 AM - 12:30 PM', reason: 'Late-morning tests help identify early audience clusters.' },
      { label: '6:00 PM - 8:00 PM', reason: 'After-work windows usually improve replay and completion rates.' }
    ],
    growth: [
      { label: '6:00 PM - 9:00 PM', reason: 'After-work hours usually show stronger velocity for short videos.' },
      { label: '11:00 AM - 1:00 PM', reason: 'Lunchtime windows often produce reliable repeat views.' }
    ],
    scale: [
      { label: '5:00 PM - 7:00 PM', reason: 'Larger accounts can trigger earlier velocity before peak traffic.' },
      { label: '8:00 PM - 10:00 PM', reason: 'Late-evening scroll windows are strong for high-share concepts.' }
    ]
  }
};

const FALLBACK_CAMPAIGN_CATEGORIES = [
  'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness',
  'Travel', 'Gaming', 'Lifestyle', 'Parenting', 'Finance',
  'Education', 'Entertainment', 'Sports', 'Automotive', 'Real Estate',
  'Health', 'Wellness', 'Other'
];

const CAMPAIGN_CATEGORIES =
  Campaign?.schema?.path('category')?.enumValues?.length
    ? Campaign.schema.path('category').enumValues
    : FALLBACK_CAMPAIGN_CATEGORIES;

const CONTENT_TYPE_OPTIONS = [
  { value: 'general', label: 'General' },
  ...CAMPAIGN_CATEGORIES.map((category) => ({
    value: String(category).toLowerCase(),
    label: category
  }))
];

const LEGACY_CONTENT_TYPE_VALUES = new Set([
  'short_form',
  'tutorial',
  'storytelling',
  'review',
  'community'
]);

const CONTENT_TYPE_IDEA_TEMPLATES = {
  general: [
    'Create a weekly "3 quick wins" post tied to your niche.',
    'Turn one audience pain point into a before/after content sequence.',
    'Reuse your top comment as the title for your next post.'
  ],
  short_form: [
    'Make a 20-30 second hook-first video with one clear takeaway.',
    'Publish a "mistake vs fix" short in your niche.',
    'Record a rapid 3-step checklist format with captions.'
  ],
  tutorial: [
    'Create a beginner-to-advanced walkthrough in 3 levels.',
    'Break one process into a "what, why, how" tutorial format.',
    'Teach one tool/feature with a real use-case demo.'
  ],
  storytelling: [
    'Share a personal challenge -> pivot -> lesson story arc.',
    'Post a "what I believed then vs now" narrative.',
    'Tell a behind-the-scenes story with a measurable outcome.'
  ],
  review: [
    'Do a "worth it / not worth it" breakdown with scoring.',
    'Compare two approaches/products with clear winner criteria.',
    'Review a trend and extract what actually works.'
  ],
  community: [
    'Run a weekly audience Q&A and pin the best question.',
    'Post a poll and follow up with a response video/post.',
    'Start a mini challenge and feature audience submissions.'
  ],
  fashion: [
    'Style one outfit in 3 ways for different budgets and occasions.',
    'Break down one runway trend into an everyday wearable version.',
    'Do a fast "keep or skip" on this season\'s trending fashion pieces.'
  ],
  beauty: [
    'Show a 5-minute routine for one common skin or makeup goal.',
    'Test one viral beauty claim and share before/after results.',
    'Create a budget-vs-premium beauty comparison with final verdict.'
  ],
  technology: [
    'Review one practical tech setup that improves daily productivity.',
    'Share a quick "hidden features" tutorial for one popular app/device.',
    'Compare two tools and pick the best option per use case.'
  ],
  'food & beverage': [
    'Create one quick recipe with ingredients under a fixed budget.',
    'Do a taste-test challenge: homemade vs store-bought version.',
    'Share one healthy swap for a popular high-calorie favorite.'
  ],
  fitness: [
    'Post a no-equipment workout routine for busy weekdays.',
    'Show one common form mistake and the correct movement cue.',
    'Build a 7-day challenge with daily check-in prompts.'
  ],
  travel: [
    'Share a one-day itinerary with exact timing and budget tips.',
    'Create a carry-on packing system for short trips.',
    'Compare tourist hotspots vs local hidden gems in one city.'
  ],
  gaming: [
    'Share a top 5 loadout or settings guide for ranked play.',
    'Break down one clutch moment and teach the decision-making.',
    'Create a beginner-to-pro progression roadmap for one title.'
  ],
  lifestyle: [
    'Post a realistic day-in-the-life with productivity checkpoints.',
    'Share 3 habits that improved energy and focus this month.',
    'Create a weekly reset routine with simple repeatable steps.'
  ],
  parenting: [
    'Share one practical routine that reduces daily family stress.',
    'Create a screen-time balance plan with age-based examples.',
    'Post a quick activity idea parents can set up in under 10 minutes.'
  ],
  finance: [
    'Break down one budgeting framework with a real monthly example.',
    'Compare two saving strategies and who each one fits best.',
    'Explain one money myth and replace it with a better habit.'
  ],
  education: [
    'Teach one concept in under 60 seconds using a real-world analogy.',
    'Create a study workflow that improves retention before exams.',
    'Share common learner mistakes and how to avoid them.'
  ],
  entertainment: [
    'Create a weekly "best of" recap in your niche with commentary.',
    'React to trending moments and add a unique creator perspective.',
    'Rank 5 popular picks with clear criteria and audience voting.'
  ],
  sports: [
    'Break down one pro-level move into beginner-friendly drills.',
    'Share a game-day prep checklist for performance and recovery.',
    'Analyze one key play and explain the tactical decision.'
  ],
  automotive: [
    'Post a maintenance tip series that saves money over time.',
    'Compare two models for different buyer profiles and budgets.',
    'Create a buyer checklist for used car inspections.'
  ],
  'real estate': [
    'Explain one property metric with a simple worked example.',
    'Create a neighborhood comparison with renter/buyer lens.',
    'Share a first-time buyer checklist with common pitfalls.'
  ],
  health: [
    'Share one evidence-based health habit and how to start today.',
    'Debunk one common health misconception with credible sources.',
    'Create a weekly health tracking template for consistency.'
  ],
  wellness: [
    'Post a stress-reset routine that fits into 10 minutes.',
    'Share one sleep optimization tip and how to measure progress.',
    'Create a mindful morning routine with step-by-step prompts.'
  ],
  other: [
    'Turn one audience FAQ into a mini-series with practical examples.',
    'Create a myth-vs-fact post focused on your core niche.',
    'Share a behind-the-scenes process that reveals your workflow.'
  ]
};

const CONTENT_TYPE_RELEVANCE_KEYWORDS = {
  general: [],
  fashion: ['fashion', 'outfit', 'style', 'wardrobe', 'lookbook', 'trend'],
  beauty: ['beauty', 'makeup', 'skincare', 'skin', 'serum', 'routine', 'glow'],
  technology: ['tech', 'app', 'device', 'software', 'tool', 'gadget', 'ai'],
  'food & beverage': ['food', 'recipe', 'meal', 'drink', 'smoothie', 'cook', 'snack', 'beverage'],
  fitness: ['fitness', 'workout', 'exercise', 'training', 'gym', 'strength', 'cardio'],
  travel: ['travel', 'trip', 'itinerary', 'destination', 'flight', 'hotel', 'packing'],
  gaming: ['gaming', 'game', 'stream', 'ranked', 'loadout', 'controller', 'esports'],
  lifestyle: ['lifestyle', 'routine', 'daily', 'habit', 'productivity', 'home'],
  parenting: ['parent', 'kid', 'child', 'family', 'toddler', 'school'],
  finance: ['finance', 'budget', 'money', 'saving', 'invest', 'expense', 'income'],
  education: ['education', 'study', 'learn', 'lesson', 'student', 'exam', 'course'],
  entertainment: ['entertainment', 'reaction', 'review', 'show', 'movie', 'music', 'viral'],
  sports: ['sports', 'match', 'game', 'athlete', 'training', 'team', 'tactic'],
  automotive: ['car', 'automotive', 'vehicle', 'drive', 'engine', 'maintenance'],
  'real estate': ['real estate', 'property', 'rent', 'buyer', 'listing', 'mortgage'],
  health: ['health', 'wellness', 'nutrition', 'sleep', 'stress', 'recovery'],
  wellness: ['wellness', 'mindfulness', 'self-care', 'sleep', 'mental', 'balance'],
  other: []
};

const NON_BEAUTY_BANNED_TERMS = ['skincare', 'skin', 'serum', 'face mask', 'beauty'];

const isValidContentTypeValue = (value = '') => {
  const normalized = String(value || '').toLowerCase();
  return CONTENT_TYPE_OPTIONS.some((option) => option.value === normalized)
    || LEGACY_CONTENT_TYPE_VALUES.has(normalized);
};

const getCreatorSubscriptionPlan = async (creatorUserId) => {
  if (!creatorUserId) return 'free';

  const subscription = await Subscription.findOne({
    userId: creatorUserId,
    status: { $in: ['active', 'trialing'] }
  })
    .select('planId')
    .lean();

  return String(subscription?.planId || 'free').toLowerCase();
};

const hasRelevantKeyword = (text = '', keywords = []) => {
  if (!text || !keywords.length) return false;
  const normalized = String(text).toLowerCase();
  return keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()));
};

const containsBannedTermsForType = (text = '', contentType = 'general') => {
  const normalizedType = String(contentType || 'general').toLowerCase();
  if (normalizedType === 'beauty' || normalizedType === 'health' || normalizedType === 'wellness') {
    return false;
  }

  const normalized = String(text).toLowerCase();
  return NON_BEAUTY_BANNED_TERMS.some((term) => normalized.includes(term));
};

const validateHfIdeasForType = (ideas = [], contentType = 'general') => {
  const normalizedType = String(contentType || 'general').toLowerCase();
  if (!ideas.length) return null;

  const keywords = CONTENT_TYPE_RELEVANCE_KEYWORDS[normalizedType] || [];
  const filtered = ideas.filter((idea) => !containsBannedTermsForType(idea, normalizedType));
  if (!filtered.length) return null;

  // For specific categories, require at least one idea to contain a category keyword.
  if (normalizedType !== 'general' && keywords.length > 0) {
    const relevanceHits = filtered.filter((idea) => hasRelevantKeyword(idea, keywords)).length;
    if (relevanceHits === 0) {
      return null;
    }
  }

  return filtered.slice(0, 5);
};

const getPlatformFollowers = (socialMedia = {}, platform) => {
  if (platform === 'youtube') {
    return Number(socialMedia.youtube?.subscribers || 0);
  }

  return Number(socialMedia?.[platform]?.followers || 0);
};

const getPlatformEngagement = (socialMedia = {}, platform, fallback = 0) => {
  const engagement = Number(socialMedia?.[platform]?.engagement || 0);
  return engagement > 0 ? engagement : Number(fallback || 0);
};

const getPlatformLastSynced = (socialMedia = {}, platform) => {
  return socialMedia?.[platform]?.lastSynced || null;
};

const getGrowthTier = (followers = 0, engagement = 0) => {
  if (followers >= 100000 || engagement >= 4) return 'scale';
  if (followers >= 10000 || engagement >= 2) return 'growth';
  return 'starter';
};

const hashString = (value = '') => {
  const input = String(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const createSeededRng = (seedInput) => {
  let seed = hashString(seedInput) || 123456789;
  return () => {
    seed = (1664525 * seed + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
};

const shuffleWithRng = (items = [], rng = Math.random) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getDynamicPostingWindows = (platform, followers, engagement) => {
  const tier = getGrowthTier(followers, engagement);
  const tierConfig = PLATFORM_POSTING_WINDOWS_BY_TIER[platform];
  if (!tierConfig) {
    return PLATFORM_POSTING_WINDOWS[platform] || PLATFORM_POSTING_WINDOWS.instagram;
  }

  return tierConfig[tier] || tierConfig.growth;
};

const getConfidenceLevel = ({ followers = 0, engagement = 0, lastSynced = null }) => {
  const syncedAt = lastSynced ? new Date(lastSynced) : null;
  const recentlySynced = syncedAt && !Number.isNaN(syncedAt.getTime())
    ? ((Date.now() - syncedAt.getTime()) / (1000 * 60 * 60 * 24)) <= 14
    : false;

  if ((engagement >= 3 || followers >= 100000) && recentlySynced) return 'high';
  if (engagement >= 1.5 || followers >= 10000 || recentlySynced) return 'medium';
  return 'low';
};

const getDominantPlatform = (creator) => {
  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter'];
  const sorted = platforms
    .map((platform) => ({
      platform,
      followers: getPlatformFollowers(creator.socialMedia, platform)
    }))
    .sort((a, b) => b.followers - a.followers);

  if (sorted[0]?.followers > 0) {
    return sorted[0].platform;
  }

  return creator.primaryPlatform || 'instagram';
};

const getGrowthPlatforms = () => {
  return ['instagram', 'youtube', 'tiktok'];
};

const getTopAgeBucket = (ageGroups = {}) => {
  const entries = Object.entries(ageGroups || {});
  if (!entries.length) return null;

  const [bucket, percentage] = entries.reduce((best, current) => {
    return Number(current[1] || 0) > Number(best[1] || 0) ? current : best;
  }, entries[0]);

  if (!bucket || Number(percentage || 0) <= 0) return null;
  return { bucket, percentage: Number(percentage) };
};

const buildContentIdeas = (creator, platform, options = {}) => {
  const selectedContentType = String(options.contentType || 'general').toLowerCase();
  const contentType = CONTENT_TYPE_IDEA_TEMPLATES[selectedContentType] ? selectedContentType : 'general';
  const rng = options.rng || Math.random;
  const niches = (creator.niches || []).slice(0, 3);
  const ageInsight = getTopAgeBucket(creator.audienceDemographics?.ageGroups);
  const ideas = [];

  const contentTypeTemplates = CONTENT_TYPE_IDEA_TEMPLATES[contentType] || CONTENT_TYPE_IDEA_TEMPLATES.general;

  if (!niches.length) {
    ideas.push(`Create a weekly ${platform} series answering your audience's top 3 questions.`);
    ideas.push(`Share one behind-the-scenes breakdown per week showing how you plan paid content.`);
    ideas.push('Turn top-performing comments into follow-up posts with clear CTAs.');
    ideas.push(...shuffleWithRng(contentTypeTemplates, rng).slice(0, 2));
    return shuffleWithRng(ideas, rng).slice(0, 5);
  }

  for (const niche of niches) {
    ideas.push(`Post a ${niche.toLowerCase()} myth-vs-reality piece with a practical takeaway.`);
  }

  if (ageInsight) {
    ideas.push(
      `Build one content thread specifically for ${ageInsight.bucket} audience interests and language patterns.`
    );
  }

  const followers = getPlatformFollowers(creator.socialMedia, platform);
  if (followers >= 100000) {
    ideas.push('Run a two-part format: quick hook clip first, deeper follow-up post 24 hours later.');
  } else if (followers >= 10000) {
    ideas.push('Repurpose your best-performing post into 3 variants: tutorial, opinion, and case-study angle.');
  } else {
    ideas.push('Launch a weekly mini-series with recurring format so new viewers quickly recognize your content.');
  }

  ideas.push(...shuffleWithRng(contentTypeTemplates, rng).slice(0, 2));

  return shuffleWithRng(ideas, rng).slice(0, 5);
};

const buildAudienceImprovementTips = (creator, platform) => {
  const tips = [];
  const avgEngagement = Number(creator.averageEngagement || 0);
  const platformEngagement = getPlatformEngagement(creator.socialMedia, platform, avgEngagement);
  const topCountries = creator.audienceDemographics?.topCountries || [];

  if (platformEngagement < 1.5) {
    tips.push('Use stronger 2-second hooks and shorter opening captions to reduce early drop-off.');
  } else {
    tips.push('Double down on formats with saves/shares since engagement health is already stable.');
  }

  if (topCountries.length > 0) {
    const leadCountry = topCountries[0]?.country;
    if (leadCountry) {
      tips.push(`Schedule posts in ${leadCountry} prime-time windows and localize phrasing for that audience.`);
    }
  } else {
    tips.push('Run two weekly time-slot experiments and compare impressions in 48 hours to find local peak windows.');
  }

  tips.push('Add one explicit interaction CTA per post (vote/comment/save) to lift quality engagement.');

  if (Number(creator.totalFollowers || 0) >= 10000) {
    tips.push('Create a recurring community format (weekly Q&A, critique, or challenge) to improve returning audience rate.');
  }

  return tips.slice(0, 5);
};

const parseIdeasFromText = (rawText = '') => {
  if (!rawText) return [];

  const normalized = String(rawText)
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .trim();

  const lines = normalized
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]+|\d+[\.)])\s*/, '').trim())
    .filter((line) => line.length >= 12 && line.length <= 240);

  const uniqueLines = [...new Set(lines)];
  if (uniqueLines.length >= 3) {
    return uniqueLines.slice(0, 8);
  }

  // Fallback parser for inline numbered content.
  const chunks = normalized
    .split(/\s(?:\d+[\.)]|[-*•])\s+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 12 && chunk.length <= 240);

  return [...new Set(chunks)].slice(0, 8);
};

const generateHuggingFaceContentIdeas = async ({ creator, platform, contentType, refreshToken }) => {
  const hfApiKey = String(process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY || '').trim();
  if (!hfApiKey) {
    return null;
  }

  // Prefer router chat completions because api-inference is deprecated.
  const configuredChatModel = String(
    process.env.HF_CHAT_MODEL ||
    process.env.HUGGINGFACE_CHAT_MODEL ||
    ''
  ).trim();
  const chatModels = [
    configuredChatModel,
    'openai/gpt-oss-120b:fastest',
    'openai/gpt-oss-20b:fastest',
    'meta-llama/Llama-3.1-8B-Instruct:fastest'
  ].filter(Boolean);
  const inferenceModel = String(
    process.env.HF_MODEL ||
    process.env.HUGGINGFACE_MODEL ||
    'TinyLlama/TinyLlama-1.1B-Chat-v1.0'
  ).trim();

  const nicheText = (creator.niches || []).slice(0, 3).join(', ') || 'general creator growth';
  const followerCount = Number(creator.totalFollowers || 0).toLocaleString();
  const engagement = Number(creator.averageEngagement || 0).toFixed(2);
  const nonce = refreshToken || `${Date.now()}`;

  const prompt = [
    'You are a social media growth strategist.',
    `Generate exactly 5 distinct ${contentType.replace('_', ' ')} content ideas for a ${platform} creator.`,
    `Creator context: niches=${nicheText}, followers=${followerCount}, avg_engagement=${engagement}%.`,
    `Use this variation key to avoid repeats: ${nonce}.`,
    'Return only numbered ideas, one per line, concise and practical.',
    'Keep each idea under 20 words and avoid generic fluff.',
    `STRICT CATEGORY RULE: every idea must clearly belong to ${contentType}.`,
    'If category is not beauty/health/wellness, do not mention skincare, skin, serum, or face masks.'
  ].join(' ');

  try {
    let rawText = '';
    let chatError = null;
    let chatErrorMeta = null;

    for (const chatModel of chatModels) {
      try {
        const chatResponse = await axios.post(
          'https://router.huggingface.co/v1/chat/completions',
          {
            model: chatModel,
            messages: [
              {
                role: 'system',
                content: 'You are a concise social media strategist that outputs actionable idea lists.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.95,
            max_tokens: 260,
            stream: false
          },
          {
            headers: {
              Authorization: `Bearer ${hfApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 20000
          }
        );

        rawText = String(chatResponse?.data?.choices?.[0]?.message?.content || '').trim();
        chatError = null;
        chatErrorMeta = null;
        if (rawText) break;
      } catch (err) {
        chatError = err;
        chatErrorMeta = {
          endpoint: 'https://router.huggingface.co/v1/chat/completions',
          model: chatModel,
          status: err?.response?.status || null
        };
      }
    }

    if (!rawText) {
      try {
        const fallbackResponse = await axios.post(
          `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(inferenceModel)}`,
          {
            inputs: prompt,
            parameters: {
              max_new_tokens: 220,
              temperature: 0.95,
              top_p: 0.92,
              do_sample: true,
              return_full_text: false
            },
            options: {
              wait_for_model: true,
              use_cache: false
            }
          },
          {
            headers: {
              Authorization: `Bearer ${hfApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 20000
          }
        );

        const payload = fallbackResponse?.data;
        rawText = Array.isArray(payload)
          ? payload[0]?.generated_text || payload[0]?.summary_text || ''
          : payload?.generated_text || payload?.summary_text || '';
      } catch (fallbackError) {
        const fallbackMeta = {
          endpoint: `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(inferenceModel)}`,
          model: inferenceModel,
          status: fallbackError?.response?.status || null
        };

        const errorToThrow = fallbackError;
        errorToThrow._hfMeta = {
          chatErrorMeta,
          fallbackMeta
        };
        throw errorToThrow;
      }
    }

    const parsedIdeas = parseIdeasFromText(rawText);
    return parsedIdeas.length ? parsedIdeas.slice(0, 5) : null;
  } catch (error) {
    const status = error?.response?.status;
    const errorData = error?.response?.data;
    const message = errorData?.error || errorData?.message || error?.message || 'unknown';
    console.warn('HF content idea generation failed, falling back to heuristics:', message);
    if (status) {
      console.warn('HF router status:', status);
    }
    if (error?._hfMeta) {
      console.warn('HF router debug meta:', error._hfMeta);
    }
    return null;
  }
};

const maybeRefreshFraudAssessment = async (creatorId) => {
  if (!featureFlags.fraudDetection.enabled || !featureFlags.fraudDetection.autoScoreOnSocialSync) {
    return null;
  }

  const creator = await Creator.findById(creatorId);
  if (!creator) return null;

  const assessment = await fraudDetectionService.evaluateCreator(creator);
  creator.fraudDetection = fraudDetectionService.applySoftEnforcement(creator.fraudDetection, assessment);
  await creator.save();

  return creator.fraudDetection;
};

// ==================== GET PROFILE ====================
exports.getProfile = async (req, res) => {
  try {
    const creator = await Creator.findById(req.user._id)
      .select('-password -refreshToken -twoFactorSecret -resetPasswordToken -emailVerificationToken -socialTokens');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator profile not found' });
    }

    res.json({ success: true, creator });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get profile' });
  }
};

// ==================== UPDATE PROFILE ====================
exports.updateProfile = async (req, res) => {
   try {
    const allowedUpdates = [
      'displayName',
      'handle',
      'bio',
      'location',
      'website',
      'birthday',
      'gender',
      'phone',
      'profilePicture',
      'socialMedia',
      'socialVerification',
      'niches',
      'rateCard',
      'availability',
      'privacy',
      'notifications'
    ];
    const updateData = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -socialTokens');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    res.json({ success: true, message: 'Profile updated successfully', creator });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update profile' });
  }
};

// ==================== VERIFY SOCIAL MEDIA (by handle) ====================
// Facebook removed — only Instagram, YouTube, TikTok, Twitter supported
exports.verifySocialMedia = async (req, res) => {
  try {
    const { platform, handle } = req.body;

    const supported = ['instagram', 'youtube', 'tiktok', 'twitter'];
    if (!supported.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Platform not supported. Supported: ${supported.join(', ')}`
      });
    }

    if (!handle) {
      return res.status(400).json({ success: false, error: 'Handle/username is required' });
    }

    // ✅ FIX: socialService is already a singleton instance — no `new` needed
    let result;
    switch (platform) {
      case 'instagram': result = await socialService.verifyInstagram(handle); break;
      case 'youtube':   result = await socialService.verifyYouTube(handle);   break;
      case 'tiktok':    result = await socialService.verifyTikTok(handle);    break;
      case 'twitter':   result = await socialService.verifyTwitter(handle);   break;
    }

    if (result.success) {
      const source = (result.data?.source || '').toLowerCase();
      const trustedSources = new Set(['rapidapi', 'youtube-api', 'tikwm', 'twitter-api', 'oauth']);
      const verified = trustedSources.has(source);
      const socialData = {
        ...result.data,
        verified,
        lastSynced: new Date()
      };

      // Save social media data to creator profile
      await Creator.findByIdAndUpdate(req.user._id, {
        $set: {
          [`socialMedia.${platform}`]:        socialData,
          [`socialVerification.${platform}`]: verified,
          lastSocialSync:                     new Date()
        }
      });

      // Trigger pre-save for totalFollowers recalculation
      const updatedCreator = await Creator.findById(req.user._id);
      await updatedCreator.save();

      try {
        await maybeRefreshFraudAssessment(req.user._id);
      } catch (fraudError) {
        console.error('Fraud assessment refresh error:', fraudError.message);
      }

      const message = verified
        ? 'Account verified successfully'
        : (socialData.note
          ? `Account linked, but live stats could not be fully verified. ${socialData.note}`
          : 'Account linked, but live stats could not be fully verified. Connect API/OAuth for full verification.');

      res.json({
        success: true,
        message,
        verified,
        partial: !verified,
        source,
        data: socialData,
        stats: socialData
      });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to verify account' });
    }
  } catch (error) {
    console.error('Verify social media error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to verify account' });
  }
};

// ==================== SYNC ALL SOCIAL MEDIA ====================
exports.syncSocialMedia = async (req, res) => {
  try {
    const creator = await Creator.findById(req.user._id);
    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    const platforms   = ['instagram', 'youtube', 'tiktok', 'twitter'];
    const syncResults = {};

    await Promise.allSettled(
      platforms.map(async (platform) => {
        const handle = creator.socialMedia?.[platform]?.handle;
        if (!handle) return;

        try {
          let result;
          switch (platform) {
            case 'instagram': result = await socialService.verifyInstagram(handle); break;
            case 'youtube':   result = await socialService.verifyYouTube(handle);   break;
            case 'tiktok':    result = await socialService.verifyTikTok(handle);    break;
            case 'twitter':   result = await socialService.verifyTwitter(handle);   break;
          }

          if (result?.success) {
            await Creator.findByIdAndUpdate(req.user._id, {
              $set: { [`socialMedia.${platform}`]: result.data }
            });
            syncResults[platform] = { success: true, data: result.data };
          } else {
            syncResults[platform] = { success: false, error: result?.error };
          }
        } catch (e) {
          syncResults[platform] = { success: false, error: e.message };
        }
      })
    );

    await Creator.findByIdAndUpdate(req.user._id, { lastSocialSync: new Date() });

    // Recalculate totals
    const updated = await Creator.findById(req.user._id);
    await updated.save();

    try {
      await maybeRefreshFraudAssessment(req.user._id);
    } catch (fraudError) {
      console.error('Fraud assessment refresh error:', fraudError.message);
    }

    res.json({ success: true, message: 'Social media synced', results: syncResults });
  } catch (error) {
    console.error('Sync social media error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync' });
  }
};

// ==================== FRAUD ASSESSMENT ====================
exports.getFraudAssessment = async (req, res) => {
  try {
    const forceRefresh = String(req.query.refresh || '').toLowerCase() === 'true';
    const creator = await Creator.findById(req.user._id)
      .select('displayName handle totalFollowers averageEngagement socialMedia lastSocialSync fraudDetection');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    if (!featureFlags.fraudDetection.enabled) {
      return res.json({
        success: true,
        enabled: false,
        message: 'Fraud detection is disabled by feature flag',
        assessment: creator.fraudDetection || fraudDetectionService.toPersistenceModel(),
      });
    }

    if (forceRefresh || !creator.fraudDetection?.lastEvaluatedAt) {
      const assessment = await fraudDetectionService.evaluateCreator(creator);
      creator.fraudDetection = fraudDetectionService.applySoftEnforcement(creator.fraudDetection, assessment);
      await creator.save();
    }

    res.json({
      success: true,
      enabled: true,
      assessment: creator.fraudDetection,
      creator: {
        id: creator._id,
        displayName: creator.displayName,
        handle: creator.handle,
        totalFollowers: creator.totalFollowers,
        averageEngagement: creator.averageEngagement,
        lastSocialSync: creator.lastSocialSync || null,
      },
    });
  } catch (error) {
    console.error('Get fraud assessment error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to load fraud assessment' });
  }
};

// ==================== GET DASHBOARD ====================
exports.getDashboard = async (req, res) => {
  try {
    const creatorId = req.user._id;

    const [activeDeals, completedDealsCount, earnings, pendingEarnings, availableCampaigns] =
      await Promise.all([
        Deal.find({ creatorId, status: { $in: ['accepted', 'in-progress', 'revision'] } })
          .populate('brandId', 'brandName logo')
          .populate('campaignId', 'title')
          .sort('-createdAt')
          .limit(5),
        Deal.countDocuments({ creatorId, status: 'completed' }),
        Payment.aggregate([
          {
            $match: {
              'to.userId': creatorId,
              status: { $in: ['completed', 'available'] },
              type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
            }
          },
          {
            $match: {
              $expr: { $ne: ['$from.userId', '$to.userId'] }
            }
          },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]),
        Payment.aggregate([
          {
            $match: {
              'to.userId': creatorId,
              status: 'in-escrow',
              type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
            }
          },
          {
            $match: {
              $expr: { $ne: ['$from.userId', '$to.userId'] }
            }
          },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]),
        Campaign.countDocuments({
          status: 'active',
          'applications.creatorId': { $ne: creatorId }
        })
      ]);

    res.json({
      success: true,
      dashboard: {
        activeDeals,
        completedDeals:    completedDealsCount,
        totalEarnings:     earnings[0]?.total || 0,
        pendingEarnings:   pendingEarnings[0]?.total || 0,
        availableCampaigns,
        stats: {
          totalDeals:         await Deal.countDocuments({ creatorId }),
          activeDealsCount:   activeDeals.length,
          completedDealsCount
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get dashboard' });
  }
};

// ==================== GET ANALYTICS ====================
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const creatorId = req.user._id;

    const startDate = new Date();
    if (period === '7d')  startDate.setDate(startDate.getDate() - 7);
    if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    if (period === '12m') startDate.setFullYear(startDate.getFullYear() - 1);

    const creator = await Creator.findById(creatorId)
      .select('socialMedia stats totalFollowers averageEngagement portfolio displayName handle profilePicture');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    const completedDeals = await Deal.find({
      creatorId,
      status:    'completed',
      createdAt: { $gte: startDate }
    }).populate('brandId', 'brandName logo');

    // Aggregate metrics
    let totalImpressions = 0, totalLikes = 0, totalComments = 0;
    let totalShares = 0, totalClicks = 0, totalConversions = 0;

    completedDeals.forEach(deal => {
      const m = deal.metrics || {};
      totalImpressions  += m.impressions  || 0;
      totalLikes        += m.likes        || 0;
      totalComments     += m.comments     || 0;
      totalShares       += m.shares       || 0;
      totalClicks       += m.clicks       || 0;
      totalConversions  += m.conversions  || 0;

      deal.deliverables?.forEach(del => {
        const p = del.performance || {};
        totalImpressions  += p.impressions  || 0;
        totalLikes        += p.likes        || 0;
        totalComments     += p.comments     || 0;
        totalShares       += p.shares       || 0;
        totalClicks       += p.clicks       || 0;
        totalConversions  += p.conversions  || 0;
      });
    });

    const totalEngagements = totalLikes + totalComments + totalShares;
    const engagementRate   = totalImpressions > 0
      ? parseFloat(((totalEngagements / totalImpressions) * 100).toFixed(2))
      : 0;

    // Monthly earnings
    const monthlyMap = {};
    completedDeals.forEach(deal => {
      const d = new Date(deal.createdAt);
      const k = `${d.getMonth() + 1}/${d.getFullYear()}`;
      if (!monthlyMap[k]) monthlyMap[k] = { earnings: 0, deals: 0 };
      monthlyMap[k].earnings += deal.budget || 0;
      monthlyMap[k].deals    += 1;
    });

    const monthly = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const [am, ay] = a.month.split('/');
        const [bm, by] = b.month.split('/');
        return new Date(ay, am - 1) - new Date(by, bm - 1);
      });

    // Platform data — Facebook excluded
    const platformColors = { instagram: '#E1306C', youtube: '#FF0000', tiktok: '#010101', twitter: '#1DA1F2' };
    const platforms = ['instagram', 'youtube', 'tiktok', 'twitter']
      .filter(p => {
        const sm = creator.socialMedia?.[p];
        return sm && (sm.followers > 0 || sm.subscribers > 0);
      })
      .map(p => ({
        name:       p,
        followers:  creator.socialMedia[p].followers || creator.socialMedia[p].subscribers || 0,
        engagement: creator.socialMedia[p].engagement || 0,
        color:      platformColors[p]
      }));

    // Top brands
    const brandMap = {};
    completedDeals.forEach(deal => {
      if (deal.brandId) {
        const k = deal.brandId._id.toString();
        if (!brandMap[k]) brandMap[k] = { brand: deal.brandId, deals: 0, earnings: 0 };
        brandMap[k].deals    += 1;
        brandMap[k].earnings += deal.budget || 0;
      }
    });
    const topBrands = Object.values(brandMap).sort((a, b) => b.earnings - a.earnings).slice(0, 5);

    const totalEarnings = completedDeals.reduce((s, d) => s + (d.budget || 0), 0);

    res.json({
      success: true,
      analytics: {
        summary: {
          totalEarnings,
          totalDeals:       completedDeals.length,
          averageDealValue: completedDeals.length > 0 ? totalEarnings / completedDeals.length : 0,
          averageRating:    creator.stats?.averageRating || 0,
          totalFollowers:   creator.totalFollowers || 0,
          averageEngagement: engagementRate,
          completedDeals:   creator.stats?.completedCampaigns || 0
        },
        monthly,
        platforms,
        topBrands,
        engagement: {
          impressions: totalImpressions,
          likes:       totalLikes,
          comments:    totalComments,
          shares:      totalShares,
          clicks:      totalClicks,
          conversions: totalConversions,
          total:       totalEngagements,
          rate:        engagementRate
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get analytics' });
  }
};

// ==================== EARNINGS SUMMARY ====================
exports.getEarningsSummary = async (req, res) => {
  try {
    const creatorId = req.user._id;

    const startOfMonth    = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const startOfLastMonth = new Date(); startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1); startOfLastMonth.setDate(1); startOfLastMonth.setHours(0, 0, 0, 0);
    const endOfLastMonth  = new Date(); endOfLastMonth.setDate(0); endOfLastMonth.setHours(23, 59, 59, 999);

    const [total, thisMonth, lastMonth, avgDeal] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            'to.userId': creatorId,
            status: { $in: ['completed', 'available'] },
            type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
          }
        },
        { $match: { $expr: { $ne: ['$from.userId', '$to.userId'] } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Payment.aggregate([
        {
          $match: {
            'to.userId': creatorId,
            status: { $in: ['completed', 'available'] },
            type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES },
            createdAt: { $gte: startOfMonth }
          }
        },
        { $match: { $expr: { $ne: ['$from.userId', '$to.userId'] } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Payment.aggregate([
        {
          $match: {
            'to.userId': creatorId,
            status: { $in: ['completed', 'available'] },
            type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES },
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          }
        },
        { $match: { $expr: { $ne: ['$from.userId', '$to.userId'] } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Deal.aggregate([{ $match: { creatorId, status: 'completed' } }, { $group: { _id: null, avg: { $avg: '$budget' } } }])
    ]);

    res.json({
      success: true,
      summary: {
        total:            total[0]?.total || 0,
        thisMonth:        thisMonth[0]?.total || 0,
        lastMonth:        lastMonth[0]?.total || 0,
        averageDealValue: avgDeal[0]?.avg || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== EARNINGS HISTORY ====================
exports.getEarningsHistory = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const creatorId = req.user._id;

    const startDate = new Date();
    if (period === '7d')  startDate.setDate(startDate.getDate() - 7);
    if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    if (period === '12m') startDate.setFullYear(startDate.getFullYear() - 1);

    const history = await Payment.aggregate([
      {
        $match: {
          'to.userId': creatorId,
          status: { $in: ['completed', 'available'] },
          type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES },
          createdAt: { $gte: startDate }
        }
      },
      { $match: { $expr: { $ne: ['$from.userId', '$to.userId'] } } },
      {
        $group: {
          _id:      { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
          earnings: { $sum: '$netAmount' },
          count:    { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== PORTFOLIO ====================
exports.addPortfolioItem = async (req, res) => {
  try {
    const { title, description, mediaUrl, platform, brand, campaign, performance } = req.body;
 
    if (!title || !mediaUrl || !platform) {
      return res.status(400).json({
        success: false,
        error: 'title, mediaUrl, and platform are required'
      });
    }
 
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          portfolio: {
            title,
            description,
            mediaUrl,
            thumbnail: req.body.thumbnail || null,
            platform,
            brand,
            campaign,
            performance: performance || { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 },
            date: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    ).select('portfolio');
 
    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }
 
    res.status(201).json({
      success: true,
      message: 'Portfolio item added',
      portfolio: creator.portfolio,
      // Return the newly added item (last in array)
      item: creator.portfolio[creator.portfolio.length - 1]
    });
  } catch (error) {
    console.error('Add portfolio item error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to add portfolio item' });
  }
};
 
// ==================== UPDATE PORTFOLIO ITEM ====================
exports.updatePortfolioItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { title, description, mediaUrl, thumbnail, platform, brand, campaign, performance } = req.body;
 
    // Build the $set object with only the fields that were provided
    const updateFields = {};
    if (title       !== undefined) updateFields['portfolio.$.title']       = title;
    if (description !== undefined) updateFields['portfolio.$.description'] = description;
    if (mediaUrl    !== undefined) updateFields['portfolio.$.mediaUrl']    = mediaUrl;
    if (thumbnail   !== undefined) updateFields['portfolio.$.thumbnail']   = thumbnail;
    if (platform    !== undefined) updateFields['portfolio.$.platform']    = platform;
    if (brand       !== undefined) updateFields['portfolio.$.brand']       = brand;
    if (campaign    !== undefined) updateFields['portfolio.$.campaign']    = campaign;
 
    // Merge performance fields individually so a partial update doesn't zero out other metrics
    if (performance) {
      if (performance.views       !== undefined) updateFields['portfolio.$.performance.views']       = performance.views;
      if (performance.likes       !== undefined) updateFields['portfolio.$.performance.likes']       = performance.likes;
      if (performance.comments    !== undefined) updateFields['portfolio.$.performance.comments']    = performance.comments;
      if (performance.shares      !== undefined) updateFields['portfolio.$.performance.shares']      = performance.shares;
      if (performance.engagement  !== undefined) updateFields['portfolio.$.performance.engagement']  = performance.engagement;
    }
 
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided to update' });
    }
 
    const creator = await Creator.findOneAndUpdate(
      {
        _id: req.user._id,
        'portfolio._id': itemId   // positional operator matches this subdocument
      },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('portfolio');
 
    if (!creator) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found or does not belong to you'
      });
    }
 
    const updatedItem = creator.portfolio.id(itemId);
 
    res.json({
      success: true,
      message: 'Portfolio item updated',
      portfolio: creator.portfolio,
      item: updatedItem
    });
  } catch (error) {
    console.error('Update portfolio item error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update portfolio item' });
  }
};
 
// ==================== DELETE PORTFOLIO ITEM ====================
exports.deletePortfolioItem = async (req, res) => {
  try {
    const { itemId } = req.params;
 
    // First verify the item exists and belongs to this creator
    const creatorCheck = await Creator.findOne({
      _id: req.user._id,
      'portfolio._id': itemId
    });
 
    if (!creatorCheck) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found or does not belong to you'
      });
    }
 
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      {
        $pull: {
          portfolio: { _id: itemId }
        }
      },
      { new: true }
    ).select('portfolio');
 
    res.json({
      success: true,
      message: 'Portfolio item deleted',
      portfolio: creator.portfolio
    });
  } catch (error) {
    console.error('Delete portfolio item error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete portfolio item' });
  }
};
 
// ==================== GET PORTFOLIO (standalone) ====================
// Optional: returns just the portfolio array without the full profile
exports.getPortfolio = async (req, res) => {
  try {
    const creator = await Creator.findById(req.user._id).select('portfolio');
 
    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }
 
    res.json({
      success: true,
      portfolio: creator.portfolio || []
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get portfolio' });
  }
};
exports.updateNotificationSettings = async (req, res) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: { notifications: req.body.notifications } },
      { new: true }
    ).select('notifications');

    res.json({ success: true, message: 'Notification settings updated', notifications: creator.notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePrivacySettings = async (req, res) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: { privacy: req.body.privacy } },
      { new: true }
    ).select('privacy');

    res.json({ success: true, message: 'Privacy settings updated', privacy: creator.privacy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateRateCard = async (req, res) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: { rateCard: req.body.rateCard } },
      { new: true }
    ).select('rateCard');

    res.json({ success: true, message: 'Rate card updated', rateCard: creator.rateCard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: { availability: req.body.availability } },
      { new: true }
    ).select('availability');

    res.json({ success: true, message: 'Availability updated', availability: creator.availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CREATOR GROWTH OS ====================
exports.getGrowthOS = async (req, res) => {
  try {
    const currentPlan = await getCreatorSubscriptionPlan(req.user._id);
    const canUseGrowthOS = ['professional', 'enterprise'].includes(currentPlan);

    if (!canUseGrowthOS) {
      return res.status(403).json({
        success: false,
        error: 'Creator Growth OS is available on Professional plan and above',
        code: 'PROFESSIONAL_REQUIRED',
        entitlement: {
          canUse: false,
          currentPlan,
          requiredPlan: 'professional'
        }
      });
    }

    const requestedContentType = String(req.query.contentType || 'general').toLowerCase();
    const selectedContentType = isValidContentTypeValue(requestedContentType)
      ? requestedContentType
      : 'general';
    const refreshToken = String(req.query.refreshToken || '');

    const creator = await Creator.findById(req.user._id).select(
      'displayName handle primaryPlatform niches socialMedia totalFollowers averageEngagement audienceDemographics'
    );

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    const platform = getDominantPlatform(creator);
    const followers = getPlatformFollowers(creator.socialMedia, platform);
    const engagement = getPlatformEngagement(creator.socialMedia, platform, creator.averageEngagement);
    const lastSynced = getPlatformLastSynced(creator.socialMedia, platform) || creator.lastSocialSync;
    const windows = getDynamicPostingWindows(platform, followers, engagement);
    const confidence = getConfidenceLevel({ followers, engagement, lastSynced });
    const ideaSeed = `${creator._id}:${platform}:${selectedContentType}:${refreshToken || 'base'}`;
    const rng = createSeededRng(ideaSeed);
    const postingInsights = getGrowthPlatforms().map((postingPlatform) => {
      const platformFollowers = getPlatformFollowers(creator.socialMedia, postingPlatform);
      const platformEngagement = getPlatformEngagement(creator.socialMedia, postingPlatform, creator.averageEngagement);
      const platformLastSynced = getPlatformLastSynced(creator.socialMedia, postingPlatform) || creator.lastSocialSync;
      const platformConfidence = getConfidenceLevel({
        followers: platformFollowers,
        engagement: platformEngagement,
        lastSynced: platformLastSynced
      });

      return {
        platform: postingPlatform,
        confidence: platformConfidence,
        windows: getDynamicPostingWindows(postingPlatform, platformFollowers, platformEngagement),
        basis: `Suggestions are based on your ${postingPlatform} profile signals and current engagement benchmarks.`
      };
    });

    const hfIdeas = await generateHuggingFaceContentIdeas({
      creator,
      platform,
      contentType: selectedContentType,
      refreshToken
    });

    const validatedHfIdeas = validateHfIdeasForType(hfIdeas || [], selectedContentType);
    if (hfIdeas && !validatedHfIdeas) {
      console.warn('HF ideas rejected for off-topic category drift, using heuristic ideas instead:', selectedContentType);
    }

    res.json({
      success: true,
      growthOS: {
        postingInsights,
        bestPostingTime: {
          platform,
          confidence,
          windows,
          basis: `Suggestions are based on your ${platform} profile signals and current engagement benchmarks.`
        },
        contentIdeas: validatedHfIdeas || buildContentIdeas(creator, platform, { contentType: selectedContentType, rng }),
        selectedContentType,
        availableContentTypes: CONTENT_TYPE_OPTIONS,
        ideaSource: validatedHfIdeas ? 'huggingface' : 'heuristic',
        audienceImprovementTips: buildAudienceImprovementTips(creator, platform),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Growth OS error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate growth insights' });
  }
};