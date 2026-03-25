// utils/constants.js - COMPLETE FIXED VERSION

// ==================== USER TYPES ====================
export const USER_TYPES = {
  BRAND: 'brand',
  CREATOR: 'creator',
  ADMIN: 'admin'
};

export const USER_TYPE_LABELS = {
  [USER_TYPES.BRAND]: 'Brand',
  [USER_TYPES.CREATOR]: 'Creator',
  [USER_TYPES.ADMIN]: 'Admin'
};

// ==================== USER STATUS ====================
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  REJECTED: 'rejected',
  DELETED: 'deleted'
};

export const USER_STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: 'Active',
  [USER_STATUS.INACTIVE]: 'Inactive',
  [USER_STATUS.SUSPENDED]: 'Suspended',
  [USER_STATUS.PENDING]: 'Pending',
  [USER_STATUS.REJECTED]: 'Rejected',
  [USER_STATUS.DELETED]: 'Deleted'
};

// ==================== CAMPAIGN STATUS ====================
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  REJECTED: 'rejected'
};

export const CAMPAIGN_STATUS_LABELS = {
  [CAMPAIGN_STATUS.DRAFT]: 'Draft',
  [CAMPAIGN_STATUS.PENDING]: 'Pending Review',
  [CAMPAIGN_STATUS.ACTIVE]: 'Active',
  [CAMPAIGN_STATUS.PAUSED]: 'Paused',
  [CAMPAIGN_STATUS.COMPLETED]: 'Completed',
  [CAMPAIGN_STATUS.ARCHIVED]: 'Archived',
  [CAMPAIGN_STATUS.REJECTED]: 'Rejected'
};

// ==================== DEAL STATUS ====================
export const DEAL_STATUS = {
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

export const DEAL_STATUS_LABELS = {
  [DEAL_STATUS.PENDING]: 'Pending',
  [DEAL_STATUS.ACCEPTED]: 'Accepted',
  [DEAL_STATUS.DECLINED]: 'Declined',
  [DEAL_STATUS.IN_PROGRESS]: 'In Progress',
  [DEAL_STATUS.COMPLETED]: 'Completed',
  [DEAL_STATUS.CANCELLED]: 'Cancelled',
  [DEAL_STATUS.DISPUTED]: 'Disputed',
  [DEAL_STATUS.REVISION]: 'Revision',
  [DEAL_STATUS.NEGOTIATING]: 'Negotiating',
  [DEAL_STATUS.OVERDUE]: 'Overdue'
};

// ==================== PAYMENT STATUS ====================
export const PAYMENT_STATUS = {
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

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.PROCESSING]: 'Processing',
  [PAYMENT_STATUS.COMPLETED]: 'Completed',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.CANCELLED]: 'Cancelled',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: 'Partially Refunded',
  [PAYMENT_STATUS.IN_ESCROW]: 'In Escrow',
  [PAYMENT_STATUS.RELEASED]: 'Released',
  [PAYMENT_STATUS.ON_HOLD]: 'On Hold'
};

// ==================== PAYMENT TYPES ====================
export const PAYMENT_TYPES = {
  ESCROW: 'escrow',
  WITHDRAWAL: 'withdrawal',
  REFUND: 'refund',
  FEE: 'fee',
  BONUS: 'bonus',
  PENALTY: 'penalty',
  SUBSCRIPTION: 'subscription'
};

// ==================== DISPUTE STATUS ====================
export const DISPUTE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  ESCALATED: 'escalated'
};

export const DISPUTE_STATUS_LABELS = {
  [DISPUTE_STATUS.OPEN]: 'Open',
  [DISPUTE_STATUS.IN_PROGRESS]: 'In Progress',
  [DISPUTE_STATUS.RESOLVED]: 'Resolved',
  [DISPUTE_STATUS.CLOSED]: 'Closed',
  [DISPUTE_STATUS.ESCALATED]: 'Escalated'
};

// ==================== DISPUTE PRIORITY ====================
export const DISPUTE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const DISPUTE_PRIORITY_LABELS = {
  [DISPUTE_PRIORITY.LOW]: 'Low',
  [DISPUTE_PRIORITY.MEDIUM]: 'Medium',
  [DISPUTE_PRIORITY.HIGH]: 'High',
  [DISPUTE_PRIORITY.URGENT]: 'Urgent'
};

// ==================== NOTIFICATION TYPES ====================
export const NOTIFICATION_TYPES = {
  DEAL: 'deal',
  MESSAGE: 'message',
  PAYMENT: 'payment',
  CAMPAIGN: 'campaign',
  REMINDER: 'reminder',
  SYSTEM: 'system',
  ALERT: 'alert'
};

// ==================== NOTIFICATION PRIORITY ====================
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// ==================== DELIVERABLE TYPES ====================
export const DELIVERABLE_TYPES = {
  POST: 'post',
  STORY: 'story',
  REEL: 'reel',
  VIDEO: 'video',
  BLOG: 'blog',
  REVIEW: 'review',
  IMAGE: 'image',
  OTHER: 'other'
};

