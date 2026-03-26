// utils/constants.js - COMPLETE FIXED VERSION

// ==================== USER TYPES ====================
const USER_TYPES = {
  BRAND: 'brand',
  CREATOR: 'creator',
  ADMIN: 'admin'
};

// ==================== USER STATUS ====================
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  REJECTED: 'rejected',
  DELETED: 'deleted'
};

// ==================== CAMPAIGN STATUS ====================
const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  REJECTED: 'rejected'
};

// ==================== DEAL STATUS ====================
const DEAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
  REVISION: 'revision',
  NEGOTIATING: 'negotiating',
  OVERDUE: 'overdue'
};

// ==================== PAYMENT STATUS ====================
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  IN_ESCROW: 'in-escrow',
  RELEASED: 'released',
  ON_HOLD: 'on-hold'
};

// ==================== PAYMENT TYPES ====================
const PAYMENT_TYPES = {
  ESCROW: 'escrow',
  WITHDRAWAL: 'withdrawal',
  REFUND: 'refund',
  FEE: 'fee',
  BONUS: 'bonus',
  PENALTY: 'penalty',
  SUBSCRIPTION: 'subscription'
};

// ==================== DISPUTE STATUS ====================
const DISPUTE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  ESCALATED: 'escalated'
};

// ==================== DISPUTE PRIORITY ====================
const DISPUTE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// ==================== NOTIFICATION TYPES ====================
const NOTIFICATION_TYPES = {
  DEAL: 'deal',
  MESSAGE: 'message',
  PAYMENT: 'payment',
  CAMPAIGN: 'campaign',
  REMINDER: 'reminder',
  SYSTEM: 'system',
  ALERT: 'alert',
  SECURITY: 'security',
  TEAM: 'team',
  GENERAL: 'general'
};

// ==================== NOTIFICATION PRIORITY ====================
const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// ==================== NOTIFICATION CHANNELS ====================
const NOTIFICATION_CHANNELS = {
  IN_APP: 'in-app',
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms'
};

// ==================== DELIVERABLE TYPES ====================
const DELIVERABLE_TYPES = {
  POST: 'post',
  STORY: 'story',
  REEL: 'reel',
  VIDEO: 'video',
  BLOG: 'blog',
  REVIEW: 'review',
  IMAGE: 'image',
  OTHER: 'other'
};

// ==================== DELIVERABLE STATUS ====================
const DELIVERABLE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REVISION: 'revision',
  REJECTED: 'rejected'
};

// ==================== PLATFORMS ====================
const PLATFORMS = {
  INSTAGRAM: 'instagram',
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  TWITTER: 'twitter',
  FACEBOOK: 'facebook',
  LINKEDIN: 'linkedin',
  WEBSITE: 'website',
  OTHER: 'other'
};

// ==================== PLATFORM_COLORS ====================
const PLATFORM_COLORS = {
  [PLATFORMS.INSTAGRAM]: '#E1306C',
  [PLATFORMS.YOUTUBE]: '#FF0000',
  [PLATFORMS.TIKTOK]: '#000000',
  [PLATFORMS.TWITTER]: '#1DA1F2',
  [PLATFORMS.FACEBOOK]: '#4267B2',
  [PLATFORMS.LINKEDIN]: '#0077B5',
  [PLATFORMS.WEBSITE]: '#4F46E5',
  [PLATFORMS.OTHER]: '#6B7280'
};

// ==================== CATEGORIES ====================
const CATEGORIES = [
  'Fashion',
  'Beauty',
  'Technology',
  'Food & Beverage',
  'Fitness',
  'Travel',
  'Gaming',
  'Lifestyle',
  'Parenting',
  'Finance',
  'Education',
  'Entertainment',
  'Sports',
  'Automotive',
  'Real Estate',
  'Health',
  'Wellness',
  'Photography',
  'Art',
  'Music',
  'Business',
  'Motivation',
  'Comedy',
  'DIY',
  'Crafts',
  'Pets',
  'Outdoors',
  'Home',
  'Gardening',
  'Other'
];

// ==================== NICHES ====================
const NICHES = [
  'Fashion',
  'Beauty',
  'Fitness',
  'Travel',
  'Food',
  'Tech',
  'Gaming',
  'Lifestyle',
  'Parenting',
  'Finance',
  'Education',
  'Entertainment',
  'Sports',
  'Health',
  'Wellness',
  'Photography',
  'Art',
  'Music',
  'Business',
  'Motivation',
  'Comedy',
  'DIY',
  'Crafts',
  'Pets',
  'Outdoors',
  'Home',
  'Gardening'
];

// ==================== CURRENCIES ====================
const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  INR: 'INR',
  AUD: 'AUD',
  CAD: 'CAD',
  JPY: 'JPY',
  CNY: 'CNY'
};

