# INFLUENCE

An influencer marketing platform connecting brands with creators.

## Workspace Structure

```
INFLUENCE/
├── backend/                          # Node.js / Express API server
│   ├── .env                          # Environment variables
│   ├── jest.config.js                # Jest test configuration
│   ├── package.json
│   ├── server.js                     # Application entry point
│   ├── config/
│   │   ├── auth.js
│   │   ├── cloudinary.js
│   │   ├── redis.js
│   │   ├── stripe.js
│   │   └── subscriptionPlans.js
│   ├── controllers/
│   │   ├── admin/
│   │   │   ├── adminController.js
│   │   │   ├── campaignController.js
│   │   │   ├── reportController.js
│   │   │   └── userController.js
│   │   ├── activityController.js
│   │   ├── affiliateController.js
│   │   ├── analyticsController.js
│   │   ├── auditController.js
│   │   ├── authController.js
│   │   ├── brandController.js
│   │   ├── campaignController.js
│   │   ├── chatController.js
│   │   ├── complianceController.js
│   │   ├── contractController.js
│   │   ├── creatorController.js
│   │   ├── dealController.js
│   │   ├── deliverableController.js
│   │   ├── disputeController.js
│   │   ├── featuredController.js
│   │   ├── feeController.js
│   │   ├── invitationController.js
│   │   ├── messageController.js
│   │   ├── notificationController.js
│   │   ├── paymentController.js
│   │   ├── ratingController.js
│   │   ├── reviewController.js
│   │   ├── searchController.js
│   │   ├── socialOAuthController.js
│   │   ├── subscriptionController.js
│   │   ├── userController.js
│   │   └── verificationController.js
│   ├── crons/
│   │   └── index.js
│   ├── jobs/
│   │   └── notificationJobs.js
│   ├── logs/
│   │   ├── combined.log
│   │   └── error.log
│   ├── middleware/
│   │   ├── validation/
│   │   │   └── schemas.js
│   │   ├── adminAuth.js
│   │   ├── apiKeyAuth.js
│   │   ├── auth.js
│   │   ├── authMiddleware.js
│   │   ├── captcha.js
│   │   ├── errorHandler.js
│   │   ├── expressValidator.js
│   │   ├── ownership.js
│   │   ├── performance.js
│   │   ├── rateLimiter.js
│   │   ├── security.js
│   │   ├── subscription.js
│   │   ├── subscriptionCheck.js
│   │   ├── upload.js
│   │   ├── validation.js
│   │   └── validators.js
│   ├── models/
│   │   ├── ActivityLog.js
│   │   ├── Admin.js
│   │   ├── Analytics.js
│   │   ├── ApiKey.js
│   │   ├── AuditLog.js
│   │   ├── BankAccount.js
│   │   ├── Brand.js
│   │   ├── Campaign.js
│   │   ├── ConsentLog.js
│   │   ├── Contract.js
│   │   ├── Conversation.js
│   │   ├── Creator.js
│   │   ├── CreditCard.js
│   │   ├── Deal.js
│   │   ├── Deliverable.js
│   │   ├── Dispute.js
│   │   ├── ExportRequest.js
│   │   ├── FeaturedListing.js
│   │   ├── Fee.js
│   │   ├── Invitation.js
│   │   ├── Invoice.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── PasswordHistory.js
│   │   ├── Payment.js
│   │   ├── Payout.js
│   │   ├── PerformancePayment.js
│   │   ├── Plan.js
│   │   ├── Rating.js
│   │   ├── Referral.js
│   │   ├── Refund.js
│   │   ├── Report.js
│   │   ├── Review.js
│   │   ├── SavedSearch.js
│   │   ├── Session.js
│   │   ├── Settings.js
│   │   ├── SocialAccount.js
│   │   ├── Subscription.js
│   │   ├── TaxInfo.js
│   │   ├── TempOTP.js
│   │   ├── TokenBlacklist.js
│   │   ├── Transaction.js
│   │   ├── TransactionLog.js
│   │   ├── User.js
│   │   ├── Withdrawal.js
│   │   └── index.js
│   ├── routes/
│   │   ├── activityRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── adminTwoFARoutes.js
│   │   ├── affiliateRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── auditRoutes.js
│   │   ├── authRoutes.js
│   │   ├── brandRoutes.js
│   │   ├── campaignRoutes.js
│   │   ├── complianceRoutes.js
│   │   ├── contractRoutes.js
│   │   ├── creatorRoutes.js
│   │   ├── dealRoutes.js
│   │   ├── deliverableRoutes.js
│   │   ├── disputeRoutes.js
│   │   ├── featuredRoutes.js
│   │   ├── feeRoutes.js
│   │   ├── invitationRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── pushRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── searchRoutes.js
│   │   ├── socialOAuthRoutes.js
│   │   ├── subscriptionRoutes.js
│   │   ├── twoFARoutes.js
│   │   ├── uploadRoutes.js
│   │   └── userRoutes.js
│   ├── scripts/
│   │   └── rotateSecrets.js
│   ├── seeders/
│   │   └── adminSeeder.js
│   ├── services/
│   │   ├── SMSService.js
│   │   ├── analyticsService.js
│   │   ├── backupService.js
│   │   ├── brandService.js
│   │   ├── cacheService.js
│   │   ├── captchaService.js
│   │   ├── cloudinaryService.js
│   │   ├── contractService.js
│   │   ├── creatorService.js
│   │   ├── dataExportService.js
│   │   ├── emailService.js
│   │   ├── featuredService.js
│   │   ├── matchEngine.js
│   │   ├── notificationService.js
│   │   ├── paymentCalculator.js
│   │   ├── queueService.js
│   │   ├── searchService.js
│   │   ├── socialMediaService.js
│   │   ├── socialService.js
│   │   ├── stripeService.js
│   │   ├── twoFactorService.js
│   │   ├── webPushService.js
│   │   └── webhookService.js
│   ├── socket/
│   │   └── chatSocket.js
│   ├── tests/
│   │   ├── security/
│   │   │   └── 2fa.test.js
│   │   └── setup.js
│   └── utils/
│       ├── AppError.js
│       ├── apiFeatures.js
│       ├── cache.js
│       ├── catchAsync.js
│       ├── constants.js
│       ├── cronJobs.js
│       ├── csvGenerator.js
│       ├── helpers.js
│       ├── jwtUtils.js
│       ├── logger.js
│       ├── passwordUtils.js
│       ├── socketEvents.js
│       ├── tokenService.js
│       ├── twoFASessionStore.js
│       ├── validation.js
│       └── validators.js
│
└── frontend/                         # React / Vite client application
    ├── .gitignore
    ├── README.md
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/
    │   ├── sw.js                     # Service worker
    │   └── vite.svg
    └── src/
        ├── App.css
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── assets/
        │   └── react.svg
        ├── components/
        │   ├── Auth/
        │   │   ├── OTPVerification.jsx
        │   │   └── ProtectedRoute.jsx
        │   ├── Common/
        │   │   ├── ChartCard.jsx
        │   │   ├── ConnectionChecker.jsx
        │   │   ├── Contracts.jsx
        │   │   ├── DealDetails.jsx
        │   │   ├── DealInbox.jsx
        │   │   ├── Disputes.jsx
        │   │   ├── HelpCenter.jsx
        │   │   ├── Loader.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Notifications.jsx
        │   │   ├── Settings.jsx
        │   │   ├── StatsCard.jsx
        │   │   └── Toast.jsx
        │   ├── Layout/
        │   │   ├── Footer.jsx
        │   │   ├── Header.jsx
        │   │   ├── Layout.jsx
        │   │   └── Sidebar.jsx
        │   └── UI/
        │       ├── Button.jsx
        │       ├── Input.jsx
        │       ├── PlaceholderImage.jsx
        │       ├── Select.jsx
        │       └── Table.jsx
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── CampaignContext.jsx
        │   ├── DealContext.jsx
        │   ├── MessageContext.jsx
        │   ├── NotificationContext.jsx
        │   ├── PaymentContext.jsx
        │   ├── SearchContext.jsx
        │   ├── SocketContext.jsx
        │   └── ThemeContext.jsx
        ├── hooks/
        │   ├── useAdminData.js
        │   ├── useAuth.js
        │   ├── useBrandData.js
        │   ├── useCampaign.js
        │   ├── useCreatorData.js
        │   ├── useDeal.js
        │   ├── useEarnings.js
        │   ├── useMessage.js
        │   ├── useNotification.js
        │   ├── usePayment.js
        │   ├── useSearch.js
        │   └── useTheme.js
        ├── pages/
        │   ├── Admin/
        │   │   ├── AdminLogin.jsx
        │   │   ├── Brands.jsx
        │   │   ├── Campaigns.jsx
        │   │   ├── Creators.jsx
        │   │   ├── Dashboard.jsx
        │   │   ├── Payments.jsx
        │   │   ├── Reports.jsx
        │   │   ├── Settings.jsx
        │   │   └── Users.jsx
        │   ├── Auth/
        │   │   ├── ForgotPassword.jsx
        │   │   ├── Login.jsx
        │   │   ├── ResetPassword.jsx
        │   │   ├── Signup.jsx
        │   │   └── VerifyEmail.jsx
        │   ├── Brand/
        │   │   ├── Analytics.jsx
        │   │   ├── CampaignBuilder.jsx
        │   │   ├── CampaignDetails.jsx
        │   │   ├── CampaignEdit.jsx
        │   │   ├── CampaignList.jsx
        │   │   ├── Contracts.jsx
        │   │   ├── CreateDeal.jsx
        │   │   ├── CreatorProfile.jsx
        │   │   ├── Dashboard.jsx
        │   │   ├── DealDetails.jsx
        │   │   ├── Deals.jsx
        │   │   ├── Deliverables.jsx
        │   │   ├── Disputes.jsx
        │   │   ├── Inbox.jsx
        │   │   ├── Payments.jsx
        │   │   ├── Profile.jsx
        │   │   ├── SearchCreators.jsx
        │   │   ├── Settings.jsx
        │   │   └── TeamMembers.jsx
        │   ├── Creator/
        │   │   ├── Analytics.jsx
        │   │   ├── AvailableDeals.jsx
        │   │   ├── Dashboard.jsx
        │   │   ├── DealDetails.jsx
        │   │   ├── Deals.jsx
        │   │   ├── Deliverables.jsx
        │   │   ├── Earnings.jsx
        │   │   ├── Inbox.jsx
        │   │   ├── Settings.jsx
        │   │   └── Withdrawals.jsx
        │   ├── Home.jsx
        │   ├── NotFound.jsx
        │   ├── Pricing.jsx
        │   ├── Privacy.jsx
        │   └── Terms.jsx
        ├── services/
        │   ├── adminService.js
        │   ├── api.js
        │   ├── authService.js
        │   ├── brandService.js
        │   ├── campaignService.js
        │   ├── contractService.js
        │   ├── creatorService.js
        │   ├── dealService.js
        │   ├── deliverableService.js
        │   ├── disputeService.js
        │   ├── notificationService.js
        │   ├── paymentService.js
        │   ├── searchService.js
        │   ├── socialService.js
        │   └── userService.js
        └── utils/
            ├── constants.js
            ├── errorHandler.js
            ├── formatters.js
            ├── helpers.js
            ├── socket.js
            ├── storage.js
            └── validators.js
```
