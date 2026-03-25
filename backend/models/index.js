// models/index.js
const User = require('./User');
const Brand = require('./Brand');
const Creator = require('./Creator');
const Admin = require('./Admin');
const TokenBlacklist = require('./TokenBlacklist');
const Session = require('./Session');
const AuditLog = require('./AuditLog');
const ApiKey = require('./ApiKey');
const Campaign = require('./Campaign');
const Deal = require('./Deal');
const Deliverable = require('./Deliverable');
const Contract = require('./Contract');
const Dispute = require('./Dispute');
const Review = require('./Review');
const Rating = require('./Rating');
const FeaturedListing = require('./FeaturedListing');
const Payment = require('./Payment');
const Payout = require('./Payout');
const Refund = require('./Refund');
const Withdrawal = require('./Withdrawal');
const PerformancePayment = require('./PerformancePayment');
const Fee = require('./Fee');
const BankAccount = require('./BankAccount');
const CreditCard = require('./CreditCard');
const Invoice = require('./Invoice');
const TaxInfo = require('./TaxInfo');
const Subscription = require('./Subscription');
const Plan = require('./Plan');
const Message = require('./Message');
const Conversation = require('./Conversation');
const Notification = require('./Notification');
const Invitation = require('./Invitation');
const Analytics = require('./Analytics');
const Report = require('./Report');
const SavedSearch = require('./SavedSearch');
const ConsentLog = require('./ConsentLog');
const ExportRequest = require('./ExportRequest');
const Referral = require('./Referral');
const TempOTP = require('./TempOTP');
const PasswordHistory = require('./PasswordHistory');
const TransactionLog = require('./TransactionLog');
const Settings = require('./Settings');
const SocialAccount = require('./SocialAccount');

module.exports = {
  User,
  Brand,
  Creator,
  Admin,
  TokenBlacklist,
  Session,
  AuditLog,
  ApiKey,
  Campaign,
  Deal,
  Deliverable,
  Contract,
  Dispute,
  Review,
  Rating,
  FeaturedListing,
  Payment,
  Payout,
  Refund,
  Withdrawal,
  PerformancePayment,
  Fee,
  BankAccount,
  CreditCard,
  Invoice,
  TaxInfo,
  Subscription,
  Plan,
  Message,
  Conversation,
  Notification,
  Invitation,
  Analytics,
  Report,
  SavedSearch,
  ConsentLog,
  ExportRequest,
  Referral,
  TempOTP,
  PasswordHistory,
  TransactionLog,
  Settings,
  SocialAccount
};