const CURRENCY_SYMBOLS = {
  [CURRENCIES.USD]: '$',
  [CURRENCIES.EUR]: '€',
  [CURRENCIES.GBP]: '£',
  [CURRENCIES.INR]: '₹',
  [CURRENCIES.AUD]: 'A$',
  [CURRENCIES.CAD]: 'C$',
  [CURRENCIES.JPY]: '¥',
  [CURRENCIES.CNY]: '¥'
};

// ==================== TIMEZONES ====================
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland'
];

// ==================== DATE FORMATS ====================
const DATE_FORMATS = {
  MM_DD_YYYY: 'MM/DD/YYYY',
  DD_MM_YYYY: 'DD/MM/YYYY',
  YYYY_MM_DD: 'YYYY-MM-DD',
  FULL: 'full',
  DATE: 'date',
  TIME: 'time'
};

// ==================== TIME_FORMATS ====================
const TIME_FORMATS = {
  HOUR_12: '12h',
  HOUR_24: '24h'
};

// ==================== FILE_TYPES ====================
const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  VIDEO: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mpeg'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls'],
  ARCHIVE: ['zip', 'rar', '7z', 'tar', 'gz']
};

// ==================== MIME_TYPES ====================
const MIME_TYPES = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'mp4': 'video/mp4',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

// ==================== MAX_FILE_SIZES ====================
const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
  ARCHIVE: 100 * 1024 * 1024 // 100MB
};

// ==================== PAGINATION ====================
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// ==================== RATE_LIMITS ====================
const RATE_LIMITS = {
  API: { window: 15 * 60 * 1000, max: 100 }, // 15 minutes, 100 requests
  AUTH: { window: 60 * 60 * 1000, max: 10 }, // 1 hour, 10 attempts
  REGISTER: { window: 60 * 60 * 1000, max: 3 }, // 1 hour, 3 registrations
  DEAL_CREATION: { window: 60 * 60 * 1000, max: 20 }, // 1 hour, 20 deals
  MESSAGE: { window: 60 * 1000, max: 30 }, // 1 minute, 30 messages
  SEARCH: { window: 60 * 1000, max: 30 } // 1 minute, 30 searches
};

// ==================== PLATFORM_FEES ====================
const PLATFORM_FEES = {
  COMMISSION_RATE: 0.10, // 10%
  WITHDRAWAL_FEE: 0,
  MIN_PAYOUT: 50,
  MIN_ESCROW: 100
};

// ==================== SUBSCRIPTION_PLANS ====================
const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

// ==================== SORT_OPTIONS ====================
const SORT_OPTIONS = {
  RELEVANCE: 'relevance',
  NEWEST: 'newest',
  OLDEST: 'oldest',
  PRICE_LOW: 'price_low',
  PRICE_HIGH: 'price_high',
  FOLLOWERS_HIGH: 'followers_high',
  FOLLOWERS_LOW: 'followers_low',
  ENGAGEMENT_HIGH: 'engagement_high',
  RATING_HIGH: 'rating_high'
};

// ==================== AGE_GROUPS ====================
const AGE_GROUPS = {
  '18-24': '18-24',
  '25-34': '25-34',
  '35-44': '35-44',
  '45+': '45+'
};

// ==================== GENDERS ====================
const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
  ALL: 'all'
};

// ==================== SOCIAL_PLATFORMS ====================
const SOCIAL_PLATFORMS = [
  'instagram',
  'youtube',
  'tiktok',
  'twitter',
  'facebook',
  'linkedin'
];

// ==================== HTTP_STATUS ====================
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// ==================== ERROR_CODES ====================
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  INVALID_ID: 'INVALID_ID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  RATE_LIMIT: 'RATE_LIMIT',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE'
};

// ==================== EXPORTS ====================
module.exports = {
  // User related
  USER_TYPES,
  USER_STATUS,
  
  // Campaign related
  CAMPAIGN_STATUS,
  CATEGORIES,
  NICHES,
  
  // Deal related
  DEAL_STATUS,
  DELIVERABLE_TYPES,
  DELIVERABLE_STATUS,
  
  // Payment related
  PAYMENT_STATUS,
  PAYMENT_TYPES,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  
  // Dispute related
  DISPUTE_STATUS,
  DISPUTE_PRIORITY,
  
  // Notification related
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CHANNELS,
  
  // Platform related
  PLATFORMS,
  PLATFORM_COLORS,
  SOCIAL_PLATFORMS,
  
  // File related
  FILE_TYPES,
  MIME_TYPES,
  MAX_FILE_SIZES,
  
  // Pagination
  PAGINATION,
  
  // Rate limits
  RATE_LIMITS,
  
  // Fees
  PLATFORM_FEES,
  SUBSCRIPTION_PLANS,
  
  // Sorting
  SORT_OPTIONS,
  
  // Demographics
  AGE_GROUPS,
  GENDERS,
  
  // Time related
  TIMEZONES,
  DATE_FORMATS,
  TIME_FORMATS,
  
  // HTTP
  HTTP_STATUS,
  ERROR_CODES
};