export const DELIVERABLE_TYPE_LABELS = {
  [DELIVERABLE_TYPES.POST]: 'Post',
  [DELIVERABLE_TYPES.STORY]: 'Story',
  [DELIVERABLE_TYPES.REEL]: 'Reel',
  [DELIVERABLE_TYPES.VIDEO]: 'Video',
  [DELIVERABLE_TYPES.BLOG]: 'Blog',
  [DELIVERABLE_TYPES.REVIEW]: 'Review',
  [DELIVERABLE_TYPES.IMAGE]: 'Image',
  [DELIVERABLE_TYPES.OTHER]: 'Other'
};

// ==================== DELIVERABLE STATUS ====================
export const DELIVERABLE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REVISION: 'revision',
  REJECTED: 'rejected'
};

// ==================== PLATFORMS ====================
export const PLATFORMS = {
  INSTAGRAM: 'instagram',
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  TWITTER: 'twitter',
  FACEBOOK: 'facebook',
  LINKEDIN: 'linkedin',
  WEBSITE: 'website',
  OTHER: 'other'
};

export const PLATFORM_LABELS = {
  [PLATFORMS.INSTAGRAM]: 'Instagram',
  [PLATFORMS.YOUTUBE]: 'YouTube',
  [PLATFORMS.TIKTOK]: 'TikTok',
  [PLATFORMS.TWITTER]: 'Twitter',
  [PLATFORMS.FACEBOOK]: 'Facebook',
  [PLATFORMS.LINKEDIN]: 'LinkedIn',
  [PLATFORMS.WEBSITE]: 'Website',
  [PLATFORMS.OTHER]: 'Other'
};

export const PLATFORM_COLORS = {
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
export const CATEGORIES = [
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
export const NICHES = [
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
export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  INR: 'INR',
  AUD: 'AUD',
  CAD: 'CAD',
  JPY: 'JPY',
  CNY: 'CNY'
};

export const CURRENCY_SYMBOLS = {
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
export const TIMEZONES = [
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

// ==================== DATE RANGES ====================
export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  LAST_90_DAYS: '90d',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom'
};

export const DATE_RANGE_LABELS = {
  [DATE_RANGES.TODAY]: 'Today',
  [DATE_RANGES.YESTERDAY]: 'Yesterday',
  [DATE_RANGES.LAST_7_DAYS]: 'Last 7 Days',
  [DATE_RANGES.LAST_30_DAYS]: 'Last 30 Days',
  [DATE_RANGES.LAST_90_DAYS]: 'Last 90 Days',
  [DATE_RANGES.THIS_MONTH]: 'This Month',
  [DATE_RANGES.LAST_MONTH]: 'Last Month',
  [DATE_RANGES.THIS_YEAR]: 'This Year',
  [DATE_RANGES.CUSTOM]: 'Custom'
};

// ==================== SORT OPTIONS ====================
export const SORT_OPTIONS = {
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

// ==================== AGE GROUPS ====================
export const AGE_GROUPS = {
  '18-24': '18-24',
  '25-34': '25-34',
  '35-44': '35-44',
  '45+': '45+'
};

// ==================== GENDERS ====================
export const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
  ALL: 'all'
};

// ==================== HTTP STATUS ====================
export const HTTP_STATUS = {
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

// ==================== ERROR CODES ====================
export const ERROR_CODES = {
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

// ==================== ROLES & PERMISSIONS ====================
export const ROLES = {
  BRAND: 'brand',
  CREATOR: 'creator',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support'
};

export const PERMISSIONS = {
  VIEW_CAMPAIGNS: 'view_campaigns',
  CREATE_CAMPAIGN: 'create_campaign',
  EDIT_CAMPAIGN: 'edit_campaign',
  DELETE_CAMPAIGN: 'delete_campaign',
  VIEW_DEALS: 'view_deals',
  CREATE_DEAL: 'create_deal',
  ACCEPT_DEAL: 'accept_deal',
  REJECT_DEAL: 'reject_deal',
  VIEW_PAYMENTS: 'view_payments',
  PROCESS_PAYMENTS: 'process_payments',
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data'
};

// ==================== PAGINATION ====================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// ==================== FILE CONSTANTS ====================
export const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  VIDEO: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mpeg'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls'],
  ARCHIVE: ['zip', 'rar', '7z', 'tar', 'gz']
};

export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
  ARCHIVE: 100 * 1024 * 1024 // 100MB
};

// ==================== EXPORT ====================
export default {
  USER_TYPES,
  USER_TYPE_LABELS,
  USER_STATUS,
  USER_STATUS_LABELS,
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_LABELS,
  DEAL_STATUS,
  DEAL_STATUS_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPES,
  DISPUTE_STATUS,
  DISPUTE_STATUS_LABELS,
  DISPUTE_PRIORITY,
  DISPUTE_PRIORITY_LABELS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  DELIVERABLE_TYPES,
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_STATUS,
  PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  CATEGORIES,
  NICHES,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  TIMEZONES,
  DATE_RANGES,
  DATE_RANGE_LABELS,
  SORT_OPTIONS,
  AGE_GROUPS,
  GENDERS,
  HTTP_STATUS,
  ERROR_CODES,
  ROLES,
  PERMISSIONS,
  PAGINATION,
  FILE_TYPES,
  MAX_FILE_SIZES
};